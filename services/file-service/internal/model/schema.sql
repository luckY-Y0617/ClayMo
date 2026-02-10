-- =========================================================
-- File Service (MySQL 8+)
-- - goctl friendly (explicit table-level PRIMARY KEY)
-- - private bucket stable access
-- - upload session tracking
-- - transcode tasks
-- - outbox for reliable MQ publishing
-- =========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------
-- file_infos: file metadata + object identity
-- ---------------------------------------------------------
CREATE TABLE `file_infos` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
    `file_id`       VARCHAR(64)      NOT NULL DEFAULT '' COMMENT 'business id (uuid)',
    `tenant_id`     VARCHAR(64)      NOT NULL DEFAULT '' COMMENT 'tenant id',
    `owner_id`      VARCHAR(64)      NOT NULL DEFAULT '' COMMENT 'owner user id',

    `file_name`     VARCHAR(255)     NOT NULL DEFAULT '' COMMENT 'original filename',
    `file_size`     BIGINT           NOT NULL DEFAULT 0 COMMENT 'bytes',
    `file_type`     VARCHAR(128)     NOT NULL DEFAULT '' COMMENT 'mime',

    `biz_type`      VARCHAR(64)      NOT NULL DEFAULT '' COMMENT 'business category',
    `file_hash`     VARCHAR(128)     NOT NULL DEFAULT '' COMMENT 'sha256/md5 (optional)',

    `bucket`        VARCHAR(128)     NOT NULL DEFAULT '' COMMENT 'storage bucket',
    `object_key`    VARCHAR(512)     NOT NULL DEFAULT '' COMMENT 'storage object key',

    `status`        VARCHAR(32)      NOT NULL DEFAULT 'Uploading' COMMENT 'Uploading|Available|Processing|Failed|Deleted|Aborted',

    `width`         INT              NOT NULL DEFAULT 0 COMMENT 'image width',
    `height`        INT              NOT NULL DEFAULT 0 COMMENT 'image height',
    `duration_ms`   BIGINT           NOT NULL DEFAULT 0 COMMENT 'audio/video duration ms',

    `version`       BIGINT           NOT NULL DEFAULT 0 COMMENT 'optimistic lock version',

    `created_at`    BIGINT           NOT NULL DEFAULT 0 COMMENT 'unix ms',
    `updated_at`    BIGINT           NOT NULL DEFAULT 0 COMMENT 'unix ms',
    `deleted_at`    BIGINT           NOT NULL DEFAULT 0 COMMENT 'unix ms, 0=not deleted',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_file_id` (`file_id`),

    KEY `idx_tenant_owner` (`tenant_id`, `owner_id`),
    KEY `idx_tenant_status` (`tenant_id`, `status`),
    KEY `idx_tenant_created` (`tenant_id`, `created_at`),
    KEY `idx_tenant_hash` (`tenant_id`, `file_hash`),
    KEY `idx_object` (`bucket`, `object_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='File metadata';


-- ---------------------------------------------------------
-- upload_sessions: upload lifecycle (single/multipart)
-- 核心原则：上传过程的唯一事实源是 UploadSession，File 只在上传完成后才创建
-- 状态机: Initiated -> Uploading -> Completed -> (finalized_file_id)
--        任意状态 -> Aborted | Expired | Failed
-- ---------------------------------------------------------
CREATE TABLE `upload_sessions` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
    `session_id`    VARCHAR(64)      NOT NULL DEFAULT '' COMMENT 'session id (uuid, 前缀 us_)',
    `tenant_id`     VARCHAR(64)      NOT NULL DEFAULT '' COMMENT 'tenant id',
    `owner_id`      VARCHAR(64)      NOT NULL DEFAULT '' COMMENT 'owner user id',

    -- 幂等 key（前端生成 UUID，TTL 内同 key 返回同 session）
    `idempotency_key` VARCHAR(64)    NOT NULL DEFAULT '' COMMENT 'client-generated idempotency key',

    -- 文件元信息（上传时就知道）
    `file_name`     VARCHAR(255)     NOT NULL DEFAULT '' COMMENT 'original filename',
    `file_size`     BIGINT           NOT NULL DEFAULT 0 COMMENT 'bytes',
    `file_type`     VARCHAR(128)     NOT NULL DEFAULT '' COMMENT 'mime',
    `biz_type`      VARCHAR(64)      NOT NULL DEFAULT '' COMMENT 'business category',
    `file_hash`     VARCHAR(128)     NOT NULL DEFAULT '' COMMENT 'sha256/md5 (optional, dedup)',

    -- 存储信息
    `bucket`        VARCHAR(128)     NOT NULL DEFAULT '' COMMENT 'storage bucket',
    `object_key`    VARCHAR(512)     NOT NULL DEFAULT '' COMMENT 'storage object key (unique per session)',

    -- 上传模式
    `mode`          VARCHAR(16)      NOT NULL DEFAULT '' COMMENT 'single|multipart',
    `upload_id`     VARCHAR(128)     NOT NULL DEFAULT '' COMMENT 'multipart uploadId from storage',
    `chunk_size`    BIGINT           NOT NULL DEFAULT 0 COMMENT 'multipart chunk size bytes',
    `total_parts`   INT              NOT NULL DEFAULT 0 COMMENT 'multipart total parts',

    -- 状态: Initiated|Uploading|Completed|Aborted|Expired|Failed
    `status`        VARCHAR(16)      NOT NULL DEFAULT 'Initiated' COMMENT 'session status',

    -- Finalize 结果（幂等保证）
    `finalized_file_id` VARCHAR(64)  NOT NULL DEFAULT '' COMMENT 'fileId after finalize (for idempotency)',
    `finalized_at`  BIGINT           NOT NULL DEFAULT 0 COMMENT 'unix ms, 0=not finalized',

    `expires_at`    BIGINT           NOT NULL DEFAULT 0 COMMENT 'unix ms',
    `created_at`    BIGINT           NOT NULL DEFAULT 0 COMMENT 'unix ms',
    `updated_at`    BIGINT           NOT NULL DEFAULT 0 COMMENT 'unix ms',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_session_id` (`session_id`),
    UNIQUE KEY `uk_idempotency` (`tenant_id`, `idempotency_key`),
    KEY `idx_tenant_owner_created` (`tenant_id`, `owner_id`, `created_at`),
    KEY `idx_tenant_hash` (`tenant_id`, `file_hash`),
    KEY `idx_status_expires` (`status`, `expires_at`),
    KEY `idx_expires` (`expires_at`),
    KEY `idx_finalized_file` (`finalized_file_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Upload sessions - source of truth during upload';

-- ---------------------------------------------------------
-- outbox: reliable event delivery (transactional outbox)
-- 典型流程：
-- 1) DB事务内：业务写 file_infos/... + insert outbox(status=Pending)
-- 2) outbox dispatcher 定时扫描 Pending -> publish MQ -> mark Published
-- ---------------------------------------------------------
DROP TABLE IF EXISTS `file_outbox`;
CREATE TABLE `file_outbox` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
    `event_id`         VARCHAR(64)     NOT NULL DEFAULT '' COMMENT 'event id (uuid)',
    `tenant_id`        VARCHAR(64)     NOT NULL DEFAULT '' COMMENT 'tenant id',

    `aggregate_type`   VARCHAR(64)     NOT NULL DEFAULT 'file' COMMENT 'file|transcode|...',
    `aggregate_id`     VARCHAR(64)     NOT NULL DEFAULT '' COMMENT 'e.g. fileId/taskId',
    `event_type`       VARCHAR(128)    NOT NULL DEFAULT '' COMMENT 'e.g. FileUploaded, TranscodeQueued',
    `payload`          MEDIUMTEXT      NOT NULL COMMENT 'json payload',
    `headers`          TEXT            NULL COMMENT 'json headers (optional)',

    `status`           VARCHAR(16)     NOT NULL DEFAULT 'Pending' COMMENT 'Pending|Published|Failed',
    `retry_count`      INT             NOT NULL DEFAULT 0,
    `next_retry_at`    BIGINT          NOT NULL DEFAULT 0 COMMENT 'unix ms, 0=immediately',
    `last_error`       TEXT            NULL,

    `created_at`       BIGINT          NOT NULL DEFAULT 0 COMMENT 'unix ms',
    `updated_at`       BIGINT          NOT NULL DEFAULT 0 COMMENT 'unix ms',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_event_id` (`event_id`),

    KEY `idx_status_retry` (`status`, `next_retry_at`, `id`),
    KEY `idx_tenant_created` (`tenant_id`, `created_at`),
    KEY `idx_aggregate` (`aggregate_type`, `aggregate_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Transactional outbox';

SET FOREIGN_KEY_CHECKS = 1;

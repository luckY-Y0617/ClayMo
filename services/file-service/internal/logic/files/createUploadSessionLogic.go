// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package files

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/zeromicro/go-zero/core/logx"

	"file-service/internal/domain"
	"file-service/internal/model"
	"file-service/internal/svc"
	"file-service/internal/types"
)

type CreateUploadSessionLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewCreateUploadSessionLogic(ctx context.Context, svcCtx *svc.ServiceContext) *CreateUploadSessionLogic {
	return &CreateUploadSessionLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

// CreateUploadSession 创建上传会话（Step 1）
// POST /uploads/sessions
// ⚠️ 不返回 fileId，只返回 sessionId（除非 dedup 秒传命中）
func (l *CreateUploadSessionLogic) CreateUploadSession(req *types.CreateUploadSessionRequest) (*types.CreateUploadSessionResponse, error) {
	tenantId, err := l.svcCtx.Auth.TenantId(l.ctx)
	if err != nil {
		return nil, err
	}
	ownerId, err := l.svcCtx.Auth.UserId(l.ctx)
	if err != nil {
		return nil, err
	}

	// 参数校验
	fileName := strings.TrimSpace(req.FileName)
	if fileName == "" {
		return nil, errors.New("fileName is required")
	}
	if req.FileSize < 0 {
		return nil, errors.New("fileSize invalid")
	}
	fileType := strings.TrimSpace(req.FileType)
	if fileType == "" {
		fileType = "application/octet-stream"
	}

	idempotencyKey := strings.TrimSpace(req.IdempotencyKey)
	fileHash := strings.TrimSpace(req.FileHash)

	// 1) 幂等检查：idempotencyKey
	if idempotencyKey != "" {
		existSess, err := l.svcCtx.UploadSessionsModel.FindOneByTenantIdIdempotencyKey(l.ctx, tenantId, idempotencyKey)
		if err == nil && existSess != nil {
			// 检查 session 状态：如果已过期/已取消，不能复用，需要新建
			if existSess.Status == model.SessionStatusExpired ||
				existSess.Status == model.SessionStatusAborted ||
				existSess.Status == model.SessionStatusFailed {
				// session 已不可用，忽略幂等命中，继续新建
				l.Logger.Infof("idempotent hit but session %s status is %s, creating new session", existSess.SessionId, existSess.Status)
			} else {
				// 幂等命中且 session 可用：返回已有 session（重新生成 URL）
				resp, err := l.buildResponseFromSession(existSess)
				if err != nil {
					l.Logger.Errorf("idempotent hit but failed to build response: %v", err)
					return nil, err
				}
				resp.HitType = HitTypeIdempotent
				resp.Message = "idempotent hit"
				return resp, nil
			}
		}
	}

	// 2) Dedup（秒传）：查询 files 表（不查 session，因为 session 是过程数据会被清理）
	if fileHash != "" {
		existFile, err := l.svcCtx.FileInfosModel.FindOneByTenantIdFileHash(l.ctx, tenantId, fileHash)
		if err == nil && existFile != nil {
			// 秒传命中：直接返回已存在的 fileId
			return &types.CreateUploadSessionResponse{
				ObjectKey: existFile.ObjectKey,
				Status:    existFile.Status,
				HitType:   HitTypeDedup,
				FileId:    existFile.FileId, // 秒传才返回 fileId
				Message:   "dedup hit",
			}, nil
		}
	}

	// 3) 决策上传模式
	mode := domain.NormalizeMode(req.Mode)
	policy := domain.UploadPolicy{
		AutoMultipartThresholdBytes: l.svcCtx.Config.UploadPolicy.AutoMultipartThresholdBytes,
		MinPartSizeBytes:            l.svcCtx.Config.UploadPolicy.MinPartSizeBytes,
		MaxParts:                    l.svcCtx.Config.UploadPolicy.MaxParts,
	}
	mode = policy.DecideMode(req.FileSize, mode)

	// 4) 生成 sessionId 和 objectKey
	sessionId := "us_" + uuid.NewString()
	bucket := l.svcCtx.Storage.Bucket()
	objectKey := buildObjectKey(tenantId, ownerId, req.BizType, sessionId, fileName)

	now := nowMs()
	expireSeconds := l.svcCtx.Config.Storage.PresignPutExpireSeconds

	// 5) 创建 Session 记录
	sess := &model.UploadSessions{
		SessionId:      sessionId,
		TenantId:       tenantId,
		OwnerId:        ownerId,
		IdempotencyKey: idempotencyKey,
		FileName:       sanitizeFileName(fileName),
		FileSize:       req.FileSize,
		FileType:       fileType,
		BizType:        strings.TrimSpace(req.BizType),
		FileHash:       fileHash,
		Bucket:         bucket,
		ObjectKey:      objectKey,
		Mode:           mode,
		Status:         model.SessionStatusInitiated,
		ExpiresAt:      now + secondsToMs(expireSeconds), // 统一用 ms 存储
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	// 6) 根据模式处理
	if mode == domain.ModeSingle {
		// 单文件上传：生成预签名 PUT URL
		url, headers, expAtSec, err := l.svcCtx.Storage.PresignPut(l.ctx, objectKey, fileType, time.Duration(expireSeconds)*time.Second)
		if err != nil {
			return nil, err
		}

		sess.ExpiresAt = secondsToMs(expAtSec) // 统一存 ms

		if _, err := l.svcCtx.UploadSessionsModel.Insert(l.ctx, sess); err != nil {
			return nil, err
		}

		return &types.CreateUploadSessionResponse{
			SessionId: sessionId,
			Mode:      domain.ModeSingle,
			ObjectKey: objectKey,
			Status:    model.SessionStatusInitiated,
			UploadUrl: url,
			Headers:   headers,
			ExpiresAt: expAtSec, // 响应用 seconds
			HitType:   HitTypeNone,
		}, nil
	}

	// 7) 分片上传
	chunkSize, totalParts, ok := policy.PlanMultipart(req.FileSize, req.PreferredChunkSize)
	if !ok {
		return nil, errors.New("cannot plan multipart upload")
	}

	// 初始化分片上传
	uploadId, err := l.svcCtx.Storage.CreateMultipart(l.ctx, objectKey, fileType)
	if err != nil {
		return nil, err
	}

	// CreateMultipart 成功后立即设置 status=Uploading（语义更清晰）
	sess.Mode = domain.ModeMultipart
	sess.UploadId = uploadId
	sess.ChunkSize = chunkSize
	sess.TotalParts = int64(totalParts)
	sess.Status = model.SessionStatusUploading // 创建 uploadId 即进入 uploading 阶段

	if _, err := l.svcCtx.UploadSessionsModel.Insert(l.ctx, sess); err != nil {
		// 回滚：取消分片上传
		_ = l.svcCtx.Storage.AbortMultipart(l.ctx, objectKey, uploadId)
		return nil, err
	}

	return &types.CreateUploadSessionResponse{
		SessionId:  sessionId,
		Mode:       domain.ModeMultipart,
		ObjectKey:  objectKey,
		Status:     model.SessionStatusUploading,
		UploadId:   uploadId,
		ChunkSize:  chunkSize,
		TotalParts: totalParts,
		ExpiresAt:  msToSeconds(sess.ExpiresAt), // 响应用 seconds
		HitType:    HitTypeNone,
	}, nil
}

// buildResponseFromSession 从已存在的 session 构建响应（用于幂等命中）
// 关键：无论新建还是幂等命中，客户端都能立刻进入下一步，不需要依赖缓存
func (l *CreateUploadSessionLogic) buildResponseFromSession(sess *model.UploadSessions) (*types.CreateUploadSessionResponse, error) {
	resp := &types.CreateUploadSessionResponse{
		SessionId: sess.SessionId,
		Mode:      sess.Mode,
		ObjectKey: sess.ObjectKey,
		Status:    sess.Status,
	}

	// 如果已 finalized，直接返回 fileId，不需要上传信息
	if sess.FinalizedFileId != "" {
		resp.FileId = sess.FinalizedFileId
		resp.Status = model.SessionStatusCompleted
		return resp, nil
	}

	// 根据 mode 返回必要的上传信息
	if sess.Mode == domain.ModeSingle {
		// single 模式：重新生成 presigned URL（旧的可能已过期）
		expireSeconds := l.svcCtx.Config.Storage.PresignPutExpireSeconds
		url, headers, expAtSec, err := l.svcCtx.Storage.PresignPut(l.ctx, sess.ObjectKey, sess.FileType, time.Duration(expireSeconds)*time.Second)
		if err != nil {
			return nil, err
		}
		resp.UploadUrl = url
		resp.Headers = headers
		resp.ExpiresAt = expAtSec // seconds
	} else if sess.Mode == domain.ModeMultipart {
		// multipart 模式：返回 uploadId + chunkSize + totalParts
		resp.UploadId = sess.UploadId
		resp.ChunkSize = sess.ChunkSize
		resp.TotalParts = int(sess.TotalParts)
		resp.ExpiresAt = msToSeconds(sess.ExpiresAt) // seconds
	}

	return resp, nil
}

-- 允许 root 用户从任意主机连接（Docker 容器网络需要）
-- 注意：生产环境应限制为特定 IP 或使用专用用户

-- 如果 root@'%' 不存在则创建，已存在则更新密码
CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY '123456';

-- 授予所有权限
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;

-- 刷新权限
FLUSH PRIVILEGES;


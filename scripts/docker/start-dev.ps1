# ================================================
# ClayMo 开发环境启动脚本
# ================================================

param(
    [switch]$Full,          # 启动全部服务（包括应用）
    [switch]$Production,    # 启动生产模式（含前端容器）
    [switch]$Down,          # 停止服务
    [switch]$Clean          # 清理数据卷
)

$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }

# 切换到项目根目录
$projectRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
Set-Location $projectRoot

if ($Down) {
    Write-Info "停止所有容器..."
    if ($Clean) {
        docker compose down -v
        Write-Ok "容器和数据卷已清理"
    } else {
        docker compose down
        Write-Ok "容器已停止"
    }
    exit 0
}

# 检查 Docker 是否运行
$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
    Write-Host "[ERROR] Docker 未安装或不在 PATH 中" -ForegroundColor Red
    exit 1
}

# 确定使用哪个 compose 文件和 profile
if ($Production) {
    Write-Info "启动生产模式（全部服务 + 前端容器）..."
    docker compose --profile full --profile production up -d --build
} elseif ($Full) {
    Write-Info "启动全部服务（后端容器化）..."
    docker compose --profile full up -d --build
} else {
    Write-Info "启动开发模式（仅基础设施）..."
    docker compose -f docker-compose.dev.yml up -d
}

Write-Ok "服务已启动！"
Write-Host ""
Write-Info "服务状态："
docker compose ps

Write-Host ""
Write-Info "访问地址："
Write-Host "  MySQL:     localhost:3306" -ForegroundColor Yellow
Write-Host "  Redis:     localhost:6379" -ForegroundColor Yellow
Write-Host "  MinIO:     http://localhost:9001 (控制台)" -ForegroundColor Yellow

if ($Full -or $Production) {
    Write-Host "  Gateway:   http://localhost:5080" -ForegroundColor Yellow
    Write-Host "  API:       http://localhost:19001" -ForegroundColor Yellow
    Write-Host "  Files:     http://localhost:8889" -ForegroundColor Yellow
}

if ($Production) {
    Write-Host "  Web:       http://localhost:3000" -ForegroundColor Yellow
    Write-Host "  Admin:     http://localhost:3001" -ForegroundColor Yellow
}

Write-Host ""
Write-Info "开发提示："
if (-not $Full -and -not $Production) {
    Write-Host "  后端: cd backend && dotnet run" -ForegroundColor Cyan
    Write-Host "  前端: cd frontend/web && pnpm dev" -ForegroundColor Cyan
    Write-Host "  管理: cd frontend/admin && pnpm dev" -ForegroundColor Cyan
}


# ================================================
# ClayMo Git 历史敏感信息清理脚本
# ================================================
# 
# ⚠️ 警告：此脚本会重写 Git 历史！
# 请确保：
# 1. 所有团队成员已 push 完本地改动
# 2. 已备份仓库
# 3. 清理后需要强制推送（--force）
#
# 使用方法：
#   1. 安装 git-filter-repo: pip install git-filter-repo
#   2. 在仓库根目录运行: .\scripts\security\clean-git-history.ps1
#
# ================================================

param(
    [switch]$DryRun = $false,
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

# 颜色输出
function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }

# 检查 git-filter-repo 是否安装
Write-Info "检查 git-filter-repo 是否已安装..."
$filterRepo = Get-Command git-filter-repo -ErrorAction SilentlyContinue
if (-not $filterRepo) {
    Write-Err "未找到 git-filter-repo，请先安装："
    Write-Host "  pip install git-filter-repo"
    exit 1
}
Write-Ok "git-filter-repo 已安装"

# 确认当前在仓库根目录
if (-not (Test-Path ".git")) {
    Write-Err "请在 Git 仓库根目录运行此脚本"
    exit 1
}

# 需要从 Git 历史中删除的敏感文件
$sensitiveFiles = @(
    "services/file-service/etc/file-api.yaml",
    "backend/src/ClayMo.Abp.Web/appsettings.Development.json",
    "backend/src/YayZent.Abp.Web/appsettings.Development.json",
    "services/gateway/appsettings.Development.json"
)

Write-Info "以下文件将从 Git 历史中移除："
foreach ($file in $sensitiveFiles) {
    Write-Host "  - $file" -ForegroundColor Yellow
}

if ($DryRun) {
    Write-Warn "DryRun 模式：仅分析，不执行实际清理"
    
    Write-Info "分析这些文件在历史中的存在情况..."
    foreach ($file in $sensitiveFiles) {
        $commits = git log --all --oneline -- $file 2>$null
        if ($commits) {
            Write-Warn "文件 '$file' 存在于以下 commits："
            $commits | ForEach-Object { Write-Host "    $_" }
        } else {
            Write-Ok "文件 '$file' 不在 Git 历史中"
        }
    }
    
    Write-Info "DryRun 完成。如需执行清理，请移除 -DryRun 参数"
    exit 0
}

# 正式执行前确认
if (-not $Force) {
    Write-Warn "此操作将重写 Git 历史，所有协作者需要重新 clone！"
    $confirm = Read-Host "确认执行？(输入 YES 继续)"
    if ($confirm -ne "YES") {
        Write-Info "已取消"
        exit 0
    }
}

# 备份当前分支
$currentBranch = git rev-parse --abbrev-ref HEAD
Write-Info "当前分支: $currentBranch"
Write-Info "创建备份分支: backup-before-clean-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
git branch "backup-before-clean-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

# 构建 git-filter-repo 参数
$pathArgs = ($sensitiveFiles | ForEach-Object { "--invert-paths --path `"$_`"" }) -join " "

Write-Info "开始清理 Git 历史..."
Write-Info "命令: git filter-repo $pathArgs --force"

# 执行清理
$filterRepoCmd = "git filter-repo --force"
foreach ($file in $sensitiveFiles) {
    $filterRepoCmd += " --invert-paths --path `"$file`""
}

Invoke-Expression $filterRepoCmd

if ($LASTEXITCODE -eq 0) {
    Write-Ok "Git 历史清理完成！"
    Write-Info ""
    Write-Info "后续步骤："
    Write-Host "  1. 检查仓库状态: git status" -ForegroundColor Cyan
    Write-Host "  2. 强制推送到远程: git push origin --force --all" -ForegroundColor Cyan
    Write-Host "  3. 强制推送 tags: git push origin --force --tags" -ForegroundColor Cyan
    Write-Host "  4. 通知所有协作者删除本地仓库，重新 clone" -ForegroundColor Yellow
    Write-Host "  5. 立即轮换所有已暴露的密钥！" -ForegroundColor Red
} else {
    Write-Err "清理失败，请检查错误信息"
    exit 1
}


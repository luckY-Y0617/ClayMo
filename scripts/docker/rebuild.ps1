# ================================================
# ClayMo Docker Quick Rebuild Script
# ================================================
# Usage:
#   .\scripts\docker\rebuild.ps1           # Rebuild all services
#   .\scripts\docker\rebuild.ps1 api       # Rebuild API only
#   .\scripts\docker\rebuild.ps1 gateway   # Rebuild gateway (includes frontend)
#   .\scripts\docker\rebuild.ps1 frontend  # Same as gateway
# ================================================

param(
    [string]$Service = "all"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..\..

Write-Host "[ClayMo] Docker Rebuild Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

switch ($Service) {
    "api" {
        Write-Host "[BUILD] Rebuilding API service..." -ForegroundColor Yellow
        docker compose --profile full build api --no-cache
        docker compose --profile full up -d api
        Write-Host "[DONE] API service updated" -ForegroundColor Green
    }
    "gateway" {
        Write-Host "[BUILD] Rebuilding Gateway (with frontend)..." -ForegroundColor Yellow
        docker compose --profile full build gateway --no-cache
        docker compose --profile full up -d gateway
        Write-Host "[DONE] Gateway updated" -ForegroundColor Green
    }
    "frontend" {
        Write-Host "[BUILD] Rebuilding frontend (via Gateway)..." -ForegroundColor Yellow
        docker compose --profile full build gateway --no-cache
        docker compose --profile full up -d gateway
        Write-Host "[DONE] Frontend updated" -ForegroundColor Green
    }
    "file-service" {
        Write-Host "[BUILD] Rebuilding file service..." -ForegroundColor Yellow
        docker compose --profile full build file-service --no-cache
        docker compose --profile full up -d file-service
        Write-Host "[DONE] File service updated" -ForegroundColor Green
    }
    "init" {
        Write-Host "[BUILD] Rebuilding init service..." -ForegroundColor Yellow
        docker compose --profile full build init --no-cache
        docker compose --profile full up init
        Write-Host "[DONE] Init completed" -ForegroundColor Green
    }
    "all" {
        Write-Host "[BUILD] Rebuilding all services..." -ForegroundColor Yellow
        docker compose --profile full down
        docker compose --profile full build --no-cache
        docker compose --profile full up -d
        Write-Host "[DONE] All services updated" -ForegroundColor Green
    }
    default {
        Write-Host "[ERROR] Unknown service: $Service" -ForegroundColor Red
        Write-Host "Available: api, gateway, frontend, file-service, init, all" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "[INFO] Running containers:" -ForegroundColor Cyan
docker compose --profile full ps

Write-Host ""
Write-Host "[INFO] Access URLs:" -ForegroundColor Cyan
Write-Host "  HTTP:  http://localhost:5080" -ForegroundColor White
Write-Host "  HTTPS: https://localhost:5443" -ForegroundColor White
Write-Host "  Admin: https://localhost:5443/admin/" -ForegroundColor White

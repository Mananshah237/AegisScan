# AegisScan - Seamless Startup Script (PowerShell)
# Run from: C:\Users\mgroc\Downloads\AegisScan\
# Usage: .\start.ps1            (start services)
#        .\start.ps1 -Reset     (drop + recreate DB tables, use after schema changes)
#        .\start.ps1 -Stop      (stop all services)
#        .\start.ps1 -Logs      (tail live logs)

param(
    [switch]$Reset,
    [switch]$Stop,
    [switch]$Logs,
    [switch]$Build
)

$PROJECT_DIR = $PSScriptRoot
Set-Location $PROJECT_DIR

function Write-Step { param($msg) Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "   OK: $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "   WARN: $msg" -ForegroundColor Yellow }
function Write-Err  { param($msg) Write-Host "   ERR: $msg" -ForegroundColor Red }

# --- STOP ---
if ($Stop) {
    Write-Step "Stopping AegisScan..."
    docker-compose down
    Write-OK "All services stopped."
    exit 0
}

# --- LOGS ---
if ($Logs) {
    docker-compose logs -f --tail=50
    exit 0
}

# --- CHECK DOCKER ---
Write-Step "Checking Docker..."
$dockerRunning = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Err "Docker is not running. Please start Docker Desktop first."
    exit 1
}
Write-OK "Docker is running."

# --- BUILD OR START ---
if ($Build) {
    Write-Step "Building and starting all services (this may take a few minutes)..."
    docker-compose up -d --build
} else {
    Write-Step "Starting all services..."
    docker-compose up -d
}

if ($LASTEXITCODE -ne 0) {
    Write-Err "docker-compose failed. Run '.\start.ps1 -Logs' to investigate."
    exit 1
}

# --- WAIT FOR HEALTH ---
Write-Step "Waiting for services to be healthy..."
$maxWait = 60
$elapsed = 0
$interval = 5

while ($elapsed -lt $maxWait) {
    Start-Sleep -Seconds $interval
    $elapsed += $interval

    $backendReady = $false
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 3 -ErrorAction Stop
        if ($response.StatusCode -eq 200) { $backendReady = $true }
    } catch {}

    if ($backendReady) {
        Write-OK "Backend is ready."
        break
    }
    Write-Host "   Waiting... ($elapsed/$maxWait s)" -ForegroundColor Gray
}

if (-not $backendReady) {
    Write-Warn "Backend did not respond in time. It may still be starting."
    Write-Warn "Check logs with: .\start.ps1 -Logs"
}

# --- RESET DB TABLES ---
if ($Reset) {
    Write-Step "Resetting database tables (drop + recreate)..."
    Start-Sleep -Seconds 3
    docker-compose exec backend python create_tables.py
    if ($LASTEXITCODE -eq 0) {
        Write-OK "Database tables recreated."
        Write-Warn "All existing data has been wiped. Re-register your user account."
    } else {
        Write-Err "Table creation failed. Check backend logs."
    }
}

# --- SUMMARY ---
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AegisScan is running!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Dashboard  : http://localhost:3000" -ForegroundColor White
Write-Host "  API        : http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs   : http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "  Quick commands:"
Write-Host "    Stop          : .\start.ps1 -Stop"
Write-Host "    View logs     : .\start.ps1 -Logs"
Write-Host "    Rebuild       : .\start.ps1 -Build"
Write-Host "    Reset DB      : .\start.ps1 -Reset"
Write-Host ""

# --- OPEN BROWSER ---
$openBrowser = Read-Host "Open dashboard in browser? (Y/n)"
if ($openBrowser -ne 'n' -and $openBrowser -ne 'N') {
    Start-Process "http://localhost:3000"
}

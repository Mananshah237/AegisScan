# AegisScan - Quick Scan Script (PowerShell)
# Usage:
#   .\scan.ps1 -Url "https://example.com"
#   .\scan.ps1 -Url "https://example.com" -Profile full
#   .\scan.ps1 -Url "https://example.com" -Email "you@you.com" -Password "pass"

param(
    [Parameter(Mandatory=$true)]
    [string]$Url,

    [ValidateSet("quick","full")]
    [string]$Profile = "quick",

    [string]$Email    = "test@test.com",
    [string]$Password = "TestPass123",

    [string]$ApiBase  = "http://localhost:8000/api/v1"
)

function Write-Step { param($msg) Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "   $msg" -ForegroundColor Green }
function Write-Err  { param($msg) Write-Host "   ERR: $msg" -ForegroundColor Red; exit 1 }

# --- LOGIN ---
Write-Step "Authenticating..."
try {
    $loginBody = "username=$([uri]::EscapeDataString($Email))&password=$([uri]::EscapeDataString($Password))"
    $loginResp = Invoke-RestMethod -Uri "$ApiBase/auth/access-token" `
        -Method POST `
        -ContentType "application/x-www-form-urlencoded" `
        -Body $loginBody
    $token = $loginResp.access_token
    Write-OK "Logged in as $Email"
} catch {
    Write-Err "Login failed: $_`nMake sure AegisScan is running (.\start.ps1) and credentials are correct."
}

$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

# --- CREATE TARGET ---
Write-Step "Registering target: $Url"
$domain = ([uri]$Url).Host
try {
    $target = Invoke-RestMethod -Uri "$ApiBase/targets/" `
        -Method POST `
        -Headers $headers `
        -Body (@{ name = $domain; base_url = $Url } | ConvertTo-Json)
    $targetId = $target.id
    Write-OK "Target ID: $targetId"
} catch {
    # Target might already exist — list and find it
    $targets = Invoke-RestMethod -Uri "$ApiBase/targets/" -Method GET -Headers $headers
    $existing = $targets | Where-Object { $_.base_url -eq $Url } | Select-Object -First 1
    if ($existing) {
        $targetId = $existing.id
        Write-OK "Using existing target ID: $targetId"
    } else {
        Write-Err "Could not create or find target: $_"
    }
}

# --- START SCAN ---
Write-Step "Starting $Profile scan..."
try {
    $scan = Invoke-RestMethod -Uri "$ApiBase/scans/" `
        -Method POST `
        -Headers $headers `
        -Body (@{ target_id = $targetId; profile = $Profile } | ConvertTo-Json)
    $scanId = $scan.id
    Write-OK "Scan ID: $scanId  (status: $($scan.status))"
} catch {
    Write-Err "Failed to start scan: $_"
}

# --- POLL STATUS ---
Write-Step "Waiting for scan to complete..."
$timeout  = if ($Profile -eq "full") { 3600 } else { 600 }
$elapsed  = 0
$interval = 10

while ($elapsed -lt $timeout) {
    Start-Sleep -Seconds $interval
    $elapsed += $interval

    try {
        $status = Invoke-RestMethod -Uri "$ApiBase/scans/$scanId" -Method GET -Headers $headers
    } catch { continue }

    $st = $status.status
    Write-Host "   [$elapsed s] Status: $st" -ForegroundColor Gray

    if ($st -eq "completed") {
        Write-OK "Scan completed!"
        break
    }
    if ($st -eq "failed") {
        Write-Host ""
        Write-Host "  Scan failed. Check worker logs: .\start.ps1 -Logs" -ForegroundColor Red
        exit 1
    }
}

if ($status.status -ne "completed") {
    Write-Host "  Scan timed out after $timeout seconds." -ForegroundColor Yellow
    exit 1
}

# --- FETCH FINDINGS ---
Write-Step "Fetching findings..."
$findings = Invoke-RestMethod -Uri "$ApiBase/findings/?scan_id=$scanId" -Method GET -Headers $headers

$high   = @($findings | Where-Object { $_.severity -eq "High" })
$medium = @($findings | Where-Object { $_.severity -eq "Medium" })
$low    = @($findings | Where-Object { $_.severity -eq "Low" })
$info   = @($findings | Where-Object { $_.severity -eq "Info" })

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Scan Results: $Url" -ForegroundColor White
Write-Host "  Profile: $Profile" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  High   : $($high.Count)" -ForegroundColor $(if ($high.Count -gt 0) { "Red" } else { "Green" })
Write-Host "  Medium : $($medium.Count)" -ForegroundColor $(if ($medium.Count -gt 0) { "Yellow" } else { "Green" })
Write-Host "  Low    : $($low.Count)" -ForegroundColor "White"
Write-Host "  Info   : $($info.Count)" -ForegroundColor "Gray"
Write-Host "  Total  : $($findings.Count)" -ForegroundColor "White"
Write-Host ""

if ($findings.Count -gt 0) {
    Write-Host "  Findings:" -ForegroundColor White
    foreach ($f in $findings | Sort-Object { @{"High"=0;"Medium"=1;"Low"=2;"Info"=3}[$_.severity] }) {
        $color = switch ($f.severity) {
            "High"   { "Red" }
            "Medium" { "Yellow" }
            "Low"    { "White" }
            default  { "Gray" }
        }
        Write-Host "  [$($f.severity.PadRight(6))] $($f.title)" -ForegroundColor $color
    }
    Write-Host ""
}

Write-Host "  Report  : http://localhost:8000/api/v1/scans/$scanId/report"
Write-Host "  Scan ID : $scanId"
Write-Host ""

# Save JSON results
$outFile = "scan-results-$($domain)-$(Get-Date -Format 'yyyyMMdd-HHmm').json"
$findings | ConvertTo-Json -Depth 10 | Out-File $outFile -Encoding UTF8
Write-Host "  Results saved to: $outFile" -ForegroundColor Gray

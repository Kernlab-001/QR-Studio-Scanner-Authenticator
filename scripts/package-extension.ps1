<#
.SYNOPSIS
    Builds a Chrome Web Store ready zip for QR Studio.

.DESCRIPTION
    Validates manifest.json, then packages only the files Chrome should load
    (manifest, popup, vendored libraries and icons) into
    dist/qr-studio-<version>.zip.

    The zip root must contain manifest.json directly - the Chrome Web Store
    rejects an archive that nests everything inside a folder.

.EXAMPLE
    ./scripts/package-extension.ps1
#>
[CmdletBinding()]
param(
    [string]$OutputDirectory = "dist"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = Split-Path -Parent $PSScriptRoot
Push-Location $root

try {
    # --- validate the manifest -------------------------------------------------
    $manifestPath = Join-Path $root "manifest.json"
    if (-not (Test-Path $manifestPath)) {
        throw "manifest.json not found at $manifestPath"
    }

    try {
        $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    }
    catch {
        throw "manifest.json is not valid JSON: $($_.Exception.Message)"
    }

    $version = $manifest.version
    Write-Host "manifest.json OK - version $version" -ForegroundColor Green

    # --- collect the files to ship --------------------------------------------
    $files = @(
        "manifest.json",
        "popup.html",
        "popup.css",
        "popup.js",
        "jsqr.js",
        "qrcode-generator.js"
    )

    $iconDir = Join-Path $root "icons"
    if (Test-Path $iconDir) {
        $files += Get-ChildItem $iconDir -Filter "*.png" | ForEach-Object { "icons/$($_.Name)" }
    }

    $missing = $files | Where-Object { -not (Test-Path (Join-Path $root $_)) }
    if ($missing) {
        throw "Missing expected file(s): $($missing -join ', ')"
    }

    # --- sanity check: every manifest-referenced file must exist --------------
    $referenced = @($manifest.action.default_popup)
    if ($manifest.icons) {
        $referenced += $manifest.icons.PSObject.Properties | ForEach-Object { $_.Value }
    }
    if ($manifest.action.default_icon) {
        $referenced += $manifest.action.default_icon.PSObject.Properties | ForEach-Object { $_.Value }
    }
    foreach ($ref in $referenced) {
        if ($ref -and -not (Test-Path (Join-Path $root $ref))) {
            throw "manifest.json references a missing file: $ref"
        }
    }
    Write-Host "All $($referenced.Count) manifest-referenced file(s) present" -ForegroundColor Green

    # --- build the zip ---------------------------------------------------------
    $outDir = Join-Path $root $OutputDirectory
    if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
    New-Item -ItemType Directory -Path $outDir | Out-Null

    $stageDir = Join-Path $outDir "stage"
    New-Item -ItemType Directory -Path $stageDir | Out-Null

    foreach ($file in $files) {
        $target = Join-Path $stageDir $file
        $parent = Split-Path -Parent $target
        if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        Copy-Item (Join-Path $root $file) $target -Force
    }

    $zipPath = Join-Path $outDir "qr-studio-$version.zip"
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    Compress-Archive -Path (Join-Path $stageDir "*") -DestinationPath $zipPath -CompressionLevel Optimal

    Remove-Item $stageDir -Recurse -Force

    $sizeKb = [math]::Round((Get-Item $zipPath).Length / 1KB, 1)
    Write-Host ""
    Write-Host "Built $zipPath ($sizeKb KB)" -ForegroundColor Green
    Write-Host "Shipped files:" -ForegroundColor Cyan
    $files | ForEach-Object { Write-Host "  $_" }
    Write-Host ""
    Write-Host "Upload this file at https://chrome.google.com/webstore/devconsole" -ForegroundColor Yellow
}
finally {
    Pop-Location
}

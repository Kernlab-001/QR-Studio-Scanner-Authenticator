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
        "qrcode-generator.js",
        "licence.js",
        "pro.js",
        "assets/brand-mark.png"
    )

    $iconDir = Join-Path $root "icons"
    if (Test-Path $iconDir) {
        $files += Get-ChildItem $iconDir -Filter "*.png" | ForEach-Object { "icons/$($_.Name)" }
    }

    # The vendored browser-side libraries, including the WebAssembly decoder,
    # are shipped inside the package.
    $vendorDir = Join-Path $root "vendor"
    if (Test-Path $vendorDir) {
        $files += Get-ChildItem $vendorDir -Recurse -File | ForEach-Object {
            $relative = $_.FullName.Substring($vendorDir.Length + 1) -replace "\\", "/"
            "vendor/$relative"
        }
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
    if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

    $zipPath = Join-Path $outDir "qr-studio-$version.zip"
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

    # Build the archive entry by entry instead of using Compress-Archive.
    # Compress-Archive stores Windows-style backslash separators, which the
    # Chrome Web Store's unzip rejects (it would see a single file literally
    # named "icons\icon16.png" instead of a folder).
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    $stream = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::CreateNew)
    try {
        $archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)
        try {
            foreach ($file in $files) {
                $entryName = ($file -replace "\\", "/")
                $entry = $archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
                $entryStream = $entry.Open()
                try {
                    $bytes = [System.IO.File]::ReadAllBytes((Join-Path $root $file))
                    $entryStream.Write($bytes, 0, $bytes.Length)
                }
                finally { $entryStream.Dispose() }
            }
        }
        finally { $archive.Dispose() }
    }
    finally { $stream.Dispose() }

    # --- verify the archive ----------------------------------------------------
    $check = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
    try {
        $names = @($check.Entries | ForEach-Object { $_.FullName })
        if ($names -notcontains "manifest.json") {
            throw "manifest.json is not at the root of the zip"
        }
        $bad = @($names | Where-Object { $_ -match "\\" })
        if ($bad.Count -gt 0) {
            throw "zip entries must use forward slashes, found: $($bad -join ', ')"
        }
    }
    finally { $check.Dispose() }
    Write-Host "Zip verified - manifest.json at root, $($files.Count) entries" -ForegroundColor Green

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

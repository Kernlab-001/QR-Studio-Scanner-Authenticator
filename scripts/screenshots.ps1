<#
.SYNOPSIS
    Rebuilds the store screenshots and the gallery images.

.DESCRIPTION
    Each picture is a composed frame: the extension itself on the left, a
    headline and a few points on the right, and a footer. The extension is
    shown with demo data so the pictures look like the real thing.

    The store copies are 1280 x 800, which is the size the Chrome Web Store
    asks for. The gallery copies are 2560 x 1600, so they stay sharp on a
    screen that is bigger.

    The demo data lives only here. It is never part of the extension.

.EXAMPLE
    ./scripts/screenshots.ps1
#>
[CmdletBinding()]
param(
    [string]$Chrome = "",
    [switch]$KeepTemp
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
    # --- find a browser -------------------------------------------------------
    if (-not $Chrome) {
        $candidates = @(
            "C:\Program Files\Google\Chrome\Application\chrome.exe",
            "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
        )
        $Chrome = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    }
    if (-not $Chrome -or -not (Test-Path $Chrome)) {
        throw "No Chrome found. Pass one with -Chrome."
    }

    $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $dir = Join-Path $env:TEMP "qr-studio-shots\$stamp"
    New-Item -ItemType Directory -Force -Path "$dir\shots" | Out-Null

    # --- copy the extension, so the pictures show what actually ships --------
    foreach ($name in @('manifest.json', 'popup.html', 'popup.css', 'popup.js', 'jsqr.js',
            'qrcode-generator.js', 'licence.js', 'pro.js', 'account-config.js', 'account.html', 'account.js')) {
        Copy-Item (Join-Path $root $name) $dir -Force
    }
    Copy-Item (Join-Path $root 'icons') $dir -Recurse -Force
    Copy-Item (Join-Path $root 'vendor') $dir -Recurse -Force

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    $base = "file:///$($dir -replace '\\','/')/"

    # --- the demo data and the small shim that feeds it to the page ----------
    $demo = @'
{
  "authenticatorAccounts": [
    { "id": "acc-github", "type": "totp", "secret": "JBSWY3DPEHPK3PXP", "issuer": "GitHub", "accountName": "dev@example.com", "digits": 6, "period": 30, "algorithm": "SHA1", "favorite": true,  "addedAt": 1760000000000 },
    { "id": "acc-aws",    "type": "totp", "secret": "GEZDGNBVGY3TQOJQ", "issuer": "AWS",    "accountName": "ops@example.com",   "digits": 6, "period": 30, "algorithm": "SHA1", "favorite": false, "addedAt": 1760000100000 },
    { "id": "acc-figma",  "type": "totp", "secret": "MFRGGZDFMZTWQ2LK", "issuer": "Figma",  "accountName": "design@example.com", "digits": 6, "period": 30, "algorithm": "SHA1", "favorite": false, "addedAt": 1760000200000 }
  ],
  "qrStudioHistoryEnabled": true,
  "qrStudioHistory": [
    { "id": "h1", "raw": "https://github.com/OFFICIAL-ZXKTS", "kind": "url", "type": "WEBSITE", "title": "github.com", "source": "camera", "savedAt": 1792396800000 },
    { "id": "h2", "raw": "WIFI:T:WPA;S:CafeHarbour;P:hunter2;;", "kind": "wifi", "type": "WI-FI", "title": "Wi-Fi: CafeHarbour", "source": "camera", "savedAt": 1792386000000 },
    { "id": "h3", "raw": "BEGIN:VCARD\nVERSION:3.0\nN:Morgan;Alex;;\nEMAIL;TYPE=INTERNET:alex@example.com\nEND:VCARD", "kind": "contact", "type": "CONTACT", "title": "Alex Morgan", "source": "image", "savedAt": 1792375200000 },
    { "id": "h4", "raw": "mailto:hello@example.com?subject=Hello", "kind": "email", "type": "EMAIL", "title": "Email draft", "source": "paste", "savedAt": 1792364400000 }
  ]
}
'@

    $shim = @"
<script>
(function () {
  var DATA = $demo;
  var store = Object.assign({}, DATA);
  window.chrome = window.chrome || {};
  window.chrome.storage = { local: {
    get: function (d) { return new Promise(function (r) { var o = {}; for (var k in d) o[k] = (k in store) ? store[k] : d[k]; r(o); }); },
    set: function (v) { return new Promise(function (r) { Object.assign(store, v); r(); }); }
  } };
  var fake = [{ deviceId: 'fake-cam', kind: 'videoinput', label: 'Integrated Webcam', groupId: 'g1' }];
  var md = { enumerateDevices: function () { return Promise.resolve(fake); }, getUserMedia: function () { return Promise.reject(new Error('preview')); }, getSupportedConstraints: function () { return {}; } };
  try { Object.defineProperty(navigator, 'mediaDevices', { configurable: true, get: function () { return md; } }); }
  catch (e) { try { navigator.mediaDevices = md; } catch (e2) {} }
})();
</script>
"@

    $driverTemplate = @'
<script>
(function () {
  var VIEW = '__VIEW__';
  var attempts = 0;
  function ready() {
    try {
      var panel = document.querySelector('[data-panel="' + VIEW + '"]');
      if (!panel || panel.hidden) return false;
      if (VIEW === 'vault' && !document.querySelector('.account')) return false;
      if (VIEW === 'history' && !document.querySelector('.history-item')) return false;
      if (VIEW === 'create') {
        var card = document.querySelector('#generatedCard');
        if (!card || card.hidden) return false;
      }
      return true;
    } catch (e) { return false; }
  }
  function go() {
    attempts++;
    try {
      var panel = document.querySelector('[data-panel="' + VIEW + '"]');
      if (panel && panel.hidden) {
        var tab = document.querySelector('.main-tab[data-view="' + VIEW + '"]');
        if (tab) tab.click();
      }
      if (VIEW === 'create') {
        var field = document.querySelector('[data-creator-field="content"]');
        if (field) field.value = 'https://github.com/OFFICIAL-ZXKTS';
        var card = document.querySelector('#generatedCard');
        if (card && card.hidden && typeof generateQr === 'function') generateQr();
      }
    } catch (e) {}
    if (!ready() && attempts < 160) { setTimeout(go, 50); return; }
    document.documentElement.setAttribute('data-shot-ready', '1');
  }
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
  setTimeout(go, 120);
})();
</script>
'@

    function Get-Driver([string]$view) {
        return $driverTemplate.Replace('__VIEW__', $view)
    }

    $popupHtml = [System.IO.File]::ReadAllText((Join-Path $dir 'popup.html'))

    foreach ($name in @('scan', 'vault', 'create', 'history')) {
        $page = $popupHtml.Replace('<script src="jsqr.js"></script>', $shim + "`n    <script src=`"jsqr.js`"></script>")
        $page = $page.Replace('<script src="popup.js"></script>', '<script src="popup.js"></script>' + "`n    " + (Get-Driver $name))
        [System.IO.File]::WriteAllText((Join-Path $dir "popup-$name.html"), $page, $utf8NoBom)
    }

    # --- the frame around each picture ---------------------------------------
    $views = @{
        scan    = @{ chip = '100% LOCAL &middot; NOTHING IS UPLOADED'; h1 = 'Scan any QR code'; p = 'Camera, image file, the current tab, your clipboard or pasted text &mdash; decoded inside the extension, with no server involved.'; bullets = @(
            @('Five ways to scan', 'Camera, image, tab, clipboard or paste.'),
            @('More than one code at a time', 'A page or image holding several QR codes is read in full.'),
            @('Nothing opens by itself', 'Links are always a click away, never automatic.')) }
        vault   = @{ chip = 'OFFLINE 2FA VAULT'; h1 = 'Your 2FA codes, on your device only'; p = 'Import otpauth:// setup codes, get live rotating TOTP and HOTP codes, and keep an encrypted backup you control.'; bullets = @(
            @('Honours the real settings', 'Digits, period, algorithm and HOTP counter come from the QR code itself.'),
            @('Encrypted backup &amp; restore', 'PBKDF2 (210,000 rounds) and AES-GCM-256 protect the export.'),
            @('Secrets never leave the profile', 'Everything stays in your own Chrome storage.')) }
        create  = @{ chip = 'CREATE &middot; SHARE'; h1 = 'Make a QR code for anything'; p = 'Links, Wi-Fi, email, SMS, phone numbers, map locations and contact cards &mdash; generated locally and downloadable as a PNG.'; bullets = @(
            @('Eight ready-made templates', 'Or encode any text you like.'),
            @('Copy or download', 'Take the PNG anywhere, no watermark, no account.'),
            @('Generated on your machine', 'The payload never leaves the browser.')) }
        history = @{ chip = 'PRIVATE HISTORY'; h1 = 'Your scans, searchable and local'; p = 'Keep an optional history of general QR scans on this device &mdash; and nothing more.'; bullets = @(
            @('Off by default', 'One toggle decides whether scans are remembered.'),
            @('Search in a keystroke', 'Find any earlier scan without leaving the popup.'),
            @('Authenticator secrets are excluded', 'Setup codes are never written to history.')) }
    }

    foreach ($name in $views.Keys) {
        $v = $views[$name]
        $bulletHtml = ""
        foreach ($b in $v.bullets) { $bulletHtml += "<li><b>$($b[0])</b><span>$($b[1])</span></li>" }
        $mock = @"
<!doctype html>
<html><head><meta charset="utf-8"><title>QR Studio</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;height:100%}
  body{
    font-family:'Plus Jakarta Sans',Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
    color:#F3F4F6;
    background:
      radial-gradient(ellipse 44% 60% at 18% 6%, rgba(249,115,22,.22), transparent 66%),
      radial-gradient(ellipse 40% 55% at 90% 90%, rgba(30,110,190,.20), transparent 66%),
      radial-gradient(ellipse 70% 50% at 60% 50%, rgba(12,13,16,.80), transparent 72%),
      #0C0D10;
    display:flex;align-items:center;gap:92px;padding:0 112px;overflow:hidden;
  }
  .shot{width:380px;height:600px;border-radius:20px;overflow:hidden;flex:0 0 auto;
    border:1px solid rgba(255,255,255,.10);
    box-shadow:0 40px 90px rgba(0,0,0,.6), 0 0 0 12px rgba(255,255,255,.03);}
  iframe{width:380px;height:600px;border:0;display:block}
  .copy{max-width:660px}
  .chip{display:inline-block;padding:9px 18px;border:1px solid rgba(16,185,129,.34);border-radius:99px;
    color:#10B981;background:rgba(16,185,129,.09);font-size:13px;font-weight:800;letter-spacing:.14em}
  h1{margin:30px 0 18px;font-size:58px;line-height:1.03;letter-spacing:-.035em;font-weight:800}
  p.lead{margin:0 0 30px;max-width:610px;color:#9CA3AF;font-size:22px;line-height:1.45}
  ul{margin:0;padding:0;list-style:none;display:grid;gap:18px}
  li{position:relative;padding-left:26px}
  li::before{content:"";position:absolute;left:0;top:8px;width:9px;height:9px;border-radius:3px;
    background:#F97316;box-shadow:0 0 12px rgba(249,115,22,.45)}
  li b{display:block;font-size:19px;font-weight:800;margin-bottom:3px}
  li span{color:#9CA3AF;font-size:17px}
</style></head>
<body>
  <div class="shot"><iframe src="${base}popup-$name.html"></iframe></div>
  <div class="copy">
    <span class="chip">$($v.chip)</span>
    <h1>$($v.h1)</h1>
    <p class="lead">$($v.p)</p>
    <ul>$bulletHtml</ul>
  </div>
</body></html>
"@
        [System.IO.File]::WriteAllText((Join-Path $dir "mock-$name.html"), $mock, $utf8NoBom)
    }

    # --- take the pictures ----------------------------------------------------
    function Capture([string]$fileName, [int]$scale) {
        $out = Join-Path $dir "shots\mock-$fileName-$scale.png"
        $chromeArgs = @(
            '--headless=new',
            '--disable-gpu',
            '--hide-scrollbars',
            '--no-first-run',
            '--no-default-browser-check',
            "--force-device-scale-factor=$scale",
            "--user-data-dir=$dir\profile-$scale",
            '--window-size=1280,800',
            '--virtual-time-budget=9000',
            "--screenshot=$out",
            "$base$fileName.html"
        )
        & $Chrome @chromeArgs | Out-Null
        Start-Sleep -Milliseconds 400
        if (-not (Test-Path $out)) { throw "capture failed: $fileName at $scale" }
        return $out
    }

    # --- put the footer bar on and save --------------------------------------
    function New-Screenshot([string]$srcPath, [string]$outPath, [int]$scale) {
        $src = [System.Drawing.Bitmap]::new($srcPath)
        $w = 1280 * $scale
        $h = 800 * $scale
        $body = 720 * $scale
        $canvas = [System.Drawing.Bitmap]::new($w, $h)
        $g = [System.Drawing.Graphics]::FromImage($canvas)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

        $dest = [System.Drawing.Rectangle]::new(0, 0, $w, $body)
        $srcRect = [System.Drawing.Rectangle]::new(0, 0, $src.Width, [int]($src.Height * $body / $h))
        $g.DrawImage($src, $dest, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
        $src.Dispose()

        $left = $canvas.GetPixel(40 * $scale, ($body - 5)); $right = $canvas.GetPixel($w - 40 * $scale, ($body - 5))
        $c1 = [System.Drawing.Color]::FromArgb(255, [int](($left.R + $right.R) / 2), [int](($left.G + $right.G) / 2), [int](($left.B + $right.B) / 2))
        $c2 = [System.Drawing.Color]::FromArgb(255, [int]($c1.R * 0.55), [int]($c1.G * 0.55), [int]($c1.B * 0.55))
        $rect = [System.Drawing.Rectangle]::new(0, $body, $w, ($h - $body))
        $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, $c1, $c2, 90)
        $g.FillRectangle($brush, $rect); $brush.Dispose()

        $font = [System.Drawing.Font]::new("Segoe UI", 12 * $scale, [System.Drawing.FontStyle]::Regular)
        $muted = [System.Drawing.Color]::FromArgb(255, 140, 150, 175)
        $g.DrawString("QR Studio  -  private QR scanner & authenticator", $font, [System.Drawing.SolidBrush]::new($muted), 40 * $scale, ($body + 28 * $scale))
        $rightBox = [System.Drawing.RectangleF]::new(0, ($body + 28 * $scale), ($w - 40 * $scale), 30 * $scale)
        $fmt = [System.Drawing.StringFormat]::new()
        $fmt.Alignment = [System.Drawing.StringAlignment]::Far
        $g.DrawString("github.com/Kernlab-001/QR-Studio-Scanner-Authenticator", $font, [System.Drawing.SolidBrush]::new($muted), $rightBox, $fmt)
        $fmt.Dispose(); $font.Dispose()

        $g.Dispose()
        $canvas.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $canvas.Dispose()
    }

    function Save-Jpeg([string]$srcPath, [string]$dstPath) {
        $img = [System.Drawing.Bitmap]::new($srcPath)
        $enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
        $p = [System.Drawing.Imaging.EncoderParameters]::new(1)
        $p.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, 94)
        $img.Save($dstPath, $enc, $p)
        $img.Dispose(); $p.Dispose()
    }

    $shotsDir = Join-Path $root 'store\screenshots'
    $galleryDir = Join-Path $root 'docs\screenshots'
    New-Item -ItemType Directory -Force -Path $shotsDir | Out-Null
    New-Item -ItemType Directory -Force -Path $galleryDir | Out-Null

    Write-Host "capturing and building the pictures:"
    foreach ($name in @('scan', 'vault', 'create', 'history')) {
     try {
        $small = Capture "mock-$name" 1
        $large = Capture "mock-$name" 2
        $png = Join-Path $shotsDir "$name.png"
        New-Screenshot $small $png 1
        New-Screenshot $large (Join-Path $dir "shots\final-$name.png") 2
        Save-Jpeg (Join-Path $dir "shots\final-$name.png") (Join-Path $galleryDir "$name.jpg")
        $size = [System.Drawing.Image]::FromFile($png)
        Write-Host ("  {0,-8} store {1}x{2}   gallery 2560x1600" -f @($name, $size.Width, $size.Height))
        $size.Dispose()
     } catch {
        Write-Host ("FAILED on {0} at line {1}" -f $name, $_.InvocationInfo.ScriptLineNumber)
        Write-Host ("  " + $_.InvocationInfo.Line.Trim())
        Write-Host ("  " + $_.Exception.Message)
        throw
     }
    }

    Copy-Item (Join-Path $root 'icons\icon128.png') (Join-Path $root 'store\icon-128.png') -Force
    Write-Host "  store/icon-128.png refreshed"

    if (-not $KeepTemp) { Remove-Item $dir -Recurse -Force }
    Write-Host "done"
}
finally {
    Pop-Location
}

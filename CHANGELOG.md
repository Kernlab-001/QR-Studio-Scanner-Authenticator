# Changelog

All notable changes to QR Studio are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [2.0.0] — 2026-10-20

### Added

- **Vault** — offline 2FA vault for standard `otpauth://` TOTP and HOTP setup
  codes, imported by scanning the setup QR or entered by hand.
  - Honours the digit count, time period, algorithm and HOTP counter declared
    by the QR payload instead of assuming 6 digits / 30 seconds / SHA-1.
  - Favourite, search and manual-entry flows.
  - Password-encrypted backup and restore
    (`qr-studio-encrypted-v1`, PBKDF2-SHA-256 210,000 iterations → AES-GCM-256).
- **Create** — local QR generation for text, URLs, Wi-Fi, email, SMS, phone,
  map locations and contact cards, with copy and PNG download.
- **History** — opt-in local history of general QR scans, with search. Off by
  default; authenticator setup secrets are never written to it.
- **Scan sources** — camera, image file, clipboard image, current tab
  (`chrome.tabs.captureVisibleTab` on demand) and pasted QR content.
- Bundled offline QR decoder so scanning works on Chrome builds without the
  native `BarcodeDetector` API.
- Dedicated extension icon set (16/32/48/128/512) and a matching flat brand
  mark in the popup header.

### Changed

- Authenticator QR results are redacted by default: the secret is never copied
  automatically and never added to history — you must review and explicitly
  save it.
- The popup layout is now fully responsive: it no longer collapses, overlaps or
  clips when rendered in a narrow panel, and the active panel scrolls instead
  of cutting content off.
- General QR results always preserve the exact decoded payload. URLs are never
  opened automatically — there is always an explicit button.

### Security

- No network requests, no analytics, no telemetry, no remote configuration.
- Vault secrets stay in `chrome.storage.local` inside the current Chrome
  profile.

[Unreleased]: https://github.com/OFFICIAL-ZXKTS/QR-Studio-Scanner-Authenticator/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/OFFICIAL-ZXKTS/QR-Studio-Scanner-Authenticator/releases/tag/v2.0.0

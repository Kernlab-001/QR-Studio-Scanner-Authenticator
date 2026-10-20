# Changelog

All notable changes to QR Studio are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Multi-code recognition.** A tab, page or image that holds more than one QR
  code is now read in full instead of only the first one. The remaining codes are
  listed under the main result, each with its own copy and open action, and each
  is written to the scan history like any other scan.
- **Standalone tab for every section.** The header expand button opens QR Studio
  in its own tab, where the section switcher stays visible and Scan, Vault,
  Create and History all use the roomy, centred layout.
- A new icon set (16/32/48/128/512) built from the supplied artwork, and the
  same artwork used as the in-app brand mark in the popup header.

### Fixed

- The camera framing reticle no longer draws over the paste box — it belongs to
  the camera source only.
- The status pill no longer overlaps the paste field.
- The toolbar icons fill their canvas, so they line up with the neighbouring
  extensions in the Chrome toolbar.

### Changed

- The full-page layout is shared by all four sections instead of the camera view
  only, and the standalone tab keeps a default section selected.

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
- Apache-2.0 attribution header on the bundled jsQR build, so the shipped
  archive documents its own licence.
- `scripts/verify-libraries.js` — a dependency-free smoke test that encodes a
  QR code with the bundled generator and decodes it again with the bundled
  decoder.

### Changed

- Authenticator QR results are redacted by default: the secret is never copied
  automatically and never added to history — you must review and explicitly
  save it.
- The popup layout is now fully responsive: it no longer collapses, overlaps or
  clips when rendered in a narrow panel, and the active panel scrolls instead
  of cutting content off.
- General QR results always preserve the exact decoded payload. URLs are never
  opened automatically — there is always an explicit button.
- **Full UI redesign — "Tactile Obsidian & Electric Coral".** A single coral
  accent now drives every action, on a neutral obsidian surface scale, with
  emerald reserved for "local / verified", amber for security notices and
  rose for destructive actions.
- The popup is 380px wide and 600px tall, with inline SVG iconography
  replacing the old glyph characters, a floating glass status pill inside the
  camera viewfinder, and a scanning reticle that pulses while the camera is
  live.
- The result card is now hidden until a QR code is actually decoded, and the
  Create tab shows a placeholder frame instead of a blank white square until
  there is something to encode.
- QR codes now generate live as you type, debounced so the preview keeps up
  without redrawing on every keystroke.
- Vault, Create and History panels gained a security banner, a real toolbar
  hierarchy, illustrated empty states and a refined search field.
- Keyboard shortcuts: press <kbd>1</kbd>–<kbd>4</kbd> to jump between the four
  sections.

### Fixed

- **The popup no longer collapses.** Chrome sizes an extension popup by measuring
  the document, and a percentage width contributes nothing to that measurement —
  the popup was shrinking to a cramped two-column layout with a clipped camera
  name. The popup now holds its real 380px width.
- The popup is 600px tall instead of 570px, which is Chrome's maximum popup
  height. The Scan view now fits without scrolling, so the section heading is
  never cut off.

### Security

- No network requests, no analytics, no telemetry, no remote configuration.
- Vault secrets stay in `chrome.storage.local` inside the current Chrome
  profile.

[Unreleased]: https://github.com/OFFICIAL-ZXKTS/QR-Studio-Scanner-Authenticator/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/OFFICIAL-ZXKTS/QR-Studio-Scanner-Authenticator/releases/tag/v2.0.0

# Chrome Web Store listing copy

Paste-ready text for the Chrome Web Store developer console. The exact field
limits are noted next to each block.

---

## Item name
*Limit: 45 characters*

```
QR Studio — Scanner & Authenticator
```

## Short description
*Limit: 132 characters*

```
Scan and create QR codes and keep an offline 2FA vault. 100% local, no accounts, no tracking, no cloud.
```
*(110 characters)*

## Category

```
Productivity
```

## Language

```
English (United States)
```

## Description
*Limit: 16,000 characters*

```
QR Studio is a local-only Chrome extension for everything QR codes are used
for: scanning them, creating them, and keeping your FAUTHENTICATOR CODES — all
without sending a single byte to a server.

Most online QR tools upload what you scan to a remote service to decode it.
A QR code can hold a password-reset link, a Wi-Fi passphrase or a 2FA seed, and
those should never travel across the internet just to be read. QR Studio does
every bit of work inside the extension, so it keeps working when you are
offline — and your QR contents never leave your device.

SCAN QR CODES
• CAMERA — live scanning in the popup, or a dedicated full-screen scanner tab
  for phones and awkward angles.
• IMAGE — decode a QR code from any image file on your computer.
• TAB — capture and decode the QR code in the tab you are looking at.
• PASTE — paste raw QR contents or an otpauth:// setup URI as plain text.
• CLIPBOARD — paste an image with Ctrl+V, or drop an image onto the scanner.

The QR decoder is bundled with the extension, so scanning works even on Chrome
builds that lack the native BarcodeDetector API.

YOUR OFFLINE 2FA VAULT
• Import standard otpauth:// TOTP and HOTP setup codes by scanning the setup
  QR, or add them by hand.
• The vault honours the digit count, time period, algorithm and HOTP counter
  declared by the QR code itself — it does not assume 6 digits, 30 seconds and
  SHA-1.
• Live rotating codes with a countdown, favourites and search.
• Encrypted backup and restore: your vault is protected with PBKDF2-SHA-256
  (210,000 iterations) and AES-GCM-256 before it ever touches your disk. The
  backup password is never stored.

CREATE QR CODES
Generate a QR code locally for text, website links, Wi-Fi networks, email
messages, SMS messages, phone numbers, map locations and contact cards. Copy
the encoded content or download the result as a PNG.

PRIVATE SCAN HISTORY
Optional local history of general QR scans, off by default, with search.
Authenticator setup secrets are NEVER written to history.

PRIVACY YOU CAN ACTUALLY VERIFY
• No network requests. No analytics, no telemetry, no tracking, no ads.
• No account, no sign-in, no remote configuration.
• No host permissions and no content scripts — the extension cannot read or
  modify any web page on its own.
• Your vault and optional history live in chrome.storage.local, inside your own
  Chrome profile.
• The extension only asks for camera access when you actually start a camera
  scan.

QR Studio is open source and MIT licensed. Read the source, audit the
permissions, or build it yourself — it is all on GitHub.

Permission requests, in full:
• storage — saves your authenticator accounts, settings and optional scan
  history in your local Chrome profile.
• activeTab — used only when you click "Tab" to scan a QR code on the current
  page, and to open a result link in a new tab.
• Camera — requested at the moment you start a camera scan, not at install
  time.
```

## Support URL

```
https://github.com/OFFICIAL-ZXKTS/QR-Studio-Scanner-Authenticator/issues
```

## Homepage URL

```
https://github.com/OFFICIAL-ZXKTS/QR-Studio-Scanner-Authenticator
```

## Privacy policy URL

Point this at a **public** copy of `docs/PRIVACY.md` — for example:

```
https://github.com/OFFICIAL-ZXKTS/QR-Studio-Scanner-Authenticator/blob/main/docs/PRIVACY.md
```

or a GitHub Pages URL if you enable Pages for the repository:

```
https://official-zxkts.github.io/QR-Studio-Scanner-Authenticator/PRIVACY.html
```

## Privacy practices declaration

| Question | Answer |
|---|---|
| Do you collect or use user data? | **No** |
| Is all user data encrypted in transit? | N/A — no data is transmitted |
| Do you request user data for your product? | **No** |
| Do you sell or transfer user data to third parties? | **No** |

## Asset checklist

| Asset | Path | Spec |
|---|---|---|
| Store icon | `store/icon-128.png` | 128×128 PNG |
| Screenshot 1 | `store/screenshots/scan.png` | 1280×800 PNG |
| Screenshot 2 | `store/screenshots/vault.png` | 1280×800 PNG |
| Screenshot 3 | `store/screenshots/create.png` | 1280×800 PNG |
| Screenshot 4 | `store/screenshots/history.png` | 1280×800 PNG |
| Small promo tile | `store/promo-440x280.png` | 440×280 PNG |
| Large promo tile | `store/promo-tile-440x280.png` | optional, 440×280 |

## Release notes for v2.0.0
*Limit: 16,000 characters — also used as the "What's new" text*

```
Added an offline authenticator vault with TOTP and HOTP support, encrypted
backup and restore, local QR creation for links, Wi-Fi, email, SMS, phone,
maps and contacts, and an optional local scan history.

General QR results now always preserve the exact decoded payload, and
authenticator secrets are redacted, never copied automatically and never
added to history.
```

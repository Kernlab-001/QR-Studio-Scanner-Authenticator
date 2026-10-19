# Privacy Policy — QR Studio

**Last updated:** 20 October 2026
**Applies to:** QR Studio — Scanner & Authenticator (Chrome extension), version 2.0.0

## Summary

**QR Studio never transmits, sells or shares any data, and collects nothing in
the background.** The extension makes no network requests at all. Everything you
scan, create or store stays on your device, inside your own Chrome profile.

The data you deliberately save — your authenticator secrets and your opt-in
scan history — is stored **locally only**. It is never sent to us or to anyone
else, because there is no server to send it to.

## Data handling disclosure

Chrome Web Store requires every extension that handles user data to disclose it,
even when the data is stored only on the user's own device. QR Studio handles
exactly two categories:

| Data category | What it is | Purpose | Where it goes |
|---|---|---|---|
| **Authentication information** | The TOTP/HOTP secret, issuer, account name, algorithm, digits, period and counter of each authenticator you save in the vault | **App functionality** — generating your rotating codes | `chrome.storage.local` on your device. Never transmitted. |
| **User activity** | The QR payloads you scan, when you turn on "Save general QR scans on this device" (off by default) | **App functionality** — showing your own scan history | `chrome.storage.local` on your device. Never transmitted. |

No other data category is handled. Nothing is collected automatically, nothing
is sent anywhere, and no developer or third party can read it.

### Limited Use disclosure

The use of information received from Google APIs will adhere to the Chrome Web
Store User Data Policy, including the Limited Use requirements. QR Studio does
not use any Google API. It does not transfer user data to third parties, does
not use user data for advertising, and does not allow any human being to read
the data it stores.

## What the extension does not do

- It does not send QR code contents to any server.
- It does not include analytics, telemetry, crash reporting, A/B testing or
  advertising.
- It does not use a remote configuration or update-ping service.
- It does not load any remote scripts, fonts, stylesheets or images.
- It does not read, modify or transmit the content of web pages.
- It does not require an account, and there is nothing to sign up for.
- It does not use advertising or tracking identifiers.

The only network permission in the extension's manifest is `activeTab`, which
Chrome grants on demand. It is used in exactly two ways, both triggered by an
explicit click you make:

1. capturing the **visible tab** as an image when you choose the *Tab* scan
   source, so the QR code on screen can be decoded;
2. opening a result link or the full-screen camera page in a new tab.

## What is stored locally

| Data | Storage location | When it is stored | When it is deleted |
|---|---|---|---|
| Vault accounts (issuer, account name, OTP secret, algorithm, digits, period, counter, favourite flag) | `chrome.storage.local` | Only when you explicitly save an account | When you delete the account, or uninstall the extension |
| Generated OTP codes | Computed in memory only | Never written to disk | Immediately when the vault reloads or the popup closes |
| General scan history | `chrome.storage.local` | Only if you enable "Save general QR scans on this device" — **off by default** | When you clear the history, or uninstall the extension |
| User settings (scan intent, source preference, history toggle) | `chrome.storage.local` | When you change them | When you uninstall the extension |
| Encrypted vault backups | A file you choose on your disk | Only when you click **Backup** | Only by you — the extension never writes backup files on its own |

**Authenticator setup secrets are never written to scan history.** A QR code
identified as an authenticator setup code is redacted from the result, is never
copied to the clipboard automatically, and must be explicitly saved by you.

## How the data is protected

- Vault secrets are stored in `chrome.storage.local`, inside your Chrome
  profile. This storage is **not encrypted by the extension** — it inherits the
  protection of your operating system account and your Chrome profile
  encryption. Anyone with access to your unlocked profile can read it.
- When you export a backup, the file is encrypted locally before it is written
  to disk:
  - key derivation: **PBKDF2**, SHA-256, **210,000 iterations**, with a random
    16-byte salt;
  - encryption: **AES-GCM** with 256-bit key and a random 12-byte IV;
  - format identifier: `qr-studio-encrypted-v1`.
- **QR Studio never stores, logs or transmits your backup password.** If you
  lose it, the backup cannot be recovered.
- Restoring a backup decrypts it locally in the extension; the plaintext never
  leaves your device.

## Third-party code

The extension bundles two open-source libraries that run entirely inside the
browser: **jsQR** (Apache-2.0) for offline QR decoding and **QR Code generator
for JavaScript** (MIT) for local QR creation. Neither of them performs network
requests. See
[`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

## Children

QR Studio does not knowingly collect any personal information from anyone,
including children under 13, because it does not collect any information at all.

## Changes to this policy

If this policy changes, the updated version will be committed to this
repository with a new "Last updated" date, and the Chrome Web Store listing
will point to the same file in the repository.

## Contact

Questions about this policy or the extension can be raised as an issue on
GitHub: <https://github.com/OFFICIAL-ZXKTS/QR-Studio-Scanner-Authenticator/issues>

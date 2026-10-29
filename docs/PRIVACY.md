# Privacy Policy — QR Studio

**Last updated:** 26 October 2026
**Applies to:** QR Studio — Scanner & Authenticator (Chrome extension), version 2.4.2

## Summary

**QR Studio never transmits, sells or shares your QR data, and collects nothing in
the background.** Everything you scan, create or store stays on your device,
inside your own Chrome profile.

The only thing the extension ever sends anywhere is a sign-in request to the
account server, and only if you choose to create an account. There is no
telemetry, no analytics and no crash reporting.

The data you deliberately save — your authenticator secrets and your opt-in
scan history — is stored **locally only**. It is never sent to us or to anyone
else, because there is no server to send it to.

## Data handling disclosure

Chrome Web Store requires every extension that handles user data to disclose it,
even when the data is stored only on the user's own device. QR Studio handles
exactly three categories:

| Data category | What it is | Purpose | Where it goes |
|---|---|---|---|
| **Authentication information** | The TOTP/HOTP secret, issuer, account name, algorithm, digits, period and counter of each authenticator you save in the vault | **App functionality** — generating your rotating codes | `chrome.storage.local` on your device. Never transmitted. |
| **User activity** | The QR payloads you scan, when you turn on "Save general QR scans on this device" (off by default) | **App functionality** — showing your own scan history | `chrome.storage.local` on your device. Never transmitted. |
| **Purchase information** | If you buy a Pro licence: the licence key you paste in, and the email address inside it | **App functionality** — proving that the paid features are unlocked | `chrome.storage.local` on your device. Never transmitted. |
| **Personal information** | The email address you sign in with, if you create an account | **App functionality** — signing in, and remembering who you are | To the account server (Supabase) for authentication, and `chrome.storage.local` on your device. Nothing else is sent with it. |

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
- The only request it ever makes is a sign-in request to the account server,
  and only when you choose to sign in.

The only network permission in the extension's manifest is `activeTab`, which
Chrome grants on demand. It is used in exactly two ways, both triggered by an
explicit click you make:

1. capturing the **visible tab** as an image when you choose the *Tab* scan
   source, so the QR code on screen can be decoded;
2. opening a result link or the full-screen camera page in a new tab.

## Paid features

QR Studio has a paid tier, **QR Studio Pro**. The store listing says so
plainly, and this policy explains what it changes.

**What stays free, for everyone, with no account and no limit:** scanning from
the camera, an image, the current tab or pasted content; the authenticator
vault with TOTP and HOTP; encrypted backup and restore; the local scan history;
and creating a single QR code with the full styling options.

**What Pro adds:** bulk import from other authenticator apps, and batch QR
creation. Both run entirely on your device.

**How the licence is checked, and what that means for your privacy:**

- A licence key is signed by the project key and verified inside the extension
  with the **public key only**. The check happens locally, so **activating Pro
  makes no network request and the extension still never contacts a server.**
- There is no account, no sign-in, no device registration and no telemetry.
  The extension cannot tell whether you have a licence beyond what is on your
  own screen.
- The licence key, and the email address inside it, are stored in
  `chrome.storage.local` on your device and are never transmitted.
- Payment itself happens on the payment provider's own website, which is
  opened by you. The extension is not involved in the payment and never sees
  your card details.

## Accounts

The account is optional. Everything in QR Studio works without one — scanning,
the authenticator vault, the history and QR creation are free and need no
sign-in.

You can sign in **with Google** or **with an email address and a password**.
Both end up in the same place: an account on the account server, and a session
in your browser.

If you create an account:

- With Google, Google checks your address and hands the account server an
  identity for it. QR Studio never sees your Google password.
- With a password, your **email address and password go to the account server**
  (Supabase), which handles the sign-in. Your password is never stored by QR
  Studio and never passes through the extension.
- The extension keeps the signed-in **email address and a session token** in
  `chrome.storage.local` on your device, so it can tell whether you are signed
  in.
- **Nothing else is ever sent.** No QR content, no vault secrets, no scan
  history, no usage data. The extension never asks the account server anything
  about how you use it.
- Signing out removes the session from the device.

Pro features need a licence key. The key is checked offline, so it works
whether or not you are signed in — the account only decides where you are sent
when you click a Pro feature.

## Permissions, and what each one is for

| Permission | Why it is there |
|---|---|
| `storage` | Keeps your vault, settings, optional history and any licence key in your own Chrome profile. |
| `activeTab` | Scans the visible page when you choose the *Tab* source, and opens a result link in a new tab. |
| `identity` | Opens the Google sign-in window and reads the address it comes back to. It is used for nothing else. |
| Camera | Asked for at the moment you start a camera scan, not at install time. |

## Links to other pages

The extension contains **one** link that leaves the extension: a *Support
development* link in the History tab and in the footer of the full-page view.
Clicking it opens this project's support page in a new browser tab, exactly as
clicking a scanned link does.

- The extension **loads nothing** from that page. It is a plain link, so the
  extension itself still makes no network request of any kind.
- Nothing about you is passed along. The page carries no identifier, no
  referrer data about your vault and no scan history.
- The support page is a static file served by GitHub Pages, and any payment is
  handled by the payment provider you choose on that page (for example GitHub
  Sponsors). That provider may set its own cookies and has its own privacy
  policy. **We never receive your payment details, and no part of your vault
  is ever involved.**

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

The extension bundles three open-source libraries that run entirely inside the
browser: **jsQR** (Apache-2.0) and **zxing-wasm** (MIT, a WebAssembly build of
the Apache-2.0 ZXing engine) for offline QR decoding, and **QR Code generator
for JavaScript** (MIT) for local QR creation. None of them performs network
requests: the WebAssembly module is read from the extension package, and the
address the upstream build would fetch it from is overridden. See
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
GitHub: <https://github.com/Kernlab-001/QR-Studio-Scanner-Authenticator/issues>

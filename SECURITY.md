# Security Policy

## Supported versions

Only the latest published version of QR Studio receives security fixes.

| Version | Supported |
| ------- | --------- |
| 2.4.x   | ✅        |
| < 2.4.0   | ❌        |

## Reporting a vulnerability

Please **do not open a public GitHub issue** for a security problem.

Instead, report it privately through GitHub's security advisory form:

**Repository → Security → Report a vulnerability**
<https://github.com/Kernlab-001/QR-Studio-Scanner-Authenticator/security/advisories/new>

Include, as far as you can:

- the QR Studio version and Chrome version,
- the steps to reproduce,
- what an attacker gains,
- any proof-of-concept code or screenshots.

You can expect an acknowledgement within 7 days and a status update at least
every 14 days until the report is resolved. Please give the maintainers a
reasonable window to release a fix before any public disclosure.

## Scope

The following are **in scope**:

- anything that could expose vault secrets or backup files,
- remote code execution or script injection inside the extension,
- permission misuse (e.g. capturing page content the user did not ask for),
- the bundled QR decoder/creator being modified to exfiltrate data,
- the encrypted backup format being broken in a way that leaks plaintext.

The following are **out of scope**:

- findings that require a user to already have malicious code on their machine,
- the fact that vault secrets live in the unencrypted `chrome.storage.local`
  profile store (a documented, deliberate trade-off — see
  [docs/PRIVACY.md](docs/PRIVACY.md)),
- lack of sync between profiles,
- cosmetic or usability complaints.

## Good practices for users

- Protect your Chrome profile with a strong OS account password and full-disk
  encryption.
- Use **Backup** in the Vault tab to create a password-encrypted export
  (`qr-studio-encrypted-v1`, PBKDF2-SHA-256 210,000 iterations + AES-GCM-256).
- Never store the backup password inside the extension, and keep backups
  somewhere you would not store plain text.
- Remove QR Studio from Chrome if you no longer need it — uninstalling removes
  its `chrome.storage.local` data as well.

# Contributing to QR Studio

Thanks for taking the time to help. This document explains how to get a change
into the project, and the bar the change has to clear.

## Ground rules

- **One topic per pull request.** Small, focused changes get reviewed and merged
  far faster than a 2000-line diff.
- **Never add a network call.** The single most important property of this
  extension is that it works fully offline and sends nothing anywhere. If your
  feature needs the network, it probably does not belong here.
- **Never log or persist secrets.** Vault secrets, OTPs and backup passwords
  must stay out of `console.log`, out of error messages shown in the UI, and
  out of the history list.
- **Match the existing style.** Plain ES2020 JavaScript, no framework, no
  bundler, no runtime dependencies. The extension must stay loadable as plain
  files from `chrome://extensions`.

## Getting set up

```bash
git clone https://github.com/Kernlab-001/QR-Studio-Scanner-Authenticator.git
cd QR-Studio-Scanner-Authenticator
```

Then load it in Chrome:

1. `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the repository folder
4. Click the **Reload** button on QR Studio after every change

There is no `npm install` step — the project has no build step on purpose.

## Making a change

1. **Fork** the repository and create a branch off `main`:
   ```bash
   git checkout -b fix/short-description
   ```
2. Make your change, keeping commits focused:
   ```bash
   git add -A
   git commit -m "Short imperative description of the change"
   ```
3. **Test it locally** — at minimum, walk through the four tabs (Scan, Vault,
   Create, History) and confirm the popup still renders and works at the
   normal size.
4. **Push and open a pull request** against `main`, describing what changed and
   why.

## Pull request checklist

- [ ] The extension loads unpacked in Chrome without console errors
- [ ] No new permissions were added to `manifest.json` (if one is genuinely
      required, explain why in the PR description)
- [ ] No network requests, analytics or third-party services were introduced
- [ ] User-visible behaviour changes are reflected in `README.md` and
      `CHANGELOG.md`
- [ ] New UI is responsive — check the popup in a narrow panel as well as at
      its normal width
- [ ] Any new bundled third-party code is listed in
      `THIRD_PARTY_NOTICES.md` with its licence and source

## Reporting bugs

Use the **Bug report** issue template. A good report includes:

- the QR Studio version (see `manifest.json`) and your Chrome version,
- the tab (Scan / Vault / Create / History) and source you were using,
- what you expected to happen and what happened instead,
- a screenshot or a copy of the exact QR payload if it is safe to share
  (redact secrets!).

## Suggesting features

Open a **Feature request** issue describing the problem you are trying to
solve, not just the solution you have in mind. Note explicitly whether the
feature can be implemented **without any network access** — if it cannot, it
will most likely be declined.

## Adding third-party code

Bundled libraries must be:

- MIT, Apache-2.0, BSD or similarly permissive,
- vendored into the repository as a single file (no CDN, no remote import),
- listed in `THIRD_PARTY_NOTICES.md` with source URL, licence and copyright,
- usable in a browser extension without a server.

## Code of conduct

Participation in this project is governed by
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

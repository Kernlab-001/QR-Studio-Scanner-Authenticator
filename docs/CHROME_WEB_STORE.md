# Publishing QR Studio to the Chrome Web Store

Everything you need to submit the extension. The ready-to-paste listing text
lives in [`../store/STORE_LISTING.md`](../store/STORE_LISTING.md).

---

## 1. Before you start

You need:

- A **Google account** (the one that will own the store listing).
- A one-off developer registration fee for the **Chrome Web Store developer
  program**.
- A verified **email** and a **Google Payments profile** for the listing.
- The extension zipped — see step 2.

---

## 2. Build the upload zip

The store rejects a zip that contains a nested folder — the `manifest.json`
must sit at the **root** of the archive.

```bash
# Windows (PowerShell)
./scripts/package-extension.ps1

# macOS / Linux
./scripts/package-extension.sh
```

Output: `dist/qr-studio-<version>.zip`, containing only:

```
manifest.json
popup.html
popup.css
popup.js
jsqr.js
qrcode-generator.js
icons/icon16.png
icons/icon32.png
icons/icon48.png
icons/icon128.png
icons/icon512.png
```

> The ZIP root must be `manifest.json` itself, not a folder named
> `Extension/`. If you zip the folder by hand, the upload will be rejected.

---

## 3. Get a public privacy-policy URL

The store requires a **public** URL that anyone can open without logging in.

**Option A — GitHub Pages (recommended, one-time setup)**

1. In the repo, go to **Settings → Pages**.
2. Under **Source**, choose **Deploy from a branch**, branch `main`, folder
   `/docs`, then **Save**.
3. GitHub publishes `docs/index.html` a minute or two later at:

   ```
   https://official-zxkts.github.io/QR-Studio-Scanner-Authenticator/
   ```

**Option B — the raw file in the repo (no setup)**

```
https://github.com/OFFICIAL-ZXKTS/QR-Studio-Scanner-Authenticator/blob/main/docs/PRIVACY.md
```

Option A looks far more professional in the store listing, so prefer it. The
same file is kept in `docs/PRIVACY.md` for people reading the repo.

---

## 4. Create the store listing

Go to <https://chrome.google.com/webstore/devconsole> → **Add new item** →
**Upload the file you want to sell** → choose `dist/qr-studio-<version>.zip`.

Fill in the listing using [`../store/STORE_LISTING.md`](../store/STORE_LISTING.md):

| Field | Where to get it |
|---|---|
| Item name | `QR Studio — Scanner & Authenticator` |
| Short description (132 chars max) | See the listing copy file |
| Category | **Productivity** (or *Utilities*) |
| Language | English (United States) |
| Description | See the listing copy file |
| Icon | `store/icon-128.png` (128×128 PNG) |
| Screenshots | `store/screenshots/*.png` (1280×800) |
| Small promo tile | `store/promo-440x280.png` (440×280) |
| Large promo tile | `store/promo-tile-920x280.png` (920×280) |
| Extension package | `dist/qr-studio-<version>.zip` — build it with `scripts/package-extension.ps1` / `.sh` |
| Privacy policy | The public URL from step 3 |

**Privacy practices declaration** — answer as follows:

| Question | Answer |
|---|---|
| Do you collect or use user data? | **No** |
| Is all user data encrypted in transit? | N/A — no data is transmitted |
| Do you request user data for your product? | **No** |
| Do you sell or transfer user data to third parties? | **No** |

If the form asks about *single purpose*, the answer is **"Scan and create QR
codes and manage authenticator codes locally"** — that is the only thing the
extension does.

---

## 5. Permission justifications (for the review queue)

The review team asks for a justification for every permission. Paste these
verbatim.

### `storage`

> Used to store the user's authenticator accounts, extension settings and
> (opt-in) scan history locally in the user's own Chrome profile via
> `chrome.storage.local`. No data is transmitted anywhere. The user can delete
> all stored data from within the extension, and uninstalling removes it.

### `activeTab`

> Used only when the user explicitly clicks the "Tab" scan source: the
> extension captures a screenshot of the currently visible tab so the QR code
> on screen can be decoded locally. It is also used to open a scanned result
> link or the full-screen camera page in a new tab. The extension has no
> content scripts, requests no host permissions, and never reads page content
> in the background.

---

## 6. Distribution

- Choose **Public** visibility if you want anyone to install it.
- Choose **Unlisted** if you only want people with the link.
- Chrome Web Store listings are reviewed before they go live. Expect a review
  within a few days; the permission justifications above cover the usual
  questions.

### After you click Submit

1. The listing status becomes **"Under review"**. Review usually finishes within
   a few days, but first-time listings can take **up to two weeks**.
2. Google emails the developer account when the review completes.
3. If it is approved, the extension is **published to the store immediately**
   and gets a public URL like
   `https://chromewebstore.google.com/detail/<id>`. That URL is not known
   until the item is approved — so link the **GitHub repository** in the
   listing fields, not the store URL.
4. If it is rejected, the email states the reason and links to the review
   dashboard. Fix the issue, bump `version` in `manifest.json`, rebuild and
   upload again.

---

## 7. Updating an existing listing

1. Bump `version` in `manifest.json` (it must always be **higher** than the
   published version — the store rejects a re-upload of the same number).
2. Update `CHANGELOG.md`.
3. Rebuild the zip: `./scripts/package-extension.ps1`.
4. In the dev console, choose the existing item → **Upload new package**.

---

## 8. Pre-submission checklist

- [ ] `manifest.json` is valid JSON and `version` was incremented
- [ ] The zip's root contains `manifest.json` directly
- [ ] No `node_modules`, `.git`, `docs`, `scripts` or `store` inside the zip
- [ ] The extension loads unpacked in Chrome with no console errors
- [ ] The popup opens at its full 370px width with a single row of tabs
- [ ] All four tabs (Scan, Vault, Create, History) work
- [ ] Camera scanning works (and the camera permission is requested at the
      right moment, not at install time)
- [ ] The icon renders at 16px in the toolbar
- [ ] The listing text is copied from `store/STORE_LISTING.md`
- [ ] The privacy policy URL opens publicly in a private/incognito window
- [ ] The permissions declaration answers "no data collected"
- [ ] The repo's `README.md`, `LICENSE` and `THIRD_PARTY_NOTICES.md` are
      accurate for the published version

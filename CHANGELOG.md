# Changelog

All notable changes to QR Studio are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.4.8] — 2026-10-31

### Fixed

- **Importing from Google Authenticator works.** A real export was read from the wrong place and came back empty, so the import could never work.
- **Importing a 2FAS backup works.** The secret is now read from where 2FAS keeps it, and a link that only says "[hidden]" no longer stands in for the real secret.
- **A QR code with text outside plain ASCII is no longer corrupted.** Hindi, Chinese, Cyrillic, emoji and accented letters came out as rubbish, and a Wi-Fi network with an accented name or password would not connect.
- **Signing out signs you out.** The session was left behind, and the next page you opened signed you straight back in. Signing out now ends the session on the account server and takes it off the device.
- **One bad entry no longer throws the whole import away.** The good ones are imported and the bad one is named.
- **The address you are signed in with now shows** on the account page. It was written into a field that was not the one on screen.
- **An email draft writes spaces the way mail clients expect**, rather than a plus sign.

### Added

- An export split over several codes says which one it is, so "code 2 of 3" is known.
- An account with an algorithm the extension does not support is refused, rather than being imported with the wrong settings and quietly giving the wrong code.
- There are tests now, and they run on every build: the importers are checked against the formats the apps really write, and every code the extension makes is read back with the decoder that ships with it.

### Changed

- The README and the privacy policy now say what is true: your QR data never leaves your device, and the only request the extension ever makes is a sign-in request to your own account server, and only if you choose to sign in.

## [2.4.7] — 2026-10-29

### Fixed

- **Scanning a QR code from the current tab works again.** It said "Could not
  scan this tab" and gave no reason at all. It now reads the page and decodes
  the code, the way it always did. This also covers the page behind a setup
  code for an authenticator.

## [2.4.6] — 2026-10-29

### Fixed

- **A licence that has run out now stops counting the moment it does.** The
  end date is checked every time the Pro features are looked at, so a licence
  that ends while the page is open no longer unlocks anything.
- **A licence that has run out is taken out of the profile.** Nothing is left
  behind in the Chrome data that could be used later, and it is taken out
  when the page is opened again as well.
- **A Pro account that has run out is not Pro any more.** The end date
  travels with the session, so no request is needed to notice it.

### Added

- `tools/issue-claim-licence.mjs` issues the short-lived licence a buyer is
  given after paying. It lasts fifteen minutes, every one issued is
  different, and it can be imported so the same code can sit inside whatever
  handles the payment confirmation. It is deliberately not a Pro licence: it
  has to be exchanged for a Pro entitlement on the buyer's account.

## [2.4.5] — 2026-10-29

### Fixed

- **An account that includes Pro opens the Pro features straight away.** Bulk
  import and batch QR creation now open without a licence key and without the
  support page being opened first.
- The Pro panel says which Pro you have: a licence key, or an account that
  includes Pro.

### Changed

- The account panel says "Signed in. This account includes QR Studio Pro." for
  an account that includes Pro, and keeps the licence key wording for one that
  does not.

## [2.4.4] — 2026-10-29

### Fixed

- **The Google sign-in window opens in the same moment as the click.** The
  address is built by hand now, so there is no round trip to the account server
  between the click and the window. Chrome only allows an interactive sign-in
  window straight after the gesture that started it.
- **A sign-in window that cannot open now says what to do.** Instead of
  "Authorization page could not be loaded", the account page explains that
  something is blocking the window and points at signing in with an email
  address instead.
- The account server's redirect list is written down in the README, with the
  exact address to add and how to get it. A sign-in that is missing from that
  list never reaches the extension, because the account server sends it to its
  own site address instead.

### Changed

- The Google sign-in address is checked once when the account page opens
  rather than on every click, so the check never sits in the way of the
  sign-in window.

## [2.4.3] — 2026-10-29

### Fixed

- **The account tab closes itself when you are signed in.** Signing in with an
  email address, creating an account, or signing in with Google now ends the
  sign-in tab instead of leaving it open on an empty form.
- **The popup picks up the signed-in account right away.** It refreshes when
  you bring the popup back to the front, and it also hears about the change
  the moment the sign-in tab stores the session.
- **The Google session never lands in a web page.** The sign-in now returns to
  Chrome's own address for this extension, so the token is handed straight to
  the extension and never appears in the address of a website.
- A tab that was opened only to look at an already signed-in account is no
  longer closed out from under you.
- **The extension id was written down with one wrong character.** It is
  `lknekpjhbdknomipogolenajkhjpokki`.

## [2.4.2] — 2026-10-29

### Fixed

- **The account page says what went wrong instead of looking stuck.** "That email
  and password do not match", "This account still needs its email address
  confirmed", "That address already has an account - try signing in", and a
  plain message when the account server cannot be reached.
- The Google button now checks that Google sign-in is actually switched on for
  the account server before it opens a window that could only show an error
  page.

### Changed

- `tools/sign-licence.mjs` takes `--forever`, for a licence that never
  expires.

## [2.4.1] — 2026-10-27

### Fixed

- **The extension id no longer changes.** The manifest now carries the public
  key, so Chrome gives the extension the same id every time —
  `lknekpjhbdknomipogolenajkhjpokki` — whether it is loaded unpacked, installed
  from the signed package, or installed from the store. A copy you already have
  updates in place instead of arriving as a second extension.
- The key in the manifest is the **public** half of the signing key. It is not a
  secret, and the private half stays on this machine.

## [2.4.0] — 2026-10-27

### Added

- **Sign in with Google.** The account page now has a *Continue with Google*
  button next to the email form. The sign-in runs in a window that Chrome hands
  straight back to the extension, so the session never passes through a web
  page, and Google never sees your QR codes or your vault.
- The `identity` permission is used for exactly that one thing: opening the
  sign-in window and reading the address it comes back to.

### Fixed

- The email and password form is now the fallback rather than the main way in.

## [2.3.3] — 2026-10-27

### Added

- **The account system is live.** The extension is pointed at the account
  server, so the sign-in page works: a new account, a sign in, and a sign out,
  all without leaving the device.
- The store screenshots and the gallery images are now 2560 x 1600, rendered at
  twice the size instead of being scaled up afterwards.

### Fixed

- **The privacy policy and the support page now look like the extension.** They
  used their own blue theme and a drawn mark; they use the extension's obsidian
  surfaces, its coral accent and the real icon.
- **Flipping the history switch no longer makes the panel jump.** The list is
  left alone and only the note under the switch changes, so the setting simply
  stays until you turn it off again.

## [2.3.2] — 2026-10-26

### Added

- **An account system.** You can create an account and sign in, and a Pro
  feature now asks for one when it needs it: click *Bulk import* or *Batch*
  without a licence key and you are sent to the sign-in page if you are not
  signed in, or to the payment page if you are. A licence key still unlocks Pro
  on its own, so that check stays offline. Every Pro feature goes through the
  same gate, so adding one later is a one-line change.
- The account page lives inside the extension, so the signed-in session stays
  in the extension's own storage. The Supabase client is bundled locally and
  is never loaded from a CDN.

### Fixed

- **The authenticator code is no longer drawn inside a grey slab.** The code
  sits in a button that was never styled, so the browser painted its own
  button background around the digits. The box is gone and the code reads as
  clean, bright monospace on the card.
- **The brand mark is smaller and calmer.** The artwork's glowing orange tile
  was loud at header size, so the header and the support page now use the QR
  glyph on its own, in white, with the orange accent kept.

### Changed

- **A scanned setup code shows the code straight away.** Scanning a 2FA setup
  QR used to show the details and ask you to walk through a form before you
  could see any code. The rotating code now appears in the result card, counts
  down as usual, and *Save to vault* puts it in the vault in one click. The
  secret itself stays hidden in the setup URI, exactly as before.
- The support page is laid out at a more readable size, the one-off tip row
  now offers $2, $5, $10, $15, $20, $50, $100 and a custom amount, and the
  whole page uses the extension's own colours and controls so it reads as part
  of the same product.

## [2.3.1] — 2026-10-26

### Fixed

- **The vault toolbar no longer overflows the popup.** With the *Bulk import*
  button added, the row of buttons was wider than the popup, so the button ran
  past the right edge and its Pro badge was cut off. The row now wraps.
- The licence line in the Pro card is trimmed to one line, so the licence
  details no longer crowd the *Remove licence* link.

## [2.3.0] — 2026-10-26

### Added

- **QR Studio Pro.** A paid tier that adds two things the free extension does
  not have:
  - **Bulk import.** A Google Authenticator export code, a 2FAS export file or
    a plain list of setup URIs can be read in one go, and every account is
    imported at once — with its algorithm, digit count, period and HOTP
    counter intact. The export is parsed on the device and is never shown,
    because it carries every secret.
  - **Batch QR creation.** One payload per line becomes one PNG per line, and
    the whole set is packed into a single ZIP, built locally.
- The free extension keeps everything it had: scanning, the authenticator
  vault, the history and single QR creation are unchanged and stay free for
  everyone.
- **The licence is checked offline.** A licence is signed by the project key
  and verified in the browser with the public key alone, so activating Pro
  needs no account, no sign-in and no network request of any kind. The
  extension still never talks to a server.

## [2.2.0] — 2026-10-26

### Added

- **A support link.** The History tab and the footer of the full-page view now
  carry a *Support development* link. It opens a static page in a new tab — the
  extension itself still makes no request of any kind, and nothing about the
  vault is ever passed on.
- A public support page, served by GitHub Pages, listing the ways to support
  the project and what support pays for.

### Fixed

- **A 2FA secret can no longer be copied out of a multi-code frame.** When a
  page held several codes, the extra results offered a plain *Copy* button
  that copied the raw setup URI, shared secret included. The extra result is
  now redacted in the same way as the main one, and it only offers *Import*.
- **Pressing Enter in the manual authenticator form no longer reloads the
  popup.** The form used to submit itself, which threw away everything that
  had been typed. Enter now saves the account.
- **The camera starts by itself.** Opening the camera tab, or pressing *Scan
  setup QR* in the vault, switched to the camera view but never started the
  stream, so the screen sat empty until a second click.
- **A creator draft is no longer lost.** Switching away from the Create tab and
  coming back rebuilt the fields from an empty draft, so the typed content
  disappeared. The draft is now written down as you type.
- **Setup URIs with a separated algorithm name are accepted.** `SHA-256` and
  `SHA_512` are now understood alongside `SHA256` and `SHA512`; an unknown
  algorithm is still refused, and the message names what was wrong.
- **A large image with no code in it no longer freezes the popup.** The
  multi-code sweep handed the thread back between tiles instead of running
  every tile in one go.
- **Styled codes are easier for other readers.** Circle and diamond modules now
  reach slightly past their own cell, so neighbouring modules stay joined
  instead of touching at a single point, and the creator shows a short note
  when the quiet zone is narrower than the 4 modules most scanners expect.

## [2.1.0] — 2026-10-26

### Added

- **A second, stronger QR decoder.** The extension now ships a small WebAssembly
  build of ZXing next to the bundled reader. It reads every code in a frame in one
  pass, so a page that holds several codes is read in full, and a pale or
  low-contrast code that the older reader missed is now found. The module is
  loaded from the extension package and never from a network address.
- **Styled QR creation.** The Create tab can now set the module shape (square,
  rounded, circle, diamond), the error-correction level (L/M/Q/H), the quiet
  zone, the output size and the foreground and background colours, and export
  the result as PNG or SVG. A low-contrast warning appears before an unscannable
  code is produced, and the finder, timing and alignment patterns always stay
  square so a styled code still scans.
- Arrow-key navigation for the section and source switchers, and a
  `prefers-reduced-motion` fallback for the scanning reticle.
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

- **The scan panel no longer breaks.** The camera stage now has a fixed height, so
  nothing shifts when a preview, the paste box or a result appears. The paste box
  sizes itself instead of being cut off, and the result card is shown without
  slicing the heading above it.
- Multi-code recognition sweeps two overlapping tile grids and decodes the frame
  at full resolution, so codes that sit close together — and coloured or
  low-contrast codes — are read as well.
- A pale code that the bundled reader could not see is now found: the grey levels
  are stretched across the full range before a second attempt.
- The camera framing reticle no longer draws over the paste box — it belongs to
  the camera source only.
- The status pill no longer overlaps the paste field.
- The toolbar icons fill their canvas, so they line up with the neighbouring
  extensions in the Chrome toolbar.

### Changed

- The **Tab** source is now selected by default when the popup opens, so the
  page you are looking at can be scanned straight away. The camera, image and
  paste sources are one click away.
- Every code found in a frame is now shown as a full result of its own - type,
  label, complete payload and its own open and copy buttons - instead of a
  single squeezed line.
- The full-page layout is shared by all four sections instead of the camera view
  only, and the standalone tab keeps a default section selected.

### Security

- The new WebAssembly decoder is read from the extension package. The upstream
  build would fetch it from a public CDN, and that address is overridden, so
  the extension still makes no network request of any kind.

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

[Unreleased]: https://github.com/Kernlab-001/QR-Studio-Scanner-Authenticator/compare/v2.4.2...HEAD
[2.4.2]: https://github.com/Kernlab-001/QR-Studio-Scanner-Authenticator/compare/v2.4.1...v2.4.2
[2.4.1]: https://github.com/Kernlab-001/QR-Studio-Scanner-Authenticator/compare/v2.4.0...v2.4.1
[2.4.0]: https://github.com/Kernlab-001/QR-Studio-Scanner-Authenticator/compare/v2.3.3...v2.4.0
[2.3.3]: https://github.com/Kernlab-001/QR-Studio-Scanner-Authenticator/compare/v2.3.2...v2.3.3
[2.3.2]: https://github.com/Kernlab-001/QR-Studio-Scanner-Authenticator/compare/v2.3.1...v2.3.2
[2.3.1]: https://github.com/Kernlab-001/QR-Studio-Scanner-Authenticator/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/Kernlab-001/QR-Studio-Scanner-Authenticator/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/Kernlab-001/QR-Studio-Scanner-Authenticator/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/Kernlab-001/QR-Studio-Scanner-Authenticator/releases/tag/v2.1.0
[2.0.0]: https://github.com/Kernlab-001/QR-Studio-Scanner-Authenticator/releases/tag/v2.0.0

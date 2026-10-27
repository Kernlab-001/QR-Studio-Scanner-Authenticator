# Third-party notices

This extension bundles the following local browser-side libraries. They are included so QR code scanning and creation work without uploading QR data to a remote service.

## jsQR 1.4.0

- Source: <https://github.com/cozmo/jsQR>
- Distributed file: `jsqr.js`
- License: Apache License 2.0
- Copyright: Cozmo / jsQR contributors

## QR Code generator for JavaScript 1.4.4

- Source: <https://github.com/kazuhikoarase/qrcode-generator>
- Distributed file: `qrcode-generator.js`
- License: MIT License
- Copyright: Kazuhiko Arase

## zxing-wasm 3.1.6

- Source: <https://github.com/Sec-ant/zxing-wasm>
- Distributed files: `vendor/zxing/zxing-reader.js`, `vendor/zxing/zxing_reader.wasm`
- License: MIT License
- Copyright: zxing-wasm contributors
- Upstream engine: ZXing C++ (<https://github.com/zxing-cpp/zxing-cpp>), Apache License 2.0

The upstream build of this library downloads its WebAssembly file from a public CDN. QR Studio does not do that:
`popup.js` overrides `locateFile` so the module is always read from `vendor/zxing/` inside the extension package,
and no request ever leaves the machine.

## Supabase JS client 2.118.0

- Source: <https://github.com/supabase/supabase-js>
- Distributed file: `vendor/supabase/supabase.js`
- License: MIT License
- Copyright: Supabase

The account client is bundled locally and never loaded from a CDN, so no remote
code is executed. It is only used to sign in and sign up against the account
server named in `account-config.js`.

Both distributed files retain their upstream copyright and licence header. `qrcode-generator.js` ships the original
MIT header from Kazuhiko Arase; `jsqr.js` is a bundled build of jsQR 1.4.0 and carries an Apache-2.0 attribution
header added at the top of the file. The bundled library code itself is unmodified.

# Vendored decoder

`zxing-reader.js` and `zxing_reader.wasm` come from
[zxing-wasm](https://github.com/Sec-ant/zxing-wasm) 3.1.6 (MIT).
The wrapper is prebuilt, so the extension still needs no build step.

The default build of that project loads its WebAssembly file from a public
CDN. QR Studio never does that: `popup.js` overrides `locateFile` so the
module is always read from this folder, inside the extension package.

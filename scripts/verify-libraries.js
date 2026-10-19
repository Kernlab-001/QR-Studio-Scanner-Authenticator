// Round-trip check for the two vendored libraries.
// Encodes a string with qrcode-generator, rasterises the matrix by hand,
// then decodes it with the bundled jsQR build. Proves the patched
// jsqr.js still loads and decodes correctly.
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const qrcode = require(path.join(ROOT, 'qrcode-generator.js'));
const jsQR = require(path.join(ROOT, 'jsqr.js'));

console.log('qrcode-generator type:', typeof qrcode);
console.log('jsQR type:', typeof jsQR);

const PAYLOAD = 'HELLO QR STUDIO 2.0.0';

const qr = qrcode(0, 'M');
qr.addData(PAYLOAD);
qr.make();

const count = qr.getModuleCount();
const quiet = 4;
const scale = 4;
const size = (count + quiet * 2) * scale;

const data = new Uint8ClampedArray(size * size * 4).fill(255);
for (let r = 0; r < count; r++) {
  for (let c = 0; c < count; c++) {
    if (!qr.isDark(r, c)) continue;
    for (let dy = 0; dy < scale; dy++) {
      for (let dx = 0; dx < scale; dx++) {
        const y = (r + quiet) * scale + dy;
        const x = (c + quiet) * scale + dx;
        const i = (y * size + x) * 4;
        data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
      }
    }
  }
}

console.log('module count:', count, '| raster:', size + 'x' + size);

const result = jsQR(data, size, size);
if (!result) {
  console.error('FAIL: jsQR returned no result');
  process.exit(1);
}
console.log('decoded:', JSON.stringify(result.data));
if (result.data !== PAYLOAD) {
  console.error('FAIL: payload mismatch');
  process.exit(1);
}
console.log('PASS: qrcode-generator -> jsQR round trip OK');

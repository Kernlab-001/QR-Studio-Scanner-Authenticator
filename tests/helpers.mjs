// Helpers for the tests: a real-format Google Authenticator export, a 2FAS
// backup, and a way to read a generated QR code back.

// --- protobuf, just enough for a Google Authenticator export -----------------

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Google writes the secret as raw bytes, so a base32 secret is turned back
// into the bytes it stands for.
export function base32ToBytes(text) {
  const clean = String(text || '').toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const character of clean) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) throw new Error(`Not a base32 secret: ${text}`);
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function varint(value) {
  const bytes = [];
  let remaining = value;
  while (remaining > 127) {
    bytes.push((remaining & 0x7f) | 0x80);
    remaining >>>= 7;
  }
  bytes.push(remaining);
  return bytes;
}

function tag(field, wire) {
  return varint((field << 3) | wire);
}

function lengthDelimited(field, payload) {
  const body = typeof payload === 'string' ? Buffer.from(payload, 'utf8') : Buffer.from(payload);
  return Buffer.from([...tag(field, 2), ...varint(body.length), ...body]);
}

function varintField(field, value) {
  return Buffer.from([...tag(field, 0), ...varint(value)]);
}

// One account, the way Google writes it.
export function otpParameters({ secret, issuer = '', accountName = '', algorithm = 1, digits = 1, type = 2, counter = 0 }) {
  return Buffer.concat([
    lengthDelimited(1, base32ToBytes(secret)),
    issuer ? lengthDelimited(2, issuer) : Buffer.alloc(0),
    lengthDelimited(3, accountName),
    varintField(4, algorithm),
    varintField(5, digits),
    varintField(6, type),
    varintField(7, counter)
  ]);
}

// The whole export. Google puts the accounts in field 1 and the version in
// field 2, and splits a big export over several codes using fields 3 to 5.
export function migrationPayload({ accounts = [], version = 1, batchSize = 0, batchIndex = 0, batchId = 0 } = {}) {
  const parts = accounts.map((account) => lengthDelimited(1, otpParameters(account)));
  if (version) parts.push(varintField(2, version));
  if (batchSize) parts.push(varintField(3, batchSize));
  if (batchIndex) parts.push(varintField(4, batchIndex));
  if (batchId) parts.push(varintField(5, batchId));
  return Buffer.concat(parts);
}

// The 2FAS shape, as the app writes it: the secret sits beside the settings,
// not inside the setup link.
export function twoFasBackup(services) {
  return {
    version: 3,
    services: services.map((service) => ({
      name: service.name || 'Account',
      secret: service.secret,
      updatedAt: 1700000000,
      otp: {
        link: service.link || null,
        account: service.accountName || '',
        issuer: service.issuer || '',
        digits: service.digits || 6,
        period: service.period || 30,
        algorithm: service.algorithm || 'SHA1',
        tokenType: service.tokenType || 'TOTP',
        counter: service.counter
      }
    })),
    groups: [],
    updatedAt: 1700000000
  };
}

// --- reading a generated code back -------------------------------------------

// Draws the code the way the extension does and reads it with the bundled
// decoder, so a round trip really goes through both.
export function readQrBack(qr, jsQR, { scale = 4, quiet = 4 } = {}) {
  const cells = qr.getModuleCount();
  const size = (cells + quiet * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let row = 0; row < cells; row += 1) {
    for (let column = 0; column < cells; column += 1) {
      if (!qr.isDark(row, column)) continue;
      for (let y = 0; y < scale; y += 1) {
        for (let x = 0; x < scale; x += 1) {
          const pixel = (((row + quiet) * scale + y) * size + ((column + quiet) * scale + x)) * 4;
          data[pixel] = 0;
          data[pixel + 1] = 0;
          data[pixel + 2] = 0;
          data[pixel + 3] = 255;
        }
      }
    }
  }
  const result = jsQR(data, size, size);
  return result ? result.data : null;
}

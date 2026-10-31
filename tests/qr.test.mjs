// The codes the extension makes, read back with the decoder it ships.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadExtension, jsQR } from './harness.mjs';
import { readQrBack } from './helpers.mjs';

const context = loadExtension();

const style = { ecl: 'M', margin: 4, size: 512, shape: 'square', foreground: '#000000', background: '#ffffff' };

test('a code with plain text survives the round trip', () => {
  const qr = context.buildQr('Hello QR Studio', style);
  assert.equal(readQrBack(qr, jsQR), 'Hello QR Studio');
});

test('a code with text outside plain ASCII survives the round trip', () => {
  const payloads = [
    'café',
    'Zürich',
    'नमस्ते',
    '你好，世界',
    'Привет',
    'こんにちは',
    'emoji 🎉🚀',
    'WIFI:T:WPA;S:Café Gast;P:naïve-pässword;;'
  ];
  for (const payload of payloads) {
    const qr = context.buildQr(payload, style);
    assert.equal(readQrBack(qr, jsQR), payload, `"${payload}" comes back as it went in`);
  }
});

test('an email draft writes spaces the way mail clients expect', () => {
  const uri = context.buildCreatorPayload('email', {
    email: 'someone@example.com',
    subject: 'Hello world & friends',
    body: 'See you soon'
  });
  assert.match(uri, /subject=Hello%20world%20%26%20friends/);
  assert.doesNotMatch(uri, /\+/);
});

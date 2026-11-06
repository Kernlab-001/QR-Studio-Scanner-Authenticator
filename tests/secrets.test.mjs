// The guards that keep a secret out of the wrong place: a copied export, a
// file name, or a licence that was thrown away by a bad moment.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadExtension } from './harness.mjs';

const context = loadExtension();

test('an authenticator setup or an export is never copied raw', () => {
  assert.equal(context.mayCopyRaw('authenticator'), false, 'a setup URI carries a secret');
  assert.equal(context.mayCopyRaw('migration'), false, 'an export carries every secret');
  assert.equal(context.mayCopyRaw('url'), true);
  assert.equal(context.mayCopyRaw('wifi'), true);
  assert.equal(context.mayCopyRaw('text'), true);
});

test('the name of a file in a batch says what the code is, not what it says', () => {
  const pro = context.QRStudioPro;
  assert.equal(pro.safeFileName('wifi', 0), '001-wifi.png');
  assert.equal(pro.safeFileName('link', 4), '005-link.png');
  assert.equal(pro.safeFileName('', 0), '001-code.png');

  // A payload must never end up in the name, whichever way it is passed.
  const payload = 'WIFI:T:WPA;S:Home;P:hunter2;;';
  const name = pro.safeFileName(context.batchFileHint(payload), 2);
  assert.equal(name, '003-wifi.png');
  assert.doesNotMatch(name, /hunter2/, 'the password is not in the file name');
});

test('a batch file name never holds the payload', () => {
  const payloads = [
    'https://example.com/reset?token=SECRETTOKEN',
    'WIFI:T:WPA;S:CafeHarbour;P:hunter2;;',
    'otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example'
  ];
  for (const payload of payloads) {
    const name = context.QRStudioPro.safeFileName(context.batchFileHint(payload), 0);
    assert.doesNotMatch(name, /SECRETTOKEN|hunter2|JBSWY3DPEHPK3PXP/);
    assert.doesNotMatch(name, /example|Home|alice/);
  }
});

test('a licence that cannot be checked is kept', async () => {
  const local = loadExtension();
  const key = 'QRS1.eyJ2IjoxLCJwbGFuIjoicHJvIn0.aaaa';
  await local.chrome.storage.local.set({ qrStudioLicence: { key, savedAt: 0 } });

  // The check fails for a moment, rather than the licence being wrong.
  const realCrypto = local.crypto;
  local.crypto = {
    ...realCrypto,
    subtle: {
      ...realCrypto.subtle,
      importKey: realCrypto.subtle.importKey.bind(realCrypto.subtle),
      verify: async () => { throw new Error('the browser is busy'); }
    }
  };

  const read = await local.QRStudioLicence.read();
  const stored = await local.chrome.storage.local.get('qrStudioLicence');

  assert.equal(read, null, 'the licence does not count as Pro while it cannot be checked');
  assert.ok(stored?.qrStudioLicence?.key, 'but the key is still there for next time');
});

test('a licence that was never a licence is taken out of the profile', async () => {
  const local = loadExtension();
  await local.chrome.storage.local.set({ qrStudioLicence: { key: 'not-a-licence', savedAt: 0 } });

  await local.QRStudioLicence.read();

  const stored = await local.chrome.storage.local.get('qrStudioLicence');
  assert.equal(stored?.qrStudioLicence, undefined, 'a key that can never work is not kept');
});

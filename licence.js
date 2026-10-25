// QR Studio Pro licence verification.
//
// A licence is signed by the project key and checked here, in the browser,
// with the public key only. Nothing is sent anywhere to validate it, so the
// extension keeps its promise of making no network request of any kind.
//
// Key format: QRS1.<base64url payload>.<base64url signature>
// The signature is ECDSA P-256 over SHA-256, in the raw r||s form that the
// Web Crypto API expects.
(function (global) {
  'use strict';

  const PUBLIC_KEY = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAElFsX8qGQQnaR3lTE9Hy-PzlCT1jSBC64CMtHwW5FZzSo_F0GXdxeySQrchiXdsy3pdxpVrb2L-mzi18Q-T8cSg';
  const STORAGE_KEY = 'qrStudioLicence';
  const PREFIX = 'QRS1';

  let cached = null;

  function decodeSegment(segment) {
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    return new Uint8Array([...binary].map((character) => character.charCodeAt(0)));
  }

  async function publicKey() {
    const raw = decodeSegment(PUBLIC_KEY);
    return crypto.subtle.importKey(
      'spki',
      raw,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
  }

  // Checks the signature and the expiry. Returns { ok, reason, payload }.
  async function verify(licenceKey) {
    const key = String(licenceKey || '').trim();
    if (!key) return { ok: false, reason: 'Enter a licence key.' };
    const parts = key.split('.');
    if (parts.length !== 3 || parts[0] !== PREFIX) return { ok: false, reason: 'That does not look like a QR Studio licence key.' };
    let payload;
    let payloadBytes;
    let signature;
    try {
      payloadBytes = decodeSegment(parts[1]);
      signature = decodeSegment(parts[2]);
      payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    } catch {
      return { ok: false, reason: 'The licence key is damaged or incomplete.' };
    }
    try {
      const verifier = await publicKey();
      const valid = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        verifier,
        signature,
        payloadBytes
      );
      if (!valid) return { ok: false, reason: 'This licence key was not issued by QR Studio.' };
    } catch (error) {
      return { ok: false, reason: `The licence could not be checked: ${error.message}` };
    }
    if (payload.plan !== 'pro') return { ok: false, reason: 'This licence does not unlock QR Studio Pro.' };
    if (payload.exp && new Date(payload.exp).getTime() < Date.now()) {
      return { ok: false, reason: 'This licence has expired.', payload };
    }
    return { ok: true, reason: '', payload };
  }

  function storage() {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) return chrome.storage.local;
    return null;
  }

  async function read() {
    if (cached) return cached;
    const store = storage();
    if (!store) return null;
    try {
      const stored = await store.get(STORAGE_KEY);
      const value = stored?.[STORAGE_KEY];
      if (!value?.key) return null;
      const result = await verify(value.key);
      cached = result.ok ? result.payload : null;
      return cached;
    } catch {
      return null;
    }
  }

  async function save(licenceKey) {
    const result = await verify(licenceKey);
    if (!result.ok) return result;
    const store = storage();
    if (store) await store.set({ [STORAGE_KEY]: { key: String(licenceKey).trim(), savedAt: Date.now() } });
    cached = result.payload;
    return result;
  }

  async function clear() {
    const store = storage();
    if (store) await store.remove(STORAGE_KEY);
    cached = null;
  }

  async function isPro() {
    return Boolean(await read());
  }

  global.QRStudioLicence = { verify, read, save, clear, isPro, STORAGE_KEY };
})(typeof window !== 'undefined' ? window : globalThis);

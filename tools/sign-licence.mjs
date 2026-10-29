// Issues a QR Studio Pro licence key.
//
//   node tools/sign-licence.mjs --email someone@example.com --months 12
//   node tools/sign-licence.mjs --email team@example.com --seats 5 --months 12
//
// The key is signed offline with the private key from tools/licence-keygen.mjs
// and checked by the extension with the public key alone.
import { createPrivateKey, createSign } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const privatePath = resolve(root, 'tools', 'keys', 'qrstudio-licence-private.pem');

function argument(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  if (index < 0) return fallback;
  return process.argv[index + 1] || fallback;
}

if (!existsSync(privatePath)) {
  console.error('No signing key found. Run: node tools/licence-keygen.mjs');
  process.exit(1);
}

const email = argument('email');
const forever = process.argv.includes('--forever');
const months = Number(argument('months', forever ? '0' : '12'));
const seats = Number(argument('seats', '1'));
const plan = argument('plan', 'pro');

if (!email) {
  console.error('Usage: node tools/sign-licence.mjs --email someone@example.com [--months 12] [--forever] [--seats 1]');
  process.exit(1);
}

const issuedAt = new Date();
const perpetual = forever || months <= 0;
const expiresAt = perpetual ? null : new Date(issuedAt.getTime() + months * 30 * 24 * 60 * 60 * 1000);

const payload = {
  v: 1,
  plan,
  email,
  seats,
  issued: issuedAt.toISOString(),
  exp: expiresAt ? expiresAt.toISOString() : null,
  nonce: Math.random().toString(36).slice(2, 12)
};

const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');
const signature = createSign('sha256')
  .update(payloadBytes)
  // The Web Crypto API verifies ECDSA signatures in the raw r||s form.
  .sign({ key: createPrivateKey(readFileSync(privatePath, 'utf8')), dsaEncoding: 'ieee-p1363' });

const key = `QRS1.${payloadBytes.toString('base64url')}.${signature.toString('base64url')}`;

console.log(key);
console.log('');
console.log(`email    : ${email}`);
console.log(`seats    : ${seats}`);
console.log(`expires  : ${expiresAt ? expiresAt.toISOString().slice(0, 10) : 'never'}`);

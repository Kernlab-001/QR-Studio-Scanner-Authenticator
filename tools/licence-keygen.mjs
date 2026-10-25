// Creates the key pair that signs QR Studio Pro licences.
//
// The private key never leaves this machine and is never committed: it is
// written to tools/keys/, which is git-ignored. Keep a copy somewhere safe -
// without it no new licence can ever be signed.
//
//   node tools/licence-keygen.mjs
import { generateKeyPairSync } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const keyDir = resolve(root, 'tools', 'keys');
const privatePath = resolve(keyDir, 'qrstudio-licence-private.pem');
const licencePath = resolve(root, 'licence.js');

mkdirSync(keyDir, { recursive: true });

const { publicKey, privateKey } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
  publicKeyEncoding: { type: 'spki', format: 'der' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

writeFileSync(privatePath, privateKey, { mode: 0o600 });

// With publicKeyEncoding set, Node hands back the DER bytes directly.
const publicDer = Buffer.from(publicKey);
const publicBase64 = publicDer.toString('base64url');

const source = readFileSync(licencePath, 'utf8');
if (!source.includes('__PUBLIC_KEY__')) {
  console.error('licence.js no longer contains the __PUBLIC_KEY__ marker. Nothing was changed.');
  process.exit(1);
}
writeFileSync(licencePath, source.replace('__PUBLIC_KEY__', publicBase64));

console.log('private key :', privatePath);
console.log('public key  : written into licence.js');
console.log('public key  :', publicBase64);
console.log('');
console.log('Keep the private key safe. It is in .gitignore and must not be committed.');

// Issues a claim licence.
//
// This is the short-lived licence a buyer is given after paying. It is not
// a Pro licence: it is exchanged for a Pro entitlement on the buyer's
// account. It lasts fifteen minutes, and every one issued is different.
//
//   node tools/issue-claim-licence.mjs --email someone@example.com
//   node tools/issue-claim-licence.mjs --email someone@example.com --minutes 15
//
// The signing key stays on this machine, so this runs wherever the payment
// provider's confirmation reaches: a small server, a webhook handler, a
// scheduled job. It can also be imported, so the same code can sit inside
// whatever already runs there:
//
//   import { issueClaimLicence } from './tools/issue-claim-licence.mjs';
//   const { key } = issueClaimLicence({ email });
//
// The claim licence is deliberately marked as a claim, so the extension will
// not accept it as a Pro licence. Only the account server can turn it into
// one.
import { createPrivateKey, createSign } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const privatePath = resolve(root, 'tools', 'keys', 'qrstudio-licence-private.pem');

const CLAIM_PLAN = 'claim';
const DEFAULT_MINUTES = 15;

// Issues one claim licence. Every call produces a different licence.
export function issueClaimLicence({ email, minutes = DEFAULT_MINUTES, seats = 1 } = {}) {
  const address = String(email || '').trim().toLowerCase();
  if (!address) throw new Error('An email address is needed.');
  if (!existsSync(privatePath)) {
    throw new Error(`No signing key found at ${privatePath}. Run: node tools/licence-keygen.mjs`);
  }

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + minutes * 60 * 1000);
  const payload = {
    v: 1,
    plan: CLAIM_PLAN,
    email: address,
    seats,
    issued: issuedAt.toISOString(),
    exp: expiresAt.toISOString(),
    // A fresh random part each time, so no two licences are ever the same.
    nonce: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
  };

  const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');
  const signature = createSign('sha256')
    .update(payloadBytes)
    // The Web Crypto API verifies ECDSA signatures in the raw r||s form.
    .sign({ key: createPrivateKey(readFileSync(privatePath, 'utf8')), dsaEncoding: 'ieee-p1363' });

  const key = `QRS1.${payloadBytes.toString('base64url')}.${signature.toString('base64url')}`;
  return { key, payload, expiresAt };
}

function argument(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  if (index < 0) return fallback;
  return process.argv[index + 1] || fallback;
}

const isRunDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isRunDirectly) {
  const email = argument('email');
  const minutes = Number(argument('minutes', String(DEFAULT_MINUTES)));
  if (!email) {
    console.error('Usage: node tools/issue-claim-licence.mjs --email someone@example.com [--minutes 15]');
    process.exit(1);
  }
  try {
    const { key, payload, expiresAt } = issueClaimLicence({ email, minutes });
    console.log(key);
    console.log('');
    console.log(`email    : ${payload.email}`);
    console.log(`plan     : ${payload.plan}`);
    console.log(`expires  : ${expiresAt.toISOString()} (${minutes} minutes)`);
    console.log('');
    console.log('Give the buyer this licence and fifteen minutes to enter it.');
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

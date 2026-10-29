// Grants QR Studio Pro to an account on the account server.
//
//   node tools/grant-pro.mjs --email someone@example.com --months 12
//   node tools/grant-pro.mjs --email someone@example.com --forever
//   node tools/grant-pro.mjs --email someone@example.com --revoke
//
// The service role key is read from the environment, so it never lands in
// the repository. On PowerShell:
//
//   $env:SUPABASE_SERVICE_KEY='...'
//   node tools/grant-pro.mjs --email someone@example.com --forever
//
// The key is in the account server's dashboard, under Project Settings ->
// API -> service_role. It is the secret key, not the publishable one.
//
// The entitlement is written into the account's own details, which are part
// of the signed-in session. The extension therefore knows it is a Pro
// account without asking the server anything extra. A change is picked up
// the next time the person signs in.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function argument(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  if (index < 0) return fallback;
  return process.argv[index + 1] || fallback;
}

// The project URL is read from the same file the extension uses, so the two
// can never point at different projects.
function projectUrl() {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL.replace(/\/+$/, '');
  const configPath = resolve(root, 'account-config.js');
  const source = readFileSync(configPath, 'utf8');
  const match = source.match(/supabaseUrl:\s*'([^']+)'/);
  return match ? match[1] : '';
}

const email = argument('email').trim().toLowerCase();
const revoke = process.argv.includes('--revoke');
const forever = process.argv.includes('--forever');
const months = Number(argument('months', forever ? '0' : '12'));
const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!email) {
  console.error('Usage: node tools/grant-pro.mjs --email someone@example.com [--months 12] [--forever] [--revoke]');
  process.exit(1);
}

if (!serviceKey) {
  console.error('The service role key is missing.');
  console.error('');
  console.error('Set it for this command, do not write it into the repository:');
  console.error('');
  console.error('  PowerShell   $env:SUPABASE_SERVICE_KEY=\'your-service-role-key\'');
  console.error('  bash         SUPABASE_SERVICE_KEY=your-service-role-key node tools/grant-pro.mjs ...');
  console.error('');
  console.error('The key is in the account server dashboard, under Project Settings -> API -> service_role.');
  process.exit(1);
}

const url = projectUrl();
if (!url) {
  console.error('No account server URL. Set SUPABASE_URL, or fill in account-config.js.');
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json'
};

async function findUser(address) {
  const perPage = 200;
  for (let page = 1; page <= 50; page += 1) {
    const response = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, { headers });
    if (!response.ok) {
      const body = await response.text();
      if (response.status === 401 || response.status === 403) {
        throw new Error('The account server rejected the service role key. Check SUPABASE_SERVICE_KEY.');
      }
      throw new Error(`The account server refused the request (${response.status}): ${body}`);
    }
    const users = await response.json();
    const found = (users?.users || users || []).find((user) => (user.email || '').toLowerCase() === address);
    if (found) return found;
    if (!users?.users || users.users.length < perPage) return null;
  }
  return null;
}

async function main() {
  const user = await findUser(email);
  if (!user) {
    console.error(`No account with the address ${email} exists on ${url}.`);
    console.error('The account has to be created first, by signing in.');
    process.exit(1);
  }

  const metadata = { ...(user.user_metadata || {}) };
  if (revoke) {
    delete metadata.qrstudio_pro;
    delete metadata.qrstudio_pro_expires;
  } else {
    metadata.qrstudio_pro = true;
    if (forever || months <= 0) {
      delete metadata.qrstudio_pro_expires;
    } else {
      metadata.qrstudio_pro_expires = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  }

  const response = await fetch(`${url}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ user_metadata: metadata })
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`The account server refused the change (${response.status}): ${body}`);
    process.exit(1);
  }

  console.log(revoke ? `Pro removed from ${email}.` : `Pro granted to ${email}.`);
  console.log('');
  console.log(`account  : ${email}`);
  console.log(`user id  : ${user.id}`);
  if (!revoke) {
    const until = metadata.qrstudio_pro_expires ? metadata.qrstudio_pro_expires.slice(0, 10) : 'never';
    console.log(`expires  : ${until}`);
  }
  console.log('');
  console.log('The person has to sign out and sign in again for the extension to see it.');
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

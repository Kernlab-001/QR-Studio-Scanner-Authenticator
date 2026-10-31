// The importers, checked against the formats the apps actually write.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadExtension } from './harness.mjs';
import { migrationPayload, twoFasBackup } from './helpers.mjs';

const context = loadExtension();
const pro = context.QRStudioPro;

test('a real Google Authenticator export is read', () => {
  const payload = migrationPayload({
    accounts: [
      { secret: 'JBSWY3DPEHPK3PXP', issuer: 'Example', accountName: 'alice@example.com' },
      { secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', issuer: 'Other', accountName: 'bob', algorithm: 2, digits: 2, type: 1, counter: 42 }
    ]
  });
  const uri = `otpauth-migration://offline?data=${Buffer.from(payload).toString('base64')}`;

  const { accounts } = pro.parseMigrationUri(uri);

  assert.equal(accounts.length, 2, 'both accounts are read');
  assert.equal(accounts[0].secret, 'JBSWY3DPEHPK3PXP');
  assert.equal(accounts[0].issuer, 'Example');
  assert.equal(accounts[0].accountName, 'alice@example.com');
  assert.equal(accounts[0].algorithm, 'SHA1');
  assert.equal(accounts[0].digits, 6);
  assert.equal(accounts[0].type, 'totp');
  assert.equal(accounts[1].algorithm, 'SHA256');
  assert.equal(accounts[1].digits, 8);
  assert.equal(accounts[1].type, 'hotp');
  assert.equal(accounts[1].counter, 42);
});

test('an export split over several codes says which one it is', () => {
  const payload = migrationPayload({
    accounts: [{ secret: 'JBSWY3DPEHPK3PXP', issuer: 'Example', accountName: 'alice@example.com' }],
    batchSize: 3,
    batchIndex: 1,
    batchId: 77
  });
  const uri = `otpauth-migration://offline?data=${Buffer.from(payload).toString('base64')}`;

  const { accounts, batch } = pro.parseMigrationUri(uri);

  assert.equal(accounts.length, 1);
  assert.equal(batch.size, 3, 'the size of the whole export is read');
  assert.equal(batch.number, 2, 'this is the second code');
  assert.equal(batch.total, 3);
  assert.equal(batch.id, 77, 'the id of the export is read');
});

test('an algorithm that is not supported is refused, not guessed', () => {
  const payload = migrationPayload({
    accounts: [{ secret: 'JBSWY3DPEHPK3PXP', issuer: 'Example', accountName: 'alice', algorithm: 4 }]
  });
  const uri = `otpauth-migration://offline?data=${Buffer.from(payload).toString('base64')}`;

  const result = pro.parseMigrationUri(uri);

  assert.equal(result.accounts.length, 0, 'the account is not imported');
  assert.equal(result.failed.length, 1, 'and it is reported');
  assert.match(result.failed[0].reason, /algorithm/i);
});

test('a 2FAS backup is read, with the secret where 2FAS puts it', () => {
  const backup = twoFasBackup([
    { secret: 'JBSWY3DPEHPK3PXP', issuer: 'Example', accountName: 'alice@example.com' },
    { secret: 'GEZDGNBVGY3TQOJQ', issuer: 'Other', accountName: 'bob', algorithm: 'SHA256', digits: 8, tokenType: 'HOTP', counter: 5 }
  ]);

  const { accounts } = pro.parseTwoFas(JSON.stringify(backup));

  assert.equal(accounts.length, 2, 'both accounts are read');
  assert.equal(accounts[0].secret, 'JBSWY3DPEHPK3PXP');
  assert.equal(accounts[0].issuer, 'Example');
  assert.equal(accounts[0].accountName, 'alice@example.com');
  assert.equal(accounts[1].secret, 'GEZDGNBVGY3TQOJQ');
  assert.equal(accounts[1].algorithm, 'SHA256');
  assert.equal(accounts[1].digits, 8);
  assert.equal(accounts[1].type, 'hotp');
  assert.equal(accounts[1].counter, 5);
});

test('a 2FAS backup with a hidden secret in the link still uses the real one', () => {
  const backup = twoFasBackup([
    {
      secret: 'JBSWY3DPEHPK3PXP',
      issuer: 'Example',
      accountName: 'alice@example.com',
      link: 'otpauth://totp/Example:alice@example.com?secret=%5Bhidden%5D&issuer=Example'
    }
  ]);

  const { accounts } = pro.parseTwoFas(JSON.stringify(backup));

  assert.equal(accounts[0].secret, 'JBSWY3DPEHPK3PXP', 'the real secret is used');
});

test('a protected 2FAS backup says so instead of looking empty', () => {
  assert.throws(() => pro.parseTwoFas(JSON.stringify({ version: 3, services: [] })), /password/i);
});

test('a list of setup links keeps the good ones and names the bad one', () => {
  const good = 'otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example';
  const alsoGood = 'otpauth://totp/Other:bob@example.com?secret=GEZDGNBVGY3TQOJQ&issuer=Other';

  const result = pro.parseOtpAuthList([good, 'this is not a setup link', alsoGood].join('\n'));

  assert.equal(result.accounts.length, 2, 'the two good ones are read');
  assert.equal(result.accounts[0].accountName, 'alice@example.com');
  assert.equal(result.accounts[1].accountName, 'bob@example.com');
  assert.equal(result.failed.length, 1, 'the bad one is counted');
  assert.match(result.failed[0].reason, /setup link/i);
});

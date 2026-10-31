// The account: signing out, and the pages not having two things with the
// same name.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadExtension, repoRoot } from './harness.mjs';

test('signing out takes the session off the device', async () => {
  const context = loadExtension();
  await context.QRStudioAccount.write({
    user: { email: 'someone@example.com', id: 'u1' },
    access_token: 'an-access-token',
    refresh_token: 'a-refresh-token'
  });
  const stored = await context.QRStudioAccount.read();
  assert.equal(stored.email, 'someone@example.com', 'the account is stored');

  // The account server keeps the session in the page storage, under its own
  // name. If that is left behind, the account page signs the person back in.
  const sessionKey = context.QRStudioAccount.sessionStorageKey();
  assert.ok(sessionKey, 'the session key can be worked out');
  context.localStorage.setItem(sessionKey, '{"access_token":"an-access-token"}');

  await context.signOutAccount();

  assert.equal(await context.QRStudioAccount.read(), null, 'the account is gone');
  assert.equal(context.localStorage.getItem(sessionKey), null, 'the session is gone');
});

test('the account page shows the address that is signed in', () => {
  const html = readFileSync(`${repoRoot}/account.html`, 'utf8');
  // Two things with the same name means one of them is never found.
  assert.match(html, /id="accountEmail"/, 'the field for typing an address is there');
  assert.match(html, /id="accountSignedInEmail"/, 'the address that is signed in has its own name');
});

test('no page has two things with the same name', () => {
  for (const file of ['account.html', 'popup.html']) {
    const html = readFileSync(`${repoRoot}/${file}`, 'utf8');
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    assert.deepEqual(duplicates, [], `${file} has no name used twice`);
  }
});

const savedAccount = {
  id: 'a-good-one',
  type: 'totp',
  secret: 'JBSWY3DPEHPK3PXP',
  issuer: 'Example',
  accountName: 'alice',
  digits: 6,
  period: 30,
  algorithm: 'SHA1'
};

test('an account that cannot be read is kept, not deleted', async () => {
  const context = loadExtension();
  await context.chrome.storage.local.set({
    authenticatorAccounts: [
      savedAccount,
      { ...savedAccount, id: 'a-bad-one', accountName: 'bob', secret: 'not!base32!' }
    ]
  });

  await context.loadState();

  const stored = await context.chrome.storage.local.get(['authenticatorAccounts', 'authenticatorAccountsUnreadable']);
  assert.equal(stored.authenticatorAccounts.length, 1, 'the one that reads is kept');
  assert.equal(stored.authenticatorAccounts[0].id, 'a-good-one');
  assert.equal(stored.authenticatorAccountsUnreadable?.length, 1, 'the one that does not is kept aside');
  assert.equal(stored.authenticatorAccountsUnreadable[0].id, 'a-bad-one', 'and it is the right one');
});

test('saving the vault does not throw away an account another view added', async () => {
  const context = loadExtension();
  await context.chrome.storage.local.set({ authenticatorAccounts: [savedAccount] });
  await context.loadState();

  // Another view of the extension adds one while this one is open.
  const added = { ...savedAccount, id: 'added-elsewhere', accountName: 'bob' };
  await context.chrome.storage.local.set({ authenticatorAccounts: [savedAccount, added] });

  await context.saveAccounts();
  await new Promise((resolve) => setTimeout(resolve, 50));

  const stored = await context.chrome.storage.local.get('authenticatorAccounts');
  const ids = stored.authenticatorAccounts.map((account) => account.id);
  assert.ok(ids.includes('added-elsewhere'), 'the account added elsewhere is still there');
  assert.ok(ids.includes('a-good-one'), 'and so is the one this view knows about');
});

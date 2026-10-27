// The QR Studio account page.
//
// It signs a user in with Supabase and keeps the session in the extension's
// own storage, so the rest of the extension can tell whether someone is
// signed in without ever loading the Supabase client.
(function () {
  'use strict';

  const config = window.QRStudioAccountConfig;
  const store = window.QRStudioAccount;

  const signedOut = document.getElementById('signedOut');
  const signedIn = document.getElementById('signedIn');
  const notConfigured = document.getElementById('notConfigured');
  const form = document.getElementById('accountForm');
  const emailInput = document.getElementById('accountEmail');
  const passwordInput = document.getElementById('accountPassword');
  const submitButton = document.getElementById('accountSubmit');
  const switchButton = document.getElementById('accountSwitch');
  const heading = document.getElementById('accountHeading');
  const intro = document.getElementById('accountIntro');
  const message = document.getElementById('accountMessage');
  const signedInMessage = document.getElementById('accountSignedInMessage');
  const accountEmail = document.getElementById('accountEmail');
  const signOutButton = document.getElementById('accountSignOut');

  let mode = 'signin';
  let client = null;

  function say(text, kind = '') {
    message.textContent = text;
    message.className = `account-message${kind ? ` ${kind}` : ''}`;
  }

  function setMode(next) {
    mode = next;
    const signingUp = mode === 'signup';
    heading.textContent = signingUp ? 'Create your account' : 'Sign in';
    submitButton.textContent = signingUp ? 'Create account' : 'Sign in';
    switchButton.textContent = signingUp ? 'Already have an account? Sign in' : 'No account yet? Create one';
    passwordInput.autocomplete = signingUp ? 'new-password' : 'current-password';
    say('');
  }

  function showSignedIn(account) {
    signedOut.hidden = true;
    notConfigured.hidden = true;
    signedIn.hidden = false;
    accountEmail.textContent = account.email;
  }

  function showSignedOut() {
    signedOut.hidden = false;
    signedIn.hidden = true;
    notConfigured.hidden = true;
  }

  async function persist(session) {
    await store.write(session);
    showSignedIn(await store.read());
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!client) {
      say('The account server is not configured yet.', 'error');
      return;
    }
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || password.length < 8) {
      say('Enter your email and a password of at least 8 characters.', 'error');
      return;
    }
    submitButton.disabled = true;
    submitButton.textContent = mode === 'signup' ? 'Creating the account…' : 'Signing in…';
    try {
      if (mode === 'signup') {
        const { data, error } = await client.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          await persist(data.session);
          say('Account created and signed in.', 'good');
        } else {
          say('Check your inbox and confirm the address, then sign in.', 'good');
          setMode('signin');
        }
      } else {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await persist(data.session);
        say('Signed in.', 'good');
      }
    } catch (error) {
      const text = String(error?.message || error);
      say(text.includes('Invalid login credentials') ? 'That email and password do not match.' : text, 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = mode === 'signup' ? 'Create account' : 'Sign in';
    }
  }

  async function signOut() {
    try {
      if (client) await client.auth.signOut();
    } catch {
      // The local session is cleared either way.
    }
    await store.clear();
    passwordInput.value = '';
    showSignedOut();
    signedInMessage.textContent = 'Signed out.';
  }

  async function start() {
    if (!config.configured) {
      signedOut.hidden = true;
      signedIn.hidden = true;
      notConfigured.hidden = false;
      return;
    }
    client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage }
    });
    const existing = await store.read();
    if (existing) {
      showSignedIn(existing);
      return;
    }
    showSignedOut();
    setMode('signin');
  }

  form.addEventListener('submit', handleSubmit);
  switchButton.addEventListener('click', () => setMode(mode === 'signup' ? 'signin' : 'signup'));
  signOutButton.addEventListener('click', signOut);
  start();
})();

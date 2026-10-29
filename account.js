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
  const googleButton = document.getElementById('googleSignIn');
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

  // The page the provider sends the browser back to. It only has to be an
  // address the account server is allowed to redirect to.
  function redirectTarget() {
    if (config.googleRedirectUrl) return config.googleRedirectUrl;
    try {
      return chrome.runtime.getURL('account.html');
    } catch {
      return new URL('account.html', window.location.href).href;
    }
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
      say(explain(error), 'error');
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

  // Google's sign-in is only worth opening if the account server has it
  // switched on, otherwise the browser ends up on an error page.
  async function googleIsEnabled() {
    try {
      const response = await fetch(`${config.supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: config.supabaseAnonKey }
      });
      if (!response.ok) return true;
      const settings = await response.json();
      return settings?.external?.google !== false;
    } catch {
      return true;
    }
  }

  function explain(error) {
    const text = String(error?.message || error || '');
    if (text.includes('Invalid login credentials')) return 'That email and password do not match.';
    if (text.includes('Email not confirmed')) return 'This account still needs its email address confirmed.';
    if (text.includes('User already registered')) return 'That address already has an account - try signing in.';
    if (text.includes('rate limit') || text.includes('over_email_send_rate_limit')) {
      return 'The account server cannot send confirmation emails right now. Use Google sign-in, or ask the maintainer to turn auto-confirm on.';
    }
    if (text.includes('Failed to fetch')) return 'The account server could not be reached. Check your connection.';
    return text;
  }

  // Google sign-in. The provider sends the browser back to the redirect page
  // with the session in the address, and the account page picks it up from
  // there, so the session ends up in the extension's own storage.
  async function signInWithGoogle() {
    if (!client) {
      say('The account server is not configured yet.', 'error');
      return;
    }
    if (!(await googleIsEnabled())) {
      say('Google sign-in is not switched on for this account server yet.', 'error');
      return;
    }
    googleButton.disabled = true;
    googleButton.textContent = 'Opening Google…';
    try {
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectTarget(), skipBrowserRedirect: true }
      });
      if (error) throw error;
      if (!data?.url) throw new Error('Google sign-in could not be started.');

      // In the extension, the sign-in runs in a window that Chrome hands back
      // to us, so the session never touches a web page. Chrome watches for
      // the redirect address, so it is spelled out for it as well.
      if (chrome?.identity?.launchWebAuthFlow) {
        const authUrl = new URL(data.url);
        authUrl.searchParams.set('redirect_uri', redirectTarget());
        const returned = await chrome.identity.launchWebAuthFlow({ url: authUrl.toString(), interactive: true });
        if (!returned) {
          say('The sign-in was cancelled.', 'error');
          return;
        }
        const session = await sessionFromUrl(returned);
        if (!session) {
          say('Google did not return a session. Please try again.', 'error');
          return;
        }
        await persist(session);
        say('Signed in.', 'good');
        return;
      }

      // Outside the extension, the browser opens and comes back to this page,
      // which picks the session up from the address.
      window.open(data.url, '_blank', 'noopener,noreferrer');
      say('Finish the sign-in in the new tab, then come back here.', 'good');
    } catch (error) {
      say(explain(error), 'error');
    } finally {
      googleButton.disabled = false;
      googleButton.textContent = '';
      googleButton.append(
        Object.assign(document.createElement('span'), { textContent: 'Continue with Google' })
      );
    }
  }

  // Turns what the provider sent back into a session: either the tokens
  // themselves, or the one-time code that is exchanged for them.
  async function sessionFromUrl(raw) {
    const url = new URL(raw);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    if (accessToken && refreshToken) {
      const { data, error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      if (error) throw error;
      return data?.session || null;
    }
    const code = url.searchParams.get('code');
    if (code) {
      const { data, error } = await client.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return data?.session || null;
    }
    return null;
  }

  // Picks up a session that came back from the provider, and keeps it in the
  // extension's own storage.
  async function adoptSession() {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    const session = data?.session;
    if (!session) return null;
    await persist(session);
    return session;
  }

  async function start() {
    if (!config.configured) {
      signedOut.hidden = true;
      signedIn.hidden = true;
      notConfigured.hidden = false;
      return;
    }
    client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage, detectSessionInUrl: true }
    });
    // A sign-in that came back from Google lands here with the session in the
    // address, so it is picked up and stored.
    const session = await adoptSession();
    if (session) {
      say('Signed in.', 'good');
      return;
    }
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
  googleButton.addEventListener('click', signInWithGoogle);
  // If the sign-in happened in another tab, pick it up when this one comes
  // back to the front.
  window.addEventListener('focus', async () => {
    if (!client || !signedOut.hidden) return;
    const session = await adoptSession();
    if (session) say('Signed in.', 'good');
  });
  start();
})();

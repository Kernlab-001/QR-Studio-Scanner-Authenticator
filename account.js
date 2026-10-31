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
  const accountEmail = document.getElementById('accountSignedInEmail');
  const signOutButton = document.getElementById('accountSignOut');

  let mode = 'signin';
  let client = null;
  // True when the account was already signed in when this page was opened.
  // Such a page is only there to be looked at, so it is never closed.
  let signedInAtLoad = false;

  function say(text, kind = '') {
    message.textContent = text;
    message.className = `account-message${kind ? ` ${kind}` : ''}`;
  }

  // The address the provider sends the browser back to.
  // Chrome's own redirect URL is used when it is available: it belongs to
  // this extension, Chrome hands it straight back, and the session never
  // reaches a web page.
  function redirectTarget() {
    try {
      if (chrome?.identity?.getRedirectURL) return chrome.identity.getRedirectURL();
    } catch {
      // Not an extension page.
    }
    try {
      return chrome.runtime.getURL('account.html');
    } catch {
      // Not an extension page either.
    }
    if (config.googleRedirectUrl) return config.googleRedirectUrl;
    return new URL('account.html', window.location.href).href;
  }

  // Closes the tab this page is running in. Chrome refuses to close a tab
  // that a script did not open itself, so the extension asks Chrome to remove
  // the tab whenever it can.
  async function closeTab() {
    try {
      if (chrome?.tabs?.getCurrent && chrome?.tabs?.remove) {
        const tab = await chrome.tabs.getCurrent();
        if (tab?.id) {
          await chrome.tabs.remove(tab.id);
          return;
        }
      }
    } catch {
      // Fall back to the ordinary way of closing a window.
    }
    try {
      window.close();
    } catch {
      // Some browsers refuse to close a tab that was not opened by a script.
    }
  }

  // A tab that was opened only to sign in closes itself when it is done.
  function closeWhenDone(text) {
    say(text, 'good');
    setTimeout(closeTab, 900);
  }

  // True when the address this page was opened with carries a session that
  // the provider has just handed over.
  function sessionCameInUrl() {
    try {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      if (hash.get('access_token') || hash.get('refresh_token')) return true;
      return Boolean(new URLSearchParams(window.location.search).get('code'));
    } catch {
      return false;
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
          closeWhenDone('Account created and signed in. This tab will close.');
        } else {
          say('Check your inbox and confirm the address, then sign in.', 'good');
          setMode('signin');
        }
      } else {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await persist(data.session);
        closeWhenDone('Signed in. This tab will close.');
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
      // Only this device is signed out. The default would end the session on
      // every device the person has signed in on.
      if (client) await client.auth.signOut({ scope: 'local' });
    } catch (error) {
      say(explain(error), 'error');
    }
    await store.clear();
    await store.clearSession();
    passwordInput.value = '';
    showSignedOut();
    signedInMessage.textContent = 'Signed out.';
  }

  // Google's sign-in is only worth opening if the account server has it
  // switched on, otherwise the browser ends up on an error page. The answer
  // is kept, so the check never sits between the click and the sign-in
  // window, which has to open while the click is still fresh.
  let googleEnabled = null;
  async function googleIsEnabled() {
    if (googleEnabled !== null) return googleEnabled;
    try {
      const response = await fetch(`${config.supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: config.supabaseAnonKey }
      });
      if (!response.ok) {
        googleEnabled = true;
        return googleEnabled;
      }
      const settings = await response.json();
      googleEnabled = settings?.external?.google !== false;
    } catch {
      googleEnabled = true;
    }
    return googleEnabled;
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

  // The sign-in address is built here rather than asked for, so the window
  // can be opened in the same moment as the click. Chrome only allows an
  // interactive sign-in window straight after the gesture that started it,
  // and a round trip to the account server in between would use it up.
  function googleSignInUrl() {
    const url = new URL(`${config.supabaseUrl}/auth/v1/authorize`);
    url.searchParams.set('provider', 'google');
    url.searchParams.set('redirect_to', redirectTarget());
    url.searchParams.set('apikey', config.supabaseAnonKey);
    return url.toString();
  }

  function explainGoogleError(error) {
    const text = String(error?.message || error || '');
    if (text.includes('Authorization page could not be loaded')) {
      return 'Your browser could not open the Google sign-in window. Something is blocking it - a pop-up blocker, an ad blocker, or a strict privacy setting. Allow pop-ups for QR Studio and try again, or sign in with your email address below.';
    }
    if (text.includes('User interaction required')) {
      return 'The sign-in window could not be opened from that click. Please click "Continue with Google" again.';
    }
    if (text.includes('closed the flow') || text.includes('canceled') || text.includes('cancelled')) {
      return 'The sign-in was cancelled.';
    }
    return explain(error);
  }

  // Google sign-in. The provider sends the browser back to the redirect page
  // with the session in the address, and the account page picks it up from
  // there, so the session ends up in the extension's own storage.
  async function signInWithGoogle() {
    if (!client) {
      say('The account server is not configured yet.', 'error');
      return;
    }
    googleButton.disabled = true;
    googleButton.textContent = 'Opening Google…';
    let returned = null;
    try {
      // In the extension, the sign-in runs in a window that Chrome hands back
      // to us, so the session never touches a web page.
      if (chrome?.identity?.launchWebAuthFlow) {
        returned = await chrome.identity.launchWebAuthFlow({ url: googleSignInUrl(), interactive: true });
      } else {
        // Outside the extension, the browser opens and comes back to this page,
        // which picks the session up from the address.
        window.open(googleSignInUrl(), '_blank', 'noopener,noreferrer');
        say('Finish the sign-in in the new tab, then come back here.', 'good');
        return;
      }
    } catch (error) {
      let message = explainGoogleError(error);
      if (!(await googleIsEnabled())) {
        message = 'Google sign-in is not switched on for this account server yet. Sign in with your email address below.';
      }
      say(message, 'error');
      return;
    } finally {
      googleButton.disabled = false;
      googleButton.textContent = '';
      googleButton.append(
        Object.assign(document.createElement('span'), { textContent: 'Continue with Google' })
      );
    }
    try {
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
      closeWhenDone('Signed in with Google. This tab will close.');
    } catch (error) {
      say(explain(error), 'error');
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
    // Ask the account server whether Google sign-in is switched on, so the
    // answer is ready before the button is pressed.
    googleIsEnabled();
    // A sign-in that came back from Google lands here with the session in the
    // address, so it is picked up and stored.
    const session = await adoptSession();
    if (session) {
      // Only a session that actually arrived in this tab closes it. A page
      // that was opened to look at an already signed-in account stays open.
      if (sessionCameInUrl()) {
        closeWhenDone('Signed in. This tab will close.');
      } else {
        signedInAtLoad = true;
      }
      return;
    }
    const existing = await store.read();
    if (existing) {
      showSignedIn(existing);
      signedInAtLoad = true;
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
    if (!client || signedInAtLoad) return;
    const session = await adoptSession();
    // A session that was not here when the page opened means the sign-in
    // happened elsewhere, so this tab has done its job.
    if (session) closeWhenDone('Signed in. This tab will close.');
  });
  start();
})();

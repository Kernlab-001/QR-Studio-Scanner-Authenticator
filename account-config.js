// QR Studio account settings, and the little store the session lives in.
//
// EDIT THESE VALUES and the account system is live. Nothing else needs to
// change - the extension reads them from here.
window.QRStudioAccountConfig = {
  // Your Supabase project. Copy both from
  // https://supabase.com/dashboard/project/<your-project>/settings/api
  // The publishable key is the public one; it is safe to ship inside the
  // extension. Never put the secret key here - that one belongs on a server.
  supabaseUrl: 'https://dzzeumalickwfgskbmgs.supabase.co',
  supabaseAnonKey: 'sb_publishable_QxOr6kDU6OP-nSjCDwupgA_518fpZz-',

  // Where a signed-in user without a licence is sent to pay.
  // For now this is the support page with the tip buttons on it.
  paymentUrl: 'https://kernlab-001.github.io/QR-Studio-Scanner-Authenticator/support.html#tip',

  // Where Google sends the browser back to after a sign-in. The session comes
  // back in the address, and the extension picks it up from there.
  // Inside the extension this is Chrome's own redirect address, which has to
  // be in the account server's redirect list:
  //   https://<extension id>.chromiumapp.org/
  // This value below is only used when the account page runs outside the
  // extension, for example while working on it.
  googleRedirectUrl: 'https://kernlab-001.github.io/QR-Studio-Scanner-Authenticator/support.html',

  // The page that holds the sign-in form. It ships inside the extension, so
  // the session ends up in the extension's own storage.
  accountPage: 'account.html'
};

window.QRStudioAccountConfig.configured = Boolean(
  window.QRStudioAccountConfig.supabaseUrl
  && window.QRStudioAccountConfig.supabaseUrl.includes('YOUR-PROJECT') === false
  && window.QRStudioAccountConfig.supabaseAnonKey
  && window.QRStudioAccountConfig.supabaseAnonKey.includes('YOUR-ANON') === false
);

// The signed-in account is kept in the extension's own storage. The popup
// only ever reads it, so it never has to load the Supabase client itself.
window.QRStudioAccount = {
  STORAGE_KEY: 'qrStudioAccount',

  hasStorage() {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  },

  async read() {
    try {
      if (this.hasStorage()) {
        const stored = await chrome.storage.local.get(this.STORAGE_KEY);
        const account = stored?.[this.STORAGE_KEY];
        return account?.email ? account : null;
      }
      // Preview mode, when the page is opened straight from a file.
      const saved = localStorage.getItem(`qr-studio-preview:${this.STORAGE_KEY}`);
      const account = saved ? JSON.parse(saved) : null;
      return account?.email ? account : null;
    } catch {
      return null;
    }
  },

  async write(session) {
    const account = {
      email: session?.user?.email || session?.email || '',
      id: session?.user?.id || session?.id || '',
      accessToken: session?.access_token || session?.accessToken || '',
      refreshToken: session?.refresh_token || session?.refreshToken || '',
      expiresAt: session?.expires_at || session?.expiresAt || 0,
      signedInAt: Date.now()
    };
    if (this.hasStorage()) {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: account });
      return;
    }
    try {
      localStorage.setItem(`qr-studio-preview:${this.STORAGE_KEY}`, JSON.stringify(account));
    } catch {
      // Preview mode only.
    }
  },

  async clear() {
    if (this.hasStorage()) {
      await chrome.storage.local.remove(this.STORAGE_KEY);
      return;
    }
    try {
      localStorage.removeItem(`qr-studio-preview:${this.STORAGE_KEY}`);
    } catch {
      // Preview mode only.
    }
  }
};

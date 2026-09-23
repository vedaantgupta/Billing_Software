/**
 * Google Account Store for Connected Gemini Experience
 * Tracks the user's active Google Account session.
 * NO API keys are required or touched by end users.
 */

const STORAGE_KEY = 'billing_google_account';

export const googleAccountStore = {
  getAccount(fallbackUser = null) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}

    // Default to app's logged in user (e.g. Vedaant)
    const displayName = fallbackUser?.name || fallbackUser?.firstName 
      ? `${fallbackUser.firstName || ''} ${fallbackUser.lastName || ''}`.trim()
      : 'Vedaant';

    return {
      name: displayName || 'Vedaant',
      email: fallbackUser?.email || 'vedaant@gmail.com',
      photoURL: fallbackUser?.photoURL || null,
      provider: 'google',
      isDefault: true
    };
  },

  setAccount(account) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
      window.dispatchEvent(new CustomEvent('google-account-changed', { detail: account }));
    } catch (e) {
      console.warn('Failed to save Google account:', e);
    }
  },

  disconnect() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('google-account-changed', { detail: null }));
    } catch (e) {}
  },

  getInitial(fallbackUser = null) {
    const acc = this.getAccount(fallbackUser);
    if (acc?.name) return acc.name.charAt(0).toUpperCase();
    return 'V';
  }
};

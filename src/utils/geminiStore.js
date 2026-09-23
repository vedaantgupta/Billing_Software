/**
 * Google Gemini Account & Connection Store
 * Manages the user's personal Google Gemini API key and model preferences.
 * 
 * Allows users to connect their own Gemini account (via Google AI Studio free tier)
 * for 100% free and unlimited business AI directly inside the software.
 */

const KEY_STORAGE = 'billing_user_gemini_key';
const MODEL_STORAGE = 'billing_gemini_model';

export const AVAILABLE_MODELS = [
  { 
    id: 'gemini-2.0-flash', 
    name: 'Gemini 2.0 Flash (Recommended)', 
    desc: 'Google\'s newest ultra-fast model with generous free-tier quotas',
    badge: 'Fast & Free'
  },
  { 
    id: 'gemini-1.5-flash', 
    name: 'Gemini 1.5 Flash', 
    desc: 'High-speed, multi-modal balanced intelligence',
    badge: 'Stable'
  },
  { 
    id: 'gemini-1.5-pro', 
    name: 'Gemini 1.5 Pro', 
    desc: 'Deep reasoning, complex financials, and large document context',
    badge: 'Deep Reasoning'
  }
];

export const geminiStore = {
  /**
   * Get currently active Gemini API key
   */
  getApiKey() {
    try {
      return (localStorage.getItem(KEY_STORAGE) || '').trim();
    } catch (e) {
      return '';
    }
  },

  /**
   * Set and persist user's personal Gemini API key
   */
  setApiKey(key, model = null) {
    try {
      const cleanKey = (key || '').trim();
      if (cleanKey) {
        localStorage.setItem(KEY_STORAGE, cleanKey);
      } else {
        localStorage.removeItem(KEY_STORAGE);
      }

      if (model) {
        localStorage.setItem(MODEL_STORAGE, model);
      }

      window.dispatchEvent(new CustomEvent('gemini-config-changed', {
        detail: {
          apiKey: cleanKey,
          model: this.getModel(),
          isConnected: !!cleanKey
        }
      }));
    } catch (e) {
      console.warn('Failed to save Gemini key:', e);
    }
  },

  /**
   * Disconnect personal Gemini API key
   */
  clearApiKey() {
    try {
      localStorage.removeItem(KEY_STORAGE);
      window.dispatchEvent(new CustomEvent('gemini-config-changed', {
        detail: {
          apiKey: '',
          model: this.getModel(),
          isConnected: false
        }
      }));
    } catch (e) {}
  },

  /**
   * Get selected model
   */
  getModel() {
    try {
      return localStorage.getItem(MODEL_STORAGE) || 'gemini-2.0-flash';
    } catch (e) {
      return 'gemini-2.0-flash';
    }
  },

  /**
   * Set preferred model
   */
  setModel(model) {
    try {
      localStorage.setItem(MODEL_STORAGE, model);
      window.dispatchEvent(new CustomEvent('gemini-config-changed', {
        detail: {
          apiKey: this.getApiKey(),
          model,
          isConnected: this.isConnected()
        }
      }));
    } catch (e) {}
  },

  /**
   * Check if user has connected their personal Gemini API key
   */
  isConnected() {
    return !!this.getApiKey();
  },

  /**
   * Get safe masked version of the key for UI display (e.g. AIzaSy...4X9Z)
   */
  getMaskedKey() {
    const key = this.getApiKey();
    if (!key) return '';
    if (key.length <= 10) return '••••••••';
    return `${key.slice(0, 6)}••••••••${key.slice(-4)}`;
  },

  /**
   * List of supported models
   */
  getAvailableModels() {
    return AVAILABLE_MODELS;
  }
};

export default geminiStore;

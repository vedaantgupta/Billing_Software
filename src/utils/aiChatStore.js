/**
 * Shared AI Chat & Session Store for Billing Software
 * Synchronizes conversations between the Quick Floating Modal and Full-Page Command Center
 */

const STORAGE_KEY = 'billing_ai_sessions_v2';
const ACTIVE_ID_KEY = 'billing_ai_active_session_id';
const THEME_KEY = 'billing_ai_theme_mode';

const DEFAULT_GREETING = {
  role: 'ai',
  content: `### Business AI Copilot
Hello! I am your **Autonomous Business AI Copilot** powered by **Llama 3.3 70B**.

I can:
- **Answer Anything**: GST rules, pricing, calculations, accounting, profit analysis, business advice.
- **Execute Anything with Permission**: Create **Invoices**, **Inventory**, **Contacts**, **Staff**, **Projects**, or **Expenses**.
- **Interactive Clarification**: If you don't give all details, I will interactively ask what's missing with quick options.
- **Voice Supported**: You can dictate messages with the mic button or click the speaker to listen to any response!`
};

export const aiChatStore = {
  getTheme() {
    try {
      return localStorage.getItem(THEME_KEY) || 'light';
    } catch {
      return 'light';
    }
  },

  setTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
      window.dispatchEvent(new CustomEvent('ai-theme-change', { detail: theme }));
    } catch {}
  },

  getSessions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse AI sessions:', e);
    }
    const initialSession = this.createNewSession();
    return [initialSession];
  },

  getActiveSessionId() {
    try {
      const id = localStorage.getItem(ACTIVE_ID_KEY);
      if (id) return id;
    } catch {}
    const sessions = this.getSessions();
    const firstId = sessions[0]?.id;
    if (firstId) {
      this.setActiveSessionId(firstId);
      return firstId;
    }
    const newSess = this.createNewSession();
    return newSess.id;
  },

  setActiveSessionId(id) {
    try {
      localStorage.setItem(ACTIVE_ID_KEY, id);
      window.dispatchEvent(new CustomEvent('ai-session-change', { detail: id }));
    } catch {}
  },

  getActiveSession() {
    const sessions = this.getSessions();
    const activeId = this.getActiveSessionId();
    return sessions.find(s => s.id === activeId) || sessions[0] || this.createNewSession();
  },

  saveMessages(messages) {
    try {
      const sessions = this.getSessions();
      const activeId = this.getActiveSessionId();
      let updated = false;

      // Extract a smart title from first user message if title is default
      let derivedTitle = null;
      const firstUserMsg = messages.find(m => m.role === 'user');
      if (firstUserMsg && typeof firstUserMsg.content === 'string') {
        derivedTitle = firstUserMsg.content.slice(0, 32) + (firstUserMsg.content.length > 32 ? '...' : '');
      }

      const newSessions = sessions.map(s => {
        if (s.id === activeId) {
          updated = true;
          return {
            ...s,
            title: (s.title === 'New Conversation' && derivedTitle) ? derivedTitle : s.title,
            messages,
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      });

      if (!updated) {
        newSessions.unshift({
          id: activeId,
          title: derivedTitle || 'New Conversation',
          messages,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions));
      window.dispatchEvent(new CustomEvent('ai-messages-updated', { detail: { activeId, messages } }));
    } catch (e) {
      console.warn('Failed to save AI messages:', e);
    }
  },

  createNewSession() {
    const newId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newSession = {
      id: newId,
      title: 'New Conversation',
      messages: [DEFAULT_GREETING],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      const updated = [newSession, ...existing.slice(0, 30)]; // keep up to 30 sessions
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      this.setActiveSessionId(newId);
    } catch (e) {
      console.warn('Failed to create new session:', e);
    }

    return newSession;
  },

  deleteSession(id) {
    try {
      const sessions = this.getSessions().filter(s => s.id !== id);
      if (sessions.length === 0) {
        const fresh = this.createNewSession();
        return [fresh];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      if (this.getActiveSessionId() === id) {
        this.setActiveSessionId(sessions[0].id);
      }
      return sessions;
    } catch (e) {
      return this.getSessions();
    }
  }
};

export default aiChatStore;

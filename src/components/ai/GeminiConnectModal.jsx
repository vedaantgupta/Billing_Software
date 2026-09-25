import React, { useState, useEffect } from 'react';
import { 
  Sparkles, X, CheckCircle2, Loader2, 
  ShieldCheck, Zap, LogOut, Check, AlertTriangle
} from 'lucide-react';
import { 
  signInWithGoogleAccount, 
  signOutGoogleAccount, 
  getConnectedGoogleAccount 
} from '@/config/firebase';
import { geminiStore, AVAILABLE_MODELS } from '@/utils/geminiStore';
import './GeminiConnectModal.css';

const GoogleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const GeminiConnectModal = ({ isOpen, onClose }) => {
  const [googleUser, setGoogleUser] = useState(() => getConnectedGoogleAccount());
  const [selectedModel, setSelectedModel] = useState(() => geminiStore.getModel() || 'gemini-2.0-flash');
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [authStatusMsg, setAuthStatusMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedModel(geminiStore.getModel() || 'gemini-2.0-flash');
      setGoogleUser(getConnectedGoogleAccount());
      setAuthStatusMsg(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleGoogleChange = (e) => {
      setGoogleUser(e.detail);
    };
    const handleGeminiChange = (e) => {
      if (e.detail?.model) setSelectedModel(e.detail.model);
    };

    window.addEventListener('google-account-changed', handleGoogleChange);
    window.addEventListener('gemini-config-changed', handleGeminiChange);
    return () => {
      window.removeEventListener('google-account-changed', handleGoogleChange);
      window.removeEventListener('gemini-config-changed', handleGeminiChange);
    };
  }, []);

  if (!isOpen) return null;

  // 1-Click Sign In with Google via official Firebase
  const handleGoogleSignIn = async () => {
    setIsGoogleSigningIn(true);
    setAuthStatusMsg(null);
    try {
      const user = await signInWithGoogleAccount();
      setGoogleUser(user);
      geminiStore.setModel(selectedModel || 'gemini-2.0-flash');
      if (user?.isUnauthorizedDomain) {
        setAuthStatusMsg({
          warning: true,
          message: `Connected! Note: Add "${user.unauthorizedDomainHost || window.location.hostname}" to Firebase Console -> Authentication -> Settings -> Authorized domains to enable live Google popup.`
        });
      } else {
        setAuthStatusMsg({
          success: true,
          message: `Connected successfully with ${user?.name || user?.email}!`
        });
      }
    } catch (err) {
      console.warn('Google sign-in error:', err);
      setAuthStatusMsg({
        success: false,
        message: err.message || 'Google sign-in was cancelled or encountered an error.'
      });
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  // Disconnect Google session
  const handleDisconnect = async () => {
    await signOutGoogleAccount();
    setGoogleUser(null);
    setAuthStatusMsg(null);
  };

  const handleSave = () => {
    geminiStore.setModel(selectedModel);
    onClose();
  };

  const userName = googleUser?.name || 'User';
  const userInitial = userName.charAt(0).toUpperCase() || 'U';

  return (
    <div className="gemini-modal-overlay" onClick={onClose}>
      <div className="gemini-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="gemini-modal-header">
          <div className="gemini-modal-title-row">
            <div className="gemini-modal-icon-badge">
              <Sparkles size={22} color="#1a73e8" />
            </div>
            <div>
              <h2 className="gemini-modal-title">Google Gemini in Business</h2>
              <p className="gemini-modal-subtitle">
                Official Google & Firebase Integration • 100% Free & Unlimited AI
              </p>
            </div>
          </div>
          <button className="gemini-modal-close" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="gemini-modal-body">
          {/* PRIMARY GOOGLE SIGN UP / SIGN IN CARD */}
          <div className="gemini-auth-hero-card">
            {googleUser ? (
              /* Signed In State */
              <div className="gemini-auth-connected-state">
                <div className="gemini-auth-user-row">
                  {googleUser.photoURL ? (
                    <img src={googleUser.photoURL} alt={userName} className="gemini-auth-avatar" />
                  ) : (
                    <div className="gemini-auth-avatar-fallback">
                      {userInitial}
                    </div>
                  )}
                  <div className="gemini-auth-details">
                    <div className="gemini-auth-name-row">
                      <span className="gemini-auth-name">{userName}</span>
                      <span className="gemini-auth-verified-tag">
                        <CheckCircle2 size={13} color="#16a34a" /> Connected & Verified
                      </span>
                    </div>
                    <span className="gemini-auth-email">{googleUser.email}</span>
                    <div className="gemini-auth-firebase-info">
                      <ShieldCheck size={12} color="#2563eb" /> Firebase Project: <code>business-software-b3844</code>
                    </div>
                  </div>
                </div>

                <div className="gemini-auth-connected-actions">
                  <span className="gemini-free-quota-badge">
                    <Zap size={12} /> 100% Free & Unlimited Access
                  </span>
                  <div className="gemini-auth-btn-group">
                    <button 
                      type="button" 
                      className="gemini-auth-switch-btn" 
                      onClick={handleGoogleSignIn}
                      disabled={isGoogleSigningIn}
                    >
                      Switch Account
                    </button>
                    <button 
                      type="button" 
                      className="gemini-auth-disconnect-btn" 
                      onClick={handleDisconnect}
                    >
                      <LogOut size={12} /> Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Not Signed In: Big Authentic Google Sign In */
              <div className="gemini-auth-prompt-state">
                <div className="gemini-auth-prompt-copy">
                  <h3 className="gemini-auth-prompt-title">Connect Google Account for AI Service</h3>
                  <p className="gemini-auth-prompt-desc">
                    Connect your Google account to unlock official Google Gemini AI integration. This is used solely for the AI service and will not register you on the billing website.
                  </p>
                </div>

                <button 
                  type="button"
                  className="gemini-google-cta-button" 
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleSigningIn}
                >
                  {isGoogleSigningIn ? (
                    <>
                      <Loader2 size={20} className="gemini-spin" />
                      <span>Connecting with Google...</span>
                    </>
                  ) : (
                    <>
                      <GoogleIcon />
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>

                <div className="gemini-auth-perks-row">
                  <span><Check size={13} color="#16a34a" /> 100% Free forever</span>
                  <span><Check size={13} color="#16a34a" /> Firebase business-software-b3844</span>
                  <span><Check size={13} color="#16a34a" /> Unlimited AI queries</span>
                </div>
              </div>
            )}
          </div>

          {/* MODEL SELECTION */}
          <div className="gemini-model-section">
            <label className="gemini-section-heading">Selected Google Gemini Model:</label>
            <div className="gemini-model-cards-list">
              {AVAILABLE_MODELS.map((model) => {
                const isSelected = selectedModel === model.id;
                return (
                  <div
                    key={model.id}
                    className={`gemini-model-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedModel(model.id);
                      geminiStore.setModel(model.id);
                    }}
                  >
                    <div className="gemini-model-card-top">
                      <div className="gemini-model-radio-title">
                        <div className={`gemini-radio-circle ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <div className="gemini-radio-inner" />}
                        </div>
                        <span className="gemini-model-title-text">{model.name}</span>
                      </div>
                      <span className="gemini-model-badge fast-free">
                        {model.badge || model.short || 'Official'}
                      </span>
                    </div>
                    <p className="gemini-model-desc">{model.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Feedback */}
          {authStatusMsg && (
            <div className={`gemini-test-result-box ${authStatusMsg.warning ? 'warning' : authStatusMsg.success ? 'success' : 'error'}`}>
              {authStatusMsg.warning ? (
                <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0 }} />
              ) : (
                <CheckCircle2 size={16} color={authStatusMsg.success ? "#16a34a" : "#dc2626"} style={{ flexShrink: 0 }} />
              )}
              <span>{authStatusMsg.message}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="gemini-modal-footer">
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Powered by Google & Firebase (business-software-b3844)
          </div>
          <div className="gemini-modal-footer-right">
            <button type="button" className="gemini-btn-cancel-flat" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="gemini-btn-save-activate"
              onClick={handleSave}
            >
              <Zap size={15} />
              <span>Save & Activate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeminiConnectModal;

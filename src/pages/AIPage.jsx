import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/hooks/useAuth';
import { API_BASE_URL } from '@/config/api';
import { aiChatStore } from '@/utils/aiChatStore';
import { geminiStore, AVAILABLE_MODELS } from '@/utils/geminiStore';
import { getConnectedGoogleAccount } from '@/config/firebase';
import GeminiConnectModal from '@/components/ai/GeminiConnectModal';
import AntigravityAskingModal from '@/components/ui/AntigravityAskingModal';
import '@/styles/AntigravityAI.css';
import {
  Sparkles, Send, Plus, ArrowRight, ShieldCheck,
  CheckCircle2, XCircle, Loader2, Volume2, VolumeX,
  Mic, MicOff, Copy, Check, Trash2, Search,
  Image as ImageIcon, Library, Settings, ChevronDown,
  PanelLeft, ShieldAlert, BookOpen, FileText, Package,
  UserCheck, Users, Briefcase, DollarSign, Home, X,
  TrendingUp, AlertTriangle, Layers, Clock, Zap
} from 'lucide-react';

// Official Google Gemini Multi-Color Star Logo (Matching Image 2)
const GeminiStarLogo = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
      fill="url(#gemini_grad_logo)"
    />
    <defs>
      <linearGradient id="gemini_grad_logo" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1a73e8" />
        <stop offset="0.45" stopColor="#8ab4f8" />
        <stop offset="0.8" stopColor="#9333ea" />
        <stop offset="1" stopColor="#ea4335" />
      </linearGradient>
    </defs>
  </svg>
);

const AIPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Sidebar toggle state
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Model & Account
  const [selectedModel, setSelectedModel] = useState(() => geminiStore.getModel() || 'gemini-2.0-flash');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [googleUser, setGoogleUser] = useState(() => getConnectedGoogleAccount());

  // Sessions & Chat
  const [sessions, setSessions] = useState(() => aiChatStore.getSessions());
  const [activeSessionId, setActiveSessionId] = useState(() => aiChatStore.getActiveSessionId());
  const [messages, setMessages] = useState(() => {
    const active = aiChatStore.getActiveSession();
    return active?.messages || [];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [executingActionId, setExecutingActionId] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Real business conversation starters
  const sampleRecents = [
    "GST Sale Invoice for Rahul Enterprises",
    "Live Inventory & Low Stock Radar",
    "Receivables & Cash Flow Analysis",
    "Daily Office Expenses & Tea Log",
    "Vendor Reorder & Purchase Order Audit",
    "Tax Calculation & HSN Code Lookup"
  ];

  // Sync messages
  useEffect(() => {
    if (messages.length > 0) {
      aiChatStore.saveMessages(messages, 'page');
      setSessions(aiChatStore.getSessions());
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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

  const handleModelSelect = (modelId) => {
    setSelectedModel(modelId);
    geminiStore.setModel(modelId);
    setShowModelDropdown(false);
  };

  const handleNewSession = () => {
    const newSess = aiChatStore.createNewSession();
    setSessions(aiChatStore.getSessions());
    setActiveSessionId(newSess.id);
    setMessages([]);
    inputRef.current?.focus();
  };

  const handleSwitchSession = (sessId) => {
    aiChatStore.switchSession(sessId);
    setActiveSessionId(sessId);
    const active = aiChatStore.getActiveSession();
    setMessages(active?.messages || []);
  };

  const handleDeleteSession = (e, sessId) => {
    e.stopPropagation();
    const remaining = aiChatStore.deleteSession(sessId);
    setSessions(remaining);
    const current = aiChatStore.getActiveSession();
    setActiveSessionId(current.id);
    setMessages(current.messages || []);
  };

  // Voice Input
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Speech recognition start failed:", e);
      setIsRecording(false);
    }
  };

  // Voice Output
  const handleSpeak = (text, index) => {
    if (!window.speechSynthesis) return;

    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/[*_#~]/g, '')
      .replace(/\[[^\]]+\]\([^)]+\)/g, '')
      .replace(/<<<[^>]+>>>/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);

    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = (text, index) => {
    navigator.clipboard?.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getLatestPendingAction = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].action && messages[i].action.status === 'pending') {
        return messages[i].action;
      }
    }
    return null;
  };

  // Send message
  const handleSend = async (overridePrompt = null) => {
    const textToSend = overridePrompt || input;
    if (!textToSend.trim() || isLoading) return;

    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeakingIndex(null);

    const userMessage = { role: 'user', content: textToSend };
    const pendingAction = getLatestPendingAction();
    const hasActiveQ = messages.some(m => m.question && m.question.status === 'active');

    setMessages(prev =>
      prev.map(m => (m.question?.status === 'active' ? { ...m, question: { ...m.question, status: 'answered' } } : m)).concat([userMessage])
    );
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          history: messages,
          userId: user?.id,
          userName: googleUser?.name || user?.username || 'User',
          pendingAction,
          hasActiveQuestion: hasActiveQ,
          geminiModel: selectedModel
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (data.action && (data.action.status === 'executed' || data.action.status === 'cancelled')) {
          setMessages(prev =>
            prev.map(m =>
              m.action && m.action.actionId === data.action.actionId
                ? { ...m, action: data.action }
                : m
            ).concat([{
              role: 'ai',
              content: data.response,
              action: data.action,
              question: data.question || null
            }])
          );
        } else {
          setMessages(prev => [
            ...prev,
            {
              role: 'ai',
              content: data.response,
              action: data.action || null,
              question: data.question || null
            }
          ]);
        }
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'ai', content: data.message || 'Error communicating with Google Gemini.' }
        ]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        { role: 'ai', content: 'Connection error. Please make sure the backend server is running.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteAction = async (msgIndex, action) => {
    if (!action || executingActionId) return;
    setExecutingActionId(action.actionId);

    try {
      const res = await fetch(`${API_BASE_URL}/ai/action/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          action,
          userName: googleUser?.name || user?.username || 'User'
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setMessages(prev => {
          const updated = [...prev];
          updated[msgIndex] = {
            ...updated[msgIndex],
            action: {
              ...action,
              status: 'executed',
              savedItem: result.item,
              route: result.route
            }
          };
          return updated;
        });
      } else {
        alert(result.message || 'Failed to execute action.');
      }
    } catch (err) {
      console.error('Action error:', err);
      alert('Network error executing action.');
    } finally {
      setExecutingActionId(null);
    }
  };

  const handleCancelAction = (msgIndex, action) => {
    setMessages(prev => {
      const updated = [...prev];
      updated[msgIndex] = {
        ...updated[msgIndex],
        action: { ...action, status: 'cancelled' }
      };
      return updated;
    });
  };

  const handleDismissQuestion = (msgIndex) => {
    setMessages(prev => {
      const updated = [...prev];
      if (updated[msgIndex]?.question) {
        updated[msgIndex] = {
          ...updated[msgIndex],
          question: { ...updated[msgIndex].question, status: 'dismissed' }
        };
      }
      return updated;
    });
  };

  const getActionIcon = (type) => {
    switch (type) {
      case 'create_document': return <FileText size={16} className="ai-badge-icon doc" />;
      case 'create_product': return <Package size={16} className="ai-badge-icon prod" />;
      case 'create_contact': return <UserCheck size={16} className="ai-badge-icon contact" />;
      case 'create_staff': return <Users size={16} className="ai-badge-icon staff" />;
      case 'create_project': return <Briefcase size={16} className="ai-badge-icon proj" />;
      case 'create_expense': return <DollarSign size={16} className="ai-badge-icon exp" />;
      case 'create_ledger_entry': return <BookOpen size={16} className="ai-badge-icon ledger" />;
      default: return <Sparkles size={16} className="ai-badge-icon default" />;
    }
  };

  // User display name & initials
  const userName = googleUser?.name || user?.username || 'User';
  const firstName = googleUser?.firstName || user?.firstName || userName.split(' ')[0] || 'User';
  const userInitial = (firstName || 'U').charAt(0).toUpperCase();

  // Model Short Label
  const getModelShortLabel = (modelId) => {
    if (modelId.includes('2.0')) return 'Flash';
    if (modelId.includes('1.5-pro')) return 'Pro 1.5';
    return 'Flash';
  };

  return (
    <div className="gemini-app-layout">
      {/* 1. LEFT SIDEBAR: Business AI Workspace & Recents */}
      <aside className={`gemini-app-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="gemini-sidebar-header">
          <div className="gemini-sidebar-logo-row">
            <GeminiStarLogo size={24} />
            <span className="gemini-sidebar-brand-name">Gemini Copilot</span>
          </div>
          <button
            type="button"
            className="gemini-sidebar-toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle sidebar"
          >
            <PanelLeft size={19} />
          </button>
        </div>

        {/* New Chat Button */}
        <button
          type="button"
          className="gemini-new-chat-pill"
          onClick={handleNewSession}
        >
          <Plus size={18} />
          <span>New chat</span>
        </button>

        {/* Business Copilot Quick Actions */}
        <div className="gemini-sidebar-nav-list">
          <button type="button" className="gemini-nav-item-btn" onClick={() => handleSend("Show recent invoices and billing actions")}>
            <FileText size={17} className="gemini-nav-icon invoice" />
            <span>Invoices & Billing</span>
          </button>
          <button type="button" className="gemini-nav-item-btn" onClick={() => handleSend("Check my inventory database and show all products running low on stock")}>
            <Package size={17} className="gemini-nav-icon stock" />
            <span>Inventory Radar</span>
          </button>
          <button type="button" className="gemini-nav-item-btn" onClick={() => handleSend("Analyze unpaid customer balances, today's revenue, and pending collections")}>
            <TrendingUp size={17} className="gemini-nav-icon ledger" />
            <span>Cash Flow & Dues</span>
          </button>
          <button type="button" className="gemini-nav-item-btn" onClick={() => handleSend("Record an expense of 1500 for Office Tea & Refreshments paid via UPI")}>
            <Zap size={17} className="gemini-nav-icon expense" />
            <span>Expense Logger</span>
          </button>
        </div>

        {/* Recent Business Chats Section */}
        <div className="gemini-sidebar-section recents-section">
          <div className="gemini-section-title-row">
            <span>Recent Business Chats</span>
          </div>
          <div className="gemini-recents-list">
            {sessions.length > 0 ? (
              sessions.map((sess) => (
                <div
                  key={sess.id}
                  className={`gemini-recent-item ${sess.id === activeSessionId ? 'active' : ''}`}
                  onClick={() => handleSwitchSession(sess.id)}
                >
                  <span className="recent-title">{sess.title || 'Untitled'}</span>
                  {sessions.length > 1 && (
                    <button
                      type="button"
                      className="recent-delete-btn"
                      onClick={(e) => handleDeleteSession(e, sess.id)}
                      title="Delete chat"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))
            ) : (
              sampleRecents.map((item, idx) => (
                <div
                  key={idx}
                  className="gemini-recent-item"
                  onClick={() => handleSend(`Tell me more about ${item}`)}
                >
                  <span className="recent-title">{item}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom User Profile Bar (Matching Image 2: Red circle V, Vedaant Gupta, Settings gear) */}
        <div className="gemini-sidebar-user-footer">
          <div className="gemini-user-profile-btn" onClick={() => setShowGeminiModal(true)} title="Google Account Settings">
            {googleUser?.photoURL ? (
              <img src={googleUser.photoURL} alt={userName} className="gemini-user-avatar-img" />
            ) : (
              <div className="gemini-user-avatar-circle">
                {userInitial}
              </div>
            )}
            <span className="gemini-user-display-name">{userName}</span>
          </div>

          <button
            type="button"
            className="gemini-gear-btn"
            onClick={() => setShowGeminiModal(true)}
            title="Account & Gemini Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </aside>

      {/* 2. MAIN CENTER WORKSPACE */}
      <main className="gemini-main-viewport">
        {/* Top Header Bar */}
        <header className="gemini-main-topbar">
          <div className="gemini-topbar-left">
            {!sidebarOpen && (
              <button
                type="button"
                className="gemini-topbar-sidebar-toggle"
                onClick={() => setSidebarOpen(true)}
                title="Open sidebar"
              >
                <PanelLeft size={20} />
              </button>
            )}
            <div className="gemini-topbar-title-wrap">
              <span className="gemini-topbar-title">Gemini 2.0 Flash Copilot</span>
              <span className="gemini-topbar-status-dot"></span>
              <span className="gemini-topbar-status-text">Connected</span>
            </div>
          </div>

          <div className="gemini-topbar-right">
            {/* New Chat Button */}
            <button
              type="button"
              className="gemini-topbar-new-chat-btn"
              onClick={handleNewSession}
              title="Start a fresh chat"
            >
              <Plus size={16} />
              <span>New chat</span>
            </button>

            {/* Upgrade Button matching Image 2 */}
            <button
              type="button"
              className="gemini-upgrade-btn"
              onClick={() => setShowGeminiModal(true)}
              title="Google Gemini Pro & Firebase Unlimited"
            >
              <GeminiStarLogo size={16} />
              <span>Upgrade</span>
            </button>

            {/* Top Right Red Circle Avatar V */}
            <button
              type="button"
              className="gemini-topbar-avatar-btn"
              onClick={() => setShowGeminiModal(true)}
              title={`Account: ${userName} (${googleUser?.email || 'Google Account'})`}
            >
              {googleUser?.photoURL ? (
                <img src={googleUser.photoURL} alt={userName} className="gemini-topbar-avatar-img" />
              ) : (
                <div className="gemini-topbar-avatar-circle">{userInitial}</div>
              )}
            </button>
          </div>
        </header>

        {/* Center Content View */}
        <div className="gemini-center-content-container">
          {messages.length === 0 ? (
            /* HERO CANVAS: "Let's jump in, Vedaant" + 4 Interactive Business Action Cards */
            <div className="gemini-hero-center-view">
              <div className="gemini-hero-logo-row">
                <GeminiStarLogo size={42} />
              </div>
              <h1 className="gemini-jump-in-heading">
                Let's jump in, {firstName}
              </h1>
              <p className="gemini-hero-subtitle">
                What business task can I automate for you today?
              </p>

              {/* Centered Search Bar with Model Dropdown inside */}
              <div className="gemini-hero-search-capsule">
                <button
                  type="button"
                  className="gemini-hero-plus-btn"
                  onClick={() => setShowGeminiModal(true)}
                  title="Attach & Gemini Models"
                >
                  <Plus size={20} />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  className="gemini-hero-search-input"
                  placeholder="Ask Gemini about sales, low stock, customer ledger, or expenses..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  disabled={isLoading}
                />

                <div className="gemini-search-right-tools">
                  {/* Model Dropdown Chip Inside Search Bar (Matching Image 2: [ Flash ⌵ ]) */}
                  <div className="gemini-model-chip-container">
                    <button
                      type="button"
                      className="gemini-search-model-chip"
                      onClick={() => setShowModelDropdown(!showModelDropdown)}
                      title="Select active Google Gemini Model"
                    >
                      <span>{getModelShortLabel(selectedModel)}</span>
                      <ChevronDown size={14} />
                    </button>

                    {showModelDropdown && (
                      <div className="gemini-search-model-menu">
                        {AVAILABLE_MODELS.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            className={`gemini-model-menu-opt ${selectedModel === m.id ? 'active' : ''}`}
                            onClick={() => handleModelSelect(m.id)}
                          >
                            <span className="opt-name">{m.name.split(' (')[0]}</span>
                            <span className="opt-badge">{m.badge}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mic Button */}
                  <button
                    type="button"
                    className={`gemini-search-mic-btn ${isRecording ? 'recording' : ''}`}
                    onClick={toggleRecording}
                    title={isRecording ? "Stop dictation" : "Voice dictation"}
                  >
                    {isRecording ? <MicOff size={19} /> : <Mic size={19} />}
                  </button>

                  {/* Send Button */}
                  <button
                    type="button"
                    className={`gemini-search-send-btn ${input.trim() ? 'active' : ''}`}
                    onClick={() => handleSend()}
                    disabled={isLoading || !input.trim()}
                    aria-label="Send prompt"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>

              {/* 4 Interactive Business Action Cards ("Better than real Gemini") */}
              <div className="gemini-hero-action-cards">
                <div 
                  className="gemini-hero-card"
                  onClick={() => handleSend("Create a sale invoice for 5 units of Laptop at 45000 each with 18% GST for Rahul Enterprises")}
                >
                  <div className="gemini-card-icon-wrap invoice">
                    <FileText size={20} />
                  </div>
                  <div className="gemini-card-content">
                    <div className="gemini-card-badge invoice">Sales & Invoicing</div>
                    <h3 className="gemini-card-title">Create GST Sale Invoice</h3>
                    <p className="gemini-card-desc">5x Laptop @ ₹45,000 + 18% GST for Rahul Enterprises</p>
                  </div>
                  <ArrowRight size={16} className="gemini-card-arrow" />
                </div>

                <div 
                  className="gemini-hero-card"
                  onClick={() => handleSend("Check my inventory database and show all products running low on stock")}
                >
                  <div className="gemini-card-icon-wrap stock">
                    <Package size={20} />
                  </div>
                  <div className="gemini-card-content">
                    <div className="gemini-card-badge stock">Inventory Radar</div>
                    <h3 className="gemini-card-title">Check Low Stock & Reorder</h3>
                    <p className="gemini-card-desc">Scan products at or below minimum reorder thresholds</p>
                  </div>
                  <ArrowRight size={16} className="gemini-card-arrow" />
                </div>

                <div 
                  className="gemini-hero-card"
                  onClick={() => handleSend("Analyze unpaid customer balances, today's revenue, and pending collections")}
                >
                  <div className="gemini-card-icon-wrap ledger">
                    <TrendingUp size={20} />
                  </div>
                  <div className="gemini-card-content">
                    <div className="gemini-card-badge ledger">Financial Intelligence</div>
                    <h3 className="gemini-card-title">Receivables & Cash Flow</h3>
                    <p className="gemini-card-desc">Audit unpaid customer balances and today's collections</p>
                  </div>
                  <ArrowRight size={16} className="gemini-card-arrow" />
                </div>

                <div 
                  className="gemini-hero-card"
                  onClick={() => handleSend("Record an expense of 1500 for Office Tea & Refreshments paid via UPI")}
                >
                  <div className="gemini-card-icon-wrap expense">
                    <Zap size={20} />
                  </div>
                  <div className="gemini-card-content">
                    <div className="gemini-card-badge expense">Instant Accounting</div>
                    <h3 className="gemini-card-title">Record Daily Expense</h3>
                    <p className="gemini-card-desc">Log ₹1,500 Office Tea & Refreshments paid via UPI</p>
                  </div>
                  <ArrowRight size={16} className="gemini-card-arrow" />
                </div>
              </div>
            </div>
          ) : (
            /* ACTIVE CHAT CONVERSATION VIEW */
            <div className="gemini-active-chat-container">
              <div className="gemini-chat-messages-area">
                {messages.map((msg, index) => (
                  <div key={index} className={`gemini-stream-row ${msg.role}`}>
                    {msg.role === 'ai' && (
                      <div className="gemini-stream-avatar">
                        <GeminiStarLogo size={22} />
                      </div>
                    )}

                    <div className={`gemini-stream-bubble ${msg.role}`}>
                      {msg.role === 'ai' ? (
                        <>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                          </ReactMarkdown>

                          {/* Message Actions */}
                          <div className="gemini-stream-actions">
                            <button
                              type="button"
                              className={`gemini-act-btn ${speakingIndex === index ? 'speaking' : ''}`}
                              onClick={() => handleSpeak(msg.content, index)}
                              title={speakingIndex === index ? "Stop voice" : "Listen (Hear)"}
                            >
                              {speakingIndex === index ? <VolumeX size={13} /> : <Volume2 size={13} />}
                              <span>{speakingIndex === index ? "Stop" : "Hear"}</span>
                            </button>

                            <button
                              type="button"
                              className="gemini-act-btn"
                              onClick={() => handleCopy(msg.content, index)}
                              title="Copy response"
                            >
                              {copiedIndex === index ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                              <span>{copiedIndex === index ? "Copied" : "Copy"}</span>
                            </button>
                          </div>

                          {/* Interactive Clarification Modal Card */}
                          {msg.question && msg.question.status === 'active' && (
                            <AntigravityAskingModal
                              question={msg.question}
                              onSubmit={(answer) => handleSend(answer)}
                              onCancel={() => handleDismissQuestion(index)}
                            />
                          )}

                          {/* Autonomous Action Proposal Card */}
                          {msg.action && (
                            <div className={`ai-action-card ${msg.action.status}`}>
                              <div className="ai-action-card-header">
                                <div className="ai-action-type-tag">
                                  {getActionIcon(msg.action.type)}
                                  <span>{msg.action.label || 'Action Proposed'}</span>
                                </div>
                                {msg.action.status === 'pending' && (
                                  <span className="ai-perm-badge">
                                    <ShieldAlert size={12} /> Needs Permission
                                  </span>
                                )}
                              </div>

                              {msg.action.status === 'pending' && (
                                <div className="ai-action-actions">
                                  <button
                                    className="ai-btn-confirm"
                                    onClick={() => handleExecuteAction(index, msg.action)}
                                    disabled={executingActionId === msg.action.actionId}
                                  >
                                    {executingActionId === msg.action.actionId ? (
                                      <><Loader2 size={14} className="ai-spin" /> Saving to Database...</>
                                    ) : (
                                      <><ShieldCheck size={14} /> Confirm & Save to Database</>
                                    )}
                                  </button>
                                  <button
                                    className="ai-btn-cancel"
                                    onClick={() => handleCancelAction(index, msg.action)}
                                  >
                                    <X size={14} /> Dismiss
                                  </button>
                                </div>
                              )}

                              {msg.action.status === 'executed' && (
                                <div className="ai-action-result executed">
                                  <div className="ai-executed-left">
                                    <CheckCircle2 size={16} color="#16a34a" />
                                    <span>Confirmed & Saved to MongoDB</span>
                                  </div>
                                  {msg.action.route && (
                                    <button 
                                      className="ai-view-saved-btn"
                                      onClick={() => navigate(msg.action.route)}
                                    >
                                      <span>View {msg.action.collection || 'Record'}</span>
                                      <ArrowRight size={13} />
                                    </button>
                                  )}
                                </div>
                              )}

                              {msg.action.status === 'cancelled' && (
                                <div className="ai-action-result cancelled">
                                  <XCircle size={15} color="#dc2626" />
                                  <span>Cancelled by user</span>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="gemini-stream-row ai">
                    <div className="gemini-stream-avatar">
                      <GeminiStarLogo size={22} />
                    </div>
                    <div className="gemini-stream-bubble ai loading">
                      <Loader2 size={16} className="ai-spin" />
                      <span>Gemini is generating response...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Fixed Search Bar During Chat */}
              <div className="gemini-chat-bottom-bar-wrapper">
                <div className="gemini-hero-search-capsule chat-bottom">
                  <button
                    type="button"
                    className="gemini-hero-plus-btn"
                    onClick={() => setShowGeminiModal(true)}
                    title="Attach & Gemini Models"
                  >
                    <Plus size={20} />
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    className="gemini-hero-search-input"
                    placeholder="Ask Gemini"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    disabled={isLoading}
                  />

                  <div className="gemini-search-right-tools">
                    <div className="gemini-model-chip-container">
                      <button
                        type="button"
                        className="gemini-search-model-chip"
                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                        title="Select active model"
                      >
                        <span>{getModelShortLabel(selectedModel)}</span>
                        <ChevronDown size={14} />
                      </button>

                      {showModelDropdown && (
                        <div className="gemini-search-model-menu">
                          {AVAILABLE_MODELS.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              className={`gemini-model-menu-opt ${selectedModel === m.id ? 'active' : ''}`}
                              onClick={() => handleModelSelect(m.id)}
                            >
                              <span className="opt-name">{m.name.split(' (')[0]}</span>
                              <span className="opt-badge">{m.badge}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className={`gemini-search-mic-btn ${isRecording ? 'recording' : ''}`}
                      onClick={toggleRecording}
                      title={isRecording ? "Stop dictation" : "Voice dictation"}
                    >
                      {isRecording ? <MicOff size={19} /> : <Mic size={19} />}
                    </button>

                    <button
                      type="button"
                      className={`gemini-search-send-btn ${input.trim() ? 'active' : ''}`}
                      onClick={() => handleSend()}
                      disabled={isLoading || !input.trim()}
                      aria-label="Send prompt"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>

                <div className="gemini-bottom-disclaimer">
                  Gemini can make mistakes, so double-check it
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Google Gemini Connection Modal */}
      <GeminiConnectModal
        isOpen={showGeminiModal}
        onClose={() => setShowGeminiModal(false)}
      />
    </div>
  );
};

export default AIPage;

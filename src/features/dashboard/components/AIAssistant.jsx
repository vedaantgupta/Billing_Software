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
import {
  Sparkles, Send, Mic, MicOff, Volume2, VolumeX,
  Copy, Check, X, ShieldAlert, ShieldCheck,
  CheckCircle, XCircle, Loader2, ArrowRight,
  FileText, Package, UserCheck, Users, Briefcase, DollarSign, BookOpen,
  Bell, HelpCircle, Terminal, GraduationCap, Moon, Sun, Plus,
  RotateCcw, Maximize2, Bug, ChevronDown
} from 'lucide-react';
import '@/features/dashboard/styles/AIAssistant.css';

const AIAssistant = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Floating window visibility
  const [isOpen, setIsOpen] = useState(false);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showKpiStrip, setShowKpiStrip] = useState(false);

  // Theme
  const [theme, setTheme] = useState(() => aiChatStore.getTheme());

  // Conversation synced with active session in aiChatStore
  const [messages, setMessages] = useState(() => {
    const active = aiChatStore.getActiveSession();
    return active?.messages || [];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [executingActionId, setExecutingActionId] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Active Model
  const [selectedModel, setSelectedModel] = useState(() => geminiStore.getModel() || 'gemini-2.0-flash');

  // Google User
  const [googleUser, setGoogleUser] = useState(() => getConnectedGoogleAccount());

  // Voice State (Speech-to-Text & Text-to-Speech)
  const [isRecording, setIsRecording] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Exact suggestion pills matching Image 1 ("Gemini in Firebase")
  const image1Pills = [
    "How can you help me with Firebase?",
    "How does realtime work in Remote Config?",
    "What's the difference between crash-free users and crash-free sessions?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setGoogleUser(getConnectedGoogleAccount());
      setSelectedModel(geminiStore.getModel() || 'gemini-2.0-flash');
    }
  }, [messages, isLoading, executingActionId, isOpen]);

  useEffect(() => {
    if (messages.length > 0) {
      aiChatStore.saveMessages(messages, 'modal');
    }
  }, [messages]);

  useEffect(() => {
    const handleMessagesUpdate = (e) => {
      if (e.detail?.source === 'modal') return;
      const active = aiChatStore.getActiveSession();
      if (active && active.messages) {
        setMessages(active.messages);
      }
    };

    const handleGoogleChange = (e) => {
      setGoogleUser(e.detail);
    };

    const handleGeminiChange = (e) => {
      if (e.detail?.model) setSelectedModel(e.detail.model);
    };

    const handleThemeChange = (e) => {
      if (e.detail) setTheme(e.detail);
    };

    window.addEventListener('ai-messages-updated', handleMessagesUpdate);
    window.addEventListener('google-account-changed', handleGoogleChange);
    window.addEventListener('gemini-config-changed', handleGeminiChange);
    window.addEventListener('ai-theme-change', handleThemeChange);

    return () => {
      window.removeEventListener('ai-messages-updated', handleMessagesUpdate);
      window.removeEventListener('google-account-changed', handleGoogleChange);
      window.removeEventListener('gemini-config-changed', handleGeminiChange);
      window.removeEventListener('ai-theme-change', handleThemeChange);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    aiChatStore.setTheme(nextTheme);
  };

  const handleModelSelect = (modelId) => {
    setSelectedModel(modelId);
    geminiStore.setModel(modelId);
    setShowModelDropdown(false);
  };

  // Voice Input: Speech-to-Text
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

  // Voice Output: Text-to-Speech
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

  const handleNewChat = () => {
    aiChatStore.createNewSession();
    setMessages([]);
    inputRef.current?.focus();
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
  const handleSend = async (directInput = null) => {
    const textToSend = directInput || input;
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
          userName: googleUser?.name || 'Vedaant',
          pendingAction,
          hasActiveQuestion: hasActiveQ,
          geminiModel: selectedModel
        }),
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
          { role: 'ai', content: data.message || 'Error communicating with Gemini assistant.' }
        ]);
      }
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'ai', content: 'Connection error. Make sure the backend server is running on port 5000.' }
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
      console.error('Execution error:', err);
      alert('Network error while executing action.');
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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

  // User display name & initial
  const userName = googleUser?.name || user?.username || 'User';
  const firstName = googleUser?.firstName || user?.firstName || userName.split(' ')[0] || 'User';
  const userInitial = (firstName || 'U').charAt(0).toUpperCase();

  // Model Short Name
  const getModelShortLabel = (modelId) => {
    if (modelId.includes('2.0')) return '2.0 Flash';
    if (modelId.includes('1.5-pro')) return '1.5 Pro';
    return 'Flash';
  };

  return (
    <div className="ai-assistant-container">
      {isOpen && (
        <div className={`quick-firebase-panel theme-${theme}`}>
          {/* 1. LEFT VERTICAL DOCK RAIL (Exact Match to Image 1) */}
          <aside className="quick-dock-rail">
            <div className="quick-dock-top">
              {/* User Avatar Circle */}
              <button
                type="button"
                className="quick-dock-avatar-btn"
                onClick={() => setIsGeminiModalOpen(true)}
                title={`Connected: ${userName} (Google Account)`}
              >
                {googleUser?.photoURL ? (
                  <img src={googleUser.photoURL} alt={userName} className="quick-dock-photo" />
                ) : (
                  <span className="quick-dock-avatar-letter">{userInitial}</span>
                )}
              </button>

              {/* Notification Bell */}
              <button type="button" className="quick-dock-icon-btn" title="Notifications" onClick={() => setShowKpiStrip(!showKpiStrip)}>
                <Bell size={18} />
              </button>

              {/* Blue Glowing Sparkle Button */}
              <button type="button" className="quick-dock-sparkle-active" title="Google Gemini in Firebase">
                <Sparkles size={18} />
              </button>

              {/* Help Circle (?) */}
              <button 
                type="button" 
                className="quick-dock-icon-btn" 
                title="Help" 
                onClick={() => handleSend("How can you help me with Firebase?")}
              >
                <HelpCircle size={18} />
              </button>

              {/* Terminal Code [>_] */}
              <button 
                type="button" 
                className="quick-dock-icon-btn" 
                title="System Diagnostics" 
                onClick={() => setShowKpiStrip(!showKpiStrip)}
              >
                <Terminal size={17} />
              </button>

              {/* Graduation Cap / Library */}
              <button 
                type="button" 
                className="quick-dock-icon-btn" 
                title="Documentation & Prompts"
                onClick={() => handleSend("What's the difference between crash-free users and crash-free sessions?")}
              >
                <GraduationCap size={19} />
              </button>
            </div>

            {/* Bottom: Moon Theme Toggle */}
            <div className="quick-dock-bottom">
              <button 
                type="button" 
                className="quick-dock-icon-btn theme-toggle" 
                onClick={toggleTheme} 
                title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            </div>
          </aside>

          {/* 2. MAIN FIREBASE PANEL (Exact Match to Image 1) */}
          <div className="quick-firebase-main">
            {/* Topbar: Gemini in Firebase  +  History  ⛶  Bug  ✕ */}
            <header className="quick-firebase-topbar">
              <div className="quick-firebase-brand">
                <span className="quick-brand-gemini">Gemini</span>
                <span className="quick-brand-firebase">in Firebase</span>
              </div>

              <div className="quick-firebase-actions">
                {/* New Chat (+) */}
                <button type="button" className="quick-top-btn" onClick={handleNewChat} title="New chat">
                  <Plus size={18} />
                </button>

                {/* History Clock */}
                <button 
                  type="button" 
                  className="quick-top-btn" 
                  onClick={handleNewChat} 
                  title="Reset / History"
                >
                  <RotateCcw size={16} />
                </button>

                {/* Maximize to Full Page (Image 2) */}
                <button 
                  type="button" 
                  className="quick-top-btn" 
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/ai');
                  }} 
                  title="Expand to Full Page Gemini"
                >
                  <Maximize2 size={16} />
                </button>

                {/* Bug / Diagnostics Toggle */}
                <button 
                  type="button" 
                  className="quick-top-btn" 
                  onClick={() => setShowKpiStrip(!showKpiStrip)} 
                  title="Diagnostics"
                >
                  <Bug size={17} />
                </button>

                {/* Close Button */}
                <button 
                  type="button" 
                  className="quick-top-btn close" 
                  onClick={() => setIsOpen(false)} 
                  title="Close"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            {/* Optional KPI Strip */}
            {showKpiStrip && (
              <div className="quick-kpi-banner">
                <span>Google Firebase: <code>business-software-b3844</code></span>
                <span>Active Model: <strong>{selectedModel}</strong></span>
              </div>
            )}

            {/* Body */}
            <div className="quick-firebase-body">
              {messages.length === 0 ? (
                /* HERO GREETING STATE (Matching Image 1 Exactly) */
                <div className="quick-hero-view">
                  <div className="quick-hero-headings">
                    <h1 className="quick-hero-title">
                      <span className="text-blue">Hello, </span>
                      <span className="text-gradient">{firstName}</span>
                    </h1>
                    <h2 className="quick-hero-subtitle">How can I help you?</h2>
                  </div>

                  <div className="quick-prompt-section">
                    <p className="quick-prompt-label">Get started with a prompt</p>
                    <div className="quick-pills-list">
                      {image1Pills.map((pillText, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="quick-prompt-pill"
                          onClick={() => handleSend(pillText)}
                        >
                          {pillText}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* ACTIVE CHAT STREAM */
                <div className="quick-chat-stream">
                  {messages.map((msg, index) => (
                    <div key={index} className={`quick-msg-row ${msg.role}`}>
                      {msg.role === 'ai' && (
                        <div className="quick-ai-avatar">
                          <Sparkles size={16} color="#1a73e8" />
                        </div>
                      )}

                      <div className={`quick-msg-bubble ${msg.role}`}>
                        {msg.role === 'ai' ? (
                          <>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                            </ReactMarkdown>

                            {/* Message Action Bar (Hear & Copy) */}
                            <div className="quick-msg-actions">
                              <button
                                type="button"
                                className={`quick-sub-btn ${speakingIndex === index ? 'speaking' : ''}`}
                                onClick={() => handleSpeak(msg.content, index)}
                                title={speakingIndex === index ? "Stop voice" : "Listen (Hear)"}
                              >
                                {speakingIndex === index ? <VolumeX size={12} /> : <Volume2 size={12} />}
                                <span>{speakingIndex === index ? "Stop" : "Hear"}</span>
                              </button>

                              <button
                                type="button"
                                className="quick-sub-btn"
                                onClick={() => handleCopy(msg.content, index)}
                                title="Copy text"
                              >
                                {copiedIndex === index ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
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
                                        <><Loader2 size={13} className="ai-spin" /> Saving...</>
                                      ) : (
                                        <><ShieldCheck size={13} /> Authorize & Save</>
                                      )}
                                    </button>
                                    <button
                                      className="ai-btn-cancel"
                                      onClick={() => handleCancelAction(index, msg.action)}
                                    >
                                      <X size={13} /> Reject
                                    </button>
                                  </div>
                                )}

                                {msg.action.status === 'executed' && (
                                  <div className="ai-action-result executed">
                                    <CheckCircle size={14} color="#16a34a" />
                                    <span>Confirmed & Saved to Database</span>
                                  </div>
                                )}

                                {msg.action.status === 'cancelled' && (
                                  <div className="ai-action-result cancelled">
                                    <XCircle size={14} color="#dc2626" />
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
                    <div className="quick-msg-row ai">
                      <div className="quick-ai-avatar">
                        <Sparkles size={16} color="#1a73e8" className="ai-spin" />
                      </div>
                      <div className="quick-msg-bubble ai loading">
                        <Loader2 size={14} className="ai-spin" />
                        <span>Gemini is generating...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* BOTTOM SEARCH CAPSULE WITH MODEL DROPDOWN (Matching Image 1 + Requirement) */}
            <div className="quick-firebase-bottom">
              <div className="quick-search-capsule">
                <input
                  ref={inputRef}
                  type="text"
                  className="quick-search-input"
                  placeholder={isRecording ? "Listening to your voice..." : "Ask Gemini"}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                />

                {/* Model Selector Dropdown Chip on Search Bar */}
                <div className="quick-model-chip-wrapper">
                  <button
                    type="button"
                    className="quick-model-chip-btn"
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    title="Change active Google Gemini model"
                  >
                    <span>{getModelShortLabel(selectedModel)}</span>
                    <ChevronDown size={14} />
                  </button>

                  {showModelDropdown && (
                    <div className="quick-model-dropdown-menu">
                      {AVAILABLE_MODELS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className={`quick-model-menu-item ${selectedModel === m.id ? 'active' : ''}`}
                          onClick={() => handleModelSelect(m.id)}
                        >
                          <span className="item-name">{m.name.split(' (')[0]}</span>
                          <span className="item-badge">{m.badge}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mic Voice Dictation */}
                <button
                  type="button"
                  className={`quick-mic-btn ${isRecording ? 'recording' : ''}`}
                  onClick={toggleRecording}
                  title={isRecording ? "Stop dictation" : "Voice input"}
                >
                  {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                {/* Send Button */}
                <button
                  type="button"
                  className={`quick-send-btn ${input.trim() ? 'active' : ''}`}
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim()}
                  aria-label="Send message"
                >
                  <Send size={15} />
                </button>
              </div>

              {/* Disclaimer Matching Image 1 */}
              <div className="quick-disclaimer">
                <span>Gemini can make mistakes, so double-check it</span>
                <HelpCircle size={13} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Trigger Launcher */}
      <button
        className={`ai-toggle-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Gemini in Firebase Assistant"
        title="Gemini in Firebase"
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </button>

      {/* Google Gemini Connection Modal */}
      <GeminiConnectModal
        isOpen={isGeminiModalOpen}
        onClose={() => setIsGeminiModalOpen(false)}
      />
    </div>
  );
};

export default AIAssistant;

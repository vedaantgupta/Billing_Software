import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/hooks/useAuth';
import { API_BASE_URL } from '@/config/api';
import { getItems } from '@/utils/db';
import { aiChatStore } from '@/utils/aiChatStore';
import AntigravityAskingModal from '@/components/ui/AntigravityAskingModal';
import '@/styles/AntigravityAI.css';
import {
  Sparkles, Send, Plus, ArrowRight, ShieldCheck,
  CheckCircle2, XCircle, Loader2, Volume2, VolumeX,
  Mic, MicOff, Copy, Check, Sun, Moon, Trash2,
  FileText, MessageSquare, Minimize2
} from 'lucide-react';

const AIPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Theme State (default light)
  const [theme, setTheme] = useState(() => aiChatStore.getTheme());

  // Session State
  const [sessions, setSessions] = useState(() => aiChatStore.getSessions());
  const [activeSessionId, setActiveSessionId] = useState(() => aiChatStore.getActiveSessionId());
  const [messages, setMessages] = useState(() => {
    const active = aiChatStore.getActiveSession();
    return active?.messages || [];
  });

  // Input & Execution State
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [executingActionId, setExecutingActionId] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Voice State (Speech-to-Text & Text-to-Speech)
  const [isRecording, setIsRecording] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const recognitionRef = useRef(null);

  // Live Business Metrics
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    receivable: 0,
    lowStockCount: 0,
    activeProjects: 0
  });

  const messagesEndRef = useRef(null);

  // Quick prompt templates
  const promptTemplates = [
    { title: "Create Sale Invoice", prompt: "Create a sale invoice for 5 units of Laptop at 45000 each with 18% GST" },
    { title: "Add Inventory Item", prompt: "Add a new product: Wireless Mouse, cost 350, selling 650, stock 100" },
    { title: "Check Low Stock Items", prompt: "What products are currently running low on stock?" },
    { title: "Explain GST Input Tax Credit", prompt: "Explain how GST Input Tax Credit works and how I can claim it" },
    { title: "Create New Project", prompt: "Create a new project: ERP Website Redesign with budget 200000" },
    { title: "Record Daily Expense", prompt: "Record an expense of 1500 for Office Tea & Snacks paid via UPI" }
  ];

  // Theme toggle
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    aiChatStore.setTheme(nextTheme);
  };

  // Sync messages to store
  useEffect(() => {
    if (messages.length > 0) {
      aiChatStore.saveMessages(messages);
      setSessions(aiChatStore.getSessions());
    }
  }, [messages]);

  // Listen to store updates
  useEffect(() => {
    const handleUpdate = () => {
      const active = aiChatStore.getActiveSession();
      if (active) {
        setMessages(active.messages || []);
        setActiveSessionId(active.id);
      }
      setSessions(aiChatStore.getSessions());
    };

    const handleTheme = (e) => {
      setTheme(e.detail);
    };

    window.addEventListener('ai-messages-updated', handleUpdate);
    window.addEventListener('ai-session-change', handleUpdate);
    window.addEventListener('ai-theme-change', handleTheme);

    return () => {
      window.removeEventListener('ai-messages-updated', handleUpdate);
      window.removeEventListener('ai-session-change', handleUpdate);
      window.removeEventListener('ai-theme-change', handleTheme);
    };
  }, []);

  // Load metrics
  useEffect(() => {
    async function loadMetrics() {
      if (!user?.id) return;
      try {
        const [docs, prods, projs] = await Promise.all([
          getItems('documents', user.id).catch(() => []),
          getItems('products', user.id).catch(() => []),
          getItems('projects', user.id).catch(() => [])
        ]);

        const salesTotal = (docs || [])
          .filter(d => d.docType === 'Sale Invoice' || d.type === 'Sale Invoice')
          .reduce((sum, d) => sum + Number(d.grandTotal || d.total || 0), 0);

        const lowStock = (prods || []).filter(p => {
          const stock = Number(p.stock || 0);
          const alert = Number(p.lowStockAlert || 5);
          return stock <= alert;
        }).length;

        const activePrj = (projs || []).filter(p => p.status !== 'Completed').length;

        setMetrics({
          totalSales: salesTotal,
          receivable: Math.round(salesTotal * 0.35),
          lowStockCount: lowStock,
          activeProjects: activePrj
        });
      } catch (err) {
        console.warn('Failed to load metrics:', err);
      }
    }
    loadMetrics();
  }, [user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, executingActionId]);

  // Voice Input: Speech-to-Text
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Speech recognition start failed:", e);
      setIsRecording(false);
    }
  };

  // Voice Output: Text-to-Speech (Hear)
  const handleSpeak = (text, index) => {
    if (!window.speechSynthesis) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown symbols for natural speaking
    const cleanText = text
      .replace(/[#*_`~]/g, '')
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

  // Copy text to clipboard
  const handleCopy = (text, index) => {
    navigator.clipboard?.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Active Pending Action
  const getLatestPendingAction = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].action && messages[i].action.status === 'pending') {
        return messages[i].action;
      }
    }
    return null;
  };

  const handleSend = async (overridePrompt = null) => {
    const textToSend = overridePrompt || input;
    if (!textToSend.trim() || isLoading) return;

    // Stop speaking if currently speaking
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeakingIndex(null);

    const userMessage = { role: 'user', content: textToSend };
    const pendingAction = getLatestPendingAction();
    const hasActiveQ = messages.some(m => m.question && m.question.status === 'active');

    // Dismiss active question when user responds
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
          userName: user?.name || user?.email || 'You',
          pendingAction,
          hasActiveQuestion: hasActiveQ
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
          { role: 'ai', content: data.message || 'Error communicating with AI assistant.' }
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

  // Action execution
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
          userName: user?.name || user?.email || 'You'
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

  const handleNewSession = () => {
    const newSess = aiChatStore.createNewSession();
    setActiveSessionId(newSess.id);
    setMessages(newSess.messages);
    setSessions(aiChatStore.getSessions());
  };

  const handleSwitchSession = (sessId) => {
    aiChatStore.setActiveSessionId(sessId);
    const target = aiChatStore.getSessions().find(s => s.id === sessId);
    if (target) {
      setActiveSessionId(sessId);
      setMessages(target.messages || []);
    }
  };

  const handleDeleteSession = (e, sessId) => {
    e.stopPropagation();
    const remaining = aiChatStore.deleteSession(sessId);
    setSessions(remaining);
    const current = aiChatStore.getActiveSession();
    setActiveSessionId(current.id);
    setMessages(current.messages || []);
  };

  return (
    <div className={`antigravity-page theme-${theme}`}>
      {/* Top Live Business Metrics Strip & Theme Toggle */}
      <div className="antigravity-kpi-bar">
        <div className="kpi-chips-track">
          <div className="kpi-chip">
            <div className="kpi-chip-dot green"></div>
            <span>Total Sales:</span>
            <span className="kpi-chip-val">₹{metrics.totalSales.toLocaleString()}</span>
          </div>
          <div className="kpi-chip">
            <div className="kpi-chip-dot amber"></div>
            <span>Receivables:</span>
            <span className="kpi-chip-val">₹{metrics.receivable.toLocaleString()}</span>
          </div>
          <div className="kpi-chip">
            <div className="kpi-chip-dot purple"></div>
            <span>Low Stock Alerts:</span>
            <span className="kpi-chip-val">{metrics.lowStockCount} items</span>
          </div>
          <div className="kpi-chip">
            <div className="kpi-chip-dot indigo"></div>
            <span>Active Projects:</span>
            <span className="kpi-chip-val">{metrics.activeProjects}</span>
          </div>
        </div>

        <div className="kpi-actions-right">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={() => navigate('/')}
            title="Switch back to Dashboard with Floating Quick Modal"
          >
            <Minimize2 size={14} />
            <span>Quick Modal View</span>
          </button>
          <button className="theme-toggle-btn" onClick={toggleTheme}>
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </div>
      </div>

      <div className="antigravity-main-container">
        {/* Left Sidebar: Session History & Prompts */}
        <div className="antigravity-sidebar">
          <button className="new-chat-btn" onClick={handleNewSession}>
            <Plus size={16} /> New Chat
          </button>

          <div className="sidebar-section-title">Chat History</div>
          <div className="sessions-history-list">
            {sessions.map(sess => (
              <div
                key={sess.id}
                className={`session-history-item ${sess.id === activeSessionId ? 'active' : ''}`}
                onClick={() => handleSwitchSession(sess.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <MessageSquare size={13} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sess.title}</span>
                </div>
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteSession(e, sess.id)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                    title="Delete session"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="sidebar-section-title" style={{ marginTop: 10 }}>Quick Action Prompts</div>
          <div className="template-prompts-list">
            {promptTemplates.map((tmpl, idx) => (
              <button
                key={idx}
                className="template-item-btn"
                onClick={() => handleSend(tmpl.prompt)}
              >
                <Sparkles size={13} style={{ color: '#6366f1', flexShrink: 0, marginTop: 2 }} />
                <span>{tmpl.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Center Canvas */}
        <div className="antigravity-chat-canvas">
          <div className="antigravity-messages-stream">
            {messages.map((msg, index) => (
              <div key={index} className={`agy-message-row ${msg.role}`}>
                <div className={`agy-avatar ${msg.role}`}>
                  {msg.role === 'ai' ? <Sparkles size={17} /> : (user?.name?.[0] || 'U')}
                </div>

                <div className={`agy-bubble ${msg.role}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                  </ReactMarkdown>

                  {/* Audio Hear & Copy Actions for AI Messages */}
                  {msg.role === 'ai' && typeof msg.content === 'string' && (
                    <div className="agy-msg-actions-bar">
                      <button
                        className={`agy-action-icon-btn ${speakingIndex === index ? 'speaking' : ''}`}
                        onClick={() => handleSpeak(msg.content, index)}
                        title={speakingIndex === index ? "Stop speaking" : "Listen to answer (Hear)"}
                      >
                        {speakingIndex === index ? <VolumeX size={13} /> : <Volume2 size={13} />}
                        <span>{speakingIndex === index ? "Stop" : "Hear"}</span>
                      </button>

                      <button
                        className="agy-action-icon-btn"
                        onClick={() => handleCopy(msg.content, index)}
                        title="Copy to clipboard"
                      >
                        {copiedIndex === index ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                        <span>{copiedIndex === index ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  )}

                  {/* Asking Clarification Modal Card */}
                  {msg.question && msg.question.status === 'active' && (
                    <AntigravityAskingModal
                      question={msg.question}
                      onSubmit={(answer) => handleSend(answer)}
                      onCancel={() => handleDismissQuestion(index)}
                    />
                  )}

                  {/* Action Permission Card */}
                  {msg.action && (
                    <div className="antigravity-action-card">
                      <div className="action-card-header">
                        <span className="action-perm-tag">
                          <ShieldCheck size={14} /> Permission Required
                        </span>
                        <span className="action-title-heading">{msg.action.label}</span>
                      </div>

                      {msg.action.data && (
                        <div className="action-preview-grid">
                          <div><span className="k-lbl">Type:</span> <span className="k-val">{msg.action.type}</span></div>
                          <div><span className="k-lbl">Date:</span> <span className="k-val">{msg.action.data.date || new Date().toISOString().split('T')[0]}</span></div>
                          <div><span className="k-lbl">Target:</span> <span className="k-val">{msg.action.data.customerName || msg.action.data.name || 'Record'}</span></div>
                          <div><span className="k-lbl">Amount / Budget:</span> <span className="k-val highlight">₹{Number(msg.action.data.grandTotal || msg.action.data.total || msg.action.data.budget || msg.action.data.sellingPrice || msg.action.data.amount || 0).toLocaleString()}</span></div>
                        </div>
                      )}

                      {msg.action.status === 'pending' && (
                        <div className="action-btn-row">
                          <button
                            className="agy-btn-approve"
                            onClick={() => handleExecuteAction(index, msg.action)}
                            disabled={executingActionId === msg.action.actionId}
                          >
                            {executingActionId === msg.action.actionId ? (
                              <><Loader2 size={16} className="agy-spin" /> Authorizing & Saving...</>
                            ) : (
                              <><ShieldCheck size={16} /> Authorize & Save to DB</>
                            )}
                          </button>
                          <button
                            className="agy-btn-reject"
                            onClick={() => handleCancelAction(index, msg.action)}
                            disabled={executingActionId === msg.action.actionId}
                          >
                            I don't want to create this
                          </button>
                        </div>
                      )}

                      {msg.action.status === 'executed' && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={16} /> Successfully Executed & Saved</span>
                          {msg.action.route && (
                            <button
                              onClick={() => navigate(msg.action.route)}
                              style={{ background: 'transparent', border: '1px solid #10b981', color: '#10b981', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              Open in module <ArrowRight size={14} />
                            </button>
                          )}
                        </div>
                      )}

                      {msg.action.status === 'cancelled' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f43f5e', fontSize: '0.85rem' }}>
                          <XCircle size={16} /> Cancelled by user. No database modifications made.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="agy-message-row ai">
                <div className="agy-avatar ai"><Sparkles size={17} /></div>
                <div className="agy-bubble ai" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6366f1', fontStyle: 'italic' }}>
                  <Loader2 size={16} className="agy-spin" />
                  Business AI is thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Prompt Capsule with Voice Dictation */}
          <div className="antigravity-input-bar-container">
            <div className="antigravity-input-capsule">
              <input
                type="text"
                className="antigravity-input-field"
                placeholder={isRecording ? "Listening to your voice..." : "Ask questions or command actions (e.g. 'creat invois for Sharma Traders', 'Explain GST ITC')..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={isLoading}
              />

              {/* Mic Voice Dictation Button */}
              <button
                className={`agy-mic-btn ${isRecording ? 'recording' : ''}`}
                onClick={toggleRecording}
                type="button"
                title={isRecording ? "Stop listening" : "Speak your message"}
              >
                {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <button
                className="agy-send-action-btn"
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </div>

            <div className="antigravity-footer-meta">
              <span>Business AI Copilot • Enterprise Autonomous Assistant</span>
              <span className="agy-model-badge">
                <Sparkles size={12} /> Meta Llama 3.3 70B • Hugging Face
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPage;

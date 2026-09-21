import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '@/features/dashboard/styles/AIAssistant.css';
import '@/styles/AntigravityAI.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/hooks/useAuth';
import { API_BASE_URL } from '@/config/api';
import { aiChatStore } from '@/utils/aiChatStore';
import AntigravityAskingModal from '@/components/ui/AntigravityAskingModal';
import {
  Sparkles, Maximize2, Send, Mic, MicOff, Volume2, VolumeX,
  Copy, Check, Sun, Moon, X, ShieldAlert, ShieldCheck,
  CheckCircle, XCircle, Loader2, ArrowRight,
  FileText, Package, UserCheck, Users, Briefcase, DollarSign, BookOpen
} from 'lucide-react';

const AIAssistant = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Floating window visibility
  const [isOpen, setIsOpen] = useState(false);

  // Theme synced with aiChatStore
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

  // Voice State (Speech-to-Text & Text-to-Speech)
  const [isRecording, setIsRecording] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  const quickActions = [
    "Check today's sales & revenue",
    "What items are low on stock?",
    "Create invoice for Sharma Traders ₹15,000",
    "Add new product Wireless Mouse selling 650",
    "Create a new ERP project"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, executingActionId, isOpen]);

  // Sync messages to aiChatStore whenever messages update
  useEffect(() => {
    if (messages.length > 0) {
      aiChatStore.saveMessages(messages, 'modal');
    }
  }, [messages]);

  // Listen to external store updates (e.g. from AIPage or other tabs)
  useEffect(() => {
    const handleMessagesUpdate = (e) => {
      if (e.detail?.source === 'modal') return;
      const active = aiChatStore.getActiveSession();
      if (active && active.messages) {
        setMessages(active.messages);
      }
    };

    const handleSessionChange = () => {
      const active = aiChatStore.getActiveSession();
      if (active && active.messages) {
        setMessages(active.messages);
      }
    };

    const handleThemeChange = (e) => {
      if (e.detail) setTheme(e.detail);
    };

    window.addEventListener('ai-messages-updated', handleMessagesUpdate);
    window.addEventListener('ai-session-change', handleSessionChange);
    window.addEventListener('ai-theme-change', handleThemeChange);

    return () => {
      window.removeEventListener('ai-messages-updated', handleMessagesUpdate);
      window.removeEventListener('ai-session-change', handleSessionChange);
      window.removeEventListener('ai-theme-change', handleThemeChange);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    aiChatStore.setTheme(nextTheme);
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
      alert("Voice speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
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
          setInput(prev => (prev ? (prev + ' ' + transcript) : transcript));
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => setIsRecording(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Speech recognition start failed:", e);
      setIsRecording(false);
    }
  };

  // Voice Output: Text-to-Speech ("Hear")
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

  // Copy text to clipboard
  const handleCopy = (text, index) => {
    navigator.clipboard?.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Find most recent pending action across messages
  const getLatestPendingAction = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].action && messages[i].action.status === 'pending') {
        return messages[i].action;
      }
    }
    return null;
  };

  const handleSend = async (directInput = null) => {
    const textToSend = directInput || input;
    if (!textToSend.trim() || isLoading) return;

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
      const response = await fetch(API_BASE_URL + '/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: textToSend,
          history: messages,
          userId: user?.id,
          userName: user?.name || user?.email || 'You',
          pendingAction,
          hasActiveQuestion: hasActiveQ
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
          { role: 'ai', content: data.message || 'Sorry, I encountered an error communicating with AI. Please try again.' }
        ]);
      }
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'ai', content: 'Connection error. Make sure the backend server is running.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle explicit UI button confirmation
  const handleExecuteAction = async (msgIndex, action) => {
    if (!action || executingActionId) return;
    setExecutingActionId(action.actionId);

    try {
      const res = await fetch(API_BASE_URL + '/ai/action/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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
      console.error('Execution error:', err);
      alert('Network error while executing action.');
    } finally {
      setExecutingActionId(null);
    }
  };

  // Handle explicit UI cancellation
  const handleCancelAction = (msgIndex, action) => {
    setMessages(prev => {
      const updated = [...prev];
      updated[msgIndex] = {
        ...updated[msgIndex],
        action: {
          ...action,
          status: 'cancelled'
        }
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const getActionIcon = (type) => {
    switch (type) {
      case 'create_document': return <FileText size={17} className="ai-badge-icon doc" />;
      case 'create_product': return <Package size={17} className="ai-badge-icon prod" />;
      case 'create_contact': return <UserCheck size={17} className="ai-badge-icon contact" />;
      case 'create_staff': return <Users size={17} className="ai-badge-icon staff" />;
      case 'create_project':
      case 'create_project_task': return <Briefcase size={17} className="ai-badge-icon proj" />;
      case 'create_expense': return <DollarSign size={17} className="ai-badge-icon exp" />;
      case 'create_ledger_entry': return <BookOpen size={17} className="ai-badge-icon ledger" />;
      default: return <Sparkles size={17} className="ai-badge-icon default" />;
    }
  };

  const renderActionCard = (msg, index) => {
    const { action } = msg;
    if (!action) return null;

    const data = action.data || {};
    const isPending = action.status === 'pending';
    const isExecuted = action.status === 'executed';
    const isCancelled = action.status === 'cancelled';
    const isCurrentExecuting = executingActionId === action.actionId;

    return (
      <div className={'ai-action-card ' + action.status}>
        <div className="ai-action-card-header">
          <div className="ai-action-type-tag">
            {getActionIcon(action.type)}
            <span>{action.label || 'Action Proposed'}</span>
          </div>
          {isPending && (
            <span className="ai-perm-badge">
              <ShieldAlert size={12} /> Needs Permission
            </span>
          )}
        </div>

        {/* Highlight details preview */}
        <div className="ai-action-details-box">
          {action.type === 'create_document' && (
            <div className="ai-action-kv-grid">
              <div><span className="kv-lbl">Doc Type:</span> <b>{data.docType || 'Sale Invoice'}</b></div>
              <div><span className="kv-lbl">Customer:</span> <b>{data.customerName || 'Customer'}</b></div>
              <div><span className="kv-lbl">Date:</span> <b>{data.date}</b></div>
              <div><span className="kv-lbl">Items:</span> <b>{data.items?.length || 0} items</b></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span className="kv-lbl">Total:</span> <b className="kv-total">₹{Number(data.grandTotal || data.total || 0).toLocaleString()}</b>
              </div>
            </div>
          )}

          {action.type === 'create_product' && (
            <div className="ai-action-kv-grid">
              <div><span className="kv-lbl">Product:</span> <b>{data.name}</b></div>
              <div><span className="kv-lbl">Selling:</span> <b>₹{Number(data.sellingPrice || 0).toLocaleString()}</b></div>
              <div><span className="kv-lbl">Stock:</span> <b>{data.stock} {data.unit || 'PCS'}</b></div>
              <div><span className="kv-lbl">GST:</span> <b>{data.tax}%</b></div>
            </div>
          )}

          {action.type === 'create_contact' && (
            <div className="ai-action-kv-grid">
              <div><span className="kv-lbl">Contact:</span> <b>{data.name || data.companyName}</b></div>
              <div><span className="kv-lbl">Phone:</span> <b>{data.phone || 'N/A'}</b></div>
              <div><span className="kv-lbl">Type:</span> <b style={{ textTransform: 'capitalize' }}>{data.type || 'Customer'}</b></div>
              <div><span className="kv-lbl">GSTIN:</span> <b>{data.gstin || 'N/A'}</b></div>
            </div>
          )}

          {action.type === 'create_staff' && (
            <div className="ai-action-kv-grid">
              <div><span className="kv-lbl">Staff:</span> <b>{data.name || (data.firstName + ' ' + data.lastName)}</b></div>
              <div><span className="kv-lbl">Role:</span> <b>{data.role}</b></div>
              <div><span className="kv-lbl">Salary:</span> <b>₹{Number(data.salary || 0).toLocaleString()}</b></div>
              <div><span className="kv-lbl">Status:</span> <b>{data.status || 'Active'}</b></div>
            </div>
          )}

          {action.type === 'create_project' && (
            <div className="ai-action-kv-grid">
              <div><span className="kv-lbl">Project:</span> <b>{data.name}</b></div>
              <div><span className="kv-lbl">Budget:</span> <b>₹{Number(data.budget || 0).toLocaleString()}</b></div>
              <div><span className="kv-lbl">Priority:</span> <b>{data.priority || 'Medium'}</b></div>
              <div><span className="kv-lbl">Status:</span> <b>{data.status || 'Planned'}</b></div>
            </div>
          )}

          {action.type === 'create_expense' && (
            <div className="ai-action-kv-grid">
              <div><span className="kv-lbl">Category:</span> <b>{data.category}</b></div>
              <div><span className="kv-lbl">Amount:</span> <b className="kv-total">₹{Number(data.amount || 0).toLocaleString()}</b></div>
              <div><span className="kv-lbl">Mode:</span> <b>{data.paymentMode || 'Cash'}</b></div>
              <div><span className="kv-lbl">Date:</span> <b>{data.date}</b></div>
            </div>
          )}
        </div>

        {/* Buttons */}
        {isPending && (
          <div className="ai-action-actions">
            <button
              className="ai-btn-confirm"
              onClick={() => handleExecuteAction(index, action)}
              disabled={isCurrentExecuting}
            >
              {isCurrentExecuting ? (
                <>
                  <Loader2 size={14} className="ai-spin" /> Executing...
                </>
              ) : (
                <>
                  <ShieldCheck size={14} /> Authorize & Save
                </>
              )}
            </button>
            <button
              className="ai-btn-cancel"
              onClick={() => handleCancelAction(index, action)}
              disabled={isCurrentExecuting}
              title="Reject this action"
            >
              <X size={14} /> I don't want this
            </button>
          </div>
        )}

        {isExecuted && (
          <div className="ai-action-result executed">
            <div className="ai-result-label">
              <CheckCircle size={15} color="#10b981" />
              <span>Confirmed & Executed to DB</span>
            </div>
            {action.route && (
              <button
                className="ai-view-link-btn"
                onClick={() => navigate(action.route)}
                title="Navigate to module directly"
              >
                Open in module <ArrowRight size={13} />
              </button>
            )}
          </div>
        )}

        {isCancelled && (
          <div className="ai-action-result cancelled">
            <XCircle size={15} color="#ef4444" />
            <span>Cancelled by user</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="ai-assistant-container">
      {isOpen && (
        <div className={'ai-chat-window theme-' + theme}>
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-header-brand">
              <div className="ai-status-dot"></div>
              <div className="ai-header-titles">
                <span className="ai-title-text">Business AI Copilot</span>
                <span className="ai-hf-badge">Llama 3.3 70B</span>
              </div>
            </div>

            <div className="ai-header-controls">
              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="ai-icon-tool-btn"
                title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
              </button>

              {/* Open Full Page Workspace */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/ai');
                }}
                className="ai-icon-tool-btn"
                title="Expand to Full Page AI Command Center"
              >
                <Maximize2 size={15} />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="ai-close-btn"
                aria-label="Close Assistant"
              >
                &times;
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="ai-chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={'message ' + msg.role}>
                {msg.role === 'ai' ? (
                  <>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                    </ReactMarkdown>

                    {/* AI Message Action Bar (Hear & Copy) */}
                    <div className="ai-msg-actions">
                      <button
                        type="button"
                        className={'ai-msg-btn ' + (speakingIndex === index ? 'speaking' : '')}
                        onClick={() => handleSpeak(msg.content, index)}
                        title={speakingIndex === index ? "Stop speaking" : "Listen to answer (Hear)"}
                      >
                        {speakingIndex === index ? <VolumeX size={12} /> : <Volume2 size={12} />}
                        <span>{speakingIndex === index ? "Stop" : "Hear"}</span>
                      </button>

                      <button
                        type="button"
                        className="ai-msg-btn"
                        onClick={() => handleCopy(msg.content, index)}
                        title="Copy text"
                      >
                        {copiedIndex === index ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
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
                    {msg.action && renderActionCard(msg, index)}
                  </>
                ) : (
                  msg.content
                )}
              </div>
            ))}

            {!isLoading && messages.length <= 1 && (
              <div className="quick-actions">
                <div className="quick-actions-title">Try asking or commanding:</div>
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(action)}
                    className="action-chip"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}

            {isLoading && (
              <div className="ai-typing">
                <Loader2 size={13} className="ai-spin" /> Thinking with Llama 3.3 70B...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area with Voice Dictation */}
          <div className="ai-chat-input-area">
            <input
              type="text"
              placeholder={isRecording ? "Listening to your voice..." : "Ask questions or command actions (e.g. create invoice)..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />

            {/* Voice Dictation (Mic) Button */}
            <button
              type="button"
              className={'ai-mic-btn ' + (isRecording ? 'recording' : '')}
              onClick={toggleRecording}
              title={isRecording ? "Stop listening" : "Dictate via voice"}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            {/* Send Button */}
            <button
              type="button"
              className="ai-send-btn"
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Launcher Trigger */}
      <button
        className={'ai-toggle-btn ' + (isOpen ? 'active' : '')}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Business AI Copilot"
        title="Business AI Copilot"
      >
        {isOpen ? '✕' : <Sparkles size={24} />}
      </button>
    </div>
  );
};

export default AIAssistant;

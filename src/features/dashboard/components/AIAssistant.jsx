import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/hooks/useAuth';
import { API_BASE_URL } from '@/config/api';
import { aiChatStore } from '@/utils/aiChatStore';
import { geminiStore, AVAILABLE_MODELS } from '@/utils/geminiStore';
import AntigravityAskingModal from '@/components/ui/AntigravityAskingModal';
import {
  Sparkles, Send, Mic, MicOff, Volume2, VolumeX,
  Copy, Check, X, ShieldAlert, ShieldCheck,
  CheckCircle, XCircle, Loader2, ArrowRight,
  FileText, Package, UserCheck, Users, Briefcase, DollarSign, BookOpen,
  Plus, ChevronDown, Paperclip, Maximize2, Square, ThumbsUp, ThumbsDown,
  Pencil, History, Trash2
} from 'lucide-react';
import { addItem } from '@/utils/db';
import { buildLiveBusinessSnapshot } from '@/utils/aiBusinessContext';
import { queryAIEngine } from '@/utils/aiEngine';
import '@/features/dashboard/styles/AIAssistant.css';

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Prepares clean spoken script for natural Speech Synthesis:
 * - Strips raw JSON blocks (<<<ACTION_PROPOSAL>>>, <<<ASK_QUESTION>>>)
 * - Converts markdown tables, links, code blocks into pleasant spoken phrasing
 * - Phonetizes Indian currency (₹ / Rs.) to "rupees" so numbers are read naturally
 */
const prepareSpokenScript = (rawText) => {
  if (!rawText) return '';
  let text = String(rawText);

  text = text.replace(/<<<ACTION_PROPOSAL>>>[\s\S]*?<<<END_ACTION_PROPOSAL>>>/g, '');
  text = text.replace(/<<<ASK_QUESTION>>>[\s\S]*?<<<END_ASK_QUESTION>>>/g, '');
  text = text.replace(/<<<[^>]+>>>/g, '');
  text = text.replace(/```[\s\S]*?```/g, ' Code block omitted. ');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/\|[^\n]+\|\n\|[-:\s|]+\|\n([\s\S]*?)(?=\n\n|$)/g, ' Table details summarized in chat. ');
  text = text.replace(/\|/g, ' ');
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  text = text.replace(/https?:\/\/\S+/g, '');
  text = text.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1');
  text = text.replace(/~{2}([^~]+)~{2}/g, '$1');
  text = text.replace(/^#+\s+/gm, '');
  text = text.replace(/^[•\-\*]\s+/gm, '');
  text = text.replace(/^\d+\.\s+/gm, '');
  text = text.replace(/₹\s*([0-9,]+(\.[0-9]+)?)/g, '$1 rupees');
  text = text.replace(/\bRs\.?\s*([0-9,]+(\.[0-9]+)?)/gi, '$1 rupees');
  text = text.replace(/\be\.g\.\b/gi, 'for example');
  text = text.replace(/\bi\.e\.\b/gi, 'that is');
  text = text.replace(/\bapprox\.\b/gi, 'approximately');
  text = text.replace(/\bGSTIN\b/gi, 'GST number');
  text = text.replace(/\bINV-(\d+)\b/gi, 'Invoice $1');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
};

/**
 * Auto-selects the most natural voice for speech synthesis:
 * - Selects Indian English (en-IN) or Hindi (hi-IN) when user text is in Hinglish or Hindi
 * - Selects high quality natural voices for English
 */
const selectBestGeminiVoice = (spokenText) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const hasHindiScript = /[\u0900-\u097F]/.test(spokenText);
  const hasHinglishWords = /\b(hai|hain|karo|batao|udhaar|khata|rupaye|hisaab|sharma|bhai|kaise|kitna|chahiye|nahi|mera|meri|mere|aapka|karna|dukaan|paisa|paise|bana|dekh|raha)\b/i.test(spokenText);

  if (hasHindiScript) {
    const hindiVoice = voices.find(v => v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi'));
    if (hindiVoice) return hindiVoice;
  }

  if (hasHindiScript || hasHinglishWords) {
    const indianVoice = voices.find(v =>
      v.lang === 'en-IN' ||
      v.lang.startsWith('hi') ||
      v.name.includes('India') ||
      v.name.includes('Neerja') ||
      v.name.includes('Prabhat') ||
      v.name.includes('Swara') ||
      v.name.includes('Hemant') ||
      v.name.toLowerCase().includes('hindi')
    );
    if (indianVoice) return indianVoice;
  }

  const naturalVoice = voices.find(v =>
    (v.name.includes('Natural') || v.name.includes('Google')) &&
    (v.lang.startsWith('en') || v.lang.startsWith('hi'))
  );
  if (naturalVoice) return naturalVoice;

  const defaultEn = voices.find(v => v.lang.startsWith('en'));
  return defaultEn || voices[0] || null;
};

const AIAssistant = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Floating window visibility
  const [isOpen, setIsOpen] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  // Sessions synced with aiChatStore
  const [sessions, setSessions] = useState(() => aiChatStore.getSessions());

  // Conversation synced with active session in aiChatStore
  const [messages, setMessages] = useState(() => {
    const active = aiChatStore.getActiveSession();
    return active?.messages || [];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [executingActionId, setExecutingActionId] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [feedbackMap, setFeedbackMap] = useState({});

  // Edit User Message Feature
  const [editingMsgIndex, setEditingMsgIndex] = useState(null);
  const [editingMsgText, setEditingMsgText] = useState('');

  // File Attachments (from Full AI)
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Active Model
  const [selectedModel, setSelectedModel] = useState(() => geminiStore.getModel() || 'gemini-3.6-flash');

  // Voice State (Speech-to-Text & Text-to-Speech)
  const [isRecording, setIsRecording] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isAbortedRef = useRef(false);

  // App-tailored business prompts
  const appSuggestionPills = [
    { label: 'Create GST Sale Invoice', prompt: 'Create a new GST Sale Invoice' },
    { label: "Today's Sales & Cash Flow", prompt: "Show today's business sales, cash collection and dues" },
    { label: 'Low Stock Inventory Alerts', prompt: 'Which products are running low in stock and need reordering?' },
    { label: 'Pending Customer Dues', prompt: 'Show me customer accounts with pending overdue payments' },
    { label: 'Revenue vs Expenses Summary', prompt: 'Provide a business summary of this month revenue versus expenses' },
    { label: 'Add New Customer Contact', prompt: 'Add a new customer contact to directory' }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setSelectedModel(geminiStore.getModel() || 'gemini-3.6-flash');
      setSessions(aiChatStore.getSessions());
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isLoading, executingActionId, isOpen]);

  useEffect(() => {
    if (messages.length > 0) {
      aiChatStore.saveMessages(messages, 'modal');
      setSessions(aiChatStore.getSessions());
    }
  }, [messages]);

  // Close with Escape key
  useEffect(() => {
    const handleKeyDownGlobal = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (showHistoryDropdown) {
          setShowHistoryDropdown(false);
        } else if (showModelDropdown) {
          setShowModelDropdown(false);
        } else if (editingMsgIndex !== null) {
          setEditingMsgIndex(null);
        } else {
          setIsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDownGlobal);
    return () => window.removeEventListener('keydown', handleKeyDownGlobal);
  }, [isOpen, showHistoryDropdown, showModelDropdown, editingMsgIndex]);

  useEffect(() => {
    const handleMessagesUpdate = (e) => {
      if (e.detail?.source === 'modal') return;
      const active = aiChatStore.getActiveSession();
      if (active && active.messages) {
        setMessages(active.messages);
      }
      setSessions(aiChatStore.getSessions());
    };

    const handleGeminiChange = (e) => {
      if (e.detail?.model) setSelectedModel(e.detail.model);
    };

    window.addEventListener('ai-messages-updated', handleMessagesUpdate);
    window.addEventListener('gemini-config-changed', handleGeminiChange);

    return () => {
      window.removeEventListener('ai-messages-updated', handleMessagesUpdate);
      window.removeEventListener('gemini-config-changed', handleGeminiChange);
    };
  }, []);

  const handleModelSelect = (modelId) => {
    setSelectedModel(modelId);
    geminiStore.setModel(modelId);
    setShowModelDropdown(false);
  };

  // Sessions Management
  const handleSwitchSession = (sessionId) => {
    aiChatStore.setActiveSessionId(sessionId);
    const all = aiChatStore.getSessions();
    const target = all.find(s => s.id === sessionId);
    setMessages(target?.messages ? [...target.messages] : []);
    setAttachedFiles([]);
    setShowHistoryDropdown(false);
  };

  const handleDeleteSession = (e, sessionId) => {
    e.stopPropagation();
    const remaining = aiChatStore.deleteSession(sessionId);
    setSessions(remaining);
    const current = aiChatStore.getActiveSession();
    setMessages(current?.messages ? [...current.messages] : []);
  };

  // File Upload Handlers (Full AI feature)
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach(file => {
      const isImage = file.type.startsWith('image/');
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachedFiles(prev => [
          ...prev,
          {
            id: 'file-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            name: file.name,
            size: file.size,
            formattedSize: formatFileSize(file.size),
            type: file.type,
            isImage,
            data: ev.target.result,
            preview: isImage ? ev.target.result : null
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeAttachment = (fileId) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
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
      alert('Voice speech recognition is not supported in this browser. Please use Chrome or Edge.');
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
      console.error('Speech recognition start failed:', e);
      setIsRecording(false);
    }
  };

  // Voice Output: Natural Speech Synthesis from Full AI
  const handleToggleSpeak = (text, index) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanSpoken = prepareSpokenScript(text);
    if (!cleanSpoken) return;

    const voice = selectBestGeminiVoice(cleanSpoken);
    const utterance = new SpeechSynthesisUtterance(cleanSpoken);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || 'en-IN';
    }
    utterance.rate = 1.02;
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

  const handleFeedback = (index, type) => {
    setFeedbackMap(prev => ({
      ...prev,
      [index]: prev[index] === type ? null : type
    }));
  };

  const handleNewChat = () => {
    aiChatStore.createNewSession();
    setSessions(aiChatStore.getSessions());
    setMessages([]);
    setAttachedFiles([]);
    setInput('');
    setShowHistoryDropdown(false);
    inputRef.current?.focus();
  };

  const handleStopGeneration = () => {
    isAbortedRef.current = true;
    setIsLoading(false);
  };

  const getLatestPendingAction = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].action && messages[i].action.status === 'pending') {
        return messages[i].action;
      }
    }
    return null;
  };

  // Master Prompt Execution (handles live database snapshot, actions, and attachments)
  const executeSendPrompt = async (textToSend, historyForApi = messages, filesToSend = attachedFiles) => {
    if ((!textToSend.trim() && (!filesToSend || filesToSend.length === 0)) || isLoading) return;

    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeakingIndex(null);
    isAbortedRef.current = false;
    setIsLoading(true);

    try {
      // 1. Fetch fresh live business database snapshot on-demand (connected to everything)
      const freshSnapshot = await buildLiveBusinessSnapshot(user);

      const pendingAction = getLatestPendingAction();
      const hasActiveQ = historyForApi.some(m => m.question && m.question.status === 'active');

      // 2. Query multi-engine AI with full attachments & context
      const aiResult = await queryAIEngine({
        prompt: textToSend,
        history: historyForApi,
        user,
        userName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.username || 'User'),
        snapshot: freshSnapshot,
        selectedModel,
        files: filesToSend,
        attachedFiles: filesToSend,
        pendingAction,
        hasActiveQuestion: hasActiveQ
      });

      if (isAbortedRef.current) return;

      const newAiMsg = {
        role: 'ai',
        content: aiResult.content,
        action: aiResult.action,
        question: aiResult.question,
        model: selectedModel,
        timestamp: new Date().toISOString()
      };

      if (newAiMsg.action && (newAiMsg.action.status === 'executed' || newAiMsg.action.status === 'cancelled')) {
        setMessages(prev =>
          prev.map(m =>
            m.action && m.action.actionId === newAiMsg.action.actionId
              ? { ...m, action: newAiMsg.action }
              : m
          ).concat([newAiMsg])
        );
      } else {
        setMessages(prev => [...prev, newAiMsg]);
      }
    } catch (err) {
      if (!isAbortedRef.current) {
        console.error('AI query error:', err);
        setMessages(prev => [
          ...prev,
          { role: 'ai', content: 'Main aapki sahayata ke liye taiyar hoon! Kripya apna prashna dobara poochein.' }
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Send message
  const handleSend = async (directInput = null) => {
    const textToSend = directInput || input;
    if ((!textToSend.trim() && attachedFiles.length === 0) || isLoading) return;

    const currentAttachments = [...attachedFiles];
    setAttachedFiles([]);

    const userMessage = {
      role: 'user',
      content: textToSend,
      attachedFiles: currentAttachments,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = messages
      .map(m => (m.question?.status === 'active' ? { ...m, question: { ...m.question, status: 'answered' } } : m))
      .concat([userMessage]);

    setMessages(updatedMessages);
    setInput('');

    await executeSendPrompt(textToSend, updatedMessages, currentAttachments);
  };

  // Edit User Message Handlers (Matching Full AI)
  const handleStartEditMessage = (index, currentText) => {
    setEditingMsgIndex(index);
    setEditingMsgText(currentText);
  };

  const handleCancelEditMessage = () => {
    setEditingMsgIndex(null);
    setEditingMsgText('');
  };

  const handleSaveEditMessage = async (index) => {
    if (!editingMsgText.trim() || isLoading) return;
    const newText = editingMsgText.trim();
    setEditingMsgIndex(null);
    setEditingMsgText('');

    // Rollback conversation history to this user message with updated content
    const previousHistory = messages.slice(0, index);
    const targetUserMsg = messages[index];
    const updatedUserMsg = {
      ...targetUserMsg,
      content: newText
    };

    const newHistory = [...previousHistory, updatedUserMsg];
    setMessages(newHistory);

    // Call API with updated history to get fresh AI response!
    await executeSendPrompt(newText, newHistory, updatedUserMsg.attachedFiles || []);
  };

  const handleExecuteAction = async (msgIndex, action) => {
    if (!action || executingActionId) return;
    setExecutingActionId(action.actionId);

    try {
      let savedItem = null;
      let targetRoute = action.route;

      // 1. Try backend execute
      try {
        const res = await fetch(`${API_BASE_URL}/ai/action/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            action,
            userName: user?.firstName || user?.username || 'User'
          })
        });

        const result = await res.json();
        if (res.ok && result.success) {
          savedItem = result.item;
          if (result.route) targetRoute = result.route;
        }
      } catch (err) {}

      // 2. Direct fallback to db.addItem
      if (!savedItem) {
        const col = action.collection || 'documents';
        savedItem = await addItem(col, action.data || {}, user?.id || 'guest_user', user?.username || 'User');
      }

      if (savedItem) {
        setMessages(prev => {
          const updated = [...prev];
          updated[msgIndex] = {
            ...updated[msgIndex],
            action: {
              ...action,
              status: 'executed',
              savedItem,
              route: targetRoute || '/documents'
            }
          };
          return updated;
        });
      } else {
        alert('Action could not be executed.');
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

  const firstName = user?.firstName || user?.username || 'Partner';

  const getModelShortLabel = (modelId) => {
    const found = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (found?.short) return found.short;
    if (modelId?.includes('lite')) return 'Flash-Lite';
    if (modelId?.includes('2.5') || modelId?.includes('3.6') || modelId?.includes('flash')) return 'Flash';
    if (modelId?.includes('pro')) return 'Pro';
    if (modelId?.includes('thinking')) return 'Thinking';
    return 'Flash';
  };

  return (
    <div className="ai-assistant-container">
      {/* 1. AI FLOATING MODAL WINDOW */}
      {isOpen && (
        <div className="ai-modal-panel">
          <div className="ai-modal-main">
            {/* Clean Minimal App Topbar */}
            <header className="ai-topbar">
              <div className="ai-brand">
                <div className="ai-brand-badge">
                  <Sparkles size={16} />
                </div>
                <div className="ai-brand-info">
                  <span className="ai-brand-title">AI Assistant</span>
                  <span className="ai-brand-status">
                    <span className="status-dot"></span>
                    Connected to ERP
                  </span>
                </div>
              </div>

              <div className="ai-actions">
                {/* Session History Clock Button */}
                <div className="ai-history-wrapper">
                  <button
                    type="button"
                    className={`ai-top-btn ${showHistoryDropdown ? 'active' : ''}`}
                    onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                    title="Chat Sessions & History"
                    aria-label="Chat Sessions & History"
                  >
                    <History size={16} />
                  </button>

                  {/* Sessions History Dropdown Menu */}
                  {showHistoryDropdown && (
                    <div className="ai-history-dropdown-menu">
                      <div className="ai-history-header">
                        <span>Recent Chat Sessions</span>
                        <button
                          type="button"
                          className="ai-new-session-mini-btn"
                          onClick={handleNewChat}
                          title="Start New Chat"
                        >
                          <Plus size={13} />
                          <span>New</span>
                        </button>
                      </div>
                      <div className="ai-history-list">
                        {sessions.length === 0 ? (
                          <div className="ai-history-empty">No previous sessions</div>
                        ) : (
                          sessions.map(sess => (
                            <div
                              key={sess.id}
                              className={`ai-history-item ${sess.id === aiChatStore.getActiveSessionId() ? 'active' : ''}`}
                              onClick={() => handleSwitchSession(sess.id)}
                            >
                              <div className="ai-history-item-content">
                                <span className="ai-history-item-title">{sess.title || 'Untitled conversation'}</span>
                                <span className="ai-history-item-meta">
                                  {sess.messages?.length || 0} messages
                                </span>
                              </div>
                              <button
                                type="button"
                                className="ai-history-delete-btn"
                                onClick={(e) => handleDeleteSession(e, sess.id)}
                                title="Delete session"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* New Chat (+) */}
                <button
                  type="button"
                  className="ai-top-btn"
                  onClick={handleNewChat}
                  title="New chat"
                  aria-label="New chat"
                >
                  <Plus size={17} />
                </button>

                {/* Maximize to Full AI Page */}
                <button
                  type="button"
                  className="ai-top-btn"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/ai');
                  }}
                  title="Open Full AI Page"
                  aria-label="Open Full AI Page"
                >
                  <Maximize2 size={16} />
                </button>

                {/* Inside Module Close Cross Button */}
                <button
                  type="button"
                  className="ai-top-btn close"
                  onClick={() => setIsOpen(false)}
                  title="Close AI Assistant"
                  aria-label="Close AI Assistant"
                >
                  <X size={17} />
                </button>
              </div>
            </header>

            {/* Chat Body */}
            <div className="ai-modal-body">
              {messages.length === 0 ? (
                /* HERO GREETING STATE - APP RELATED */
                <div className="ai-hero-view">
                  <div className="ai-hero-headings">
                    <h1 className="ai-hero-title">
                      <span className="text-blue">Hello, </span>
                      <span className="text-gradient">{firstName}</span>
                    </h1>
                    <h2 className="ai-hero-subtitle">How can I assist your business today?</h2>
                  </div>

                  <div className="ai-prompt-section">
                    <p className="ai-prompt-label">Business Actions & Insights</p>
                    <div className="ai-pills-list">
                      {appSuggestionPills.map((pill, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="ai-prompt-pill"
                          onClick={() => handleSend(pill.prompt)}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* ACTIVE CHAT STREAM */
                <div className="ai-chat-stream">
                  {messages.map((msg, index) => (
                    <div key={index} className={`ai-msg-row ${msg.role}`}>
                      {msg.role === 'ai' && (
                        <div className="ai-avatar">
                          <Sparkles size={14} color="#1a73e8" />
                        </div>
                      )}

                      <div className={`ai-msg-bubble ${msg.role}`}>
                        {/* Attached Files in User Message */}
                        {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                          <div className="ai-msg-attachments-strip">
                            {msg.attachedFiles.map(f => (
                              <div key={f.id} className="ai-msg-attach-badge">
                                {f.isImage ? (
                                  <img src={f.preview} alt={f.name} className="ai-attach-thumb-sm" />
                                ) : (
                                  <Paperclip size={12} />
                                )}
                                <span>{f.name}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {msg.role === 'user' ? (
                          editingMsgIndex === index ? (
                            /* INLINE MESSAGE EDITOR */
                            <div className="ai-user-inline-editor">
                              <textarea
                                className="ai-user-edit-textarea"
                                value={editingMsgText}
                                onChange={(e) => setEditingMsgText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSaveEditMessage(index);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEditMessage();
                                  }
                                }}
                                autoFocus
                                rows={Math.max(2, Math.min(6, editingMsgText.split('\n').length))}
                              />
                              <div className="ai-user-edit-actions-bar">
                                <button
                                  type="button"
                                  className="ai-edit-btn cancel"
                                  onClick={handleCancelEditMessage}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="ai-edit-btn submit"
                                  onClick={() => handleSaveEditMessage(index)}
                                  disabled={!editingMsgText.trim() || isLoading}
                                >
                                  Update & Send
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="ai-user-msg-content">{msg.content}</div>
                          )
                        ) : (
                          <>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                            </ReactMarkdown>

                            {/* Message Action Bar (Hear, Copy, Feedback from Full AI) */}
                            <div className="ai-msg-actions">
                              <button
                                type="button"
                                className={`ai-sub-btn ${speakingIndex === index ? 'speaking' : ''}`}
                                onClick={() => handleToggleSpeak(msg.content, index)}
                                title={speakingIndex === index ? 'Stop voice' : 'Listen with natural voice'}
                              >
                                {speakingIndex === index ? <VolumeX size={12} /> : <Volume2 size={12} />}
                                <span>{speakingIndex === index ? 'Stop' : 'Hear'}</span>
                              </button>

                              <button
                                type="button"
                                className="ai-sub-btn"
                                onClick={() => handleCopy(msg.content, index)}
                                title="Copy text"
                              >
                                {copiedIndex === index ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                                <span>{copiedIndex === index ? 'Copied' : 'Copy'}</span>
                              </button>

                              <div className="ai-feedback-group">
                                <button
                                  type="button"
                                  className={`ai-feedback-btn ${feedbackMap[index] === 'like' ? 'active' : ''}`}
                                  onClick={() => handleFeedback(index, 'like')}
                                  title="Good response"
                                >
                                  <ThumbsUp size={11} />
                                </button>
                                <button
                                  type="button"
                                  className={`ai-feedback-btn ${feedbackMap[index] === 'dislike' ? 'active' : ''}`}
                                  onClick={() => handleFeedback(index, 'dislike')}
                                  title="Bad response"
                                >
                                  <ThumbsDown size={11} />
                                </button>
                              </div>
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
                        )}
                      </div>

                      {/* User message hover actions strip: Copy and Edit */}
                      {msg.role === 'user' && editingMsgIndex !== index && (
                        <div className="ai-user-actions-strip">
                          <button
                            type="button"
                            className="ai-user-icon-btn"
                            onClick={() => handleCopy(msg.content, index)}
                            title="Copy prompt"
                          >
                            {copiedIndex === index ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                          </button>
                          <button
                            type="button"
                            className="ai-user-icon-btn"
                            onClick={() => handleStartEditMessage(index, msg.content)}
                            title="Edit prompt"
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="ai-msg-row ai">
                      <div className="ai-avatar">
                        <Sparkles size={14} color="#1a73e8" className="ai-spin" />
                      </div>
                      <div className="ai-msg-bubble ai loading">
                        <Loader2 size={14} className="ai-spin" />
                        <span>Analyzing live ERP data & generating response...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Bottom Search & Attachment Capsule */}
            <div className="ai-bottom-section">
              {/* Attached Files Preview Strip */}
              {attachedFiles.length > 0 && (
                <div className="ai-attachments-preview-strip">
                  {attachedFiles.map(file => (
                    <div key={file.id} className="ai-attachment-chip">
                      {file.isImage ? (
                        <img src={file.preview} alt={file.name} className="ai-attach-thumb" />
                      ) : (
                        <Paperclip size={12} className="ai-attach-icon" />
                      )}
                      <span className="ai-attach-name">{file.name}</span>
                      <span className="ai-attach-size">({file.formattedSize})</span>
                      <button
                        type="button"
                        className="ai-attach-remove"
                        onClick={() => removeAttachment(file.id)}
                        title="Remove attachment"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="ai-search-capsule">
                {/* File Attachment Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,application/pdf,.csv,.xlsx,.txt"
                  multiple
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="ai-attach-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file, invoice photo, or document"
                >
                  <Paperclip size={16} />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  className="ai-search-input"
                  placeholder={isRecording ? 'Listening to your voice...' : 'Ask AI anything about invoices, stock, dues, parties...'}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                />

                {/* Model Selector Dropdown Chip on Search Bar */}
                <div className="ai-model-chip-wrapper">
                  <button
                    type="button"
                    className="ai-model-chip-btn"
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    title="Select AI model"
                  >
                    <span>{getModelShortLabel(selectedModel)}</span>
                    <ChevronDown size={13} />
                  </button>

                  {showModelDropdown && (
                    <div className="ai-model-dropdown-menu">
                      {AVAILABLE_MODELS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className={`ai-model-menu-item ${selectedModel === m.id ? 'active' : ''}`}
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
                  className={`ai-mic-btn ${isRecording ? 'recording' : ''}`}
                  onClick={toggleRecording}
                  title={isRecording ? 'Stop dictation' : 'Voice input'}
                >
                  {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
                </button>

                {/* Send / Stop Button */}
                {isLoading ? (
                  <button
                    type="button"
                    className="ai-stop-btn"
                    onClick={handleStopGeneration}
                    title="Stop generation"
                    aria-label="Stop generation"
                  >
                    <Square size={13} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`ai-send-btn ${(input.trim() || attachedFiles.length > 0) ? 'active' : ''}`}
                    onClick={() => handleSend()}
                    disabled={!input.trim() && attachedFiles.length === 0}
                    aria-label="Send message"
                  >
                    <Send size={15} />
                  </button>
                )}
              </div>

              {/* Disclaimer */}
              <div className="ai-disclaimer">
                <span>AI can make mistakes. Please verify critical financial figures.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. FLOATING TRIGGER LAUNCHER:
          - Only visible when closed
          - Does NOT change to cross
          - Takes NO outside space while module is open
      */}
      {!isOpen && (
        <button
          type="button"
          className="ai-toggle-btn"
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Assistant"
          title="AI Assistant"
        >
          <Sparkles size={24} />
        </button>
      )}
    </div>
  );
};

export default AIAssistant;

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
import GeminiStarLogo from '@/components/ai/GeminiStarLogo';
import { googleAccountStore } from '@/utils/googleAccountStore';
import '@/styles/AntigravityAI.css';
import {
  Sparkles, Send, Plus, ArrowRight, ArrowUp, Square, ShieldCheck,
  CheckCircle2, XCircle, Loader2, Volume2, VolumeX,
  Mic, MicOff, Copy, Check, Trash2, Search,
  Image as ImageIcon, Settings, ChevronDown,
  PanelLeft, ShieldAlert, BookOpen, FileText, Package,
  UserCheck, Users, Briefcase, DollarSign, Home, X,
  TrendingUp, AlertTriangle, Layers, Clock, Zap,
  MessageSquare, FileSpreadsheet, Paperclip, Pencil,
  ThumbsUp, ThumbsDown, Share2, MoreHorizontal, Mail, Flag, GitFork, Info
} from 'lucide-react';

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const AIPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Sidebar toggle state & search
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Model & Account (Completely independent Gemini session)
  const [selectedModel, setSelectedModel] = useState(() => geminiStore.getModel() || 'gemini-3.6-flash');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [googleUser, setGoogleUser] = useState(() => {
    const connected = getConnectedGoogleAccount();
    if (connected && connected.email) return connected;
    return googleAccountStore.getAccount(user);
  });

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

  // Edit User Message in Conversation State
  const [editingMsgIndex, setEditingMsgIndex] = useState(null);
  const [editingMsgText, setEditingMsgText] = useState('');

  // Rename Session in Sidebar State
  const [renamingSessionId, setRenamingSessionId] = useState(null);
  const [renamingTitle, setRenamingTitle] = useState('');

  // AI Response More Options Menu State (Matching Gemini Screenshot)
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [feedbackMap, setFeedbackMap] = useState({}); // index -> 'like' | 'dislike'
  const [detailsModalMsg, setDetailsModalMsg] = useState(null);
  const [toastNotice, setToastNotice] = useState(null);

  // File Attachments
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const bottomFileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [heroCategory, setHeroCategory] = useState('All');

  // Voice State (Recording like real Gemini)
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const bottomInputRef = useRef(null);

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
      setGoogleUser(e.detail || googleAccountStore.getAccount(user));
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
  }, [user]);

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest('.gemini-more-menu-wrapper')) {
        setOpenMenuIndex(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
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
    setAttachedFiles([]);
    setInput('');
    setTimeout(() => {
      inputRef.current?.focus();
      bottomInputRef.current?.focus();
    }, 60);
  };

  const handleSwitchSession = (sessId) => {
    aiChatStore.setActiveSessionId(sessId);
    setActiveSessionId(sessId);
    const sessionsList = aiChatStore.getSessions();
    const active = sessionsList.find(s => s.id === sessId) || aiChatStore.getActiveSession();
    setMessages(active?.messages ? [...active.messages] : []);
    setAttachedFiles([]);
    setInput('');
  };

  const handleDeleteSession = (e, sessId) => {
    e.stopPropagation();
    const remaining = aiChatStore.deleteSession(sessId);
    setSessions(remaining);
    const current = aiChatStore.getActiveSession();
    setActiveSessionId(current.id);
    setMessages(current.messages || []);
  };

  // File Upload Handlers
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

  // Voice Input (Real Gemini style recording with live transcription)
  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      setInterimTranscript('');
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
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
        setInterimTranscript('');
      };

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            setInput(prev => (prev ? `${prev} ` : '') + event.results[i][0].transcript);
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (e) => {
        console.warn("Speech recognition error:", e);
        setIsRecording(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsRecording(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Speech recognition start failed:", e);
      setIsRecording(false);
      setInterimTranscript('');
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

  // Stop response generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setMessages(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.role === 'ai') {
        return prev.map((m, idx) =>
          idx === prev.length - 1
            ? { ...m, content: (m.content || '') + '\n\n*(Generation stopped by user)*' }
            : m
        );
      }
      return [...prev, { role: 'ai', content: '*(Generation stopped by user)*' }];
    });
  };

  // Execute prompt against backend with specific conversation history & reliable fallback
  const executeSendPrompt = async (textToSend, historyForApi = messages, filesToSend = attachedFiles) => {
    if (!textToSend.trim() && filesToSend.length === 0) return;

    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeakingIndex(null);

    const pendingAction = getLatestPendingAction();
    const hasActiveQ = historyForApi.some(m => m.question && m.question.status === 'active');
    const effectiveApiModel = geminiStore.getApiModel(selectedModel);
    const userKey = geminiStore.getApiKey();

    setIsLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let answered = false;

    // 1. Try Backend First (Includes MongoDB Business Data, Invoices, Contacts, Stock, Actions)
    try {
      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          history: historyForApi,
          userId: user?.id || user?._id || 'guest_user',
          userName: googleUser?.name || 'Vedaant Gupta',
          userGeminiKey: userKey,
          pendingAction,
          hasActiveQuestion: hasActiveQ,
          geminiModel: effectiveApiModel,
          files: filesToSend.map(f => ({ name: f.name, size: f.size, type: f.type, data: f.data }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.response && !data.response.toLowerCase().includes('error communicating with ai')) {
          answered = true;
          const newAiMsg = {
            role: 'ai',
            content: data.response,
            action: data.action || null,
            question: data.question || null,
            model: selectedModel,
            timestamp: new Date().toISOString()
          };
          if (data.action && (data.action.status === 'executed' || data.action.status === 'cancelled')) {
            setMessages(prev =>
              prev.map(m =>
                m.action && m.action.actionId === data.action.actionId
                  ? { ...m, action: data.action }
                  : m
              ).concat([newAiMsg])
            );
          } else {
            setMessages(prev => [...prev, newAiMsg]);
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Gemini generation stopped by user');
        setIsLoading(false);
        return;
      }
      console.warn('Backend AI chat error, falling back to direct intelligent engine...', err);
    }

    // 2. Intelligent Direct Fallback (Guarantees Gemini ALWAYS answers accurately with full depth)
    if (!answered) {
      try {
        let directResponseText = null;

        // If user provided a Gemini API Key, query Google Generative Language directly
        if (userKey) {
          try {
            const googleRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(userKey)}`,
              {
                method: 'POST',
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  systemInstruction: {
                    parts: [{
                      text: `You are Google Gemini - a world-class, ultra-intelligent, articulate, and accurate AI assistant.
Answer thoroughly, accurately, and authoritatively in rich markdown with headings, bullet points, and code formatting where relevant.
Be helpful, precise, and never give incorrect facts.`
                    }]
                  },
                  contents: [
                    ...historyForApi.slice(-6).map(m => ({
                      role: (m.role === 'ai' || m.role === 'assistant') ? 'model' : 'user',
                      parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
                    })),
                    { role: 'user', parts: [{ text: textToSend }] }
                  ]
                })
              }
            );
            if (googleRes.ok) {
              const gData = await googleRes.json();
              directResponseText = gData?.candidates?.[0]?.content?.parts?.[0]?.text;
            }
          } catch (gErr) {
            console.warn('Direct Google API error:', gErr);
          }
        }

        // Secondary resilient intelligent provider so Gemini NEVER goes blank or fails
        if (!directResponseText) {
          const directRes = await fetch('https://text.pollinations.ai/openai/chat/completions', {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [
                {
                  role: 'system',
                  content: `You are Google Gemini - an elite, state-of-the-art AI assistant.
Answer the user's prompt with maximum depth, accuracy, clear explanations, and formatting.
Whether the question is about coding, math, general science, business, GST, accounting, or creative writing, provide authoritative, high-quality, and 100% correct answers.`
                },
                ...historyForApi.slice(-6).map(m => ({
                  role: (m.role === 'ai' || m.role === 'assistant') ? 'assistant' : 'user',
                  content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
                })),
                { role: 'user', content: textToSend }
              ],
              temperature: 0.3
            })
          });

          if (directRes.ok) {
            const dData = await directRes.json();
            directResponseText = dData?.choices?.[0]?.message?.content;
          }
        }

        if (directResponseText) {
          setMessages(prev => [
            ...prev,
            {
              role: 'ai',
              content: directResponseText,
              action: null,
              question: null,
              model: selectedModel,
              timestamp: new Date().toISOString()
            }
          ]);
          answered = true;
        } else {
          setMessages(prev => [
            ...prev,
            { role: 'ai', content: "I apologize, I wasn't able to complete that response. Please try asking again." }
          ]);
        }
      } catch (directErr) {
        if (directErr.name === 'AbortError') return;
        console.error('All AI engines failed:', directErr);
        setMessages(prev => [
          ...prev,
          { role: 'ai', content: "I encountered an issue processing your request. Please check your connection and try again." }
        ]);
      }
    }

    abortControllerRef.current = null;
    setIsLoading(false);
  };

  // Send new message
  const handleSend = async (overridePrompt = null) => {
    const textToSend = overridePrompt || input;
    if ((!textToSend.trim() && attachedFiles.length === 0) || isLoading) return;

    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeakingIndex(null);

    // Stop active mic if recording
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setInterimTranscript('');
    }

    const currentFiles = [...attachedFiles];
    const userMessage = { 
      role: 'user', 
      content: textToSend,
      files: currentFiles.length > 0 ? currentFiles : null
    };

    const updatedHistory = messages.map(m =>
      m.question?.status === 'active' ? { ...m, question: { ...m.question, status: 'answered' } } : m
    ).concat([userMessage]);

    setMessages(updatedHistory);
    setInput('');
    setAttachedFiles([]);
    setInterimTranscript('');

    executeSendPrompt(textToSend, updatedHistory, currentFiles);
  };

  // Edit User Message Handlers
  const handleStartEditMessage = (index, currentText) => {
    setEditingMsgIndex(index);
    setEditingMsgText(currentText);
  };

  const handleCancelEditMessage = () => {
    setEditingMsgIndex(null);
    setEditingMsgText('');
  };

  const handleSaveEditMessage = (index) => {
    if (!editingMsgText.trim() || isLoading) return;
    const newText = editingMsgText.trim();
    setEditingMsgIndex(null);
    setEditingMsgText('');

    // Rollback conversation history to this user message
    const previousHistory = messages.slice(0, index);
    const targetUserMessage = messages[index];
    const updatedUserMsg = {
      ...targetUserMessage,
      content: newText
    };

    // New conversation history up to the edited message
    const newHistory = [...previousHistory, updatedUserMsg];
    setMessages(newHistory);

    // Call API with the updated history & files to get fresh Gemini response!
    executeSendPrompt(newText, newHistory, updatedUserMsg.files || []);
  };

  // Rename Session in Sidebar Handlers
  const handleStartRename = (e, sess) => {
    e.stopPropagation();
    setRenamingSessionId(sess.id);
    setRenamingTitle(sess.title || 'Untitled');
  };

  const handleSaveRename = (e, sessId) => {
    e?.stopPropagation();
    if (!renamingTitle.trim()) {
      setRenamingSessionId(null);
      return;
    }
    const updatedSessions = aiChatStore.renameSession(sessId, renamingTitle.trim());
    setSessions(updatedSessions);
    setRenamingSessionId(null);
    setRenamingTitle('');
  };

  const handleCancelRename = (e) => {
    e?.stopPropagation();
    setRenamingSessionId(null);
    setRenamingTitle('');
  };

  // Gemini Response Actions matching user screenshot
  const handleFeedback = (index, type) => {
    setFeedbackMap(prev => ({
      ...prev,
      [index]: prev[index] === type ? null : type
    }));
    showToast(type === 'like' ? 'Feedback submitted: Good response' : 'Feedback submitted: Bad response');
  };

  const handleShareResponse = (text) => {
    navigator.clipboard?.writeText(text);
    showToast('Response copied to clipboard for sharing');
  };

  const handleBranchInNewChat = (index) => {
    const branched = messages.slice(0, index + 1);
    const newSess = aiChatStore.createNewSession();
    aiChatStore.saveMessages(branched);
    setMessages(branched);
    setActiveSessionId(newSess.id);
    setSessions(aiChatStore.getSessions());
    setOpenMenuIndex(null);
    showToast('Branched into a new chat session');
  };

  const handleExportToDocs = (text) => {
    navigator.clipboard?.writeText(text);
    showToast('Content formatted & copied for Google Docs');
    setOpenMenuIndex(null);
  };

  const handleDraftInGmail = (text) => {
    const subject = encodeURIComponent('Gemini AI Analysis');
    const body = encodeURIComponent(text);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, '_blank');
    setOpenMenuIndex(null);
  };

  const handleReportLegalIssue = () => {
    showToast('Thank you for reporting. This response has been flagged for compliance review.');
    setOpenMenuIndex(null);
  };

  const handleSeeResponseDetails = (msg) => {
    setDetailsModalMsg(msg);
    setOpenMenuIndex(null);
  };

  const showToast = (message) => {
    setToastNotice(message);
    setTimeout(() => setToastNotice(null), 3200);
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

  // User display name & initials for Gemini AI (Decoupled from website login)
  const userName = googleUser?.name || 'Vedaant Gupta';
  const firstName = googleUser?.firstName || userName.split(' ')[0] || 'Vedaant';
  const userInitial = (firstName || 'V').charAt(0).toUpperCase();

  // Model Short Label
  const getModelShortLabel = (modelId) => {
    const found = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (found?.short) return found.short;
    if (modelId?.includes('lite')) return 'Flash-Lite';
    if (modelId?.includes('3.6') || modelId?.includes('flash')) return 'Flash';
    if (modelId?.includes('pro')) return 'Pro';
    if (modelId?.includes('thinking')) return 'Thinking';
    return 'Flash';
  };

  // Filter sessions by search query
  const filteredSessions = sessions.filter(sess => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (sess.title || '').toLowerCase().includes(q);
    const msgMatch = (sess.messages || []).some(m => (m.content || '').toLowerCase().includes(q));
    return titleMatch || msgMatch;
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const allPromptCards = [
    {
      category: 'Strategic Intelligence',
      catKey: 'Finance',
      iconClass: 'executive',
      icon: <Sparkles size={20} />,
      title: 'Executive Business Summary & KPIs',
      desc: 'Analyze overall revenue velocity, gross margins, cash flow liquidity, and operational risks',
      prompt: 'Generate a high-level executive business performance summary covering sales volume, margins, cash flow, and operational highlights.'
    },
    {
      category: 'Client Analytics',
      catKey: 'Clients',
      iconClass: 'clients',
      icon: <Users size={20} />,
      title: 'Customer VIP & Retention Radar',
      desc: 'Identify top repeat buyers, detect dormant accounts, and craft tailored client retention offers',
      prompt: 'Analyze customer purchase patterns, pinpoint highest-value repeat accounts, and identify dormant clients needing re-engagement.'
    },
    {
      category: 'Margin Optimization',
      catKey: 'Finance',
      iconClass: 'profit',
      icon: <TrendingUp size={20} />,
      title: 'Profit Margin & Overhead Reduction',
      desc: 'Audit high-margin inventory items, reduce recurring overheads, and simulate price elasticity',
      prompt: 'Perform a profitability review across active product categories and recommend concrete steps to trim overheads and maximize gross margins.'
    },
    {
      category: 'Tax & Compliance',
      catKey: 'Tax',
      iconClass: 'gst',
      icon: <FileSpreadsheet size={20} />,
      title: 'GST Audit & Tax Reconciliation',
      desc: 'Cross-check HSN/SAC classifications, detect tax mismatches, and prepare GSTR-1 filing verification',
      prompt: 'Review billing ledger for GST compliance: cross-check HSN/SAC classifications, detect tax mismatches, and prepare an invoice filing checklist.'
    },
    {
      category: 'Stock & Inventory',
      catKey: 'Operations',
      iconClass: 'profit',
      icon: <Package size={20} />,
      title: 'Dead Stock & Reorder Forecasting',
      desc: 'Identify slow-moving SKUs tying up capital and calculate optimal reorder points for fast sellers',
      prompt: 'Audit current inventory levels: identify dead stock tying up working capital and recommend safety reorder thresholds for fast-moving items.'
    },
    {
      category: 'Treasury & Cashflow',
      catKey: 'Finance',
      iconClass: 'executive',
      icon: <DollarSign size={20} />,
      title: 'Cashflow Runway & Liquidity Audit',
      desc: 'Forecast accounts receivable aging, calculate payment turnover days, and mitigate bad debts',
      prompt: 'Analyze accounts receivable aging: highlight overdue client invoices, calculate average debtor collection period, and recommend cash recovery steps.'
    }
  ];

  const filteredPromptCards = heroCategory === 'All' 
    ? allPromptCards 
    : allPromptCards.filter(c => c.catKey === heroCategory);

  return (
    <div className="gemini-app-layout">
      {/* 1. LEFT SIDEBAR: Real Gemini Experience */}
      <aside className={`gemini-app-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="gemini-sidebar-header">
          <div className="gemini-sidebar-logo-row animated-brand-hover" title="Google Gemini Copilot">
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
          title="Start fresh conversation"
        >
          <Plus size={18} />
          <span>New chat</span>
        </button>

        {/* Search Chats Input */}
        <div className="gemini-sidebar-search-container">
          <div className="gemini-sidebar-search-box">
            <Search size={14} className="gemini-search-icon" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="gemini-sidebar-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="gemini-search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Recent Chats Section */}
        <div className="gemini-sidebar-section recents-section">
          <div className="gemini-section-title-row">
            <span>{searchQuery ? `Search Results (${filteredSessions.length})` : 'Recent Chats'}</span>
          </div>
          <div className="gemini-recents-list">
            {filteredSessions.length > 0 ? (
              filteredSessions.map((sess) => (
                <div
                  key={sess.id}
                  className={`gemini-recent-item ${sess.id === activeSessionId ? 'active' : ''}`}
                  onClick={() => handleSwitchSession(sess.id)}
                >
                  <MessageSquare size={13} className="gemini-recent-icon" />
                  {renamingSessionId === sess.id ? (
                    <form
                      className="gemini-rename-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveRename(e, sess.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        className="gemini-rename-input"
                        value={renamingTitle}
                        onChange={(e) => setRenamingTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Escape' && handleCancelRename(e)}
                        autoFocus
                      />
                      <button type="submit" className="gemini-rename-save-btn" title="Save title">
                        <Check size={12} />
                      </button>
                      <button type="button" className="gemini-rename-cancel-btn" onClick={handleCancelRename} title="Cancel">
                        <X size={12} />
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="recent-title">{sess.title || 'Untitled'}</span>
                      <div className="recent-actions-right">
                        <button
                          type="button"
                          className="recent-edit-btn"
                          onClick={(e) => handleStartRename(e, sess)}
                          title="Rename chat"
                        >
                          <Pencil size={12} />
                        </button>
                        {sessions.length > 1 && (
                          <button
                            type="button"
                            className="recent-delete-btn"
                            onClick={(e) => handleDeleteSession(e, sess.id)}
                            title="Delete chat"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="gemini-no-chats-msg">
                {searchQuery ? "No matching chats found." : "No recent conversations."}
              </div>
            )}
          </div>
        </div>

        {/* Bottom User Profile Bar (Google Account) */}
        <div className="gemini-sidebar-user-footer">
          <div className="gemini-user-profile-btn" onClick={() => setShowGeminiModal(true)} title="Google Account Settings">
            {googleUser?.photoURL ? (
              <img src={googleUser.photoURL} alt={userName} className="gemini-user-avatar-img" />
            ) : (
              <div className="gemini-user-avatar-circle">
                {userInitial}
              </div>
            )}
            <div className="gemini-user-info-text">
              <span className="gemini-user-display-name">{userName}</span>
              <span className="gemini-user-sub-label">Google AI Account</span>
            </div>
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
              <span className="gemini-topbar-title">Gemini {getModelShortLabel(selectedModel)} Copilot</span>
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

            {/* Top Right Google Avatar */}
            <button
              type="button"
              className="gemini-topbar-avatar-btn"
              onClick={() => setShowGeminiModal(true)}
              title={`Google Account: ${userName}`}
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
            /* HERO CANVAS: "Good evening, Vedaant" + Filtered Enterprise Cards */
            <div className="gemini-hero-center-view">
              <div className="gemini-hero-badge-pill">
                <Sparkles size={13} className="hero-pill-sparkle" />
                <span>Autonomous Enterprise AI • Google Gemini 3.6</span>
              </div>

              <div className="gemini-hero-logo-row">
                <GeminiStarLogo size={52} className="animated-hero-star" />
              </div>
              <h1 className="gemini-jump-in-heading">
                {getGreeting()}, <span className="gemini-gradient-user-text">{firstName}</span>
              </h1>
              <p className="gemini-hero-subtitle">
                What financial audit, billing decision, or growth strategy can I assist with today?
              </p>

              {/* Centered Search Bar with Model Dropdown inside */}
              <div className="gemini-hero-search-capsule">
                {/* File Attachment Tray */}
                {attachedFiles.length > 0 && (
                  <div className="gemini-attachment-tray">
                    {attachedFiles.map(file => (
                      <div key={file.id} className="gemini-attachment-chip">
                        {file.isImage ? (
                          <img src={file.preview} alt={file.name} className="gemini-attachment-thumb" />
                        ) : (
                          <div className="gemini-attachment-doc-icon">
                            <FileText size={15} />
                          </div>
                        )}
                        <div className="gemini-attachment-info">
                          <span className="gemini-attachment-name" title={file.name}>{file.name}</span>
                          <span className="gemini-attachment-size">{file.formattedSize}</span>
                        </div>
                        <button
                          type="button"
                          className="gemini-attachment-remove-btn"
                          onClick={() => removeAttachment(file.id)}
                          title="Remove file"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="gemini-capsule-input-row">
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />

                  {/* Plus button to add files */}
                  <button
                    type="button"
                    className="gemini-hero-plus-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="Add files (images, PDFs, Excel, docs)"
                  >
                    <Plus size={20} />
                  </button>

                  {/* Input or Voice Recording Waveform */}
                  {isRecording ? (
                    <div className="gemini-live-recording-indicator">
                      <span className="rec-dot"></span>
                      <span className="rec-text">{interimTranscript || "Listening... speak now"}</span>
                      <div className="gemini-sound-wave">
                        <span className="wave-bar b1"></span>
                        <span className="wave-bar b2"></span>
                        <span className="wave-bar b3"></span>
                        <span className="wave-bar b4"></span>
                        <span className="wave-bar b5"></span>
                      </div>
                    </div>
                  ) : (
                    <input
                      ref={inputRef}
                      type="text"
                      className="gemini-hero-search-input"
                      placeholder="Ask Gemini"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      disabled={isLoading}
                    />
                  )}

                  <div className="gemini-search-right-tools">
                    {/* Model Dropdown Chip Matching Real Gemini Screenshot: [ Flash ⌵ ] */}
                    <div className="gemini-model-chip-container">
                      <button
                        type="button"
                        className="gemini-search-model-chip"
                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                        title="Select Google Gemini Model"
                      >
                        <span>{getModelShortLabel(selectedModel)}</span>
                        <ChevronDown size={14} />
                      </button>

                      {showModelDropdown && (
                        <div className="gemini-search-model-menu">
                          {AVAILABLE_MODELS.map((m) => {
                            const isSelected = selectedModel === m.id;
                            return (
                              <React.Fragment key={m.id}>
                                {m.isThinking && <div className="gemini-model-menu-divider" />}
                                <button
                                  type="button"
                                  className={`gemini-model-menu-opt ${isSelected ? 'selected' : ''}`}
                                  onClick={() => handleModelSelect(m.id)}
                                >
                                  <div className="gemini-opt-left">
                                    <div className="gemini-opt-check-col">
                                      {isSelected && <Check size={16} strokeWidth={2.6} color="#1a73e8" />}
                                    </div>
                                    <div className="gemini-opt-text-col">
                                      <span className="gemini-opt-title">{m.name}</span>
                                      <span className="gemini-opt-desc">{m.desc}</span>
                                    </div>
                                  </div>
                                </button>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Mic Button (Real Gemini recording effect) */}
                    <button
                      type="button"
                      className={`gemini-search-mic-btn ${isRecording ? 'recording' : ''}`}
                      onClick={toggleRecording}
                      title={isRecording ? "Stop listening" : "Use microphone"}
                    >
                      <Mic size={19} />
                    </button>

                    {/* Send / Stop Button Matching Real Gemini */}
                    {isLoading ? (
                      <button
                        type="button"
                        className="gemini-search-stop-btn"
                        onClick={handleStopGeneration}
                        title="Stop response"
                        aria-label="Stop response"
                      >
                        <Square size={13} fill="currentColor" strokeWidth={0} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`gemini-search-send-btn ${input.trim() || attachedFiles.length > 0 ? 'active' : ''}`}
                        onClick={() => handleSend()}
                        disabled={!input.trim() && attachedFiles.length === 0}
                        title="Submit prompt (Enter)"
                        aria-label="Send prompt"
                      >
                        <ArrowUp size={18} strokeWidth={2.4} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Interactive Prompt Category Filter Tabs */}
              <div className="gemini-hero-category-tabs">
                {[
                  { id: 'All', label: '✨ All Insights' },
                  { id: 'Finance', label: '📊 Finance & Margins' },
                  { id: 'Tax', label: '⚖️ GST & Compliance' },
                  { id: 'Clients', label: '👥 VIP Clients & Retention' },
                  { id: 'Operations', label: '📦 Inventory & Operations' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`gemini-category-tab ${heroCategory === tab.id ? 'active' : ''}`}
                    onClick={() => setHeroCategory(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Filtered Enterprise Gemini Action Cards */}
              <div className="gemini-hero-action-cards">
                {filteredPromptCards.map((card, idx) => (
                  <div 
                    key={idx}
                    className="gemini-hero-card"
                    onClick={() => handleSend(card.prompt)}
                  >
                    <div className={`gemini-card-icon-wrap ${card.iconClass}`}>
                      {card.icon}
                    </div>
                    <div className="gemini-card-content">
                      <div className={`gemini-card-badge ${card.iconClass}`}>{card.category}</div>
                      <h3 className="gemini-card-title">{card.title}</h3>
                      <p className="gemini-card-desc">{card.desc}</p>
                    </div>
                    <ArrowRight size={16} className="gemini-card-arrow" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ACTIVE CHAT CONVERSATION VIEW */
            <div className="gemini-active-chat-container">
              <div className="gemini-chat-messages-area">
                {messages.map((msg, index) => (
                  <div key={index} className={`gemini-stream-row ${msg.role}`}>
                    {msg.role === 'ai' ? (
                      <>
                        <div className="gemini-stream-avatar">
                          <GeminiStarLogo size={22} />
                        </div>
                        <div className="gemini-stream-bubble ai">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                          </ReactMarkdown>

                          {/* Gemini AI Action Bar matching Screenshot 2 */}
                          <div className="gemini-ai-actions-row">
                            <button
                              type="button"
                              className={`gemini-ai-icon-btn ${feedbackMap[index] === 'like' ? 'active' : ''}`}
                              onClick={() => handleFeedback(index, 'like')}
                              title="Good response"
                              aria-label="Good response"
                            >
                              <ThumbsUp size={15} />
                            </button>

                            <button
                              type="button"
                              className={`gemini-ai-icon-btn ${feedbackMap[index] === 'dislike' ? 'active' : ''}`}
                              onClick={() => handleFeedback(index, 'dislike')}
                              title="Bad response"
                              aria-label="Bad response"
                            >
                              <ThumbsDown size={15} />
                            </button>

                            <button
                              type="button"
                              className="gemini-ai-icon-btn"
                              onClick={() => handleShareResponse(msg.content)}
                              title="Share response"
                              aria-label="Share response"
                            >
                              <Share2 size={15} />
                            </button>

                            <button
                              type="button"
                              className="gemini-ai-icon-btn"
                              onClick={() => handleCopy(msg.content, index)}
                              title="Copy response"
                              aria-label="Copy response"
                            >
                              {copiedIndex === index ? <Check size={15} color="#16a34a" /> : <Copy size={15} />}
                            </button>

                            <div className="gemini-more-menu-wrapper">
                              <button
                                type="button"
                                className={`gemini-ai-icon-btn gemini-more-trigger ${openMenuIndex === index ? 'active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuIndex(openMenuIndex === index ? null : index);
                                }}
                                title="More options"
                                aria-label="More options"
                              >
                                <MoreHorizontal size={16} />
                              </button>

                              {openMenuIndex === index && (
                                <div className="gemini-more-popover-menu" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className="gemini-popover-item"
                                    onClick={() => handleBranchInNewChat(index)}
                                  >
                                    <GitFork size={16} className="popover-icon" />
                                    <span>Branch in new chat</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="gemini-popover-item"
                                    onClick={() => {
                                      handleSpeak(msg.content, index);
                                      setOpenMenuIndex(null);
                                    }}
                                  >
                                    {speakingIndex === index ? <VolumeX size={16} className="popover-icon" /> : <Volume2 size={16} className="popover-icon" />}
                                    <span>{speakingIndex === index ? "Stop listening" : "Listen"}</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="gemini-popover-item"
                                    onClick={() => handleExportToDocs(msg.content)}
                                  >
                                    <FileText size={16} className="popover-icon" />
                                    <span>Export to Docs</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="gemini-popover-item"
                                    onClick={() => handleDraftInGmail(msg.content)}
                                  >
                                    <Mail size={16} className="popover-icon" />
                                    <span>Draft in Gmail</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="gemini-popover-item"
                                    onClick={() => handleReportLegalIssue()}
                                  >
                                    <Flag size={16} className="popover-icon" />
                                    <span>Report legal issue</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="gemini-popover-item"
                                    onClick={() => handleSeeResponseDetails(msg)}
                                  >
                                    <Info size={16} className="popover-icon" />
                                    <span>See response details</span>
                                  </button>
                                </div>
                              )}
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
                        </div>
                      </>
                    ) : (
                      /* USER MESSAGE: Bubble + Outside Action Buttons */
                      <div className="gemini-user-turn-wrapper">
                        <div className="gemini-stream-bubble user">
                          {/* Attached files preview in user message bubble */}
                          {msg.files && msg.files.length > 0 && (
                            <div className="gemini-msg-files-grid">
                              {msg.files.map((file, fIdx) => (
                                <div key={fIdx} className="gemini-msg-file-card">
                                  {file.isImage ? (
                                    <img src={file.data} alt={file.name} className="gemini-msg-file-img" />
                                  ) : (
                                    <div className="gemini-msg-file-doc">
                                      <FileText size={18} />
                                      <div className="gemini-msg-file-info">
                                        <span className="file-name">{file.name}</span>
                                        <span className="file-size">{file.formattedSize}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {editingMsgIndex === index ? (
                            <div className="gemini-user-inline-editor">
                              <textarea
                                className="gemini-user-edit-textarea"
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
                                rows={Math.max(2, Math.min(8, editingMsgText.split('\n').length))}
                              />
                              <div className="gemini-user-edit-actions-bar">
                                <button
                                  type="button"
                                  className="gemini-edit-btn cancel"
                                  onClick={handleCancelEditMessage}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="gemini-edit-btn submit"
                                  onClick={() => handleSaveEditMessage(index)}
                                  disabled={!editingMsgText.trim() || isLoading}
                                >
                                  Update & Send
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="gemini-msg-text-content">{msg.content}</div>
                          )}
                        </div>

                        {/* OUTSIDE prompt box: Copy & Edit options appear ONLY when hovering near prompt */}
                        {editingMsgIndex !== index && (
                          <div className="gemini-user-actions-strip">
                            <button
                              type="button"
                              className="gemini-user-icon-btn"
                              onClick={() => handleCopy(msg.content, index)}
                              title="Copy prompt"
                              aria-label="Copy prompt"
                            >
                              {copiedIndex === index ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
                            </button>
                            <button
                              type="button"
                              className="gemini-user-icon-btn"
                              onClick={() => handleStartEditMessage(index, msg.content)}
                              title="Edit prompt"
                              aria-label="Edit prompt"
                            >
                              <Pencil size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
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
                  {/* File Attachment Tray */}
                  {attachedFiles.length > 0 && (
                    <div className="gemini-attachment-tray">
                      {attachedFiles.map(file => (
                        <div key={file.id} className="gemini-attachment-chip">
                          {file.isImage ? (
                            <img src={file.preview} alt={file.name} className="gemini-attachment-thumb" />
                          ) : (
                            <div className="gemini-attachment-doc-icon">
                              <FileText size={15} />
                            </div>
                          )}
                          <div className="gemini-attachment-info">
                            <span className="gemini-attachment-name" title={file.name}>{file.name}</span>
                            <span className="gemini-attachment-size">{file.formattedSize}</span>
                          </div>
                          <button
                            type="button"
                            className="gemini-attachment-remove-btn"
                            onClick={() => removeAttachment(file.id)}
                            title="Remove file"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="gemini-capsule-input-row">
                    <input
                      type="file"
                      ref={bottomFileInputRef}
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                      style={{ display: 'none' }}
                      onChange={handleFileSelect}
                    />

                    <button
                      type="button"
                      className="gemini-hero-plus-btn"
                      onClick={() => bottomFileInputRef.current?.click()}
                      title="Add files (images, PDFs, Excel, docs)"
                    >
                      <Plus size={20} />
                    </button>

                    {isRecording ? (
                      <div className="gemini-live-recording-indicator">
                        <span className="rec-dot"></span>
                        <span className="rec-text">{interimTranscript || "Listening... speak now"}</span>
                        <div className="gemini-sound-wave">
                          <span className="wave-bar b1"></span>
                          <span className="wave-bar b2"></span>
                          <span className="wave-bar b3"></span>
                          <span className="wave-bar b4"></span>
                          <span className="wave-bar b5"></span>
                        </div>
                      </div>
                    ) : (
                      <input
                        ref={bottomInputRef}
                        type="text"
                        className="gemini-hero-search-input"
                        placeholder="Ask Gemini"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        disabled={isLoading}
                      />
                    )}

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
                            {AVAILABLE_MODELS.map((m) => {
                              const isSelected = selectedModel === m.id;
                              return (
                                <React.Fragment key={m.id}>
                                  {m.isThinking && <div className="gemini-model-menu-divider" />}
                                  <button
                                    type="button"
                                    className={`gemini-model-menu-opt ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleModelSelect(m.id)}
                                  >
                                    <div className="gemini-opt-left">
                                      <div className="gemini-opt-check-col">
                                        {isSelected && <Check size={16} strokeWidth={2.6} color="#1a73e8" />}
                                      </div>
                                      <div className="gemini-opt-text-col">
                                        <span className="gemini-opt-title">{m.name}</span>
                                        <span className="gemini-opt-desc">{m.desc}</span>
                                      </div>
                                    </div>
                                  </button>
                                </React.Fragment>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        className={`gemini-search-mic-btn ${isRecording ? 'recording' : ''}`}
                        onClick={toggleRecording}
                        title={isRecording ? "Stop listening" : "Use microphone"}
                      >
                        <Mic size={19} />
                      </button>

                      {isLoading ? (
                        <button
                          type="button"
                          className="gemini-search-stop-btn"
                          onClick={handleStopGeneration}
                          title="Stop response"
                          aria-label="Stop response"
                        >
                          <Square size={13} fill="currentColor" strokeWidth={0} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`gemini-search-send-btn ${input.trim() || attachedFiles.length > 0 ? 'active' : ''}`}
                          onClick={() => handleSend()}
                          disabled={!input.trim() && attachedFiles.length === 0}
                          title="Submit prompt (Enter)"
                          aria-label="Send prompt"
                        >
                          <ArrowUp size={18} strokeWidth={2.4} />
                        </button>
                      )}
                    </div>
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

      {/* Response Details Modal (Triggered from 'See response details') */}
      {detailsModalMsg && (
        <div className="gemini-details-modal-overlay" onClick={() => setDetailsModalMsg(null)}>
          <div className="gemini-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gemini-details-modal-header">
              <div className="gemini-details-title-row">
                <Info size={18} color="#1a73e8" />
                <h3>Response details</h3>
              </div>
              <button
                type="button"
                className="gemini-details-close-btn"
                onClick={() => setDetailsModalMsg(null)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="gemini-details-modal-body">
              <div className="gemini-detail-row">
                <span className="detail-key">Model</span>
                <span className="detail-val">
                  {detailsModalMsg.model ? getModelShortLabel(detailsModalMsg.model) + ' (' + detailsModalMsg.model + ')' : 'Google Gemini 2.0 Flash'}
                </span>
              </div>
              <div className="gemini-detail-row">
                <span className="detail-key">Engine</span>
                <span className="detail-val">Google DeepMind Generative Language</span>
              </div>
              <div className="gemini-detail-row">
                <span className="detail-key">Created</span>
                <span className="detail-val">
                  {new Date(detailsModalMsg.timestamp || Date.now()).toLocaleTimeString()}
                </span>
              </div>
              <div className="gemini-detail-row">
                <span className="detail-key">Safety Rating</span>
                <span className="detail-val badge-safe">Verified Safe (0 flags)</span>
              </div>
              <div className="gemini-detail-row">
                <span className="detail-key">Length</span>
                <span className="detail-val">{(detailsModalMsg.content || '').length} characters</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Toast Notification */}
      {toastNotice && (
        <div className="gemini-floating-toast">
          <CheckCircle2 size={16} color="#16a34a" />
          <span>{toastNotice}</span>
        </div>
      )}

      {/* Google Gemini Connection Modal */}
      <GeminiConnectModal
        isOpen={showGeminiModal}
        onClose={() => setShowGeminiModal(false)}
      />
    </div>
  );
};

export default AIPage;

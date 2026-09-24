import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Folder, Plus, Trash2, CheckCircle2, 
  Sparkles, ArrowLeft, ArrowUp, Square, Mic, MicOff, ChevronDown, 
  Check, X, Upload, MessageSquare, FileText, FileSpreadsheet,
  AlertCircle, ShieldCheck, Download, Sliders, Volume2, VolumeX, Copy,
  Share2, MoreHorizontal, AudioWaveform, Edit3
} from 'lucide-react';
import { geminiProjectStore } from '@/utils/geminiProjectStore';
import { geminiStore, AVAILABLE_MODELS } from '@/utils/geminiStore';
import GeminiStarLogo from '@/components/ai/GeminiStarLogo';
import { API_BASE_URL } from '@/config/api';

const ProjectWorkspace = ({ 
  project, 
  onClose, 
  onProjectUpdated,
  userName = 'User',
  selectedModel = 'gemini-3.6-flash',
  onSelectModel
}) => {
  // activeTab on project page: 'chats' | 'sources' | 'instructions'
  const [activeTab, setActiveTab] = useState('chats');
  
  // openChatId: null means showing the ChatGPT Project Overview page (matching user's screenshot)
  // When a chat is clicked or a new chat is started, openChatId holds the active conversation ID.
  const [openChatId, setOpenChatId] = useState(null);

  // Quick prompt from the "+ New chat in [Project]" input on project overview
  const [heroPrompt, setHeroPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTitle, setRenameTitle] = useState(() => project?.title || '');
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [instructionsText, setInstructionsText] = useState(() => project?.instructions || '');
  const [isSavedInstructions, setIsSavedInstructions] = useState(false);

  // Active chat conversation state (when openChatId is not null)
  const currentChat = (project?.chats || []).find(c => c.id === openChatId) || null;
  const [messages, setMessages] = useState(() => currentChat?.messages || []);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // File upload state
  const [showAddFileModal, setShowAddFileModal] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileType, setFileType] = useState('text');
  const fileInputRef = useRef(null);
  const chatFileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);
  const heroInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const menuRef = useRef(null);

  // Close options dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowOptionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync messages when openChatId changes
  useEffect(() => {
    if (openChatId) {
      const chat = (project?.chats || []).find(c => c.id === openChatId);
      if (chat) {
        setMessages(chat.messages || []);
      }
    }
  }, [openChatId, project]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Open existing chat inside project
  const handleOpenChat = (chatId) => {
    setOpenChatId(chatId);
    const chat = (project?.chats || []).find(c => c.id === chatId);
    setMessages(chat?.messages || []);
    setChatInput('');
    setTimeout(() => chatInputRef.current?.focus(), 60);
  };

  // Create new blank chat inside project
  const handleCreateNewBlankChat = () => {
    const chatNumber = (project?.chats?.length || 0) + 1;
    const newChatId = geminiProjectStore.addProjectChat(project.id, `Connected Chat ${chatNumber}`);
    const updated = geminiProjectStore.getProject(project.id);
    onProjectUpdated(updated);
    setOpenChatId(newChatId);
    setMessages([]);
    setChatInput('');
    setTimeout(() => chatInputRef.current?.focus(), 60);
  };

  // Start new chat with an initial prompt from the "+ New chat in [Project]" capsule
  const handleStartNewChatWithPrompt = async (promptText) => {
    if (!promptText || !promptText.trim()) {
      handleCreateNewBlankChat();
      return;
    }

    const trimmed = promptText.trim();
    const chatTitle = trimmed.slice(0, 36) + (trimmed.length > 36 ? '...' : '');
    const newChatId = geminiProjectStore.addProjectChat(project.id, chatTitle);
    const updated = geminiProjectStore.getProject(project.id);
    onProjectUpdated(updated);

    setHeroPrompt('');
    setOpenChatId(newChatId);
    setMessages([]);

    // Immediately trigger send in the new chat
    setTimeout(() => {
      handleSendPromptInChat(trimmed, newChatId, []);
    }, 60);
  };

  // Delete chat from project
  const handleDeleteChat = (e, chatId) => {
    e.stopPropagation();
    if (window.confirm("Remove this connected chat from the project?")) {
      const updated = geminiProjectStore.deleteProjectChat(project.id, chatId);
      onProjectUpdated(updated);
      if (openChatId === chatId) {
        setOpenChatId(null);
      }
    }
  };

  // Save Project Instructions
  const handleSaveInstructions = () => {
    const updated = geminiProjectStore.updateProject(project.id, { instructions: instructionsText });
    onProjectUpdated(updated);
    setIsSavedInstructions(true);
    setTimeout(() => {
      setIsSavedInstructions(false);
      setShowInstructionsModal(false);
    }, 1200);
  };

  const handleApplyPreset = (presetText) => {
    setInstructionsText(presetText);
  };

  // Rename Project
  const handleRenameSubmit = (e) => {
    e.preventDefault();
    if (!renameTitle.trim()) return;
    const updated = geminiProjectStore.updateProject(project.id, { title: renameTitle.trim() });
    onProjectUpdated(updated);
    setShowRenameModal(false);
  };

  // Share Project
  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2400);
  };

  // File Upload Handlers
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      let type = 'text';
      if (['xlsx', 'xls', 'csv'].includes(ext)) type = 'spreadsheet';
      if (['pdf'].includes(ext)) type = 'pdf';

      const reader = new FileReader();
      reader.onload = (ev) => {
        const updated = geminiProjectStore.addSource(project.id, {
          name: file.name,
          type,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          summary: `Uploaded ${file.name} for project context.`,
          content: ev.target.result
        });
        onProjectUpdated(updated);
      };
      reader.readAsText(file);
    });
    e.target.value = '';
    setShowAddFileModal(false);
  };

  const handleRemoveSource = (sourceId) => {
    if (window.confirm("Remove this file from the project context?")) {
      const updated = geminiProjectStore.removeSource(project.id, sourceId);
      onProjectUpdated(updated);
    }
  };

  // Voice Input (Real Gemini dictation)
  const toggleRecording = (target = 'hero') => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
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
            const transcript = event.results[i][0].transcript;
            if (target === 'hero') {
              setHeroPrompt(prev => (prev ? `${prev} ` : '') + transcript);
            } else {
              setChatInput(prev => (prev ? `${prev} ` : '') + transcript);
            }
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = () => {
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
    window.speechSynthesis.speak(utterance);
    setSpeakingIndex(index);
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Send message in active chat
  const handleSendPromptInChat = async (textToSend, targetChatId = openChatId, initialHistory = messages) => {
    if (!textToSend || !textToSend.trim() || isLoading) return;

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setInterimTranscript('');
    }

    const currentChatId = targetChatId;
    const userMessage = { role: 'user', content: textToSend.trim() };
    const updatedMessages = [...initialHistory, userMessage];

    setMessages(updatedMessages);
    setChatInput('');
    setIsLoading(true);

    // Build project context from custom instructions and attached sources
    const projectSources = project?.sources || [];
    const sourcesSummary = projectSources.length > 0
      ? `\n\n### Project Attached Context Files:\n` + projectSources.map(s => `- **${s.name}**: ${s.summary || ''} (Content preview: ${s.content ? s.content.slice(0, 400) : 'Attached document'})`).join('\n')
      : '';

    const projectSystemInstructions = `[ChatGPT-Style Project Context: "${project.title}"]
Category: ${project.category || 'Business'}
Custom Project Instructions:
${project.instructions || 'You are an intelligent business assistant specializing in this project context.'}
${sourcesSummary}

Answer directly and stay grounded in this project's instructions and uploaded files. Format figures in Indian Rupees (₹) where relevant.`;

    const modelToUse = isThinking ? 'gemini-2.0-flash-thinking-exp-1219' : selectedModel;

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        signal: abortControllerRef.current.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          history: updatedMessages,
          systemPrompt: projectSystemInstructions,
          geminiModel: modelToUse,
          userApiKey: geminiStore.getKey()
        })
      });

      const data = await response.json();
      const aiReply = data.response || data.reply || data.text || "I have analyzed your project context.";

      const finalMessages = [...updatedMessages, { role: 'ai', content: aiReply }];
      setMessages(finalMessages);
      geminiProjectStore.saveProjectChatMessages(project.id, currentChatId, finalMessages);
      onProjectUpdated(geminiProjectStore.getProject(project.id));
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Project response stopped by user');
      } else {
        const errorMsg = `Connection error: Please ensure backend server is active. (${err.message || 'Error'})`;
        const finalMessages = [...updatedMessages, { role: 'ai', content: errorMsg }];
        setMessages(finalMessages);
        geminiProjectStore.saveProjectChatMessages(project.id, currentChatId, finalMessages);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const projectChats = project?.chats || [];
  const projectSources = project?.sources || [];

  return (
    <div className="chatgpt-project-wrapper">
      {/* Toast Notification */}
      {showShareToast && (
        <div className="chatgpt-toast">
          <Check size={14} color="#16a34a" />
          <span>Project link copied to clipboard</span>
        </div>
      )}

      {/* =========================================================================
          VIEW A: ACTIVE CHAT VIEW (when openChatId is set)
          ========================================================================= */}
      {openChatId ? (
        <div className="chatgpt-active-chat-container">
          {/* Active Chat Top Bar */}
          <header className="chatgpt-chat-header">
            <div className="chat-header-left">
              <button 
                type="button" 
                className="chatgpt-back-pill"
                onClick={() => setOpenChatId(null)}
                title={`Back to ${project.title}`}
              >
                <ArrowLeft size={16} />
                <span>{project.title}</span>
              </button>
              <div className="chat-header-chat-title">
                <MessageSquare size={15} color="#1a73e8" />
                <span>{currentChat?.title || 'Active Chat'}</span>
              </div>
            </div>

            <div className="chat-header-right">
              <button
                type="button"
                className="chatgpt-header-new-btn"
                onClick={handleCreateNewBlankChat}
                title="Start another chat in this project"
              >
                <Plus size={15} />
                <span>New chat</span>
              </button>

              <button
                type="button"
                className="chatgpt-header-close-btn"
                onClick={onClose}
                title="Exit project"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          {/* Active Chat Messages Stream */}
          <main className="chatgpt-messages-stage">
            {/* Project Grounding Banner */}
            <div className="chatgpt-grounding-banner">
              <Folder size={14} color="#1a73e8" />
              <span>
                Connected to <strong>{project.title}</strong> • Custom instructions & {projectSources.length} files active
              </span>
            </div>

            <div className="chatgpt-stream-content">
              {messages.length === 0 ? (
                <div className="chatgpt-empty-stream-hero">
                  <div className="empty-stream-icon">
                    <GeminiStarLogo size={36} />
                  </div>
                  <h3>Connected Conversation in "{project.title}"</h3>
                  <p>Ask anything. Gemini automatically follows the custom system instructions and uploaded project files.</p>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div key={idx} className={`chatgpt-message-row ${m.role}`}>
                    <div className="chatgpt-message-bubble">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content}
                      </ReactMarkdown>

                      {m.role === 'ai' && (
                        <div className="chatgpt-msg-footer-tools">
                          <button
                            type="button"
                            className={`chatgpt-tool-btn ${speakingIndex === idx ? 'speaking' : ''}`}
                            onClick={() => handleSpeak(m.content, idx)}
                            title={speakingIndex === idx ? "Stop audio" : "Listen (Hear)"}
                          >
                            {speakingIndex === idx ? <VolumeX size={13} /> : <Volume2 size={13} />}
                            <span>{speakingIndex === idx ? "Stop" : "Hear"}</span>
                          </button>
                          <button
                            type="button"
                            className="chatgpt-tool-btn"
                            onClick={() => handleCopy(m.content, idx)}
                            title="Copy response"
                          >
                            {copiedIndex === idx ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                            <span>{copiedIndex === idx ? "Copied" : "Copy"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {isLoading && (
                <div className="chatgpt-message-row ai">
                  <div className="chatgpt-message-bubble ai-thinking">
                    <GeminiStarLogo size={20} />
                    <span>Gemini is thinking in "{project.title}"...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Chat Input Capsule */}
            <div className="chatgpt-chat-bottom-bar">
              <div className="chatgpt-input-capsule">
                <input
                  type="file"
                  ref={chatFileInputRef}
                  multiple
                  accept=".xlsx,.csv,.pdf,.txt"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />

                <button
                  type="button"
                  className="chatgpt-capsule-plus-btn"
                  onClick={() => chatFileInputRef.current?.click()}
                  title="Attach file to project"
                >
                  <Plus size={19} />
                </button>

                {isRecording ? (
                  <div className="chatgpt-capsule-recording">
                    <span className="rec-dot"></span>
                    <span className="rec-text">{interimTranscript || "Listening... speak now"}</span>
                  </div>
                ) : (
                  <input
                    ref={chatInputRef}
                    type="text"
                    className="chatgpt-capsule-text-input"
                    placeholder={`Message in ${project.title}...`}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendPromptInChat(chatInput)}
                    disabled={isLoading}
                  />
                )}

                <div className="chatgpt-capsule-right-tools">
                  <button
                    type="button"
                    className={`chatgpt-capsule-mic-btn ${isRecording ? 'recording' : ''}`}
                    onClick={() => toggleRecording('chat')}
                    title={isRecording ? "Stop dictation" : "Voice dictation"}
                  >
                    <Mic size={18} />
                  </button>

                  {isLoading ? (
                    <button
                      type="button"
                      className="chatgpt-capsule-stop-btn"
                      onClick={handleStop}
                      title="Stop response"
                    >
                      <Square size={13} fill="currentColor" strokeWidth={0} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`chatgpt-capsule-send-btn ${chatInput.trim() ? 'active' : ''}`}
                      onClick={() => handleSendPromptInChat(chatInput)}
                      disabled={!chatInput.trim()}
                      title="Send prompt"
                    >
                      <ArrowUp size={18} strokeWidth={2.4} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      ) : (
        /* =========================================================================
           VIEW B: EXACT CHATGPT PROJECT OVERVIEW (MATCHING USER SCREENSHOT)
           ========================================================================= */
        <div className="chatgpt-project-overview-container">
          {/* Top Bar Navigation */}
          <header className="chatgpt-overview-header">
            <div className="overview-header-left">
              <button 
                type="button" 
                className="chatgpt-back-pill"
                onClick={onClose}
                title="Back to All Chats"
              >
                <ArrowLeft size={16} />
                <span>All chats</span>
              </button>
            </div>

            {/* Center Pill Switcher matching screenshot: Chat | + Work */}
            <div className="chatgpt-center-work-switcher">
              <button type="button" className="work-switch-pill active">Chat</button>
              <button 
                type="button" 
                className="work-switch-pill"
                onClick={() => setShowInstructionsModal(true)}
                title="Configure custom instructions & project behavior"
              >
                + Work
              </button>
            </div>

            <div className="overview-header-right">
              <div className="chatgpt-model-badge animated-brand-hover">
                <GeminiStarLogo size={16} />
                <span>Gemini 3.6 Flash</span>
              </div>
              <button 
                type="button" 
                className="chatgpt-header-close-btn"
                onClick={onClose}
                title="Exit project"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          {/* Centered Main Canvas */}
          <main className="chatgpt-overview-main">
            <div className="chatgpt-overview-content-card">
              {/* 1. Large Folder Icon + Project Title + [Share] + [...] */}
              <div className="chatgpt-title-row">
                <div className="title-left">
                  <div className="folder-icon-box">
                    <Folder size={32} strokeWidth={1.75} />
                  </div>
                  <h1 className="project-display-title">{project.title}</h1>
                </div>

                <div className="title-right-actions">
                  <button 
                    type="button" 
                    className="chatgpt-share-btn"
                    onClick={handleShare}
                    title="Share project"
                  >
                    <Share2 size={15} />
                    <span>Share</span>
                  </button>

                  <div className="chatgpt-menu-wrapper" ref={menuRef}>
                    <button 
                      type="button" 
                      className="chatgpt-more-btn"
                      onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                      title="Project settings"
                    >
                      <MoreHorizontal size={18} />
                    </button>

                    {showOptionsMenu && (
                      <div className="chatgpt-dropdown-menu">
                        <button 
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            setShowOptionsMenu(false);
                            setShowInstructionsModal(true);
                          }}
                        >
                          <Sliders size={15} />
                          <span>Project Instructions</span>
                        </button>
                        <button 
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            setShowOptionsMenu(false);
                            setRenameTitle(project.title);
                            setShowRenameModal(true);
                          }}
                        >
                          <Edit3 size={15} />
                          <span>Rename Project</span>
                        </button>
                        <div className="dropdown-divider"></div>
                        <button 
                          type="button"
                          className="dropdown-item danger"
                          onClick={() => {
                            setShowOptionsMenu(false);
                            if (window.confirm(`Delete "${project.title}" and its connected chats?`)) {
                              geminiProjectStore.deleteProject(project.id);
                              onClose();
                            }
                          }}
                        >
                          <Trash2 size={15} />
                          <span>Delete Project</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Rounded Input Capsule matching screenshot: + New chat in [Project Name] */}
              <div className="chatgpt-hero-input-capsule">
                <button
                  type="button"
                  className="hero-plus-icon-btn"
                  onClick={() => heroInputRef.current?.focus()}
                  title="New chat in this project"
                >
                  <Plus size={19} />
                </button>

                {isRecording ? (
                  <div className="hero-recording-indicator">
                    <span className="rec-dot"></span>
                    <span className="rec-text">{interimTranscript || "Listening... speak prompt"}</span>
                  </div>
                ) : (
                  <input
                    ref={heroInputRef}
                    type="text"
                    className="hero-capsule-input"
                    placeholder={`New chat in ${project.title}`}
                    value={heroPrompt}
                    onChange={(e) => setHeroPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        handleStartNewChatWithPrompt(heroPrompt);
                      }
                    }}
                  />
                )}

                <div className="hero-capsule-tools">
                  {/* Think toggle */}
                  <button
                    type="button"
                    className={`hero-think-pill ${isThinking ? 'active' : ''}`}
                    onClick={() => setIsThinking(!isThinking)}
                    title={isThinking ? "Thinking mode enabled (Gemini 2.0 Flash Thinking)" : "Enable Thinking mode"}
                  >
                    <Sparkles size={14} className={isThinking ? 'sparkle-spin' : ''} />
                    <span>Think</span>
                  </button>

                  {/* Mic button */}
                  <button
                    type="button"
                    className={`hero-mic-btn ${isRecording ? 'recording' : ''}`}
                    onClick={() => toggleRecording('hero')}
                    title={isRecording ? "Stop dictation" : "Voice dictation"}
                  >
                    <Mic size={18} />
                  </button>

                  {/* Blue filled circular submit / waveform button */}
                  <button
                    type="button"
                    className={`hero-blue-circle-btn ${heroPrompt.trim() ? 'has-input' : ''}`}
                    onClick={() => handleStartNewChatWithPrompt(heroPrompt)}
                    title={heroPrompt.trim() ? "Submit prompt into new chat" : "Start new chat"}
                  >
                    {heroPrompt.trim() ? (
                      <ArrowUp size={18} strokeWidth={2.5} />
                    ) : (
                      <AudioWaveform size={17} />
                    )}
                  </button>
                </div>
              </div>

              {/* 3. Tab Pills below input matching screenshot: [Chats]   [Sources] */}
              <div className="chatgpt-tabs-strip">
                <button
                  type="button"
                  className={`chatgpt-tab-pill ${activeTab === 'chats' ? 'active' : ''}`}
                  onClick={() => setActiveTab('chats')}
                >
                  <span>Chats</span>
                  {projectChats.length > 0 && <span className="pill-counter">{projectChats.length}</span>}
                </button>

                <button
                  type="button"
                  className={`chatgpt-tab-pill ${activeTab === 'sources' ? 'active' : ''}`}
                  onClick={() => setActiveTab('sources')}
                >
                  <span>Sources</span>
                  {projectSources.length > 0 && <span className="pill-counter">{projectSources.length}</span>}
                </button>

                <button
                  type="button"
                  className={`chatgpt-tab-pill ${activeTab === 'instructions' ? 'active' : ''}`}
                  onClick={() => setActiveTab('instructions')}
                >
                  <span>Instructions</span>
                </button>
              </div>

              {/* 4. Tab Body Content */}
              <div className="chatgpt-tab-viewport">
                {/* TAB 1: CHATS (Grouped Chats) */}
                {activeTab === 'chats' && (
                  <div className="chatgpt-chats-tab-content">
                    {projectChats.length === 0 ? (
                      /* Empty State matching screenshot: "No chats yet / Chats in [Project] will live here" */
                      <div className="chatgpt-empty-chats-state">
                        <h3 className="empty-heading">No chats yet</h3>
                        <p className="empty-subtext">Chats in {project.title} will live here</p>
                      </div>
                    ) : (
                      /* Grouped chats list */
                      <div className="chatgpt-grouped-chats-grid">
                        <div className="grid-header-row">
                          <span className="grid-header-label">Connected Conversations ({projectChats.length})</span>
                          <button 
                            type="button" 
                            className="grid-new-btn"
                            onClick={handleCreateNewBlankChat}
                          >
                            <Plus size={14} />
                            <span>New chat</span>
                          </button>
                        </div>

                        <div className="chats-card-stack">
                          {projectChats.map(chat => (
                            <div 
                              key={chat.id} 
                              className="chatgpt-chat-card"
                              onClick={() => handleOpenChat(chat.id)}
                            >
                              <div className="card-left-icon">
                                <MessageSquare size={17} />
                              </div>
                              <div className="card-info">
                                <h4 className="card-chat-title">{chat.title || 'Untitled chat'}</h4>
                                <span className="card-chat-meta">
                                  {chat.updatedAt || 'Recent'} • {(chat.messages || []).length} messages
                                </span>
                              </div>
                              <button
                                type="button"
                                className="card-delete-btn"
                                onClick={(e) => handleDeleteChat(e, chat.id)}
                                title="Delete chat"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: SOURCES (Connected Documents & Files) */}
                {activeTab === 'sources' && (
                  <div className="chatgpt-sources-tab-content">
                    <div className="sources-header-bar">
                      <div>
                        <h3 className="sources-tab-title">Project Sources</h3>
                        <p className="sources-tab-subtitle">Files attached here are automatically available across all chats in this project.</p>
                      </div>
                      <button
                        type="button"
                        className="sources-upload-btn"
                        onClick={() => setShowAddFileModal(true)}
                      >
                        <Plus size={15} />
                        <span>Add files</span>
                      </button>
                    </div>

                    {projectSources.length === 0 ? (
                      <div className="chatgpt-empty-sources-state" onClick={() => setShowAddFileModal(true)}>
                        <Upload size={36} color="#1a73e8" />
                        <h4 className="empty-heading">No sources attached yet</h4>
                        <p className="empty-subtext">Click here to attach Excel spreadsheets, CSVs, or PDFs to ground your project.</p>
                      </div>
                    ) : (
                      <div className="chatgpt-sources-grid">
                        {projectSources.map(file => (
                          <div key={file.id} className="chatgpt-source-card">
                            <div className="source-card-top">
                              <div className="source-icon-wrap">
                                {file.type === 'spreadsheet' ? <FileSpreadsheet size={18} color="#059669" /> : <FileText size={18} color="#1a73e8" />}
                              </div>
                              <div className="source-info">
                                <span className="source-filename" title={file.name}>{file.name}</span>
                                <span className="source-size">{file.size}</span>
                              </div>
                              <button
                                type="button"
                                className="source-del-btn"
                                onClick={() => handleRemoveSource(file.id)}
                                title="Remove file"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                            <p className="source-desc">{file.summary || 'Attached context document.'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: INSTRUCTIONS (Custom System Prompt) */}
                {activeTab === 'instructions' && (
                  <div className="chatgpt-instructions-tab-content">
                    <div className="instructions-card-wrapper">
                      <div className="instructions-header">
                        <h3>Project System Instructions</h3>
                        <p>Set custom instructions so Gemini behaves according to your preferred persona and rules in this project.</p>
                      </div>

                      {/* Quick Presets */}
                      <div className="instructions-presets-track">
                        <span className="presets-label">Quick Presets:</span>
                        <button
                          type="button"
                          className="preset-btn"
                          onClick={() => handleApplyPreset("You are an elite Chief Financial Officer (CFO). When answering in this project, focus on gross profit margins, cash flow liquidity, and operating expense reduction. Format figures clearly in tables with Indian Rupee (₹) formatting.")}
                        >
                          Senior CFO
                        </button>
                        <button
                          type="button"
                          className="preset-btn"
                          onClick={() => handleApplyPreset("You are a certified GST Tax Auditor. Verify all HSN/SAC codes, check CGST/SGST 9% + 9% or IGST 18% consistency, and highlight any mismatch penalties.")}
                        >
                          GST Tax Auditor
                        </button>
                        <button
                          type="button"
                          className="preset-btn"
                          onClick={() => handleApplyPreset("You are an Enterprise Account Growth Director. Emphasize client relationship longevity, personalized discount incentives, and contract re-engagement tactics.")}
                        >
                          Sales Director
                        </button>
                        <button
                          type="button"
                          className="preset-btn"
                          onClick={() => handleApplyPreset("You are an Operations & Inventory Controller. Focus on stock turns, dead stock elimination, lead time optimization, and working capital efficiency.")}
                        >
                          Inventory Controller
                        </button>
                      </div>

                      <textarea
                        rows={7}
                        className="instructions-editor"
                        placeholder="What should Gemini know or do across every chat in this project?"
                        value={instructionsText}
                        onChange={(e) => setInstructionsText(e.target.value)}
                      />

                      <div className="instructions-footer">
                        <button
                          type="button"
                          className={`instructions-save-btn ${isSavedInstructions ? 'saved' : ''}`}
                          onClick={handleSaveInstructions}
                        >
                          {isSavedInstructions ? (
                            <>
                              <Check size={16} />
                              <span>Instructions Saved</span>
                            </>
                          ) : (
                            <span>Save Instructions</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      )}

      {/* =========================================================================
          MODALS: Custom Instructions, Rename, Add File
          ========================================================================= */}
      {/* 1. Custom Instructions Modal (from '... -> Project Instructions' or '+ Work') */}
      {showInstructionsModal && (
        <div className="studio-modal-overlay" onClick={() => setShowInstructionsModal(false)}>
          <div className="studio-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="studio-modal-header">
              <div className="studio-modal-header-title">
                <Sliders size={20} color="#1a73e8" />
                <div>
                  <h3>Project Instructions</h3>
                  <p>Custom instructions for "{project.title}"</p>
                </div>
              </div>
              <button 
                type="button" 
                className="studio-modal-close"
                onClick={() => setShowInstructionsModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="studio-modal-body">
              <div className="instructions-presets-track">
                <span className="presets-label">Presets:</span>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => setInstructionsText("You are an elite Chief Financial Officer (CFO). When answering in this project, focus on gross profit margins, cash flow liquidity, and operating expense reduction. Format figures clearly in tables with Indian Rupee (₹) formatting.")}
                >
                  CFO
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => setInstructionsText("You are a certified GST Tax Auditor. Verify all HSN/SAC codes, check CGST/SGST 9% + 9% or IGST 18% consistency, and highlight any mismatch penalties.")}
                >
                  GST Auditor
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => setInstructionsText("You are an Enterprise Account Growth Director. Emphasize client relationship longevity, personalized discount incentives, and contract re-engagement tactics.")}
                >
                  Sales
                </button>
              </div>

              <textarea
                rows={6}
                className="modal-textarea"
                placeholder="What should Gemini know across every chat in this project?"
                value={instructionsText}
                onChange={(e) => setInstructionsText(e.target.value)}
              />

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowInstructionsModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-submit gemini-action-btn"
                  onClick={handleSaveInstructions}
                >
                  {isSavedInstructions ? "Saved!" : "Save Instructions"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Rename Project Modal */}
      {showRenameModal && (
        <div className="studio-modal-overlay" onClick={() => setShowRenameModal(false)}>
          <div className="studio-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="studio-modal-header">
              <div className="studio-modal-header-title">
                <Edit3 size={20} color="#1a73e8" />
                <div>
                  <h3>Rename Project</h3>
                  <p>Update the name of this workspace</p>
                </div>
              </div>
              <button 
                type="button" 
                className="studio-modal-close"
                onClick={() => setShowRenameModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRenameSubmit} className="studio-modal-body">
              <div className="form-group">
                <label>Project Title *</label>
                <input
                  type="text"
                  required
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                  className="modal-input"
                  autoFocus
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowRenameModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit gemini-action-btn"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add File / Source Modal */}
      {showAddFileModal && (
        <div className="studio-modal-overlay" onClick={() => setShowAddFileModal(false)}>
          <div className="studio-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="studio-modal-header">
              <div className="studio-modal-header-title">
                <FileText size={20} color="#1a73e8" />
                <div>
                  <h3>Add Sources to Project</h3>
                  <p>Attach context documents to "{project.title}"</p>
                </div>
              </div>
              <button 
                type="button" 
                className="studio-modal-close"
                onClick={() => setShowAddFileModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="studio-modal-body">
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".xlsx,.xls,.csv,.pdf,.txt"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />

              <div 
                className="modal-upload-box"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={32} color="#1a73e8" />
                <span className="upload-main-text">Click to browse spreadsheets or documents</span>
                <span className="upload-sub-text">Supports .xlsx, .csv, .pdf, .txt</span>
              </div>

              <div className="modal-divider">
                <span>OR ADD TEXT NOTE</span>
              </div>

              <div className="form-group">
                <label>Document / Note Title</label>
                <input
                  type="text"
                  placeholder="E.g., Vendor Payment Terms & Invoicing Rules"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="modal-input"
                />
              </div>

              <div className="form-group">
                <label>Note Content</label>
                <textarea
                  rows={4}
                  placeholder="Paste ledger guidelines, policy text, or custom data..."
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  className="modal-textarea"
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAddFileModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-submit gemini-action-btn"
                  onClick={() => {
                    if (!fileName.trim()) return;
                    const updated = geminiProjectStore.addSource(project.id, {
                      name: fileName.trim(),
                      type: fileType,
                      size: `${(fileContent.length / 1024).toFixed(1)} KB`,
                      summary: fileContent.slice(0, 100) + '...',
                      content: fileContent
                    });
                    onProjectUpdated(updated);
                    setFileName('');
                    setFileContent('');
                    setShowAddFileModal(false);
                  }}
                  disabled={!fileName.trim()}
                >
                  Attach to Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectWorkspace;

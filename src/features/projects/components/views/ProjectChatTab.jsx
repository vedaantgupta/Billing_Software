import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare, Send, Search, Settings, ShieldAlert, Plus,
  File, Image as ImageIcon, Video, Music, Download, Mic, Square,
  X, FileText, BarChart, Layers, CheckCircle2
} from 'lucide-react';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '@/config/api';
import { useAuth } from '@/hooks/useAuth';

const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  upgrade: false
});

const ProjectChatTab = ({ project, members = [], myRole = 'Member', onRefreshMembers }) => {
  const { user } = useAuth();
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeChatUser, setActiveChatUser] = useState(null); // null means Group Chat
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = useCallback(async () => {
    if (!project?.projectId) return;
    try {
      const recipientId = activeChatUser ? activeChatUser.userId : 'group';
      const response = await fetch(`${API_BASE_URL}/chat/${project.projectId}?userId=${user?.id}&recipientId=${recipientId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error loading chat messages:', err);
    }
  }, [project?.projectId, activeChatUser, user?.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (activeChatUser && user?.id) {
      socket.emit('join_private', { userId: user.id, recipientId: activeChatUser.userId });
    }
  }, [activeChatUser, user?.id]);

  useEffect(() => {
    if (!project?.projectId) return;

    socket.emit('join_project', project.projectId);

    const handleReceiveMessage = (msg) => {
      if (msg.projectId === project.projectId) {
        const currentRecipientId = activeChatUser ? activeChatUser.userId : 'group';
        const msgRecipientId = msg.recipientId || 'group';

        const isGroupMatch = currentRecipientId === 'group' && msgRecipientId === 'group';
        const isPrivateMatch = activeChatUser && (
          (msg.senderId === user?.id && msg.recipientId === activeChatUser.userId) ||
          (msg.senderId === activeChatUser.userId && msg.recipientId === user?.id)
        );

        if (isGroupMatch || isPrivateMatch) {
          setMessages(prev => {
            const exists = prev.some(m => m.timestamp === msg.timestamp && m.sender === msg.sender && m.text === msg.text);
            if (exists) return prev;
            return [...prev, msg].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          });
        }
      }
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [project?.projectId, activeChatUser, user?.id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const msgData = {
      projectId: project.projectId,
      senderId: user.id,
      recipientId: activeChatUser ? activeChatUser.userId : 'group',
      text: newMessage,
      sender: user.firstName,
      timestamp: new Date().toISOString()
    };

    setNewMessage('');
    setMessages(prev => [...prev, { ...msgData, isOptimistic: true }]);
    socket.emit('send_message', msgData);

    try {
      await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgData)
      });
    } catch (err) {
      console.error('Failed to save message to DB', err);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        const msgData = {
          projectId: project.projectId,
          senderId: user.id,
          recipientId: activeChatUser ? activeChatUser.userId : 'group',
          sender: user.firstName,
          text: '',
          timestamp: new Date().toISOString(),
          file: data
        };

        setMessages(prev => [...prev, msgData]);
        socket.emit('send_message', msgData);

        await fetch(`${API_BASE_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msgData)
        });
      } else {
        alert(data.message || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `voice-message-${Date.now()}.webm`, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', file);
        setIsUploading(true);

        try {
          const res = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (res.ok) {
            const msgData = {
              projectId: project.projectId,
              senderId: user.id,
              recipientId: activeChatUser ? activeChatUser.userId : 'group',
              sender: user.firstName,
              text: '',
              timestamp: new Date().toISOString(),
              file: data
            };
            setMessages(prev => [...prev, msgData]);
            socket.emit('send_message', msgData);
            await fetch(`${API_BASE_URL}/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(msgData)
            });
          }
        } catch (err) {
          console.error('Fetch error during voice upload:', err);
        } finally {
          setIsUploading(false);
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Recording error:', err);
      alert('Could not start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const renderFileContent = (file, senderIsMe = false) => {
    if (!file) return null;
    const { url, filename, mimetype } = file;

    const downloadFile = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error('Download failed:', err);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        link.setAttribute('target', '_blank');
        link.click();
      }
    };

    if (mimetype.startsWith('image/')) {
      return (
        <div style={{ marginTop: '0.5rem' }}>
          <div
            onClick={() => setSelectedImage({ url, filename })}
            style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}
          >
            <img src={url} alt={filename} style={{ maxWidth: '100%', maxHeight: '300px', display: 'block' }} />
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, margin: '0.4rem 0', opacity: 0.9 }}>{filename}</div>
          <button onClick={downloadFile} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'inherit', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={14} /> Download Image
          </button>
        </div>
      );
    }

    if (mimetype.startsWith('audio/')) {
      return (
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ borderRadius: '20px', overflow: 'hidden', background: 'rgba(255,255,255,0.15)', padding: '0.5rem', border: '1px solid rgba(255,255,255,0.2)' }}>
            <audio src={url} controls style={{ width: '100%', height: '40px' }} />
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, margin: '0.4rem 0', opacity: 0.9, color: senderIsMe ? 'white' : '#1e293b' }}>{filename}</div>
          <button onClick={downloadFile} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'inherit', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={14} /> Download Audio
          </button>
        </div>
      );
    }

    return (
      <div
        onClick={downloadFile}
        style={{
          marginTop: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          cursor: 'pointer',
          color: 'inherit',
          border: '1px solid rgba(255,255,255,0.2)'
        }}
      >
        <div style={{ background: 'white', color: '#4f46e5', padding: '0.5rem', borderRadius: '8px' }}>
          <File size={20} />
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: senderIsMe ? 'white' : '#1e293b' }}>{filename}</div>
          <div style={{ fontSize: '0.7rem', opacity: 0.8, color: senderIsMe ? 'white' : '#64748b' }}>Click to download</div>
        </div>
        <Download size={16} style={{ color: senderIsMe ? 'white' : '#64748b' }} />
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 220px)',
      background: '#f8fafc',
      borderRadius: '20px',
      overflow: 'hidden',
      border: '1px solid #e2e8f0',
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
      margin: '1rem 1.75rem'
    }}>
      {/* Main Chat Conversation Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: activeChatUser ? '#f1f5f9' : `linear-gradient(135deg, ${project.color || '#4f46e5'}, #818cf8)`,
              color: activeChatUser ? '#64748b' : 'white', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem'
            }}>
              {activeChatUser ? activeChatUser.name[0] : project.name[0]}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {activeChatUser ? `Direct Message: ${activeChatUser.name}` : `${project.name} Channel`}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  {activeChatUser ? 'Direct Channel' : `${members.length} Members`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          background: '#f8fafc'
        }}>
          {messages.map((msg, i) => {
            const isMe = msg.sender === user?.firstName;
            return (
              <div key={i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                {!isMe && (
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#4f46e5', marginBottom: '0.2rem', marginLeft: '0.5rem' }}>
                    {msg.sender}
                  </div>
                )}
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  background: isMe ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'white',
                  color: isMe ? 'white' : '#1e293b',
                  fontSize: '0.9rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                }}>
                  {msg.text && <div>{msg.text}</div>}
                  {msg.file && renderFileContent(msg.file, isMe)}
                  <div style={{ fontSize: '0.65rem', marginTop: '0.35rem', opacity: 0.75, textAlign: 'right' }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{ padding: '1rem 1.5rem', background: 'white', borderTop: '1px solid #f1f5f9' }}>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: '#f8fafc', padding: '0.4rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Plus size={20} />
            </button>

            <input
              className="pm-search-input"
              placeholder={isRecording ? 'Recording voice message...' : 'Type your message...'}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              disabled={isRecording}
              style={{ background: 'transparent', border: 'none', flex: 1, fontSize: '0.9rem', outline: 'none' }}
            />

            {isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                style={{ background: '#ef4444', color: 'white', border: 'none', width: '38px', height: '38px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Square size={16} fill="white" />
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                {!newMessage.trim() && (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={isUploading}
                    style={{ background: 'none', border: 'none', color: '#64748b', padding: '0.5rem', cursor: 'pointer' }}
                  >
                    <Mic size={18} />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isUploading}
                  style={{ background: newMessage.trim() ? '#4f46e5' : '#cbd5e1', color: 'white', border: 'none', width: '38px', height: '38px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Send size={16} />
                </button>
              </div>
            )}
          </form>
        </div>

      </div>

      {/* Chat Sidebar: Member Channels */}
      <div style={{ width: '280px', borderLeft: '1px solid #f1f5f9', background: '#f8fafc', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
        <div>
          <button
            onClick={() => setActiveChatUser(null)}
            style={{
              width: '100%', padding: '0.65rem', borderRadius: '10px',
              border: '1px solid #e2e8f0', background: !activeChatUser ? '#4f46e5' : 'white',
              color: !activeChatUser ? 'white' : '#1e293b', fontWeight: 700, fontSize: '0.825rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.65rem',
              marginBottom: '1.25rem'
            }}
          >
            <MessageSquare size={16} /> Team Discussion
          </button>

          <span className="pm-drawer-section-title">Members ({members.length})</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            {members.map(member => (
              <div
                key={member.userId}
                onClick={() => member.userId !== user?.id && setActiveChatUser(member)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.5rem', borderRadius: '10px',
                  background: activeChatUser?.userId === member.userId ? '#eff6ff' : 'transparent',
                  cursor: member.userId === user?.id ? 'default' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
                    {member.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.825rem', fontWeight: 700, color: activeChatUser?.userId === member.userId ? '#2563eb' : '#1e293b' }}>
                      {member.name} {member.userId === user?.id && '(You)'}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>
                      {member.role || 'Member'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox for full image view */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
        >
          <img src={selectedImage.url} alt={selectedImage.filename} style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '12px' }} />
        </div>
      )}

    </div>
  );
};

export default ProjectChatTab;

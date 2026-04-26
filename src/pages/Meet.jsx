import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Video, MessageSquare, Copy, Check, Send, LogOut, User, Zap, ShieldCheck, Users, Lock, UserPlus, Phone, VideoOff, Mic, MicOff, PhoneOff, X } from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import './Meet.css';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const SOCKET_URL = isLocal ? `http://${window.location.hostname}:5000` : '';
const API_BASE_URL = isLocal ? `http://${window.location.hostname}:5000/api` : '/api';

const Meet = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [view, setView] = useState('menu'); // menu, chat
  const [meetCode, setMeetCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [suggestedCode, setSuggestedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  
  // Group Chat State
  const [groupMessages, setGroupMessages] = useState([]);
  
  // Private Chat State
  const [activeChat, setActiveChat] = useState('group'); // 'group' or { id, name }
  const [privateMessages, setPrivateMessages] = useState({}); // { userId: [msg] }
  const [participants, setParticipants] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  const [newMessage, setNewMessage] = useState('');
  const [activeMeet, setActiveMeet] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // WebRTC States
  const [callStatus, setCallStatus] = useState('idle'); // idle, calling, incoming, active
  const [incomingCall, setIncomingCall] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callType, setCallType] = useState('video'); // voice, video

  const socketRef = useRef();
  const messagesEndRef = useRef(null);
  const activeChatRef = useRef(activeChat);

  // WebRTC Refs
  const localStreamRef = useRef();
  const remoteStreamRef = useRef();
  const peerConnectionRef = useRef();
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    generateSuggestedCode();

    // Handle auto-join from URL
    const params = new URLSearchParams(location.search);
    const joinParam = params.get('join');
    if (joinParam) {
      handleAutoJoin(joinParam);
    }
  }, []);

  const handleAutoJoin = async (code) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/meet/verify/${code}`);
      const data = await res.json();
      if (res.ok) {
        setConfirmData(data);
        setShowConfirm(true);
      }
    } catch (err) {
      console.error('Auto-join error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'chat' && activeMeet) {
      socketRef.current = io(SOCKET_URL);
      
      socketRef.current.emit('join_meet', {
        code: activeMeet.code,
        userId: user.id,
        userName: user.firstName + ' ' + (user.lastName || '')
      });

      socketRef.current.on('receive_meet_message', (message) => {
        setGroupMessages((prev) => [...prev, message]);
      });

      socketRef.current.on('receive_meet_private_message', (message) => {
        const otherUserId = message.senderId === user.id ? message.recipientId : message.senderId;
        setPrivateMessages(prev => ({
          ...prev,
          [otherUserId]: [...(prev[otherUserId] || []), message]
        }));

        if (message.senderId !== user.id && (activeChatRef.current === 'group' || activeChatRef.current.id !== message.senderId)) {
          setUnreadCounts(prev => ({
            ...prev,
            [message.senderId]: (prev[message.senderId] || 0) + 1
          }));
        }
      });

      socketRef.current.on('participants_update', (list) => {
        setParticipants(list.filter(p => p.id !== user.id));
      });

      // WebRTC Listeners
      socketRef.current.on('incoming_call', (data) => {
        setIncomingCall(data);
        setCallStatus('incoming');
        setCallType(data.type);
      });

      socketRef.current.on('call_accepted', async (data) => {
        setCallStatus('active');
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.signalData));
        }
      });

      socketRef.current.on('ice_candidate', async (data) => {
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            console.error('Error adding ice candidate', e);
          }
        }
      });

      socketRef.current.on('call_ended', () => {
        endCall();
      });

      // Fetch existing group messages
      fetch(`${API_BASE_URL}/meet/messages/${activeMeet.code}`)
        .then(res => res.json())
        .then(data => setGroupMessages(data))
        .catch(err => console.error('Error fetching messages:', err));

      return () => {
        socketRef.current.disconnect();
      };
    }
  }, [view, activeMeet, user]);

  useEffect(() => {
    scrollToBottom();
  }, [groupMessages, privateMessages, activeChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const generateSuggestedCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code += '-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSuggestedCode(code);
    setMeetCode(code);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(meetCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateMeet = async () => {
    if (!meetCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/meet/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.firstName + ' ' + (user.lastName || ''),
          code: meetCode
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActiveMeet(data);
        setView('chat');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinVerify = async () => {
    if (!joinCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/meet/verify/${joinCode}`);
      const data = await res.json();
      if (res.ok) {
        setConfirmData(data);
        setShowConfirm(true);
      } else {
        setError('Invalid or expired meeting code');
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const startJoinChat = () => {
    setActiveMeet(confirmData);
    setShowConfirm(false);
    setView('chat');
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socketRef.current) return;

    if (activeChat === 'group') {
      const msgData = {
        meetCode: activeMeet.code,
        senderId: user.id,
        senderName: user.firstName + ' ' + (user.lastName || ''),
        text: newMessage
      };
      socketRef.current.emit('send_meet_message', msgData);
    } else {
      const msgData = {
        meetCode: activeMeet.code,
        senderId: user.id,
        senderName: user.firstName + ' ' + (user.lastName || ''),
        recipientId: activeChat.id,
        text: newMessage
      };
      socketRef.current.emit('send_meet_private_message', msgData);
    }
    
    setNewMessage('');
  };

  const switchChat = (chat) => {
    setActiveChat(chat);
    if (chat !== 'group') {
      setUnreadCounts(prev => ({ ...prev, [chat.id]: 0 }));
    }
  };

  // WebRTC Functions
  const createPeerConnection = (recipientId) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice_candidate', {
          meetCode: activeMeet.code,
          recipientId,
          senderId: user.id,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      remoteStreamRef.current = event.streams[0];
    };

    localStreamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current);
    });

    peerConnectionRef.current = pc;
    return pc;
  };

  const startCall = async (type) => {
    setCallType(type);
    setCallStatus('calling');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection(activeChat.id);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current.emit('call_request', {
        meetCode: activeMeet.code,
        callerId: user.id,
        callerName: user.firstName + ' ' + (user.lastName || ''),
        recipientId: activeChat.id,
        signalData: offer,
        type: type
      });
    } catch (err) {
      console.error('Error starting call:', err);
      setCallStatus('idle');
    }
  };

  const answerCall = async () => {
    setCallStatus('active');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection(incomingCall.callerId);
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.signalData));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current.emit('answer_call', {
        meetCode: activeMeet.code,
        callerId: incomingCall.callerId,
        recipientId: user.id,
        signalData: answer
      });
    } catch (err) {
      console.error('Error answering call:', err);
      endCall();
    }
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    if (socketRef.current && activeChat) {
      socketRef.current.emit('end_call', {
        meetCode: activeMeet.code,
        recipientId: activeChat.id || incomingCall?.callerId,
        senderId: user.id
      });
    }

    setCallStatus('idle');
    setIncomingCall(null);
    setIsMuted(false);
    setIsVideoOff(false);
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const currentMessages = activeChat === 'group'
    ? groupMessages
    : (privateMessages[activeChat.id] || []);

  if (view === 'chat') {
    return (
      <div className="meet-container">
        <div className="meet-main-layout">
          {/* Sidebar */}
          <div className="participants-sidebar">
            <div className="sidebar-title">
              <Users size={18} /> People Joining
            </div>
            <div className="participants-list">
              <div
                className={`participant-item ${activeChat === 'group' ? 'active' : ''}`}
                onClick={() => switchChat('group')}
              >
                <div className="participant-avatar" style={{ background: 'var(--primary-color)', color: 'white' }}>
                  <Users size={18} />
                </div>
                <div className="participant-info">
                  <div className="participant-name">Group Chat</div>
                  <div className="participant-status">Main Room</div>
                </div>
              </div>

              {participants.length > 0 ? (
                participants.map((p) => (
                  <div
                    key={p.id}
                    className={`participant-item ${activeChat.id === p.id ? 'active' : ''}`}
                    onClick={() => switchChat(p)}
                  >
                    <div className="participant-avatar">
                      {p.name.charAt(0)}
                    </div>
                    <div className="participant-info">
                      <div className="participant-name">{p.name}</div>
                      <div className="participant-status">
                        <span className="status-indicator" style={{ width: '8px', height: '8px' }}></span> Online
                      </div>
                    </div>
                    {unreadCounts[p.id] > 0 && (
                      <span className="unread-badge">{unreadCounts[p.id]}</span>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Waiting for others to join...
                </div>
              )}
            </div>

            <div style={{ padding: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
              <button className="end-meet-btn" style={{ width: '100%' }} onClick={() => setView('menu')}>
                <LogOut size={16} /> End Meeting
              </button>
            </div>
          </div>

          {/* Chat Container */}
          <div className="chat-container">
            <div className="chat-header">
              <div className="chat-user-info">
                <div className="card-icon" style={{ width: '40px', height: '40px' }}>
                  {activeChat === 'group' ? <Users size={20} /> : <User size={20} />}
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>
                    {activeChat === 'group' ? 'Group Chat' : `Chat with ${activeChat.name}`}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {activeChat === 'group' ? (
                      <>Session: {activeMeet.code}</>
                    ) : (
                      <><Lock size={12} /> Private Conversation</>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {activeChat !== 'group' && (
                  <>
                    <button className="control-btn" style={{ width: '40px', height: '40px', background: '#f1f5f9', color: 'var(--text-main)' }} onClick={() => startCall('voice')}>
                      <Phone size={18} />
                    </button>
                    <button className="control-btn" style={{ width: '40px', height: '40px', background: '#f1f5f9', color: 'var(--text-main)' }} onClick={() => startCall('video')}>
                      <Video size={18} />
                    </button>
                  </>
                )}
                <button
                  className="btn-meet btn-outline"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  onClick={() => {
                    const link = `${window.location.origin}/meet?join=${activeMeet.code}`;
                    navigator.clipboard.writeText(link);
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                  }}
                >
                  {linkCopied ? <><Check size={16} /> Link Copied</> : <><UserPlus size={16} /> Copy Meating Link</>}
                </button>
              </div>
            </div>

            <div className="chat-messages">
              {currentMessages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-secondary)', gap: '1rem' }}>
                  <MessageSquare size={48} opacity={0.2} />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                currentMessages.map((msg, i) => (
                  <div key={i} className={`message ${msg.senderId === user.id ? 'sent' : 'received'}`}>
                    {activeChat === 'group' && msg.senderId !== user.id && (
                      <div style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '4px', opacity: 0.9 }}>
                        {msg.senderName}
                      </div>
                    )}
                    {msg.text}
                    <div className="message-info">
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={sendMessage}>
              <input
                type="text"
                className="chat-input"
                placeholder={activeChat === 'group' ? "Message group..." : `Message ${activeChat.name.split(' ')[0]} privately...`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button type="submit" className="send-btn">
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>

        {/* WebRTC Overlays */}
        {callStatus !== 'idle' && (
          <div className="call-overlay">
            {callStatus === 'incoming' ? (
              <div className="incoming-call-box">
                <div className="caller-avatar">
                  <div className="avatar-ripple"></div>
                  {incomingCall.callerName.charAt(0)}
                </div>
                <div>
                  <h2 style={{ margin: 0 }}>{incomingCall.callerName}</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>Incoming {callType} call...</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn-meet btn-primary" style={{ background: '#10b981' }} onClick={answerCall}>
                    <Phone size={18} /> Accept
                  </button>
                  <button className="btn-meet btn-primary" style={{ background: '#ef4444' }} onClick={endCall}>
                    <PhoneOff size={18} /> Decline
                  </button>
                </div>
              </div>
            ) : (
              <div className="call-container">
                <div className={`video-grid ${callStatus === 'active' ? 'peer-active' : ''}`}>
                  <div className="video-tile">
                    <video ref={localVideoRef} autoPlay muted playsInline />
                    <div className="video-label">You {isVideoOff && '(Camera Off)'}</div>
                  </div>
                  {callStatus === 'active' && (
                    <div className="video-tile">
                      <video ref={remoteVideoRef} autoPlay playsInline />
                      <div className="video-label">{activeChat.name || incomingCall?.callerName}</div>
                    </div>
                  )}
                  {callStatus === 'calling' && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                      <div className="avatar-ripple" style={{ width: '150px', height: '150px' }}></div>
                      <h3>Calling {activeChat.name}...</h3>
                    </div>
                  )}
                </div>

                <div className="call-controls">
                  <button className={`control-btn ${isMuted ? 'active' : ''}`} onClick={toggleMic}>
                    {isMuted ? <MicOff /> : <Mic />}
                  </button>
                  {callType === 'video' && (
                    <button className={`control-btn ${isVideoOff ? 'active' : ''}`} onClick={toggleVideo}>
                      {isVideoOff ? <VideoOff /> : <Video />}
                    </button>
                  )}
                  <button className="control-btn danger" onClick={endCall}>
                    <PhoneOff />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="meet-container">
      <div className="meet-header">
        <h1>Meet & Connect</h1>
        <p>Chat with your clients or team members securely using a unique session code.</p>
      </div>

      <div className="meet-actions">
        {/* Create Card */}
        <div className="meet-card">
          <div className="card-icon">
            <Zap size={32} />
          </div>
          <div>
            <h2>Start New Meet</h2>
            <p>Create a secure room and share the code with your client.</p>
          </div>

          <div className="code-input-group">
            <label>Your Meeting Code</label>
            <div className="code-input-wrapper">
              <input
                type="text"
                value={meetCode}
                onChange={(e) => setMeetCode(e.target.value.toUpperCase())}
                placeholder="GENERATE-CODE"
              />
              <button className="copy-btn" onClick={handleCopy} title="Copy Code">
                {copied ? <Check size={18} style={{ color: '#10b981' }} /> : <Copy size={18} />}
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
              Suggested strong code: <span style={{ color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setMeetCode(suggestedCode)}>{suggestedCode}</span>
            </p>
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</div>}

          <button className="btn-meet btn-primary" onClick={handleCreateMeet} disabled={loading}>
            {loading ? 'Creating...' : <><Zap size={18} /> Launch Meeting</>}
          </button>
        </div>

        {/* Join Card */}
        <div className="meet-card">
          <div className="card-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
            <ShieldCheck size={32} />
          </div>
          <div>
            <h2>Join Existing Meet</h2>
            <p>Enter the code shared by your client or partner to start chatting.</p>
          </div>

          <div className="code-input-group">
            <label>Paste Meeting Code</label>
            <div className="code-input-wrapper">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
              />
            </div>
          </div>

          <button className="btn-meet btn-outline" onClick={handleJoinVerify} disabled={loading}>
            {loading ? 'Verifying...' : <><MessageSquare size={18} /> Verify & Join</>}
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="confirmation-modal-overlay">
          <div className="confirmation-modal">
            <div className="modal-icon">
              <User size={40} />
            </div>
            <div>
              <h2 style={{ margin: '0 0 0.5rem' }}>Start Chat?</h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                Do you want to start a chat with <strong>{confirmData.creatorName}</strong>?
              </p>
            </div>
            <div className="modal-btns">
              <button className="btn-meet btn-outline" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="btn-meet btn-primary" onClick={startJoinChat}>Yes, Start Chat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Meet;

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Video, MessageSquare, Copy, Check, Send, LogOut, User, Zap, ShieldCheck, Users, Lock, UserPlus, Phone, VideoOff, Mic, MicOff, PhoneOff, X, Plus, File, Image, Music, Film, MapPin, Download, Paperclip } from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import './Meet.css';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const SOCKET_URL = isLocal ? `http://${window.location.hostname}:5000` : window.location.origin;
const API_BASE_URL = '/api';

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
  
  // Attachments State
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [fileCaption, setFileCaption] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [viewerMedia, setViewerMedia] = useState(null); // { url, name, type }

  const socketRef = useRef();
  const messagesEndRef = useRef(null);
  const activeChatRef = useRef(activeChat);

  // WebRTC Refs
  const localStreamRef = useRef();
  const remoteStreamRef = useRef();
  const peerConnectionRef = useRef();
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peersRef = useRef(new Map()); // Map of userId -> RTCPeerConnection
  const [remoteStreams, setRemoteStreams] = useState([]); // Array of { userId, stream }
  const [groupCallActive, setGroupCallActive] = useState(false);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    generateSuggestedCode();
    
    // Restore session and view state on reload
    const savedMeet = sessionStorage.getItem('active_meet');
    const savedView = sessionStorage.getItem('active_view');
    
    if (savedMeet) {
      setActiveMeet(JSON.parse(savedMeet));
      if (savedView) setView(savedView);
      else setView('chat');
    }

    // Handle auto-join from URL (Verify only)
    const params = new URLSearchParams(location.search);
    const joinParam = params.get('join');
    if (joinParam && (!savedMeet || JSON.parse(savedMeet).code !== joinParam)) {
      handleAutoJoin(joinParam);
    }
  }, []);

  useEffect(() => {
    if (activeMeet) {
      sessionStorage.setItem('active_meet', JSON.stringify(activeMeet));
      sessionStorage.setItem('active_view', view);
    } else {
      sessionStorage.removeItem('active_meet');
      sessionStorage.removeItem('active_view');
    }
  }, [activeMeet, view]);

  const endMeeting = () => {
    socketRef.current.emit('leave_meet', {
      code: activeMeet.code,
      userId: user.id,
      userName: user.firstName + ' ' + (user.lastName || '')
    });
    setView('menu');
    setActiveMeet(null);
  };

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

      socketRef.current.on('ice_candidate', (data) => {
        if (peerConnectionRef.current && data.senderId === activeChatRef.current.id) {
          peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      });

      socketRef.current.on('user_joined_group_call', (data) => {
        if (localStreamRef.current) {
          initiatePeerConnection(data.userId, data.userName, localStreamRef.current);
        }
      });

      socketRef.current.on('group_call_signal', async (data) => {
        const { senderId, senderName, signalData } = data;
        let pc = peersRef.current.get(senderId);

        if (signalData.type === 'offer') {
          pc = setupPeer(senderId, senderName, localStreamRef.current);
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current.emit('group_call_signal', {
            meetCode: activeMeet.code,
            recipientId: senderId,
            senderId: user.id,
            senderName: user.firstName + ' ' + (user.lastName || ''),
            signalData: answer
          });
        } else if (signalData.type === 'answer') {
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        }
      });

      socketRef.current.on('group_call_ice', (data) => {
        const pc = peersRef.current.get(data.senderId);
        if (pc) pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      });

      socketRef.current.on('user_left_group_call', (data) => {
        const pc = peersRef.current.get(data.userId);
        if (pc) {
          pc.close();
          peersRef.current.delete(data.userId);
          setRemoteStreams(prev => prev.filter(s => s.userId !== data.userId));
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

  const sendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !pendingFile) || !socketRef.current) return;

    let fileData = null;
    if (pendingFile) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', pendingFile);
      try {
        const res = await fetch(`${API_BASE_URL}/meet/upload`, { 
          method: 'POST', 
          body: formData 
        });
        if (res.ok) {
          fileData = await res.json();
        } else {
          const errorText = await res.text();
          throw new Error(errorText || 'Server error during upload');
        }
      } catch (err) { 
        console.error('Upload failed:', err);
        alert('File upload failed. Please try again.');
        setIsUploading(false);
        return; 
      }
    }

    const msgData = {
      meetCode: activeMeet.code,
      senderId: user.id,
      senderName: user.firstName + ' ' + (user.lastName || ''),
      text: newMessage,
      file: fileData,
      recipientId: activeChat === 'group' ? null : activeChat.id
    };

    if (activeChat === 'group') {
      socketRef.current.emit('send_meet_message', msgData);
    } else {
      socketRef.current.emit('send_meet_private_message', msgData);
    }
    
    // Save to DB
    fetch(`${API_BASE_URL}/meet/messages/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msgData)
    });
    
    setNewMessage('');
    cancelUpload();
    setIsUploading(false);
    
    // Hard reload after file upload as requested to ensure results are live
    if (fileData) {
      window.location.reload();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPendingFile(file);
    setFileCaption('');
    setShowAttachMenu(false);

    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl('');
    }
  };

  const confirmUpload = async () => {
    if (!pendingFile) return;

    setIsUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('file', pendingFile);

    try {
      const res = await fetch(`${API_BASE_URL}/meet/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) throw new Error('Upload failed');
      const fileData = await res.json();
      
      const msgData = {
        meetCode: activeMeet.code,
        senderId: user.id,
        senderName: user.firstName + ' ' + (user.lastName || ''),
        text: fileCaption || `Shared a file: ${pendingFile.name}`,
        file: fileData,
        recipientId: activeChat === 'group' ? null : activeChat.id
      };

      if (activeChat === 'group') {
        socketRef.current.emit('send_meet_message', msgData);
      } else {
        socketRef.current.emit('send_meet_private_message', msgData);
      }
      
      // Save to DB
      fetch(`${API_BASE_URL}/meet/messages/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgData)
      });

    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      cancelUpload();
    }
  };

  const cancelUpload = () => {
    setPendingFile(null);
    setFileCaption('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
  };

  const shareLocation = () => {
    setShowAttachMenu(false);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      
      const msgData = {
        meetCode: activeMeet.code,
        senderId: user.id,
        senderName: user.firstName + ' ' + (user.lastName || ''),
        text: 'Shared location',
        location: { lat: latitude, lng: longitude, url: mapUrl },
        recipientId: activeChat === 'group' ? null : activeChat.id
      };

      if (activeChat === 'group') {
        socketRef.current.emit('send_meet_message', msgData);
      } else {
        socketRef.current.emit('send_meet_private_message', msgData);
      }

      // Save to DB
      fetch(`${API_BASE_URL}/meet/messages/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgData)
      });
    }, (err) => {
      alert('Error sharing location: ' + err.message);
    });
  };

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  const renderFilePreview = (file) => {
    if (!file) return null;
    const type = file.type || '';
    
    if (type.startsWith('image/')) {
      return (
        <div className="media-message-container">
          <img 
            src={file.url} 
            alt={file.name} 
            className="message-image" 
            onClick={() => setViewerMedia(file)} 
          />
          <div className="media-footer">
            <span className="media-filename">{file.name}</span>
            <button className="media-download-btn" onClick={() => handleDownload(file.url, file.name)}>
              <Download size={14} /> Download Image
            </button>
          </div>
        </div>
      );
    }
    if (type.startsWith('video/')) {
      return (
        <div className="media-message-container">
          <video 
            className="message-video" 
            controls
            playsInline
          >
            <source src={file.url} type={type} />
          </video>
          <div className="media-footer">
            <span className="media-filename">{file.name}</span>
            <button className="media-download-btn" onClick={() => handleDownload(file.url, file.name)}>
              <Download size={14} /> Download Video
            </button>
          </div>
        </div>
      );
    }
    if (type.startsWith('audio/')) {
      return (
        <audio controls className="message-audio">
          <source src={file.url} type={type} />
        </audio>
      );
    }
    
    return (
      <div className="media-message-container">
        <div className="file-attachment-card" onClick={() => window.open(file.url, '_blank')} style={{ cursor: 'pointer' }}>
          <div className="file-icon-box">
            {type.includes('pdf') ? <File color="#ef4444" /> : <Paperclip />}
          </div>
          <div className="file-details">
            <span className="file-name">{file.name}</span>
            <span className="file-size">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
          </div>
          <Download size={18} />
        </div>
        <div className="media-footer">
          <button className="media-download-btn" onClick={(e) => { e.stopPropagation(); handleDownload(file.url, file.name); }}>
            <Download size={14} /> Download Document
          </button>
        </div>
      </div>
    );
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

  // Group Call Functions
  const setupPeer = (targetUserId, targetUserName, stream) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('group_call_ice', {
          meetCode: activeMeet.code,
          recipientId: targetUserId,
          senderId: user.id,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams(prev => {
        const existing = prev.find(s => s.userId === targetUserId);
        if (existing) return prev;
        return [...prev, { userId: targetUserId, stream: event.streams[0], userName: targetUserName }];
      });
    };

    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    peersRef.current.set(targetUserId, pc);
    return pc;
  };

  const initiatePeerConnection = async (targetUserId, targetUserName, stream) => {
    const pc = setupPeer(targetUserId, targetUserName, stream);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current.emit('group_call_signal', {
      meetCode: activeMeet.code,
      recipientId: targetUserId,
      senderId: user.id,
      senderName: user.firstName + ' ' + (user.lastName || ''),
      signalData: offer
    });
  };

  const startGroupCall = async (type) => {
    setCallType(type);
    setGroupCallActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      socketRef.current.emit('join_group_call', {
        meetCode: activeMeet.code,
        userId: user.id,
        userName: user.firstName + ' ' + (user.lastName || '')
      });
    } catch (err) {
      console.error('Error starting group call:', err);
      setGroupCallActive(false);
    }
  };

  const leaveGroupCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    peersRef.current.forEach(pc => pc.close());
    peersRef.current.clear();
    setRemoteStreams([]);
    setGroupCallActive(false);
    socketRef.current.emit('leave_group_call', {
      meetCode: activeMeet.code,
      userId: user.id
    });
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
                        <span className={`status-indicator ${p.status || 'online'}`}></span>
                        <span className="status-text">{p.status === 'left' ? 'Left' : (p.status === 'offline' ? 'Offline' : 'Online')}</span>
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
              <button className="end-meet-btn" style={{ width: '100%' }} onClick={endMeeting}>
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
                {activeChat !== 'group' ? (
                  <>
                    <button className="control-btn" style={{ width: '40px', height: '40px', background: '#f1f5f9', color: 'var(--text-main)' }} onClick={() => startCall('voice')}>
                      <Phone size={18} />
                    </button>
                    <button className="control-btn" style={{ width: '40px', height: '40px', background: '#f1f5f9', color: 'var(--text-main)' }} onClick={() => startCall('video')}>
                      <Video size={18} />
                    </button>
                  </>
                ) : (
                  <button className="btn-meet btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => startGroupCall('video')}>
                    <Video size={16} /> Join Group Video
                  </button>
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
                  msg.isSystem ? (
                    <div key={i} className="message system-message">
                      <span>{msg.text}</span>
                    </div>
                  ) : (
                    <div key={i} className={`message ${msg.senderId === user.id ? 'sent' : 'received'}`}>
                      {activeChat === 'group' && msg.senderId !== user.id && (
                        <div style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '4px', opacity: 0.9 }}>
                          {msg.senderName}
                        </div>
                      )}
                      {msg.file && renderFilePreview(msg.file)}
                      {msg.location && (
                        <a href={msg.location.url} target="_blank" rel="noopener noreferrer" className="location-card">
                          <MapPin size={24} color="var(--primary-color)" />
                          <div>
                            <strong>Live Location</strong>
                            <div style={{ fontSize: '0.75rem' }}>Click to view on maps</div>
                          </div>
                        </a>
                      )}
                      {msg.file ? (
                        <div className="file-caption">{msg.text}</div>
                      ) : (
                        !msg.location && msg.text
                      )}
                      <div className="message-info">
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  )
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={sendMessage}>
              {pendingFile && (
                <div className="input-attachment-preview">
                  <div className="preview-card-large">
                    <button type="button" className="remove-attachment-large" onClick={cancelUpload}><X size={20} /></button>
                    <div className="preview-media-box">
                      {previewUrl ? (
                        pendingFile.type.startsWith('image/') ? <img src={previewUrl} alt="" /> : <video src={previewUrl} muted />
                      ) : (
                        <div className="file-icon-large">
                          <File size={48} />
                          <span>{pendingFile.name.split('.').pop().toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <div className="preview-meta-large">
                      <div className="preview-name-large">{pendingFile.name}</div>
                      <div className="preview-size-large">{(pendingFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                    </div>
                    <button type="button" className="preview-send-btn" onClick={sendMessage} disabled={isUploading}>
                      {isUploading ? 'Sending...' : <><Send size={18} /> Send File</>}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ position: 'relative' }}>
                <button 
                  type="button" 
                  className="attach-btn" 
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                >
                  <Plus size={20} />
                </button>
                
                {showAttachMenu && (
                  <div className="attach-menu">
                    <label className="attach-item">
                      <File size={18} /> Documents
                      <input type="file" hidden onChange={handleFileUpload} />
                    </label>
                    <label className="attach-item">
                      <Image size={18} /> Images
                      <input type="file" accept="image/*" hidden onChange={handleFileUpload} />
                    </label>
                    <label className="attach-item">
                      <Film size={18} /> Videos
                      <input type="file" accept="video/*" hidden onChange={handleFileUpload} />
                    </label>
                    <label className="attach-item">
                      <Music size={18} /> Audio
                      <input type="file" accept="audio/*" hidden onChange={handleFileUpload} />
                    </label>
                    <div className="attach-item" onClick={shareLocation}>
                      <MapPin size={18} /> Location
                    </div>
                  </div>
                )}
              </div>

              <input
                type="text"
                className="chat-input"
                placeholder={pendingFile ? "Add a caption..." : (activeChat === 'group' ? "Message group..." : `Message ${activeChat.name?.split(' ')[0]} privately...`)}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isUploading}
              />
              <button type="submit" className="send-btn" disabled={isUploading || (!newMessage.trim() && !pendingFile)}>
                <Send size={20} />
              </button>
            </form>

            {isUploading && (
              <div className="upload-progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            )}
          </div>
        </div>

        {/* Call Overlays */}
        {(callStatus === 'incoming' && !groupCallActive) && (
          <div className="call-overlay">
            <div className="incoming-call-box">
              <div className="caller-avatar">
                <div className="avatar-ripple"></div>
                {incomingCall.callerName.charAt(0)}
              </div>
              <div>
                <h2 style={{ margin: 0 }}>{incomingCall.callerName}</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Incoming {incomingCall.type} call...</p>
              </div>
              <div className="modal-btns">
                <button className="control-btn danger" onClick={endCall}><PhoneOff size={24} /></button>
                <button className="control-btn" style={{ background: '#10b981' }} onClick={answerCall}>
                  {incomingCall.type === 'video' ? <Video size={24} /> : <Phone size={24} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {(callStatus !== 'idle' || groupCallActive) && (
          <div className="call-overlay">
            <div className="call-container">
              <div className={`video-grid ${(remoteStreams.length > 0 || (callStatus === 'active' && !groupCallActive)) ? 'peer-active' : ''}`}>
                <div className="video-tile">
                  <video ref={localVideoRef} autoPlay muted playsInline />
                  <div className="video-label">You</div>
                </div>

                {!groupCallActive && callStatus !== 'idle' && (
                  <div className="video-tile">
                    <video ref={remoteVideoRef} autoPlay playsInline />
                    <div className="video-label">
                      {callStatus === 'calling' ? `Calling ${activeChat.name}...` : activeChat.name}
                    </div>
                  </div>
                )}

                {groupCallActive && remoteStreams.map((rs, i) => (
                  <div key={rs.userId} className="video-tile">
                    <video 
                      autoPlay 
                      playsInline 
                      ref={el => {
                        if (el) el.srcObject = rs.stream;
                      }} 
                    />
                    <div className="video-label">{rs.userName || 'Participant'}</div>
                  </div>
                ))}
              </div>

              <div className="call-controls">
                <button className={`control-btn ${isMuted ? 'active' : ''}`} onClick={() => {
                  const audioTrack = localStreamRef.current.getAudioTracks()[0];
                  audioTrack.enabled = !audioTrack.enabled;
                  setIsMuted(!audioTrack.enabled);
                }}>
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                
                {callType === 'video' && (
                  <button className={`control-btn ${isVideoOff ? 'active' : ''}`} onClick={() => {
                    const videoTrack = localStreamRef.current.getVideoTracks()[0];
                    videoTrack.enabled = !videoTrack.enabled;
                    setIsVideoOff(!videoTrack.enabled);
                  }}>
                    {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                  </button>
                )}

                <button className="control-btn danger" onClick={groupCallActive ? leaveGroupCall : endCall}>
                  <PhoneOff size={24} />
                </button>
              </div>
            </div>
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

      {viewerMedia && (
        <div className="media-viewer-overlay" onClick={() => setViewerMedia(null)}>
          <button className="close-preview" style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}>
            <X size={32} />
          </button>
          <div className="viewer-content" onClick={e => e.stopPropagation()}>
            {viewerMedia.type.startsWith('image/') ? (
              <img src={viewerMedia.url} alt={viewerMedia.name} />
            ) : (
              <video src={viewerMedia.url} controls autoPlay />
            )}
          </div>
          <div className="viewer-actions" onClick={e => e.stopPropagation()}>
            <button className="btn-meet btn-primary" onClick={() => handleDownload(viewerMedia.url, viewerMedia.name)}>
              <Download size={20} /> Download {viewerMedia.type.startsWith('image/') ? 'Image' : 'Video'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Meet;

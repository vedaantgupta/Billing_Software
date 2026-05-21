import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import pptxgen from 'pptxgenjs';
import Reveal from 'reveal.js';
import 'reveal.js/reveal.css';
import 'reveal.js/theme/black.css';
import {
  ChevronLeft, Plus, Trash2, Download, Play, Save, Type, Image as ImageIcon,
  Square, Circle, AlignLeft, AlignCenter, AlignRight, Bold, Italic,
  Underline, ChevronUp, ChevronDown, Copy, Palette, Layout, Monitor,
  PenTool, Eraser, Trash, PlusCircle, BarChart3, Table as TableIcon,
  FileCode, Sliders, PlayCircle, Eye, Settings, HelpCircle, Activity,
  Layers, Upload, Maximize, Clock, FileJson, Video, VideoOff, Mic,
  MicOff, PhoneOff, MessageSquare, Users, Send, MonitorUp
} from 'lucide-react';
import { io } from 'socket.io-client';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip
} from 'recharts';
import { getItems, addItem, updateItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import './PresentationEditor.css';

// Curated Design System Themes
const THEMES = {
  modern: { bg: '#0f172a', gradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', text: '#f8fafc', accent: '#6366f1', secondary: '#1e293b' },
  ocean:  { bg: '#0c4a6e', gradient: 'linear-gradient(135deg, #0c4a6e 0%, #020617 100%)', text: '#f0f9ff', accent: '#38bdf8', secondary: '#075985' },
  forest: { bg: '#052e16', gradient: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)', text: '#f0fdf4', accent: '#4ade80', secondary: '#166534' },
  sunset: { bg: '#4c1d95', gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c2d12 100%)', text: '#fff7ed', accent: '#f43f5e', secondary: '#9a3412' },
  minimal:{ bg: '#ffffff', gradient: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', text: '#0f172a', accent: '#6366f1', secondary: '#f1f5f9' },
  royal:  { bg: '#1e1b4b', gradient: 'linear-gradient(135deg, #1e1b4b 0%, #3b0764 100%)', text: '#eef2ff', accent: '#a5b4fc', secondary: '#312e81' },
  glass:  { bg: '#111827', gradient: 'radial-gradient(circle at top left, #1e293b, #111827)', text: '#f9fafb', accent: '#10b981', secondary: '#1f2937' },
};

const LAYOUTS = {
  title:   { name: 'Title Slide',   icon: '▬' },
  content: { name: 'Title & Content', icon: '▤' },
  twoCol:  { name: 'Two Columns',   icon: '▥' },
  blank:   { name: 'Blank Canvas',   icon: '□' },
};

// Stock images for slides background or content image
const STOCK_IMAGES = [
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80'
];

// Helper to create empty slide
const createNewSlide = (layout = 'title', theme = 'modern') => {
  const id = 'slide-' + Date.now() + Math.random().toString(36).substr(2, 5);
  const t = THEMES[theme];
  let elements = [];

  if (layout === 'title') {
    elements = [
      {
        id: 'el-' + Math.random().toString(36).substr(2, 5),
        type: 'text',
        x: 10, y: 25, w: 80, h: 22,
        text: 'Click to add Title',
        style: {
          color: t.text,
          fontSize: 3.2,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'center'
        }
      },
      {
        id: 'el-' + Math.random().toString(36).substr(2, 5),
        type: 'text',
        x: 15, y: 52, w: 70, h: 12,
        text: 'Enter a subtitle or description here',
        style: {
          color: t.accent,
          fontSize: 1.6,
          fontFamily: 'Inter',
          fontWeight: 'normal',
          fontStyle: 'italic',
          textDecoration: 'none',
          textAlign: 'center'
        }
      }
    ];
  } else if (layout === 'content') {
    elements = [
      {
        id: 'el-' + Math.random().toString(36).substr(2, 5),
        type: 'text',
        x: 8, y: 8, w: 84, h: 12,
        text: 'Slide Title Header',
        style: {
          color: t.text,
          fontSize: 2.4,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'left',
          borderColor: t.accent,
          borderWidth: 0
        }
      },
      {
        id: 'el-' + Math.random().toString(36).substr(2, 5),
        type: 'text',
        x: 8, y: 24, w: 84, h: 65,
        text: '• Point number one goes here\n• Second key bullet detail\n• Add charts or images on the side',
        style: {
          color: t.text + 'dd',
          fontSize: 1.4,
          fontFamily: 'Inter',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'left'
        }
      }
    ];
  } else if (layout === 'twoCol') {
    elements = [
      {
        id: 'el-' + Math.random().toString(36).substr(2, 5),
        type: 'text',
        x: 8, y: 8, w: 84, h: 12,
        text: 'Two Columns Layout',
        style: {
          color: t.text,
          fontSize: 2.4,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          textAlign: 'left'
        }
      },
      {
        id: 'el-' + Math.random().toString(36).substr(2, 5),
        type: 'text',
        x: 8, y: 24, w: 40, h: 65,
        text: '• Left column topic statement\n• Detail A\n• Detail B',
        style: {
          color: t.text + 'dd',
          fontSize: 1.3,
          fontFamily: 'Inter',
          textAlign: 'left'
        }
      },
      {
        id: 'el-' + Math.random().toString(36).substr(2, 5),
        type: 'text',
        x: 52, y: 24, w: 40, h: 65,
        text: '• Right column corresponding detail\n• Analytics data\n• Final conclusion summary',
        style: {
          color: t.text + 'dd',
          fontSize: 1.3,
          fontFamily: 'Inter',
          textAlign: 'left'
        }
      }
    ];
  }

  return {
    id,
    layout,
    theme,
    bgColor: '',
    bgGradient: '',
    bgImage: '',
    transition: 'slide',
    transitionSpeed: 'default',
    notes: 'Speaker notes for this slide...',
    elements,
    drawings: [] // Stores hand-drawn shapes in present mode [{ points: [{x, y}], color, width }]
  };
};

// Safe Chart Component wrapping Recharts
const SafeChart = ({ type, data, style }) => {
  const [error, setError] = useState(false);
  
  useEffect(() => {
    setError(false);
  }, [type, data]);

  if (error) {
    return (
      <div className="chart-error-fallback">
        <Activity size={24} />
        <span>Chart Render Error</span>
      </div>
    );
  }

  const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  try {
    if (type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', fontSize: '10px' }} />
            <Bar dataKey="value" fill={style.fillColor || '#6366f1'} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }
    if (type === 'line') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', fontSize: '10px' }} />
            <Line type="monotone" dataKey="value" stroke={style.fillColor || '#6366f1'} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }
    if (type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius="75%"
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
              fontSize={8}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', fontSize: '10px' }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }
  } catch (err) {
    console.error('Recharts crashed:', err);
    setError(true);
  }
  return <div className="chart-error-fallback">No data available</div>;
};

// Custom Table Element Component
const TableElement = ({ data, style }) => {
  if (!data || !data.length) return <div style={{ color: '#64748b' }}>Empty Table</div>;
  
  return (
    <table className="slide-table-el" style={{
      color: style.color || '#ffffff',
      background: style.fillColor || '#1e293b',
      border: `${style.borderWidth || 1}px solid ${style.borderColor || '#334155'}`,
      fontSize: `${(style.fontSize || 1.2) * 10}px`
    }}>
      <tbody>
        {data.map((row, rIdx) => (
          <tr key={rIdx} style={{
            borderBottom: `${style.borderWidth || 1}px solid ${style.borderColor || '#334155'}`
          }}>
            {row.map((cell, cIdx) => (
              <td key={cIdx} style={{
                borderRight: `${style.borderWidth || 1}px solid ${style.borderColor || '#334155'}`,
                textAlign: style.textAlign || 'left',
                fontWeight: rIdx === 0 ? 'bold' : 'normal',
                background: rIdx === 0 ? 'rgba(255,255,255,0.06)' : 'transparent',
                padding: '4px 8px'
              }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default function PresentationEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [title, setTitle] = useState('Untitled Presentation');
  const [slides, setSlides] = useState([createNewSlide('title', 'modern')]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [theme, setTheme] = useState('modern');
  const [selectedElId, setSelectedElId] = useState(null);
  const [editingElId, setEditingElId] = useState(null);
  
  // System states
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [rightTab, setRightTab] = useState('design');
  const [snapLineX, setSnapLineX] = useState(null);
  const [snapLineY, setSnapLineY] = useState(null);

  // Present Mode States
  const [isPresenting, setIsPresenting] = useState(false);
  const [presentIdx, setPresentIdx] = useState(0);
  const [isPresenterConsole, setIsPresenterConsole] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [laserPointerActive, setLaserPointerActive] = useState(false);
  const [laserCoords, setLaserCoords] = useState({ x: 0, y: 0 });
  const [laserTrail, setLaserTrail] = useState([]);
  
  // Scribble Pen overlay state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#ef4444');
  const [drawWidth, setDrawWidth] = useState(4);
  const [penActive, setPenActive] = useState(false);
  const [currentLine, setCurrentLine] = useState([]);

  // Live Meet Session States
  const [showMeetPanel, setShowMeetPanel] = useState(false);
  const [isMeetActive, setIsMeetActive] = useState(false);
  const [meetSessionCode, setMeetSessionCode] = useState('');
  const [meetJoinInput, setMeetJoinInput] = useState('');
  const [participants, setParticipants] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [isPresenter, setIsPresenter] = useState(false);
  const [isPresentSyncActive, setIsPresentSyncActive] = useState(true);

  const canvasRef = useRef(null);
  const revealContainerRef = useRef(null);
  const presentCanvasRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const revealInstance = useRef(null);

  // Live Meet Refs
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peersRef = useRef(new Map());
  const localVideoRef = useRef(null);

  const activeSlide = slides[activeIdx] || slides[0];

  // Fetch Presentation data on mount
  useEffect(() => {
    const fetchPresentation = async () => {
      setLoading(true);
      if (id && user?.id) {
        try {
          const items = await getItems('documents', user.id);
          const doc = items.find(d => d.id === id);
          if (doc) {
            setTitle(doc.title || 'Untitled Presentation');
            if (doc.slides) {
              const loadedSlides = typeof doc.slides === 'string' ? JSON.parse(doc.slides) : doc.slides;
              setSlides(loadedSlides);
            }
            if (doc.theme) setTheme(doc.theme);
          }
        } catch (e) {
          console.error('Failed to load presentation:', e);
        }
      }
      setLoading(false);
    };
    fetchPresentation();
  }, [id, user?.id]);

  // Sync presentation themes
  // --- LIVE MEET & WEBRTC LOGIC ---
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const SOCKET_URL = isLocal ? `http://${window.location.hostname}:5000` : window.location.origin;

  const setupPeer = (targetUserId, targetUserName, stream) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('group_call_ice', {
          meetCode: meetSessionCode,
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

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    peersRef.current.set(targetUserId, pc);
    return pc;
  };

  const initiatePeerConnection = async (targetUserId, targetUserName, stream, code) => {
    const pc = setupPeer(targetUserId, targetUserName, stream);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    if (socketRef.current) {
      socketRef.current.emit('group_call_signal', {
        meetCode: code,
        recipientId: targetUserId,
        senderId: user.id,
        senderName: user.firstName + ' ' + (user.lastName || ''),
        signalData: offer
      });
    }
  };

  const bindSocketEvents = (socket, code, presenterFlag) => {
    socket.on('participants_update', (list) => {
      setParticipants(list.filter(p => p.id !== user.id));
    });

    socket.on('receive_meet_message', (msg) => {
      if (msg.type === 'slide_sync') {
        if (!presenterFlag && isPresentSyncActive) {
          setActiveIdx(msg.payload.activeIdx);
          setTheme(msg.payload.theme);
        }
      } else if (msg.type === 'laser_sync') {
        if (!presenterFlag) {
          setLaserCoords(msg.payload.coords);
          setLaserPointerActive(msg.payload.active);
        }
      } else if (msg.type === 'draw_sync') {
        if (!presenterFlag) {
          setSlides(msg.payload.slides);
        }
      } else {
        setChatMessages(prev => [...prev, msg]);
      }
    });

    socket.on('user_joined_group_call', (data) => {
      if (localStreamRef.current) {
        initiatePeerConnection(data.userId, data.userName, localStreamRef.current, code);
      }
    });

    socket.on('group_call_signal', async (data) => {
      const { senderId, senderName, signalData } = data;
      let pc = peersRef.current.get(senderId);

      if (signalData.type === 'offer') {
        if (localStreamRef.current) {
          pc = setupPeer(senderId, senderName, localStreamRef.current);
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('group_call_signal', {
            meetCode: code,
            recipientId: senderId,
            senderId: user.id,
            senderName: user.firstName + ' ' + (user.lastName || ''),
            signalData: answer
          });
        }
      } else if (signalData.type === 'answer') {
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        }
      }
    });

    socket.on('group_call_ice', (data) => {
      const pc = peersRef.current.get(data.senderId);
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(e => console.warn("ICE error", e));
      }
    });

    socket.on('user_left_group_call', (data) => {
      const pc = peersRef.current.get(data.userId);
      if (pc) {
        pc.close();
        peersRef.current.delete(data.userId);
        setRemoteStreams(prev => prev.filter(s => s.userId !== data.userId));
      }
    });
  };

  const startMeetSession = async () => {
    try {
      const code = `PR-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      setMeetSessionCode(code);
      setIsPresenter(true);
      setIsMeetActive(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      
      const socket = io(SOCKET_URL);
      socketRef.current = socket;
      
      socket.emit('join_meet', {
        code,
        userId: user.id,
        userName: user.firstName + ' ' + (user.lastName || '')
      });

      socket.emit('accept_group_call', {
        meetCode: code,
        userId: user.id,
        userName: user.firstName + ' ' + (user.lastName || ''),
        callerId: user.id
      });
      
      bindSocketEvents(socket, code, true);
    } catch (err) {
      console.error("Failed to start meet session:", err);
      alert("Please allow camera/mic access to start business session calling.");
      setIsMeetActive(false);
    }
  };

  const joinMeetSession = async (codeToJoin) => {
    if (!codeToJoin) return;
    try {
      setMeetSessionCode(codeToJoin);
      setIsPresenter(false);
      setIsMeetActive(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      
      const socket = io(SOCKET_URL);
      socketRef.current = socket;
      
      socket.emit('join_meet', {
        code: codeToJoin,
        userId: user.id,
        userName: user.firstName + ' ' + (user.lastName || '')
      });

      socket.emit('accept_group_call', {
        meetCode: codeToJoin,
        userId: user.id,
        userName: user.firstName + ' ' + (user.lastName || ''),
        callerId: user.id
      });
      
      bindSocketEvents(socket, codeToJoin, false);
    } catch (err) {
      console.error("Failed to join meet session:", err);
      alert("Please allow camera/mic access to join business session calling.");
      setIsMeetActive(false);
    }
  };

  const endMeetSession = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave_meet', {
        code: meetSessionCode,
        userId: user.id,
        userName: user.firstName + ' ' + (user.lastName || '')
      });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    peersRef.current.forEach(pc => pc.close());
    peersRef.current.clear();
    setRemoteStreams([]);
    setIsMeetActive(false);
    setMeetSessionCode('');
    setParticipants([]);
    setChatMessages([]);
    setShowMeetPanel(false);
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOff(!videoTrack.enabled);
      }
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      setIsScreenSharing(true);
      
      const videoTrack = stream.getVideoTracks()[0];
      
      peersRef.current.forEach(pc => {
        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(videoTrack);
        }
      });
      
      videoTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error("Screen sharing failed:", err);
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
    
    if (localStreamRef.current) {
      const webcamTrack = localStreamRef.current.getVideoTracks()[0];
      peersRef.current.forEach(pc => {
        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender && webcamTrack) {
          videoSender.replaceTrack(webcamTrack);
        }
      });
    }
  };

  const sendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;
    
    const msgData = {
      meetCode: meetSessionCode,
      senderId: user.id,
      senderName: user.firstName + ' ' + (user.lastName || ''),
      text: chatInput
    };
    
    socketRef.current.emit('send_meet_message', msgData);
    setChatInput('');
  };

  // Sync broadcasts
  useEffect(() => {
    if (isMeetActive && isPresenter && socketRef.current) {
      socketRef.current.emit('send_meet_message', {
        meetCode: meetSessionCode,
        senderId: user.id,
        type: 'slide_sync',
        payload: { activeIdx: isPresenting ? presentIdx : activeIdx, theme }
      });
    }
  }, [presentIdx, activeIdx, isPresenting, theme, isMeetActive, isPresenter, meetSessionCode, user?.id]);

  useEffect(() => {
    if (isMeetActive && isPresenter && socketRef.current && laserPointerActive) {
      socketRef.current.emit('send_meet_message', {
        meetCode: meetSessionCode,
        senderId: user.id,
        type: 'laser_sync',
        payload: { coords: laserCoords, active: laserPointerActive }
      });
    }
  }, [laserCoords, laserPointerActive, isMeetActive, isPresenter, meetSessionCode, user?.id]);

  useEffect(() => {
    return () => {
      if (socketRef.current) endMeetSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // --- END LIVE MEET LOGIC ---

  const applyTheme = (newTheme) => {
    setTheme(newTheme);
    const updated = slides.map(s => {
      // Modify elements default colors matching theme
      const updatedElements = s.elements.map(el => {
        if (el.type === 'text' && (el.style.color === THEMES[theme].text || el.style.color === THEMES[theme].accent)) {
          return { ...el, style: { ...el.style, color: THEMES[newTheme].text } };
        }
        return el;
      });
      return { ...s, theme: newTheme, elements: updatedElements };
    });
    setSlides(updated);
  };

  // Slide actions
  const addSlide = (layout = 'content') => {
    const newSlide = createNewSlide(layout, theme);
    const updated = [...slides.slice(0, activeIdx + 1), newSlide, ...slides.slice(activeIdx + 1)];
    setSlides(updated);
    setActiveIdx(activeIdx + 1);
    setSelectedElId(null);
  };

  const deleteSlide = () => {
    if (slides.length === 1) return;
    const updated = slides.filter((_, i) => i !== activeIdx);
    setSlides(updated);
    setActiveIdx(Math.max(0, activeIdx - 1));
    setSelectedElId(null);
  };

  const duplicateSlide = () => {
    const copy = {
      ...activeSlide,
      id: 'slide-' + Date.now() + Math.random().toString(36).substr(2, 5),
      elements: activeSlide.elements.map(el => ({ ...el, id: 'el-' + Math.random().toString(36).substr(2, 5) })),
      drawings: [...activeSlide.drawings]
    };
    const updated = [...slides.slice(0, activeIdx + 1), copy, ...slides.slice(activeIdx + 1)];
    setSlides(updated);
    setActiveIdx(activeIdx + 1);
  };

  const moveSlide = (dir) => {
    const newIdx = activeIdx + dir;
    if (newIdx < 0 || newIdx >= slides.length) return;
    const updated = [...slides];
    [updated[activeIdx], updated[newIdx]] = [updated[newIdx], updated[activeIdx]];
    setSlides(updated);
    setActiveIdx(newIdx);
  };

  // Element actions
  const addElement = (type, details = {}) => {
    const t = THEMES[theme];
    let newEl = {
      id: 'el-' + Date.now() + Math.random().toString(36).substr(2, 4),
      type,
      x: 35, y: 35, w: 30, h: 15,
      animation: 'none',
      animationOrder: 0,
      style: {
        color: t.text,
        fontSize: 1.5,
        fontFamily: 'Inter',
        textAlign: 'left',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        fillColor: '',
        borderColor: '',
        borderWidth: 0,
        borderRadius: 4
      }
    };

    if (type === 'text') {
      newEl.text = 'Click to add text';
    } else if (type === 'shape') {
      newEl.shapeType = details.shapeType || 'rect';
      newEl.text = '';
      newEl.w = 20;
      newEl.h = 20;
      newEl.style.fillColor = t.accent;
      if (details.shapeType === 'circle') newEl.style.borderRadius = 9999;
    } else if (type === 'image') {
      newEl.imageUrl = details.url || STOCK_IMAGES[0];
      newEl.w = 35;
      newEl.h = 35;
      newEl.style.borderColor = '#334155';
    } else if (type === 'chart') {
      newEl.chartType = details.chartType || 'bar';
      newEl.w = 50;
      newEl.h = 45;
      newEl.chartData = [
        { name: 'Q1', value: 2400 },
        { name: 'Q2', value: 1398 },
        { name: 'Q3', value: 9800 },
        { name: 'Q4', value: 3908 }
      ];
    } else if (type === 'table') {
      newEl.w = 50;
      newEl.h = 30;
      newEl.tableData = [
        ['Product', 'Sales', 'Growth'],
        ['Billing App', '1,200', '+15%'],
        ['POS System', '850', '+8%'],
        ['Consulting', '320', '+22%']
      ];
    }

    const updated = slides.map((s, i) => {
      if (i === activeIdx) {
        return { ...s, elements: [...s.elements, newEl] };
      }
      return s;
    });
    setSlides(updated);
    setSelectedElId(newEl.id);
  };

  const updateElement = (elId, updates) => {
    const updated = slides.map((s, i) => {
      if (i === activeIdx) {
        const els = s.elements.map(el => {
          if (el.id === elId) {
            // merge nested style objects
            if (updates.style && el.style) {
              return { ...el, ...updates, style: { ...el.style, ...updates.style } };
            }
            return { ...el, ...updates };
          }
          return el;
        });
        return { ...s, elements: els };
      }
      return s;
    });
    setSlides(updated);
  };

  const deleteElement = (elId) => {
    const targetId = elId || selectedElId;
    if (!targetId) return;
    const updated = slides.map((s, i) => {
      if (i === activeIdx) {
        return { ...s, elements: s.elements.filter(el => el.id !== targetId) };
      }
      return s;
    });
    setSlides(updated);
    setSelectedElId(null);
  };

  const duplicateElement = () => {
    if (!selectedElId) return;
    const el = activeSlide.elements.find(e => e.id === selectedElId);
    if (!el) return;
    
    const copy = {
      ...el,
      id: 'el-' + Date.now() + Math.random().toString(36).substr(2, 4),
      x: Math.min(85, el.x + 4),
      y: Math.min(85, el.y + 4)
    };
    
    updateElement(null, null); // bypass
    const updated = slides.map((s, i) => {
      if (i === activeIdx) {
        return { ...s, elements: [...s.elements, copy] };
      }
      return s;
    });
    setSlides(updated);
    setSelectedElId(copy.id);
  };

  const changeLayer = (action) => {
    if (!selectedElId) return;
    const updated = slides.map((s, i) => {
      if (i === activeIdx) {
        const idx = s.elements.findIndex(el => el.id === selectedElId);
        if (idx === -1) return s;
        const newEls = [...s.elements];
        const [target] = newEls.splice(idx, 1);
        if (action === 'front') {
          newEls.push(target);
        } else if (action === 'back') {
          newEls.unshift(target);
        }
        return { ...s, elements: newEls };
      }
      return s;
    });
    setSlides(updated);
  };

  // Keyboard navigation & Shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isPresenting) return; // Presentation mode has its own handlers
      
      const inputFocused = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
      if (inputFocused || editingElId) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElId) deleteElement(selectedElId);
      }
      if (e.key === 'd' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        duplicateElement();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSlide(-1);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSlide(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresenting, selectedElId, editingElId, activeIdx, slides]);

  // Custom Mouse Drag & Resize logic
  const handleElementMouseDown = (e, el, action = 'drag') => {
    e.stopPropagation();
    if (editingElId === el.id) return;
    setSelectedElId(el.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const startElX = el.x;
    const startElY = el.y;
    const startElW = el.w;
    const startElH = el.h;
    
    if (!canvasRef.current) return;
    const containerRect = canvasRef.current.getBoundingClientRect();

    const handleMouseMove = (moveEvent) => {
      const deltaX = ((moveEvent.clientX - startX) / containerRect.width) * 100;
      const deltaY = ((moveEvent.clientY - startY) / containerRect.height) * 100;

      let newX = startElX;
      let newY = startElY;
      let newW = startElW;
      let newH = startElH;

      if (action === 'drag') {
        newX = Math.max(0, Math.min(100 - startElW, startElX + deltaX));
        newY = Math.max(0, Math.min(100 - startElH, startElY + deltaY));

        // Snapping alignments
        const snapThreshold = 1.6;
        let snappedX = false;
        let snappedY = false;

        // Snap to center horizontal
        if (Math.abs((newX + startElW / 2) - 50) < snapThreshold) {
          newX = 50 - startElW / 2;
          snappedX = true;
          setSnapLineX(50);
        } else {
          setSnapLineX(null);
        }

        // Snap to center vertical
        if (Math.abs((newY + startElH / 2) - 50) < snapThreshold) {
          newY = 50 - startElH / 2;
          snappedY = true;
          setSnapLineY(50);
        } else {
          setSnapLineY(null);
        }

        // Snap to margins
        if (!snappedX) {
          if (Math.abs(newX - 8) < snapThreshold) { newX = 8; setSnapLineX(8); }
          else if (Math.abs((newX + startElW) - 92) < snapThreshold) { newX = 92 - startElW; setSnapLineX(92); }
        }
        if (!snappedY) {
          if (Math.abs(newY - 8) < snapThreshold) { newY = 8; setSnapLineY(8); }
          else if (Math.abs((newY + startElH) - 92) < snapThreshold) { newY = 92 - startElH; setSnapLineY(92); }
        }

      } else {
        // Handle resizing
        if (action.includes('right')) {
          newW = Math.max(4, Math.min(100 - startElX, startElW + deltaX));
        }
        if (action.includes('left')) {
          const potentialW = startElW - deltaX;
          if (potentialW >= 4) {
            newX = Math.max(0, startElX + deltaX);
            newW = potentialW;
          }
        }
        if (action.includes('bottom')) {
          newH = Math.max(4, Math.min(100 - startElY, startElH + deltaY));
        }
        if (action.includes('top')) {
          const potentialH = startElH - deltaY;
          if (potentialH >= 4) {
            newY = Math.max(0, startElY + deltaY);
            newH = potentialH;
          }
        }
      }

      updateElement(el.id, { x: newX, y: newY, w: newW, h: newH });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setSnapLineX(null);
      setSnapLineY(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Presentation Mode Handlers
  const togglePresentMode = (idx = 0) => {
    setPresentIdx(idx);
    setIsPresenting(true);
    setTimerActive(true);
    setElapsedTime(0);
  };

  // Synchronize Reveal.js lifecycle
  useEffect(() => {
    if (!isPresenting) {
      if (revealInstance.current) {
        revealInstance.current.destroy();
        revealInstance.current = null;
      }
      setTimerActive(false);
      return;
    }

    // Initialize Reveal.js on mount in Presentation View
    const deck = new Reveal(revealContainerRef.current, {
      hash: false,
      history: false,
      keyboard: true,
      controls: true,
      progress: true,
      center: true,
      width: 1280,
      height: 720,
      minScale: 0.2,
      maxScale: 2.0,
      transition: 'slide',
      embedded: isPresenterConsole // Embed inside splitscreen
    });

    deck.initialize().then(() => {
      deck.slide(presentIdx);
      revealInstance.current = deck;
      
      // Keep presentIdx synced in React state
      deck.on('slidechanged', (event) => {
        setPresentIdx(event.indexh);
      });
    });

    return () => {
      if (revealInstance.current) {
        try {
          revealInstance.current.destroy();
        } catch(e) {}
        revealInstance.current = null;
      }
    };
  }, [isPresenting, isPresenterConsole]);

  // Stopwatch interval for Presenter console
  useEffect(() => {
    if (timerActive) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [timerActive]);

  const handleNextSlide = () => {
    if (revealInstance.current) {
      revealInstance.current.next();
    } else {
      setPresentIdx(prev => Math.min(slides.length - 1, prev + 1));
    }
  };

  const handlePrevSlide = () => {
    if (revealInstance.current) {
      revealInstance.current.prev();
    } else {
      setPresentIdx(prev => Math.max(0, prev - 1));
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Laser Pointer Overlay Mouse move listener
  const handleLaserPointerMove = (e) => {
    if (!laserPointerActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLaserCoords({ x, y });
    setLaserTrail(prev => [...prev.slice(-15), { x, y, id: Math.random() }]);
  };

  // Drawing Canvas logic
  useEffect(() => {
    const canvas = presentCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set drawing styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Redraw historic lines of this slide
    const currentSlideRecord = slides[presentIdx];
    if (currentSlideRecord && currentSlideRecord.drawings) {
      currentSlideRecord.drawings.forEach(line => {
        if (!line.points || line.points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.width;
        ctx.moveTo(line.points[0].x * canvas.width / 100, line.points[0].y * canvas.height / 100);
        for (let i = 1; i < line.points.length; i++) {
          ctx.lineTo(line.points[i].x * canvas.width / 100, line.points[i].y * canvas.height / 100);
        }
        ctx.stroke();
      });
    }

    // Draw active drawing line
    if (currentLine.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawWidth;
      ctx.moveTo(currentLine[0].x * canvas.width / 100, currentLine[0].y * canvas.height / 100);
      for (let i = 1; i < currentLine.length; i++) {
        ctx.lineTo(currentLine[i].x * canvas.width / 100, currentLine[i].y * canvas.height / 100);
      }
      ctx.stroke();
    }
  }, [currentLine, presentIdx, slides, drawColor, drawWidth, isPresenting]);

  const handleDrawingStart = (e) => {
    if (!penActive) return;
    setIsDrawing(true);
    const rect = presentCanvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCurrentLine([{ x, y }]);
  };

  const handleDrawingMove = (e) => {
    if (!isDrawing || !penActive) return;
    const rect = presentCanvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCurrentLine(prev => [...prev, { x, y }]);
  };

  const handleDrawingEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Save line to active slide
    if (currentLine.length > 1) {
      const newLine = {
        points: currentLine,
        color: drawColor,
        width: drawWidth
      };
      
      const updated = slides.map((s, idx) => {
        if (idx === presentIdx) {
          return { ...s, drawings: [...(s.drawings || []), newLine] };
        }
        return s;
      });
      setSlides(updated);

      if (isMeetActive && isPresenter && socketRef.current) {
        socketRef.current.emit('send_meet_message', {
          meetCode: meetSessionCode,
          senderId: user.id,
          type: 'draw_sync',
          payload: { slides: updated }
        });
      }
    }
    setCurrentLine([]);
  };

  const clearSlideDrawings = () => {
    const updated = slides.map((s, idx) => {
      if (idx === presentIdx) {
        return { ...s, drawings: [] };
      }
      return s;
    });
    setSlides(updated);

    if (isMeetActive && isPresenter && socketRef.current) {
      socketRef.current.emit('send_meet_message', {
        meetCode: meetSessionCode,
        senderId: user.id,
        type: 'draw_sync',
        payload: { slides: updated }
      });
    }
  };

  // Database Save
  const handleSave = async () => {
    if (!user?.id) {
      alert("Local Cache Mode: Saving offline since no active session is found.");
      localStorage.setItem('local_presentation', JSON.stringify({ slides, theme, title }));
      return;
    }

    setIsSaving(true);
    const docData = {
      docType: 'Presentation',
      title,
      slides: JSON.stringify(slides),
      theme,
      date: new Date().toISOString().split('T')[0],
      invoiceNumber: `PRE-${Date.now().toString().slice(-4)}`,
      total: 0,
      updatedAt: new Date().toISOString()
    };

    try {
      if (id) {
        await updateItem('documents', id, docData, user.id);
        alert('Presentation saved successfully!');
      } else {
        const res = await addItem('documents', { ...docData, createdAt: new Date().toISOString() }, user.id);
        alert('Presentation created successfully!');
        if (res && res.id) {
          navigate(`/presentations/edit/${res.id}`);
        }
      }
    } catch (err) {
      console.error('Failed to save document:', err);
      alert('Save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  // Load Business templates
  const loadPrebuiltTemplate = (type) => {
    let tSlides = [];
    if (type === 'pitch') {
      tSlides = [
        {
          id: 'slide-t1',
          theme: 'royal',
          bgColor: '', bgGradient: '', bgImage: '', transition: 'zoom', transitionSpeed: 'default',
          elements: [
            { id: 't1-e1', type: 'text', x: 10, y: 25, w: 80, h: 20, text: 'NEXUS AUTOMATION INC.', style: { color: '#a5b4fc', fontSize: 3.6, fontFamily: 'Inter', fontWeight: 'bold', textAlign: 'center' } },
            { id: 't1-e2', type: 'text', x: 15, y: 50, w: 70, h: 10, text: 'Disrupting industry operations with cognitive cloud solutions.', style: { color: '#eef2ff', fontSize: 1.6, fontFamily: 'Inter', textAlign: 'center' } },
            { id: 't1-e3', type: 'shape', shapeType: 'rect', x: 45, y: 65, w: 10, h: 1, text: '', style: { fillColor: '#f43f5e' } }
          ],
          drawings: []
        },
        {
          id: 'slide-t2',
          theme: 'royal',
          bgColor: '', bgGradient: '', bgImage: '', transition: 'slide', transitionSpeed: 'default',
          elements: [
            { id: 't2-e1', type: 'text', x: 8, y: 8, w: 84, h: 12, text: 'The Core Market Problem', style: { color: '#a5b4fc', fontSize: 2.5, fontFamily: 'Inter', fontWeight: 'bold' } },
            { id: 't2-e2', type: 'text', x: 8, y: 25, w: 42, h: 60, text: '• Heavy reliance on legacy servers leads to bottleneck latencies.\n• Manual auditing cycles generate excessive costs.\n• Fragmented logistics tracking increases shipment loss rate by 14% annually.', style: { color: '#eef2ff', fontSize: 1.4, fontFamily: 'Inter' } },
            { id: 't2-e3', type: 'shape', shapeType: 'circle', x: 62, y: 30, w: 25, h: 44, text: '14%\nLoss Rate', style: { fillColor: '#312e81', color: '#f43f5e', fontSize: 2.2, fontWeight: 'bold', textAlign: 'center' } }
          ],
          drawings: []
        },
        {
          id: 'slide-t3',
          theme: 'royal',
          bgColor: '', bgGradient: '', bgImage: '', transition: 'fade', transitionSpeed: 'default',
          elements: [
            { id: 't3-e1', type: 'text', x: 8, y: 8, w: 84, h: 12, text: 'Cognitive Sales Velocity', style: { color: '#a5b4fc', fontSize: 2.5, fontFamily: 'Inter', fontWeight: 'bold' } },
            { id: 't3-e2', type: 'chart', chartType: 'bar', x: 10, y: 25, w: 80, h: 60, chartData: [{ name: 'Q1', value: 3400 }, { name: 'Q2', value: 5900 }, { name: 'Q3', value: 8700 }, { name: 'Q4', value: 12400 }], style: { fillColor: '#f43f5e', color: '#eef2ff' } }
          ],
          drawings: []
        }
      ];
    } else if (type === 'billing') {
      tSlides = [
        {
          id: 'slide-b1',
          theme: 'glass',
          bgColor: '', bgGradient: '', bgImage: '', transition: 'convex', transitionSpeed: 'default',
          elements: [
            { id: 'b1-e1', type: 'text', x: 8, y: 22, w: 84, h: 15, text: 'FINANCIAL STATUS REPORT', style: { color: '#10b981', fontSize: 3.2, fontFamily: 'Inter', fontWeight: 'bold', textAlign: 'center' } },
            { id: 'b1-e2', type: 'text', x: 10, y: 42, w: 80, h: 10, text: 'Operational Auditing & Client Receivables', style: { color: '#f9fafb', fontSize: 1.6, fontFamily: 'Inter', textAlign: 'center' } },
            { id: 'b1-e3', type: 'table', x: 15, y: 58, w: 70, h: 32, tableData: [['Entity', 'Budget', 'Spent', 'Variance'], ['Development', '$150k', '$132k', '-12%'], ['Marketing', '$85k', '$92k', '+8%'], ['Total', '$235k', '$224k', '-4.6%']], style: { fillColor: '#1f2937', color: '#f9fafb', borderColor: '#10b981', borderWidth: 1 } }
          ],
          drawings: []
        },
        {
          id: 'slide-b2',
          theme: 'glass',
          bgColor: '', bgGradient: '', bgImage: '', transition: 'slide', transitionSpeed: 'default',
          elements: [
            { id: 'b2-e1', type: 'text', x: 8, y: 8, w: 84, h: 12, text: 'Monthly Expenditure Stream', style: { color: '#10b981', fontSize: 2.4, fontFamily: 'Inter', fontWeight: 'bold' } },
            { id: 'b2-e2', type: 'chart', chartType: 'line', x: 10, y: 24, w: 80, h: 64, chartData: [{ name: 'Jan', value: 450 }, { name: 'Feb', value: 600 }, { name: 'Mar', value: 550 }, { name: 'Apr', value: 800 }, { name: 'May', value: 920 }, { name: 'Jun', value: 1100 }], style: { fillColor: '#10b981', color: '#f9fafb' } }
          ],
          drawings: []
        }
      ];
    }
    setSlides(tSlides);
    setTheme(tSlides[0].theme);
    setActiveIdx(0);
    setSelectedElId(null);
  };

  // EXPORT 1: PowerPoint PPTX Export (Math converted widescreen inches coordinate mapper)
  const handleExportPPTX = async () => {
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches

    slides.forEach((slide) => {
      const pptSlide = pptx.addSlide();
      const t = THEMES[slide.theme] || THEMES.modern;
      
      // Background colors
      const bgHex = (slide.bgColor || t.bg).replace('#', '');
      pptSlide.background = { color: bgHex };

      slide.elements.forEach((el) => {
        // Coordinate conversions
        const rx = (el.x / 100) * 13.33;
        const ry = (el.y / 100) * 7.5;
        const rw = (el.w / 100) * 13.33;
        const rh = (el.h / 100) * 7.5;

        if (el.type === 'text') {
          pptSlide.addText(el.text, {
            x: rx, y: ry, w: rw, h: rh,
            fontSize: (el.style.fontSize || 1.4) * 12,
            color: (el.style.color || t.text).replace('#', ''),
            fontFace: el.style.fontFamily || 'Arial',
            bold: el.style.fontWeight === 'bold',
            italic: el.style.fontStyle === 'italic',
            underline: el.style.textDecoration === 'underline',
            align: el.style.textAlign || 'left',
            valign: 'middle',
            fill: el.style.fillColor ? { color: el.style.fillColor.replace('#', '') } : undefined
          });
        } 
        else if (el.type === 'shape') {
          const shapesMap = {
            rect: pptx.ShapeType.rect,
            circle: pptx.ShapeType.oval,
            triangle: pptx.ShapeType.triangle,
            arrow: pptx.ShapeType.rightArrow,
            star: pptx.ShapeType.star5
          };
          pptSlide.addShape(shapesMap[el.shapeType] || pptx.ShapeType.rect, {
            x: rx, y: ry, w: rw, h: rh,
            fill: { color: (el.style.fillColor || t.accent).replace('#', '') },
            line: el.style.borderColor ? { color: el.style.borderColor.replace('#', ''), width: el.style.borderWidth || 1 } : undefined
          });
          if (el.text) {
            pptSlide.addText(el.text, {
              x: rx, y: ry, w: rw, h: rh,
              fontSize: (el.style.fontSize || 1.2) * 12,
              color: (el.style.color || '#ffffff').replace('#', ''),
              fontFace: el.style.fontFamily || 'Arial',
              bold: el.style.fontWeight === 'bold',
              align: 'center',
              valign: 'middle'
            });
          }
        } 
        else if (el.type === 'image') {
          // pptxgenjs requires url path or data uri
          try {
            pptSlide.addImage({
              path: el.imageUrl,
              x: rx, y: ry, w: rw, h: rh
            });
          } catch(e) {
            console.error('Image export failed:', e);
          }
        }
        else if (el.type === 'table') {
          const cells = el.tableData.map(row => 
            row.map(cell => ({ text: cell, options: { fill: '1e293b', color: 'ffffff', fontSize: 10 } }))
          );
          pptSlide.addTable(cells, { x: rx, y: ry, w: rw, h: rh });
        }
      });
    });

    pptx.writeFile({ fileName: `${title}.pptx` });
  };

  // EXPORT 2: Download Standalone HTML Presentation (Reveal.js powered bundle)
  const handleExportHTML = () => {
    const themeStylesheet = `
      body { background-color: #0b0f19; font-family: 'Inter', sans-serif; margin: 0; }
      .reveal .slides { text-align: left; }
      .slide-content-wrapper { position: relative; width: 100%; height: 100%; overflow: hidden; }
      .element-renderer { position: absolute; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; }
      .shape-svg { width: 100%; height: 100%; }
      .shape-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
      .table-render { width: 100%; height: 100%; border-collapse: collapse; }
      .table-render td { padding: 8px; border: 1px solid rgba(255,255,255,0.15); }
      .chart-render { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: rgba(255,255,255,0.02); border-radius: 4px; color: #94a3b8; font-size: 11px; border: 1px dashed rgba(255,255,255,0.1); }
    `;

    const slidesHtml = slides.map(s => {
      const themePreset = THEMES[s.theme] || THEMES.modern;
      const bg = s.bgColor || themePreset.bg;
      const bgGrad = s.bgGradient || (s.bgColor ? '' : themePreset.gradient);
      const bgImg = s.bgImage ? `data-background-image="${s.bgImage}"` : '';

      const elementsHtml = s.elements.map(el => {
        let insideHtml = '';
        let borderStyle = el.style.borderWidth ? `${el.style.borderWidth}px solid ${el.style.borderColor || '#fff'}` : 'none';
        let borderRadius = el.style.borderRadius ? `${el.style.borderRadius}px` : '0px';

        const styleAttrs = `
          left: ${el.x}%; top: ${el.y}%; width: ${el.w}%; height: ${el.h}%;
          color: ${el.style.color || themePreset.text};
          font-family: ${el.style.fontFamily || 'Inter'};
          font-size: ${el.style.fontSize || 1.5}rem;
          font-weight: ${el.style.fontWeight || 'normal'};
          font-style: ${el.style.fontStyle || 'normal'};
          text-decoration: ${el.style.textDecoration || 'none'};
          text-align: ${el.style.textAlign || 'left'};
          background-color: ${el.style.fillColor || 'transparent'};
          border: ${borderStyle};
          border-radius: ${borderRadius};
        `;

        if (el.type === 'text') {
          insideHtml = `<div style="padding: 4px; white-space: pre-wrap;">${el.text}</div>`;
        } 
        else if (el.type === 'shape') {
          let svgShape = '';
          if (el.shapeType === 'circle') svgShape = `<circle cx="50%" cy="50%" r="48%" fill="${el.style.fillColor}" stroke="${el.style.borderColor || 'none'}" stroke-width="${el.style.borderWidth || 0}" />`;
          else if (el.shapeType === 'triangle') svgShape = `<polygon points="50,5 95,90 5,90" fill="${el.style.fillColor}" stroke="${el.style.borderColor || 'none'}" stroke-width="${el.style.borderWidth || 0}" />`;
          else if (el.shapeType === 'arrow') svgShape = `<polygon points="5,35 60,35 60,15 95,50 60,85 60,65 5,65" fill="${el.style.fillColor}" stroke="${el.style.borderColor || 'none'}" stroke-width="${el.style.borderWidth || 0}" />`;
          else svgShape = `<rect width="100%" height="100%" fill="${el.style.fillColor}" rx="${borderRadius}" stroke="${el.style.borderColor || 'none'}" stroke-width="${el.style.borderWidth || 0}" />`;

          insideHtml = `
            <svg class="shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none">${svgShape}</svg>
            <div class="shape-text" style="color: ${el.style.color || '#fff'}">${el.text || ''}</div>
          `;
        }
        else if (el.type === 'image') {
          insideHtml = `<img src="${el.imageUrl}" style="width:100%; height:100%; object-fit:cover;" />`;
        }
        else if (el.type === 'table') {
          const rows = el.tableData.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
          insideHtml = `<table class="table-render">${rows}</table>`;
        }
        else if (el.type === 'chart') {
          insideHtml = `<div class="chart-render">📊 Live Chart [${el.chartType.toUpperCase()}]</div>`;
        }

        const fragmentClass = el.animation && el.animation !== 'none' ? `fragment ${el.animation}` : '';
        const fragOrder = el.animationOrder ? `data-fragment-index="${el.animationOrder}"` : '';

        return `
          <div class="element-renderer ${fragmentClass}" ${fragOrder} style="${styleAttrs}">
            ${insideHtml}
          </div>
        `;
      }).join('\n');

      return `
        <section 
          data-transition="${s.transition || 'slide'}" 
          data-background-color="${bg}" 
          data-background-gradient="${bgGrad}"
          ${bgImg}
        >
          <div class="slide-content-wrapper">
            ${elementsHtml}
          </div>
        </section>
      `;
    }).join('\n');

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/reveal.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/theme/black.min.css">
  <style>${themeStylesheet}</style>
</head>
<body>
  <div class="reveal">
    <div class="slides">
      ${slidesHtml}
    </div>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/reveal.js"></script>
  <script>
    Reveal.initialize({
      controls: true,
      progress: true,
      center: true,
      hash: true,
      width: 1280,
      height: 720,
      margin: 0.1
    });
  </script>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title}.html`;
    link.click();
  };

  // EXPORT 3: Download Presentation structure as JSON config
  const handleExportJSON = () => {
    const config = { title, theme, slides };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title}.json`;
    link.click();
  };

  // IMPORT: Load configuration JSON presentation
  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (data.slides && Array.isArray(data.slides)) {
          setSlides(data.slides);
          if (data.theme) applyTheme(data.theme);
          if (data.title) setTitle(data.title);
          setActiveIdx(0);
          setSelectedElId(null);
          alert('Presentation configuration imported successfully!');
        }
      } catch (err) {
        alert('Invalid configuration file.');
      }
    };
    reader.readAsText(file);
  };

  // Render elements in editor canvas
  const renderElement = (el) => {
    const isSelected = el.id === selectedElId;
    const t = THEMES[theme];

    let content = null;
    let customBorder = el.style.borderWidth ? `${el.style.borderWidth}px solid ${el.style.borderColor || '#fff'}` : 'none';
    let customRadius = el.style.borderRadius ? `${el.style.borderRadius}px` : '0px';

    const baseStyle = {
      position: 'absolute',
      left: `${el.x}%`,
      top: `${el.y}%`,
      width: `${el.w}%`,
      height: `${el.h}%`,
      cursor: editingElId === el.id ? 'text' : 'move',
      color: el.style.color || t.text,
      fontFamily: el.style.fontFamily || 'Inter',
      fontSize: `${(el.style.fontSize || 1.5) * 10}px`,
      fontWeight: el.style.fontWeight || 'normal',
      fontStyle: el.style.fontStyle || 'normal',
      textDecoration: el.style.textDecoration || 'none',
      textAlign: el.style.textAlign || 'left',
      backgroundColor: el.style.fillColor || 'transparent',
      border: isSelected ? '1px dashed #6366f1' : customBorder,
      borderRadius: customRadius,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
      zIndex: isSelected ? 100 : 10
    };

    if (el.type === 'text') {
      content = (
        <div style={{ padding: '4px', height: '100%', overflow: 'hidden', whiteSpace: 'pre-wrap' }}>
          {el.text}
        </div>
      );
    } 
    else if (el.type === 'shape') {
      let svgShape = null;
      if (el.shapeType === 'circle') {
        svgShape = <circle cx="50%" cy="50%" r="48%" fill={el.style.fillColor || t.accent} stroke={el.style.borderColor || 'none'} strokeWidth={el.style.borderWidth || 0} />;
      } else if (el.shapeType === 'triangle') {
        svgShape = <polygon points="50,5 95,90 5,90" fill={el.style.fillColor || t.accent} stroke={el.style.borderColor || 'none'} strokeWidth={el.style.borderWidth || 0} />;
      } else if (el.shapeType === 'arrow') {
        svgShape = <polygon points="5,35 60,35 60,15 95,50 60,85 60,65 5,65" fill={el.style.fillColor || t.accent} stroke={el.style.borderColor || 'none'} strokeWidth={el.style.borderWidth || 0} />;
      } else if (el.shapeType === 'star') {
        svgShape = <polygon points="50,5 64,36 98,36 70,57 81,91 50,70 19,91 30,57 2,36 36,36" fill={el.style.fillColor || t.accent} stroke={el.style.borderColor || 'none'} strokeWidth={el.style.borderWidth || 0} />;
      } else {
        svgShape = <rect width="100%" height="100%" fill={el.style.fillColor || t.accent} rx={customRadius} stroke={el.style.borderColor || 'none'} strokeWidth={el.style.borderWidth || 0} />;
      }

      content = (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <svg style={{ width: '100%', height: '100%' }} viewBox="0 0 100 100" preserveAspectRatio="none">
            {svgShape}
          </svg>
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: el.style.color || '#fff',
            fontSize: '11px',
            padding: '4px',
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
            {el.text}
          </div>
        </div>
      );
    }
    else if (el.type === 'image') {
      content = (
        <img 
          src={el.imageUrl} 
          alt="Slide graphic" 
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: customRadius }} 
          draggable={false}
        />
      );
    }
    else if (el.type === 'chart') {
      content = (
        <div style={{ flex: 1, overflow: 'hidden', padding: '6px 4px 0' }}>
          <SafeChart type={el.chartType} data={el.chartData} style={el.style} />
        </div>
      );
    }
    else if (el.type === 'table') {
      content = <TableElement data={el.tableData} style={el.style} />;
    }

    return (
      <div
        key={el.id}
        style={baseStyle}
        onMouseDown={(e) => handleElementMouseDown(e, el, 'drag')}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setEditingElId(el.id);
        }}
      >
        {/* Inline text editing portal */}
        {editingElId === el.id ? (
          <textarea
            autoFocus
            className="canvas-inline-editor"
            value={el.text || ''}
            onChange={(e) => updateElement(el.id, { text: e.target.value })}
            onBlur={() => setEditingElId(null)}
            style={{
              color: el.style.color || t.text,
              fontSize: '1em',
              fontFamily: el.style.fontFamily || 'Inter',
              textAlign: el.style.textAlign || 'left',
              fontWeight: el.style.fontWeight || 'normal'
            }}
          />
        ) : content}

        {/* Selected outline handles */}
        {isSelected && editingElId !== el.id && (
          <>
            <div className="resize-handle tl" onMouseDown={(e) => handleElementMouseDown(e, el, 'topleft')} />
            <div className="resize-handle tr" onMouseDown={(e) => handleElementMouseDown(e, el, 'topright')} />
            <div className="resize-handle bl" onMouseDown={(e) => handleElementMouseDown(e, el, 'bottomleft')} />
            <div className="resize-handle br" onMouseDown={(e) => handleElementMouseDown(e, el, 'bottomright')} />
            <div className="resize-handle top" onMouseDown={(e) => handleElementMouseDown(e, el, 'top')} />
            <div className="resize-handle bottom" onMouseDown={(e) => handleElementMouseDown(e, el, 'bottom')} />
            <div className="resize-handle left" onMouseDown={(e) => handleElementMouseDown(e, el, 'left')} />
            <div className="resize-handle right" onMouseDown={(e) => handleElementMouseDown(e, el, 'right')} />
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="pres-loading-scr">Loading presentation engine...</div>;
  }

  // --- PRESENT MODE VIEWPORT ---
  if (isPresenting) {
    const currentSlideRecord = slides[presentIdx];
    const themePreset = THEMES[currentSlideRecord.theme] || THEMES.modern;
    const bgVal = currentSlideRecord.bgColor || themePreset.bg;
    const bgGrad = currentSlideRecord.bgGradient || (currentSlideRecord.bgColor ? '' : themePreset.gradient);

    return (
      <div 
        className={`present-overlay-container ${isPresenterConsole ? 'presenter-split' : ''}`}
        onMouseMove={handleLaserPointerMove}
      >
        {/* LASER POINTER GLOW EFFECT */}
        {laserPointerActive && (
          <>
            <div className="laser-dot" style={{ left: laserCoords.x, top: laserCoords.y }} />
            {laserTrail.map(t => (
              <div key={t.id} className="laser-trail" style={{ left: t.x, top: t.y }} />
            ))}
          </>
        )}

        {/* PUBLIC PRESENTATION PANEL */}
        <div className="present-main-screen">
          <div className="reveal" ref={revealContainerRef} style={{ width: '100%', height: '100%' }}>
            <div className="slides">
              {slides.map((s, sIdx) => {
                const innerTheme = THEMES[s.theme] || THEMES.modern;
                const innerBg = s.bgColor || innerTheme.bg;
                const innerBgGrad = s.bgGradient || (s.bgColor ? '' : innerTheme.gradient);

                return (
                  <section 
                    key={s.id} 
                    data-transition={s.transition || 'slide'}
                    data-transition-speed={s.transitionSpeed || 'default'}
                    data-background-color={innerBg}
                    data-background-gradient={innerBgGrad}
                    data-background-image={s.bgImage || ''}
                  >
                    <div className="slide-content-wrapper" style={{ position: 'relative', width: '1280px', height: '720px', margin: '0 auto', overflow: 'hidden' }}>
                      {s.elements.map(el => {
                        let renderable = null;
                        let customRadius = el.style.borderRadius ? `${el.style.borderRadius}px` : '0px';

                        if (el.type === 'text') {
                          renderable = <div style={{ padding: '6px', whiteSpace: 'pre-wrap' }}>{el.text}</div>;
                        } 
                        else if (el.type === 'shape') {
                          let svgShape = null;
                          if (el.shapeType === 'circle') svgShape = <circle cx="50%" cy="50%" r="48%" fill={el.style.fillColor || innerTheme.accent} />;
                          else if (el.shapeType === 'triangle') svgShape = <polygon points="50,5 95,90 5,90" fill={el.style.fillColor || innerTheme.accent} />;
                          else if (el.shapeType === 'arrow') svgShape = <polygon points="5,35 60,35 60,15 95,50 60,85 60,65 5,65" fill={el.style.fillColor || innerTheme.accent} />;
                          else svgShape = <rect width="100%" height="100%" fill={el.style.fillColor || innerTheme.accent} rx={customRadius} />;

                          renderable = (
                            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                              <svg style={{ width: '100%', height: '100%' }} viewBox="0 0 100 100" preserveAspectRatio="none">{svgShape}</svg>
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: el.style.color || '#fff', fontSize: '1.2rem', textAlign: 'center', pointerEvents: 'none' }}>
                                {el.text}
                              </div>
                            </div>
                          );
                        }
                        else if (el.type === 'image') {
                          renderable = <img src={el.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
                        }
                        else if (el.type === 'table') {
                          renderable = <TableElement data={el.tableData} style={el.style} />;
                        }
                        else if (el.type === 'chart') {
                          renderable = <SafeChart type={el.chartType} data={el.chartData} style={el.style} />;
                        }

                        const elementStyle = {
                          position: 'absolute',
                          left: `${el.x}%`,
                          top: `${el.y}%`,
                          width: `${el.w}%`,
                          height: `${el.h}%`,
                          color: el.style.color || innerTheme.text,
                          fontFamily: el.style.fontFamily || 'Inter',
                          fontSize: `${(el.style.fontSize || 1.5) * 12}px`,
                          fontWeight: el.style.fontWeight || 'normal',
                          fontStyle: el.style.fontStyle || 'normal',
                          textAlign: el.style.textAlign || 'left',
                          background: el.style.fillColor || 'transparent',
                          border: el.style.borderWidth ? `${el.style.borderWidth}px solid ${el.style.borderColor || '#fff'}` : 'none',
                          borderRadius: customRadius,
                        };

                        const animClass = el.animation && el.animation !== 'none' ? `fragment ${el.animation}` : '';

                        return (
                          <div 
                            key={el.id} 
                            className={animClass} 
                            data-fragment-index={el.animationOrder || 0}
                            style={elementStyle}
                          >
                            {renderable}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>

            {/* HAND-DRAWING PEN OVERLAY CANVAS */}
            <canvas
              ref={presentCanvasRef}
              width={1280}
              height={720}
              className={`slides-scribble-canvas ${penActive ? 'pen-active' : ''}`}
              onMouseDown={handleDrawingStart}
              onMouseMove={handleDrawingMove}
              onMouseUp={handleDrawingEnd}
              onMouseLeave={handleDrawingEnd}
            />
          </div>

          {/* Quick HUD Navigation tools overlay */}
          <div className="present-floating-nav">
            <button onClick={handlePrevSlide} title="Previous Slide">◀</button>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{presentIdx + 1} / {slides.length}</span>
            <button onClick={handleNextSlide} title="Next Slide">▶</button>
            
            <div className="floating-nav-sep" />
            
            <button 
              className={`hud-toggle ${penActive ? 'active' : ''}`} 
              onClick={() => { setPenActive(!penActive); setLaserPointerActive(false); }}
              title="Toggle Draw Pen"
            >
              <PenTool size={13} />
            </button>
            <button 
              className={`hud-toggle ${laserPointerActive ? 'active' : ''}`} 
              onClick={() => { setLaserPointerActive(!laserPointerActive); setPenActive(false); }}
              title="Toggle Laser Pointer"
            >
              <Eye size={13} />
            </button>
            <button 
              onClick={clearSlideDrawings}
              title="Clear drawings"
            >
              <Eraser size={13} />
            </button>
            
            <div className="floating-nav-sep" />
            
            <button onClick={() => setIsPresenterConsole(!isPresenterConsole)} title="Toggle Presenter View Console">
              <Monitor size={13} /> Console
            </button>
            <button onClick={() => setIsPresenting(false)} style={{ color: '#ef4444' }} title="Exit Presentation Mode">
              Exit
            </button>
          </div>
        </div>

        {/* PRESENTER SIDEBAR DASHBOARD VIEW */}
        {isPresenterConsole && (
          <div className="presenter-console-dashboard">
            <div className="console-section-header">
              <Clock size={16} />
              <span>Presenter Controls</span>
            </div>
            
            {/* TIMER DISPLAY */}
            <div className="console-timer-wrap">
              <div className="timer-numbers">{formatTime(elapsedTime)}</div>
              <div className="timer-controls">
                <button onClick={() => setTimerActive(true)}>Start</button>
                <button onClick={() => setTimerActive(false)}>Pause</button>
                <button onClick={() => setElapsedTime(0)}>Reset</button>
              </div>
            </div>

            {/* NEXT SLIDE PREVIEW */}
            <div className="console-preview-section">
              <div className="console-label">Upcoming Slide</div>
              {presentIdx < slides.length - 1 ? (
                <div className="next-slide-mini-preview" style={{ background: THEMES[slides[presentIdx + 1].theme]?.bg }}>
                  <div style={{ color: '#fff', fontSize: '9px', fontWeight: 'bold' }}>{slides[presentIdx + 1].elements.find(e => e.type === 'text')?.text?.slice(0, 30) || 'Slide Title'}</div>
                  <div style={{ color: '#94a3b8', fontSize: '7px' }}>Contains {slides[presentIdx + 1].elements.length} components</div>
                </div>
              ) : (
                <div className="next-slide-mini-preview empty">End of Presentation</div>
              )}
            </div>

            {/* SPEAKER NOTES */}
            <div className="console-notes-section">
              <div className="console-label">Speaker Notes</div>
              <textarea 
                className="console-notes-text"
                placeholder="Enter notes..."
                value={slides[presentIdx]?.notes || ''}
                onChange={(e) => {
                  const updated = slides.map((s, sIdx) => {
                    if (sIdx === presentIdx) return { ...s, notes: e.target.value };
                    return s;
                  });
                  setSlides(updated);
                }}
              />
            </div>

            {/* PEN COLOR CONTROLS */}
            <div className="console-pen-controls">
              <div className="console-label">Pen Color</div>
              <div className="draw-colors">
                {['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#ffffff'].map(c => (
                  <button 
                    key={c}
                    className={`color-dot ${drawColor === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => { setDrawColor(c); setPenActive(true); }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- EDITOR MODE INTERFACE ---
  return (
    <div className="pres-container">
      {/* Top Header Controls bar */}
      <div className="pres-header">
        <div className="pres-header-left">
          <button className="pres-back-btn" onClick={() => navigate('/editor')}>
            <ChevronLeft size={16} /> Back
          </button>
          <div className="pres-title-wrap">
            <Monitor size={16} style={{ color: '#6366f1' }} />
            <input 
              type="text"
              className="pres-title-input" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="Enter presentation title..."
            />
          </div>
        </div>

        <div className="pres-header-right">
          <span className="pres-slide-count">{slides.length} Slides</span>
          
          {/* Export Options Dropdown */}
          <div className="export-dropdown-wrapper">
            <button className="pres-btn"><Download size={14} /> Export Options</button>
            <div className="export-menu">
              <button onClick={handleExportPPTX}><Monitor size={13} /> PowerPoint (.pptx)</button>
              <button onClick={handleExportHTML}><FileCode size={13} /> Standalone Web (.html)</button>
              <button onClick={handleExportJSON}><FileJson size={13} /> JSON Configuration</button>
              <button onClick={() => window.print()}><ImageIcon size={13} /> PDF Document</button>
            </div>
          </div>

          <button 
            className={`pres-btn ${isMeetActive ? 'primary active-meet-btn' : ''}`} 
            onClick={() => setShowMeetPanel(!showMeetPanel)}
            style={{ position: 'relative' }}
          >
            <Video size={14} /> 
            {isMeetActive ? 'Meet: Active' : 'Live Meet'}
            {isMeetActive && <span className="meet-glowing-indicator" style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />}
          </button>

          <button className="pres-btn" onClick={handleSave} disabled={isSaving}>
            <Save size={14} /> {isSaving ? 'Saving...' : 'Save'}
          </button>
          
          <button className="pres-btn primary" onClick={() => togglePresentMode(activeIdx)}>
            <Play size={14} /> Present Slides
          </button>
        </div>
      </div>

      {/* Insert Tool Shelf */}
      <div className="insert-tool-shelf">
        <div className="insert-label">INSERT:</div>
        <button className="shelf-btn" onClick={() => addElement('text')}><Type size={14} /> Text Box</button>
        
        <div className="shelf-separator" />
        
        <div className="shelf-btn-group">
          <button className="shelf-btn" onClick={() => addElement('shape', { shapeType: 'rect' })}><Square size={14} /> Rect</button>
          <button className="shelf-btn" onClick={() => addElement('shape', { shapeType: 'circle' })}><Circle size={14} /> Circle</button>
          <button className="shelf-btn" onClick={() => addElement('shape', { shapeType: 'triangle' })}>▲ Triangle</button>
          <button className="shelf-btn" onClick={() => addElement('shape', { shapeType: 'arrow' })}>➔ Arrow</button>
          <button className="shelf-btn" onClick={() => addElement('shape', { shapeType: 'star' })}>★ Star</button>
        </div>

        <div className="shelf-separator" />

        <button className="shelf-btn" onClick={() => {
          const url = prompt("Enter Image URL (leave blank for template image):");
          addElement('image', { url });
        }}><ImageIcon size={14} /> Image Box</button>
        
        <button className="shelf-btn" onClick={() => addElement('chart', { chartType: 'bar' })}><BarChart3 size={14} /> Bar Chart</button>
        <button className="shelf-btn" onClick={() => addElement('chart', { chartType: 'line' })}><Activity size={14} /> Line Chart</button>
        <button className="shelf-btn" onClick={() => addElement('chart', { chartType: 'pie' })}><PlusCircle size={14} /> Pie Chart</button>
        <button className="shelf-btn" onClick={() => addElement('table')}><TableIcon size={14} /> Table</button>

        <div className="shelf-separator" />

        {/* Load templates quick shortcut */}
        <div className="template-quick-picker">
          <button className="shelf-btn"><Palette size={14} /> Prebuilt Templates</button>
          <div className="templates-dropdown">
            <button onClick={() => loadPrebuiltTemplate('pitch')}>Business Pitch Deck</button>
            <button onClick={() => loadPrebuiltTemplate('billing')}>Expenditure Report</button>
          </div>
        </div>

        {/* File Config Uploader */}
        <label className="import-file-btn">
          <Upload size={14} /> Import Config
          <input type="file" accept=".json" onChange={handleImportJSON} style={{ display: 'none' }} />
        </label>
      </div>

      <div className="pres-body">
        {/* Left Slides Thumbnail Panel */}
        <div className="pres-slide-panel">
          <div className="pres-panel-header">
            <span>Slides List</span>
            <button className="slide-add-btn" onClick={() => addSlide('content')} title="Add new blank content slide">
              <Plus size={12} /> Slide
            </button>
          </div>
          
          <div className="pres-thumbnails">
            {slides.map((s, idx) => {
              const themeStyle = THEMES[s.theme] || THEMES.modern;
              const bgGrad = s.bgGradient || (s.bgColor ? '' : themeStyle.gradient);
              return (
                <div 
                  key={s.id} 
                  className={`pres-thumb ${idx === activeIdx ? 'active' : ''}`}
                  onClick={() => { setActiveIdx(idx); setSelectedElId(null); }}
                >
                  <div className="pres-thumb-num">{idx + 1}</div>
                  <div 
                    className="pres-thumb-preview" 
                    style={{ 
                      backgroundColor: s.bgColor || themeStyle.bg,
                      backgroundImage: bgGrad
                    }}
                  >
                    <div className="preview-items-density">
                      {s.elements.map(el => (
                        <div 
                          key={el.id} 
                          className="mini-preview-el" 
                          style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main central canvas viewport */}
        <div className="pres-canvas-area">
          <div className="pres-toolbar">
            <div className="pres-toolbar-group">
              <button className="tool-btn" onClick={duplicateElement} disabled={!selectedElId} title="Duplicate Element (Ctrl+D)"><Copy size={14} /></button>
              <button className="tool-btn danger" onClick={() => deleteElement(selectedElId)} disabled={!selectedElId} title="Delete Element"><Trash2 size={14} /></button>
              <button className="tool-btn" onClick={() => changeLayer('front')} disabled={!selectedElId} title="Bring to Front"><ChevronUp size={14} /></button>
              <button className="tool-btn" onClick={() => changeLayer('back')} disabled={!selectedElId} title="Send to Back"><ChevronDown size={14} /></button>
            </div>
            
            <div className="pres-toolbar-sep" />
            
            {/* Formatting Toolbar */}
            <div className="pres-toolbar-group">
              <button 
                className={`tool-btn ${activeSlide.elements.find(e => e.id === selectedElId)?.style.fontWeight === 'bold' ? 'active' : ''}`} 
                disabled={!selectedElId}
                onClick={() => {
                  const el = activeSlide.elements.find(e => e.id === selectedElId);
                  updateElement(selectedElId, { style: { fontWeight: el?.style.fontWeight === 'bold' ? 'normal' : 'bold' } });
                }}
                title="Bold"
              >
                <Bold size={14} />
              </button>
              <button 
                className={`tool-btn ${activeSlide.elements.find(e => e.id === selectedElId)?.style.fontStyle === 'italic' ? 'active' : ''}`} 
                disabled={!selectedElId}
                onClick={() => {
                  const el = activeSlide.elements.find(e => e.id === selectedElId);
                  updateElement(selectedElId, { style: { fontStyle: el?.style.fontStyle === 'italic' ? 'normal' : 'italic' } });
                }}
                title="Italic"
              >
                <Italic size={14} />
              </button>
              <button 
                className={`tool-btn ${activeSlide.elements.find(e => e.id === selectedElId)?.style.textDecoration === 'underline' ? 'active' : ''}`} 
                disabled={!selectedElId}
                onClick={() => {
                  const el = activeSlide.elements.find(e => e.id === selectedElId);
                  updateElement(selectedElId, { style: { textDecoration: el?.style.textDecoration === 'underline' ? 'none' : 'underline' } });
                }}
                title="Underline"
              >
                <Underline size={14} />
              </button>
            </div>

            <div className="pres-toolbar-sep" />

            {/* Alignment toggles */}
            <div className="pres-toolbar-group">
              {['left', 'center', 'right'].map(align => (
                <button
                  key={align}
                  className={`tool-btn ${activeSlide.elements.find(e => e.id === selectedElId)?.style.textAlign === align ? 'active' : ''}`}
                  disabled={!selectedElId}
                  onClick={() => updateElement(selectedElId, { style: { textAlign: align } })}
                  title={`Align ${align}`}
                >
                  {align === 'left' ? <AlignLeft size={14} /> : align === 'center' ? <AlignCenter size={14} /> : <AlignRight size={14} />}
                </button>
              ))}
            </div>
            
            <div className="pres-toolbar-sep" />
            
            {/* Quick slide reorder keys */}
            <div className="pres-toolbar-group">
              <button className="tool-btn" onClick={() => moveSlide(-1)} disabled={activeIdx === 0} title="Move slide up"><ChevronUp size={14} /></button>
              <button className="tool-btn" onClick={() => moveSlide(1)} disabled={activeIdx === slides.length - 1} title="Move slide down"><ChevronDown size={14} /></button>
            </div>
          </div>

          {/* Core Interactive Presentation Canvas */}
          <div className="pres-canvas-wrap">
            <div className="pres-slide-frame" style={{ width: '100%', maxWidth: '780px', aspectRatio: '16/9' }}>
              <div 
                ref={canvasRef} 
                className="slide-canvas" 
                style={{ 
                  backgroundColor: activeSlide.bgColor || THEMES[theme].bg,
                  backgroundImage: activeSlide.bgGradient ? activeSlide.bgGradient : (activeSlide.bgImage ? `url(${activeSlide.bgImage})` : THEMES[theme].gradient),
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden'
                }}
                onClick={() => setSelectedElId(null)}
              >
                {/* Visual alignment snapped lines */}
                {snapLineX !== null && (
                  <div className="align-snap-line-x" style={{ left: `${snapLineX}%` }} />
                )}
                {snapLineY !== null && (
                  <div className="align-snap-line-y" style={{ top: `${snapLineY}%` }} />
                )}

                {/* Draw elements */}
                {activeSlide.elements.map(el => renderElement(el))}
              </div>
            </div>
          </div>

          {/* Bottom Notes Section */}
          <div className="pres-notes-area">
            <Sliders size={14} style={{ color: '#64748b', marginTop: '2px' }} />
            <textarea 
              placeholder="Type presentation notes here (visible inside Presenter mode)..." 
              value={activeSlide.notes || ''}
              onChange={(e) => {
                const updated = slides.map((s, idx) => {
                  if (idx === activeIdx) return { ...s, notes: e.target.value };
                  return s;
                });
                setSlides(updated);
              }}
            />
          </div>
        </div>

        {/* Live Meet Session Panel */}
        {showMeetPanel && (
          <div className="pres-meet-panel" style={{ width: '320px', borderLeft: '1px solid #1e293b', background: '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="pres-panel-header" style={{ borderBottom: '1px solid #1e293b', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#eef2ff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><Video size={16} /> Live Session Meet</span>
              <button onClick={() => setShowMeetPanel(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>✖</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {!isMeetActive ? (
                <>
                  <div style={{ padding: '16px', background: '#1e293b', borderRadius: '8px', textAlign: 'center' }}>
                    <Users size={32} style={{ color: '#6366f1', marginBottom: '8px' }} />
                    <h3 style={{ color: '#f8fafc', fontSize: '14px', margin: '0 0 8px 0' }}>Start a Live Presentation</h3>
                    <p style={{ color: '#94a3b8', fontSize: '12px', margin: '0 0 16px 0' }}>Video call, screen share, and sync your presentation with attendees instantly.</p>
                    <button onClick={startMeetSession} style={{ width: '100%', padding: '10px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}>
                      Start New Session
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <hr style={{ flex: 1, borderColor: '#1e293b' }} />
                    <span style={{ color: '#64748b', fontSize: '12px' }}>OR</span>
                    <hr style={{ flex: 1, borderColor: '#1e293b' }} />
                  </div>
                  <div style={{ padding: '16px', background: '#1e293b', borderRadius: '8px' }}>
                    <h3 style={{ color: '#f8fafc', fontSize: '14px', margin: '0 0 8px 0' }}>Join Session</h3>
                    <input 
                      type="text" 
                      placeholder="Enter session code (e.g. PR-XXXX)" 
                      value={meetJoinInput}
                      onChange={e => setMeetJoinInput(e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px', marginBottom: '12px', textTransform: 'uppercase' }}
                    />
                    <button onClick={() => joinMeetSession(meetJoinInput)} disabled={!meetJoinInput.trim()} style={{ width: '100%', padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', opacity: meetJoinInput.trim() ? 1 : 0.5 }}>
                      Join Session
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Session Info */}
                  <div style={{ background: '#1e293b', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Session Code</span>
                      <span style={{ background: '#059669', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>Live</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <code style={{ flex: 1, background: '#0f172a', padding: '8px', borderRadius: '4px', color: '#38bdf8', fontSize: '16px', textAlign: 'center', letterSpacing: '1px' }}>{meetSessionCode}</code>
                      <button onClick={() => { navigator.clipboard.writeText(meetSessionCode); alert('Code copied!'); }} style={{ background: '#334155', border: 'none', color: '#fff', padding: '8px', borderRadius: '4px', cursor: 'pointer' }} title="Copy Code">
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Presenter Sync Control */}
                  {!isPresenter && (
                    <div style={{ background: '#1e293b', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="checkbox" 
                        id="sync_toggle" 
                        checked={isPresentSyncActive} 
                        onChange={e => setIsPresentSyncActive(e.target.checked)} 
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <label htmlFor="sync_toggle" style={{ color: '#f1f5f9', fontSize: '13px', cursor: 'pointer', flex: 1 }}>Follow Presenter Mode</label>
                    </div>
                  )}

                  {/* Local Video */}
                  <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
                    <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: isScreenSharing ? 'none' : 'scaleX(-1)' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                      <button onClick={toggleMic} style={{ background: isMicMuted ? '#ef4444' : 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '6px', borderRadius: '50%', cursor: 'pointer' }}>
                        {isMicMuted ? <MicOff size={16} /> : <Mic size={16} />}
                      </button>
                      <button onClick={toggleCam} style={{ background: isCamOff ? '#ef4444' : 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '6px', borderRadius: '50%', cursor: 'pointer' }}>
                        {isCamOff ? <VideoOff size={16} /> : <Video size={16} />}
                      </button>
                      <button onClick={isScreenSharing ? stopScreenShare : startScreenShare} style={{ background: isScreenSharing ? '#3b82f6' : 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '6px', borderRadius: '50%', cursor: 'pointer' }} title={isScreenSharing ? "Stop sharing" : "Share screen"}>
                        <MonitorUp size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Remote Videos */}
                  {remoteStreams.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {remoteStreams.map(rs => (
                        <div key={rs.userId} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
                          <video autoPlay playsInline ref={el => { if (el && el.srcObject !== rs.stream) el.srcObject = rs.stream; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>
                            {rs.userName}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Session Chat */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1e293b', borderRadius: '8px', overflow: 'hidden', minHeight: '200px' }}>
                    <div style={{ padding: '8px 12px', background: '#334155', fontSize: '12px', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageSquare size={14} /> Session Chat ({participants.length + 1})
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {chatMessages.length === 0 ? (
                        <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>No messages yet...</div>
                      ) : (
                        chatMessages.map((msg, i) => (
                          <div key={i} style={{ alignSelf: msg.senderId === user.id ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                            {msg.senderId !== user.id && <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>{msg.senderName}</div>}
                            <div style={{ background: msg.senderId === user.id ? '#6366f1' : '#334155', color: '#fff', padding: '6px 10px', borderRadius: '8px', fontSize: '13px' }}>
                              {msg.text}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <form onSubmit={sendChatMessage} style={{ display: 'flex', padding: '8px', background: '#0f172a', borderTop: '1px solid #334155' }}>
                      <input 
                        type="text" 
                        placeholder="Type message..." 
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: '13px', outline: 'none' }}
                      />
                      <button type="submit" style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer' }} disabled={!chatInput.trim()}>
                        <Send size={16} />
                      </button>
                    </form>
                  </div>
                  
                  {/* Exit Meet Button */}
                  <button onClick={endMeetSession} style={{ width: '100%', padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <PhoneOff size={16} /> End Session
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Right Tab controls Side bar */}
        <div className="pres-right-panel">
          <div className="pres-right-tabs">
            <button className={rightTab === 'design' ? 'active' : ''} onClick={() => setRightTab('design')}>
              <Palette size={13} /> Design
            </button>
            <button className={rightTab === 'layout' ? 'active' : ''} onClick={() => setRightTab('layout')}>
              <Layout size={13} /> Templates
            </button>
            <button className={rightTab === 'motion' ? 'active' : ''} onClick={() => setRightTab('motion')}>
              <PlayCircle size={13} /> Animations
            </button>
          </div>

          {/* Design Panel */}
          {rightTab === 'design' && (
            <div className="pres-right-content">
              <div className="pres-section-label">Aesthetic Themes</div>
              <div className="pres-theme-grid">
                {Object.entries(THEMES).map(([key, val]) => (
                  <button 
                    key={key} 
                    className={`pres-theme-swatch ${theme === key ? 'active' : ''}`}
                    style={{ background: val.gradient || val.bg }}
                    onClick={() => applyTheme(key)} 
                    title={key}
                  >
                    <div style={{ color: val.text, fontSize: '9px', fontWeight: 'bold' }}>{key.toUpperCase()}</div>
                    <div style={{ background: val.accent, height: '3px', borderRadius: '1.5px', marginTop: '4px', width: '15px' }} />
                  </button>
                ))}
              </div>

              <div className="pres-section-label" style={{ marginTop: '14px' }}>Custom Slide Background</div>
              <div className="bg-customizer-box">
                <div className="bg-input-field">
                  <label>Background Color</label>
                  <input 
                    type="color" 
                    value={activeSlide.bgColor || THEMES[theme].bg} 
                    onChange={e => {
                      const updated = slides.map((s, i) => i === activeIdx ? { ...s, bgColor: e.target.value, bgGradient: '', bgImage: '' } : s);
                      setSlides(updated);
                    }}
                  />
                </div>
                <div className="bg-input-field">
                  <label>Gradient CSS</label>
                  <input 
                    type="text" 
                    placeholder="linear-gradient(...)"
                    value={activeSlide.bgGradient || ''} 
                    onChange={e => {
                      const updated = slides.map((s, i) => i === activeIdx ? { ...s, bgGradient: e.target.value, bgColor: '', bgImage: '' } : s);
                      setSlides(updated);
                    }}
                  />
                </div>
                <div className="bg-input-field">
                  <label>Image Backdrop URL</label>
                  <input 
                    type="text" 
                    placeholder="https://..."
                    value={activeSlide.bgImage || ''} 
                    onChange={e => {
                      const updated = slides.map((s, i) => i === activeIdx ? { ...s, bgImage: e.target.value, bgColor: '', bgGradient: '' } : s);
                      setSlides(updated);
                    }}
                  />
                </div>
                <div className="stock-backdrops-strip">
                  {STOCK_IMAGES.map((url, uidx) => (
                    <button 
                      key={uidx}
                      style={{ backgroundImage: `url(${url})` }}
                      onClick={() => {
                        const updated = slides.map((s, i) => i === activeIdx ? { ...s, bgImage: url, bgColor: '', bgGradient: '' } : s);
                        setSlides(updated);
                      }}
                    />
                  ))}
                </div>
                <button 
                  className="reset-bg-btn" 
                  onClick={() => {
                    const updated = slides.map((s, i) => i === activeIdx ? { ...s, bgImage: '', bgColor: '', bgGradient: '' } : s);
                    setSlides(updated);
                  }}
                >
                  Reset Background to Theme
                </button>
              </div>

              {/* Element formatting settings */}
              {selectedElId && (
                <div className="element-styles-form" style={{ marginTop: '16px' }}>
                  <div className="pres-section-label">Component Properties</div>
                  
                  {/* Element position controls */}
                  {(() => {
                    const el = activeSlide.elements.find(e => e.id === selectedElId);
                    if (!el) return null;
                    return (
                      <>
                        <div className="coord-adjusters-grid">
                          <label>X: <input type="number" value={Math.round(el.x)} onChange={(e) => updateElement(el.id, { x: Number(e.target.value) })} />%</label>
                          <label>Y: <input type="number" value={Math.round(el.y)} onChange={(e) => updateElement(el.id, { y: Number(e.target.value) })} />%</label>
                          <label>W: <input type="number" value={Math.round(el.w)} onChange={(e) => updateElement(el.id, { w: Number(e.target.value) })} />%</label>
                          <label>H: <input type="number" value={Math.round(el.h)} onChange={(e) => updateElement(el.id, { h: Number(e.target.value) })} />%</label>
                        </div>

                        {/* Font sizes & styling */}
                        {['text', 'shape', 'table'].includes(el.type) && (
                          <div className="font-size-adjuster" style={{ marginTop: '8px' }}>
                            <label>Text size ({el.style.fontSize || 1.5}em)</label>
                            <input 
                              type="range" 
                              min={0.5} 
                              max={6} 
                              step={0.1}
                              value={el.style.fontSize || 1.5} 
                              onChange={(e) => updateElement(el.id, { style: { fontSize: Number(e.target.value) } })}
                            />
                            <div className="formatting-colors-strip">
                              <label>Color: <input type="color" value={el.style.color || '#ffffff'} onChange={(e) => updateElement(el.id, { style: { color: e.target.value } })} /></label>
                              <label>Fill: <input type="color" value={el.style.fillColor || '#ffffff'} onChange={(e) => updateElement(el.id, { style: { fillColor: e.target.value } })} /></label>
                            </div>
                          </div>
                        )}

                        {/* Chart Editor Data Input fields */}
                        {el.type === 'chart' && (
                          <div className="chart-data-editor-box" style={{ marginTop: '10px' }}>
                            <label style={{ fontSize: '0.68rem', fontWeight: 'bold', color: '#64748b' }}>CHART DATA SERIES</label>
                            <div className="chart-data-grid">
                              {el.chartData.map((d, didx) => (
                                <div key={didx} className="chart-data-row">
                                  <input 
                                    type="text" 
                                    value={d.name} 
                                    onChange={(e) => {
                                      const updatedData = [...el.chartData];
                                      updatedData[didx].name = e.target.value;
                                      updateElement(el.id, { chartData: updatedData });
                                    }}
                                  />
                                  <input 
                                    type="number" 
                                    value={d.value} 
                                    onChange={(e) => {
                                      const updatedData = [...el.chartData];
                                      updatedData[didx].value = Number(e.target.value);
                                      updateElement(el.id, { chartData: updatedData });
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                            <button 
                              className="add-chart-row-btn"
                              onClick={() => {
                                const updatedData = [...el.chartData, { name: 'New', value: 1000 }];
                                updateElement(el.id, { chartData: updatedData });
                              }}
                            >
                              Add Data Point
                            </button>
                          </div>
                        )}

                        {/* Image loader box */}
                        {el.type === 'image' && (
                          <div className="image-loader-field" style={{ marginTop: '8px' }}>
                            <label>Image Source Link</label>
                            <input 
                              type="text" 
                              value={el.imageUrl} 
                              onChange={(e) => updateElement(el.id, { imageUrl: e.target.value })}
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Templates Panel */}
          {rightTab === 'layout' && (
            <div className="pres-right-content">
              <div className="pres-section-label">Apply template layout</div>
              {Object.entries(LAYOUTS).map(([key, val]) => (
                <button 
                  key={key} 
                  className={`pres-layout-item ${activeSlide.layout === key ? 'active' : ''}`}
                  onClick={() => {
                    const templateSlide = createNewSlide(key, theme);
                    const updated = slides.map((s, i) => i === activeIdx ? { ...s, layout: key, elements: templateSlide.elements } : s);
                    setSlides(updated);
                    setSelectedElId(null);
                  }}
                >
                  <span className="pres-layout-icon">{val.icon}</span>
                  <span>{val.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Animations & Transitions Panel */}
          {rightTab === 'motion' && (
            <div className="pres-right-content">
              <div className="pres-section-label">Slide Transition (Reveal.js)</div>
              <div className="animation-form-group">
                <label>Transition Effect</label>
                <select 
                  className="pres-sidebar-select"
                  value={activeSlide.transition || 'slide'}
                  onChange={e => {
                    const updated = slides.map((s, i) => i === activeIdx ? { ...s, transition: e.target.value } : s);
                    setSlides(updated);
                  }}
                >
                  <option value="none">None (Instant)</option>
                  <option value="fade">Fade In/Out</option>
                  <option value="slide">Slide Push</option>
                  <option value="convex">Convex Bend</option>
                  <option value="concave">Concave Scoop</option>
                  <option value="zoom">Scale Zoom</option>
                </select>
              </div>

              <div className="animation-form-group">
                <label>Transition Speed</label>
                <select 
                  className="pres-sidebar-select"
                  value={activeSlide.transitionSpeed || 'default'}
                  onChange={e => {
                    const updated = slides.map((s, i) => i === activeIdx ? { ...s, transitionSpeed: e.target.value } : s);
                    setSlides(updated);
                  }}
                >
                  <option value="default">Default Speed</option>
                  <option value="fast">Fast Transition</option>
                  <option value="slow">Slow Transition</option>
                </select>
              </div>

              {selectedElId && (
                <div className="element-animation-edit" style={{ marginTop: '16px' }}>
                  <div className="pres-section-label">Component Animation</div>
                  <div className="animation-form-group">
                    <label>Entrance Style</label>
                    <select 
                      className="pres-sidebar-select"
                      value={activeSlide.elements.find(e => e.id === selectedElId)?.animation || 'none'}
                      onChange={e => updateElement(selectedElId, { animation: e.target.value })}
                    >
                      <option value="none">No entrance delay</option>
                      <option value="fade-in">Fade In</option>
                      <option value="fade-up">Fade Up</option>
                      <option value="fade-down">Fade Down</option>
                      <option value="fade-left">Fade Left</option>
                      <option value="fade-right">Fade Right</option>
                      <option value="zoom-in">Scale Zoom In</option>
                      <option value="slide-up">Slide Up</option>
                      <option value="spin">Spin Rotate</option>
                    </select>
                  </div>

                  <div className="animation-form-group">
                    <label>Animation Trigger Sequence</label>
                    <input 
                      type="number" 
                      className="pres-sidebar-input"
                      value={activeSlide.elements.find(e => e.id === selectedElId)?.animationOrder || 0}
                      onChange={e => updateElement(selectedElId, { animationOrder: Number(e.target.value) })}
                    />
                    <small style={{ color: '#64748b', fontSize: '9px' }}>Lower numbers trigger first during slides playback.</small>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

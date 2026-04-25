import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getItems, addItem, updateItem, deleteItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import {
  ArrowLeft, Calendar, Briefcase, IndianRupee, Clock,
  CheckCircle2, AlertCircle, Plus, Trash2, Edit2,
  MoreVertical, ChevronRight, User, Layout,
  Layers, Kanban, BarChart, ShieldAlert, FileText, MessageSquare,
  Users, DollarSign, Target, ListChecks, Settings, Send, Search,
  File, Image as ImageIcon, Video, Music, Download, Play, Paperclip,
  Mic, Square, X
} from 'lucide-react';
import '../Ledger.css';
import { io } from "socket.io-client";

// Initialize socket with websocket transport only for sub-1sec delivery
const socket = io("http://localhost:5000", {
  transports: ["websocket"],
  upgrade: false
});

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const chatEndRef = useRef(null);
  
  // Dynamic styles for the pulse animation
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes pulse {
        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
        70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
      }
      .animate-spin {
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [risks, setRisks] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [staff, setStaff] = useState([]);
  const [members, setMembers] = useState([]);
  const [myRole, setMyRole] = useState('Member');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(sessionStorage.getItem(`project_tab_${id}`) || 'overview');
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [newTaskName, setNewTaskName] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  const [isAddingRisk, setIsAddingRisk] = useState(false);
  const [newRisk, setNewRisk] = useState({ description: '', impact: 'Medium', probability: 'Medium', mitigation: '' });

  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ name: '', date: '', status: 'Pending' });

  const [isLoggingTime, setIsLoggingTime] = useState(false);
  const [taskToLog, setTaskToLog] = useState(null);
  const [logAmount, setLogAmount] = useState(1);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    sessionStorage.setItem(`project_tab_${id}`, activeTab);
  }, [activeTab, id]);

  const loadMessages = useCallback(async () => {
    if (!project?.projectId) return;
    try {
      const response = await fetch(`http://localhost:5000/api/chat/${project.projectId}`);
      const data = await response.json();
      setMessages(data);
    } catch (err) {
      console.error("Failed to load messages", err);
    }
  }, [project?.projectId]);

  const loadMembers = useCallback(async () => {
    if (!project?.projectId) return;
    try {
      // First, join the project globally
      const joinRes = await fetch('http://localhost:5000/api/project-members/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.projectId,
          userId: user.id,
          name: `${user.firstName} ${user.lastName || ''}`.trim()
        })
      });
      const myMemberInfo = await joinRes.json();
      setMyRole(myMemberInfo.role || 'Member');

      // Then fetch all members
      const response = await fetch(`http://localhost:5000/api/project-members/${project.projectId}`);
      const data = await response.json();
      setMembers(data);
    } catch (err) {
      console.error("Failed to load members", err);
    }
  }, [project?.projectId, user?.id, user?.firstName, user?.lastName]);

  const loadProjectData = useCallback(async () => {
    if (!user?.id || !id) return;
    setLoading(true);
    try {
      const projects = await getItems('projects', user.id);
      const foundProject = projects.find(p => (p._dbId === id || p.id === id));
      if (foundProject) {
        setProject(foundProject);
        const [allTasks, allStaff, allRisks, allMilestones] = await Promise.all([
          getItems('project_tasks', user.id),
          getItems('staff', user.id),
          getItems('project_risks', user.id),
          getItems('project_milestones', user.id)
        ]);
        setTasks(allTasks.filter(t => t.projectId === id));
        setStaff(allStaff);
        setRisks(allRisks.filter(r => r.projectId === id));
        setMilestones(allMilestones.filter(m => m.projectId === id));
        loadMessages();
        loadMembers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, id, loadMessages]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  // Socket Connection Effect
  useEffect(() => {
    if (!project?.projectId) return;

    socket.emit("join_project", project.projectId);

    socket.on("receive_message", (msg) => {
      // Check if message is for this project
      if (msg.projectId === project.projectId) {
        setMessages((prev) => {
          const exists = prev.some(m => m.timestamp === msg.timestamp && m.sender === msg.sender && m.text === msg.text);
          if (exists) return prev;
          return [...prev, msg].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        });
      }
    });

    socket.on("project_data_refreshed", (data) => {
      // Someone else updated the project, let's refresh
      if (data.projectId === project.projectId) {
        loadProjectData();
      }
    });

    return () => {
      socket.off("receive_message");
      socket.off("project_data_refreshed");
    };
  }, [project?.projectId]);

  const notifyProjectUpdate = () => {
    if (project?.projectId) {
      socket.emit("project_update", { projectId: project.projectId, sender: user.firstName });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgData = {
      projectId: project.projectId,
      text: newMessage,
      sender: user.firstName,
      timestamp: new Date().toISOString(),
    };

    setNewMessage('');

    // Optimistic UI update
    setMessages(prev => [...prev, { ...msgData, isOptimistic: true }]);

    // Emit via Socket for Real-time
    socket.emit("send_message", msgData);

    // Save to DB for persistence via global API
    try {
      await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgData)
      });
    } catch (err) {
      console.error("Failed to save message to DB", err);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        // Send a message with file info
        const msgData = {
          projectId: project.projectId,
          sender: user.firstName,
          text: '', // Leave text empty to avoid double names
          timestamp: new Date().toISOString(),
          file: data // { url, filename, mimetype, size }
        };

        setMessages(prev => [...prev, msgData]);
        socket.emit("send_message", msgData);

        await fetch('http://localhost:5000/api/chat', {
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
      e.target.value = null; // Reset
    }
  };

  const startRecording = async () => {
    console.log("Attempting to start recording...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Mic access granted");
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
          console.log("Audio chunk received:", e.data.size);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log("Recording stopped, processing blob...");
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `voice-message-${Date.now()}.webm`, { type: 'audio/webm' });
        
        const formData = new FormData();
        formData.append('file', file);
        setIsUploading(true);

        try {
          const res = await fetch('http://localhost:5000/api/upload', {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (res.ok) {
            console.log("Voice message uploaded successfully:", data.url);
            const msgData = {
              projectId: project.projectId,
              sender: user.firstName,
              text: '',
              timestamp: new Date().toISOString(),
              file: data
            };
            setMessages(prev => [...prev, msgData]);
            socket.emit("send_message", msgData);
            await fetch('http://localhost:5000/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(msgData)
            });
          } else {
            console.error("Upload failed:", data.message);
          }
        } catch (err) {
          console.error("Fetch error during upload:", err);
        } finally {
          setIsUploading(false);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      console.log("Recording started");
    } catch (err) {
      console.error("Recording error:", err);
      alert("Could not start recording. Please check microphone permissions.");
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
        console.error("Download failed:", err);
        // Fallback to simple link if fetch fails
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

    if (mimetype.startsWith('video/')) {
      return (
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ borderRadius: '8px', overflow: 'hidden', background: '#000' }}>
            <video src={url} controls style={{ width: '100%', maxHeight: '300px' }} />
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, margin: '0.4rem 0', opacity: 0.9 }}>{filename}</div>
          <button onClick={downloadFile} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'inherit', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={14} /> Download Video
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

    // Default for documents and other files
    let Icon = File;
    if (mimetype.includes('pdf')) Icon = FileText;
    if (mimetype.includes('word') || mimetype.includes('officedocument.wordprocessingml')) Icon = FileText;
    if (mimetype.includes('excel') || mimetype.includes('officedocument.spreadsheetml')) Icon = BarChart;
    if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) Icon = Layers;

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
          <Icon size={20} />
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: senderIsMe ? 'white' : '#1e293b' }}>{filename}</div>
          <div style={{ fontSize: '0.7rem', opacity: 0.8, color: senderIsMe ? 'white' : '#64748b' }}>Click to download</div>
        </div>
        <Download size={16} style={{ color: senderIsMe ? 'white' : '#64748b' }} />
      </div>
    );
  };

  const handleAddTask = async (e, type = 'Task', isBacklog = false) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;

    const task = {
      projectId: id,
      name: newTaskName,
      status: 'To Do',
      priority: 'Medium',
      type: type, // 'Epic', 'Task', 'Bug', 'Story'
      inBacklog: isBacklog,
      assigneeId: '',
      createdAt: new Date().toISOString(),
      estimatedHours: 0,
      actualHours: 0
    };

    await addItem('project_tasks', task, user.id);
    setNewTaskName('');
    setIsAddingTask(false);
    loadProjectData();
    notifyProjectUpdate();
  };

  const handleAddRisk = async (e) => {
    e.preventDefault();
    await addItem('project_risks', { ...newRisk, projectId: id }, user.id);
    setIsAddingRisk(false);
    setNewRisk({ description: '', impact: 'Medium', probability: 'Medium', mitigation: '' });
    loadProjectData();
    notifyProjectUpdate();
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    await addItem('project_milestones', { ...newMilestone, projectId: id }, user.id);
    setIsAddingMilestone(false);
    setNewMilestone({ name: '', date: '', status: 'Pending' });
    loadProjectData();
    notifyProjectUpdate();
  };

  const handleLogTime = async (e) => {
    e.preventDefault();
    if (!taskToLog) return;
    const newHours = (Number(taskToLog.actualHours) || 0) + Number(logAmount);
    await updateItem('project_tasks', taskToLog._dbId || taskToLog.id, { actualHours: newHours }, user.id);
    setIsLoggingTime(false);
    setTaskToLog(null);
    setLogAmount(1);
    loadProjectData();
    notifyProjectUpdate();
  };

  const updateTaskStatus = async (task, newStatus) => {
    await updateItem('project_tasks', task._dbId || task.id, { status: newStatus }, user.id);
    loadProjectData();
    notifyProjectUpdate();
  };

  const handleUpdateRole = async (targetUserId, newRole) => {
    if (myRole !== 'Admin') return alert('Only Admins can change roles');
    try {
      await fetch('http://localhost:5000/api/project-members/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.projectId, userId: targetUserId, newRole })
      });
      loadMembers();
      notifyProjectUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    if (myRole !== 'Admin') return alert('Only Admins can remove members');
    const choice = window.confirm('Click OK to remove from FULL PROJECT, or CANCEL to remove from CHAT ONLY.');
    const type = choice ? 'full' : 'chat';
    if (!choice && !window.confirm('Confirm: Block this person from Chat only?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/project-members/${project.projectId}/${targetUserId}?removedBy=${user.firstName}&type=${type}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message);
        return;
      }
      loadMembers();
      notifyProjectUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestoreMember = async (targetUserId) => {
    if (myRole !== 'Admin') return alert('Only Admins can restore members');
    try {
      await fetch('http://localhost:5000/api/project-members/unblock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.projectId, userId: targetUserId })
      });
      loadMembers();
    } catch (err) {
      console.error(err);
    }
  };

  const myMemberData = members.find(m => m.userId === user.id);

  if (myMemberData?.accessBlocked) {
    return (
      <div className="l-page" style={{ alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <div className="l-card glass" style={{ maxWidth: '500px', padding: '3rem', border: '1px solid #fee2e2' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
            <AlertCircle size={48} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginBottom: '1rem' }}>Access Revoked</h2>
          <p style={{ color: '#64748b', fontSize: '1.1rem', lineHeight: 1.6 }}>
            You have been removed from this project by <strong style={{ color: '#1e293b' }}>{myMemberData.removedByFull || 'an Admin'}</strong>.
          </p>
          <button 
            onClick={() => navigate('/projects')}
            className="l-btn-primary" 
            style={{ marginTop: '2rem', width: '100%' }}
          >
            Go Back to Projects
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="l-page">Loading...</div>;
  if (!project) return <div className="l-page">Project not found</div>;

  const progress = tasks.length > 0
    ? Math.round((tasks.filter(t => t.status === 'Done' || t.status === 'Completed').length / tasks.length) * 100)
    : 0;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Layout size={18} /> },
    { id: 'backlog', label: 'Backlog', icon: <ListChecks size={18} /> },
    { id: 'tasks', label: 'Active Tasks', icon: <Layers size={18} /> },
    { id: 'kanban', label: 'Kanban Board', icon: <Kanban size={18} /> },
    { id: 'timeline', label: 'Timeline', icon: <BarChart size={18} /> },
    { id: 'reports', label: 'Reports & Analytics', icon: <BarChart size={18} /> },
    { id: 'resources', label: 'Resources', icon: <Users size={18} /> },
    { id: 'finance', label: 'Finance', icon: <DollarSign size={18} /> },
    { id: 'risks', label: 'Risks', icon: <ShieldAlert size={18} /> },
    { id: 'docs', label: 'Documents', icon: <FileText size={18} /> },
    { id: 'chat', label: 'Chat', icon: <MessageSquare size={18} /> },
  ];

  return (
    <div className="l-page" style={{ padding: '1rem 2rem' }}>
      {/* Mini Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/projects')} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.5rem', cursor: 'pointer', color: '#64748b' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: project.color || '#4f46e5' }}>●</span> {project.name}
            </h1>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Project ID: {project.projectId || id.substring(0, 8)} • Client: {project.clientName || 'Private'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span className={`l-account-type customer`} style={{ background: '#f1f5f9', color: '#475569', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
            {project.status}
          </span>
          <button className="l-btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => navigate('/projects', { state: { editId: id } })}>
            <Edit2 size={14} /> Edit Project
          </button>
        </div>
      </div>

      {/* Modern Tabs Navigation */}
      <div style={{
        display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: '#f1f5f9',
        padding: '0.4rem', borderRadius: '14px', overflowX: 'auto'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1.2rem', borderRadius: '10px', border: 'none',
              background: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? '#4f46e5' : '#64748b',
              fontWeight: activeTab === tab.id ? 700 : 600,
              fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: activeTab === tab.id ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Vision & Objectives */}
              <div className="l-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: '0.5rem', borderRadius: '10px' }}><Target size={20} /></div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Vision & Objectives</h3>
                </div>
                <p style={{ color: '#1e293b', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {project.vision || "No vision statement defined yet. Use 'Edit Project' to set one."}
                </p>
                {project.objectives && (
                  <>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b', marginTop: '1.5rem' }}>KEY GOALS</h4>
                    <p style={{ color: '#1e293b', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{project.objectives}</p>
                  </>
                )}
              </div>

              {/* Scope & Exclusions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="l-card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
                  <h3 style={{ marginTop: 0, fontSize: '1rem', fontWeight: 800, color: '#059669' }}>Project Scope</h3>
                  <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.5 }}>{project.scope || 'No scope defined.'}</p>
                </div>
                <div className="l-card" style={{ padding: '1.5rem', borderLeft: '4px solid #ef4444' }}>
                  <h3 style={{ marginTop: 0, fontSize: '1rem', fontWeight: 800, color: '#dc2626' }}>Exclusions</h3>
                  <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.5 }}>{project.exclusions || 'No exclusions listed.'}</p>
                </div>
              </div>

              {/* Timeline Info */}
              <div className="l-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Start Date</p>
                    <p style={{ margin: '0.25rem 0 0', fontWeight: 700 }}>{project.startDate}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Target End Date</p>
                    <p style={{ margin: '0.25rem 0 0', fontWeight: 700 }}>{project.endDate || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Actual End Date</p>
                    <p style={{ margin: '0.25rem 0 0', fontWeight: 700, color: '#94a3b8' }}>--</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Manager</p>
                    <p style={{ margin: '0.25rem 0 0', fontWeight: 700 }}>{user.firstName}</p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Progress Card */}
              <div className="l-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white' }}>
                <h3 style={{ marginTop: 0, fontSize: '1rem', fontWeight: 700, opacity: 0.9 }}>Project Progress</h3>
                <div style={{ fontSize: '3rem', fontWeight: 900, margin: '1rem 0' }}>{progress}%</div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'white' }}></div>
                </div>
                <p style={{ marginBottom: 0, marginTop: '1rem', fontSize: '0.85rem', opacity: 0.8 }}>{tasks.filter(t => t.status === 'Done' || t.status === 'Completed').length} / {tasks.length} tasks completed</p>
              </div>

              {/* Budget Card */}
              <div className="l-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginTop: 0, fontSize: '0.9rem', fontWeight: 800, color: '#64748b' }}>Financial Status</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0' }}>
                  <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Budget:</span>
                  <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>₹{Number(project.budget || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Actual:</span>
                  <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#059669' }}>₹0</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'backlog' && (
          <div className="l-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Product Backlog</h2>
              <button onClick={() => setIsAddingTask('backlog')} className="l-btn-primary"><Plus size={16} /> Add to Backlog</button>
            </div>

            {isAddingTask === 'backlog' && (
              <form onSubmit={(e) => handleAddTask(e, 'Story', true)} style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                <input autoFocus className="l-search-input" placeholder="User Story or Task name..." value={newTaskName} onChange={e => setNewTaskName(e.target.value)} />
                <button type="submit" className="l-btn-primary">Add</button>
                <button type="button" onClick={() => setIsAddingTask(false)} className="l-btn-secondary">Cancel</button>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tasks.filter(t => t.inBacklog).length > 0 ? tasks.filter(t => t.inBacklog).map(task => (
                <div key={task._dbId || task.id} className="l-account-row" style={{ padding: '1rem', borderLeft: '4px solid #94a3b8' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 900, padding: '0.1rem 0.4rem', borderRadius: '4px', background: '#e2e8f0', color: '#475569' }}>{task.type || 'STORY'}</span>
                      <span style={{ fontWeight: 700 }}>{task.name}</span>
                    </div>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>Priority: {task.priority} • Created: {new Date(task.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={async () => { await updateItem('project_tasks', task._dbId || task.id, { inBacklog: false }, user.id); loadProjectData(); }}
                    className="l-btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                  >
                    Move to Sprint
                  </button>
                </div>
              )) : <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Backlog is empty.</div>}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="l-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Active Sprint Tasks</h2>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setIsAddingTask('epic')} className="l-btn-secondary" style={{ padding: '0.5rem 1rem', border: '1px solid #4f46e5', color: '#4f46e5' }}><Layers size={16} /> New Epic</button>
                <button onClick={() => setIsAddingTask('task')} className="l-btn-primary" style={{ padding: '0.5rem 1rem' }}><Plus size={16} /> New Task</button>
              </div>
            </div>

            {isAddingTask && isAddingTask !== 'backlog' && (
              <form onSubmit={(e) => handleAddTask(e, isAddingTask === 'epic' ? 'Epic' : 'Task', false)} style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                <input autoFocus className="l-search-input" placeholder={`New ${isAddingTask}...`} value={newTaskName} onChange={e => setNewTaskName(e.target.value)} />
                <button type="submit" className="l-btn-primary">Create</button>
                <button type="button" onClick={() => setIsAddingTask(false)} className="l-btn-secondary">Cancel</button>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {tasks.filter(t => !t.inBacklog && t.type === 'Epic').map(epic => (
                <div key={epic._dbId || epic.id} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                  <div style={{ background: '#f8fafc', padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Layers size={18} color="#4f46e5" />
                      <span style={{ fontWeight: 800, color: '#1e293b' }}>{epic.name} <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '0.5rem' }}>EPIC</span></span>
                    </div>
                  </div>
                  <div style={{ padding: '0.5rem' }}>
                    {tasks.filter(t => t.parentTaskId === (epic._dbId || epic.id)).map(task => (
                      <div key={task._dbId || task.id} className="l-account-row" style={{ padding: '0.75rem 1rem', border: 'none', background: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <CheckCircle2 size={16} color={task.status === 'Done' ? '#10b981' : '#cbd5e1'} />
                          <span style={{ fontWeight: 600 }}>{task.name}</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '6px', background: '#f1f5f9', color: '#64748b' }}>{task.status}</span>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const name = window.prompt(`Add task to Epic: ${epic.name}`);
                        if (name) {
                          addItem('project_tasks', {
                            projectId: id,
                            name: name,
                            status: 'To Do',
                            priority: 'Medium',
                            type: 'Task',
                            parentTaskId: epic._dbId || epic.id,
                            inBacklog: false,
                            createdAt: new Date().toISOString()
                          }, user.id).then(() => loadProjectData());
                        }
                      }}
                      style={{ width: '100%', padding: '0.75rem', background: 'transparent', border: '1px dashed #cbd5e1', borderRadius: '10px', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.5rem' }}
                    >
                      + Add task to Epic
                    </button>
                  </div>
                </div>
              ))}

              {tasks.filter(t => !t.inBacklog && t.type !== 'Epic' && !t.parentTaskId).map(task => (
                <div key={task._dbId || task.id} className="l-account-row" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <div
                      onClick={() => updateTaskStatus(task, task.status === 'Done' ? 'To Do' : 'Done')}
                      style={{
                        width: '24px', height: '24px', borderRadius: '6px', cursor: 'pointer',
                        border: '2px solid #cbd5e1', background: task.status === 'Done' ? '#10b981' : 'transparent',
                        borderColor: task.status === 'Done' ? '#10b981' : '#cbd5e1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      {task.status === 'Done' && <CheckCircle2 size={16} color="white" />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 700, color: task.status === 'Done' ? '#94a3b8' : '#1e293b', textDecoration: task.status === 'Done' ? 'line-through' : 'none' }}>{task.name}</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>HRS: {task.actualHours || 0}/{task.estimatedHours || 0}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div onClick={() => { setTaskToLog(task); setIsLoggingTime(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f8fafc', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                      <Clock size={14} color="#64748b" />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Log Time</span>
                    </div>
                    <button onClick={async () => { if (window.confirm('Delete?')) { await deleteItem('project_tasks', task._dbId || task.id, user.id); loadProjectData(); } }} style={{ background: 'transparent', border: 'none', color: '#94a3b8' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div style={{
            display: 'flex',
            height: 'calc(100vh - 250px)',
            background: '#f8fafc',
            borderRadius: '24px',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)'
          }}>
            {/* Chat Main Area */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              background: 'white',
              position: 'relative'
            }}>
              {/* Header */}
              <div style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                zIndex: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ 
                    width: '45px', height: '45px', borderRadius: '14px', 
                    background: `linear-gradient(135deg, ${project.color || '#4f46e5'}, #818cf8)`, 
                    color: 'white', display: 'flex', alignItems: 'center', 
                    justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}>
                    {project.name[0]}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{project.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{staff.length + 1} Active Now</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button style={{ padding: '0.5rem', borderRadius: '10px', border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer' }}><Search size={18} /></button>
                  <button style={{ padding: '0.5rem', borderRadius: '10px', border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer' }}><Settings size={18} /></button>
                </div>
              </div>

              {/* Messages Container */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                background: '#f1f5f9',
                backgroundImage: `radial-gradient(#e2e8f0 1px, transparent 1px)`,
                backgroundSize: '20px 20px'
              }}>
                {members.find(m => m.userId === user.id)?.chatBlocked ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
                     <div style={{ background: '#fee2e2', color: '#ef4444', padding: '1rem', borderRadius: '16px', maxWidth: '400px' }}>
                        <ShieldAlert size={32} style={{ marginBottom: '1rem' }} />
                        <h3 style={{ margin: 0 }}>Chat Access Restricted</h3>
                        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>You have been removed from this chat by <strong style={{ color: '#dc2626' }}>{members.find(m => m.userId === user.id)?.removedByChat || 'an Admin'}</strong>. You can still view other project sections.</p>
                     </div>
                  </div>
                ) : (
                  <>
                    {messages.length === 0 && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <p style={{ fontWeight: 600 }}>No messages yet. Start the conversation!</p>
                      </div>
                    )}

                    {messages.map((msg, i) => {
                      const isMe = msg.sender === user.firstName;
                      const prevMsg = messages[i - 1];
                      const showSender = !isMe && (!prevMsg || prevMsg.sender !== msg.sender);
                      
                      return (
                        <div key={i} style={{ 
                          alignSelf: isMe ? 'flex-end' : 'flex-start', 
                          maxWidth: '80%',
                          marginTop: showSender ? '0.5rem' : '0'
                        }}>
                          {showSender && (
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#4f46e5', marginBottom: '0.25rem', marginLeft: '0.5rem' }}>
                              {msg.sender}
                            </div>
                          )}
                          <div style={{
                            padding: '0.75rem 1rem',
                            borderRadius: isMe ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                            background: isMe ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'white',
                            color: isMe ? 'white' : '#1e293b',
                            fontSize: '0.95rem',
                            fontWeight: 500,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            position: 'relative',
                            lineHeight: 1.5
                          }}>
                            {msg.text && <div>{msg.text}</div>}
                            {msg.file && renderFileContent(msg.file, isMe)}
                            <div style={{ 
                              fontSize: '0.65rem', 
                              marginTop: '0.4rem', 
                              opacity: 0.7, 
                              textAlign: 'right',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '4px'
                            }}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {isMe && <CheckCircle2 size={10} style={{ opacity: msg.isOptimistic ? 0.5 : 1 }} />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              {!members.find(m => m.userId === user.id)?.chatBlocked && (
                <div style={{ 
                  padding: '1.25rem 1.5rem', 
                  background: 'white', 
                  borderTop: '1px solid #f1f5f9'
                }}>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    onChange={handleFileSelect}
                  />
                  <form onSubmit={handleSendMessage} style={{ 
                    display: 'flex', 
                    gap: '0.75rem', 
                    alignItems: 'center',
                    background: '#f8fafc',
                    padding: '0.4rem',
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <button 
                      type="button" 
                      onClick={() => {
                        console.log("Plus button clicked");
                        fileInputRef.current?.click();
                      }}
                      disabled={isUploading}
                      style={{ 
                        background: 'none', border: 'none', color: '#94a3b8', 
                        padding: '0.5rem', cursor: 'pointer', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      {isUploading ? (
                        <div className="animate-spin" style={{ width: '20px', height: '20px', border: '2px solid #94a3b8', borderTopColor: '#4f46e5', borderRadius: '50%' }} />
                      ) : (
                        <Plus size={20} />
                      )}
                    </button>
                    <input
                      className="l-search-input"
                      placeholder={isRecording ? "Recording voice message..." : "Message your team..."}
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      disabled={isRecording}
                      style={{ 
                        background: 'transparent', border: 'none', 
                        padding: '0.6rem 0.5rem', flex: 1, fontSize: '0.95rem',
                        outline: 'none',
                        color: isRecording ? '#ef4444' : 'inherit'
                      }}
                    />
                    {isRecording ? (
                      <button 
                        type="button" 
                        onClick={stopRecording}
                        style={{ 
                          background: '#ef4444', color: 'white', border: 'none', 
                          width: '40px', height: '40px', borderRadius: '16px', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          cursor: 'pointer', animation: 'pulse 1.5s infinite' 
                        }}
                      >
                        <Square size={18} fill="white" />
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {!newMessage.trim() && (
                          <button 
                            type="button" 
                            onClick={startRecording}
                            disabled={isUploading}
                            style={{ 
                              background: 'none', border: 'none', color: '#64748b', 
                              padding: '0.5rem', cursor: 'pointer', borderRadius: '50%'
                            }}
                          >
                            <Mic size={20} />
                          </button>
                        )}
                        <button type="submit" disabled={!newMessage.trim() || isUploading} style={{ 
                          background: newMessage.trim() ? '#4f46e5' : '#cbd5e1', 
                          color: 'white', border: 'none', width: '40px', height: '40px', 
                          borderRadius: '16px', display: 'flex', alignItems: 'center', 
                          justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s',
                          boxShadow: newMessage.trim() ? '0 4px 6px -1px rgba(79, 70, 229, 0.4)' : 'none'
                        }}>
                          <Send size={18} />
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              )}
            </div>

            {/* Chat Sidebar (Info) */}
            <div style={{
              width: '300px',
              borderLeft: '1px solid #f1f5f9',
              background: '#f8fafc',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '2rem'
            }}>
              <div>
                <h4 style={{ margin: '0 0 1rem', fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Project Info</h4>
                <div className="l-card" style={{ padding: '1rem', border: 'none', background: 'white' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>ID: {project.projectId}</p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>Share this ID to invite others to the chat.</p>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 1rem', fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Members</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {members.map(member => (
                    <div key={member.userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ 
                          width: '32px', height: '32px', borderRadius: '10px', 
                          background: member.role === 'Admin' ? '#fee2e2' : '#f1f5f9', 
                          color: member.role === 'Admin' ? '#ef4444' : '#64748b', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontWeight: 700, fontSize: '0.8rem' 
                        }}>
                          {member.name[0]}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>{member.name} {member.userId === user.id && '(You)'}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.65rem', color: member.role === 'Admin' ? '#ef4444' : '#94a3b8', fontWeight: 800 }}>{member.role.toUpperCase()}</span>
                            {member.accessBlocked && <span style={{ fontSize: '0.55rem', color: '#ef4444', fontWeight: 900, background: '#fee2e2', padding: '0 4px', borderRadius: '4px' }}>FULL BLOCKED</span>}
                            {member.chatBlocked && !member.accessBlocked && <span style={{ fontSize: '0.55rem', color: '#f59e0b', fontWeight: 900, background: '#fef3c7', padding: '0 4px', borderRadius: '4px' }}>CHAT BLOCKED</span>}
                          </div>
                        </div>
                      </div>
                      
                      {myRole === 'Admin' && member.userId !== user.id && (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {(member.accessBlocked || member.chatBlocked) ? (
                            <button 
                              onClick={() => handleRestoreMember(member.userId)}
                              title="Restore Access"
                              style={{ padding: '0.3rem', borderRadius: '6px', border: '1px solid #10b981', background: 'white', color: '#10b981', cursor: 'pointer' }}
                            >
                              <Plus size={12} />
                            </button>
                          ) : (
                            <>
                              {!member.isOriginalAdmin && (
                                <>
                                  {member.role !== 'Admin' && (
                                    <button 
                                      onClick={() => handleUpdateRole(member.userId, 'Admin')}
                                      title="Make Admin"
                                      style={{ padding: '0.3rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', color: '#4f46e5', cursor: 'pointer' }}
                                    >
                                      <ShieldAlert size={12} />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleRemoveMember(member.userId)}
                                    title="Restrict Member"
                                    style={{ padding: '0.3rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', color: '#ef4444', cursor: 'pointer' }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      )}
                          {member.isOriginalAdmin && (
                            <span title="Original Project Owner" style={{ fontSize: '0.6rem', color: '#94a3b8' }}>
                              <ShieldAlert size={12} />
                            </span>
                          )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 'auto' }}>
                <button style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                  Leave Discussion
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs placeholders or logic... */}
        {activeTab === 'reports' && (
          <div className="l-card" style={{ padding: '2rem', textAlign: 'center' }}>
             <BarChart size={48} color="#cbd5e1" />
             <h3>Project Reports</h3>
             <p>Analytics and charts for {project.name}.</p>
          </div>
        )}
        
        {activeTab === 'kanban' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
             {['To Do', 'In Progress', 'Done'].map(status => (
                <div key={status} className="l-card" style={{ background: '#f8fafc', minHeight: '400px' }}>
                   <h3 style={{ textTransform: 'uppercase', fontSize: '0.8rem', color: '#64748b' }}>{status}</h3>
                   {tasks.filter(t => t.status === status).map(t => (
                      <div key={t.id} style={{ background: 'white', padding: '1rem', borderRadius: '12px', marginBottom: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                         {t.name}
                      </div>
                   ))}
                </div>
             ))}
          </div>
        )}

      </div>

      <TimeLogModal
        isOpen={isLoggingTime}
        onClose={() => setIsLoggingTime(false)}
        onSave={handleLogTime}
        task={taskToLog}
        amount={logAmount}
        setAmount={setLogAmount}
      />

      {/* Image Lightbox */}
      {selectedImage && (
        <div 
          onClick={() => setSelectedImage(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
        >
          <img 
            src={selectedImage.url} 
            alt={selectedImage.filename} 
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '12px' }} 
            onClick={e => e.stopPropagation()}
          />
          <button 
            onClick={() => setSelectedImage(null)}
            style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'white', border: 'none', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
          </button>
        </div>
      )}
    </div>
  );
};

const TimeLogModal = ({ isOpen, onClose, onSave, task, amount, setAmount }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="l-card glass" style={{ width: '400px', padding: '2rem' }}>
        <h3 style={{ marginTop: 0 }}>Log Time</h3>
        <p style={{ fontWeight: 700, color: '#4f46e5' }}>{task?.name}</p>
        <form onSubmit={onSave}>
          <input type="number" step="0.5" className="l-search-input" value={amount} onChange={e => setAmount(e.target.value)} autoFocus required />
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" onClick={onClose} className="l-btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="l-btn-primary" style={{ flex: 2 }}>Log Hours</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectDetails;

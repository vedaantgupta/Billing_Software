import React, { useState, useEffect, useRef } from 'react';
import {
  X, CheckSquare, Clock, Calendar, AlertCircle, Play, Square,
  MessageSquare, User, Trash2, Plus, Paperclip, CheckCircle2,
  Tag, Layers, ArrowRight, CornerDownRight, ExternalLink, Send
} from 'lucide-react';
import { useProject } from '@/features/projects/context/ProjectContext';
import { useAuth } from '@/hooks/useAuth';
import { StatusBadge, PriorityBadge } from '@/features/projects/components/common/ProjectBadges';
import { formatRelativeDate } from '@/features/projects/utils/projectCalculations';

const TaskDetailDrawer = () => {
  const {
    selectedTaskForDrawer,
    setSelectedTaskForDrawer,
    updateTask,
    deleteTask,
    tasks,
    milestones,
    sprints,
    staff,
    members,
    timeLogs,
    addTimeLog,
    activeTimer,
    elapsedSeconds,
    startTimer,
    stopTimer
  } = useProject();

  const { user } = useAuth();
  const task = selectedTaskForDrawer;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('To Do');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(0);
  const [storyPoints, setStoryPoints] = useState(0);
  const [sprintId, setSprintId] = useState('');
  const [milestoneId, setMilestoneId] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [selectedDepId, setSelectedDepId] = useState('');
  const [selectedDepType, setSelectedDepType] = useState('FS');
  const [commentText, setCommentText] = useState('');
  const [manualHours, setManualHours] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'timelogs', 'comments'

  useEffect(() => {
    if (task) {
      setName(task.name || '');
      setDescription(task.description || '');
      setStatus(task.status || 'To Do');
      setPriority(task.priority || 'Medium');
      setDueDate(task.dueDate || '');
      setStartDate(task.startDate || '');
      setEstimatedHours(task.estimatedHours || 0);
      setStoryPoints(task.storyPoints || 0);
      setSprintId(task.sprintId || '');
      setMilestoneId(task.milestoneId || '');
    }
  }, [task]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedTaskForDrawer(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedTaskForDrawer]);

  if (!task) return null;

  const taskId = task.id || task._dbId;
  const isTimerRunningOnThisTask = activeTimer?.isRunning && activeTimer.taskId === taskId;

  const allAssignees = [...staff, ...members];
  const taskTimeLogs = timeLogs.filter(tl => tl.taskId === taskId);
  const totalLoggedHours = taskTimeLogs.reduce((sum, tl) => sum + (Number(tl.durationHours) || 0), 0) + (Number(task.actualHours) || 0);

  const subtasks = task.subtasks || [];
  const completedSubtasksCount = subtasks.filter(s => s.completed).length;
  const subtaskProgress = subtasks.length > 0 ? Math.round((completedSubtasksCount / subtasks.length) * 100) : 0;

  // Auto-save field edits
  const handleFieldBlur = (field, value) => {
    if (task[field] !== value) {
      updateTask(taskId, { [field]: value });
    }
  };

  const toggleSubtask = (index) => {
    const updated = [...subtasks];
    updated[index].completed = !updated[index].completed;
    updateTask(taskId, { subtasks: updated });
  };

  const handleAddSubtask = (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const updated = [...subtasks, { id: Date.now().toString(), title: newSubtaskTitle.trim(), completed: false }];
    updateTask(taskId, { subtasks: updated });
    setNewSubtaskTitle('');
  };

  const handleDeleteSubtask = (index) => {
    const updated = subtasks.filter((_, i) => i !== index);
    updateTask(taskId, { subtasks: updated });
  };

  // Add Dependency
  const handleAddDependency = () => {
    if (!selectedDepId || selectedDepId === taskId) return;
    const currentDeps = task.dependencies || [];
    if (currentDeps.some(d => (typeof d === 'object' ? d.taskId : d) === selectedDepId)) return;

    const newDeps = [...currentDeps, { taskId: selectedDepId, type: selectedDepType }];
    updateTask(taskId, { dependencies: newDeps });
    setSelectedDepId('');
  };

  const handleRemoveDependency = (depTaskId) => {
    const currentDeps = task.dependencies || [];
    const newDeps = currentDeps.filter(d => (typeof d === 'object' ? d.taskId : d) !== depTaskId);
    updateTask(taskId, { dependencies: newDeps });
  };

  // Manual Time Log
  const handleManualTimeLog = async (e) => {
    e.preventDefault();
    const hours = Number(manualHours);
    if (!hours || hours <= 0) return;

    await addTimeLog({
      taskId,
      taskName: task.name,
      projectId: task.projectId,
      durationHours: hours,
      billable: true,
      notes: manualNotes || 'Manual time log',
      date: new Date().toISOString().split('T')[0]
    });

    setManualHours('');
    setManualNotes('');
  };

  // Comments
  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const newComment = {
      id: Date.now().toString(),
      author: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
      authorId: user.id,
      text: commentText.trim(),
      timestamp: new Date().toISOString()
    };
    const currentComments = task.comments || [];
    updateTask(taskId, { comments: [...currentComments, newComment] });
    setCommentText('');
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done';

  return (
    <div className="pm-drawer-backdrop" onClick={() => setSelectedTaskForDrawer(null)}>
      <div className="pm-drawer-content" onClick={e => e.stopPropagation()}>
        
        {/* Drawer Header */}
        <div className="pm-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '6px', background: '#e2e8f0', color: '#475569' }}>
              {task.type || 'TASK'}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              #{taskId.slice(-5).toUpperCase()}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="pm-btn pm-btn-ghost pm-btn-sm"
              onClick={() => {
                if (window.confirm(`Delete task "${task.name}"?`)) {
                  deleteTask(taskId);
                }
              }}
              title="Delete task"
            >
              <Trash2 size={16} color="#ef4444" />
            </button>
            <button
              className="pm-btn pm-btn-ghost pm-btn-sm"
              onClick={() => setSelectedTaskForDrawer(null)}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="pm-drawer-body">
          {/* Title input */}
          <div>
            <input
              className="pm-palette-input"
              style={{ fontSize: '1.25rem', fontWeight: 800, width: '100%', padding: '0.25rem 0' }}
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={() => handleFieldBlur('name', name)}
              placeholder="Task name..."
            />
          </div>

          {/* Quick Properties Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div>
              <label style={{ fontSize: '0.725rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Status</label>
              <select
                className="pm-select"
                style={{ width: '100%', marginTop: '0.3rem' }}
                value={status}
                onChange={e => {
                  setStatus(e.target.value);
                  updateTask(taskId, { status: e.target.value });
                }}
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="In Review">In Review</option>
                <option value="Done">Done</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.725rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Priority</label>
              <select
                className="pm-select"
                style={{ width: '100%', marginTop: '0.3rem' }}
                value={priority}
                onChange={e => {
                  setPriority(e.target.value);
                  updateTask(taskId, { priority: e.target.value });
                }}
              >
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.725rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Assignee</label>
              <select
                className="pm-select"
                style={{ width: '100%', marginTop: '0.3rem' }}
                value={task.assigneeIds?.[0] || ''}
                onChange={e => {
                  const uid = e.target.value;
                  const member = allAssignees.find(m => m.id === uid || m._dbId === uid || m.userId === uid);
                  const nameStr = member ? (member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim()) : '';
                  updateTask(taskId, {
                    assigneeIds: uid ? [uid] : [],
                    assigneeNames: nameStr ? [nameStr] : []
                  });
                }}
              >
                <option value="">Unassigned</option>
                {allAssignees.map(m => {
                  const mId = m.id || m._dbId || m.userId;
                  const mName = m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim();
                  return <option key={mId} value={mId}>{mName}</option>;
                })}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.725rem', fontWeight: 800, color: isOverdue ? '#dc2626' : '#64748b', textTransform: 'uppercase' }}>
                Due Date {isOverdue && '(Overdue)'}
              </label>
              <input
                type="date"
                className="pm-select"
                style={{ width: '100%', marginTop: '0.3rem', borderColor: isOverdue ? '#fca5a5' : '#e2e8f0' }}
                value={dueDate}
                onChange={e => {
                  setDueDate(e.target.value);
                  updateTask(taskId, { dueDate: e.target.value });
                }}
              />
            </div>
          </div>

          {/* Tab Switcher */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            <button
              className={`pm-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Details & Subtasks
            </button>
            <button
              className={`pm-tab-btn ${activeTab === 'timelogs' ? 'active' : ''}`}
              onClick={() => setActiveTab('timelogs')}
            >
              <Clock size={14} /> Time Tracking ({totalLoggedHours}h)
            </button>
            <button
              className={`pm-tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
              onClick={() => setActiveTab('comments')}
            >
              <MessageSquare size={14} /> Comments ({(task.comments || []).length})
            </button>
          </div>

          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <>
              {/* Description */}
              <div className="pm-drawer-section">
                <span className="pm-drawer-section-title">Description</span>
                <textarea
                  className="pm-search-input"
                  style={{ minHeight: '110px', resize: 'vertical', lineHeight: 1.5 }}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onBlur={() => handleFieldBlur('description', description)}
                  placeholder="Add details, notes, acceptance criteria (Markdown supported)..."
                />
              </div>

              {/* Subtasks / Checklist */}
              <div className="pm-drawer-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="pm-drawer-section-title">
                    Checklist & Subtasks ({completedSubtasksCount}/{subtasks.length})
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5' }}>
                    {subtaskProgress}%
                  </span>
                </div>

                <div className="pm-progress-bar">
                  <div className="pm-progress-fill" style={{ width: `${subtaskProgress}%` }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
                  {subtasks.map((sub, idx) => (
                    <div key={sub.id || idx} className={`pm-checklist-item ${sub.completed ? 'done' : ''}`}>
                      <input
                        type="checkbox"
                        checked={sub.completed}
                        onChange={() => toggleSubtask(idx)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#4f46e5' }}
                      />
                      <span style={{ flex: 1, fontSize: '0.85rem' }}>{sub.title}</span>
                      <button
                        onClick={() => handleDeleteSubtask(idx)}
                        style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddSubtask} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input
                    className="pm-search-input"
                    placeholder="Add a subtask or checklist item..."
                    value={newSubtaskTitle}
                    onChange={e => setNewSubtaskTitle(e.target.value)}
                  />
                  <button type="submit" className="pm-btn pm-btn-secondary pm-btn-sm">
                    <Plus size={14} /> Add
                  </button>
                </form>
              </div>

              {/* Dependencies Section */}
              <div className="pm-drawer-section">
                <span className="pm-drawer-section-title">Dependencies & Blockers</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {(task.dependencies || []).map((dep, idx) => {
                    const depId = typeof dep === 'object' ? dep.taskId : dep;
                    const depType = typeof dep === 'object' ? (dep.type || 'FS') : 'FS';
                    const targetTask = tasks.find(t => t.id === depId || t._dbId === depId);
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.5rem 0.75rem',
                          background: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 800, color: '#4f46e5', fontSize: '0.7rem', padding: '0.1rem 0.35rem', background: '#e0e7ff', borderRadius: '4px' }}>
                            {depType}
                          </span>
                          <span style={{ fontWeight: 600 }}>{targetTask?.name || `Task #${depId.slice(-4)}`}</span>
                          <StatusBadge status={targetTask?.status || 'To Do'} />
                        </div>
                        <button
                          onClick={() => handleRemoveDependency(depId)}
                          style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <select
                    className="pm-select"
                    style={{ width: '90px' }}
                    value={selectedDepType}
                    onChange={e => setSelectedDepType(e.target.value)}
                  >
                    <option value="FS">FS</option>
                    <option value="SS">SS</option>
                    <option value="FF">FF</option>
                    <option value="SF">SF</option>
                  </select>
                  <select
                    className="pm-select"
                    style={{ flex: 1 }}
                    value={selectedDepId}
                    onChange={e => setSelectedDepId(e.target.value)}
                  >
                    <option value="">Select Predecessor Task...</option>
                    {tasks.filter(t => (t.id || t._dbId) !== taskId).map(t => (
                      <option key={t.id || t._dbId} value={t.id || t._dbId}>
                        {t.name} ({t.status})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddDependency}
                    disabled={!selectedDepId}
                    className="pm-btn pm-btn-secondary pm-btn-sm"
                  >
                    Link
                  </button>
                </div>
              </div>

              {/* Sprint & Milestone Linkage */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span className="pm-drawer-section-title">Sprint</span>
                  <select
                    className="pm-select"
                    style={{ width: '100%', marginTop: '0.3rem' }}
                    value={sprintId}
                    onChange={e => {
                      setSprintId(e.target.value);
                      updateTask(taskId, { sprintId: e.target.value });
                    }}
                  >
                    <option value="">No Sprint (Backlog)</option>
                    {sprints.map(s => (
                      <option key={s.id || s._dbId} value={s.id || s._dbId}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="pm-drawer-section-title">Milestone</span>
                  <select
                    className="pm-select"
                    style={{ width: '100%', marginTop: '0.3rem' }}
                    value={milestoneId}
                    onChange={e => {
                      setMilestoneId(e.target.value);
                      updateTask(taskId, { milestoneId: e.target.value });
                    }}
                  >
                    <option value="">No Milestone</option>
                    {milestones.map(m => (
                      <option key={m.id || m._dbId} value={m.id || m._dbId}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: TIME TRACKING */}
          {activeTab === 'timelogs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Live Stopwatch Card */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Live Stopwatch</span>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'monospace', margin: '0.5rem 0', color: isTimerRunningOnThisTask ? '#4f46e5' : '#1e293b' }}>
                  {isTimerRunningOnThisTask
                    ? new Date(elapsedSeconds * 1000).toISOString().substr(11, 8)
                    : '00:00:00'}
                </div>

                {isTimerRunningOnThisTask ? (
                  <button onClick={stopTimer} className="pm-btn pm-btn-danger" style={{ margin: '0 auto' }}>
                    <Square size={16} fill="currentColor" /> Stop & Log Time
                  </button>
                ) : (
                  <button onClick={() => startTimer(task)} className="pm-btn pm-btn-primary" style={{ margin: '0 auto' }}>
                    <Play size={16} fill="currentColor" /> Start Timer
                  </button>
                )}
              </div>

              {/* Manual Time Entry */}
              <form onSubmit={handleManualTimeLog} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>Log Time Manually</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="number"
                    step="0.25"
                    className="pm-search-input"
                    placeholder="Hours (e.g. 1.5)"
                    value={manualHours}
                    onChange={e => setManualHours(e.target.value)}
                    required
                  />
                  <input
                    className="pm-search-input"
                    placeholder="Activity notes..."
                    value={manualNotes}
                    onChange={e => setManualNotes(e.target.value)}
                  />
                  <button type="submit" className="pm-btn pm-btn-primary pm-btn-sm">
                    Log
                  </button>
                </div>
              </form>

              {/* Logged History */}
              <div>
                <span className="pm-drawer-section-title">Timesheet History ({taskTimeLogs.length} entries)</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {taskTimeLogs.map((tl, i) => (
                    <div key={tl.id || i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.8rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{tl.userName || 'User'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{tl.notes || 'Time entry'} • {tl.date}</div>
                      </div>
                      <span style={{ fontWeight: 800, color: '#4f46e5' }}>{tl.durationHours} hrs</span>
                    </div>
                  ))}
                  {taskTimeLogs.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem', fontSize: '0.825rem' }}>
                      No manual time entries yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COMMENTS & AUDIT */}
          {activeTab === 'comments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
                {(task.comments || []).map((c, i) => (
                  <div key={c.id || i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1e293b' }}>{c.author}</span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#334155', whiteSpace: 'pre-wrap' }}>
                      {c.text}
                    </div>
                  </div>
                ))}
                {(task.comments || []).length === 0 && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', fontSize: '0.825rem' }}>
                    No comments yet. Start a discussion!
                  </div>
                )}
              </div>

              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  className="pm-search-input"
                  placeholder="Write a comment (@ to mention)..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                />
                <button type="submit" className="pm-btn pm-btn-primary pm-btn-sm" disabled={!commentText.trim()}>
                  <Send size={14} />
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default TaskDetailDrawer;

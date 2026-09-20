import React, { useState } from 'react';
import { X, Plus, Calendar, Clock, Layers, User, Tag } from 'lucide-react';
import { useProject } from '@/features/projects/context/ProjectContext';

const TaskCreateModal = ({ isOpen, onClose, defaultSprintId = null, defaultStatus = 'To Do' }) => {
  const {
    addTask,
    activeProjectId,
    projects,
    sprints,
    milestones,
    staff,
    members
  } = useProject();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(activeProjectId || (projects[0]?.id || projects[0]?._dbId || ''));
  const [type, setType] = useState('Task');
  const [status, setStatus] = useState(defaultStatus);
  const [priority, setPriority] = useState('Medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [sprintId, setSprintId] = useState(defaultSprintId || '');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [inBacklog, setInBacklog] = useState(false);

  if (!isOpen) return null;

  const allAssignees = [...staff, ...members];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const assignedMember = allAssignees.find(m => m.id === assigneeId || m._dbId === assigneeId || m.userId === assigneeId);

    await addTask({
      name: name.trim(),
      description,
      projectId: activeProjectId || projectId,
      type,
      status,
      priority,
      assigneeIds: assigneeId ? [assigneeId] : [],
      assigneeNames: assignedMember ? [assignedMember.name || `${assignedMember.firstName || ''} ${assignedMember.lastName || ''}`.trim()] : [],
      sprintId: inBacklog ? null : sprintId,
      dueDate,
      estimatedHours: Number(estimatedHours) || 0,
      inBacklog
    });

    onClose();
  };

  return (
    <div className="pm-drawer-backdrop" onClick={onClose} style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        className="pm-card"
        style={{ width: '100%', maxWidth: '540px', background: 'white', padding: '1.75rem', borderRadius: '18px', zIndex: 1100 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Create New Task</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Task Title *</label>
            <input
              autoFocus
              className="pm-search-input"
              style={{ marginTop: '0.35rem', fontSize: '0.95rem', fontWeight: 600 }}
              placeholder="e.g. Implement OAuth login or Fix billing calculation"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          {!activeProjectId && projects.length > 0 && (
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Project</label>
              <select
                className="pm-select"
                style={{ width: '100%', marginTop: '0.35rem' }}
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
              >
                {projects.map(p => (
                  <option key={p.id || p._dbId} value={p.id || p._dbId}>{p.name} ({p.projectId || 'PRJ'})</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Type</label>
              <select className="pm-select" style={{ width: '100%', marginTop: '0.35rem' }} value={type} onChange={e => setType(e.target.value)}>
                <option value="Task">Task</option>
                <option value="Story">Story</option>
                <option value="Bug">Bug</option>
                <option value="Epic">Epic</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Priority</label>
              <select className="pm-select" style={{ width: '100%', marginTop: '0.35rem' }} value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Status</label>
              <select className="pm-select" style={{ width: '100%', marginTop: '0.35rem' }} value={status} onChange={e => setStatus(e.target.value)}>
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="In Review">In Review</option>
                <option value="Done">Done</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Assignee</label>
              <select className="pm-select" style={{ width: '100%', marginTop: '0.35rem' }} value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                <option value="">Unassigned</option>
                {allAssignees.map(m => {
                  const mId = m.id || m._dbId || m.userId;
                  const mName = m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim();
                  return <option key={mId} value={mId}>{mName}</option>;
                })}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Due Date</label>
              <input type="date" className="pm-select" style={{ width: '100%', marginTop: '0.35rem' }} value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Description</label>
            <textarea
              className="pm-search-input"
              style={{ marginTop: '0.35rem', minHeight: '80px', resize: 'vertical' }}
              placeholder="Additional specifications or context..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <input
              type="checkbox"
              id="backlogCheck"
              checked={inBacklog}
              onChange={e => setInBacklog(e.target.checked)}
              style={{ accentColor: '#4f46e5', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="backlogCheck" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              Add directly to Backlog
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button type="button" className="pm-btn pm-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="pm-btn pm-btn-primary">
              <Plus size={16} /> Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskCreateModal;

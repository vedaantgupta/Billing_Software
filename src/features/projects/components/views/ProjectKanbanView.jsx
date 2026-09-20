import React, { useState } from 'react';
import { Plus, MoreHorizontal, AlertCircle, Clock, CheckSquare } from 'lucide-react';
import { useProject } from '@/features/projects/context/ProjectContext';
import { PriorityBadge, UserAvatarGroup } from '@/features/projects/components/common/ProjectBadges';
import { formatRelativeDate } from '@/features/projects/utils/projectCalculations';

const COLUMNS = [
  { id: 'To Do', label: 'To Do', color: '#64748b' },
  { id: 'In Progress', label: 'In Progress', color: '#3b82f6', wipLimit: 6 },
  { id: 'In Review', label: 'In Review', color: '#8b5cf6', wipLimit: 4 },
  { id: 'Done', label: 'Done', color: '#10b981' },
  { id: 'Blocked', label: 'Blocked', color: '#ef4444' }
];

const ProjectKanbanView = () => {
  const {
    tasks,
    updateTask,
    addTask,
    staff,
    members,
    setSelectedTaskForDrawer
  } = useProject();

  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [quickAddColumn, setQuickAddColumn] = useState(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [swimlaneMode, setSwimlaneMode] = useState('none'); // 'none', 'priority'

  const allAssignees = [...staff, ...members];

  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      await updateTask(taskId, { status: targetStatus });
    }
    setDraggedTaskId(null);
  };

  const handleQuickAdd = async (e, status) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    await addTask({
      name: quickTitle.trim(),
      status: status,
      priority: 'Medium'
    });
    setQuickTitle('');
    setQuickAddColumn(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      
      {/* Kanban Header Bar */}
      <div className="pm-control-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Swimlanes:</span>
          <select
            className="pm-select"
            value={swimlaneMode}
            onChange={e => setSwimlaneMode(e.target.value)}
          >
            <option value="none">Standard Board</option>
            <option value="priority">Group by Priority</option>
          </select>
        </div>
      </div>

      {/* Board Columns */}
      <div className="pm-kanban-board">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => (t.status || 'To Do') === col.id);
          const isOverWip = col.wipLimit && colTasks.length > col.wipLimit;

          return (
            <div
              key={col.id}
              className="pm-kanban-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column Header */}
              <div className="pm-kanban-column-header">
                <div className="pm-kanban-column-title">
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }} />
                  <span>{col.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span className="pm-kanban-counter" style={{ background: isOverWip ? '#fee2e2' : undefined, color: isOverWip ? '#dc2626' : undefined }}>
                    {colTasks.length} {col.wipLimit ? `/ ${col.wipLimit}` : ''}
                  </span>
                  <button
                    onClick={() => setQuickAddColumn(col.id)}
                    style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                    title="Quick Add"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Cards List */}
              <div className="pm-kanban-card-list">
                
                {/* Quick Add Card Input */}
                {quickAddColumn === col.id && (
                  <form
                    onSubmit={(e) => handleQuickAdd(e, col.id)}
                    style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #c7d2fe', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                  >
                    <input
                      autoFocus
                      className="pm-search-input"
                      placeholder="Card title..."
                      value={quickTitle}
                      onChange={e => setQuickTitle(e.target.value)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                      <button type="button" className="pm-btn pm-btn-ghost pm-btn-sm" onClick={() => setQuickAddColumn(null)}>
                        Cancel
                      </button>
                      <button type="submit" className="pm-btn pm-btn-primary pm-btn-sm">
                        Add
                      </button>
                    </div>
                  </form>
                )}

                {/* Cards */}
                {colTasks.map(task => {
                  const tId = task.id || task._dbId;
                  const subtasks = task.subtasks || [];
                  const completedSubtasks = subtasks.filter(s => s.completed).length;
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done';

                  return (
                    <div
                      key={tId}
                      className={`pm-kanban-card ${draggedTaskId === tId ? 'dragging' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, tId)}
                      onClick={() => setSelectedTaskForDrawer(task)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b' }}>
                          #{tId.slice(-4).toUpperCase()}
                        </span>
                        <PriorityBadge priority={task.priority} />
                      </div>

                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.65rem', lineHeight: 1.4 }}>
                        {task.name}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {task.dueDate && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isOverdue ? '#dc2626' : '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={11} /> {formatRelativeDate(task.dueDate)}
                            </span>
                          )}

                          {subtasks.length > 0 && (
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <CheckSquare size={11} /> {completedSubtasks}/{subtasks.length}
                            </span>
                          )}
                        </div>

                        <UserAvatarGroup userIds={task.assigneeIds} users={allAssignees} max={2} />
                      </div>
                    </div>
                  );
                })}

                {colTasks.length === 0 && !quickAddColumn && (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8', fontSize: '0.775rem' }}>
                    Drag tasks here
                  </div>
                )}

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default ProjectKanbanView;

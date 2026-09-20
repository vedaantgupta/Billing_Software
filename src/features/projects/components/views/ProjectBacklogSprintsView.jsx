import React, { useState } from 'react';
import { Plus, Play, CheckCircle2, ChevronRight, Layers, Flame, ArrowRight } from 'lucide-react';
import { useProject } from '@/features/projects/context/ProjectContext';
import { StatusBadge, PriorityBadge, UserAvatarGroup } from '@/features/projects/components/common/ProjectBadges';

const ProjectBacklogSprintsView = () => {
  const {
    tasks,
    sprints,
    addSprint,
    updateSprint,
    updateTask,
    staff,
    members,
    setSelectedTaskForDrawer,
    setIsTaskModalOpen
  } = useProject();

  const [isCreatingSprint, setIsCreatingSprint] = useState(false);
  const [sprintName, setSprintName] = useState(`Sprint ${sprints.length + 1}`);
  const [sprintGoal, setSprintGoal] = useState('');
  const [sprintStart, setSprintStart] = useState(new Date().toISOString().split('T')[0]);
  const [sprintEnd, setSprintEnd] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);

  const allAssignees = [...staff, ...members];

  // Backlog tasks
  const backlogTasks = tasks.filter(t => t.inBacklog || !t.sprintId);

  // Active Sprint
  const activeSprint = sprints.find(s => s.status === 'Active') || sprints[0];
  const activeSprintTasks = activeSprint ? tasks.filter(t => t.sprintId === (activeSprint.id || activeSprint._dbId) && !t.inBacklog) : [];

  const totalSprintPoints = activeSprintTasks.reduce((sum, t) => sum + (Number(t.storyPoints) || 1), 0);
  const completedSprintPoints = activeSprintTasks.filter(t => t.status === 'Done').reduce((sum, t) => sum + (Number(t.storyPoints) || 1), 0);
  const sprintProgress = totalSprintPoints > 0 ? Math.round((completedSprintPoints / totalSprintPoints) * 100) : 0;

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    if (!sprintName.trim()) return;
    await addSprint({
      name: sprintName.trim(),
      goal: sprintGoal.trim(),
      startDate: sprintStart,
      endDate: sprintEnd,
      status: sprints.length === 0 ? 'Active' : 'Planning'
    });
    setIsCreatingSprint(false);
  };

  const handleMoveToSprint = async (taskId, targetSprintId) => {
    await updateTask(taskId, {
      sprintId: targetSprintId,
      inBacklog: false
    });
  };

  const handleMoveToBacklog = async (taskId) => {
    await updateTask(taskId, {
      sprintId: null,
      inBacklog: true
    });
  };

  const handleCompleteSprint = async () => {
    if (!activeSprint) return;
    if (window.confirm(`Complete ${activeSprint.name}? Remaining incomplete tasks will return to the backlog.`)) {
      // Incomplete tasks to backlog
      const incomplete = activeSprintTasks.filter(t => t.status !== 'Done');
      for (const t of incomplete) {
        await updateTask(t.id || t._dbId, { sprintId: null, inBacklog: true });
      }
      await updateSprint(activeSprint.id || activeSprint._dbId, { status: 'Completed' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem 1.75rem' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Agile Sprints & Backlog</h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Plan sprint iterations, assign story points, and monitor sprint delivery velocity
          </p>
        </div>

        <button className="pm-btn pm-btn-primary" onClick={() => setIsCreatingSprint(true)}>
          <Plus size={16} /> Plan New Sprint
        </button>
      </div>

      {/* New Sprint Modal */}
      {isCreatingSprint && (
        <div className="pm-drawer-backdrop" onClick={() => setIsCreatingSprint(false)} style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div className="pm-card" style={{ width: '100%', maxWidth: '480px', background: 'white', padding: '1.75rem' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 800 }}>Create Sprint</h3>
            <form onSubmit={handleCreateSprint} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Sprint Name</label>
                <input className="pm-search-input" value={sprintName} onChange={e => setSprintName(e.target.value)} required />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Sprint Goal</label>
                <textarea className="pm-search-input" placeholder="e.g. Deliver checkout flow & Stripe payments" value={sprintGoal} onChange={e => setSprintGoal(e.target.value)} style={{ minHeight: '70px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Start Date</label>
                  <input type="date" className="pm-select" style={{ width: '100%' }} value={sprintStart} onChange={e => setSprintStart(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>End Date</label>
                  <input type="date" className="pm-select" style={{ width: '100%' }} value={sprintEnd} onChange={e => setSprintEnd(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="pm-btn pm-btn-secondary" onClick={() => setIsCreatingSprint(false)}>Cancel</button>
                <button type="submit" className="pm-btn pm-btn-primary">Create Sprint</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Sprint Section */}
      {activeSprint && (
        <div className="pm-card" style={{ border: '1px solid #c7d2fe', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '6px', background: '#4f46e5', color: 'white' }}>
                ACTIVE SPRINT
              </span>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>{activeSprint.name}</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {activeSprint.startDate} → {activeSprint.endDate}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4f46e5' }}>
                {completedSprintPoints} / {totalSprintPoints} Story Points
              </span>
              <button className="pm-btn pm-btn-secondary pm-btn-sm" onClick={handleCompleteSprint}>
                <CheckCircle2 size={14} color="#10b981" /> Complete Sprint
              </button>
            </div>
          </div>

          {activeSprint.goal && (
            <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem', fontStyle: 'italic' }}>
              <strong>Goal:</strong> {activeSprint.goal}
            </div>
          )}

          <div className="pm-progress-bar" style={{ marginBottom: '1rem' }}>
            <div className="pm-progress-fill" style={{ width: `${sprintProgress}%` }} />
          </div>

          {/* Active Sprint Tasks List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {activeSprintTasks.map(task => {
              const tId = task.id || task._dbId;
              return (
                <div
                  key={tId}
                  onClick={() => setSelectedTaskForDrawer(task)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#4f46e5', background: '#e0e7ff', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                      {task.storyPoints || 1} SP
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{task.name}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge status={task.status} />
                    <button
                      className="pm-btn pm-btn-ghost pm-btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveToBacklog(tId);
                      }}
                      title="Send back to Backlog"
                    >
                      Backlog
                    </button>
                  </div>
                </div>
              );
            })}

            {activeSprintTasks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                No tasks in this sprint yet. Move tasks from the backlog below!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Backlog Section */}
      <div className="pm-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Product Backlog</h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{backlogTasks.length} unassigned backlog items</span>
          </div>

          <button className="pm-btn pm-btn-secondary pm-btn-sm" onClick={() => setIsTaskModalOpen(true)}>
            <Plus size={14} /> Add Backlog Item
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {backlogTasks.map(task => {
            const tId = task.id || task._dbId;
            return (
              <div
                key={tId}
                onClick={() => setSelectedTaskForDrawer(task)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '4px', background: '#e2e8f0', color: '#475569' }}>
                    {task.type || 'STORY'}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{task.name}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <PriorityBadge priority={task.priority} />
                  {activeSprint && (
                    <button
                      className="pm-btn pm-btn-primary pm-btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveToSprint(tId, activeSprint.id || activeSprint._dbId);
                      }}
                    >
                      Move to Sprint <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {backlogTasks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>
              Product Backlog is currently empty.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ProjectBacklogSprintsView;

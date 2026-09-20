import React, { useState } from 'react';
import { Calendar, Clock, Flag, ChevronRight, Layers } from 'lucide-react';
import { useProject } from '@/features/projects/context/ProjectContext';
import { StatusBadge, PriorityBadge } from '@/features/projects/components/common/ProjectBadges';

const ProjectTimelineView = () => {
  const {
    tasks,
    milestones,
    activeProject,
    setSelectedTaskForDrawer
  } = useProject();

  const [filterType, setFilterType] = useState('all');

  const filteredTasks = tasks.filter(t => {
    if (filterType === 'milestone') return Boolean(t.milestoneId);
    if (filterType === 'epic') return t.type === 'Epic';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem 1.75rem', gap: '1.5rem' }}>
      
      {/* Top Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Filter Timeline:</span>
          <button
            className={`pm-btn pm-btn-sm ${filterType === 'all' ? 'pm-btn-primary' : 'pm-btn-secondary'}`}
            onClick={() => setFilterType('all')}
          >
            All Work
          </button>
          <button
            className={`pm-btn pm-btn-sm ${filterType === 'epic' ? 'pm-btn-primary' : 'pm-btn-secondary'}`}
            onClick={() => setFilterType('epic')}
          >
            Epics & Phases
          </button>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
          Showing {filteredTasks.length} timeline items • {milestones.length} milestones
        </div>
      </div>

      {/* Milestones Road */}
      {milestones.length > 0 && (
        <div className="pm-card" style={{ background: '#f8fafc', padding: '1.25rem' }}>
          <span className="pm-drawer-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Flag size={14} color="#f59e0b" /> Milestone Roadmap
          </span>
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '1rem 0' }}>
            {milestones.sort((a, b) => new Date(a.date) - new Date(b.date)).map(m => (
              <div
                key={m.id || m._dbId}
                style={{
                  flex: '0 0 200px',
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '0.85rem',
                  borderTop: `4px solid ${m.status === 'Achieved' ? '#10b981' : '#f59e0b'}`
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>{m.date || 'No Date'}</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, margin: '0.25rem 0' }}>{m.name}</div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: m.status === 'Achieved' ? '#10b981' : '#f59e0b' }}>
                  {m.status || 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Stream */}
      <div className="pm-card" style={{ padding: '1.5rem' }}>
        <span className="pm-drawer-section-title" style={{ marginBottom: '1rem' }}>Task Timeline Progression</span>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
          {/* Vertical line connecting tasks */}
          <div style={{ position: 'absolute', top: 15, bottom: 15, left: 18, width: '2px', background: '#e2e8f0', zIndex: 1 }} />

          {filteredTasks.map((t, idx) => (
            <div
              key={t.id || t._dbId}
              onClick={() => setSelectedTaskForDrawer(t)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                position: 'relative',
                zIndex: 2,
                cursor: 'pointer',
                padding: '0.5rem 0'
              }}
            >
              {/* Dot */}
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: t.status === 'Done' ? '#10b981' : '#4f46e5',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  boxShadow: '0 0 0 4px white',
                  flexShrink: 0
                }}
              >
                {idx + 1}
              </div>

              {/* Task Bar Details */}
              <div
                style={{
                  flex: 1,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'transform 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{t.name}</span>
                    <StatusBadge status={t.status} />
                    <PriorityBadge priority={t.priority} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {t.startDate ? `Starts ${t.startDate}` : 'Start: TBD'} • {t.dueDate ? `Due ${t.dueDate}` : 'Due: TBD'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                    {t.actualHours || 0}/{t.estimatedHours || 0} hrs
                  </span>
                  <ChevronRight size={18} color="#94a3b8" />
                </div>
              </div>
            </div>
          ))}

          {filteredTasks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              No tasks scheduled on timeline.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ProjectTimelineView;

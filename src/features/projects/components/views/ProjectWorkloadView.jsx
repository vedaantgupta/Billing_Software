import React from 'react';
import { Users, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { useProject } from '@/features/projects/context/ProjectContext';

const STANDARD_CAPACITY_HOURS = 40; // 40h/week standard capacity

const ProjectWorkloadView = () => {
  const {
    tasks,
    staff,
    members,
    setSelectedTaskForDrawer
  } = useProject();

  const allTeam = [...staff, ...members];

  // Calculate allocation per member
  const memberWorkload = allTeam.map(member => {
    const mId = member.id || member._dbId || member.userId;
    const assignedTasks = tasks.filter(t => (t.assigneeIds || []).includes(mId) && t.status !== 'Done');
    const allocatedHours = assignedTasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 8), 0);
    const utilizationPct = Math.round((allocatedHours / STANDARD_CAPACITY_HOURS) * 100);
    const isOverallocated = allocatedHours > STANDARD_CAPACITY_HOURS;

    return {
      id: mId,
      name: member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Team Member',
      role: member.role || member.designation || 'Engineer',
      assignedTasks,
      allocatedHours,
      utilizationPct,
      isOverallocated
    };
  });

  // Unassigned workload
  const unassignedTasks = tasks.filter(t => (!t.assigneeIds || t.assigneeIds.length === 0) && t.status !== 'Done');
  const unassignedHours = unassignedTasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 8), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem 1.75rem' }}>
      
      {/* Overview Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Resource & Capacity Planning</h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Track team availability against active workloads to prevent project bottlenecks
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', fontWeight: 700 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} /> Optimal (&lt;100%)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} /> Overallocated (&gt;100%)
          </span>
        </div>
      </div>

      {/* Unassigned Work Alert */}
      {unassignedTasks.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <AlertTriangle size={18} color="#f59e0b" />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.875rem', color: '#92400e' }}>
                {unassignedTasks.length} unassigned tasks ({unassignedHours} estimated hours)
              </div>
              <div style={{ fontSize: '0.75rem', color: '#b45309' }}>
                Assign these tasks to team members to balance project delivery
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Member Capacity Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {memberWorkload.map(member => (
          <div key={member.id} className="pm-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {member.name[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>{member.name}</h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{member.role}</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: member.isOverallocated ? '#dc2626' : '#1e293b' }}>
                  {member.allocatedHours} / {STANDARD_CAPACITY_HOURS} hrs ({member.utilizationPct}%)
                </div>
                <div style={{ fontSize: '0.75rem', color: member.isOverallocated ? '#dc2626' : '#10b981', fontWeight: 700 }}>
                  {member.isOverallocated ? `Overloaded (+${member.allocatedHours - STANDARD_CAPACITY_HOURS}h)` : 'Available Capacity'}
                </div>
              </div>
            </div>

            {/* Utilization Bar */}
            <div className="pm-progress-bar" style={{ height: '8px' }}>
              <div
                className="pm-progress-fill"
                style={{
                  width: `${Math.min(100, member.utilizationPct)}%`,
                  background: member.isOverallocated ? '#ef4444' : '#10b981'
                }}
              />
            </div>

            {/* Assigned Tasks Tags */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              {member.assignedTasks.map(t => (
                <div
                  key={t.id || t._dbId}
                  onClick={() => setSelectedTaskForDrawer(t)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.775rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <span>{t.name}</span>
                  <span style={{ color: '#64748b', fontSize: '0.7rem' }}>({t.estimatedHours || 8}h)</span>
                </div>
              ))}

              {member.assignedTasks.length === 0 && (
                <span style={{ fontSize: '0.775rem', color: '#94a3b8' }}>No active tasks assigned.</span>
              )}
            </div>
          </div>
        ))}

        {memberWorkload.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            No staff or team members added to this workspace yet.
          </div>
        )}
      </div>

    </div>
  );
};

export default ProjectWorkloadView;

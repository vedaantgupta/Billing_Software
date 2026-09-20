import React, { useState } from 'react';
import {
  Target, Clock, AlertTriangle, ShieldCheck, DollarSign,
  CheckCircle2, Sparkles, ArrowRight, Layers, Users, Calendar
} from 'lucide-react';
import { useProject } from '@/features/projects/context/ProjectContext';
import { HealthBadge, StatusBadge, PriorityBadge } from '@/features/projects/components/common/ProjectBadges';
import { API_BASE_URL } from '@/config/api';

const ProjectOverviewTab = ({ onSwitchTab }) => {
  const {
    activeProject,
    tasks,
    milestones,
    expenses,
    projectHealth,
    dependencyAnalysis,
    overallProgress,
    setSelectedTaskForDrawer
  } = useProject();

  const [aiSummary, setAiSummary] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  if (!activeProject) return null;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Done' || t.status === 'Completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
  const now = new Date();
  const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'Done');
  const upcomingMilestones = milestones
    .filter(m => m.status !== 'Achieved')
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

  // Trigger AI Executive Summary
  const handleGenerateAiSummary = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/project-copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'summary',
          projectContext: {
            project: activeProject,
            tasks: tasks.slice(0, 30),
            milestones,
            health: projectHealth
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.response);
      }
    } catch (err) {
      console.error('AI Summary error:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem 1.75rem' }}>
      
      {/* Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        
        {/* Health Card */}
        <div className="pm-card" style={{ borderLeft: `4px solid ${projectHealth.color}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Project Health</span>
            <HealthBadge health={projectHealth} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0.5rem 0', color: projectHealth.color }}>
            {projectHealth.score}%
          </div>
          <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
            {projectHealth.reasons?.[0] || 'Schedule and budget running smoothly.'}
          </div>
        </div>

        {/* Progress Card */}
        <div className="pm-card" style={{ borderLeft: '4px solid #4f46e5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Completion Progress</span>
            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#4f46e5' }}>{completedTasks}/{totalTasks} Done</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0.5rem 0', color: '#1e293b' }}>
            {overallProgress}%
          </div>
          <div className="pm-progress-bar" style={{ marginTop: '0.5rem' }}>
            <div className="pm-progress-fill" style={{ width: `${overallProgress}%` }} />
          </div>
        </div>

        {/* Financial Card */}
        <div className="pm-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Financials (Spend vs Budget)</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: projectHealth.totalSpend > projectHealth.budget && projectHealth.budget > 0 ? '#ef4444' : '#10b981' }}>
              {projectHealth.budget > 0 ? `${Math.round((projectHealth.totalSpend / projectHealth.budget) * 100)}% used` : 'No budget set'}
            </span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0.5rem 0', color: '#1e293b' }}>
            ₹{projectHealth.totalSpend.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Allocated: ₹{Number(activeProject.budget || 0).toLocaleString()} • Labor: ₹{projectHealth.laborCost.toLocaleString()}
          </div>
        </div>

        {/* Schedule & Blockers */}
        <div className="pm-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Attention Items</span>
            <AlertTriangle size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0.5rem 0', color: overdueTasks.length > 0 ? '#ef4444' : '#10b981' }}>
            {overdueTasks.length} Overdue
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {projectHealth.blockedTasksCount} task(s) currently blocked by dependencies.
          </div>
        </div>

      </div>

      {/* AI Summary Banner */}
      <div className="pm-card" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)', border: '1px solid #c7d2fe' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: aiSummary ? '1rem' : '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>AI Project Executive Brief</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Grounded in real-time project metrics, milestone schedules, and task dependencies</p>
            </div>
          </div>
          <button
            className="pm-btn pm-btn-primary pm-btn-sm"
            onClick={handleGenerateAiSummary}
            disabled={loadingAi}
          >
            <Sparkles size={14} /> {loadingAi ? 'Analyzing Data...' : aiSummary ? 'Regenerate Brief' : 'Generate Brief'}
          </button>
        </div>

        {aiSummary && (
          <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e0e7ff', fontSize: '0.85rem', color: '#1e293b', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {aiSummary}
          </div>
        )}
      </div>

      {/* Main 2-Column Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        
        {/* Left Column: Scope & Objectives + Critical Path */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Vision & Objectives */}
          <div className="pm-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
              <Target size={18} color="#4f46e5" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Vision & Scope</h3>
            </div>
            <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
              {activeProject.vision || activeProject.description || 'No detailed scope written yet.'}
            </p>

            {activeProject.objectives && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Key Objectives</span>
                <p style={{ color: '#334155', fontSize: '0.85rem', lineHeight: 1.5, marginTop: '0.4rem', whiteSpace: 'pre-wrap' }}>
                  {activeProject.objectives}
                </p>
              </div>
            )}
          </div>

          {/* Critical Path & Urgent Tasks */}
          <div className="pm-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Layers size={18} color="#ef4444" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Critical Path & High Priority</h3>
              </div>
              <button
                className="pm-btn pm-btn-ghost pm-btn-sm"
                onClick={() => onSwitchTab('gantt')}
              >
                View on Gantt <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tasks.filter(t => dependencyAnalysis.criticalTaskIds?.has(t.id || t._dbId) || t.priority === 'Urgent').slice(0, 5).map(t => (
                <div
                  key={t.id || t._dbId}
                  onClick={() => setSelectedTaskForDrawer(t)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.9rem',
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{t.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              ))}

              {tasks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  No tasks created yet.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Milestones & Dates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Milestones Widget */}
          <div className="pm-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Calendar size={18} color="#4f46e5" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Milestones</h3>
              </div>
              <button
                className="pm-btn pm-btn-ghost pm-btn-sm"
                onClick={() => onSwitchTab('timeline')}
              >
                All <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {upcomingMilestones.map(m => {
                const isMissed = m.date && new Date(m.date) < now && m.status !== 'Achieved';
                return (
                  <div
                    key={m.id || m._dbId}
                    style={{
                      padding: '0.75rem',
                      background: isMissed ? '#fef2f2' : '#f8fafc',
                      borderRadius: '10px',
                      border: `1px solid ${isMissed ? '#fca5a5' : '#e2e8f0'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{m.name}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isMissed ? '#dc2626' : '#64748b' }}>
                        {m.date || 'No Date'}
                      </span>
                    </div>
                    {isMissed && (
                      <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '0.25rem', fontWeight: 700 }}>
                        Missed Target Date
                      </div>
                    )}
                  </div>
                );
              })}

              {upcomingMilestones.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                  No upcoming milestones defined.
                </div>
              )}
            </div>
          </div>

          {/* Project Details Meta */}
          <div className="pm-card">
            <span className="pm-drawer-section-title">Schedule Information</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem', fontSize: '0.825rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Start Date:</span>
                <span style={{ fontWeight: 700 }}>{activeProject.startDate || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Target End:</span>
                <span style={{ fontWeight: 700 }}>{activeProject.endDate || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Client:</span>
                <span style={{ fontWeight: 700 }}>{activeProject.clientName || 'Internal'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Priority:</span>
                <PriorityBadge priority={activeProject.priority || 'Medium'} />
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default ProjectOverviewTab;

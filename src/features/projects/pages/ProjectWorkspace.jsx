import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Briefcase, CheckSquare, BarChart3, Clock, Bell, Plus,
  Search, Layers, Sparkles, AlertTriangle, ArrowRight, CheckCircle2,
  Calendar, Trash2, Edit2, Play, Square, ExternalLink,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { ProjectProvider, useProject } from '@/features/projects/context/ProjectContext';
import { StatusBadge, PriorityBadge, HealthBadge } from '@/features/projects/components/common/ProjectBadges';
import TaskDetailDrawer from '@/features/projects/components/TaskDetailDrawer';
import TaskCreateModal from '@/features/projects/components/TaskCreateModal';
import CommandPalette from '@/features/projects/components/CommandPalette';
import BulkActionBar from '@/features/projects/components/BulkActionBar';
import ProjectModal from '@/features/projects/components/ProjectModal';
import { useAuth } from '@/hooks/useAuth';
import { addItem } from '@/utils/db';
import { API_BASE_URL } from '@/config/api';
import { calculateProjectHealth, formatRelativeDate } from '@/features/projects/utils/projectCalculations';
import '@/features/projects/styles/ProjectManager.css';

const TEMPLATES = [
  {
    id: 'tmpl-web',
    name: 'Website Launch',
    category: 'Engineering',
    description: 'Complete website development lifecycle from wireframing to staging and production release.',
    tasks: ['Information Architecture & UX Wireframes', 'Design System & UI Tokens', 'Frontend Component Implementation', 'Backend API & Database Integration', 'Cross-browser & Mobile QA', 'DNS Configuration & Production Deployment']
  },
  {
    id: 'tmpl-software',
    name: 'Software Agile Sprint',
    category: 'Product',
    description: 'Standard 2-week agile Scrum sprint with backlog refinement, planning, and delivery.',
    tasks: ['Sprint Planning & Story Estimation', 'Core Feature Development', 'Unit & Integration Test Suite', 'Code Review & PR Approvals', 'Staging Verification', 'Sprint Retrospective']
  },
  {
    id: 'tmpl-marketing',
    name: 'Marketing Campaign',
    category: 'Growth',
    description: 'Multi-channel acquisition campaign with content creation, ad creatives, and performance tracking.',
    tasks: ['Target Audience & Messaging Strategy', 'Ad Copy & Creative Asset Production', 'Landing Page Optimization', 'Email Sequence Setup', 'Campaign Launch across Ad Networks', 'Weekly ROI & Conversion Analytics']
  },
  {
    id: 'tmpl-client',
    name: 'Client Onboarding',
    category: 'Operations',
    description: 'Streamlined client kickoff, KYC verification, workspace configuration, and handover training.',
    tasks: ['Kickoff Discovery Call', 'Contract & Billing Terms Signoff', 'Workspace & Account Provisioning', 'Team Training & Product Walkthrough', 'First Project Setup & Review']
  },
  {
    id: 'tmpl-product',
    name: 'Product Launch GTM',
    category: 'Product',
    description: 'Go-To-Market execution for new product announcements, press outreach, and sales enablement.',
    tasks: ['Product Positioning Document', 'Demo Video & Press Kit Preparation', 'Sales Enablement One-Pagers', 'Early Beta Customer Testimonials', 'Public Launch Event & Social Push']
  },
  {
    id: 'tmpl-hr',
    name: 'HR Hiring & Onboarding',
    category: 'People',
    description: 'End-to-end recruitment pipeline and employee first-month onboarding journey.',
    tasks: ['Job Description & Compensation Benchmarking', 'Candidate Sourcing & Screening', 'Technical & Culture Fit Interviews', 'Offer Letter Negotiation', 'Hardware & Tooling Provisioning', '30-Day Check-in & Feedback']
  }
];

const WorkspaceInner = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'projects'; // 'projects', 'portfolio', 'mywork', 'inbox', 'timetracking', 'templates'

  const {
    projects,
    allTasks,
    allMilestones,
    allExpenses,
    allTimeLogs,
    notifications,
    markNotificationRead,
    loading,
    refreshAllData,
    setIsTaskModalOpen,
    setSelectedTaskForDrawer,
    activeTimer,
    elapsedSeconds,
    startTimer,
    stopTimer,
    addTask
  } = useProject();

  const { user } = useAuth();
  const [projectSearch, setProjectSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  // Scroller Controls for Tab Navigation Bar
  const tabsContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = tabsContainerRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 6);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
    }
  }, []);

  useEffect(() => {
    const el = tabsContainerRef.current;
    if (el) {
      checkScroll();
      const t1 = setTimeout(checkScroll, 150);
      const t2 = setTimeout(checkScroll, 500);
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [checkScroll, projects.length, allTasks.length]);

  const handleScroll = (direction) => {
    const el = tabsContainerRef.current;
    if (el) {
      const scrollAmount = direction === 'left' ? -240 : 240;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScroll, 320);
    }
  };

  useEffect(() => {
    const activeEl = tabsContainerRef.current?.querySelector('.pm-tab-btn.active');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentTab]);

  // Filtered Projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.clientName || '').toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.projectId || '').toLowerCase().includes(projectSearch.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Personal "My Work" Tasks
  const myTasks = allTasks.filter(t => (t.assigneeIds || []).includes(user?.id) || (!t.assigneeIds?.length && t.reporterId === user?.id));
  const now = new Date();
  const myOverdueTasks = myTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'Done');
  const myDueTodayTasks = myTasks.filter(t => t.dueDate && t.dueDate === now.toISOString().split('T')[0] && t.status !== 'Done');
  const myUpcomingTasks = myTasks.filter(t => (!t.dueDate || new Date(t.dueDate) > now) && t.status !== 'Done');
  const myCompletedTasks = myTasks.filter(t => t.status === 'Done');

  // Portfolio aggregates
  const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  const totalCompletedTasks = allTasks.filter(t => t.status === 'Done').length;
  const portfolioProgress = allTasks.length > 0 ? Math.round((totalCompletedTasks / allTasks.length) * 100) : 0;

  // Use Template Handler
  const handleApplyTemplate = async (tmpl) => {
    if (!user?.id) return;
    const confirmDeploy = window.confirm(`Launch a new project from "${tmpl.name}" with ${tmpl.tasks.length} starter tasks?`);
    if (!confirmDeploy) return;

    try {
      const generatedCode = `PRJ-${Math.floor(1000 + Math.random() * 9000)}`;
      const newProjData = {
        name: `${tmpl.name} Project`,
        projectId: generatedCode,
        description: tmpl.description,
        status: 'In Progress',
        startDate: new Date().toISOString().split('T')[0],
        budget: 150000,
        color: '#4f46e5'
      };

      const createdProject = await addItem('projects', newProjData, user.id, user.firstName);
      if (!createdProject) return;

      const pId = createdProject._dbId || createdProject.id || generatedCode;

      // Join member as Admin
      try {
        await fetch(`${API_BASE_URL}/project-members/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: generatedCode,
            userId: user.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            email: user.email || '',
            role: 'Admin'
          })
        });
      } catch (err) {
        console.warn('Member registration notice:', err);
      }

      // Seed starter tasks
      for (let i = 0; i < tmpl.tasks.length; i++) {
        const tTitle = tmpl.tasks[i];
        const taskPayload = {
          projectId: pId,
          name: tTitle,
          description: `Auto-generated task from ${tmpl.name} template workflow.`,
          type: 'Task',
          status: i === 0 ? 'In Progress' : 'To Do',
          priority: i === 0 ? 'High' : 'Medium',
          assigneeIds: [user.id],
          assigneeNames: [`${user.firstName || ''} ${user.lastName || ''}`.trim()],
          startDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + (i + 1) * 3 * 86400000).toISOString().split('T')[0],
          estimatedHours: 8 + (i * 2),
          actualHours: 0,
          storyPoints: 3,
          subtasks: [],
          dependencies: [],
          tags: [tmpl.category],
          createdAt: new Date().toISOString()
        };
        await addItem('project_tasks', taskPayload, user.id, user.firstName);
      }

      await refreshAllData();
      navigate(`/projects/${pId}`);
    } catch (err) {
      console.error('Error applying template:', err);
      alert('Could not initialize template project. Please try again.');
    }
  };

  return (
    <div className="pm-container">
      
      {/* Workspace Header */}
      <div className="pm-workspace-header">
        <div className="pm-header-row">
          <div className="pm-header-title-group">
            <div className="pm-header-icon">
              <Briefcase size={22} />
            </div>
            <div>
              <h1 className="pm-header-title">Project Workspace</h1>
              <p className="pm-header-subtitle">
                Unified enterprise hub for portfolios, projects, tasks, sprints, and time tracking
              </p>
            </div>
          </div>

          <div className="pm-header-actions">
            {/* Active Stopwatch Widget */}
            {activeTimer?.isRunning && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#fee2e2', border: '1px solid #fca5a5', padding: '0.35rem 0.75rem', borderRadius: '10px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#991b1b', fontFamily: 'monospace' }}>
                  {new Date(elapsedSeconds * 1000).toISOString().substr(11, 8)}
                </span>
                <button
                  onClick={stopTimer}
                  className="pm-btn pm-btn-danger pm-btn-sm"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                >
                  Stop
                </button>
              </div>
            )}

            <button
              className="pm-btn pm-btn-secondary"
              onClick={() => {
                setEditingProject(null);
                setIsProjectModalOpen(true);
              }}
            >
              <Plus size={16} /> New Project
            </button>

            <button
              className="pm-btn pm-btn-primary"
              onClick={() => setIsTaskModalOpen(true)}
            >
              <Plus size={16} /> Quick Task
            </button>
          </div>
        </div>

        {/* Workspace Navigation Tabs with Scroller */}
        <div className="pm-nav-tabs-wrapper">
          {canScrollLeft && (
            <button
              className="pm-nav-scroll-btn left"
              onClick={() => handleScroll('left')}
              title="Scroll left"
              aria-label="Scroll tabs left"
            >
              <ChevronLeft size={16} />
            </button>
          )}

          <div className="pm-nav-tabs" ref={tabsContainerRef}>
            <button className={`pm-tab-btn ${currentTab === 'projects' ? 'active' : ''}`} onClick={() => setTab('projects')}>
              <Briefcase size={16} /> Projects Directory <span className="pm-tab-badge">{projects.length}</span>
            </button>

            <button className={`pm-tab-btn ${currentTab === 'portfolio' ? 'active' : ''}`} onClick={() => setTab('portfolio')}>
              <BarChart3 size={16} /> Portfolio & Analytics
            </button>

            <button className={`pm-tab-btn ${currentTab === 'mywork' ? 'active' : ''}`} onClick={() => setTab('mywork')}>
              <CheckSquare size={16} /> My Work <span className="pm-tab-badge">{myTasks.filter(t => t.status !== 'Done').length}</span>
            </button>

            <button className={`pm-tab-btn ${currentTab === 'timetracking' ? 'active' : ''}`} onClick={() => setTab('timetracking')}>
              <Clock size={16} /> Time Tracking
            </button>

            <button className={`pm-tab-btn ${currentTab === 'inbox' ? 'active' : ''}`} onClick={() => setTab('inbox')}>
              <Bell size={16} /> Inbox {notifications.filter(n => !n.read).length > 0 && <span className="pm-tab-badge" style={{ background: '#ef4444', color: 'white' }}>{notifications.filter(n => !n.read).length}</span>}
            </button>

            <button className={`pm-tab-btn ${currentTab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}>
              <Layers size={16} /> Project Templates
            </button>
          </div>

          {canScrollRight && (
            <button
              className="pm-nav-scroll-btn right"
              onClick={() => handleScroll('right')}
              title="Scroll right"
              aria-label="Scroll tabs right"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: PROJECTS DIRECTORY */}
      {currentTab === 'projects' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          
          {/* Controls Bar */}
          <div className="pm-control-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div className="pm-search-input-wrapper">
                <Search className="pm-search-icon" size={16} />
                <input
                  className="pm-search-input"
                  placeholder="Search projects by name, key, or client..."
                  value={projectSearch}
                  onChange={e => setProjectSearch(e.target.value)}
                />
              </div>

              <div className="pm-filters-group">
                <select className="pm-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="all">All Statuses</option>
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="At Risk">At Risk</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Showing {filteredProjects.length} of {projects.length} projects
            </div>
          </div>

          {/* Projects Cards Grid */}
          <div className="pm-grid pm-grid-3">
            {filteredProjects.map(p => {
              const pTasks = allTasks.filter(t => t.projectId === p._dbId || t.projectId === p.id || t.projectId === p.projectId);
              const pMilestones = allMilestones.filter(m => m.projectId === p._dbId || m.projectId === p.id || m.projectId === p.projectId);
              const pExpenses = allExpenses.filter(e => e.projectId === p._dbId || e.projectId === p.id || e.projectId === p.projectId);
              const health = calculateProjectHealth(p, pTasks, pMilestones, pExpenses);
              const completedCount = pTasks.filter(t => t.status === 'Done' || t.status === 'Completed').length;
              const progressPct = pTasks.length > 0 ? Math.round((completedCount / pTasks.length) * 100) : 0;

              return (
                <div
                  key={p._dbId || p.id}
                  className="pm-card"
                  style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                  onClick={() => navigate(`/projects/${p._dbId || p.id}`)}
                >
                  <div>
                    {/* Top row: Project Key & Health */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '6px', background: '#e2e8f0', color: '#475569' }}>
                        {p.projectId || 'PRJ'}
                      </span>
                      <HealthBadge health={health} />
                    </div>

                    {/* Project Name & Client */}
                    <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      {p.name}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
                      Client: <strong>{p.clientName || 'Internal Project'}</strong>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                        <span style={{ color: '#64748b' }}>Progress</span>
                        <span style={{ color: '#4f46e5' }}>{progressPct}% ({completedCount}/{pTasks.length})</span>
                      </div>
                      <div className="pm-progress-bar">
                        <div className="pm-progress-fill" style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Footer Meta */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#64748b' }}>
                    <span>Budget: ₹{Number(p.budget || 0).toLocaleString()}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#4f46e5', fontWeight: 700 }}>
                      Open Workspace <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredProjects.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8' }}>
                <Briefcase size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                <h3 style={{ margin: '0 0 0.5rem' }}>No projects found</h3>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Start by creating your first project above or choose from project templates.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PORTFOLIO & ANALYTICS */}
      {currentTab === 'portfolio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem 1.75rem' }}>
          
          {/* Portfolio Metric Banners */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="pm-card" style={{ borderLeft: '4px solid #4f46e5' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Active Portfolio</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, margin: '0.4rem 0', color: '#1e293b' }}>
                {projects.length}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total managed projects</span>
            </div>

            <div className="pm-card" style={{ borderLeft: '4px solid #10b981' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Portfolio Delivery</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, margin: '0.4rem 0', color: '#1e293b' }}>
                {portfolioProgress}%
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{totalCompletedTasks} of {allTasks.length} tasks completed</span>
            </div>

            <div className="pm-card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Portfolio Budget</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, margin: '0.4rem 0', color: '#1e293b' }}>
                ₹{totalBudget.toLocaleString()}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Allocated across all projects</span>
            </div>
          </div>

          {/* Portfolio Projects Table */}
          <div className="pm-card">
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 800 }}>Portfolio Rollup Matrix</h3>
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Health</th>
                  <th>Progress</th>
                  <th>Tasks</th>
                  <th>Budget</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => {
                  const pTasks = allTasks.filter(t => t.projectId === p._dbId || t.projectId === p.id || t.projectId === p.projectId);
                  const pMilestones = allMilestones.filter(m => m.projectId === p._dbId || m.projectId === p.id || m.projectId === p.projectId);
                  const pExpenses = allExpenses.filter(e => e.projectId === p._dbId || e.projectId === p.id || e.projectId === p.projectId);
                  const health = calculateProjectHealth(p, pTasks, pMilestones, pExpenses);
                  const completed = pTasks.filter(t => t.status === 'Done').length;
                  const pct = pTasks.length > 0 ? Math.round((completed / pTasks.length) * 100) : 0;

                  return (
                    <tr key={p._dbId || p.id} onClick={() => navigate(`/projects/${p._dbId || p.id}`)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 700 }}>
                        <div>{p.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.projectId || 'PRJ'} • {p.clientName || 'Internal'}</div>
                      </td>
                      <td><StatusBadge status={p.status} /></td>
                      <td><HealthBadge health={health} /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="pm-progress-bar" style={{ width: '80px' }}>
                            <div className="pm-progress-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{pct}%</span>
                        </div>
                      </td>
                      <td>{completed}/{pTasks.length}</td>
                      <td>₹{Number(p.budget || 0).toLocaleString()}</td>
                      <td>
                        <button className="pm-btn pm-btn-ghost pm-btn-sm" style={{ color: '#4f46e5' }}>
                          Open <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB 3: MY WORK */}
      {currentTab === 'mywork' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem 1.75rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Personal Command Center: My Work</h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              All tasks assigned to you across all projects, prioritized by urgency and deadlines
            </p>
          </div>

          {/* Overdue Section */}
          {myOverdueTasks.length > 0 && (
            <div className="pm-card" style={{ borderLeft: '4px solid #ef4444' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#dc2626', fontWeight: 800 }}>
                <AlertTriangle size={18} /> Overdue Tasks ({myOverdueTasks.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {myOverdueTasks.map(t => (
                  <div
                    key={t.id || t._dbId}
                    onClick={() => setSelectedTaskForDrawer(t)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fca5a5', cursor: 'pointer' }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{t.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#dc2626' }}>{formatRelativeDate(t.dueDate)}</span>
                      <PriorityBadge priority={t.priority} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Due Today & Upcoming */}
          <div className="pm-card">
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.05rem', fontWeight: 800 }}>Active & Upcoming Tasks ({myUpcomingTasks.length + myDueTodayTasks.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[...myDueTodayTasks, ...myUpcomingTasks].map(t => (
                <div
                  key={t.id || t._dbId}
                  onClick={() => setSelectedTaskForDrawer(t)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{t.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Due: {t.dueDate || 'No due date set'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              ))}

              {myTasks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  No tasks currently assigned to you. You are all caught up!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TIME TRACKING */}
      {currentTab === 'timetracking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem 1.75rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Global Timesheets & Time Logs</h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Comprehensive log of all billable and operational hours recorded across projects
            </p>
          </div>

          <div className="pm-card">
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Task</th>
                  <th>Notes</th>
                  <th style={{ textAlign: 'right' }}>Hours</th>
                </tr>
              </thead>
              <tbody>
                {allTimeLogs.map(tl => (
                  <tr key={tl.id || tl._dbId}>
                    <td>{tl.date || 'Today'}</td>
                    <td style={{ fontWeight: 700 }}>{tl.userName || 'User'}</td>
                    <td>{tl.taskName || 'Project Work'}</td>
                    <td style={{ color: '#64748b' }}>{tl.notes || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#4f46e5' }}>{tl.durationHours} hrs</td>
                  </tr>
                ))}
                {allTimeLogs.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      No time logged yet. Start the live stopwatch or log time in any task drawer!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: INBOX */}
      {currentTab === 'inbox' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem 1.75rem', maxWidth: '780px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Notification Inbox</h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Direct alerts, mentions, deadline notices, and automated workflow events
            </p>
          </div>

          <div className="pm-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {notifications.map(notif => (
              <div
                key={notif.id || notif._dbId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.9rem 1rem',
                  background: notif.read ? '#ffffff' : '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  borderLeft: notif.read ? '1px solid #e2e8f0' : '4px solid #4f46e5'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>{notif.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>{notif.message}</div>
                </div>

                {!notif.read && (
                  <button
                    className="pm-btn pm-btn-ghost pm-btn-sm"
                    onClick={() => markNotificationRead(notif.id || notif._dbId)}
                  >
                    Mark Read
                  </button>
                )}
              </div>
            ))}

            {notifications.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                <Bell size={40} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                Your notification inbox is clean!
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: TEMPLATES */}
      {currentTab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem 1.75rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Pre-configured Project Templates</h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Launch enterprise projects in seconds with proven workflows, task breakdowns, and milestones
            </p>
          </div>

          <div className="pm-grid pm-grid-3">
            {TEMPLATES.map(tmpl => (
              <div key={tmpl.id} className="pm-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#4f46e5', background: '#e0e7ff', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                      {tmpl.category}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{tmpl.tasks.length} tasks</span>
                  </div>

                  <h3 style={{ margin: '0.4rem 0', fontSize: '1.1rem', fontWeight: 800 }}>{tmpl.name}</h3>
                  <p style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1rem' }}>
                    {tmpl.description}
                  </p>

                  <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.75rem' }}>
                    <strong>Starter Tasks:</strong>
                    <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.2rem', lineHeight: 1.5 }}>
                      {tmpl.tasks.slice(0, 3).map((tName, i) => (
                        <li key={i}>{tName}</li>
                      ))}
                      {tmpl.tasks.length > 3 && <li>+{tmpl.tasks.length - 3} more...</li>}
                    </ul>
                  </div>
                </div>

                <button
                  className="pm-btn pm-btn-primary"
                  style={{ width: '100%', marginTop: '1rem' }}
                  onClick={() => handleApplyTemplate(tmpl)}
                >
                  Use Template <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Global Modals & Drawers */}
      <TaskDetailDrawer />
      <TaskCreateModal isOpen={false} onClose={() => {}} />
      <CommandPalette />
      <BulkActionBar />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setEditingProject(null);
        }}
        onSave={() => refreshAllData()}
        editingId={editingProject?._dbId || editingProject?.id}
        initialData={editingProject}
      />

    </div>
  );
};

const ProjectWorkspace = () => {
  return (
    <ProjectProvider>
      <WorkspaceInner />
    </ProjectProvider>
  );
};

export default ProjectWorkspace;

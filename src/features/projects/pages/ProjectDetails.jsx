import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Layout, List, Kanban, BarChart2, Calendar,
  Layers, Users, DollarSign, FileText, FormInput, Zap,
  Sparkles, MessageSquare, Settings, Plus, Edit2, Clock, Video,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { ProjectProvider, useProject } from '@/features/projects/context/ProjectContext';
import { StatusBadge, HealthBadge, PriorityBadge } from '@/features/projects/components/common/ProjectBadges';
import ProjectOverviewTab from '@/features/projects/components/views/ProjectOverviewTab';
import ProjectListView from '@/features/projects/components/views/ProjectListView';
import ProjectKanbanView from '@/features/projects/components/views/ProjectKanbanView';
import ProjectGanttView from '@/features/projects/components/views/ProjectGanttView';
import ProjectTimelineView from '@/features/projects/components/views/ProjectTimelineView';
import ProjectCalendarView from '@/features/projects/components/views/ProjectCalendarView';
import ProjectBacklogSprintsView from '@/features/projects/components/views/ProjectBacklogSprintsView';
import ProjectWorkloadView from '@/features/projects/components/views/ProjectWorkloadView';
import ProjectFinanceView from '@/features/projects/components/views/ProjectFinanceView';
import ProjectDocumentsView from '@/features/projects/components/views/ProjectDocumentsView';
import ProjectFormsView from '@/features/projects/components/views/ProjectFormsView';
import ProjectAutomationsView from '@/features/projects/components/views/ProjectAutomationsView';
import ProjectAIAssistantView from '@/features/projects/components/views/ProjectAIAssistantView';
import ProjectChatTab from '@/features/projects/components/views/ProjectChatTab';
import ProjectSettingsView from '@/features/projects/components/views/ProjectSettingsView';
import TaskDetailDrawer from '@/features/projects/components/TaskDetailDrawer';
import TaskCreateModal from '@/features/projects/components/TaskCreateModal';
import CommandPalette from '@/features/projects/components/CommandPalette';
import BulkActionBar from '@/features/projects/components/BulkActionBar';
import ProjectModal from '@/features/projects/components/ProjectModal';
import '@/features/projects/styles/ProjectManager.css';

const TABS = [
  { id: 'overview', label: 'Overview', icon: <Layout size={16} /> },
  { id: 'list', label: 'List View', icon: <List size={16} /> },
  { id: 'kanban', label: 'Kanban Board', icon: <Kanban size={16} /> },
  { id: 'gantt', label: 'Gantt Chart', icon: <BarChart2 size={16} /> },
  { id: 'timeline', label: 'Timeline', icon: <Clock size={16} /> },
  { id: 'calendar', label: 'Calendar', icon: <Calendar size={16} /> },
  { id: 'sprints', label: 'Backlog & Sprints', icon: <Layers size={16} /> },
  { id: 'workload', label: 'Workload & Capacity', icon: <Users size={16} /> },
  { id: 'finance', label: 'Budget & Finance', icon: <DollarSign size={16} /> },
  { id: 'docs', label: 'Wiki & Docs', icon: <FileText size={16} /> },
  { id: 'forms', label: 'Intake Forms', icon: <FormInput size={16} /> },
  { id: 'automations', label: 'Automations', icon: <Zap size={16} /> },
  { id: 'ai', label: 'AI Copilot', icon: <Sparkles size={16} /> },
  { id: 'chat', label: 'Team Chat', icon: <MessageSquare size={16} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={16} /> }
];

const ProjectDetailsContent = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    activeProject,
    setActiveProjectId,
    tasks,
    projectHealth,
    overallProgress,
    loading,
    refreshAllData,
    setIsTaskModalOpen,
    isTaskModalOpen,
    members
  } = useProject();

  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem(`project_tab_${id}`) || 'overview';
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
  }, [checkScroll, activeProject, tasks.length]);

  const handleScroll = (direction) => {
    const el = tabsContainerRef.current;
    if (el) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScroll, 320);
    }
  };

  useEffect(() => {
    if (id) setActiveProjectId(id);
  }, [id, setActiveProjectId]);

  useEffect(() => {
    sessionStorage.setItem(`project_tab_${id}`, activeTab);
    // Smooth scroll the selected tab into view
    const activeEl = tabsContainerRef.current?.querySelector('.pm-tab-btn.active');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab, id]);

  if (loading && !activeProject) {
    return (
      <div className="pm-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid #cbd5e1', borderTopColor: '#4f46e5', borderRadius: '50%', marginBottom: '1rem' }} />
        <span style={{ fontWeight: 700, color: '#64748b' }}>Loading project workspace...</span>
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="pm-container" style={{ alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
        <div className="pm-card" style={{ maxWidth: '440px', textAlign: 'center', padding: '2.5rem' }}>
          <h2 style={{ margin: '0 0 0.5rem', fontWeight: 800 }}>Project Not Found</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            The requested project could not be loaded or may have been deleted.
          </p>
          <button className="pm-btn pm-btn-primary" onClick={() => navigate('/projects')}>
            Back to Projects Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pm-container">
      
      {/* Project Navigation Top Bar */}
      <div className="pm-workspace-header">
        <div className="pm-header-row">
          <div className="pm-header-title-group">
            <button
              onClick={() => navigate('/projects')}
              className="pm-btn pm-btn-secondary pm-btn-sm"
              title="Back to Projects"
            >
              <ArrowLeft size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: activeProject.color || '#4f46e5',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.1rem'
                }}
              >
                {activeProject.name?.[0]?.toUpperCase() || 'P'}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{activeProject.name}</h1>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '6px', background: '#e2e8f0', color: '#475569' }}>
                    {activeProject.projectId || 'PRJ'}
                  </span>
                  <HealthBadge health={projectHealth} />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                  Client: <strong>{activeProject.clientName || 'Internal'}</strong> • {overallProgress}% Completed ({tasks.filter(t => t.status === 'Done').length}/{tasks.length} tasks)
                </div>
              </div>
            </div>
          </div>

          <div className="pm-header-actions">
            <button
              className="pm-btn pm-btn-secondary pm-btn-sm"
              onClick={() => navigate(`/meet?project=${encodeURIComponent(activeProject.name || activeProject.projectId || '')}`)}
              title="Join or Start Project Video Conference"
            >
              <Video size={14} /> Video Meet
            </button>

            <button
              className="pm-btn pm-btn-secondary pm-btn-sm"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit2 size={14} /> Edit Project
            </button>

            <button
              className="pm-btn pm-btn-primary"
              onClick={() => setIsTaskModalOpen(true)}
            >
              <Plus size={16} /> Add Task
            </button>
          </div>
        </div>

        {/* Dynamic Project Tabs with Scroller */}
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
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`pm-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.id === 'list' && tasks.length > 0 && (
                  <span className="pm-tab-badge">{tasks.length}</span>
                )}
              </button>
            ))}
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

      {/* Tab Content Display */}
      <div style={{ flex: 1 }}>
        {activeTab === 'overview' && <ProjectOverviewTab onSwitchTab={setActiveTab} />}
        {activeTab === 'list' && <ProjectListView />}
        {activeTab === 'kanban' && <ProjectKanbanView />}
        {activeTab === 'gantt' && <ProjectGanttView />}
        {activeTab === 'timeline' && <ProjectTimelineView />}
        {activeTab === 'calendar' && <ProjectCalendarView />}
        {activeTab === 'sprints' && <ProjectBacklogSprintsView />}
        {activeTab === 'workload' && <ProjectWorkloadView />}
        {activeTab === 'finance' && <ProjectFinanceView />}
        {activeTab === 'docs' && <ProjectDocumentsView />}
        {activeTab === 'forms' && <ProjectFormsView />}
        {activeTab === 'automations' && <ProjectAutomationsView />}
        {activeTab === 'ai' && <ProjectAIAssistantView />}
        {activeTab === 'chat' && (
          <ProjectChatTab
            project={activeProject}
            members={members.length > 0 ? members : (activeProject.members || [])}
            myRole="Admin"
            onRefreshMembers={refreshAllData}
          />
        )}
        {activeTab === 'settings' && <ProjectSettingsView />}
      </div>

      {/* Slide-over Drawers & Modals */}
      <TaskDetailDrawer />
      <TaskCreateModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} />
      <CommandPalette />
      <BulkActionBar />

      <ProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={() => refreshAllData()}
        editingId={activeProject._dbId || activeProject.id}
        initialData={activeProject}
      />

    </div>
  );
};

const ProjectDetails = () => {
  const { id } = useParams();

  return (
    <ProjectProvider initialProjectId={id}>
      <ProjectDetailsContent />
    </ProjectProvider>
  );
};

export default ProjectDetails;

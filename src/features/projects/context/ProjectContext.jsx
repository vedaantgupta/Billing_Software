import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getItems, addItem, updateItem, deleteItem } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import { io } from 'socket.io-client';
import { SOCKET_URL, API_BASE_URL } from '@/config/api';
import {
  calculateProjectHealth,
  calculateCriticalPathAndDependencies,
  calculateProgress,
  evaluateAutomations
} from '@/features/projects/utils/projectCalculations';

const ProjectContext = createContext(null);

// Socket instance for real-time collaboration
const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  upgrade: false
});

export const ProjectProvider = ({ children, initialProjectId = null }) => {
  const { user } = useAuth();

  // Core Data
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(initialProjectId);
  const [allTasks, setAllTasks] = useState([]);
  const [allMilestones, setAllMilestones] = useState([]);
  const [allSprints, setAllSprints] = useState([]);
  const [allTimeLogs, setAllTimeLogs] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [allDocs, setAllDocs] = useState([]);
  const [allForms, setAllForms] = useState([]);
  const [allAutomations, setAllAutomations] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [members, setMembers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI Interactive States
  const [selectedTaskForDrawer, setSelectedTaskForDrawer] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalDefaultSprint, setTaskModalDefaultSprint] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());

  // Global Time Tracking Timer
  const [activeTimer, setActiveTimer] = useState(() => {
    try {
      const saved = localStorage.getItem('pm_active_timer');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Synchronize timer clock
  useEffect(() => {
    let interval = null;
    if (activeTimer?.isRunning && activeTimer.startTime) {
      const startMs = new Date(activeTimer.startTime).getTime();
      const updateElapsed = () => {
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
      };
      updateElapsed();
      interval = setInterval(updateElapsed, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => interval && clearInterval(interval);
  }, [activeTimer]);

  const startTimer = (task) => {
    const timerData = {
      taskId: task.id || task._dbId,
      taskName: task.name,
      projectId: task.projectId,
      startTime: new Date().toISOString(),
      isRunning: true
    };
    setActiveTimer(timerData);
    localStorage.setItem('pm_active_timer', JSON.stringify(timerData));
  };

  const stopTimer = async () => {
    if (!activeTimer) return;
    const durationHours = Math.max(0.1, Number((elapsedSeconds / 3600).toFixed(2)));
    
    // Save time log
    await addTimeLog({
      taskId: activeTimer.taskId,
      taskName: activeTimer.taskName,
      projectId: activeTimer.projectId,
      durationHours,
      billable: true,
      notes: 'Logged via active timer stopwatch',
      date: new Date().toISOString().split('T')[0]
    });

    setActiveTimer(null);
    localStorage.removeItem('pm_active_timer');
  };

  // Load all Workspace and Project Data
  const refreshAllData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [
        projs, tasks, milestones, sprints, timeLogs,
        expenses, docs, forms, automations, staff, notifs
      ] = await Promise.all([
        getItems('projects', user.id),
        getItems('project_tasks', user.id),
        getItems('project_milestones', user.id),
        getItems('project_sprints', user.id),
        getItems('project_time_logs', user.id),
        getItems('project_expenses', user.id),
        getItems('project_docs', user.id),
        getItems('project_forms', user.id),
        getItems('project_automations', user.id),
        getItems('staff', user.id),
        getItems('project_notifications', user.id)
      ]);

      setProjects(projs || []);
      setAllTasks(tasks || []);
      setAllMilestones(milestones || []);
      setAllSprints(sprints || []);
      setAllTimeLogs(timeLogs || []);
      setAllExpenses(expenses || []);
      setAllDocs(docs || []);
      setAllForms(forms || []);
      setAllAutomations(automations || []);
      setAllStaff(staff || []);
      setNotifications(notifs || []);
    } catch (err) {
      console.error('Error refreshing project manager data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Active Project Reference
  const activeProject = useMemo(() => {
    if (!activeProjectId) return null;
    return projects.find(p => p._dbId === activeProjectId || p.id === activeProjectId || p.projectId === activeProjectId) || null;
  }, [projects, activeProjectId]);

  // Active Project Scoped Collections (matches either activeProjectId, activeProject._dbId, activeProject.id, or activeProject.projectId)
  const matchesActiveProject = useCallback((item) => {
    if (!activeProjectId) return true;
    return (
      item.projectId === activeProjectId ||
      (activeProject?.projectId && item.projectId === activeProject.projectId) ||
      (activeProject?._dbId && item.projectId === activeProject._dbId) ||
      (activeProject?.id && item.projectId === activeProject.id)
    );
  }, [activeProjectId, activeProject]);

  const projectTasks = useMemo(() => {
    if (!activeProjectId) return allTasks;
    return allTasks.filter(matchesActiveProject);
  }, [allTasks, activeProjectId, matchesActiveProject]);

  const projectMilestones = useMemo(() => {
    if (!activeProjectId) return allMilestones;
    return allMilestones.filter(matchesActiveProject);
  }, [allMilestones, activeProjectId, matchesActiveProject]);

  const projectSprints = useMemo(() => {
    if (!activeProjectId) return allSprints;
    return allSprints.filter(matchesActiveProject);
  }, [allSprints, activeProjectId, matchesActiveProject]);

  const projectTimeLogs = useMemo(() => {
    if (!activeProjectId) return allTimeLogs;
    return allTimeLogs.filter(matchesActiveProject);
  }, [allTimeLogs, activeProjectId, matchesActiveProject]);

  const projectExpenses = useMemo(() => {
    if (!activeProjectId) return allExpenses;
    return allExpenses.filter(matchesActiveProject);
  }, [allExpenses, activeProjectId, matchesActiveProject]);

  const projectDocs = useMemo(() => {
    if (!activeProjectId) return allDocs;
    return allDocs.filter(matchesActiveProject);
  }, [allDocs, activeProjectId, matchesActiveProject]);

  const projectForms = useMemo(() => {
    if (!activeProjectId) return allForms;
    return allForms.filter(matchesActiveProject);
  }, [allForms, activeProjectId, matchesActiveProject]);

  const projectAutomations = useMemo(() => {
    if (!activeProjectId) return allAutomations;
    return allAutomations.filter(matchesActiveProject);
  }, [allAutomations, activeProjectId, matchesActiveProject]);

  // Load real-time project members if activeProject exists
  useEffect(() => {
    const loadMembers = async () => {
      const pKey = activeProject?.projectId;
      if (!pKey) return;
      try {
        const res = await fetch(`${API_BASE_URL}/project-members/${pKey}`);
        if (res.ok) {
          const data = await res.json();
          setMembers(data);
        }
      } catch (err) {
        console.error('Failed to load project members:', err);
      }
    };
    loadMembers();
  }, [activeProject?.projectId]);

  // Socket setup for current project
  useEffect(() => {
    if (!activeProject?.projectId) return;

    socket.emit('join_project', activeProject.projectId);

    const handleRefreshed = () => {
      refreshAllData();
    };

    socket.on('project_data_refreshed', handleRefreshed);

    return () => {
      socket.off('project_data_refreshed', handleRefreshed);
    };
  }, [activeProject?.projectId, refreshAllData]);

  const broadcastUpdate = (action = 'updated') => {
    if (activeProject?.projectId) {
      socket.emit('project_update', { projectId: activeProject.projectId, action, sender: user?.firstName });
    }
  };

  // --- CRUD ACTIONS ---

  // Tasks
  const addTask = async (taskData) => {
    if (!user?.id) return null;
    const payload = {
      projectId: activeProjectId || taskData.projectId,
      name: taskData.name,
      description: taskData.description || '',
      type: taskData.type || 'Task',
      status: taskData.status || 'To Do',
      priority: taskData.priority || 'Medium',
      assigneeIds: taskData.assigneeIds || [],
      assigneeNames: taskData.assigneeNames || [],
      startDate: taskData.startDate || new Date().toISOString().split('T')[0],
      dueDate: taskData.dueDate || '',
      estimatedHours: Number(taskData.estimatedHours) || 0,
      actualHours: Number(taskData.actualHours) || 0,
      storyPoints: Number(taskData.storyPoints) || 0,
      sprintId: taskData.sprintId || null,
      milestoneId: taskData.milestoneId || null,
      parentTaskId: taskData.parentTaskId || null,
      subtasks: taskData.subtasks || [],
      dependencies: taskData.dependencies || [],
      tags: taskData.tags || [],
      customFields: taskData.customFields || {},
      inBacklog: Boolean(taskData.inBacklog),
      createdAt: new Date().toISOString()
    };

    const saved = await addItem('project_tasks', payload, user.id, user.firstName);
    if (saved) {
      setAllTasks(prev => [saved, ...prev]);
      broadcastUpdate('task_created');

      // Trigger Automations
      const actions = evaluateAutomations(projectAutomations, 'task_created', { task: saved });
      executeAutomationActions(actions);
    }
    return saved;
  };

  const updateTask = async (taskId, updates) => {
    if (!user?.id || !taskId) return null;

    // Optimistic state update
    setAllTasks(prev => prev.map(t => (t._dbId === taskId || t.id === taskId) ? { ...t, ...updates } : t));
    if (selectedTaskForDrawer && (selectedTaskForDrawer._dbId === taskId || selectedTaskForDrawer.id === taskId)) {
      setSelectedTaskForDrawer(prev => ({ ...prev, ...updates }));
    }

    const res = await updateItem('project_tasks', taskId, updates, user.id, user.firstName);
    broadcastUpdate('task_updated');

    // Automation Check for status or priority changes
    if (updates.status) {
      const actions = evaluateAutomations(projectAutomations, 'status_changed', { task: { id: taskId, ...updates }, newStatus: updates.status });
      executeAutomationActions(actions);
    }
    if (updates.priority) {
      const actions = evaluateAutomations(projectAutomations, 'priority_changed', { task: { id: taskId, ...updates }, newPriority: updates.priority });
      executeAutomationActions(actions);
    }

    return res;
  };

  const deleteTask = async (taskId) => {
    if (!user?.id || !taskId) return false;
    const ok = await deleteItem('project_tasks', taskId, user.id, user.firstName);
    if (ok) {
      setAllTasks(prev => prev.filter(t => t._dbId !== taskId && t.id !== taskId));
      if (selectedTaskForDrawer?.id === taskId || selectedTaskForDrawer?._dbId === taskId) {
        setSelectedTaskForDrawer(null);
      }
      broadcastUpdate('task_deleted');
    }
    return ok;
  };

  const bulkUpdateTasks = async (taskIds, updates) => {
    if (!user?.id || !taskIds?.length) return;
    for (const id of taskIds) {
      await updateTask(id, updates);
    }
    setSelectedTaskIds(new Set());
  };

  const bulkDeleteTasks = async (taskIds) => {
    if (!user?.id || !taskIds?.length) return;
    for (const id of taskIds) {
      await deleteTask(id);
    }
    setSelectedTaskIds(new Set());
  };

  // Milestones
  const addMilestone = async (milestoneData) => {
    if (!user?.id) return null;
    const saved = await addItem('project_milestones', { ...milestoneData, projectId: activeProjectId }, user.id, user.firstName);
    if (saved) {
      setAllMilestones(prev => [...prev, saved]);
      broadcastUpdate('milestone_created');
    }
    return saved;
  };

  const updateMilestone = async (milestoneId, updates) => {
    const res = await updateItem('project_milestones', milestoneId, updates, user.id, user.firstName);
    setAllMilestones(prev => prev.map(m => (m._dbId === milestoneId || m.id === milestoneId) ? { ...m, ...updates } : m));
    broadcastUpdate('milestone_updated');
    return res;
  };

  const deleteMilestone = async (milestoneId) => {
    const ok = await deleteItem('project_milestones', milestoneId, user.id, user.firstName);
    if (ok) {
      setAllMilestones(prev => prev.filter(m => m._dbId !== milestoneId && m.id !== milestoneId));
      broadcastUpdate('milestone_deleted');
    }
    return ok;
  };

  // Sprints
  const addSprint = async (sprintData) => {
    if (!user?.id) return null;
    const saved = await addItem('project_sprints', { ...sprintData, projectId: activeProjectId }, user.id, user.firstName);
    if (saved) {
      setAllSprints(prev => [...prev, saved]);
      broadcastUpdate('sprint_created');
    }
    return saved;
  };

  const updateSprint = async (sprintId, updates) => {
    const res = await updateItem('project_sprints', sprintId, updates, user.id, user.firstName);
    setAllSprints(prev => prev.map(s => (s._dbId === sprintId || s.id === sprintId) ? { ...s, ...updates } : s));
    broadcastUpdate('sprint_updated');
    return res;
  };

  // Time Logs
  const addTimeLog = async (logData) => {
    if (!user?.id) return null;
    const payload = {
      ...logData,
      projectId: activeProjectId || logData.projectId,
      userId: user.id,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
      createdAt: new Date().toISOString()
    };
    const saved = await addItem('project_time_logs', payload, user.id, user.firstName);
    if (saved) {
      setAllTimeLogs(prev => [saved, ...prev]);
      
      // Update actual hours on task
      if (logData.taskId) {
        const task = allTasks.find(t => t._dbId === logData.taskId || t.id === logData.taskId);
        if (task) {
          const newActual = (Number(task.actualHours) || 0) + (Number(logData.durationHours) || 0);
          await updateTask(task._dbId || task.id, { actualHours: newActual });
        }
      }
      broadcastUpdate('timelog_created');
    }
    return saved;
  };

  // Expenses
  const addExpense = async (expenseData) => {
    if (!user?.id) return null;
    const saved = await addItem('project_expenses', { ...expenseData, projectId: activeProjectId }, user.id, user.firstName);
    if (saved) {
      setAllExpenses(prev => [...prev, saved]);
      broadcastUpdate('expense_created');
    }
    return saved;
  };

  // Documents / Wiki
  const addDoc = async (docData) => {
    if (!user?.id) return null;
    const saved = await addItem('project_docs', {
      ...docData,
      projectId: activeProjectId,
      updatedBy: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      updatedAt: new Date().toISOString()
    }, user.id, user.firstName);
    if (saved) {
      setAllDocs(prev => [...prev, saved]);
      broadcastUpdate('doc_created');
    }
    return saved;
  };

  const updateDoc = async (docId, updates) => {
    const payload = {
      ...updates,
      updatedBy: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      updatedAt: new Date().toISOString()
    };
    const res = await updateItem('project_docs', docId, payload, user.id, user.firstName);
    setAllDocs(prev => prev.map(d => (d._dbId === docId || d.id === docId) ? { ...d, ...payload } : d));
    broadcastUpdate('doc_updated');
    return res;
  };

  // Forms
  const addForm = async (formData) => {
    if (!user?.id) return null;
    const saved = await addItem('project_forms', { ...formData, projectId: activeProjectId, active: true }, user.id, user.firstName);
    if (saved) {
      setAllForms(prev => [...prev, saved]);
      broadcastUpdate('form_created');
    }
    return saved;
  };

  // Automations
  const addAutomation = async (ruleData) => {
    if (!user?.id) return null;
    const saved = await addItem('project_automations', { ...ruleData, projectId: activeProjectId, enabled: true }, user.id, user.firstName);
    if (saved) {
      setAllAutomations(prev => [...prev, saved]);
      broadcastUpdate('automation_created');
    }
    return saved;
  };

  const toggleAutomation = async (ruleId, currentEnabled) => {
    await updateItem('project_automations', ruleId, { enabled: !currentEnabled }, user.id, user.firstName);
    setAllAutomations(prev => prev.map(a => (a._dbId === ruleId || a.id === ruleId) ? { ...a, enabled: !currentEnabled } : a));
  };

  // Notifications
  const markNotificationRead = async (notifId) => {
    await updateItem('project_notifications', notifId, { read: true }, user.id);
    setNotifications(prev => prev.map(n => (n._dbId === notifId || n.id === notifId) ? { ...n, read: true } : n));
  };

  // Automation Action Dispatcher
  const executeAutomationActions = async (actions = []) => {
    for (const action of actions) {
      if (action.actionType === 'change_status' && action.taskId) {
        await updateTask(action.taskId, { status: action.actionValue });
      } else if (action.actionType === 'set_priority' && action.taskId) {
        await updateTask(action.taskId, { priority: action.actionValue });
      } else if (action.actionType === 'assign_user' && action.taskId) {
        await updateTask(action.taskId, { assigneeIds: [action.actionValue] });
      } else if (action.actionType === 'notify') {
        await addItem('project_notifications', {
          userId: user.id,
          projectId: activeProjectId,
          taskId: action.taskId,
          title: `Automation Triggered: ${action.ruleTitle}`,
          message: action.actionValue || 'Automation rule executed successfully.',
          read: false,
          createdAt: new Date().toISOString()
        }, user.id);
      }
    }
  };

  // Health & Critical Path Computations
  const projectHealth = useMemo(() => {
    return calculateProjectHealth(activeProject, projectTasks, projectMilestones, projectExpenses);
  }, [activeProject, projectTasks, projectMilestones, projectExpenses]);

  const dependencyAnalysis = useMemo(() => {
    return calculateCriticalPathAndDependencies(projectTasks);
  }, [projectTasks]);

  const overallProgress = useMemo(() => {
    return calculateProgress(projectTasks);
  }, [projectTasks]);

  const value = {
    // Data
    projects,
    activeProjectId,
    setActiveProjectId,
    activeProject,
    tasks: projectTasks,
    allTasks,
    milestones: projectMilestones,
    allMilestones,
    sprints: projectSprints,
    allSprints,
    timeLogs: projectTimeLogs,
    allTimeLogs,
    expenses: projectExpenses,
    allExpenses,
    docs: projectDocs,
    forms: projectForms,
    automations: projectAutomations,
    staff: allStaff,
    members,
    notifications,
    loading,
    refreshAllData,

    // Computations
    projectHealth,
    dependencyAnalysis,
    overallProgress,

    // CRUD
    addTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    addSprint,
    updateSprint,
    addTimeLog,
    addExpense,
    addDoc,
    updateDoc,
    addForm,
    addAutomation,
    toggleAutomation,
    markNotificationRead,

    // Timer
    activeTimer,
    elapsedSeconds,
    startTimer,
    stopTimer,

    // UI Modals & Drawers
    selectedTaskForDrawer,
    setSelectedTaskForDrawer,
    isTaskModalOpen,
    setIsTaskModalOpen,
    taskModalDefaultSprint,
    setTaskModalDefaultSprint,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    selectedTaskIds,
    setSelectedTaskIds
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

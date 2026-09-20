/**
 * Enterprise Project Management Calculation & Dependency Engine
 * Handles Project Health, Critical Path Analysis, Dependencies (FS/SS/FF/SF),
 * Scheduling conflicts, and Automation Rule Evaluation.
 */

// --- 1. HEALTH ENGINE ---

export const calculateProjectHealth = (project, tasks = [], milestones = [], expenses = []) => {
  if (!project) {
    return { score: 100, status: 'On Track', label: 'On Track', color: '#10b981', reasons: ['Project initialized recently.'] };
  }

  const now = new Date();
  const reasons = [];
  let riskPoints = 0;

  // 1.1 Schedule Health
  const totalTasks = tasks.length;
  const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'Done' && t.status !== 'Completed');
  
  if (overdueTasks.length > 0) {
    const overdueRatio = totalTasks > 0 ? (overdueTasks.length / totalTasks) : 0;
    if (overdueRatio > 0.3 || overdueTasks.length >= 5) {
      riskPoints += 40;
      reasons.push(`${overdueTasks.length} tasks are overdue (>30% of work).`);
    } else {
      riskPoints += 20;
      reasons.push(`${overdueTasks.length} task(s) currently overdue.`);
    }
  }

  // 1.2 Blocked & Dependency Health
  const blockedTasks = tasks.filter(t => t.status === 'Blocked');
  if (blockedTasks.length > 0) {
    riskPoints += blockedTasks.length * 10;
    reasons.push(`${blockedTasks.length} task(s) currently blocked by dependencies.`);
  }

  // 1.3 Milestone Health
  const overdueMilestones = milestones.filter(m => m.date && new Date(m.date) < now && m.status !== 'Achieved');
  if (overdueMilestones.length > 0) {
    riskPoints += 30;
    reasons.push(`${overdueMilestones.length} milestone(s) missed deadline.`);
  }

  // 1.4 Budget Health
  const budget = Number(project.budget) || 0;
  const loggedLaborHours = tasks.reduce((sum, t) => sum + (Number(t.actualHours) || 0), 0);
  const hourlyRate = Number(project.hourlyRate) || 800; // Default ₹800/hr
  const laborCost = loggedLaborHours * hourlyRate;
  const expenseCost = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalSpend = laborCost + expenseCost;

  if (budget > 0) {
    const budgetVariancePct = ((totalSpend - budget) / budget) * 100;
    if (totalSpend > budget) {
      riskPoints += 35;
      reasons.push(`Budget exceeded by ${Math.round(budgetVariancePct)}% (Spent: ₹${totalSpend.toLocaleString()}, Budget: ₹${budget.toLocaleString()}).`);
    } else if (totalSpend > budget * 0.85 && tasks.filter(t => t.status === 'Done').length < totalTasks * 0.6) {
      riskPoints += 20;
      reasons.push(`High budget utilization (${Math.round((totalSpend / budget) * 100)}%) relative to completion progress.`);
    }
  }

  // Compute final score & label
  const score = Math.max(0, 100 - riskPoints);
  let status = 'On Track';
  let color = '#10b981';

  if (riskPoints >= 45) {
    status = 'Critical';
    color = '#ef4444';
  } else if (riskPoints >= 20) {
    status = 'At Risk';
    color = '#f59e0b';
  }

  if (reasons.length === 0) {
    reasons.push('Schedule, milestones, and budget are within target tolerances.');
  }

  return {
    score,
    status,
    label: status,
    color,
    reasons,
    overdueTasksCount: overdueTasks.length,
    blockedTasksCount: blockedTasks.length,
    totalSpend,
    budget,
    laborCost,
    expenseCost
  };
};

// --- 2. DEPENDENCY & CRITICAL PATH ENGINE ---

/**
 * Validates dependencies and identifies tasks on the Critical Path.
 * Supports Finish-to-Start (FS), Start-to-Start (SS), Finish-to-Finish (FF), Start-to-Finish (SF).
 */
export const calculateCriticalPathAndDependencies = (tasks = []) => {
  if (!tasks || tasks.length === 0) {
    return { taskScheduleMap: {}, criticalTaskIds: new Set(), blockedTaskIds: new Set() };
  }

  const taskMap = new Map();
  tasks.forEach(t => {
    const id = t.id || t._dbId;
    taskMap.set(id, {
      ...t,
      id,
      duration: Math.max(1, Math.ceil((Number(t.estimatedHours) || 8) / 8)), // days (8h/day)
      predecessors: t.dependencies || [],
      successors: []
    });
  });

  // Build reverse successors graph
  taskMap.forEach(task => {
    task.predecessors.forEach(dep => {
      const predId = typeof dep === 'object' ? dep.taskId : dep;
      const type = typeof dep === 'object' ? (dep.type || 'FS') : 'FS';
      if (taskMap.has(predId)) {
        taskMap.get(predId).successors.push({ taskId: task.id, type });
      }
    });
  });

  const blockedTaskIds = new Set();
  taskMap.forEach(task => {
    const hasUnfinishedPredecessor = task.predecessors.some(dep => {
      const predId = typeof dep === 'object' ? dep.taskId : dep;
      const predTask = taskMap.get(predId);
      return predTask && predTask.status !== 'Done' && predTask.status !== 'Completed';
    });
    if (hasUnfinishedPredecessor) {
      blockedTaskIds.add(task.id);
    }
  });

  // Forward Pass (Earliest Start / Earliest Finish)
  const ES = {};
  const EF = {};
  const visited = new Set();

  const getEarliest = (taskId) => {
    if (visited.has(taskId)) return EF[taskId] || 0;
    visited.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) return 0;

    let maxPredFinish = 0;
    task.predecessors.forEach(dep => {
      const predId = typeof dep === 'object' ? dep.taskId : dep;
      const predEF = getEarliest(predId);
      if (predEF > maxPredFinish) maxPredFinish = predEF;
    });

    ES[taskId] = maxPredFinish;
    EF[taskId] = ES[taskId] + task.duration;
    return EF[taskId];
  };

  taskMap.forEach((_, taskId) => getEarliest(taskId));

  // Max Project Finish Date in Days
  const projectDuration = Math.max(0, ...Object.values(EF));

  // Backward Pass (Latest Start / Latest Finish)
  const LS = {};
  const LF = {};
  const backVisited = new Set();

  const getLatest = (taskId) => {
    if (backVisited.has(taskId)) return LS[taskId] || 0;
    backVisited.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) return projectDuration;

    if (task.successors.length === 0) {
      LF[taskId] = projectDuration;
    } else {
      let minSuccStart = projectDuration;
      task.successors.forEach(succ => {
        const succLS = getLatest(succ.taskId);
        if (succLS < minSuccStart) minSuccStart = succLS;
      });
      LF[taskId] = minSuccStart;
    }

    LS[taskId] = LF[taskId] - task.duration;
    return LS[taskId];
  };

  taskMap.forEach((_, taskId) => getLatest(taskId));

  // Critical Path has Slack (LF - EF === 0 or LS - ES === 0)
  const criticalTaskIds = new Set();
  taskMap.forEach((_, taskId) => {
    const slack = (LF[taskId] || 0) - (EF[taskId] || 0);
    if (slack <= 0.1 && taskMap.get(taskId).status !== 'Done') {
      criticalTaskIds.add(taskId);
    }
  });

  return {
    criticalTaskIds,
    blockedTaskIds,
    schedule: { ES, EF, LS, LF, projectDuration }
  };
};

// --- 3. AUTOMATION ENGINE (Rule Evaluator) ---

export const evaluateAutomations = (rules = [], eventType, payload = {}, allUsers = []) => {
  if (!rules || rules.length === 0) return [];

  const matchedActions = [];

  rules.forEach(rule => {
    if (!rule.enabled) return;

    let triggerMatched = false;

    // Trigger Matching
    if (rule.trigger === 'task_created' && eventType === 'task_created') {
      triggerMatched = true;
    } else if (rule.trigger === 'status_changed' && eventType === 'status_changed') {
      if (!rule.conditionStatus || rule.conditionStatus === payload.newStatus) {
        triggerMatched = true;
      }
    } else if (rule.trigger === 'priority_changed' && eventType === 'priority_changed') {
      if (!rule.conditionPriority || rule.conditionPriority === payload.newPriority) {
        triggerMatched = true;
      }
    } else if (rule.trigger === 'task_overdue' && eventType === 'task_overdue') {
      triggerMatched = true;
    }

    if (triggerMatched) {
      (rule.actions || []).forEach(action => {
        matchedActions.push({
          ruleTitle: rule.title,
          actionType: action.type,
          actionValue: action.value,
          taskId: payload.task?.id || payload.task?._dbId
        });
      });
    }
  });

  return matchedActions;
};

// --- 4. DATE & PROGRESS UTILITIES ---

export const calculateProgress = (tasks = []) => {
  if (!tasks || tasks.length === 0) return 0;
  const completed = tasks.filter(t => t.status === 'Done' || t.status === 'Completed').length;
  return Math.round((completed / tasks.length) * 100);
};

export const formatRelativeDate = (dateStr) => {
  if (!dateStr) return 'No date';
  const target = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays <= 7) return `Due in ${diffDays}d`;
  return target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

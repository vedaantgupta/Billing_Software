import React, { useState, useMemo } from 'react';
import {
  Search, Filter, Plus, ArrowUpDown, CheckSquare,
  ChevronDown, ChevronRight, User, Calendar, Clock, Layers
} from 'lucide-react';
import { useProject } from '@/features/projects/context/ProjectContext';
import { StatusBadge, PriorityBadge, UserAvatarGroup } from '@/features/projects/components/common/ProjectBadges';
import { formatRelativeDate } from '@/features/projects/utils/projectCalculations';

const ProjectListView = () => {
  const {
    tasks,
    updateTask,
    staff,
    members,
    sprints,
    setSelectedTaskForDrawer,
    setIsTaskModalOpen,
    selectedTaskIds,
    setSelectedTaskIds
  } = useProject();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [groupBy, setGroupBy] = useState('status'); // 'none', 'status', 'priority', 'sprint'
  const [sortField, setSortField] = useState('dueDate');
  const [sortAsc, setSortAsc] = useState(true);

  const allAssignees = [...staff, ...members];

  // Filtering & Sorting
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
      const matchesAssignee = filterAssignee === 'all' || (t.assigneeIds || []).includes(filterAssignee);
      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    }).sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (sortField === 'dueDate') {
        valA = a.dueDate ? new Date(a.dueDate).getTime() : (sortAsc ? 9999999999999 : -1);
        valB = b.dueDate ? new Date(b.dueDate).getTime() : (sortAsc ? 9999999999999 : -1);
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [tasks, searchQuery, filterStatus, filterPriority, filterAssignee, sortField, sortAsc]);

  // Grouping
  const groups = useMemo(() => {
    if (groupBy === 'none') {
      return [{ id: 'all', title: 'All Tasks', items: filteredTasks }];
    }

    if (groupBy === 'status') {
      const statuses = ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'];
      return statuses.map(st => ({
        id: st,
        title: st,
        items: filteredTasks.filter(t => (t.status || 'To Do') === st)
      })).filter(g => g.items.length > 0);
    }

    if (groupBy === 'priority') {
      const priorities = ['Urgent', 'High', 'Medium', 'Low'];
      return priorities.map(pr => ({
        id: pr,
        title: `${pr} Priority`,
        items: filteredTasks.filter(t => (t.priority || 'Medium') === pr)
      })).filter(g => g.items.length > 0);
    }

    if (groupBy === 'sprint') {
      const sprintMap = new Map();
      filteredTasks.forEach(t => {
        const sId = t.sprintId || 'backlog';
        if (!sprintMap.has(sId)) sprintMap.set(sId, []);
        sprintMap.get(sId).push(t);
      });

      return Array.from(sprintMap.entries()).map(([sId, items]) => {
        const sprintObj = sprints.find(s => (s.id || s._dbId) === sId);
        return {
          id: sId,
          title: sId === 'backlog' ? 'Product Backlog' : (sprintObj?.name || 'Sprint'),
          items
        };
      });
    }

    return [{ id: 'all', title: 'All Tasks', items: filteredTasks }];
  }, [filteredTasks, groupBy, sprints]);

  // Selection toggle
  const toggleSelectTask = (taskId, e) => {
    e.stopPropagation();
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const selectAllInGroup = (items) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      const allSelected = items.every(t => next.has(t.id || t._dbId));
      items.forEach(t => {
        const id = t.id || t._dbId;
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  };

  const handleSort = (field) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      
      {/* List Controls */}
      <div className="pm-control-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="pm-search-input-wrapper">
            <Search className="pm-search-icon" size={16} />
            <input
              className="pm-search-input"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="pm-filters-group">
            <select className="pm-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="In Review">In Review</option>
              <option value="Done">Done</option>
              <option value="Blocked">Blocked</option>
            </select>

            <select className="pm-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
              <option value="all">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select className="pm-select" value={groupBy} onChange={e => setGroupBy(e.target.value)}>
              <option value="status">Group by Status</option>
              <option value="priority">Group by Priority</option>
              <option value="sprint">Group by Sprint</option>
              <option value="none">No Grouping</option>
            </select>
          </div>
        </div>

        <button className="pm-btn pm-btn-primary" onClick={() => setIsTaskModalOpen(true)}>
          <Plus size={16} /> Add Task
        </button>
      </div>

      {/* Table Container */}
      <div className="pm-table-container">
        <table className="pm-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  style={{ accentColor: '#4f46e5', width: '15px', height: '15px', cursor: 'pointer' }}
                  checked={filteredTasks.length > 0 && filteredTasks.every(t => selectedTaskIds.has(t.id || t._dbId))}
                  onChange={() => selectAllInGroup(filteredTasks)}
                />
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>Task Name</span>
                  <ArrowUpDown size={13} color="#94a3b8" />
                </div>
              </th>
              <th style={{ width: '130px', cursor: 'pointer' }} onClick={() => handleSort('status')}>
                Status
              </th>
              <th style={{ width: '110px', cursor: 'pointer' }} onClick={() => handleSort('priority')}>
                Priority
              </th>
              <th style={{ width: '130px', cursor: 'pointer' }} onClick={() => handleSort('dueDate')}>
                Due Date
              </th>
              <th style={{ width: '150px' }}>Assignee</th>
              <th style={{ width: '90px' }}>Hours</th>
            </tr>
          </thead>

          <tbody>
            {groups.map(group => (
              <React.Fragment key={group.id}>
                {/* Group Header Row */}
                {groupBy !== 'none' && (
                  <tr style={{ background: '#f8fafc' }}>
                    <td colSpan="7" style={{ padding: '0.6rem 1rem', fontWeight: 800, color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.825rem' }}>{group.title}</span>
                        <span className="pm-kanban-counter">{group.items.length}</span>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Task Rows */}
                {group.items.map(task => {
                  const tId = task.id || task._dbId;
                  const isChecked = selectedTaskIds.has(tId);
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done';

                  return (
                    <tr
                      key={tId}
                      onClick={() => setSelectedTaskForDrawer(task)}
                      style={{ cursor: 'pointer', background: isChecked ? '#eef2ff' : 'transparent' }}
                    >
                      <td onClick={e => toggleSelectTask(tId, e)}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ accentColor: '#4f46e5', width: '15px', height: '15px', cursor: 'pointer' }}
                        />
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontWeight: 700, color: task.status === 'Done' ? '#94a3b8' : '#0f172a', textDecoration: task.status === 'Done' ? 'line-through' : 'none' }}>
                            {task.name}
                          </span>
                          {(task.subtasks || []).length > 0 && (
                            <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                            </span>
                          )}
                        </div>
                      </td>

                      <td onClick={e => e.stopPropagation()}>
                        <select
                          className="pm-select"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 700 }}
                          value={task.status || 'To Do'}
                          onChange={e => updateTask(tId, { status: e.target.value })}
                        >
                          <option value="To Do">To Do</option>
                          <option value="In Progress">In Progress</option>
                          <option value="In Review">In Review</option>
                          <option value="Done">Done</option>
                          <option value="Blocked">Blocked</option>
                        </select>
                      </td>

                      <td onClick={e => e.stopPropagation()}>
                        <select
                          className="pm-select"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 700 }}
                          value={task.priority || 'Medium'}
                          onChange={e => updateTask(tId, { priority: e.target.value })}
                        >
                          <option value="Urgent">Urgent</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isOverdue ? '#dc2626' : '#475569' }}>
                          {formatRelativeDate(task.dueDate)}
                        </span>
                      </td>

                      <td>
                        <UserAvatarGroup userIds={task.assigneeIds} users={allAssignees} />
                      </td>

                      <td>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                          {task.actualHours || 0}/{task.estimatedHours || 0}h
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}

            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  No tasks found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default ProjectListView;

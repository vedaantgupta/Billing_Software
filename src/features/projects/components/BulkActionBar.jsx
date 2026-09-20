import React from 'react';
import { CheckSquare, Trash2, ArrowUp, Check, X, Layers } from 'lucide-react';
import { useProject } from '@/features/projects/context/ProjectContext';

const BulkActionBar = () => {
  const {
    selectedTaskIds,
    setSelectedTaskIds,
    bulkUpdateTasks,
    bulkDeleteTasks,
    sprints
  } = useProject();

  const count = selectedTaskIds.size;
  if (count === 0) return null;

  const idsArray = Array.from(selectedTaskIds);

  const handleStatusChange = (status) => {
    bulkUpdateTasks(idsArray, { status });
  };

  const handlePriorityChange = (priority) => {
    bulkUpdateTasks(idsArray, { priority });
  };

  const handleSprintChange = (sprintId) => {
    bulkUpdateTasks(idsArray, { sprintId: sprintId || null, inBacklog: !sprintId });
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to permanently delete ${count} selected tasks?`)) {
      bulkDeleteTasks(idsArray);
    }
  };

  return (
    <div className="pm-bulk-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.85rem' }}>
        <CheckSquare size={16} />
        <span>{count} selected</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Quick Status */}
        <button
          className="pm-btn pm-btn-sm"
          style={{ background: '#334155', color: 'white' }}
          onClick={() => handleStatusChange('Done')}
        >
          <Check size={14} /> Mark Done
        </button>

        <button
          className="pm-btn pm-btn-sm"
          style={{ background: '#334155', color: 'white' }}
          onClick={() => handleStatusChange('In Progress')}
        >
          In Progress
        </button>

        {/* Priority Dropdown */}
        <select
          className="pm-select"
          style={{ background: '#334155', color: 'white', border: '1px solid #475569', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
          defaultValue=""
          onChange={e => {
            if (e.target.value) handlePriorityChange(e.target.value);
            e.target.value = '';
          }}
        >
          <option value="" disabled>Set Priority...</option>
          <option value="Urgent">Urgent</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {/* Sprint Assignment */}
        {sprints.length > 0 && (
          <select
            className="pm-select"
            style={{ background: '#334155', color: 'white', border: '1px solid #475569', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
            defaultValue=""
            onChange={e => {
              if (e.target.value) handleSprintChange(e.target.value === 'backlog' ? null : e.target.value);
              e.target.value = '';
            }}
          >
            <option value="" disabled>Move to Sprint...</option>
            <option value="backlog">Product Backlog</option>
            {sprints.map(s => (
              <option key={s.id || s._dbId} value={s.id || s._dbId}>{s.name}</option>
            ))}
          </select>
        )}

        {/* Delete */}
        <button
          className="pm-btn pm-btn-sm"
          style={{ background: '#ef4444', color: 'white' }}
          onClick={handleDelete}
          title="Delete selected"
        >
          <Trash2 size={14} /> Delete
        </button>

        {/* Clear selection */}
        <button
          className="pm-btn pm-btn-ghost pm-btn-sm"
          style={{ color: '#cbd5e1' }}
          onClick={() => setSelectedTaskIds(new Set())}
          title="Clear selection"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default BulkActionBar;

import React, { useState } from 'react';
import { Zap, Plus, Check, ArrowRight, ToggleLeft, ToggleRight, Trash2, Bell } from 'lucide-react';
import { useProject } from '@/features/projects/context/ProjectContext';

const ProjectAutomationsView = () => {
  const {
    automations,
    addAutomation,
    toggleAutomation,
    staff,
    members
  } = useProject();

  const [isCreating, setIsCreating] = useState(false);
  const [ruleTitle, setRuleTitle] = useState('');
  const [trigger, setTrigger] = useState('status_changed');
  const [conditionStatus, setConditionStatus] = useState('Done');
  const [actionType, setActionType] = useState('notify');
  const [actionValue, setActionValue] = useState('Task marked as Done by team member');

  const allAssignees = [...staff, ...members];

  const handleCreateRule = async (e) => {
    e.preventDefault();
    if (!ruleTitle.trim()) return;

    await addAutomation({
      title: ruleTitle.trim(),
      trigger,
      conditionStatus: trigger === 'status_changed' ? conditionStatus : null,
      actions: [
        {
          type: actionType,
          value: actionValue
        }
      ],
      enabled: true
    });

    setRuleTitle('');
    setIsCreating(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem 1.75rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Automation Rules Engine</h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Automate task transitions, assignments, and notifications triggered by project events
          </p>
        </div>

        <button className="pm-btn pm-btn-primary" onClick={() => setIsCreating(true)}>
          <Plus size={16} /> New Automation Rule
        </button>
      </div>

      {/* Rule Creator Modal */}
      {isCreating && (
        <div className="pm-drawer-backdrop" onClick={() => setIsCreating(false)} style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div className="pm-card" style={{ width: '100%', maxWidth: '520px', background: 'white', padding: '1.75rem' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 800 }}>Create Automation Rule</h3>
            <form onSubmit={handleCreateRule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Rule Name *</label>
                <input
                  className="pm-search-input"
                  placeholder="e.g. Notify manager when task is marked Done"
                  value={ruleTitle}
                  onChange={e => setRuleTitle(e.target.value)}
                  required
                />
              </div>

              {/* Trigger */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase' }}>WHEN (Trigger)</span>
                <select className="pm-select" style={{ width: '100%', marginTop: '0.4rem' }} value={trigger} onChange={e => setTrigger(e.target.value)}>
                  <option value="status_changed">Task status changes</option>
                  <option value="task_created">New task is created</option>
                  <option value="priority_changed">Task priority changes</option>
                </select>

                {trigger === 'status_changed' && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>To Status:</label>
                    <select className="pm-select" style={{ width: '100%', marginTop: '0.2rem' }} value={conditionStatus} onChange={e => setConditionStatus(e.target.value)}>
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="In Review">In Review</option>
                      <option value="Done">Done</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Action */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>THEN (Action)</span>
                <select className="pm-select" style={{ width: '100%', marginTop: '0.4rem' }} value={actionType} onChange={e => setActionType(e.target.value)}>
                  <option value="notify">Send notification alert</option>
                  <option value="set_priority">Set priority to Urgent</option>
                  <option value="change_status">Change status to In Review</option>
                </select>

                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Action Message / Value:</label>
                  <input className="pm-search-input" style={{ marginTop: '0.2rem' }} value={actionValue} onChange={e => setActionValue(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="pm-btn pm-btn-secondary" onClick={() => setIsCreating(false)}>Cancel</button>
                <button type="submit" className="pm-btn pm-btn-primary">Save Automation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {automations.map(rule => (
          <div key={rule.id || rule._dbId} className="pm-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: rule.enabled ? '#eef2ff' : '#f1f5f9', color: rule.enabled ? '#4f46e5' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: rule.enabled ? '#0f172a' : '#64748b' }}>
                  {rule.title}
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                  <strong>Trigger:</strong> {rule.trigger} {rule.conditionStatus ? `→ ${rule.conditionStatus}` : ''} | <strong>Action:</strong> {rule.actions?.[0]?.type || 'notify'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                className="pm-btn pm-btn-ghost pm-btn-sm"
                onClick={() => toggleAutomation(rule.id || rule._dbId, rule.enabled)}
                style={{ color: rule.enabled ? '#10b981' : '#94a3b8', fontWeight: 700 }}
              >
                {rule.enabled ? 'Active' : 'Disabled'}
              </button>
            </div>
          </div>
        ))}

        {automations.length === 0 && !isCreating && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            No automations configured. Click "+ New Automation Rule" to create your first workflow trigger!
          </div>
        )}
      </div>

    </div>
  );
};

export default ProjectAutomationsView;

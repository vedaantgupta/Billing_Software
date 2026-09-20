import React, { useState } from 'react';
import { Settings, UserCheck, Shield, Save, Trash2, Plus } from 'lucide-react';
import { useProject } from '@/features/projects/context/ProjectContext';
import { updateItem } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import { API_BASE_URL } from '@/config/api';

const ProjectSettingsView = () => {
  const {
    activeProject,
    activeProjectId,
    members,
    staff,
    refreshAllData
  } = useProject();

  const { user } = useAuth();

  const [name, setName] = useState(activeProject?.name || '');
  const [description, setDescription] = useState(activeProject?.description || '');
  const [budget, setBudget] = useState(activeProject?.budget || '');
  const [hourlyRate, setHourlyRate] = useState(activeProject?.hourlyRate || 800);
  const [status, setStatus] = useState(activeProject?.status || 'Active');
  const [priority, setPriority] = useState(activeProject?.priority || 'Medium');
  const [saving, setSaving] = useState(false);

  if (!activeProject) return null;

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateItem('projects', activeProject._dbId || activeProject.id, {
        name,
        description,
        budget: Number(budget) || 0,
        hourlyRate: Number(hourlyRate) || 800,
        status,
        priority
      }, user.id);
      refreshAllData();
      alert('Project settings saved successfully.');
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMemberRole = async (userId, newRole) => {
    try {
      await fetch(`${API_BASE_URL}/project-members/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.projectId,
          userId,
          newRole
        })
      });
      refreshAllData();
    } catch (err) {
      console.error('Role update error:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1.5rem 1.75rem', maxWidth: '840px' }}>
      
      {/* General Settings */}
      <div className="pm-card" style={{ padding: '1.75rem' }}>
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.15rem', fontWeight: 800 }}>General Information</h3>
        <form onSubmit={handleSaveGeneral} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Project Name</label>
            <input className="pm-search-input" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Description / Scope</label>
            <textarea className="pm-search-input" style={{ minHeight: '90px' }} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Target Budget (₹)</label>
              <input type="number" className="pm-search-input" value={budget} onChange={e => setBudget(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Hourly Rate for Labor (₹/hr)</label>
              <input type="number" className="pm-search-input" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Status</label>
              <select className="pm-select" style={{ width: '100%' }} value={status} onChange={e => setStatus(e.target.value)}>
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="At Risk">At Risk</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Priority</label>
              <select className="pm-select" style={{ width: '100%' }} value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" className="pm-btn pm-btn-primary" disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Members & Roles */}
      <div className="pm-card" style={{ padding: '1.75rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.15rem', fontWeight: 800 }}>Members & Permissions</h3>
        <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0 0 1.25rem' }}>
          Assign workspace members to this project and define their access roles.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {members.map(member => (
            <div
              key={member.userId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
                  {member.name?.[0] || 'U'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                    {member.name} {member.userId === user?.id && '(You)'}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                    {member.isOriginalAdmin ? 'Original Project Owner' : 'Project Member'}
                  </div>
                </div>
              </div>

              {!member.isOriginalAdmin && (
                <select
                  className="pm-select"
                  style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}
                  value={member.role || 'Member'}
                  onChange={e => handleUpdateMemberRole(member.userId, e.target.value)}
                >
                  <option value="Admin">Admin</option>
                  <option value="Project Manager">Project Manager</option>
                  <option value="Member">Member</option>
                  <option value="Viewer">Viewer</option>
                </select>
              )}
            </div>
          ))}

          {members.length === 0 && (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
              No members registered yet.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ProjectSettingsView;

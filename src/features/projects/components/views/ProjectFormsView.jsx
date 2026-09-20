import React, { useState } from 'react';
import { FormInput, Plus, ExternalLink, Send, CheckCircle2, Copy, Trash2 } from 'lucide-react';
import { useProject } from '@/features/projects/context/ProjectContext';
import { useAuth } from '@/hooks/useAuth';
import { API_BASE_URL } from '@/config/api';

const ProjectFormsView = () => {
  const {
    forms,
    addForm,
    activeProjectId,
    activeProject,
    staff,
    members,
    refreshAllData
  } = useProject();

  const { user } = useAuth();
  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [defaultPriority, setDefaultPriority] = useState('Medium');
  const [defaultAssigneeId, setDefaultAssigneeId] = useState('');

  // Form Testing Modal
  const [testingForm, setTestingForm] = useState(null);
  const [submissionData, setSubmissionData] = useState({ title: '', email: '', details: '' });
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const allAssignees = [...staff, ...members];

  const handleCreateForm = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    await addForm({
      title: formTitle.trim(),
      description: formDesc.trim(),
      defaultPriority,
      defaultAssigneeId
    });

    setFormTitle('');
    setFormDesc('');
    setIsCreatingForm(false);
  };

  const handleSubmitTestForm = async (e) => {
    e.preventDefault();
    if (!submissionData.title.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/project-forms/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProjectId,
          userId: user.id,
          formId: testingForm.id || testingForm._dbId,
          formTitle: testingForm.title,
          defaultPriority: testingForm.defaultPriority,
          defaultAssigneeId: testingForm.defaultAssigneeId,
          formData: submissionData
        })
      });

      if (res.ok) {
        setSubmittedSuccess(true);
        refreshAllData();
      }
    } catch (err) {
      console.error('Form submit error:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem 1.75rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Project Intake Forms</h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Collect requests from clients or team members. Every submission automatically becomes a tracked task.
          </p>
        </div>

        <button className="pm-btn pm-btn-primary" onClick={() => setIsCreatingForm(true)}>
          <Plus size={16} /> Create Intake Form
        </button>
      </div>

      {/* Form Creator Modal */}
      {isCreatingForm && (
        <div className="pm-drawer-backdrop" onClick={() => setIsCreatingForm(false)} style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div className="pm-card" style={{ width: '100%', maxWidth: '480px', background: 'white', padding: '1.75rem' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 800 }}>New Intake Form</h3>
            <form onSubmit={handleCreateForm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Form Title *</label>
                <input className="pm-search-input" placeholder="e.g. Feature Request or Bug Submission" value={formTitle} onChange={e => setFormTitle(e.target.value)} required />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Instructions / Description</label>
                <textarea className="pm-search-input" placeholder="Explain what information requestors should provide..." value={formDesc} onChange={e => setFormDesc(e.target.value)} style={{ minHeight: '70px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Default Priority</label>
                  <select className="pm-select" style={{ width: '100%' }} value={defaultPriority} onChange={e => setDefaultPriority(e.target.value)}>
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Auto-Assign To</label>
                  <select className="pm-select" style={{ width: '100%' }} value={defaultAssigneeId} onChange={e => setDefaultAssigneeId(e.target.value)}>
                    <option value="">None (Unassigned)</option>
                    {allAssignees.map(m => (
                      <option key={m.id || m._dbId || m.userId} value={m.id || m._dbId || m.userId}>
                        {m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="pm-btn pm-btn-secondary" onClick={() => setIsCreatingForm(false)}>Cancel</button>
                <button type="submit" className="pm-btn pm-btn-primary">Save Form</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forms Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {forms.map(form => (
          <div key={form.id || form._dbId} className="pm-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <FormInput size={18} color="#4f46e5" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{form.title}</h3>
              </div>
              <p style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5 }}>
                {form.description || 'Configured intake form for this project.'}
              </p>
              <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.5rem' }}>
                <strong>Default Priority:</strong> {form.defaultPriority || 'Medium'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
              <button
                className="pm-btn pm-btn-secondary pm-btn-sm"
                style={{ flex: 1 }}
                onClick={() => {
                  setTestingForm(form);
                  setSubmissionData({ title: '', email: '', details: '' });
                  setSubmittedSuccess(false);
                }}
              >
                <ExternalLink size={14} /> Open & Test Form
              </button>
            </div>
          </div>
        ))}

        {forms.length === 0 && !isCreatingForm && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            No intake forms configured yet. Click "+ Create Intake Form" above.
          </div>
        )}
      </div>

      {/* Test / Live Intake Form Modal */}
      {testingForm && (
        <div className="pm-drawer-backdrop" onClick={() => setTestingForm(null)} style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div className="pm-card" style={{ width: '100%', maxWidth: '500px', background: 'white', padding: '2rem' }} onClick={e => e.stopPropagation()}>
            {submittedSuccess ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Request Submitted!</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  A task has been automatically created in <strong>{activeProject?.name}</strong> and assigned per form rules.
                </p>
                <button className="pm-btn pm-btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => setTestingForm(null)}>
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitTestForm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase' }}>Intake Form Preview</span>
                  <h2 style={{ margin: '0.25rem 0', fontSize: '1.25rem', fontWeight: 900 }}>{testingForm.title}</h2>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{testingForm.description}</p>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Request Subject / Title *</label>
                  <input
                    className="pm-search-input"
                    placeholder="Brief description of what is needed..."
                    value={submissionData.title}
                    onChange={e => setSubmissionData({ ...submissionData, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Your Email</label>
                  <input
                    type="email"
                    className="pm-search-input"
                    placeholder="name@company.com"
                    value={submissionData.email}
                    onChange={e => setSubmissionData({ ...submissionData, email: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Detailed Specifications</label>
                  <textarea
                    className="pm-search-input"
                    placeholder="Provide relevant details, steps, or acceptance criteria..."
                    value={submissionData.details}
                    onChange={e => setSubmissionData({ ...submissionData, details: e.target.value })}
                    style={{ minHeight: '90px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="button" className="pm-btn pm-btn-secondary" onClick={() => setTestingForm(null)}>Cancel</button>
                  <button type="submit" className="pm-btn pm-btn-primary">
                    <Send size={15} /> Submit Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default ProjectFormsView;

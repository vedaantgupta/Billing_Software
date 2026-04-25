import React, { useState, useEffect } from 'react';
import { X, Save, User, Calendar, Briefcase, IndianRupee, Info } from 'lucide-react';
import { addItem, updateItem, getItems } from '../utils/db';
import { useAuth } from '../hooks/useAuth';

const ProjectModal = ({ isOpen, onClose, onSave, editingId, initialData }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    projectId: '',
    clientId: '',
    clientName: '',
    status: 'Planned',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    budget: '',
    description: '',
    vision: '',
    objectives: '',
    scope: '',
    exclusions: '',
    color: '#4f46e5'
  });

  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (isOpen) {
      loadContacts();
      if (initialData) {
        setFormData({
          ...formData,
          ...initialData,
          budget: initialData.budget || ''
        });
      } else {
        const generatedId = `PRJ-${Math.floor(1000 + Math.random() * 9000)}`;
        setFormData({
          name: '',
          projectId: generatedId,
          clientId: '',
          clientName: '',
          status: 'Planned',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          budget: '',
          description: '',
          vision: '',
          objectives: '',
          scope: '',
          exclusions: '',
          color: '#4f46e5'
        });
      }
    }
  }, [isOpen, initialData]);

  const loadContacts = async () => {
    if (user?.id) {
      const data = await getItems('contacts', user.id);
      setContacts(data);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'clientId') {
      const contact = contacts.find(c => (c._dbId === value || c.id === value));
      setFormData(prev => ({
        ...prev,
        clientId: value,
        clientName: contact ? (contact.companyName || contact.customerName || contact.name) : ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return alert('Project name is required');
    
    setLoading(true);
    try {
      if (editingId) {
        await updateItem('projects', editingId, formData, user.id);
      } else {
        const result = await addItem('projects', formData, user.id);
        // Register as Global Admin for this Project ID
        if (formData.projectId) {
          await fetch('http://localhost:5000/api/project-members/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: formData.projectId,
              userId: user.id,
              name: `${user.firstName} ${user.lastName || ''}`.trim()
            })
          });
        }
      }
      onSave();
      onClose();
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Failed to save project");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
      padding: '1rem'
    }}>
      <div className="modal-content glass" style={{
        background: 'white', borderRadius: '24px', width: '100%', maxWidth: '700px',
        maxHeight: '95vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#0f172a' }}>
            <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={20} />
            </div>
            {editingId ? 'Edit Project' : 'New Project'}
          </h2>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div style={{ display: 'flex', gap: '2rem', padding: '0 2rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <button 
            onClick={() => setActiveTab('general')}
            style={{ padding: '1rem 0', border: 'none', borderBottom: activeTab === 'general' ? '3px solid #4f46e5' : '3px solid transparent', background: 'none', fontWeight: 700, color: activeTab === 'general' ? '#4f46e5' : '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            General Details
          </button>
          <button 
            onClick={() => setActiveTab('planning')}
            style={{ padding: '1rem 0', border: 'none', borderBottom: activeTab === 'planning' ? '3px solid #4f46e5' : '3px solid transparent', background: 'none', fontWeight: 700, color: activeTab === 'planning' ? '#4f46e5' : '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Planning & Definition
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '2rem', overflowY: 'auto' }}>
          {activeTab === 'general' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project Name *</label>
                <div style={{ position: 'relative' }}>
                  <Briefcase size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Website Overhaul 2024"
                    style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', boxSizing: 'border-box' }}
                    required
                  />
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project ID (Custom)</label>
                <div style={{ position: 'relative' }}>
                  <Info size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    name="projectId"
                    value={formData.projectId}
                    onChange={handleChange}
                    placeholder="e.g. PRJ-001"
                    style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Client / Customer</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <select
                    name="clientId"
                    value={formData.clientId}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', appearance: 'none', background: 'white', boxSizing: 'border-box' }}
                  >
                    <option value="">-- No Client Linked --</option>
                    {contacts.map(c => (
                      <option key={c._dbId || c.id} value={c._dbId || c.id}>
                        {c.companyName || c.customerName || c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Start Date</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deadline</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Budget (₹)</label>
                <div style={{ position: 'relative' }}>
                  <IndianRupee size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', background: 'white', boxSizing: 'border-box' }}
                >
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="General description..."
                  rows={3}
                  style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Theme Color</label>
                <input 
                  type="color" 
                  name="color" 
                  value={formData.color} 
                  onChange={handleChange}
                  style={{ width: '100%', height: '45px', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '4px', background: 'white', cursor: 'pointer' }}
                />
              </div>
            </div>
          )}

          {activeTab === 'planning' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project Vision & Objectives</label>
                <textarea
                  name="vision"
                  value={formData.vision}
                  onChange={handleChange}
                  placeholder="State the core purpose, goals, and success metrics..."
                  rows={4}
                  style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project Scope Statement</label>
                <textarea
                  name="scope"
                  value={formData.scope}
                  onChange={handleChange}
                  placeholder="Define what is INCLUDED in the project..."
                  rows={3}
                  style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Exclusions (To Prevent Scope Creep)</label>
                <textarea
                  name="exclusions"
                  value={formData.exclusions}
                  onChange={handleChange}
                  placeholder="Clearly define what is EXCLUDED from the project scope..."
                  rows={3}
                  style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}

          <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2, padding: '1rem', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: 'white', fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.4)'
              }}
            >
              <Save size={20} />
              {loading ? 'Saving...' : (editingId ? 'Update Project' : 'Create Project')}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .glass {
          backdrop-filter: blur(10px);
        }
      `}</style>
    </div>
  );
};

export default ProjectModal;

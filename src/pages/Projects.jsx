import React, { useState, useEffect, useCallback } from 'react';
import { getItems, deleteItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import { Search, Briefcase, Plus, Edit2, Trash2, ChevronRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProjectModal from '../components/ProjectModal';
import '../Ledger.css';

const Projects = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const loadProjects = useCallback(async () => {
    if (user?.id) {
      setLoading(true);
      const data = await getItems('projects', user.id);
      setProjects(data);
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleEdit = (e, project) => {
    e.stopPropagation();
    setEditingData(project);
    setIsModalOpen(true);
  };

  const handleDelete = async (e, id, projectId) => {
    e.stopPropagation();
    try {
      // Check global membership if project ID exists
      if (projectId) {
        const memRes = await fetch(`http://localhost:5000/api/project-members/${projectId}`);
        const members = await memRes.json();
        const originalAdmin = members.find(m => m.isOriginalAdmin);
        
        if (originalAdmin && originalAdmin.userId !== user.id) {
          return alert("Deletion Denied: Only the original creator (Primary Admin) can delete this project.");
        }
      }

      if (window.confirm('Are you sure you want to delete this project?')) {
        const success = await deleteItem('projects', id, user.id);
        if (success) {
          setProjects(prev => prev.filter(p => p._dbId !== id && p.id !== id));
        }
      }
    } catch (err) {
      console.error("Permission check failed:", err);
      if (window.confirm('Are you sure you want to delete this project?')) {
        const success = await deleteItem('projects', id, user.id);
        if (success) {
          setProjects(prev => prev.filter(p => p._dbId !== id && p.id !== id));
        }
      }
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.clientName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'In Progress': return <Clock size={16} className="text-indigo-500" />;
      case 'On Hold': return <AlertCircle size={16} className="text-amber-500" />;
      default: return <Clock size={16} className="text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="l-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-slate-500 font-bold text-lg animate-pulse">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="l-page">
      <div className="l-header">
        <h1 className="l-title">
          <div className="l-title-icon"><Briefcase size={24} /></div>
          Project Management
        </h1>
        <button className="l-btn-primary" onClick={() => { setEditingData(null); setIsModalOpen(true); }}>
          <Plus size={18} /> New Project
        </button>
      </div>

      <div className="l-dashboard">
        <div className="l-card receivable">
          <div className="l-card-header">
            <span className="l-card-label">Active Projects</span>
            <div className="l-card-icon"><Clock size={24} /></div>
          </div>
          <div className="l-card-value">{projects.filter(p => p.status === 'In Progress').length}</div>
          <div className="l-card-subtext">Projects currently under development</div>
        </div>

        <div className="l-card payable">
          <div className="l-card-header">
            <span className="l-card-label">Total Projects</span>
            <div className="l-card-icon"><Briefcase size={24} /></div>
          </div>
          <div className="l-card-value">{projects.length}</div>
          <div className="l-card-subtext">Total projects managed in this system</div>
        </div>
      </div>

      <div className="l-control-bar">
        <div className="l-search-box">
          <Search className="l-search-icon" size={20} />
          <input
            className="l-search-input"
            placeholder="Search projects or clients..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="l-filters">
          {['all', 'Planned', 'In Progress', 'Completed', 'On Hold'].map(status => (
            <button
              key={status}
              className={`l-filter-btn ${filterStatus === status ? 'active' : ''}`}
              onClick={() => setFilterStatus(status)}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>
      </div>

      <div className="l-accounts-list">
        {filteredProjects.map(p => (
          <div
            key={p._dbId || p.id}
            className="l-account-row"
            onClick={() => navigate(`/projects/${p._dbId || p.id}`)}
          >
            <div className="l-account-left">
              <div className="l-avatar customer" style={{ background: p.color || 'var(--primary-light)' }}>
                {p.name?.[0].toUpperCase()}
              </div>
              <div className="l-account-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h3 className="l-account-name" style={{ margin: 0 }}>{p.name}</h3>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '6px', background: '#e2e8f0', color: '#475569' }}>
                        {p.projectId || 'NO-ID'}
                    </span>
                </div>
                <div className="l-account-meta">
                  <span className={`l-account-type customer`}>
                    {p.clientName || 'No Client'}
                  </span>
                  <span className="l-account-phone" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {getStatusIcon(p.status)} {p.status}
                  </span>
                  {p.budget && (
                    <span className="l-account-phone">₹{Number(p.budget).toLocaleString()}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="l-account-right">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                <button
                  onClick={e => handleEdit(e, p)}
                  className="l-btn-action"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    color: '#4f46e5',
                    cursor: 'pointer'
                  }}
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={e => handleDelete(e, p._dbId || p.id, p.projectId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    color: '#ef4444',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="l-arrow-icon">
                <ChevronRight size={24} />
              </div>
            </div>
          </div>
        ))}

        {filteredProjects.length === 0 && (
          <div className="l-empty-state">
            <Briefcase className="l-empty-icon" size={64} />
            <div className="l-empty-text">
              {searchQuery || filterStatus !== 'all'
                ? 'No projects match your criteria.'
                : 'No projects yet. Start by creating a new project.'}
            </div>
          </div>
        )}
      </div>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingData(null); }}
        onSave={() => loadProjects()}
        editingId={editingData?._dbId || editingData?.id}
        initialData={editingData}
      />
    </div>
  );
};

export default Projects;

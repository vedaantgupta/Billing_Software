import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getItems, deleteItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import { FileSpreadsheet, FileText, Monitor, Trash2, Edit, Clock, Plus } from 'lucide-react';
import './EditorHub.css';

const editors = [
  {
    id: 'spreadsheet',
    title: 'Spreadsheet',
    description: 'Powerful Excel-like grid with formulas & charts',
    route: '/editor/spreadsheet',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    bg: '#ecfdf5',
    iconBg: '#d1fae5',
    accent: '#059669',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
        <rect x="4" y="4" width="32" height="32" rx="4" fill="#10b981" opacity="0.15"/>
        <rect x="4" y="4" width="15" height="15" rx="2" fill="#10b981" opacity="0.5"/>
        <rect x="21" y="4" width="15" height="15" rx="2" fill="#10b981"/>
        <rect x="4" y="21" width="15" height="15" rx="2" fill="#10b981"/>
        <rect x="21" y="21" width="15" height="15" rx="2" fill="#10b981" opacity="0.5"/>
      </svg>
    ),
  },
  {
    id: 'text',
    title: 'Text Editor',
    description: 'Professional word processor with rich formatting',
    route: '/word-processor',
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    bg: '#eff6ff',
    iconBg: '#dbeafe',
    accent: '#2563eb',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
        <rect x="6" y="4" width="28" height="34" rx="3" fill="#3b82f6" opacity="0.15"/>
        <rect x="6" y="4" width="28" height="34" rx="3" stroke="#3b82f6" strokeWidth="1.5"/>
        <rect x="11" y="11" width="18" height="2.5" rx="1.25" fill="#3b82f6"/>
        <rect x="11" y="17" width="14" height="2.5" rx="1.25" fill="#3b82f6" opacity="0.7"/>
        <rect x="11" y="23" width="16" height="2.5" rx="1.25" fill="#3b82f6" opacity="0.7"/>
        <rect x="11" y="29" width="10" height="2.5" rx="1.25" fill="#3b82f6" opacity="0.5"/>
      </svg>
    ),
  },
  {
    id: 'presentation',
    title: 'Presentation',
    description: 'Create stunning slides with themes & animations',
    route: '/presentations',
    gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    bg: '#faf5ff',
    iconBg: '#ede9fe',
    accent: '#7c3aed',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
        <rect x="2" y="6" width="36" height="24" rx="3" fill="#a855f7" opacity="0.15"/>
        <rect x="2" y="6" width="36" height="24" rx="3" stroke="#a855f7" strokeWidth="1.5"/>
        <rect x="6" y="10" width="28" height="16" rx="2" fill="#a855f7" opacity="0.2"/>
        <polygon points="15,13 15,22 26,17.5" fill="#a855f7"/>
        <rect x="17" y="30" width="6" height="4" rx="1" fill="#a855f7" opacity="0.5"/>
        <rect x="12" y="34" width="16" height="2" rx="1" fill="#a855f7" opacity="0.4"/>
      </svg>
    ),
  },
];

export default function EditorHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDocuments = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const items = await getItems('documents', user.id);
      const filtered = items.filter(d => 
        d.docType === 'Spreadsheet' || 
        d.docType === 'Word Document' || 
        d.docType === 'Presentation'
      );
      setDocuments(filtered.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)));
    } catch (e) {
      console.error('Failed to load recent editor files:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [user?.id]);

  const handleDelete = async (docId) => {
    if (!user?.id) return;
    if (window.confirm('Are you sure you want to permanently delete this file?')) {
      await deleteItem('documents', docId, user.id);
      loadDocuments();
    }
  };

  const handleEdit = (doc) => {
    if (doc.docType === 'Spreadsheet') {
      navigate(`/editor/spreadsheet/edit/${doc.id}`);
    } else if (doc.docType === 'Word Document') {
      navigate(`/word-processor/edit/${doc.id}`);
    } else if (doc.docType === 'Presentation') {
      navigate(`/presentations/edit/${doc.id}`);
    }
  };

  const getDocIcon = (type) => {
    if (type === 'Spreadsheet') return <FileSpreadsheet size={16} style={{ color: '#10b981' }} />;
    if (type === 'Word Document') return <FileText size={16} style={{ color: '#3b82f6' }} />;
    return <Monitor size={16} style={{ color: '#7c3aed' }} />;
  };

  return (
    <div className="editor-hub">
      {/* Header */}
      <div className="editor-hub-header">
        <div className="editor-hub-header-text">
          <h1>Editor Suite</h1>
          <p>Create and edit professional Spreadsheets, Word Documents, and Presentations</p>
        </div>
      </div>

      <div className="editor-hub-divider" />

      {/* Section */}
      <div className="editor-hub-section-label">CREATE NEW</div>

      <div className="editor-hub-grid">
        {editors.map(editor => (
          <button
            key={editor.id}
            className="editor-hub-card"
            onClick={() => navigate(editor.route)}
          >
            <div className="editor-hub-card-accent" style={{ background: editor.gradient }} />
            <div className="editor-hub-card-icon" style={{ background: editor.iconBg }}>
              {editor.svg}
            </div>
            <div className="editor-hub-card-info">
              <div className="editor-hub-card-title" style={{ color: editor.accent }}>{editor.title}</div>
              <div className="editor-hub-card-desc">{editor.description}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Recent Documents Table List */}
      <div className="recent-docs-section">
        <div className="editor-hub-section-label">RECENT DOCUMENTS</div>
        
        {loading ? (
          <div className="recent-docs-loading">Loading recent items...</div>
        ) : documents.length > 0 ? (
          <div className="recent-docs-table-wrapper">
            <table className="recent-docs-table">
              <thead>
                <tr>
                  <th>Document Title</th>
                  <th>Type</th>
                  <th>Last Modified</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id}>
                    <td className="doc-title-cell" onClick={() => handleEdit(doc)}>
                      {getDocIcon(doc.docType)}
                      <span className="doc-title-text">{doc.title || `Untitled ${doc.docType}`}</span>
                    </td>
                    <td>
                      <span className={`doc-type-badge ${doc.docType.toLowerCase().replace(' ', '-')}`}>
                        {doc.docType}
                      </span>
                    </td>
                    <td className="doc-date-cell">
                      <Clock size={12} style={{ marginRight: '4px' }} />
                      {new Date(doc.updatedAt || doc.createdAt || doc.date || Date.now()).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <div className="doc-actions">
                        <button className="doc-action-btn edit" title="Edit Document" onClick={() => handleEdit(doc)}>
                          <Edit size={14} />
                        </button>
                        <button className="doc-action-btn delete" title="Delete Document" onClick={() => handleDelete(doc.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="recent-docs-empty">
            <p>No documents found. Click on any tool above to create one!</p>
          </div>
        )}
      </div>

      {/* Feature highlights */}
      <div className="editor-hub-features">
        <div className="editor-hub-feature">
          <div className="feature-dot" style={{ background: '#10b981' }} />
          <span>Formulas & pivot tables in Spreadsheet</span>
        </div>
        <div className="editor-hub-feature">
          <div className="feature-dot" style={{ background: '#3b82f6' }} />
          <span>Export to PDF & Word formats</span>
        </div>
        <div className="editor-hub-feature">
          <div className="feature-dot" style={{ background: '#a855f7' }} />
          <span>Export Presentation as .pptx & .html</span>
        </div>
      </div>
    </div>
  );
}

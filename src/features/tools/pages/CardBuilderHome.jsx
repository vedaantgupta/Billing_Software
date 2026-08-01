import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getItems, deleteItem } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import { Clock, Edit, Trash2, Download } from 'lucide-react';
import '@/features/tools/styles/CardBuilderHome.css';

export default function CardBuilderHome() {
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
        d.docType === 'Presentation' ||
        d.docType === 'Business Card'
      );
      setDocuments(filtered.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)));
    } catch (e) {
      console.error('Failed to load recent files:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [user?.id]);

  const handleEdit = (doc) => {
    if (doc.docType === 'Spreadsheet') navigate(`/editor/spreadsheet/edit/${doc.id}`);
    else if (doc.docType === 'Word Document') navigate(`/word-processor/edit/${doc.id}`);
    else if (doc.docType === 'Presentation') navigate(`/presentations/edit/${doc.id}`);
    else if (doc.docType === 'Business Card') navigate(`/editor/business-card/editor?edit=${doc.id}`);
  };

  const handleDelete = async (docId) => {
    if (!user?.id) return;
    if (window.confirm('Are you sure you want to permanently delete this file?')) {
      await deleteItem('documents', docId, user.id);
      loadDocuments();
    }
  };

  const handleDownload = (doc) => {
    const format = window.prompt('Enter format (pdf or png):', 'pdf');
    if (!format) return;
    // TODO: implement actual export logic based on format
    console.log('Downloading', doc.id, 'as', format);
    // Example placeholder: could call an API endpoint to generate file
  };

  const startBuilding = () => {
    navigate('/editor/business-card/editor');
  };

  return (
    <div className="home-container">
      <section className="hero-section">
        <h1>Welcome, {user?.name || 'User'}</h1>
        <p>All your tools at a glance – start creating instantly.</p>
        <button className="start-btn" onClick={startBuilding}>Start Card Builder</button>
      </section>
      <section className="recent-section">
        <h2>Recent Documents</h2>
        {loading ? (
          <div className="loading">Loading recent items…</div>
        ) : documents.length > 0 ? (
          <table className="recent-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Last Modified</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id}>
                  <td className="doc-title" onClick={() => handleEdit(doc)}>{doc.title || `Untitled ${doc.docType}`}</td>
                  <td>{doc.docType}</td>
                  <td>{new Date(doc.updatedAt || doc.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>
                    <div className="actions">
                      <button className="edit-btn" title="Edit" onClick={() => handleEdit(doc)}><Edit size={14} /></button>
                      <button className="delete-btn" title="Delete" onClick={() => handleDelete(doc.id)}><Trash2 size={14} /></button>
                      <button className="download-btn" title="Download" onClick={() => handleDownload(doc)}><Download size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">No recent documents. Create one using the tools above.</div>
        )}
      </section>
    </div>
  );
}

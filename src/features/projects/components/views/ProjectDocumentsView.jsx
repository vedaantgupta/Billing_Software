import React, { useState } from 'react';
import { FileText, Plus, Edit2, Save, Trash2, BookOpen, Clock, Tag } from 'lucide-react';
import { useProject } from '@/features/projects/context/ProjectContext';

const ProjectDocumentsView = () => {
  const {
    docs,
    addDoc,
    updateDoc,
    activeProject
  } = useProject();

  const [selectedDocId, setSelectedDocId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('Specification');
  const [docContent, setDocContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const selectedDoc = docs.find(d => (d.id || d._dbId) === selectedDocId) || docs[0];

  const handleSelectDoc = (doc) => {
    setSelectedDocId(doc.id || doc._dbId);
    setDocTitle(doc.title);
    setDocCategory(doc.category || 'General');
    setDocContent(doc.content || '');
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setIsEditing(true);
    setDocTitle('');
    setDocCategory('Specification');
    setDocContent('# Project Overview\n\nWrite your document specifications, requirements, architecture, or meeting notes here...');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!docTitle.trim()) return;

    if (isCreating) {
      const saved = await addDoc({
        title: docTitle.trim(),
        category: docCategory,
        content: docContent
      });
      if (saved) {
        setSelectedDocId(saved.id || saved._dbId);
        setIsCreating(false);
        setIsEditing(false);
      }
    } else if (selectedDoc) {
      await updateDoc(selectedDoc.id || selectedDoc._dbId, {
        title: docTitle.trim(),
        category: docCategory,
        content: docContent
      });
      setIsEditing(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', padding: '1.5rem 1.75rem', minHeight: '550px' }}>
      
      {/* Sidebar: Documents Directory */}
      <div className="pm-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span className="pm-drawer-section-title">Documents & Wiki</span>
          <button className="pm-btn pm-btn-primary pm-btn-sm" onClick={handleStartCreate}>
            <Plus size={14} /> New
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto' }}>
          {docs.map(d => {
            const isSelected = (d.id || d._dbId) === (selectedDoc?.id || selectedDoc?._dbId) && !isCreating;
            return (
              <div
                key={d.id || d._dbId}
                onClick={() => handleSelectDoc(d)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.65rem 0.75rem',
                  borderRadius: '10px',
                  background: isSelected ? '#eef2ff' : 'transparent',
                  color: isSelected ? '#4f46e5' : '#1e293b',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  border: isSelected ? '1px solid #c7d2fe' : '1px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <FileText size={16} />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {d.title}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {d.category || 'Note'}
                  </div>
                </div>
              </div>
            );
          })}

          {docs.length === 0 && !isCreating && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8', fontSize: '0.8rem' }}>
              No documents created yet. Click "+ New" to add one!
            </div>
          )}
        </div>
      </div>

      {/* Main Document Content / Editor Area */}
      <div className="pm-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
        {isEditing || isCreating ? (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                className="pm-search-input"
                style={{ fontSize: '1.25rem', fontWeight: 800, flex: 1 }}
                placeholder="Document Title..."
                value={docTitle}
                onChange={e => setDocTitle(e.target.value)}
                required
              />
              <select
                className="pm-select"
                value={docCategory}
                onChange={e => setDocCategory(e.target.value)}
              >
                <option value="Specification">Specification</option>
                <option value="Architecture">Architecture</option>
                <option value="Requirements">Requirements</option>
                <option value="Meeting Notes">Meeting Notes</option>
                <option value="Release Notes">Release Notes</option>
              </select>
            </div>

            <textarea
              className="pm-search-input"
              style={{ minHeight: '380px', flex: 1, resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.6 }}
              value={docContent}
              onChange={e => setDocContent(e.target.value)}
              placeholder="Write Markdown content..."
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="pm-btn pm-btn-secondary"
                onClick={() => {
                  setIsEditing(false);
                  setIsCreating(false);
                  if (selectedDoc) handleSelectDoc(selectedDoc);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="pm-btn pm-btn-primary">
                <Save size={16} /> Save Document
              </button>
            </div>
          </form>
        ) : selectedDoc ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '6px', background: '#e0e7ff', color: '#4f46e5' }}>
                    {selectedDoc.category || 'General'}
                  </span>
                  <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{selectedDoc.title}</h1>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Updated by {selectedDoc.updatedBy || 'User'} on {new Date(selectedDoc.updatedAt || Date.now()).toLocaleDateString()}
                </div>
              </div>

              <button
                className="pm-btn pm-btn-secondary pm-btn-sm"
                onClick={() => {
                  setDocTitle(selectedDoc.title);
                  setDocCategory(selectedDoc.category || 'Specification');
                  setDocContent(selectedDoc.content || '');
                  setIsEditing(true);
                }}
              >
                <Edit2 size={14} /> Edit Document
              </button>
            </div>

            {/* Rendered Document Body */}
            <div style={{ fontSize: '0.95rem', lineHeight: 1.7, color: '#334155', whiteSpace: 'pre-wrap' }}>
              {selectedDoc.content || 'This document has no content yet.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
            <BookOpen size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p style={{ fontWeight: 600 }}>Select a document or create a new one.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default ProjectDocumentsView;

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import { 
  ChevronLeft, Save, Printer, Download, FileText, CheckCircle2, 
  Loader2, RefreshCw, Sparkles 
} from 'lucide-react';
import { getItems, addItem, updateItem } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import '@/features/tools/styles/WordProcessor.css';

const WordProcessor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const editorRef = useRef(null);

  const [title, setTitle] = useState('Untitled Document');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);

  // Compute live word & character statistics
  const stats = useMemo(() => {
    if (!content) return { words: 0, characters: 0 };
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const characters = text.length;
    return { words, characters };
  }, [content]);

  // Load existing document from DB or localStorage draft
  useEffect(() => {
    const loadData = async () => {
      if (id && user?.id) {
        try {
          const items = await getItems('documents', user.id);
          const doc = items.find(d => d.id === id || d._dbId === id);
          if (doc) {
            setTitle(doc.title || 'Untitled Document');
            setContent(doc.htmlContent || '');
            if (doc.updatedAt) {
              setLastSavedTime(new Date(doc.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            }
          }
        } catch (e) {
          console.error("Failed to load document", e);
        }
      } else {
        const draft = localStorage.getItem('word-draft');
        if (draft) {
          try {
            const parsed = JSON.parse(draft);
            setTitle(parsed.title || 'Untitled Document');
            setContent(parsed.content || '');
            if (parsed.lastSaved) {
              setLastSavedTime(new Date(parsed.lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            }
          } catch (e) {
            console.error("Failed to parse draft", e);
          }
        }
      }
      setLoading(false);
    };
    loadData();
  }, [id, user?.id]);

  // Debounced autosave for local draft when creating new doc
  useEffect(() => {
    if (!id && content && !loading) {
      const timeoutId = setTimeout(() => {
        const now = new Date();
        localStorage.setItem('word-draft', JSON.stringify({
          title,
          content,
          lastSaved: now.toISOString()
        }));
        setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [title, content, id, loading]);

  // Global Ctrl+S shortcut handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [title, content, id, user?.id]);

  const handleSave = async () => {
    if (!user?.id) {
      alert('Please log in to save your document.');
      return;
    }
    setIsSaving(true);
    setSaveSuccess(false);

    // Get current HTML from TinyMCE editor instance if available
    const currentHtml = editorRef.current ? editorRef.current.getContent() : content;
    const nowIso = new Date().toISOString();
    
    const docData = {
      docType: 'Word Document',
      title: title.trim() || 'Untitled Document',
      htmlContent: currentHtml,
      date: nowIso.split('T')[0],
      invoiceNumber: `WD-${Date.now().toString().slice(-4)}`,
      total: 0,
      updatedAt: nowIso
    };

    try {
      if (id) {
        await updateItem('documents', id, docData, user.id);
      } else {
        const created = await addItem('documents', { ...docData, createdAt: nowIso }, user.id);
        localStorage.removeItem('word-draft');
        if (created?.id || created?._dbId) {
          navigate(`/documents/word/edit/${created.id || created._dbId}`, { replace: true });
        }
      }
      setSaveSuccess(true);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save document:", error);
      alert('Failed to save document. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    if (editorRef.current) {
      editorRef.current.execCommand('mcePrint');
    } else {
      window.print();
    }
  };

  const handleExportWord = () => {
    const currentHtml = editorRef.current ? editorRef.current.getContent() : content;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${title}</title><style>body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; } table { border-collapse: collapse; width: 100%; } table td, table th { border: 1px solid #999; padding: 6px; }</style></head><body>`;
    const footer = `</body></html>`;
    const sourceHtml = header + currentHtml + footer;
    const blob = new Blob(['\ufeff' + sourceHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'Document').replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="wp-loading-screen">
        <Loader2 size={32} className="animate-spin text-blue-600" />
        <span>Loading Word Processor...</span>
      </div>
    );
  }

  return (
    <div className="word-processor-container">
      {/* Top Professional Header Bar */}
      <div className="wp-header">
        <div className="wp-title-section">
          <button className="wp-back-btn" onClick={() => navigate('/documents')} title="Return to Document Hub">
            <ChevronLeft size={16} /> Back to Documents
          </button>
          
          <div className="wp-badge">
            <FileText size={14} /> Word
          </div>

          <div className="wp-title-input-wrapper">
            <input 
              type="text" 
              className="wp-title-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter document title..."
              title="Click to rename document"
            />
          </div>

          {/* Sync / Autosave Indicator */}
          {isSaving ? (
            <span className="wp-status-pill saving">
              <Loader2 size={12} className="animate-spin" /> Saving...
            </span>
          ) : saveSuccess ? (
            <span className="wp-status-pill saved">
              <CheckCircle2 size={12} /> Saved to Database
            </span>
          ) : lastSavedTime ? (
            <span className="wp-status-pill draft" title="Last saved time">
              Saved at {lastSavedTime}
            </span>
          ) : null}
        </div>

        {/* Action Controls */}
        <div className="wp-action-section">
          {/* Live Document Statistics */}
          <div className="wp-stats-pill hide-on-mobile">
            <span>{stats.words} words</span>
            <span>•</span>
            <span>{stats.characters} chars</span>
          </div>

          <button className="wp-secondary-btn" onClick={handlePrint} title="Print Document">
            <Printer size={15} /> Print
          </button>

          <button className="wp-secondary-btn" onClick={handleExportWord} title="Download Microsoft Word .doc">
            <Download size={15} /> Export .doc
          </button>

          <button className="wp-primary-save-btn" onClick={handleSave} disabled={isSaving} title="Save Document (Ctrl+S)">
            {isSaving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Document'}</span>
            <span className="wp-kbd-hint">Ctrl+S</span>
          </button>
        </div>
      </div>
      
      {/* Main Fluid Stage */}
      <div className="wp-main-area">
        <Editor
          apiKey='9k5tswi1ytxnuo54ayz4ie4k01ehvvkzbrketm6hh04uo328'
          onInit={(evt, editor) => {
            editorRef.current = editor;
          }}
          value={content}
          onEditorChange={(newContent) => setContent(newContent)}
          init={{
            height: '100%',
            menubar: true,
            plugins: [
              'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
              'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
              'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount', 'pagebreak'
            ],
            toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | table link image media pagebreak | removeformat fullscreen | help',
            content_style: `
              body { 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                font-size: 15px; 
                line-height: 1.7; 
                color: #1e293b; 
                background: #f1f5f9; 
                margin: 0; 
                padding: 30px 15px; 
                box-sizing: border-box; 
              }
              .mce-content-body {
                max-width: 860px; 
                min-height: 1100px; 
                margin: 0 auto; 
                padding: 60px 72px; 
                box-shadow: 0 10px 25px -4px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04); 
                background: #ffffff; 
                border-radius: 4px; 
                box-sizing: border-box;
              }
              h1, h2, h3, h4, h5, h6 { 
                color: #0f172a; 
                font-weight: 700; 
                margin-top: 1.4em; 
                margin-bottom: 0.5em; 
              }
              h1 { font-size: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.4rem; }
              h2 { font-size: 1.5rem; }
              h3 { font-size: 1.25rem; }
              p { margin-top: 0; margin-bottom: 1em; }
              table { 
                border-collapse: collapse; 
                width: 100%; 
                margin: 1.5rem 0; 
              }
              table th { 
                background: #f8fafc; 
                font-weight: 600; 
                color: #334155; 
                border: 1px solid #cbd5e1; 
                padding: 10px 14px; 
                text-align: left; 
              }
              table td { 
                border: 1px solid #cbd5e1; 
                padding: 8px 14px; 
              }
              blockquote { 
                border-left: 4px solid #3b82f6; 
                padding-left: 1rem; 
                margin: 1rem 0; 
                color: #475569; 
                font-style: italic; 
              }
              img { 
                max-width: 100%; 
                height: auto; 
                border-radius: 6px; 
              }
              hr { 
                border: 0; 
                border-top: 1px solid #e2e8f0; 
                margin: 2rem 0; 
              }
            `,
            skin: 'oxide',
            content_css: 'default',
            branding: false,
            promotion: false,
            resize: false,
            statusbar: true,
            setup: (editor) => {
              editor.on('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                  e.preventDefault();
                  handleSave();
                }
              });
            }
          }}
        />
      </div>
    </div>
  );
};

export default WordProcessor;

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import { ChevronLeft, Save, Printer, Download, FileText } from 'lucide-react';
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

  useEffect(() => {
    const loadData = async () => {
      if (id && user?.id) {
        const items = await getItems('documents', user.id);
        const doc = items.find(d => d.id === id);
        if (doc) {
          setTitle(doc.title || 'Untitled Document');
          setContent(doc.htmlContent || '');
        }
      } else {
        const draft = localStorage.getItem('word-draft');
        if (draft) {
          try {
            const parsed = JSON.parse(draft);
            setTitle(parsed.title || 'Untitled Document');
            setContent(parsed.content || '');
          } catch (e) {
            console.error("Failed to parse draft", e);
          }
        }
      }
      setLoading(false);
    };
    loadData();
  }, [id, user?.id]);

  useEffect(() => {
    if (!id && content && !loading) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('word-draft', JSON.stringify({
          title,
          content,
          lastSaved: new Date().toISOString()
        }));
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [title, content, id, loading]);

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    
    const docData = {
      docType: 'Word Document',
      title,
      htmlContent: content,
      date: new Date().toISOString().split('T')[0],
      invoiceNumber: `WD-${Date.now().toString().slice(-4)}`,
      total: 0,
      updatedAt: new Date().toISOString()
    };

    try {
      if (id) {
        await updateItem('documents', id, docData, user.id);
      } else {
        await addItem('documents', { ...docData, createdAt: new Date().toISOString() }, user.id);
        localStorage.removeItem('word-draft');
      }
      alert('Document saved successfully!');
    } catch (error) {
      console.error("Failed to save", error);
      alert('Failed to save document.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="loading-screen">Loading Editor...</div>;

  return (
    <div className="word-processor-container">
      <div className="wp-header">
        <div className="title-section">
          <button className="back-btn" onClick={() => navigate('/')}>
            <ChevronLeft size={18} /> Back
          </button>
          <div className="title-input-wrapper">
            <FileText size={18} className="title-icon" />
            <input 
              type="text" 
              className="wp-title-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter document title..."
            />
          </div>
        </div>
        <div className="action-section">
          <button className="action-btn" onClick={handleSave} disabled={isSaving}>
            <Save size={18} /> {isSaving ? 'Saving...' : 'Save Document'}
          </button>
        </div>
      </div>
      
      <div className="wp-main-area">
        <Editor
          apiKey='9k5tswi1ytxnuo54ayz4ie4k01ehvvkzbrketm6hh04uo328'
          onInit={(evt, editor) => editorRef.current = editor}
          value={content}
          onEditorChange={(newContent) => setContent(newContent)}
          init={{
            height: '100%',
            plugins: [
              'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
              'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
              'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount', 'pagebreak'
            ],
            toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table | removeformat | help',
            content_style: 'body { font-family:Inter,Arial,sans-serif; font-size:14px; max-width: 800px; margin: 2rem auto; padding: 2rem; box-shadow: 0 0 10px rgba(0,0,0,0.1); background: white; }',
            skin: 'oxide',
            content_css: 'default',
            branding: false,
            promotion: false,
            resize: false,
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

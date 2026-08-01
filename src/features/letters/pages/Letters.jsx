import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ChevronLeft, Save, Printer, Download, PenTool, Layout, Variable, 
  Scissors, Eye, Settings, Sparkles, Mic, MicOff, PanelLeftClose, PanelRightClose, PanelLeft, PanelRight 
} from 'lucide-react';
import { getItems, addItem, updateItem, getDB } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import { replaceVariables } from '@/features/letters/pages/letterVariables';
import { exportPDF } from '@/utils/pdfExport';
import { useReactToPrint } from 'react-to-print';

import TemplateSidebar from '@/features/letters/components/TemplateSidebar';
import LetterEditor from '@/features/letters/pages/LetterEditor';
import VariablePanel from '@/features/letters/components/VariablePanel';
import LetterPreview from '@/features/letters/pages/LetterPreview';
import SignatureModal from '@/features/letters/components/SignatureModal';
import SnippetPanel from '@/features/letters/components/SnippetPanel';

import '@/features/letters/styles/Letters.css';

const Letters = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const companyInfo = getDB().company || {};

  const [title, setTitle] = useState('Untitled Document');
  const [htmlContent, setHtmlContent] = useState('');
  const [jsonContent, setJsonContent] = useState(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState('variables');
  
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [margins, setMargins] = useState('normal');
  const [orientation, setOrientation] = useState('portrait');
  const [pageSize, setPageSize] = useState('letter');
  
  const editorRef = useRef(null);
  const previewRef = useRef(null);

  // Speech Recognition Setup
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  if (recognition) {
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      
      if (event.results[0].isFinal && editorRef.current) {
        editorRef.current.insertContent(transcript + ' ');
      }
    };
  }

  const toggleListening = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
    setIsListening(!isListening);
  };

  // Variables data context
  const [variablesData, setVariablesData] = useState({
    'company-name': companyInfo.name || 'Your Company',
    'company-address': companyInfo.address || 'Company Address',
    'company-phone': companyInfo.phone || 'Company Phone',
    'company-email': companyInfo.email || 'Company Email',
    'company-website': companyInfo.website || '',
    'gst-number': companyInfo.gstin || '',
    'pan-number': companyInfo.pan || '',
    'customer-name': '[Customer Name]',
    'mobile': '[Mobile]',
    'email': '[Email]',
    'letter-no': `DOC-${Date.now().toString().slice(-4)}`,
    'letter-date': new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const loadLetter = async () => {
      if (id && user?.id) {
        const items = await getItems('documents', user.id);
        const letter = items.find(d => d.id === id);
        if (letter) {
          setTitle(letter.title || 'Untitled Document');
          setHtmlContent(letter.htmlContent || letter.content || '');
          setJsonContent(letter.jsonContent || null);
          
          if (letter.invoiceNumber) {
            setVariablesData(prev => ({...prev, 'letter-no': letter.invoiceNumber}));
          }
          if (letter.date) {
            setVariablesData(prev => ({...prev, 'letter-date': letter.date}));
          }
        }
      } else {
        const draft = localStorage.getItem('letter-draft');
        if (draft) {
          try {
            const parsed = JSON.parse(draft);
            setTitle(parsed.title || 'Untitled Document');
            setHtmlContent(parsed.htmlContent || '');
            setJsonContent(parsed.jsonContent || null);
          } catch (e) {
            console.error("Failed to parse draft", e);
          }
        }
      }
    };
    loadLetter();
  }, [id, user?.id]);

  useEffect(() => {
    if (!id && htmlContent) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('letter-draft', JSON.stringify({
          title,
          htmlContent,
          jsonContent,
          lastSaved: new Date().toISOString()
        }));
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [title, htmlContent, jsonContent, id]);

  const handleSave = async () => {
    if (!user?.id) return;
    
    const letterData = {
      docType: 'Document',
      title,
      htmlContent,
      jsonContent,
      date: variablesData['letter-date'],
      invoiceNumber: variablesData['letter-no'],
      total: 0,
      updatedAt: new Date().toISOString()
    };

    try {
      if (id) {
        await updateItem('documents', id, letterData, user.id);
        alert('Document saved successfully!');
      } else {
        await addItem('documents', { ...letterData, createdAt: new Date().toISOString() }, user.id);
        localStorage.removeItem('letter-draft');
        navigate('/documents');
      }
    } catch (error) {
      console.error("Failed to save", error);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: previewRef,
    documentTitle: title,
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [title, htmlContent, jsonContent, id]);

  const handleUpdateContent = (html, json) => {
    setHtmlContent(html);
    setJsonContent(json);
  };

  const handleSelectTemplate = (template) => {
    setHtmlContent(template.content);
    setTitle(`${template.title}`);
    if (editorRef.current && editorRef.current.getEditor()) {
      editorRef.current.getEditor().chain().focus().setContent(template.content).run();
    }
  };

  const handleInsertVariable = (variable) => {
    if (editorRef.current) {
      editorRef.current.insertContent(`{{${variable}}}`);
    }
  };

  const handleInsertSignature = (signatureDataUrl) => {
    if (editorRef.current) {
      editorRef.current.insertContent(`<img src="${signatureDataUrl}" alt="Signature" style="max-width: 200px; display: block; margin: 1rem 0;" />`);
    }
  };

  const handleAIGenerate = async () => {
    const prompt = window.prompt("Describe the letter you want to generate");
    if (!prompt) return;

    setIsAIGenerating(true);
    try {
      const response = await fetch('http://localhost:5000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Generate a professional letter body for: "${prompt}". Return HTML.`,
          userId: user.id
        })
      });
      const data = await response.json();
      if (data.response) {
        const generatedHtml = data.response.replace(/```html/g, '').replace(/```/g, '').trim();
        setHtmlContent(generatedHtml);
        if (editorRef.current) {
          editorRef.current.getEditor().commands.setContent(generatedHtml);
        }
      }
    } catch (err) {
      alert("AI Write failed.");
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleExportPDF = () => {
    exportPDF(previewRef.current, `${title.replace(/\s+/g, '_')}.pdf`, margins, orientation, pageSize);
  };

  const compiledHtml = replaceVariables(htmlContent, variablesData);

  return (
    <div className={`letters-module-container ${!isLeftSidebarOpen ? 'left-collapsed' : ''} ${!isRightSidebarOpen ? 'right-collapsed' : ''}`}>
      {/* Left Sidebar: Templates */}
      <div className="letters-sidebar-col">
        <div className="sidebar-header">
          <button className="back-btn" onClick={() => navigate('/documents')}>
            <ChevronLeft size={18} /> Back
          </button>
          <button className="sidebar-toggle" onClick={() => setIsLeftSidebarOpen(false)}>
            <PanelLeftClose size={18} />
          </button>
        </div>
        <TemplateSidebar onSelectTemplate={handleSelectTemplate} />
      </div>

      {/* Center: Editor */}
      <div className="letters-editor-col">
        <div className="letters-editor-header">
          <div className="title-section">
            {!isLeftSidebarOpen && (
              <button className="sidebar-toggle-mini" onClick={() => setIsLeftSidebarOpen(true)}>
                <PanelLeft size={18} />
              </button>
            )}
            <Layout size={20} color="#4f46e5" />
            <input 
              type="text" 
              className="letter-title-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter document title..."
            />
          </div>
          <div className="action-section">
            <button className={`action-btn ai-btn ${isAIGenerating ? 'loading' : ''}`} onClick={handleAIGenerate}>
              <Sparkles size={18} /> {isAIGenerating ? 'Writing...' : 'AI'}
            </button>
            <button className={`action-btn ${isListening ? 'active-listening' : ''}`} onClick={toggleListening}>
              {isListening ? <MicOff size={18} color="#ef4444" /> : <Mic size={18} />}
            </button>
            <div className="v-divider"></div>
            <button className="action-btn" onClick={handleSave} title="Save (Ctrl+S)">
              <Save size={18} />
            </button>
            <button className="action-btn primary" onClick={handleExportPDF} title="Download PDF">
              <Download size={18} /> Export
            </button>
            {!isRightSidebarOpen && (
              <button className="sidebar-toggle-mini" onClick={() => setIsRightSidebarOpen(true)}>
                <PanelRight size={18} />
              </button>
            )}
          </div>
        </div>
        <div className="letters-main-area">
          <div className="letters-editor-scroll">
            <LetterEditor 
              ref={editorRef} 
              content={htmlContent} 
              onUpdate={handleUpdateContent} 
              margins={margins}
              setMargins={setMargins}
              orientation={orientation}
              setOrientation={setOrientation}
              pageSize={pageSize}
              setPageSize={setPageSize}
              onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* Right Sidebar: Tools */}
      <div className="letters-right-col">
        <div className="right-sidebar-header">
          <button className="sidebar-toggle" onClick={() => setIsRightSidebarOpen(false)}>
            <PanelRightClose size={18} />
          </button>
          <div className="right-sidebar-tabs">
            <button className={activeRightTab === 'variables' ? 'active' : ''} onClick={() => setActiveRightTab('variables')} title="Variables">
              <Variable size={18} />
            </button>
            <button className={activeRightTab === 'snippets' ? 'active' : ''} onClick={() => setActiveRightTab('snippets')} title="Snippets">
              <Scissors size={18} />
            </button>
            <button className={activeRightTab === 'preview' ? 'active' : ''} onClick={() => setActiveRightTab('preview')} title="Preview">
              <Eye size={18} />
            </button>
          </div>
        </div>
        
        <div className="right-sidebar-content">
          {activeRightTab === 'variables' && <VariablePanel onInsertVariable={handleInsertVariable} />}
          {activeRightTab === 'snippets' && <SnippetPanel onInsertSnippet={(content) => editorRef.current && editorRef.current.insertContent(content)} />}
          {activeRightTab === 'preview' && (
            <div className="preview-container">
              <div className="preview-header-info">
                <span className="preview-badge">PDF Preview</span>
              </div>
              <LetterPreview 
                ref={previewRef} 
                htmlContent={compiledHtml} 
                margins={margins}
                orientation={orientation}
                pageSize={pageSize}
              />
            </div>
          )}
        </div>
      </div>

      <SignatureModal 
        isOpen={isSignatureModalOpen} 
        onClose={() => setIsSignatureModalOpen(false)} 
        onSave={handleInsertSignature} 
      />
    </div>
  );
};

export default Letters;

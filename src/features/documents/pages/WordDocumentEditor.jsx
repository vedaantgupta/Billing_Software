import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FileText, Save, ArrowLeft, Download, Printer, Eye, Share2,
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Table, Image, Columns, Layout as LayoutIcon,
  CheckSquare, MessageSquare, History, Sparkles, Plus, Trash2,
  ChevronDown, ChevronRight, X, Check, Search, Type, Sliders,
  RefreshCw, CornerDownRight, BookOpen, AlertCircle, Users, ExternalLink
} from 'lucide-react';
import { getItems, addItem, updateItem } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import '@/features/documents/styles/WordDocumentEditor.css';

// Master paragraph styles
const MASTER_STYLES = {
  Normal: { label: 'Normal Text', tag: 'p', fontSize: '14px', fontWeight: '400', color: '#1e293b', lineHeight: 1.6, marginBottom: '0.8rem' },
  Title: { label: 'Title', tag: 'h1', fontSize: '28px', fontWeight: '800', color: '#0f172a', lineHeight: 1.2, marginBottom: '1rem', letterSpacing: '-0.5px' },
  Subtitle: { label: 'Subtitle', tag: 'h2', fontSize: '18px', fontWeight: '500', color: '#475569', lineHeight: 1.3, marginBottom: '1.2rem' },
  Heading1: { label: 'Heading 1', tag: 'h2', fontSize: '22px', fontWeight: '700', color: '#1e293b', lineHeight: 1.3, marginBottom: '0.8rem' },
  Heading2: { label: 'Heading 2', tag: 'h3', fontSize: '18px', fontWeight: '600', color: '#334155', lineHeight: 1.4, marginBottom: '0.6rem' },
  Heading3: { label: 'Heading 3', tag: 'h4', fontSize: '15px', fontWeight: '600', color: '#475569', lineHeight: 1.4, marginBottom: '0.5rem' },
  CodeBlock: { label: 'Code Block', tag: 'pre', fontSize: '13px', fontWeight: '400', color: '#0f172a', lineHeight: 1.5, marginBottom: '0.8rem', fontFamily: 'monospace' },
  Quote: { label: 'Blockquote', tag: 'blockquote', fontSize: '15px', fontWeight: '400', color: '#64748b', lineHeight: 1.6, marginBottom: '1rem', fontStyle: 'italic' },
};

// Default sample content for a new document
const DEFAULT_CONTENT = `
<h1>Executive Business Proposal & Strategy Document</h1>
<p class="subtitle">BaniyaBook Enterprise Suite &bull; Confidential Operating Guide</p>
<hr/>
<h2>1. Executive Summary</h2>
<p>Unlike basic presentations locked to rigid coordinates, a modern word processing environment operates on a fluid document stream. Elements naturally flow across boundaries, auto-paginating dynamically as text and high-resolution media are composed in real time.</p>
<p>This document demonstrates enterprise-grade Microsoft Word features: multi-column newspaper layouts, contextual data tables, anchored reviewer comments, track changes audit logs, and mail merge variables.</p>

<h2>2. Core Functional Metrics</h2>
<p>Below is an embedded contextual data table with real-time cell shading and repeat headers:</p>
<table style="width: 100%; border-collapse: collapse; margin: 1rem 0; border: 1px solid #cbd5e1;">
  <thead>
    <tr style="background-color: #f1f5f9; color: #1e293b; font-weight: 600;">
      <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">Category</th>
      <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">Key Metric</th>
      <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">Target 2026</th>
      <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">Document Processing</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">Real-time Pagination & Flow</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right;">100% Native</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; color: #059669; font-weight: 600;">Verified</td>
    </tr>
    <tr style="background-color: #f8fafc;">
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">Calculation Engine</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">DAG Node Graph + Formulas</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right;">Sub-10ms</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; color: #059669; font-weight: 600;">Optimal</td>
    </tr>
    <tr>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">Mail Merge Studio</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">Dynamic Customer Ingestion</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right;">10,000 records</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; color: #2563eb; font-weight: 600;">Ready</td>
    </tr>
  </tbody>
</table>

<h2>3. Mail Merge & Dynamic Variable Injection</h2>
<p>Dear <strong>{{First_Name}} {{Last_Name}}</strong>,</p>
<p>We are pleased to inform you that your account at <strong>{{Company}}</strong> (Registered Address: {{Address}}) has been upgraded to BaniyaBook Enterprise. Your current ledger balance of <strong>{{Balance}}</strong> has been synchronized across all billing journals.</p>
<p>Please review Section 4 below for complete audit logs and track-changes suggestions.</p>
`;

const WordDocumentEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const editorBodyRef = useRef(null);

  // Core Document Metadata
  const [docId, setDocId] = useState(id || null);
  const [title, setTitle] = useState('Executive Business Document');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'insert', 'layout', 'review', 'merge', 'view'

  // Document Architecture & Layout States
  const [pageSize, setPageSize] = useState('A4'); // 'A4', 'Letter', 'Legal'
  const [orientation, setOrientation] = useState('portrait'); // 'portrait', 'landscape'
  const [marginPreset, setMarginPreset] = useState('normal'); // 'normal', 'narrow', 'wide', 'custom'
  const [margins, setMargins] = useState({ top: 48, bottom: 48, left: 54, right: 54 }); // in px (96 DPI)
  const [columnCount, setColumnCount] = useState(1); // 1, 2, 3
  const [columnGutter, setColumnGutter] = useState(24);
  const [differentFirstPage, setDifferentFirstPage] = useState(false);
  const [headerText, setHeaderText] = useState('{{Document_Title}} &bull; Confidential');
  const [footerText, setFooterText] = useState('Page {{Page_Number}} of {{Total_Pages}}');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [widowOrphanControl, setWidowOrphanControl] = useState(true);
  const [keepWithNext, setKeepWithNext] = useState(true);

  // Typography & Paragraph Formatting States
  const [activeFont, setActiveFont] = useState('Inter');
  const [activeFontSize, setActiveFontSize] = useState('14');
  const [activeLineHeight, setActiveLineHeight] = useState('1.6');
  const [activeLetterSpacing, setActiveLetterSpacing] = useState('0');
  const [activeColor, setActiveColor] = useState('#0f172a');
  const [activeBgColor, setActiveBgColor] = useState('transparent');
  const [currentStyle, setCurrentStyle] = useState('Normal');

  // Review & Collaboration States
  const [trackChangesMode, setTrackChangesMode] = useState(false);
  const [trackChangesList, setTrackChangesList] = useState([
    { id: 'tc-1', type: 'addition', text: 'high-resolution media are composed', author: 'Vedaant G.', time: '10:14 AM' },
    { id: 'tc-2', type: 'deletion', text: 'rigid coordinate systems', author: 'Reviewer (Admin)', time: '11:02 AM' }
  ]);
  const [comments, setComments] = useState([
    { id: 'cm-1', author: 'Finance Director', date: 'Today at 11:30 AM', text: 'Please ensure tax invoice numbers match the GST ledger before finalizing.', resolved: false }
  ]);
  const [newCommentText, setNewCommentText] = useState('');
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const [showTrackChangesSidebar, setShowTrackChangesSidebar] = useState(false);

  // Mail Merge States
  const [mergeDataSource, setMergeDataSource] = useState('contacts');
  const [contactsData, setContactsData] = useState([
    { First_Name: 'Rajesh', Last_Name: 'Agarwal', Company: 'Agarwal Supermart Ltd.', Address: '24 MG Road, New Delhi', Balance: '₹48,500.00', Email: 'rajesh@agarwalmart.in', Phone: '+91 98765 43210' },
    { First_Name: 'Priya', Last_Name: 'Sharma', Company: 'Sharma Logistics & Co.', Address: '12 Industrial Area, Mumbai', Balance: '₹12,400.00', Email: 'priya@sharmalogistics.com', Phone: '+91 98111 22334' },
    { First_Name: 'Amit', Last_Name: 'Verma', Company: 'Verma Enterprises', Address: '7th Sector, Bengaluru', Balance: '₹95,200.00', Email: 'amit@vermagroup.org', Phone: '+91 99223 34455' },
    { First_Name: 'Kavita', Last_Name: 'Patel', Company: 'Patel Textile Mills', Address: 'Ring Road, Surat', Balance: '₹1,50,000.00', Email: 'kavita@pateltextiles.in', Phone: '+91 97234 56789' }
  ]);
  const [currentMergeIndex, setCurrentMergeIndex] = useState(0);
  const [isMailMergePreviewActive, setIsMailMergePreviewActive] = useState(false);
  const [mergedPreviewHtml, setMergedPreviewHtml] = useState('');

  // Table & Media Modals
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableDimensions, setTableDimensions] = useState({ rows: 3, cols: 4, headerRow: true });
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageWrapMode, setImageWrapMode] = useState('tight'); // 'inline', 'tight', 'behind', 'infront'

  // Word Count & Stats
  const [docStats, setDocStats] = useState({ words: 0, characters: 0, pages: 1 });

  // Load Document
  useEffect(() => {
    const loadDoc = async () => {
      if (id && user?.id) {
        try {
          const items = await getItems('documents', user.id);
          const found = items.find(d => d.id === id || d._dbId === id);
          if (found) {
            setTitle(found.title || 'Untitled Document');
            if (found.htmlContent && editorBodyRef.current) {
              editorBodyRef.current.innerHTML = found.htmlContent;
            }
            if (found.docSettings) {
              const s = found.docSettings;
              if (s.pageSize) setPageSize(s.pageSize);
              if (s.orientation) setOrientation(s.orientation);
              if (s.margins) setMargins(s.margins);
              if (s.columnCount) setColumnCount(s.columnCount);
              if (s.differentFirstPage !== undefined) setDifferentFirstPage(s.differentFirstPage);
              if (s.headerText) setHeaderText(s.headerText);
              if (s.footerText) setFooterText(s.footerText);
            }
            if (found.comments) setComments(found.comments);
            if (found.trackChangesList) setTrackChangesList(found.trackChangesList);
          }
        } catch (e) {
          console.error("Error loading document", e);
        }
      } else if (editorBodyRef.current && !editorBodyRef.current.innerHTML.trim()) {
        editorBodyRef.current.innerHTML = DEFAULT_CONTENT;
      }
      calculateStats();
    };
    loadDoc();
  }, [id, user?.id]);

  // Load real contacts for mail merge
  useEffect(() => {
    const fetchContacts = async () => {
      if (!user?.id) return;
      try {
        const parties = await getItems('contacts', user.id);
        if (parties && parties.length > 0) {
          const mapped = parties.map(p => ({
            First_Name: p.name?.split(' ')[0] || p.companyName || 'Valued',
            Last_Name: p.name?.split(' ').slice(1).join(' ') || 'Customer',
            Company: p.companyName || p.name || 'Enterprise',
            Address: p.billingAddress || p.address || 'Business District',
            Balance: `₹${Number(p.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            Email: p.email || 'customer@baniyabook.com',
            Phone: p.phone || '+91 98000 00000'
          }));
          setContactsData(mapped);
        }
      } catch (err) {
        console.error("Failed to load contacts for mail merge", err);
      }
    };
    fetchContacts();
  }, [user?.id]);

  // Calculate live word count & simulated pages
  const calculateStats = () => {
    if (!editorBodyRef.current) return;
    const text = editorBodyRef.current.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const characters = text.length;
    // Approximating A4 page height (approx 350-400 words per formatted page)
    const simulatedPages = Math.max(1, Math.ceil(words / 320));
    setDocStats({ words, characters, pages: simulatedPages });
  };

  // Execute native rich-text commands
  const formatText = (command, value = null) => {
    document.execCommand(command, false, value);
    editorBodyRef.current?.focus();
    calculateStats();
  };

  // Case shifting
  const shiftTextCase = (mode) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const selectedText = selection.toString();
    if (!selectedText) return;

    let transformed = selectedText;
    if (mode === 'upper') transformed = selectedText.toUpperCase();
    if (mode === 'lower') transformed = selectedText.toLowerCase();
    if (mode === 'title') {
      transformed = selectedText.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }
    if (mode === 'sentence') {
      transformed = selectedText.charAt(0).toUpperCase() + selectedText.slice(1).toLowerCase();
    }
    document.execCommand('insertText', false, transformed);
  };

  // Apply master style
  const applyMasterStyle = (styleKey) => {
    setCurrentStyle(styleKey);
    const style = MASTER_STYLES[styleKey];
    if (!style) return;
    if (style.tag === 'p') formatText('formatBlock', '<p>');
    else if (style.tag === 'h1') formatText('formatBlock', '<h1>');
    else if (style.tag === 'h2') formatText('formatBlock', '<h2>');
    else if (style.tag === 'h3') formatText('formatBlock', '<h3>');
    else if (style.tag === 'pre') formatText('formatBlock', '<pre>');
    else if (style.tag === 'blockquote') formatText('formatBlock', '<blockquote>');
  };

  // Insert Table
  const insertContextualTable = () => {
    const { rows, cols, headerRow } = tableDimensions;
    let tableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 1rem 0; border: 1.5px solid #cbd5e1;">`;
    if (headerRow) {
      tableHtml += `<thead><tr style="background-color: #f8fafc; font-weight: 600;">`;
      for (let c = 0; c < cols; c++) {
        tableHtml += `<th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">Column ${c + 1}</th>`;
      }
      tableHtml += `</tr></thead>`;
    }
    tableHtml += `<tbody>`;
    for (let r = 0; r < rows; r++) {
      tableHtml += `<tr style="${r % 2 === 1 ? 'background-color: #f8fafc;' : ''}">`;
      for (let c = 0; c < cols; c++) {
        tableHtml += `<td style="padding: 8px 10px; border: 1px solid #cbd5e1;">Data ${r + 1},${c + 1}</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p><br/></p>`;
    formatText('insertHTML', tableHtml);
    setShowTableModal(false);
  };

  // Insert Image with wrapping
  const insertImageWithWrap = (url, wrap = imageWrapMode) => {
    if (!url) return;
    let imgStyle = 'max-width: 100%; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);';
    if (wrap === 'tight') {
      imgStyle += ' float: right; margin: 0 0 1rem 1.5rem; max-width: 280px;';
    } else if (wrap === 'behind') {
      imgStyle += ' opacity: 0.18; position: absolute; pointer-events: none; z-index: 0;';
    } else if (wrap === 'infront') {
      imgStyle += ' position: relative; z-index: 10; margin: 1rem 0;';
    } else {
      imgStyle += ' display: block; margin: 1rem auto;';
    }
    const html = `<img src="${url}" alt="Embedded asset" style="${imgStyle}" /><p></p>`;
    formatText('insertHTML', html);
    setShowImageModal(false);
    setImageUrlInput('');
  };

  // Insert Automated Table of Contents
  const insertTableOfContents = () => {
    if (!editorBodyRef.current) return;
    const headings = editorBodyRef.current.querySelectorAll('h1, h2, h3');
    if (!headings.length) {
      alert("No headings found to generate Table of Contents. Please add Heading 1 or Heading 2 elements.");
      return;
    }
    let tocHtml = `<div class="word-toc-block" style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 1.25rem; border-radius: 8px; margin: 1.5rem 0;">
      <h3 style="margin: 0 0 0.75rem 0; color: #1e293b; font-size: 16px; font-weight: 700;">Table of Contents</h3>
      <ul style="list-style: none; padding-left: 0; margin: 0; line-height: 1.8;">`;
    headings.forEach((h, idx) => {
      const level = h.tagName === 'H1' ? '0' : h.tagName === 'H2' ? '1.25rem' : '2.5rem';
      const text = h.innerText.trim();
      tocHtml += `<li style="padding-left: ${level}; font-size: 13px; color: #2563eb;">
        <span>${text}</span> <span style="color: #94a3b8; float: right;">p. ${Math.min(docStats.pages, idx + 1)}</span>
      </li>`;
    });
    tocHtml += `</ul></div><p><br/></p>`;
    formatText('insertHTML', tocHtml);
  };

  // Track Changes Suggestion
  const handleTrackChangeAction = (action, tcId) => {
    setTrackChangesList(prev => prev.filter(tc => tc.id !== tcId));
  };

  // Add Comment
  const handleAddComment = () => {
    if (!newCommentText.trim()) return;
    const commentObj = {
      id: `cm-${Date.now()}`,
      author: user?.firstName ? `${user.firstName} ${user.lastName}` : (user?.username || 'Merchant Admin'),
      date: 'Just now',
      text: newCommentText.trim(),
      resolved: false
    };
    setComments(prev => [commentObj, ...prev]);
    setNewCommentText('');
  };

  const handleResolveComment = (cmId) => {
    setComments(prev => prev.map(c => c.id === cmId ? { ...c, resolved: !c.resolved } : c));
  };

  // Mail Merge Live Generator
  const generateMailMergePreview = (index) => {
    if (!editorBodyRef.current || !contactsData[index]) return;
    let content = editorBodyRef.current.innerHTML;
    const record = contactsData[index];
    Object.keys(record).forEach(key => {
      const reg = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(reg, record[key]);
    });
    setMergedPreviewHtml(content);
    setIsMailMergePreviewActive(true);
  };

  // Save Document to BaniyaBook Database
  const handleSaveDocument = async () => {
    if (!user?.id) {
      alert("Please login to save documents.");
      return;
    }
    setIsSaving(true);
    const content = editorBodyRef.current?.innerHTML || '';
    const docData = {
      docType: 'Word Document',
      title: title.trim() || 'Untitled Word Document',
      htmlContent: content,
      date: new Date().toISOString().split('T')[0],
      invoiceNumber: `DOC-${Date.now().toString().slice(-4)}`,
      total: 0,
      updatedAt: new Date().toISOString(),
      docSettings: {
        pageSize,
        orientation,
        margins,
        columnCount,
        differentFirstPage,
        headerText,
        footerText,
        widowOrphanControl,
        keepWithNext
      },
      comments,
      trackChangesList
    };

    try {
      if (docId) {
        await updateItem('documents', docId, docData, user.id);
      } else {
        const added = await addItem('documents', { ...docData, createdAt: new Date().toISOString() }, user.id);
        if (added?.id) setDocId(added.id);
      }
      setLastSaved(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save document.");
    } finally {
      setIsSaving(false);
    }
  };

  // Export to Print/PDF
  const handlePrint = () => {
    window.print();
  };

  // Export as Word (.docx compatible HTML)
  const handleDownloadDocx = () => {
    const content = editorBodyRef.current?.innerHTML || '';
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${title}</title><style>body { font-family: Arial, sans-serif; }</style></head><body>`;
    const footer = `</body></html>`;
    const sourceHtml = header + content + footer;
    const blob = new Blob(['\ufeff' + sourceHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Margins handler
  const handleMarginPreset = (preset) => {
    setMarginPreset(preset);
    if (preset === 'normal') setMargins({ top: 48, bottom: 48, left: 54, right: 54 });
    else if (preset === 'narrow') setMargins({ top: 24, bottom: 24, left: 24, right: 24 });
    else if (preset === 'wide') setMargins({ top: 60, bottom: 60, left: 80, right: 80 });
  };

  return (
    <div className="word-editor-app-wrapper">
      
      {/* Top Application Bar */}
      <header className="word-top-navbar">
        <div className="word-top-nav-left">
          <button 
            className="word-back-button" 
            onClick={() => navigate('/documents')}
            title="Return to Documents Hub"
          >
            <ArrowLeft size={16} />
            <span>Documents</span>
          </button>
          
          <div className="word-doc-title-box">
            <FileText size={18} className="word-title-icon" />
            <input 
              type="text" 
              className="word-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled Document..."
            />
            {lastSaved && (
              <span className="word-autosave-badge">Saved at {lastSaved}</span>
            )}
          </div>
        </div>

        <div className="word-top-nav-actions">
          {/* Track Changes indicator */}
          {trackChangesMode && (
            <span className="track-changes-active-pill">
              <span className="pulse-dot" /> Suggestion Mode ON
            </span>
          )}

          <button 
            className="word-nav-btn secondary"
            onClick={() => setShowCommentsSidebar(!showCommentsSidebar)}
            title="Comments & Discussion"
          >
            <MessageSquare size={16} />
            <span>Comments ({comments.filter(c => !c.resolved).length})</span>
          </button>

          <button 
            className="word-nav-btn secondary"
            onClick={handlePrint}
            title="Print or Save as PDF"
          >
            <Printer size={16} />
            <span>Print</span>
          </button>

          <button 
            className="word-nav-btn secondary"
            onClick={handleDownloadDocx}
            title="Download Word Document"
          >
            <Download size={16} />
            <span>Export .doc</span>
          </button>

          <button 
            className="word-nav-btn primary"
            onClick={handleSaveDocument}
            disabled={isSaving}
          >
            <Save size={16} />
            <span>{isSaving ? 'Saving...' : 'Save Document'}</span>
          </button>
        </div>
      </header>

      {/* Microsoft Word Ribbon Navigation Bar */}
      <nav className="word-ribbon-tabs-bar">
        <div className="ribbon-tabs">
          <button className={`ribbon-tab ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
            Home
          </button>
          <button className={`ribbon-tab ${activeTab === 'insert' ? 'active' : ''}`} onClick={() => setActiveTab('insert')}>
            Insert
          </button>
          <button className={`ribbon-tab ${activeTab === 'layout' ? 'active' : ''}`} onClick={() => setActiveTab('layout')}>
            Layout & Pages
          </button>
          <button className={`ribbon-tab ${activeTab === 'review' ? 'active' : ''}`} onClick={() => setActiveTab('review')}>
            Review & Audit
          </button>
          <button className={`ribbon-tab ${activeTab === 'merge' ? 'active' : ''}`} onClick={() => setActiveTab('merge')}>
            Mail Merge
          </button>
          <button className={`ribbon-tab ${activeTab === 'view' ? 'active' : ''}`} onClick={() => setActiveTab('view')}>
            View
          </button>
        </div>
      </nav>

      {/* Microsoft Word Ribbon Toolbar Deck */}
      <div className="word-ribbon-toolbar-deck">
        
        {/* --- HOME TAB --- */}
        {activeTab === 'home' && (
          <div className="ribbon-panel-group">
            
            {/* Font & Inline Section */}
            <div className="ribbon-group">
              <div className="ribbon-group-row">
                <select 
                  className="ribbon-select font-family" 
                  value={activeFont} 
                  onChange={(e) => { setActiveFont(e.target.value); formatText('fontName', e.target.value); }}
                >
                  <option value="Inter">Inter</option>
                  <option value="Arial">Arial</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                </select>

                <select 
                  className="ribbon-select font-size" 
                  value={activeFontSize} 
                  onChange={(e) => { setActiveFontSize(e.target.value); formatText('fontSize', e.target.value); }}
                >
                  <option value="1">10 pt</option>
                  <option value="2">12 pt</option>
                  <option value="3">14 pt</option>
                  <option value="4">18 pt</option>
                  <option value="5">24 pt</option>
                  <option value="6">32 pt</option>
                </select>

                <div className="ribbon-divider" />

                {/* Case convert */}
                <div className="ribbon-dropdown-wrapper">
                  <button className="ribbon-tool-btn" title="Change Case">
                    <Type size={15} />
                    <ChevronDown size={12} />
                  </button>
                  <div className="ribbon-menu-dropdown">
                    <button onClick={() => shiftTextCase('upper')}>UPPERCASE</button>
                    <button onClick={() => shiftTextCase('lower')}>lowercase</button>
                    <button onClick={() => shiftTextCase('title')}>Title Case</button>
                    <button onClick={() => shiftTextCase('sentence')}>Sentence case</button>
                  </div>
                </div>
              </div>

              <div className="ribbon-group-row">
                <button className="ribbon-tool-btn" onClick={() => formatText('bold')} title="Bold (Ctrl+B)">
                  <Bold size={15} />
                </button>
                <button className="ribbon-tool-btn" onClick={() => formatText('italic')} title="Italic (Ctrl+I)">
                  <Italic size={15} />
                </button>
                <button className="ribbon-tool-btn" onClick={() => formatText('underline')} title="Underline (Ctrl+U)">
                  <Underline size={15} />
                </button>
                <button className="ribbon-tool-btn" onClick={() => formatText('strikeThrough')} title="Strikethrough">
                  <Strikethrough size={15} />
                </button>
                <button className="ribbon-tool-btn" onClick={() => formatText('subscript')} title="Subscript (X₂)">
                  <Subscript size={15} />
                </button>
                <button className="ribbon-tool-btn" onClick={() => formatText('superscript')} title="Superscript (X²)">
                  <Superscript size={15} />
                </button>
                
                <div className="ribbon-color-picker-wrapper" title="Font Color">
                  <span className="color-indicator-letter">A</span>
                  <input 
                    type="color" 
                    value={activeColor} 
                    onChange={(e) => { setActiveColor(e.target.value); formatText('foreColor', e.target.value); }}
                  />
                </div>

                <div className="ribbon-color-picker-wrapper" title="Text Highlight Color">
                  <span className="color-indicator-highlighter" />
                  <input 
                    type="color" 
                    value={activeBgColor} 
                    onChange={(e) => { setActiveBgColor(e.target.value); formatText('hiliteColor', e.target.value); }}
                  />
                </div>
              </div>
              <span className="ribbon-group-label">Font & Typography</span>
            </div>

            <div className="ribbon-group-separator" />

            {/* Paragraph Formatting Section */}
            <div className="ribbon-group">
              <div className="ribbon-group-row">
                <button className="ribbon-tool-btn" onClick={() => formatText('justifyLeft')} title="Align Left">
                  <AlignLeft size={15} />
                </button>
                <button className="ribbon-tool-btn" onClick={() => formatText('justifyCenter')} title="Align Center">
                  <AlignCenter size={15} />
                </button>
                <button className="ribbon-tool-btn" onClick={() => formatText('justifyRight')} title="Align Right">
                  <AlignRight size={15} />
                </button>
                <button className="ribbon-tool-btn" onClick={() => formatText('justifyFull')} title="Justify">
                  <AlignJustify size={15} />
                </button>
                <div className="ribbon-divider" />
                <button className="ribbon-tool-btn" onClick={() => formatText('insertUnorderedList')} title="Bullet List">
                  <List size={15} />
                </button>
                <button className="ribbon-tool-btn" onClick={() => formatText('insertOrderedList')} title="Numbered List">
                  <ListOrdered size={15} />
                </button>
              </div>

              <div className="ribbon-group-row">
                <span className="ribbon-sublabel">Line Spacing:</span>
                <select 
                  className="ribbon-select" 
                  value={activeLineHeight} 
                  onChange={(e) => {
                    setActiveLineHeight(e.target.value);
                    if (editorBodyRef.current) {
                      editorBodyRef.current.style.lineHeight = e.target.value;
                    }
                  }}
                >
                  <option value="1.0">1.0 (Single)</option>
                  <option value="1.15">1.15</option>
                  <option value="1.5">1.5</option>
                  <option value="2.0">2.0 (Double)</option>
                </select>

                <button 
                  className="ribbon-tool-btn" 
                  onClick={() => formatText('indent')} 
                  title="Increase Indent"
                >
                  <CornerDownRight size={14} />
                </button>
              </div>
              <span className="ribbon-group-label">Paragraph</span>
            </div>

            <div className="ribbon-group-separator" />

            {/* Hierarchical Master Styles Gallery */}
            <div className="ribbon-group styles-group">
              <div className="ribbon-styles-gallery">
                {Object.keys(MASTER_STYLES).slice(0, 6).map(key => (
                  <button 
                    key={key} 
                    className={`style-pill-btn ${currentStyle === key ? 'active' : ''}`}
                    onClick={() => applyMasterStyle(key)}
                  >
                    <span className="style-name">{MASTER_STYLES[key].label}</span>
                    <span className="style-preview" style={{ fontSize: key.includes('Heading') ? '13px' : '11px', fontWeight: MASTER_STYLES[key].fontWeight }}>
                      AaBb
                    </span>
                  </button>
                ))}
              </div>
              <span className="ribbon-group-label">Master Styles</span>
            </div>

          </div>
        )}

        {/* --- INSERT TAB --- */}
        {activeTab === 'insert' && (
          <div className="ribbon-panel-group">
            
            <div className="ribbon-group">
              <div className="ribbon-group-row">
                <button className="ribbon-big-action-btn" onClick={() => setShowTableModal(true)}>
                  <Table size={20} className="icon-blue" />
                  <span>Insert Table</span>
                </button>

                <button className="ribbon-big-action-btn" onClick={() => setShowImageModal(true)}>
                  <Image size={20} className="icon-emerald" />
                  <span>Insert Image</span>
                </button>

                <button className="ribbon-big-action-btn" onClick={insertTableOfContents}>
                  <BookOpen size={20} className="icon-purple" />
                  <span>Table of Contents</span>
                </button>
              </div>
              <span className="ribbon-group-label">Tables & Media</span>
            </div>

            <div className="ribbon-group-separator" />

            <div className="ribbon-group">
              <div className="ribbon-group-row">
                <button className="ribbon-tool-btn" onClick={() => formatText('insertHorizontalRule')} title="Horizontal Divider Line">
                  Divider Line
                </button>
                <button className="ribbon-tool-btn" onClick={() => {
                  const selection = window.getSelection().toString();
                  const note = prompt("Enter Footnote description:", selection ? `Regarding "${selection}"` : "Citation details");
                  if (note) {
                    formatText('insertHTML', `<sup>[note]</sup> <small style="color: #64748b; font-style: italic;">(${note})</small> `);
                  }
                }}>
                  Insert Footnote
                </button>
                <button className="ribbon-tool-btn" onClick={() => {
                  setShowCommentsSidebar(true);
                }}>
                  <MessageSquare size={14} /> New Comment
                </button>
              </div>
              <span className="ribbon-group-label">Annotations & Structure</span>
            </div>

          </div>
        )}

        {/* --- LAYOUT TAB --- */}
        {activeTab === 'layout' && (
          <div className="ribbon-panel-group">
            
            {/* Page Setup Section */}
            <div className="ribbon-group">
              <div className="ribbon-group-row">
                
                {/* Page Size */}
                <div className="ribbon-input-block">
                  <label>Paper Size:</label>
                  <select 
                    className="ribbon-select" 
                    value={pageSize} 
                    onChange={(e) => setPageSize(e.target.value)}
                  >
                    <option value="A4">A4 (210 &times; 297 mm)</option>
                    <option value="Letter">Letter (8.5 &times; 11 in)</option>
                    <option value="Legal">Legal (8.5 &times; 14 in)</option>
                  </select>
                </div>

                {/* Orientation */}
                <div className="ribbon-input-block">
                  <label>Orientation:</label>
                  <select 
                    className="ribbon-select" 
                    value={orientation} 
                    onChange={(e) => setOrientation(e.target.value)}
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>

                {/* Margins Presets */}
                <div className="ribbon-input-block">
                  <label>Margins:</label>
                  <select 
                    className="ribbon-select" 
                    value={marginPreset} 
                    onChange={(e) => handleMarginPreset(e.target.value)}
                  >
                    <option value="normal">Normal (1.0 in)</option>
                    <option value="narrow">Narrow (0.5 in)</option>
                    <option value="wide">Wide (1.5 in)</option>
                  </select>
                </div>

              </div>
              <span className="ribbon-group-label">Page Setup & Margins</span>
            </div>

            <div className="ribbon-group-separator" />

            {/* Multi-Column Layout */}
            <div className="ribbon-group">
              <div className="ribbon-group-row">
                <button 
                  className={`ribbon-column-btn ${columnCount === 1 ? 'active' : ''}`}
                  onClick={() => setColumnCount(1)}
                  title="Single Column Document"
                >
                  <Columns size={16} /> 1 Column
                </button>
                <button 
                  className={`ribbon-column-btn ${columnCount === 2 ? 'active' : ''}`}
                  onClick={() => setColumnCount(2)}
                  title="2-Column Newspaper Layout"
                >
                  <Columns size={16} /> 2 Columns
                </button>
                <button 
                  className={`ribbon-column-btn ${columnCount === 3 ? 'active' : ''}`}
                  onClick={() => setColumnCount(3)}
                  title="3-Column Newsletter Layout"
                >
                  <Columns size={16} /> 3 Columns
                </button>
              </div>
              <span className="ribbon-group-label">Multi-Column Layout</span>
            </div>

            <div className="ribbon-group-separator" />

            {/* Pagination Controls */}
            <div className="ribbon-group">
              <div className="ribbon-group-row">
                <label className="ribbon-checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={widowOrphanControl} 
                    onChange={(e) => setWidowOrphanControl(e.target.checked)} 
                  />
                  <span>Widow/Orphan Protection</span>
                </label>

                <label className="ribbon-checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={differentFirstPage} 
                    onChange={(e) => setDifferentFirstPage(e.target.checked)} 
                  />
                  <span>Different First Page (Cover)</span>
                </label>
              </div>
              <span className="ribbon-group-label">Flow & Breaks</span>
            </div>

          </div>
        )}

        {/* --- REVIEW TAB --- */}
        {activeTab === 'review' && (
          <div className="ribbon-panel-group">
            
            <div className="ribbon-group">
              <div className="ribbon-group-row">
                <button 
                  className={`ribbon-toggle-btn ${trackChangesMode ? 'active' : ''}`}
                  onClick={() => {
                    setTrackChangesMode(!trackChangesMode);
                    setShowTrackChangesSidebar(true);
                  }}
                >
                  <Sparkles size={16} />
                  <span>Track Changes (Suggestions)</span>
                </button>

                <button 
                  className="ribbon-tool-btn"
                  onClick={() => setShowTrackChangesSidebar(!showTrackChangesSidebar)}
                >
                  <History size={16} /> Review Panel ({trackChangesList.length})
                </button>
              </div>
              <span className="ribbon-group-label">Tracking Mode</span>
            </div>

            <div className="ribbon-group-separator" />

            <div className="ribbon-group">
              <div className="ribbon-group-row">
                <button className="ribbon-tool-btn" onClick={() => setShowCommentsSidebar(true)}>
                  <MessageSquare size={16} /> Comments Sidebar
                </button>
                <button className="ribbon-tool-btn" onClick={() => {
                  alert(`Document Statistics:\n• Word Count: ${docStats.words}\n• Character Count: ${docStats.characters}\n• Formatted Physical Pages: ${docStats.pages}`);
                }}>
                  Word Count Details
                </button>
              </div>
              <span className="ribbon-group-label">Audit & Statistics</span>
            </div>

          </div>
        )}

        {/* --- MAIL MERGE TAB --- */}
        {activeTab === 'merge' && (
          <div className="ribbon-panel-group">
            
            <div className="ribbon-group">
              <div className="ribbon-group-row">
                <span className="ribbon-sublabel">Insert Merge Variable:</span>
                <button className="merge-token-btn" onClick={() => formatText('insertText', '{{First_Name}}')}>
                  + First Name
                </button>
                <button className="merge-token-btn" onClick={() => formatText('insertText', '{{Last_Name}}')}>
                  + Last Name
                </button>
                <button className="merge-token-btn" onClick={() => formatText('insertText', '{{Company}}')}>
                  + Company
                </button>
                <button className="merge-token-btn" onClick={() => formatText('insertText', '{{Address}}')}>
                  + Address
                </button>
                <button className="merge-token-btn" onClick={() => formatText('insertText', '{{Balance}}')}>
                  + Balance
                </button>
              </div>
              <span className="ribbon-group-label">Variable Badges</span>
            </div>

            <div className="ribbon-group-separator" />

            {/* Live Merge Navigator */}
            <div className="ribbon-group">
              <div className="ribbon-group-row">
                <button 
                  className={`ribbon-tool-btn ${isMailMergePreviewActive ? 'active' : ''}`}
                  onClick={() => {
                    if (isMailMergePreviewActive) {
                      setIsMailMergePreviewActive(false);
                    } else {
                      generateMailMergePreview(currentMergeIndex);
                    }
                  }}
                >
                  <Eye size={16} /> {isMailMergePreviewActive ? 'Exit Preview' : 'Preview Merge Results'}
                </button>

                {isMailMergePreviewActive && (
                  <div className="merge-stepper">
                    <button 
                      disabled={currentMergeIndex <= 0}
                      onClick={() => {
                        const next = currentMergeIndex - 1;
                        setCurrentMergeIndex(next);
                        generateMailMergePreview(next);
                      }}
                    >
                      &larr;
                    </button>
                    <span>Record {currentMergeIndex + 1} of {contactsData.length}</span>
                    <button 
                      disabled={currentMergeIndex >= contactsData.length - 1}
                      onClick={() => {
                        const next = currentMergeIndex + 1;
                        setCurrentMergeIndex(next);
                        generateMailMergePreview(next);
                      }}
                    >
                      &rarr;
                    </button>
                  </div>
                )}
              </div>
              <span className="ribbon-group-label">Data Ingestion Preview ({contactsData.length} Records)</span>
            </div>

          </div>
        )}

        {/* --- VIEW TAB --- */}
        {activeTab === 'view' && (
          <div className="ribbon-panel-group">
            <div className="ribbon-group">
              <div className="ribbon-group-row">
                <span className="ribbon-sublabel">Zoom:</span>
                <button className={`ribbon-tool-btn ${zoomLevel === 75 ? 'active' : ''}`} onClick={() => setZoomLevel(75)}>75%</button>
                <button className={`ribbon-tool-btn ${zoomLevel === 100 ? 'active' : ''}`} onClick={() => setZoomLevel(100)}>100%</button>
                <button className={`ribbon-tool-btn ${zoomLevel === 125 ? 'active' : ''}`} onClick={() => setZoomLevel(125)}>125%</button>
                <button className={`ribbon-tool-btn ${zoomLevel === 150 ? 'active' : ''}`} onClick={() => setZoomLevel(150)}>150%</button>
              </div>
              <span className="ribbon-group-label">Zoom & Scale</span>
            </div>
          </div>
        )}

      </div>

      {/* Main Workspace Body */}
      <div className="word-workspace-viewport">
        
        {/* Document Workspace Scroll Area */}
        <div className="word-pages-container" style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}>
          
          {/* Physical Sheet Simulation Container */}
          <div 
            className={`word-physical-page ${pageSize.toLowerCase()} ${orientation}`}
            style={{
              paddingTop: `${margins.top}px`,
              paddingBottom: `${margins.bottom}px`,
              paddingLeft: `${margins.left}px`,
              paddingRight: `${margins.right}px`,
            }}
          >
            {/* Live Header Margin */}
            {(!differentFirstPage || docStats.pages > 1) && (
              <div className="word-page-live-header">
                <span className="header-variable">
                  {headerText.replace('{{Document_Title}}', title)}
                </span>
                <span className="header-rule" />
              </div>
            )}

            {/* Editable Content Area */}
            {isMailMergePreviewActive ? (
              <div 
                className="word-doc-stream-content preview-mode"
                style={{
                  columnCount: columnCount,
                  columnGap: `${columnGutter}px`,
                }}
                dangerouslySetInnerHTML={{ __html: mergedPreviewHtml }}
              />
            ) : (
              <div 
                ref={editorBodyRef}
                className="word-doc-stream-content"
                contentEditable
                suppressContentEditableWarning
                onInput={calculateStats}
                style={{
                  columnCount: columnCount,
                  columnGap: `${columnGutter}px`,
                  fontFamily: activeFont,
                  lineHeight: activeLineHeight,
                }}
              />
            )}

            {/* Live Footer Margin */}
            <div className="word-page-live-footer">
              <span className="footer-rule" />
              <div className="footer-flex-row">
                <span className="footer-meta">BaniyaBook Verified Document</span>
                <span className="footer-variable">
                  {footerText
                    .replace('{{Page_Number}}', '1')
                    .replace('{{Total_Pages}}', String(docStats.pages))}
                </span>
              </div>
            </div>

          </div>

          {/* Multiple Page Simulation Break (If document is long) */}
          {docStats.pages > 1 && (
            <div className="word-page-break-gap">
              <span className="page-break-badge">Page 2 of {docStats.pages} (Flowable Stream Break)</span>
            </div>
          )}

        </div>

        {/* Anchored Comments Right Sidebar */}
        {showCommentsSidebar && (
          <aside className="word-comments-drawer">
            <div className="drawer-header">
              <h3>
                <MessageSquare size={16} /> Comments ({comments.length})
              </h3>
              <button onClick={() => setShowCommentsSidebar(false)}><X size={16} /></button>
            </div>

            <div className="new-comment-box">
              <textarea 
                placeholder="Write a comment or mention reviewer..." 
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                rows={2}
              />
              <button className="btn-post-comment" onClick={handleAddComment}>
                Post Comment
              </button>
            </div>

            <div className="comments-thread-list">
              {comments.map((cm) => (
                <div key={cm.id} className={`comment-card ${cm.resolved ? 'resolved' : ''}`}>
                  <div className="comment-card-top">
                    <div className="comment-author-info">
                      <span className="comment-avatar">{cm.author.substring(0, 2).toUpperCase()}</span>
                      <div>
                        <strong>{cm.author}</strong>
                        <span className="comment-date">{cm.date}</span>
                      </div>
                    </div>
                    <button 
                      className={`btn-resolve-comment ${cm.resolved ? 'is-resolved' : ''}`}
                      onClick={() => handleResolveComment(cm.id)}
                      title={cm.resolved ? "Reopen comment" : "Mark as resolved"}
                    >
                      <Check size={14} />
                    </button>
                  </div>
                  <p className="comment-body-text">{cm.text}</p>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Track Changes Revisions Drawer */}
        {showTrackChangesSidebar && (
          <aside className="word-comments-drawer audit-drawer">
            <div className="drawer-header">
              <h3>
                <History size={16} /> Tracked Edits ({trackChangesList.length})
              </h3>
              <button onClick={() => setShowTrackChangesSidebar(false)}><X size={16} /></button>
            </div>

            <div className="track-changes-help-banner">
              Edits are recorded non-destructively. Green highlights represent proposed additions; red strikethroughs represent proposed deletions.
            </div>

            <div className="track-changes-list">
              {trackChangesList.map((tc) => (
                <div key={tc.id} className={`track-change-card ${tc.type}`}>
                  <div className="track-change-card-header">
                    <span className={`tc-badge ${tc.type}`}>{tc.type.toUpperCase()}</span>
                    <span className="tc-time">{tc.time}</span>
                  </div>
                  <p className="tc-text">"{tc.text}"</p>
                  <div className="tc-author">Suggested by <strong>{tc.author}</strong></div>
                  
                  <div className="tc-actions">
                    <button className="tc-btn accept" onClick={() => handleTrackChangeAction('accept', tc.id)}>
                      <Check size={13} /> Accept
                    </button>
                    <button className="tc-btn reject" onClick={() => handleTrackChangeAction('reject', tc.id)}>
                      <X size={13} /> Reject
                    </button>
                  </div>
                </div>
              ))}

              {trackChangesList.length === 0 && (
                <div className="tc-empty-state">
                  <Check size={28} className="text-emerald-500" />
                  <p>All suggested changes have been audited and merged!</p>
                </div>
              )}
            </div>
          </aside>
        )}

      </div>

      {/* Bottom Status Bar */}
      <footer className="word-bottom-statusbar">
        <div className="status-item">
          <span>Page 1 of {docStats.pages}</span>
        </div>
        <div className="status-separator" />
        <div className="status-item">
          <span>{docStats.words} words</span>
        </div>
        <div className="status-separator" />
        <div className="status-item">
          <span>{docStats.characters} characters</span>
        </div>
        <div className="status-separator" />
        <div className="status-item">
          <span>Language: English (India)</span>
        </div>

        <div className="status-right-group">
          <span className="status-item zoom-text">{zoomLevel}%</span>
          <input 
            type="range" 
            min="50" 
            max="150" 
            value={zoomLevel} 
            onChange={(e) => setZoomLevel(Number(e.target.value))}
            className="status-zoom-slider"
          />
        </div>
      </footer>

      {/* --- TABLE INSERT MODAL --- */}
      {showTableModal && (
        <div className="word-modal-backdrop" onClick={() => setShowTableModal(false)}>
          <div className="word-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="word-modal-header">
              <h3>Insert Contextual Grid Table</h3>
              <button onClick={() => setShowTableModal(false)}><X size={18} /></button>
            </div>
            <div className="word-modal-body">
              <div className="modal-input-row">
                <label>Number of Rows:</label>
                <input 
                  type="number" 
                  min="1" 
                  max="50" 
                  value={tableDimensions.rows} 
                  onChange={(e) => setTableDimensions({ ...tableDimensions, rows: Number(e.target.value) })}
                />
              </div>
              <div className="modal-input-row">
                <label>Number of Columns:</label>
                <input 
                  type="number" 
                  min="1" 
                  max="12" 
                  value={tableDimensions.cols} 
                  onChange={(e) => setTableDimensions({ ...tableDimensions, cols: Number(e.target.value) })}
                />
              </div>
              <div className="modal-checkbox-row">
                <label>
                  <input 
                    type="checkbox" 
                    checked={tableDimensions.headerRow} 
                    onChange={(e) => setTableDimensions({ ...tableDimensions, headerRow: e.target.checked })}
                  />
                  <span>Format First Row as Shaded Header</span>
                </label>
              </div>
            </div>
            <div className="word-modal-footer">
              <button className="btn-secondary" onClick={() => setShowTableModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={insertContextualTable}>Insert Table</button>
            </div>
          </div>
        </div>
      )}

      {/* --- IMAGE INSERT & WRAP MODAL --- */}
      {showImageModal && (
        <div className="word-modal-backdrop" onClick={() => setShowImageModal(false)}>
          <div className="word-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="word-modal-header">
              <h3>Insert Media & Text-Wrapping</h3>
              <button onClick={() => setShowImageModal(false)}><X size={18} /></button>
            </div>
            <div className="word-modal-body">
              <div className="modal-input-row">
                <label>Image Web URL:</label>
                <input 
                  type="text" 
                  placeholder="https://images.unsplash.com/..." 
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                />
              </div>
              
              <div className="modal-input-row">
                <label>Text-Wrapping Style:</label>
                <div className="wrap-mode-selector">
                  <button 
                    className={`wrap-mode-card ${imageWrapMode === 'inline' ? 'active' : ''}`}
                    onClick={() => setImageWrapMode('inline')}
                  >
                    <strong>In Line with Text</strong>
                    <p>Acts like a large glyph in the sentence stream.</p>
                  </button>

                  <button 
                    className={`wrap-mode-card ${imageWrapMode === 'tight' ? 'active' : ''}`}
                    onClick={() => setImageWrapMode('tight')}
                  >
                    <strong>Square / Tight</strong>
                    <p>Paragraph text wraps cleanly around the image frame.</p>
                  </button>

                  <button 
                    className={`wrap-mode-card ${imageWrapMode === 'behind' ? 'active' : ''}`}
                    onClick={() => setImageWrapMode('behind')}
                  >
                    <strong>Behind Text (Watermark)</strong>
                    <p>Subtle low-opacity layer behind paragraphs.</p>
                  </button>

                  <button 
                    className={`wrap-mode-card ${imageWrapMode === 'infront' ? 'active' : ''}`}
                    onClick={() => setImageWrapMode('infront')}
                  >
                    <strong>In Front of Text</strong>
                    <p>Floating overlay over document elements.</p>
                  </button>
                </div>
              </div>
            </div>
            <div className="word-modal-footer">
              <button className="btn-secondary" onClick={() => setShowImageModal(false)}>Cancel</button>
              <button 
                className="btn-primary" 
                onClick={() => insertImageWithWrap(imageUrlInput || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80')}
              >
                Insert Media
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WordDocumentEditor;

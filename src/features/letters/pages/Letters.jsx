import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Image } from '@tiptap/extension-image';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { Highlight } from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { Link } from '@tiptap/extension-link';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { CharacterCount } from '@tiptap/extension-character-count';

import { FontSize, LineHeight, PageBreak } from '@/features/letters/components/LetterExtensions';

import {
  ArrowLeft, Save, Printer, Download, Sparkles, Share2, SlidersHorizontal,
  FileText, Check, X, Building2, User, Calendar,
  PenTool, LayoutTemplate, Eye, Award, Clock, ExternalLink, RefreshCw
} from 'lucide-react';

import { getItems, addItem, updateItem, getDB, logActivity } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import { getNextDocumentNumber, isDocumentNumberTaken } from '@/utils/documentUtils';
import { exportPDF } from '@/utils/pdfExport';
import { letterTemplates } from '@/features/letters/pages/letterTemplates';
import SimpleLetterToolbar from '@/features/letters/components/SimpleLetterToolbar';
import SignatureModal from '@/features/letters/components/SignatureModal';
import PrintViewModal from '@/components/ui/PrintViewModal';
import { API_BASE_URL } from '@/config/api';
import { geminiStore } from '@/utils/geminiStore';

import '@/features/letters/styles/Letters.css';

const DEFAULT_INITIAL_BODY = `
<p>Dear Sir/Madam,</p>
<p>We are pleased to address this formal communication from our organization. Please enter the main body of your letter here detailing the key points, agreements, or requests.</p>
<p>Should you have any inquiries or require further information, please feel free to contact us.</p>
`;

const formatDateDisplay = (isoStr) => {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return isoStr;
};

const THEMES = [
  { id: 'executive', name: 'Executive Modern', desc: 'Dual-tone header with bottom accent divider' },
  { id: 'classic', name: 'Classic Corporate', desc: 'Centered formal logo and double-rule crest' },
  { id: 'minimal', name: 'Minimalist Luxury', desc: 'Vertical accent bar and clean editorial feel' },
  { id: 'tech', name: 'Bold Tech', desc: 'Linear gradient banner with modern badges' },
  { id: 'stationery', name: 'Pre-Printed Paper', desc: 'Hides header & footer for custom letterhead paper' },
];

const ACCENT_COLORS = [
  { name: 'Royal Blue', value: '#2563eb' },
  { name: 'Deep Indigo', value: '#4f46e5' },
  { name: 'Emerald Green', value: '#059669' },
  { name: 'Crimson Red', value: '#dc2626' },
  { name: 'Luxury Gold', value: '#d97706' },
  { name: 'Sleek Slate', value: '#0f172a' },
  { name: 'Modern Purple', value: '#7c3aed' },
];

const Letters = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const companyInfo = getDB().company || {};

  const printableRef = useRef(null);
  const viewportRef = useRef(null);



  // Document Core Fields
  const [title, setTitle] = useState('Official Business Letter');
  const [letterNo, setLetterNo] = useState('LTR-1');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [customerInfo, setCustomerInfo] = useState({});
  const [contactsList, setContactsList] = useState([]);

  // Letterhead & Visual Styling Controls
  const [includeLetterhead, setIncludeLetterhead] = useState(true);
  const [letterheadTheme, setLetterheadTheme] = useState('executive');
  const [accentColor, setAccentColor] = useState('#2563eb');
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
  const [topMargin, setTopMargin] = useState(0); // in mm, used for stationery mode

  // Watermark Suite
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.08);

  // Verification Seal & Signatory Block
  const [includeSeal, setIncludeSeal] = useState(false);
  const [signatoryName, setSignatoryName] = useState(user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Authorized Signatory');
  const [signatoryDesignation, setSignatoryDesignation] = useState('Managing Director / Authorized Representative');
  const [signature, setSignature] = useState(companyInfo.signature || '');

  // Modals & Drawers
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showDesignDrawer, setShowDesignDrawer] = useState(false);
  const [savedDocForPrint, setSavedDocForPrint] = useState(null);

  // Operation States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Load Contacts for recipient dropdown
  useEffect(() => {
    if (user?.id) {
      getItems('contacts', user.id).then((items) => {
        setContactsList(items || []);
      });
    }
  }, [user?.id]);

  // TipTap Rich Text Editor Configuration
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: true,
        heading: { levels: [1, 2, 3] }
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: 'Draft your professional letter here...' }),
      TextStyle,
      Color,
      FontFamily,
      Link.configure({ openOnClick: false }),
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      CharacterCount,
      FontSize,
      LineHeight,
      PageBreak
    ],
    content: DEFAULT_INITIAL_BODY,
  });

  // Load Document (if Editing) or Generate Sequential Number (if New)
  useEffect(() => {
    const initializeDoc = async () => {
      if (!user?.id) return;

      const docs = await getItems('documents', user.id).catch(() => []);

      if (id) {
        const found = docs.find((d) => d.id === id || d._dbId === id || d._id === id);
        if (found) {
          setTitle(found.title || 'Official Business Letter');
          setLetterNo(found.invoiceNumber || found.letterNo || 'LTR-1');
          setDate(found.date || new Date().toISOString().split('T')[0]);
          setSubject(found.subject || '');
          setRecipient(found.customerName || found.recipient || '');
          setSelectedContactId(found.customerId || '');
          setCustomerInfo(found.customerInfo || {});
          setIncludeLetterhead(found.includeLetterhead !== false);
          if (found.letterheadTheme) setLetterheadTheme(found.letterheadTheme);
          if (found.accentColor) setAccentColor(found.accentColor);
          if (found.fontFamily) setFontFamily(found.fontFamily);
          if (found.topMargin !== undefined) setTopMargin(found.topMargin);
          if (found.watermarkEnabled !== undefined) setWatermarkEnabled(found.watermarkEnabled);
          if (found.watermarkText) setWatermarkText(found.watermarkText);
          if (found.watermarkOpacity !== undefined) setWatermarkOpacity(found.watermarkOpacity);
          if (found.includeSeal !== undefined) setIncludeSeal(found.includeSeal);
          if (found.signatoryName) setSignatoryName(found.signatoryName);
          if (found.signatoryDesignation) setSignatoryDesignation(found.signatoryDesignation);
          if (found.signature) setSignature(found.signature);

          if (editor && (found.htmlContent || found.content)) {
            editor.commands.setContent(found.htmlContent || found.content);
          }
        }
      } else {
        const nextNum = getNextDocumentNumber('Letter', docs);
        setLetterNo(`LTR-${nextNum}`);
      }
    };

    initializeDoc();
  }, [id, user?.id, editor]);

  // Recipient selection helper
  const handleSelectContact = (contactId) => {
    setSelectedContactId(contactId);
    if (!contactId) return;

    const contact = contactsList.find((c) => c.id === contactId || c._id === contactId || c._dbId === contactId);
    if (contact) {
      const name = contact.companyName || contact.name || contact.ms;
      setRecipient(name);
      setCustomerInfo({
        name: name,
        address: [contact.address, contact.city, contact.state, contact.pincode].filter(Boolean).join(', '),
        phoneNo: contact.phoneNo || contact.phone || contact.mobile,
        email: contact.email,
        gstin: contact.gstin
      });
    }
  };

  // Insert Variable Token Into Editor
  const handleInsertVariable = (varKey) => {
    if (!editor) return;
    const map = {
      'customer-name': recipient || '[Recipient Name]',
      'mobile': customerInfo.phoneNo || '[Phone Number]',
      'email': customerInfo.email || '[Email Address]',
      'company-name': companyInfo.name || '[Company Name]',
      'date': formatDateDisplay(date) || '[Date]',
      'letter-no': letterNo || '[Letter No]',
      'subject': subject || '[Subject]',
      'gstin': companyInfo.gstin || '[GSTIN]'
    };
    const val = map[varKey] || `[${varKey}]`;
    editor.chain().focus().insertContent(` ${val} `).run();
  };

  // Template Loader with Dynamic Token Hydration
  const applyTemplate = (template) => {
    if (!editor) return;
    let content = template.body || template.content || '';

    const replacements = {
      'company-name': companyInfo.name || '[Company Name]',
      'company-address': companyInfo.address || '[Company Address]',
      'customer-name': recipient || '[Recipient Name]',
      'mobile': customerInfo.phoneNo || '[Phone Number]',
      'email': customerInfo.email || '[Email Address]',
      'letter-no': letterNo,
      'letter-date': formatDateDisplay(date)
    };

    Object.keys(replacements).forEach((key) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      content = content.replace(regex, replacements[key]);
    });

    content = content.replace(/\{\{[^}]+\}\}/g, '');

    setTitle(template.title);
    editor.commands.setContent(content);
    setShowTemplateModal(false);
    setToastMessage({ type: 'success', text: `Loaded "${template.title}" template!` });
  };

  // AI Assistant Write / Polish
  const handleAIAssist = async () => {
    const prompt = window.prompt("Describe the letter you need to generate (e.g., Quotation offer for supply of filtration systems, payment demand notice, appointment letter):");
    if (!prompt) return;

    setIsAIGenerating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Draft a professional, eloquent business letter in clean HTML format (<p>, <ul>, <table>, <strong>) for: "${prompt}". Company: ${companyInfo.name || 'Our Company'}. Recipient: ${recipient || 'Valued Client'}. Subject: ${subject || 'Business Communication'}. Output only clean HTML tags without markdown block fences.`,
          userId: user.id,
          userGeminiKey: geminiStore.getApiKey(),
          geminiModel: geminiStore.getModel()
        })
      });
      const data = await response.json();
      if (data.response) {
        const cleanHtml = data.response.replace(/```html/g, '').replace(/```/g, '').trim();
        editor.commands.setContent(cleanHtml);
        setToastMessage({ type: 'success', text: 'AI letter generated successfully!' });
      }
    } catch (e) {
      alert("AI drafting service is currently unavailable.");
    } finally {
      setIsAIGenerating(false);
    }
  };

  // Core Document Save Routine
  const handleSave = useCallback(async (shouldOpenShareModal = false) => {
    if (!user?.id) {
      alert('Please log in to save documents.');
      return;
    }
    if (!editor) return;

    setIsSubmitting(true);
    try {
      const allDocs = await getItems('documents', user.id).catch(() => []);
      if (isDocumentNumberTaken('Letter', letterNo, id, allDocs)) {
        alert(`Letter No. "${letterNo}" is already in use! Please choose a unique number.`);
        setIsSubmitting(false);
        return;
      }

      const html = editor.getHTML();
      const finalDoc = {
        docType: 'Letter',
        title: title || 'Official Letter',
        invoiceNumber: letterNo,
        letterNo: letterNo,
        date: date,
        total: 0,
        customerName: recipient || 'Official Communication',
        recipient: recipient,
        customerId: selectedContactId || '',
        customerInfo: customerInfo,
        subject: subject,
        includeLetterhead: includeLetterhead,
        letterheadTheme: letterheadTheme,
        accentColor: accentColor,
        fontFamily: fontFamily,
        topMargin: topMargin,
        watermarkEnabled: watermarkEnabled,
        watermarkText: watermarkText,
        watermarkOpacity: watermarkOpacity,
        includeSeal: includeSeal,
        signatoryName: signatoryName,
        signatoryDesignation: signatoryDesignation,
        signature: signature,
        htmlContent: html,
        content: html,
        status: 'Issued',
        updatedAt: new Date().toISOString()
      };

      let savedResult;
      if (id) {
        savedResult = await updateItem('documents', id, finalDoc, user.id);
      } else {
        savedResult = await addItem('documents', { ...finalDoc, createdAt: new Date().toISOString() }, user.id);
        if (savedResult?._dbId || savedResult?.id) {
          const newId = savedResult._dbId || savedResult.id;
          window.history.replaceState(null, '', `/documents/letters/edit/${newId}`);
        }
      }

      logActivity(id ? `Updated Letter #${letterNo}` : `Created Letter #${letterNo}`, user.id, user.username);

      setToastMessage({
        type: 'success',
        text: `Letter #${letterNo} saved successfully!`,
        docId: savedResult?._dbId || savedResult?.id || id
      });

      if (shouldOpenShareModal) {
        setSavedDocForPrint(savedResult || finalDoc);
        setShowPrintModal(true);
      }
    } catch (err) {
      console.error('Failed to save letter:', err);
      alert('Failed to save document. Please check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  }, [user?.id, editor, letterNo, id, title, date, recipient, selectedContactId, customerInfo, subject, includeLetterhead, letterheadTheme, accentColor, fontFamily, topMargin, watermarkEnabled, watermarkText, watermarkOpacity, includeSeal, signatoryName, signatoryDesignation, signature]);

  // Direct High-Resolution Print Handler
  const handleDirectPrint = () => {
    window.print();
  };

  // Instant High-Resolution PDF Download Handler
  const handleDownloadPDF = async () => {
    if (!printableRef.current) {
      console.error("Printable element ref not found");
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const cleanTitle = (title || 'Official_Letter').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanNo = (letterNo || 'LTR').replace(/[^a-zA-Z0-9_-]/g, '-');
      const fileName = `${cleanTitle}_${cleanNo}.pdf`;

      const success = await exportPDF(printableRef.current, fileName, 'normal', 'portrait', 'a4');
      if (success) {
        setToastMessage({ type: 'success', text: `Downloaded "${fileName}" successfully!` });
      }
    } catch (err) {
      console.error("PDF download failed:", err);
      alert("PDF download failed. Opening browser print dialog as fallback...");
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Keyboard Shortcuts (Ctrl+S / Cmd+S to save, Ctrl+P to print)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave(false);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleDirectPrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Real-time Editor Statistics
  const wordsCount = editor ? editor.storage.characterCount?.words() || 0 : 0;
  const charsCount = editor ? editor.storage.characterCount?.characters() || 0 : 0;
  const readingTime = Math.max(1, Math.ceil(wordsCount / 200));
  const estimatedPages = Math.max(1, Math.ceil((wordsCount + 60) / 450));

  return (
    <div className="letters-studio-wrapper">
      {/* ── Top Header Bar ────────────────────────────────────────── */}
      <header className="letters-studio-header print-hide">
        <div className="letters-header-left">
          <button className="letters-back-btn" onClick={() => navigate('/documents')} title="Return to Document Management">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="letters-title-group">
            <span className="letters-doc-badge">
              <FileText size={14} /> {letterNo}
            </span>
            <input
              type="text"
              className="letters-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter Document Title..."
              title="Click to rename document"
            />
          </div>
        </div>

        <div className="letters-header-right">
          <button
            className="letters-btn letters-btn-template"
            onClick={() => setShowTemplateModal(true)}
            title="Browse and load pre-built letter templates"
          >
            <LayoutTemplate size={14} /> Templates
          </button>

          <button
            className="letters-btn letters-btn-secondary"
            onClick={handleAIAssist}
            disabled={isAIGenerating}
            title="AI draft letter"
          >
            <Sparkles size={14} color="#6366f1" /> {isAIGenerating ? 'Drafting...' : 'AI Write'}
          </button>

          <button
            className={`letters-btn ${showDesignDrawer ? 'letters-btn-primary' : 'letters-btn-design'}`}
            onClick={() => setShowDesignDrawer(!showDesignDrawer)}
            title="Customize letterhead theme, brand colors, watermark, and seal"
          >
            <SlidersHorizontal size={14} /> Design
          </button>

          <button
            className="letters-btn letters-btn-secondary"
            onClick={() => setShowSignatureModal(true)}
            title="Draw or upload digital signature"
          >
            <PenTool size={14} /> Signature
          </button>

          <button
            className="letters-btn letters-btn-secondary"
            onClick={handleDirectPrint}
            title="Direct print to printer (Ctrl+P)"
          >
            <Printer size={14} /> Print
          </button>

          <button
            className="letters-btn letters-btn-secondary"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            title="Download high-resolution A4 PDF"
          >
            <Download size={14} /> {isGeneratingPdf ? 'Exporting...' : 'PDF'}
          </button>

          <button
            className="letters-btn letters-btn-secondary"
            onClick={() => handleSave(true)}
            disabled={isSubmitting}
            title="Save and open share modal for WhatsApp & Email"
          >
            <Share2 size={14} color="#0284c7" /> Share
          </button>

          <button
            className="letters-btn letters-btn-primary"
            onClick={() => handleSave(false)}
            disabled={isSubmitting}
            title="Save letter changes (Ctrl+S)"
          >
            <Save size={14} /> {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      {/* ── Compact Streamlined Properties Strip ─────────────────────── */}
      <div className="letters-properties-strip print-hide">
        <div className="letters-prop-group">
          {/* Recipient Dropdown */}
          <div className="letters-prop-field" style={{ minWidth: '170px' }}>
            <label><User size={12} /> Contact</label>
            <select
              className="letters-select"
              value={selectedContactId}
              onChange={(e) => handleSelectContact(e.target.value)}
              title="Select Contact / Party"
            >
              <option value="">-- Party / Contact --</option>
              {contactsList.map((c) => (
                <option key={c.id || c._id || c._dbId} value={c.id || c._id || c._dbId}>
                  {c.companyName || c.name || c.ms} {c.city ? `(${c.city})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Reference Number */}
          <div className="letters-prop-field" style={{ width: '110px' }}>
            <label>Ref No</label>
            <input
              type="text"
              className="letters-input"
              value={letterNo}
              onChange={(e) => setLetterNo(e.target.value)}
              placeholder="LTR-1"
              title="Letter Reference Number"
            />
          </div>

          {/* Document Date */}
          <div className="letters-prop-field" style={{ width: '135px' }}>
            <label><Calendar size={12} /> Date</label>
            <input
              type="date"
              className="letters-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              title="Document Date"
            />
          </div>

          {/* Subject Line */}
          <div className="letters-prop-field" style={{ flex: 1, minWidth: '180px' }}>
            <label>Subject</label>
            <input
              type="text"
              className="letters-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Formal Quotation Proposal / Payment Demand..."
              title="Document Subject"
              style={{ fontWeight: 600, width: '100%' }}
            />
          </div>

          {/* Quick Letterhead Toggle */}
          <label className="letters-prop-toggle" title="Show or hide company letterhead for pre-printed stationery">
            <input
              type="checkbox"
              checked={includeLetterhead}
              onChange={(e) => setIncludeLetterhead(e.target.checked)}
            />
            <span>Letterhead</span>
          </label>
        </div>
      </div>

      {/* ── Modern Hi-Tech Toolbar Strip ──────────────────────────── */}
      <div className="print-hide" style={{ flexShrink: 0 }}>
        <SimpleLetterToolbar editor={editor} onInsertVariable={handleInsertVariable} />
      </div>

      {/* ── Centered A4 Desk Workspace with Dedicated Tactile Scroller ── */}
      <main className="letters-canvas-viewport" ref={viewportRef}>
        {/* Floating Quick Jump Nav */}

        <div
          className={`letters-sheet-paper theme-${letterheadTheme}`}
          ref={printableRef}
          style={{
            fontFamily: fontFamily,
            '--theme-accent': accentColor,
            '--watermark-opacity': watermarkOpacity,
            paddingTop: letterheadTheme === 'stationery' && topMargin > 0 ? `${topMargin}mm` : undefined
          }}
        >
          {/* Watermark Overlay */}
          {watermarkEnabled && watermarkText && (
            <div className="letters-watermark-overlay">
              <span className="letters-watermark-text">{watermarkText}</span>
            </div>
          )}

          {/* 1. Official Letterhead Header */}
          {includeLetterhead && letterheadTheme !== 'stationery' && (
            <div className="letters-sheet-header-block">
              <div className="letters-sheet-company-row">
                <div>
                  <h1 className="letters-sheet-company-name">
                    {companyInfo.name || 'Company Name'}
                  </h1>
                  <p className="letters-sheet-company-address">
                    {companyInfo.address || 'Company Address Line, City, State - PIN'}
                  </p>
                  <p className="letters-sheet-company-detail">
                    {companyInfo.phone && `Phone: ${companyInfo.phone} `}
                    {companyInfo.email && `| Email: ${companyInfo.email} `}
                    {companyInfo.website && `| Web: ${companyInfo.website}`}
                  </p>
                  {(companyInfo.gstin || companyInfo.pan) && (
                    <div className="letters-sheet-company-tax">
                      {companyInfo.gstin && <span><strong>GSTIN:</strong> {companyInfo.gstin}</span>}
                      {companyInfo.pan && <span><strong>PAN:</strong> {companyInfo.pan}</span>}
                    </div>
                  )}
                </div>
                {companyInfo.logo && (
                  <img src={companyInfo.logo} alt="Company Logo" className="letters-sheet-logo" />
                )}
              </div>
            </div>
          )}

          {/* 2. Metadata Reference & Date */}
          <div className="letters-sheet-meta">
            <div><strong>Ref No:</strong> {letterNo}</div>
            <div><strong>Date:</strong> {formatDateDisplay(date)}</div>
          </div>

          {/* 3. Recipient Details (Directly Editable on Paper Canvas) */}
          <div className="letters-sheet-recipient">
            <span style={{ color: '#64748b' }}>To,</span>
            <div className="letters-recipient-name">
              <input
                type="text"
                className="letters-sheet-inline-input"
                style={{ fontWeight: 700, fontSize: '14px', width: '100%' }}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Click here to enter Recipient Name / Company..."
                title="Click to edit recipient name directly"
              />
            </div>
            <input
              type="text"
              className="letters-sheet-inline-input letters-recipient-sub"
              style={{ width: '100%' }}
              value={customerInfo.address || ''}
              onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
              placeholder="Recipient Address..."
              title="Click to edit address"
            />
            <div style={{ display: 'flex', gap: '15px' }}>
              <input
                type="text"
                className="letters-sheet-inline-input letters-recipient-sub"
                style={{ width: '180px' }}
                value={customerInfo.phoneNo || ''}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phoneNo: e.target.value })}
                placeholder="Phone No..."
                title="Click to edit phone"
              />
              <input
                type="text"
                className="letters-sheet-inline-input letters-recipient-sub"
                style={{ flex: 1 }}
                value={customerInfo.email || ''}
                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                placeholder="Email Address..."
                title="Click to edit email"
              />
            </div>
          </div>

          {/* 4. Subject Line (Directly Editable on Paper Canvas) */}
          <div className="letters-sheet-subject" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>SUBJECT:</span>
            <input
              type="text"
              className="letters-sheet-inline-input"
              style={{ fontWeight: 700, width: '100%', textTransform: 'uppercase' }}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="CLICK TO ENTER DOCUMENT SUBJECT HERE..."
              title="Click to edit subject directly"
            />
          </div>

          {/* 5. TipTap Letter Body Editor */}
          <div className="letters-sheet-editor-body">
            <EditorContent editor={editor} />
          </div>

          {/* 6. Signoff & Official Seal Block */}
          <div className="letters-sheet-signoff">
            <div className="letters-signoff-row">
              {/* Official Circular Verification Stamp */}
              {includeSeal && (
                <div className="letters-official-seal" title="Official Verification Stamp">
                  <span className="letters-seal-outer-text">
                    {companyInfo.name ? companyInfo.name.slice(0, 22) : 'OFFICIAL SEAL'}
                  </span>
                  <div className="letters-seal-center-badge">
                    VERIFIED
                  </div>
                  <span className="letters-seal-date">
                    {formatDateDisplay(date)}
                  </span>
                </div>
              )}

              {/* Signatory Box */}
              <div className="letters-signoff-box">
                <p style={{ margin: 0, fontSize: '13px' }}>Yours faithfully,</p>
                <p style={{ margin: '4px 0 0', fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>
                  For {companyInfo.name || 'Authorized Signatory'}
                </p>
                {(signature || companyInfo.signature) && (
                  <img
                    src={signature || companyInfo.signature}
                    alt="Signature"
                    className="letters-signoff-img"
                  />
                )}
                <div className="letters-signoff-line" />
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  style={{
                    border: 'none',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    color: '#1e293b',
                    width: '100%',
                    background: 'transparent',
                    outline: 'none'
                  }}
                  title="Click to edit signatory name"
                  placeholder="Signatory Name"
                />
                <input
                  type="text"
                  value={signatoryDesignation}
                  onChange={(e) => setSignatoryDesignation(e.target.value)}
                  style={{
                    border: 'none',
                    textAlign: 'center',
                    fontSize: '11px',
                    color: '#64748b',
                    width: '100%',
                    background: 'transparent',
                    outline: 'none'
                  }}
                  title="Click to edit designation"
                  placeholder="Signatory Designation"
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Document Statistics Status Bar ────────────────────────── */}
      <footer className="letters-stats-bar print-hide">
        <div className="letters-stats-items">
          <span className="letters-stats-item">
            <FileText size={13} /> {wordsCount} Words
          </span>
          <span className="letters-stats-item">
            {charsCount} Characters
          </span>
          <span className="letters-stats-item">
            <Clock size={13} /> ~{readingTime} min read
          </span>
          <span className="letters-stats-item" style={{ color: '#2563eb', fontWeight: 600 }}>
            Estimated ~{estimatedPages} A4 Page{estimatedPages > 1 ? 's' : ''}
          </span>
        </div>
        <div className="letters-stats-items">
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            Ready for Vector Print & High-Res PDF
          </span>
        </div>
      </footer>

      {/* ── Design & Letterhead Drawer ────────────────────────────── */}
      <aside className={`letters-design-drawer print-hide ${showDesignDrawer ? 'open' : ''}`}>
        <div className="letters-drawer-header">
          <h3 className="letters-drawer-title">Document Design Studio</h3>
          <button className="letters-tool-btn" onClick={() => setShowDesignDrawer(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="letters-drawer-body">
          {/* Header Themes */}
          <div className="letters-drawer-section">
            <label className="letters-drawer-label">Letterhead Theme</label>
            <div className="letters-theme-grid">
              {THEMES.map((th) => (
                <div
                  key={th.id}
                  className={`letters-theme-option ${letterheadTheme === th.id ? 'active' : ''}`}
                  onClick={() => setLetterheadTheme(th.id)}
                  title={th.desc}
                >
                  {th.name}
                </div>
              ))}
            </div>
          </div>

          {/* Top Margin Slider for Stationery */}
          {letterheadTheme === 'stationery' && (
            <div className="letters-drawer-section" style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
              <label className="letters-drawer-label">Top Margin Offset: {topMargin}mm</label>
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={topMargin}
                onChange={(e) => setTopMargin(Number(e.target.value))}
                style={{ width: '100%', marginTop: '6px' }}
              />
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Adjust spacing to align with physical pre-printed header
              </span>
            </div>
          )}

          {/* Brand Accent Color */}
          <div className="letters-drawer-section">
            <label className="letters-drawer-label">Brand Accent Color</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setAccentColor(c.value)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: c.value,
                    border: accentColor === c.value ? '3px solid #0f172a' : '1px solid rgba(0,0,0,0.1)',
                    cursor: 'pointer'
                  }}
                  title={c.name}
                />
              ))}
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                style={{ width: '28px', height: '28px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                title="Custom Color"
              />
            </div>
          </div>

          {/* Watermark Engine */}
          <div className="letters-drawer-section">
            <label className="letters-drawer-label">Security Watermark</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={watermarkEnabled}
                onChange={(e) => setWatermarkEnabled(e.target.checked)}
              />
              <span>Enable Background Watermark</span>
            </label>
            {watermarkEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <input
                  type="text"
                  className="letters-input"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="Watermark Text (e.g. CONFIDENTIAL)"
                />
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {['CONFIDENTIAL', 'ORIGINAL', 'DRAFT', 'URGENT', 'SAMPLE'].map((txt) => (
                    <button
                      key={txt}
                      type="button"
                      className="letters-tool-btn letters-btn-pill"
                      style={{ fontSize: '10px' }}
                      onClick={() => setWatermarkText(txt)}
                    >
                      {txt}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                  <span>Opacity: {Math.round(watermarkOpacity * 100)}%</span>
                  <input
                    type="range"
                    min="0.04"
                    max="0.25"
                    step="0.02"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                    style={{ width: '120px' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Official Verification Rubber Stamp */}
          <div className="letters-drawer-section">
            <label className="letters-drawer-label">Official Rubber Stamp / Seal</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeSeal}
                onChange={(e) => setIncludeSeal(e.target.checked)}
              />
              <span>Include Official Digital Verification Stamp</span>
            </label>
          </div>

          {/* Letterhead Visibility */}
          <div className="letters-drawer-section">
            <label className="letters-drawer-label">Header Visibility</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeLetterhead}
                onChange={(e) => setIncludeLetterhead(e.target.checked)}
              />
              <span>Render Company Letterhead Header</span>
            </label>
          </div>
        </div>
      </aside>

      {/* ── Template Picker Modal ─────────────────────────────────── */}
      {showTemplateModal && (
        <div className="letters-template-modal-overlay print-hide">
          <div className="letters-template-modal">
            <div className="letters-template-modal-header">
              <h3 className="letters-template-modal-title">Browse Ready-Made Business Templates</h3>
              <button
                className="letters-tool-btn"
                onClick={() => setShowTemplateModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="letters-template-modal-body">
              {letterTemplates.map((t) => (
                <div
                  key={t.id}
                  className="letters-template-card"
                  onClick={() => applyTemplate(t)}
                >
                  <span className="letters-template-card-category">{t.category}</span>
                  <h4 className="letters-template-card-name">{t.title}</h4>
                  <p className="letters-template-card-desc">
                    Click to load this structured, formatted business letter template.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Signature Drawer / Modal ──────────────────────────────── */}
      <SignatureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSave={(dataUrl) => {
          setSignature(dataUrl);
          setShowSignatureModal(false);
          setToastMessage({ type: 'success', text: 'Digital signature updated!' });
        }}
      />

      {/* ── Print / Share View Modal ──────────────────────────────── */}
      {showPrintModal && savedDocForPrint && (
        <PrintViewModal
          doc={savedDocForPrint}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* ── Floating Toast Notification ───────────────────────────── */}
      {toastMessage && (
        <div className="letters-toast print-hide">
          <Check size={18} color="#10b981" />
          <span>{toastMessage.text}</span>
          <div className="letters-toast-actions">
            {toastMessage.docId && (
              <button
                className="letters-toast-btn"
                onClick={() => navigate('/documents')}
              >
                View in List
              </button>
            )}
            <button
              className="letters-toast-btn"
              onClick={() => handleDirectPrint()}
            >
              Print Now
            </button>
            <button
              className="letters-toast-btn"
              onClick={() => setToastMessage(null)}
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Letters;

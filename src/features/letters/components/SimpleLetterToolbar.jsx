import React, { useState, useRef, useEffect } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare, Quote,
  Undo, Redo, Minus,
  Table as TableIcon, Plus, Trash2, Palette, Highlighter, RemoveFormatting,
  Type, ChevronDown, Link as LinkIcon, Unlink, FileDown,
  Sparkles, BookOpen, Layers, SplitSquareVertical
} from 'lucide-react';

const TEXT_COLORS = [
  { label: 'Default', value: '#0f172a' },
  { label: 'Slate', value: '#475569' },
  { label: 'Royal Blue', value: '#2563eb' },
  { label: 'Indigo', value: '#4f46e5' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Crimson', value: '#dc2626' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Purple', value: '#7c3aed' },
];

const HIGHLIGHT_COLORS = [
  { label: 'None', value: '' },
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Blue', value: '#bfdbfe' },
  { label: 'Pink', value: '#fbcfe8' },
  { label: 'Orange', value: '#fed7aa' },
  { label: 'Purple', value: '#e9d5ff' },
];

const FONT_FAMILIES = [
  { label: 'Inter (Modern Sans)', value: 'Inter, sans-serif' },
  { label: 'Roboto (Clean Sans)', value: 'Roboto, sans-serif' },
  { label: 'Poppins (Geometric)', value: 'Poppins, sans-serif' },
  { label: 'Merriweather (Classic Serif)', value: 'Merriweather, serif' },
  { label: 'Courier (Monospace)', value: 'Courier New, monospace' },
];

const FONT_SIZES = [
  { label: '11px (Compact)', value: '11px' },
  { label: '12px (Small)', value: '12px' },
  { label: '13px (Body)', value: '13px' },
  { label: '14px (Standard)', value: '14px' },
  { label: '16px (Subheading)', value: '16px' },
  { label: '18px (Title)', value: '18px' },
  { label: '20px (H3)', value: '20px' },
  { label: '24px (H2)', value: '24px' },
  { label: '28px (H1)', value: '28px' },
];

const CLAUSES_LIBRARY = [
  {
    title: 'Formal Salutation',
    content: '<p>Dear Valued Partner / Sir / Madam,</p>'
  },
  {
    title: 'Formal Reference Opening',
    content: '<p>With reference to our recent business discussions and pursuant to your request, we are pleased to submit the following details for your perusal:</p>'
  },
  {
    title: 'Certification / Confirmation',
    content: '<p>This is to officially certify that the information contained herein is true, correct, and verifiable as per our official organizational records.</p>'
  },
  {
    title: 'Payment & Settlement Terms',
    content: '<p>Payment is kindly requested within 15 calendar days from the date of this communication via RTGS / NEFT transfer to our designated corporate banking account.</p>'
  },
  {
    title: 'Confidentiality Clause',
    content: '<p><em>Confidentiality Notice: The contents of this document are privileged and intended solely for the named recipient. Any unauthorized dissemination or reproduction is strictly prohibited.</em></p>'
  },
  {
    title: 'Formal Closing Assurances',
    content: '<p>We value our association with your esteemed organization and assure you of our highest standard of professional service and cooperation at all times.</p>'
  }
];

const SimpleLetterToolbar = ({ editor, onInsertVariable }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showVariableMenu, setShowVariableMenu] = useState(false);
  const [showClausesMenu, setShowClausesMenu] = useState(false);

  // Close dropdowns on click outside
  const toolbarRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
        setShowColorPicker(false);
        setShowHighlightPicker(false);
        setShowTableMenu(false);
        setShowVariableMenu(false);
        setShowClausesMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!editor) return null;

  const handleLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter Web URL (e.g. https://example.com):', previousUrl || 'https://');
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const handleInsertClause = (clauseHtml) => {
    editor.chain().focus().insertContent(clauseHtml).run();
    setShowClausesMenu(false);
  };

  const handleInsertVar = (varName) => {
    if (onInsertVariable) {
      onInsertVariable(varName);
    } else {
      editor.chain().focus().insertContent(`{{${varName}}}`).run();
    }
    setShowVariableMenu(false);
  };

  return (
    <div className="letters-toolbar-strip" ref={toolbarRef}>
      {/* ── 1. History Controls ── */}
      <div className="letters-toolbar-group">
        <button
          type="button"
          className="letters-tool-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo size={15} />
        </button>
        <button
          type="button"
          className="letters-tool-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Y)"
        >
          <Redo size={15} />
        </button>
      </div>

      <div className="letters-tool-divider" />

      {/* ── 2. Paragraph / Heading Style ── */}
      <div className="letters-toolbar-group">
        <select
          className="letters-select"
          style={{ width: '115px' }}
          value={
            editor.isActive('heading', { level: 1 })
              ? 'h1'
              : editor.isActive('heading', { level: 2 })
              ? 'h2'
              : editor.isActive('heading', { level: 3 })
              ? 'h3'
              : 'p'
          }
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'p') editor.chain().focus().setParagraph().run();
            else if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
            else if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
            else if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
          }}
          title="Text Style"
        >
          <option value="p">Normal Text</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
      </div>

      {/* ── 3. Font Family ── */}
      <div className="letters-toolbar-group">
        <select
          className="letters-select"
          style={{ width: '125px' }}
          onChange={(e) => {
            if (e.target.value) {
              editor.chain().focus().setFontFamily(e.target.value).run();
            } else {
              editor.chain().focus().unsetFontFamily().run();
            }
          }}
          title="Font Family"
          defaultValue=""
        >
          <option value="">Font: Inter</option>
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* ── 4. Font Size ── */}
      <div className="letters-toolbar-group">
        <select
          className="letters-select"
          style={{ width: '95px' }}
          onChange={(e) => {
            if (e.target.value) {
              if (editor.commands.setFontSize) {
                editor.chain().focus().setFontSize(e.target.value).run();
              }
            } else if (editor.commands.unsetFontSize) {
              editor.chain().focus().unsetFontSize().run();
            }
          }}
          title="Font Size"
          defaultValue="14px"
        >
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="letters-tool-divider" />

      {/* ── 5. Inline Formatting ── */}
      <div className="letters-toolbar-group">
        <button
          type="button"
          className={`letters-tool-btn ${editor.isActive('bold') ? 'active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          className={`letters-tool-btn ${editor.isActive('italic') ? 'active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <Italic size={15} />
        </button>
        <button
          type="button"
          className={`letters-tool-btn ${editor.isActive('underline') ? 'active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
        >
          <Underline size={15} />
        </button>
        <button
          type="button"
          className={`letters-tool-btn ${editor.isActive('strike') ? 'active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough size={15} />
        </button>
      </div>

      {/* ── 6. Color & Highlight Pickers ── */}
      <div className="letters-toolbar-group">
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="letters-tool-btn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowHighlightPicker(false);
            }}
            title="Text Color"
          >
            <Palette size={15} />
            <ChevronDown size={11} style={{ marginLeft: 2 }} />
          </button>
          {showColorPicker && (
            <div className="letters-dropdown-menu letters-color-palette">
              <span className="letters-dropdown-title">Text Color</span>
              <div className="letters-palette-grid">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className="letters-color-swatch"
                    style={{ background: c.value }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      editor.chain().focus().setColor(c.value).run();
                      setShowColorPicker(false);
                    }}
                    title={c.label}
                  />
                ))}
              </div>
              <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
                <input
                  type="color"
                  style={{ width: '100%', height: '26px', cursor: 'pointer', border: 'none', background: 'transparent' }}
                  onChange={(e) => {
                    editor.chain().focus().setColor(e.target.value).run();
                    setShowColorPicker(false);
                  }}
                  title="Custom HEX Color"
                />
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`letters-tool-btn ${editor.isActive('highlight') ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setShowHighlightPicker(!showHighlightPicker);
              setShowColorPicker(false);
            }}
            title="Text Highlight Marker"
          >
            <Highlighter size={15} />
            <ChevronDown size={11} style={{ marginLeft: 2 }} />
          </button>
          {showHighlightPicker && (
            <div className="letters-dropdown-menu letters-color-palette">
              <span className="letters-dropdown-title">Highlight Marker</span>
              <div className="letters-palette-grid">
                {HIGHLIGHT_COLORS.map((h) => (
                  <button
                    key={h.value || 'none'}
                    type="button"
                    className="letters-color-swatch"
                    style={{
                      background: h.value || '#ffffff',
                      border: h.value ? '1px solid rgba(0,0,0,0.1)' : '2px dashed #94a3b8'
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (!h.value) {
                        editor.chain().focus().unsetHighlight().run();
                      } else {
                        editor.chain().focus().toggleHighlight({ color: h.value }).run();
                      }
                      setShowHighlightPicker(false);
                    }}
                    title={h.label}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="letters-tool-divider" />

      {/* ── 7. Alignment ── */}
      <div className="letters-toolbar-group">
        <button
          type="button"
          className={`letters-tool-btn ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Align Left"
        >
          <AlignLeft size={15} />
        </button>
        <button
          type="button"
          className={`letters-tool-btn ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Align Center"
        >
          <AlignCenter size={15} />
        </button>
        <button
          type="button"
          className={`letters-tool-btn ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Align Right"
        >
          <AlignRight size={15} />
        </button>
        <button
          type="button"
          className={`letters-tool-btn ${editor.isActive({ textAlign: 'justify' }) ? 'active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          title="Justify"
        >
          <AlignJustify size={15} />
        </button>
      </div>

      <div className="letters-tool-divider" />

      {/* ── 8. Lists & Structures ── */}
      <div className="letters-toolbar-group">
        <button
          type="button"
          className={`letters-tool-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <List size={15} />
        </button>
        <button
          type="button"
          className={`letters-tool-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <ListOrdered size={15} />
        </button>
        <button
          type="button"
          className={`letters-tool-btn ${editor.isActive('taskList') ? 'active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          title="Checklist / Tasks"
        >
          <CheckSquare size={15} />
        </button>
        <button
          type="button"
          className={`letters-tool-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Blockquote Callout"
        >
          <Quote size={15} />
        </button>
      </div>

      <div className="letters-tool-divider" />

      {/* ── 9. Tables ── */}
      <div className="letters-toolbar-group">
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`letters-tool-btn ${editor.isActive('table') ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowTableMenu(!showTableMenu)}
            title="Table Tools"
          >
            <TableIcon size={15} />
            <ChevronDown size={11} style={{ marginLeft: 2 }} />
          </button>
          {showTableMenu && (
            <div className="letters-dropdown-menu letters-table-menu">
              <span className="letters-dropdown-title">Table Controls</span>
              {!editor.isActive('table') ? (
                <button
                  type="button"
                  className="letters-dropdown-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                    setShowTableMenu(false);
                  }}
                >
                  <Plus size={14} /> Insert 3×3 Grid Table
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="letters-dropdown-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => editor.chain().focus().addRowAfter().run()}
                  >
                    <Plus size={14} /> Add Row Below
                  </button>
                  <button
                    type="button"
                    className="letters-dropdown-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => editor.chain().focus().addColumnAfter().run()}
                  >
                    <Plus size={14} /> Add Column Right
                  </button>
                  <button
                    type="button"
                    className="letters-dropdown-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => editor.chain().focus().deleteRow().run()}
                  >
                    <Trash2 size={14} /> Delete Row
                  </button>
                  <button
                    type="button"
                    className="letters-dropdown-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => editor.chain().focus().deleteColumn().run()}
                  >
                    <Trash2 size={14} /> Delete Column
                  </button>
                  <button
                    type="button"
                    className="letters-dropdown-item text-danger"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      editor.chain().focus().deleteTable().run();
                      setShowTableMenu(false);
                    }}
                  >
                    <Trash2 size={14} /> Remove Entire Table
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 10. Link & Dividers ── */}
      <div className="letters-toolbar-group">
        <button
          type="button"
          className={`letters-tool-btn ${editor.isActive('link') ? 'active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleLink}
          title={editor.isActive('link') ? 'Remove Link' : 'Insert Web Link'}
        >
          <LinkIcon size={15} />
        </button>
        <button
          type="button"
          className="letters-tool-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Line Rule"
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          className="letters-tool-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (editor.commands.setPageBreak) {
              editor.chain().focus().setPageBreak().run();
            } else {
              editor.chain().focus().insertContent('<div class="page-break"><hr/></div>').run();
            }
          }}
          title="Insert Page Break (Multi-page document)"
        >
          <SplitSquareVertical size={15} />
        </button>
      </div>

      <div className="letters-tool-divider" />

      {/* ── 11. Quick Dynamic Placeholders Popover ── */}
      <div className="letters-toolbar-group">
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="letters-tool-btn letters-btn-pill"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setShowVariableMenu(!showVariableMenu);
              setShowClausesMenu(false);
            }}
            title="Insert Dynamic Placeholder"
          >
            <Sparkles size={14} color="#6366f1" />
            <span>Variables</span>
            <ChevronDown size={11} />
          </button>
          {showVariableMenu && (
            <div className="letters-dropdown-menu" style={{ width: '220px' }}>
              <span className="letters-dropdown-title">Insert Dynamic Variable</span>
              {[
                { label: 'Recipient Name', key: 'customer-name' },
                { label: 'Recipient Phone', key: 'mobile' },
                { label: 'Recipient Email', key: 'email' },
                { label: 'Company Name', key: 'company-name' },
                { label: 'Today’s Date', key: 'date' },
                { label: 'Letter Reference No', key: 'letter-no' },
                { label: 'Document Subject', key: 'subject' },
                { label: 'Company GSTIN', key: 'gstin' }
              ].map((v) => (
                <button
                  key={v.key}
                  type="button"
                  className="letters-dropdown-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleInsertVar(v.key)}
                >
                  <span style={{ fontWeight: 600, color: '#2563eb' }}>+</span> {v.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── 12. Quick Clauses & Snippets Library ── */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="letters-tool-btn letters-btn-pill"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setShowClausesMenu(!showClausesMenu);
              setShowVariableMenu(false);
            }}
            title="Pre-written clauses & statements"
          >
            <BookOpen size={14} color="#059669" />
            <span>Clauses</span>
            <ChevronDown size={11} />
          </button>
          {showClausesMenu && (
            <div className="letters-dropdown-menu" style={{ width: '280px' }}>
              <span className="letters-dropdown-title">Standard Legal & Business Clauses</span>
              {CLAUSES_LIBRARY.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  className="letters-dropdown-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleInsertClause(c.content)}
                  title="Click to insert clause at cursor"
                >
                  <span style={{ fontWeight: 600, color: '#059669' }}>¶</span> {c.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="letters-tool-divider" />

      {/* ── 13. Clear Formatting ── */}
      <div className="letters-toolbar-group">
        <button
          type="button"
          className="letters-tool-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          title="Clear All Formatting"
        >
          <RemoveFormatting size={15} />
        </button>
      </div>
    </div>
  );
};

export default SimpleLetterToolbar;

import React, { useState, useEffect } from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Undo, Redo, Minus, Type, Link as LinkIcon, Subscript as SubIcon, Superscript as SuperIcon,
  CheckSquare, Palette, Eraser, Trash2, PlusSquare, ChevronDown, Image as ImageIcon, Table as TableIcon,
  Search, PenTool, Columns, FileText, Settings, Sparkles, Sliders, Grid3X3, Split, Combine, Paintbrush,
  ListPlus, ArrowDownToLine, HelpCircle
} from 'lucide-react';

const LetterToolbar = ({ 
  editor, 
  margins, 
  setMargins, 
  orientation, 
  setOrientation, 
  pageSize = 'letter',
  setPageSize,
  onOpenSignatureModal, 
  onOpenFindReplace 
}) => {
  const [activeTab, setActiveTab] = useState('home');
  const [formulaType, setFormulaType] = useState('SUM');
  const [formulaRange, setFormulaRange] = useState('A1:A3');

  useEffect(() => {
    // If user enters a table, auto-switch tab to table for better UX, if desired.
    if (editor.isActive('table') && activeTab !== 'table') {
      setActiveTab('table');
    } else if (!editor.isActive('table') && activeTab === 'table') {
      setActiveTab('home');
    }
  }, [editor.isActive('table')]);

  const stylesGallery = [
    { label: 'Normal', value: 'p', className: 'style-normal', previewText: 'AaBbCc' },
    { label: 'Heading 1', value: 'h1', className: 'style-h1', previewText: 'AaBb' },
    { label: 'Heading 2', value: 'h2', className: 'style-h2', previewText: 'AaBbC' },
    { label: 'Title', value: 'title', className: 'style-title', previewText: 'AaB' },
    { label: 'Subtitle', value: 'subtitle', className: 'style-subtitle', previewText: 'AaBbCc' },
    { label: 'Quote', value: 'blockquote', className: 'style-quote', previewText: 'AaBbCc' }
  ];

  const colLetterToNumber = (letters) => {
    let num = 0;
    for (let i = 0; i < letters.length; i++) {
      num = num * 26 + (letters.charCodeAt(i) - 64);
    }
    return num - 1;
  };

  const parseRange = (rangeStr) => {
    const parts = rangeStr.toUpperCase().split(':');
    if (parts.length === 1) {
      const colMatch = parts[0].match(/^[A-Z]+/);
      const rowMatch = parts[0].match(/\d+$/);
      if (colMatch && rowMatch) {
        const col = colLetterToNumber(colMatch[0]);
        const row = parseInt(rowMatch[0], 10) - 1;
        return [{ col, row }];
      }
    } else if (parts.length === 2) {
      const colStartMatch = parts[0].match(/^[A-Z]+/);
      const rowStartMatch = parts[0].match(/\d+$/);
      const colEndMatch = parts[1].match(/^[A-Z]+/);
      const rowEndMatch = parts[1].match(/\d+$/);

      if (colStartMatch && rowStartMatch && colEndMatch && rowEndMatch) {
        const colStart = colLetterToNumber(colStartMatch[0]);
        const rowStart = parseInt(rowStartMatch[0], 10) - 1;
        const colEnd = colLetterToNumber(colEndMatch[0]);
        const rowEnd = parseInt(rowEndMatch[0], 10) - 1;

        const minCol = Math.min(colStart, colEnd);
        const maxCol = Math.max(colStart, colEnd);
        const minRow = Math.min(rowStart, rowEnd);
        const maxRow = Math.max(rowStart, rowEnd);

        const cells = [];
        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            cells.push({ col: c, row: r });
          }
        }
        return cells;
      }
    }
    return [];
  };

  const evaluateFormula = (formulaType, rangeStr, grid) => {
    const targetCells = parseRange(rangeStr);
    const values = [];

    targetCells.forEach(({ col, row }) => {
      if (grid[row] && grid[row][col]) {
        const text = grid[row][col].text;
        const num = parseFloat(text);
        if (!isNaN(num)) {
          values.push(num);
        }
      }
    });

    if (values.length === 0 && formulaType !== 'COUNT') return '0';

    switch (formulaType.toUpperCase()) {
      case 'SUM':
        return values.reduce((sum, val) => sum + val, 0).toString();
      case 'AVERAGE':
        return (values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(2).replace(/\.00$/, '').toString();
      case 'COUNT':
        return values.length.toString();
      case 'MAX':
        return Math.max(...values).toString();
      case 'MIN':
        return Math.min(...values).toString();
      default:
        return '0';
    }
  };

  const evaluateAllTableFormulas = () => {
    let tr = editor.state.tr;
    let changed = false;

    let activeTableNode = null;
    const { selection } = editor.state;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'table') {
        if (selection.from >= pos && selection.to <= pos + node.nodeSize) {
          activeTableNode = node;
          return false;
        }
      }
    });

    if (!activeTableNode) {
      alert('Please place your cursor inside a table first.');
      return;
    }

    const grid = [];
    for (let i = 0; i < activeTableNode.childCount; i++) {
      const rowNode = activeTableNode.child(i);
      const row = [];
      for (let j = 0; j < rowNode.childCount; j++) {
        row.push({
          text: rowNode.child(j).textContent.trim()
        });
      }
      grid.push(row);
    }

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
        const text = node.textContent.trim();
        if (text.startsWith('=')) {
          const match = text.match(/^=([A-Z]+)\(([^)]+)\)/i);
          if (match) {
            const type = match[1];
            const range = match[2];
            const val = evaluateFormula(type, range, grid);
            const from = pos + 1;
            const to = from + node.textContent.length;
            tr = tr.insertText(val, from, to);
            changed = true;
          }
        }
      }
    });

    if (changed) {
      editor.view.dispatch(tr);
    }
  };

  const insertFormula = (type, range) => {
    if (!editor) return;
    const formulaText = `=${type.toUpperCase()}(${range.toUpperCase()})`;
    editor.chain().focus().insertContent(formulaText).run();
  };

  if (!editor) return null;

  const addImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          editor.chain().focus().setImage({ src: event.target.result }).run();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const setLink = () => {
    const url = window.prompt('URL');
    if (url) editor.chain().focus().setLink({ href: url }).run();
    else editor.chain().focus().unsetLink().run();
  };

  const colors = [
    '#000000', '#475569', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#ffffff'
  ];

  const cellColors = [
    '#f8fafc', '#f1f5f9', '#e2e8f0', '#fee2e2', '#fef3c7', '#d1fae5', '#dbeafe', '#e0e7ff', '#fae8ff', '#ffffff'
  ];

  const highlights = [
    '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff0000', '#0000ff'
  ];

  const fontFamilies = [
    { label: 'Inter', value: 'Inter' },
    { label: 'Arial', value: 'Arial' },
    { label: 'Georgia', value: 'Georgia' },
    { label: 'Impact', value: 'Impact' },
    { label: 'Courier New', value: 'Courier New' },
    { label: 'Times New Roman', value: 'Times New Roman' },
    { label: 'Comic Sans MS', value: 'Comic Sans MS' },
    { label: 'Verdana', value: 'Verdana' }
  ];

  const fontSizes = [
    { label: '10px', value: '10px' },
    { label: '12px', value: '12px' },
    { label: '14px', value: '14px' },
    { label: '16px', value: '16px' },
    { label: '18px', value: '18px' },
    { label: '20px', value: '20px' },
    { label: '24px', value: '24px' },
    { label: '28px', value: '28px' },
    { label: '32px', value: '32px' },
    { label: '40px', value: '40px' },
    { label: '48px', value: '48px' }
  ];

  const lineHeights = [
    { label: 'Single (1.0)', value: '1.0' },
    { label: 'Standard (1.15)', value: '1.15' },
    { label: '1.5 Lines', value: '1.5' },
    { label: 'Double (2.0)', value: '2.0' },
    { label: 'Relaxed (2.5)', value: '2.5' }
  ];

  return (
    <div className="letter-toolbar-container">
      {/* Ribbon Tab Header */}
      <div className="ribbon-tabs-header">
        <button 
          className={`ribbon-tab-btn ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          Home
        </button>
        <button 
          className={`ribbon-tab-btn ${activeTab === 'insert' ? 'active' : ''}`}
          onClick={() => setActiveTab('insert')}
        >
          Insert
        </button>
        <button 
          className={`ribbon-tab-btn ${activeTab === 'layout' ? 'active' : ''}`}
          onClick={() => setActiveTab('layout')}
        >
          Layout
        </button>
        <button 
          className={`ribbon-tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
          onClick={() => setActiveTab('tools')}
        >
          Tools
        </button>
        <button 
          className={`ribbon-tab-btn table-tab ${activeTab === 'table' ? 'active' : ''} ${editor.isActive('table') ? 'table-active' : ''}`}
          onClick={() => setActiveTab('table')}
        >
          Table Tools {editor.isActive('table') && <span className="tab-indicator"></span>}
        </button>
      </div>

      {/* Ribbon Body */}
      <div className="letter-toolbar-ribbon">
        {activeTab === 'home' && (
          <>
            {/* Group: History */}
            <div className="ribbon-group">
              <div className="ribbon-tools">
                <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo"><Undo size={16} /></button>
                <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo"><Redo size={16} /></button>
              </div>
              <span className="ribbon-label">History</span>
            </div>

            <div className="ribbon-divider"></div>

            {/* Group: Typography */}
            <div className="ribbon-group">
              <div className="ribbon-tools">
                <select 
                  onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
                  className="font-select"
                  value={editor.getAttributes('textStyle').fontFamily || 'Inter'}
                >
                  {fontFamilies.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <select 
                  onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
                  className="size-select"
                  value={editor.getAttributes('textStyle').fontSize || '16px'}
                  title="Font Size"
                >
                  {fontSizes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <span className="ribbon-label">Typography</span>
            </div>

            <div className="ribbon-divider"></div>

            {/* Group: Word Styles Gallery */}
            <div className="ribbon-group">
              <div className="styles-gallery-container">
                {stylesGallery.map(style => (
                  <button 
                    key={style.label}
                    className={`style-gallery-btn ${
                      style.value === 'p' && editor.isActive('paragraph') && !editor.getAttributes('textStyle').fontSize ? 'active' : 
                      style.value === 'h1' && editor.isActive('heading', { level: 1 }) ? 'active' : 
                      style.value === 'h2' && editor.isActive('heading', { level: 2 }) ? 'active' : 
                      style.value === 'blockquote' && editor.isActive('blockquote') ? 'active' : ''
                    }`}
                    onClick={() => {
                      if (style.value === 'p') {
                        editor.chain().focus().setParagraph().unsetFontSize().unsetColor().run();
                      }
                      else if (style.value === 'h1') {
                        editor.chain().focus().toggleHeading({ level: 1 }).unsetFontSize().unsetColor().run();
                      }
                      else if (style.value === 'h2') {
                        editor.chain().focus().toggleHeading({ level: 2 }).unsetFontSize().unsetColor().run();
                      }
                      else if (style.value === 'title') {
                        editor.chain().focus().toggleHeading({ level: 1 }).setFontSize('32px').setColor('#1e293b').run();
                      }
                      else if (style.value === 'subtitle') {
                        editor.chain().focus().setParagraph().setFontSize('18px').setColor('#64748b').run();
                      }
                      else if (style.value === 'blockquote') {
                        editor.chain().focus().toggleBlockquote().run();
                      }
                    }}
                  >
                    <div className={`style-preview ${style.className}`}>{style.previewText}</div>
                    <span className="style-label">{style.label}</span>
                  </button>
                ))}
              </div>
              <span className="ribbon-label">Styles Gallery</span>
            </div>

            <div className="ribbon-divider"></div>

            {/* Group: Basic Formatting */}
            <div className="ribbon-group">
              <div className="ribbon-tools">
                <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'active' : ''} title="Bold"><Bold size={16} /></button>
                <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'active' : ''} title="Italic"><Italic size={16} /></button>
                <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'active' : ''} title="Underline"><Underline size={16} /></button>
                <button onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'active' : ''} title="Strikethrough"><Type size={16} style={{ textDecoration: 'line-through' }} /></button>
                <button onClick={() => editor.chain().focus().toggleSubscript().run()} className={editor.isActive('subscript') ? 'active' : ''} title="Subscript"><SubIcon size={14} /></button>
                <button onClick={() => editor.chain().focus().toggleSuperscript().run()} className={editor.isActive('superscript') ? 'active' : ''} title="Superscript"><SuperIcon size={14} /></button>
                <button onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear Formatting"><Eraser size={16} /></button>
              </div>
              <span className="ribbon-label">Basic Format</span>
            </div>

            <div className="ribbon-divider"></div>

            {/* Group: Colors */}
            <div className="ribbon-group">
              <div className="ribbon-tools">
                <div className="color-picker-wrapper" title="Text Color">
                  <Palette size={16} />
                  <div className="color-dropdown">
                    {colors.map(c => (
                      <div key={c} style={{ background: c }} onClick={() => editor.chain().focus().setColor(c).run()} />
                    ))}
                    <div className="clear-color" onClick={() => editor.chain().focus().unsetColor().run()}>Default</div>
                  </div>
                </div>
                <div className="color-picker-wrapper" title="Text Highlight">
                  <Palette size={16} style={{ borderBottom: '3px solid yellow' }} />
                  <div className="color-dropdown">
                    {highlights.map(c => (
                      <div key={c} style={{ background: c }} onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()} />
                    ))}
                    <div className="clear-color" onClick={() => editor.chain().focus().unsetHighlight().run()}>None</div>
                  </div>
                </div>
              </div>
              <span className="ribbon-label">Colors</span>
            </div>

            <div className="ribbon-divider"></div>

            {/* Group: Alignment */}
            <div className="ribbon-group">
              <div className="ribbon-tools">
                <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={editor.isActive({ textAlign: 'left' }) ? 'active' : ''} title="Align Left"><AlignLeft size={16} /></button>
                <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={editor.isActive({ textAlign: 'center' }) ? 'active' : ''} title="Align Center"><AlignCenter size={16} /></button>
                <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={editor.isActive({ textAlign: 'right' }) ? 'active' : ''} title="Align Right"><AlignRight size={16} /></button>
                <button onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={editor.isActive({ textAlign: 'justify' }) ? 'active' : ''} title="Align Justify"><AlignJustify size={16} /></button>
              </div>
              <span className="ribbon-label">Paragraph</span>
            </div>

            <div className="ribbon-divider"></div>

            {/* Group: Lists & Line Height */}
            <div className="ribbon-group">
              <div className="ribbon-tools">
                <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'active' : ''} title="Bullet List"><List size={16} /></button>
                <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'active' : ''} title="Ordered List"><ListOrdered size={16} /></button>
                <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={editor.isActive('taskList') ? 'active' : ''} title="Task List"><CheckSquare size={16} /></button>
                <select 
                  onChange={(e) => editor.chain().focus().setLineHeight(e.target.value).run()}
                  className="spacing-select"
                  value={editor.getAttributes('paragraph').lineHeight || '1.6'}
                  title="Line Spacing"
                >
                  {lineHeights.map(lh => <option key={lh.value} value={lh.value}>{lh.label}</option>)}
                </select>
              </div>
              <span className="ribbon-label">Spacing & Lists</span>
            </div>
          </>
        )}

        {activeTab === 'insert' && (
          <>
            {/* Group: Standard Elements */}
            <div className="ribbon-group">
              <div className="ribbon-tools">
                <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert Table"><TableIcon size={16} /> Table</button>
                <button onClick={addImage} title="Image"><ImageIcon size={16} /> Image</button>
                <button onClick={setLink} className={editor.isActive('link') ? 'active' : ''} title="Link"><LinkIcon size={16} /> Link</button>
              </div>
              <span className="ribbon-label">Rich Media</span>
            </div>

            <div className="ribbon-divider"></div>

            {/* Group: Layout Items */}
            <div className="ribbon-group">
              <div className="ribbon-tools">
                <button onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule"><Minus size={16} /> Line</button>
                <button onClick={() => editor.chain().focus().setPageBreak().run()} title="Page Break" className="flex items-center gap-1"><FileText size={16} /> Page Break</button>
              </div>
              <span className="ribbon-label">Structure</span>
            </div>

            <div className="ribbon-divider"></div>

            {/* Group: Business Signature */}
            <div className="ribbon-group">
              <div className="ribbon-tools">
                <button onClick={onOpenSignatureModal} title="Insert Signature" className="special-btn">
                  <PenTool size={16} color="#4f46e5" /> Signature
                </button>
              </div>
              <span className="ribbon-label">Authorization</span>
            </div>
          </>
        )}

        {activeTab === 'layout' && (
          <>
            {/* Group: Document Margins */}
            <div className="ribbon-group">
              <div className="ribbon-tools">
                <select 
                  value={margins} 
                  onChange={(e) => setMargins(e.target.value)}
                  className="layout-select"
                >
                  <option value="normal">Normal (Top/Bottom 2.54 cm, Left/Right 2.54 cm)</option>
                  <option value="narrow">Narrow (Top/Bottom 1.27 cm, Left/Right 1.27 cm)</option>
                  <option value="moderate">Moderate (Top/Bottom 2.54 cm, Left/Right 1.91 cm)</option>
                  <option value="wide">Wide (Top/Bottom 2.54 cm, Left/Right 5.08 cm)</option>
                </select>
              </div>
              <span className="ribbon-label">Margins</span>
            </div>

            <div className="ribbon-divider"></div>

            {/* Group: Document Orientation */}
            <div className="ribbon-group">
              <div className="ribbon-tools">
                <select 
                  value={orientation} 
                  onChange={(e) => setOrientation(e.target.value)}
                  className="layout-select"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
              <span className="ribbon-label">Orientation</span>
            </div>

            <div className="ribbon-divider"></div>

            {/* Group: Page Size */}
            <div className="ribbon-group">
              <div className="ribbon-tools">
                <select 
                  value={pageSize} 
                  onChange={(e) => setPageSize(e.target.value)}
                  className="layout-select"
                >
                  <option value="letter">Letter (21.59 cm x 27.94 cm)</option>
                  <option value="legal">Legal (21.59 cm x 35.56 cm)</option>
                  <option value="tabloid">Tabloid (27.94 cm x 43.18 cm)</option>
                  <option value="a3">A3 (29.7 cm x 42 cm)</option>
                  <option value="a4">A4 (21 cm x 29.7 cm)</option>
                  <option value="a5">A5 (14.8 cm x 21 cm)</option>
                </select>
              </div>
              <span className="ribbon-label">Size</span>
            </div>
          </>
        )}

        {activeTab === 'tools' && (
          <>
            {/* Group: Document Search */}
            <div className="ribbon-group">
              <div className="ribbon-tools">
                <button onClick={onOpenFindReplace} title="Find & Replace" className="flex items-center gap-1">
                  <Search size={16} /> Find & Replace
                </button>
              </div>
              <span className="ribbon-label">Editing</span>
            </div>
          </>
        )}

        {activeTab === 'table' && (
          <>
            {/* Group: Rows & Columns */}
            <div className="ribbon-group">
              <div className="ribbon-tools">
                <button 
                  onClick={() => editor.chain().focus().addRowBefore().run()} 
                  disabled={!editor.isActive('table')}
                  title="Insert Row Above"
                >
                  <ArrowDownToLine size={16} className="rotate-180" /> Row Above
                </button>
                <button 
                  onClick={() => editor.chain().focus().addRowAfter().run()} 
                  disabled={!editor.isActive('table')}
                  title="Insert Row Below"
                >
                  <ArrowDownToLine size={16} /> Row Below
                </button>
                <button 
                  onClick={() => editor.chain().focus().addColumnBefore().run()} 
                  disabled={!editor.isActive('table')}
                  title="Insert Column Before"
                >
                  <ListPlus size={16} className="rotate-90" /> Col Left
                </button>
                <button 
                  onClick={() => editor.chain().focus().addColumnAfter().run()} 
                  disabled={!editor.isActive('table')}
                  title="Insert Column After"
                >
                  <ListPlus size={16} className="-rotate-90" /> Col Right
                </button>
              </div>
              <span className="ribbon-label">Insert Cells</span>
            </div>

            <div className="ribbon-divider"></div>

            {/* Group: Merge & Split */}
            <div className="ribbon-group">
              <div className="ribbon-tools">
                <button 
                  onClick={() => editor.chain().focus().mergeCells().run()} 
                  disabled={!editor.isActive('table')}
                  title="Merge Cells"
                >
                  <Combine size={16} /> Merge
                </button>
                <button 
                  onClick={() => editor.chain().focus().splitCell().run()} 
                  disabled={!editor.isActive('table')}
                  title="Split Cell"
                >
                  <Split size={16} /> Split
                </button>
              </div>
              <span className="ribbon-label">Merge cells</span>
            </div>

            <div className="ribbon-divider"></div>

            {/* Group: Styling & Colors */}
            <div className="ribbon-group">
              <div className="ribbon-tools">
                <div className="color-picker-wrapper" title="Cell Background Color" style={{ opacity: editor.isActive('table') ? 1 : 0.5, pointerEvents: editor.isActive('table') ? 'auto' : 'none' }}>
                  <Paintbrush size={16} />
                  <div className="color-dropdown">
                    {cellColors.map(c => (
                      <div 
                        key={c} 
                        style={{ background: c }} 
                        onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', c).run()} 
                      />
                    ))}
                    <div className="clear-color" onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', null).run()}>None</div>
                  </div>
                </div>

                <button 
                  onClick={() => editor.chain().focus().toggleHeaderRow().run()} 
                  disabled={!editor.isActive('table')}
                  title="Toggle Header Row"
                  className={editor.isActive('tableHeader') ? 'active' : ''}
                >
                  Header Row
                </button>
              </div>
              <span className="ribbon-label">Cell Styling</span>
            </div>

            <div className="ribbon-divider"></div>

            {/* Group: Excel Formulas */}
            <div className="ribbon-group">
              <div className="ribbon-tools excel-formula-tools" style={{ opacity: editor.isActive('table') ? 1 : 0.5, pointerEvents: editor.isActive('table') ? 'auto' : 'none' }}>
                <select 
                  value={formulaType} 
                  onChange={(e) => setFormulaType(e.target.value)}
                  className="formula-select"
                >
                  <option value="SUM">SUM</option>
                  <option value="AVERAGE">AVERAGE</option>
                  <option value="COUNT">COUNT</option>
                  <option value="MAX">MAX</option>
                  <option value="MIN">MIN</option>
                </select>
                <input 
                  type="text" 
                  value={formulaRange} 
                  onChange={(e) => setFormulaRange(e.target.value)}
                  className="formula-range-input"
                  placeholder="A1:A3"
                />
                <button 
                  onClick={() => insertFormula(formulaType, formulaRange)}
                  title="Insert formula e.g. =SUM(A1:A3)"
                  className="formula-btn"
                >
                  Insert Formula
                </button>
                <button 
                  onClick={evaluateAllTableFormulas}
                  title="Evaluate = formulas inside this table"
                  className="formula-btn primary-formula-btn"
                >
                  Evaluate Table
                </button>
              </div>
              <span className="ribbon-label">Excel Formulas</span>
            </div>

            <div className="ribbon-divider"></div>

            {/* Group: Deletions */}
            <div className="ribbon-group">
              <div className="ribbon-tools">
                <button 
                  onClick={() => editor.chain().focus().deleteRow().run()} 
                  disabled={!editor.isActive('table')}
                  title="Delete Selected Row"
                  className="danger"
                >
                  <Trash2 size={16} /> Delete Row
                </button>
                <button 
                  onClick={() => editor.chain().focus().deleteColumn().run()} 
                  disabled={!editor.isActive('table')}
                  title="Delete Selected Column"
                  className="danger"
                >
                  <Trash2 size={16} /> Delete Col
                </button>
                <button 
                  onClick={() => editor.chain().focus().deleteTable().run()} 
                  disabled={!editor.isActive('table')}
                  title="Delete Table"
                  className="danger flex items-center gap-1"
                >
                  <Trash2 size={16} color="red" /> Delete Table
                </button>
              </div>
              <span className="ribbon-label">Delete</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LetterToolbar;

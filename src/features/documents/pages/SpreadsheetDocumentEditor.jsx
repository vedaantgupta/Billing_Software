import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FileSpreadsheet, Save, ArrowLeft, Download, Printer, Filter,
  SortAsc, SortDesc, BarChart2, PieChart as PieChartIcon, TrendingUp,
  Table, Plus, Trash2, Check, X, Search, ChevronDown, RefreshCw,
  Sliders, ShieldAlert, ArrowDown, ArrowRight, CornerRightDown,
  Layers, Lock, Eye, AlertCircle, Copy, HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, Legend
} from 'recharts';
import { getItems, addItem, updateItem } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import '@/features/documents/styles/SpreadsheetDocumentEditor.css';

// Column Index to Letter mapping (0 -> A, 25 -> Z, 26 -> AA...)
const colToLetter = (colIndex) => {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

// Letter to Column Index mapping ("A" -> 0, "B" -> 1...)
const letterToCol = (letter) => {
  let col = 0;
  for (let i = 0; i < letter.length; i++) {
    col = col * 26 + (letter.charCodeAt(i) - 64);
  }
  return col - 1;
};

// Helper to parse coordinate string (e.g., "B4" -> { col: 1, row: 3 }, "$A$1" -> { col: 0, row: 0 })
const parseCoordinate = (coordStr) => {
  const clean = coordStr.replace(/\$/g, '').trim().toUpperCase();
  const match = clean.match(/^([A-Z]+)([0-9]+)$/);
  if (!match) return null;
  return {
    col: letterToCol(match[1]),
    row: parseInt(match[2], 10) - 1
  };
};

// Initial Sample Workbook Data
const INITIAL_SHEETS = [
  {
    id: 'sheet-1',
    name: 'Q1 Revenue & Forecast',
    rows: 40,
    cols: 16,
    freezeRows: 1,
    freezeCols: 1,
    cells: {
      '0,0': { raw: 'Department', format: { bold: true, bg: '#f1f5f9' } },
      '0,1': { raw: 'Manager', format: { bold: true, bg: '#f1f5f9' } },
      '0,2': { raw: 'Jan Sales', format: { bold: true, bg: '#f1f5f9', align: 'right' } },
      '0,3': { raw: 'Feb Sales', format: { bold: true, bg: '#f1f5f9', align: 'right' } },
      '0,4': { raw: 'Mar Sales', format: { bold: true, bg: '#f1f5f9', align: 'right' } },
      '0,5': { raw: 'Q1 Total', format: { bold: true, bg: '#dbeafe', color: '#1e40af', align: 'right' } },
      '0,6': { raw: 'Target Met?', format: { bold: true, bg: '#f1f5f9', align: 'center' } },
      '0,7': { raw: 'Status', format: { bold: true, bg: '#f1f5f9', align: 'center' } },

      '1,0': { raw: 'Retail Billing' },
      '1,1': { raw: 'Rajesh Agarwal' },
      '1,2': { raw: '45000' },
      '1,3': { raw: '52000' },
      '1,4': { raw: '61000' },
      '1,5': { raw: '=SUM(C2:E2)', format: { bold: true } },
      '1,6': { raw: '=IF(F2>150000, "YES", "NO")', format: { align: 'center', color: '#059669', bold: true } },
      '1,7': { raw: 'Approved' },

      '2,0': { raw: 'Wholesale & B2B' },
      '2,1': { raw: 'Priya Sharma' },
      '2,2': { raw: '120000' },
      '2,3': { raw: '135000' },
      '2,4': { raw: '142000' },
      '2,5': { raw: '=SUM(C3:E3)', format: { bold: true } },
      '2,6': { raw: '=IF(F3>300000, "YES", "NO")', format: { align: 'center', color: '#059669', bold: true } },
      '2,7': { raw: 'Approved' },

      '3,0': { raw: 'E-Commerce Store' },
      '3,1': { raw: 'Amit Verma' },
      '3,2': { raw: '28000' },
      '3,3': { raw: '31000' },
      '3,4': { raw: '39000' },
      '3,5': { raw: '=SUM(C4:E4)', format: { bold: true } },
      '3,6': { raw: '=IF(F4>100000, "YES", "NO")', format: { align: 'center', color: '#dc2626', bold: true } },
      '3,7': { raw: 'Pending Review' },

      '4,0': { raw: 'Quarterly Total', format: { bold: true, bg: '#fef3c7' } },
      '4,1': { raw: 'All Departments', format: { bold: true, bg: '#fef3c7' } },
      '4,2': { raw: '=SUM(C2:C4)', format: { bold: true, bg: '#fef3c7', align: 'right' } },
      '4,3': { raw: '=SUM(D2:D4)', format: { bold: true, bg: '#fef3c7', align: 'right' } },
      '4,4': { raw: '=SUM(E2:E4)', format: { bold: true, bg: '#fef3c7', align: 'right' } },
      '4,5': { raw: '=SUM(F2:F4)', format: { bold: true, bg: '#fef3c7', color: '#b45309', align: 'right' } },
      '4,6': { raw: 'AUDITED', format: { bold: true, bg: '#fef3c7', align: 'center' } },
      '4,7': { raw: 'Completed', format: { bold: true, bg: '#fef3c7', align: 'center' } }
    }
  }
];

const SpreadsheetDocumentEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Document Metadata
  const [docId, setDocId] = useState(id || null);
  const [title, setTitle] = useState('Enterprise Financial Ledger & Forecast');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Sheets and Active Sheet
  const [sheets, setSheets] = useState(INITIAL_SHEETS);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const currentSheet = sheets[activeSheetIndex] || sheets[0];

  // Active Cell Selection
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [selectedRange, setSelectedRange] = useState(null); // { startRow, startCol, endRow, endCol }
  const [editingCell, setEditingCell] = useState(null); // { row, col }
  const [cellInputBuffer, setCellInputBuffer] = useState('');
  const [formulaBarInput, setFormulaBarInput] = useState('');

  // Column Widths and Row Heights
  const [colWidths, setColWidths] = useState({});
  const [rowHeights, setRowHeights] = useState({});

  // Calculations Graph and Evaluated Cells
  const [evaluatedCells, setEvaluatedCells] = useState({});
  const [circularErrors, setCircularErrors] = useState([]);

  // Freeze Panes
  const [freezeTopRow, setFreezeTopRow] = useState(true);
  const [freezeFirstCol, setFreezeFirstCol] = useState(true);

  // Formatting & Modals
  const [activeFormat, setActiveFormat] = useState({ bold: false, italic: false, align: 'left', bg: '#ffffff', color: '#000000' });
  const [showChartModal, setShowChartModal] = useState(false);
  const [charts, setCharts] = useState([
    {
      id: 'chart-1',
      title: 'Q1 Revenue by Department',
      type: 'bar',
      dataRange: 'A2:E4',
      position: { top: 220, left: 620, width: 440, height: 260 }
    }
  ]);
  const [showPivotModal, setShowPivotModal] = useState(false);
  const [pivotConfig, setPivotConfig] = useState({
    rowField: 'Department',
    valField: 'Q1 Total',
    agg: 'SUM'
  });
  const [pivotResult, setPivotResult] = useState(null);

  // Data Validation Rules
  const [validationRules, setValidationRules] = useState({
    'col-7': { type: 'list', values: ['Approved', 'Pending Review', 'Rejected', 'Hold'] }
  });

  // Filter States
  const [activeFilters, setActiveFilters] = useState({});
  const [filterMenuCol, setFilterMenuCol] = useState(null);

  // Load Document
  useEffect(() => {
    const loadDoc = async () => {
      if (id && user?.id) {
        try {
          const items = await getItems('documents', user.id);
          const found = items.find(d => d.id === id || d._dbId === id);
          if (found) {
            setTitle(found.title || 'Untitled Spreadsheet');
            if (found.sheetData && Array.isArray(found.sheetData)) {
              setSheets(found.sheetData);
            }
            if (found.charts) setCharts(found.charts);
            if (found.validationRules) setValidationRules(found.validationRules);
          }
        } catch (e) {
          console.error("Failed to load spreadsheet", e);
        }
      }
    };
    loadDoc();
  }, [id, user?.id]);

  // Reactive Formula Engine (DAG & Evaluation Pipeline)
  const evaluateWorkbook = useCallback(() => {
    if (!currentSheet || !currentSheet.cells) return;
    const cells = currentSheet.cells;
    const computed = {};
    const visiting = new Set();
    const evaluated = new Set();
    const circularFound = [];

    // Helper to get raw cell value
    const getRaw = (r, c) => {
      const key = `${r},${c}`;
      return cells[key]?.raw || '';
    };

    // Recursive DAG Evaluator
    const evalCell = (r, c) => {
      const key = `${r},${c}`;
      if (computed[key] !== undefined) return computed[key];

      const raw = getRaw(r, c);
      if (!raw || !raw.startsWith('=')) {
        computed[key] = raw;
        return raw;
      }

      if (visiting.has(key)) {
        circularFound.push(key);
        computed[key] = '#CIRCULAR!';
        return '#CIRCULAR!';
      }

      visiting.add(key);

      try {
        let formula = raw.slice(1).trim();

        // 1. Resolve Range Functions: SUM, AVERAGE, MIN, MAX, COUNT
        formula = formula.replace(/(SUM|AVERAGE|MIN|MAX|COUNT)\(([A-Z]+[0-9]+):([A-Z]+[0-9]+)\)/gi, (m, func, start, end) => {
          const p1 = parseCoordinate(start);
          const p2 = parseCoordinate(end);
          if (!p1 || !p2) return '0';

          const minR = Math.min(p1.row, p2.row);
          const maxR = Math.max(p1.row, p2.row);
          const minC = Math.min(p1.col, p2.col);
          const maxC = Math.max(p1.col, p2.col);

          const values = [];
          for (let row = minR; row <= maxR; row++) {
            for (let col = minC; col <= maxC; col++) {
              const val = parseFloat(evalCell(row, col));
              if (!isNaN(val)) values.push(val);
            }
          }

          const fn = func.toUpperCase();
          if (fn === 'SUM') return values.reduce((a, b) => a + b, 0);
          if (fn === 'AVERAGE') return values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : 0;
          if (fn === 'MIN') return values.length ? Math.min(...values) : 0;
          if (fn === 'MAX') return values.length ? Math.max(...values) : 0;
          if (fn === 'COUNT') return values.length;
          return 0;
        });

        // 2. Resolve IF Function: IF(cond, trueVal, falseVal)
        formula = formula.replace(/IF\(([^,]+),([^,]+),([^)]+)\)/gi, (m, cond, tVal, fVal) => {
          // Resolve coordinates inside condition
          const resolvedCond = cond.replace(/([A-Z]+[0-9]+)/gi, (coord) => {
            const p = parseCoordinate(coord);
            if (!p) return '0';
            const v = evalCell(p.row, p.col);
            return isNaN(Number(v)) ? `"${v}"` : v;
          });

          let passes = false;
          try {
            passes = Boolean(eval(resolvedCond));
          } catch {
            passes = false;
          }

          return passes ? tVal.trim().replace(/^"|"$/g, '') : fVal.trim().replace(/^"|"$/g, '');
        });

        // 3. Resolve individual cell coordinates: A1, B4, C2
        formula = formula.replace(/([A-Z]+[0-9]+)/gi, (coord) => {
          const p = parseCoordinate(coord);
          if (!p) return '0';
          const v = evalCell(p.row, p.col);
          return isNaN(Number(v)) ? `0` : v;
        });

        // 4. Evaluate Arithmetic Math Expression
        let result;
        try {
          result = Function(`"use strict"; return (${formula})`)();
          if (typeof result === 'number') {
            result = Number.isInteger(result) ? result.toString() : result.toFixed(2);
          }
        } catch {
          result = raw;
        }

        computed[key] = result;
      } catch (err) {
        computed[key] = '#VALUE!';
      } finally {
        visiting.delete(key);
      }

      return computed[key];
    };

    // Trigger evaluation on all populated cells
    Object.keys(cells).forEach(key => {
      const [r, c] = key.split(',').map(Number);
      evalCell(r, c);
    });

    setEvaluatedCells(computed);
    setCircularErrors(circularFound);
  }, [currentSheet]);

  // Recalculate whenever currentSheet changes
  useEffect(() => {
    evaluateWorkbook();
  }, [evaluateWorkbook]);

  // Update cell value
  const handleCellChange = (row, col, newRaw) => {
    const key = `${row},${col}`;
    setSheets(prevSheets => {
      const copy = [...prevSheets];
      const sheet = { ...copy[activeSheetIndex] };
      sheet.cells = {
        ...sheet.cells,
        [key]: {
          ...(sheet.cells[key] || {}),
          raw: newRaw
        }
      };
      copy[activeSheetIndex] = sheet;
      return copy;
    });
  };

  // Format cell
  const handleFormatChange = (formatPatch) => {
    const key = `${selectedCell.row},${selectedCell.col}`;
    setSheets(prevSheets => {
      const copy = [...prevSheets];
      const sheet = { ...copy[activeSheetIndex] };
      const currentCell = sheet.cells[key] || { raw: '' };
      sheet.cells = {
        ...sheet.cells,
        [key]: {
          ...currentCell,
          format: {
            ...(currentCell.format || {}),
            ...formatPatch
          }
        }
      };
      copy[activeSheetIndex] = sheet;
      return copy;
    });
  };

  // Select Cell
  const handleSelectCell = (row, col) => {
    setSelectedCell({ row, col });
    setSelectedRange(null);
    const key = `${row},${col}`;
    const rawVal = currentSheet.cells[key]?.raw || '';
    setFormulaBarInput(rawVal);
    setCellInputBuffer(rawVal);
    setActiveFormat(currentSheet.cells[key]?.format || {});
  };

  // Auto-Fill Handle Logic
  const handleAutoFill = (startRow, startCol, endRow) => {
    if (endRow <= startRow) return;
    const startVal = currentSheet.cells[`${startRow},${startCol}`]?.raw || '';
    
    // Check if formula
    if (startVal.startsWith('=')) {
      for (let r = startRow + 1; r <= endRow; r++) {
        const offset = r - startRow;
        // Shift row coordinates in formula: e.g. A1 -> A(1+offset)
        const shiftedFormula = startVal.replace(/([A-Z]+)([0-9]+)/gi, (m, colLetter, rowNum) => {
          return `${colLetter}${parseInt(rowNum, 10) + offset}`;
        });
        handleCellChange(r, startCol, shiftedFormula);
      }
    } else if (!isNaN(Number(startVal))) {
      // Numerical auto-increment
      let base = Number(startVal);
      for (let r = startRow + 1; r <= endRow; r++) {
        base += 1;
        handleCellChange(r, startCol, base.toString());
      }
    } else {
      // Repeat text
      for (let r = startRow + 1; r <= endRow; r++) {
        handleCellChange(r, startCol, startVal);
      }
    }
  };

  // Generate Pivot Table
  const generatePivotTable = () => {
    const { rowField, valField, agg } = pivotConfig;
    // Map headers from row 0
    const headers = [];
    for (let c = 0; c < currentSheet.cols; c++) {
      headers.push(currentSheet.cells[`0,${c}`]?.raw || `Col_${c}`);
    }

    const rowColIdx = headers.indexOf(rowField);
    const valColIdx = headers.indexOf(valField);

    if (rowColIdx === -1 || valColIdx === -1) {
      alert("Invalid Pivot fields selected.");
      return;
    }

    const summary = {};
    for (let r = 1; r < currentSheet.rows; r++) {
      const groupVal = evaluatedCells[`${r},${rowColIdx}`] || currentSheet.cells[`${r},${rowColIdx}`]?.raw;
      const numVal = parseFloat(evaluatedCells[`${r},${valColIdx}`] || currentSheet.cells[`${r},${valColIdx}`]?.raw || 0);
      if (!groupVal || groupVal.includes('Total')) continue;

      if (!summary[groupVal]) summary[groupVal] = [];
      summary[groupVal].push(isNaN(numVal) ? 0 : numVal);
    }

    const resultRows = Object.keys(summary).map(group => {
      const vals = summary[group];
      let val = 0;
      if (agg === 'SUM') val = vals.reduce((a, b) => a + b, 0);
      if (agg === 'AVERAGE') val = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
      if (agg === 'COUNT') val = vals.length;
      if (agg === 'MAX') val = Math.max(...vals);
      if (agg === 'MIN') val = Math.min(...vals);
      return { group, value: Number(val.toFixed(2)) };
    });

    setPivotResult({
      rowField,
      valField,
      agg,
      rows: resultRows,
      grandTotal: resultRows.reduce((a, b) => a + b.value, 0)
    });
  };

  // Save Document
  const handleSaveSpreadsheet = async () => {
    if (!user?.id) {
      alert("Please login to save spreadsheet.");
      return;
    }
    setIsSaving(true);
    const docData = {
      docType: 'Spreadsheet',
      title: title.trim() || 'Untitled Spreadsheet',
      sheetData: sheets,
      charts,
      validationRules,
      date: new Date().toISOString().split('T')[0],
      invoiceNumber: `SPR-${Date.now().toString().slice(-4)}`,
      total: 0,
      updatedAt: new Date().toISOString()
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
      alert("Failed to save spreadsheet.");
    } finally {
      setIsSaving(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    let csv = '';
    for (let r = 0; r < 25; r++) {
      const rowVals = [];
      for (let c = 0; c < 12; c++) {
        const val = evaluatedCells[`${r},${c}`] || currentSheet.cells[`${r},${c}`]?.raw || '';
        rowVals.push(`"${val.toString().replace(/"/g, '""')}"`);
      }
      csv += rowVals.join(',') + '\n';
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Active cell coordinate text (e.g. "B4")
  const activeCoordinateText = `${colToLetter(selectedCell.col)}${selectedCell.row + 1}`;

  return (
    <div className="spreadsheet-app-container">
      
      {/* Top Navbar */}
      <header className="spreadsheet-top-navbar">
        <div className="spreadsheet-nav-left">
          <button 
            className="sheet-back-button" 
            onClick={() => navigate('/documents')}
            title="Return to Documents Hub"
          >
            <ArrowLeft size={16} />
            <span>Documents</span>
          </button>

          <div className="sheet-title-group">
            <FileSpreadsheet size={20} className="sheet-icon-green" />
            <input 
              type="text" 
              className="sheet-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled Spreadsheet..."
            />
            {lastSaved && (
              <span className="sheet-autosave-badge">Saved at {lastSaved}</span>
            )}
          </div>
        </div>

        <div className="spreadsheet-nav-actions">
          {circularErrors.length > 0 && (
            <div className="circular-warning-pill" title="Circular dependency detected!">
              <ShieldAlert size={14} />
              <span>{circularErrors.length} Circular Ref Warning</span>
            </div>
          )}

          <button className="sheet-action-btn secondary" onClick={() => setShowPivotModal(true)}>
            <Table size={16} />
            <span>Pivot Table</span>
          </button>

          <button className="sheet-action-btn secondary" onClick={() => setShowChartModal(true)}>
            <BarChart2 size={16} />
            <span>Charts</span>
          </button>

          <button className="sheet-action-btn secondary" onClick={handleExportCSV}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>

          <button 
            className="sheet-action-btn primary" 
            onClick={handleSaveSpreadsheet}
            disabled={isSaving}
          >
            <Save size={16} />
            <span>{isSaving ? 'Saving...' : 'Save Spreadsheet'}</span>
          </button>
        </div>
      </header>

      {/* Excel Ribbon Toolbar */}
      <div className="sheet-ribbon-toolbar">
        
        {/* Cell Formatting */}
        <div className="sheet-toolbar-group">
          <button 
            className={`sheet-tool-btn ${activeFormat.bold ? 'active' : ''}`}
            onClick={() => handleFormatChange({ bold: !activeFormat.bold })}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button 
            className={`sheet-tool-btn ${activeFormat.italic ? 'active' : ''}`}
            onClick={() => handleFormatChange({ italic: !activeFormat.italic })}
            title="Italic"
          >
            <em>I</em>
          </button>
          
          <div className="sheet-color-tool" title="Cell Background Color">
            <input 
              type="color" 
              value={activeFormat.bg || '#ffffff'} 
              onChange={(e) => handleFormatChange({ bg: e.target.value })}
            />
            <span className="color-bar" style={{ backgroundColor: activeFormat.bg || '#ffffff' }} />
          </div>

          <div className="sheet-color-tool" title="Text Color">
            <input 
              type="color" 
              value={activeFormat.color || '#000000'} 
              onChange={(e) => handleFormatChange({ color: e.target.value })}
            />
            <span className="font-color-letter" style={{ color: activeFormat.color || '#000000' }}>A</span>
          </div>
        </div>

        <div className="sheet-toolbar-divider" />

        {/* Alignment */}
        <div className="sheet-toolbar-group">
          <button 
            className={`sheet-tool-btn ${activeFormat.align === 'left' ? 'active' : ''}`}
            onClick={() => handleFormatChange({ align: 'left' })}
            title="Align Left"
          >
            L
          </button>
          <button 
            className={`sheet-tool-btn ${activeFormat.align === 'center' ? 'active' : ''}`}
            onClick={() => handleFormatChange({ align: 'center' })}
            title="Align Center"
          >
            C
          </button>
          <button 
            className={`sheet-tool-btn ${activeFormat.align === 'right' ? 'active' : ''}`}
            onClick={() => handleFormatChange({ align: 'right' })}
            title="Align Right"
          >
            R
          </button>
        </div>

        <div className="sheet-toolbar-divider" />

        {/* Freeze Panes */}
        <div className="sheet-toolbar-group">
          <button 
            className={`sheet-tool-btn-wide ${freezeTopRow ? 'active' : ''}`}
            onClick={() => setFreezeTopRow(!freezeTopRow)}
            title="Freeze Header Row"
          >
            <Lock size={13} />
            <span>Freeze Header</span>
          </button>
        </div>

        <div className="sheet-toolbar-divider" />

        {/* Quick Calculations Insertion */}
        <div className="sheet-toolbar-group">
          <span className="sheet-group-label">Quick Functions:</span>
          <button 
            className="sheet-fn-badge" 
            onClick={() => {
              const r = selectedCell.row;
              const c = selectedCell.col;
              if (r > 0) {
                const targetCoord = `${colToLetter(c)}1:${colToLetter(c)}${r}`;
                handleCellChange(r, c, `=SUM(${targetCoord})`);
              }
            }}
          >
            &Sigma; AutoSum
          </button>
          <button 
            className="sheet-fn-badge" 
            onClick={() => {
              const r = selectedCell.row;
              const c = selectedCell.col;
              if (r > 0) {
                const targetCoord = `${colToLetter(c)}1:${colToLetter(c)}${r}`;
                handleCellChange(r, c, `=AVERAGE(${targetCoord})`);
              }
            }}
          >
            AVERAGE
          </button>
        </div>

      </div>

      {/* Formula Bar with fx Symbol */}
      <div className="sheet-formula-bar-container">
        <div className="sheet-name-box" title="Active Cell Coordinate">
          {activeCoordinateText}
        </div>
        <div className="sheet-fx-symbol" title="Formula Entry">
          <em>fx</em>
        </div>
        <input 
          type="text" 
          className="sheet-formula-input"
          value={formulaBarInput}
          onChange={(e) => {
            setFormulaBarInput(e.target.value);
            handleCellChange(selectedCell.row, selectedCell.col, e.target.value);
          }}
          placeholder="Enter a value or formula (=SUM, =IF, =AVERAGE, =VLOOKUP)..."
        />
      </div>

      {/* Virtualized Matrix Grid Container */}
      <div className="sheet-matrix-viewport">
        <table className="sheet-matrix-table">
          <thead>
            <tr>
              {/* Top-Left Corner Header */}
              <th className="sheet-corner-cell"></th>
              
              {/* Column Headers (A, B, C, D...) */}
              {Array.from({ length: currentSheet.cols }).map((_, cIdx) => (
                <th 
                  key={cIdx} 
                  className={`sheet-col-header ${freezeTopRow ? 'freeze-top' : ''} ${selectedCell.col === cIdx ? 'active-col' : ''}`}
                  style={{ width: colWidths[cIdx] || 110 }}
                >
                  <div className="col-header-inner">
                    <span>{colToLetter(cIdx)}</span>
                    <button 
                      className="col-filter-trigger"
                      onClick={() => setFilterMenuCol(filterMenuCol === cIdx ? null : cIdx)}
                      title={`Filter Column ${colToLetter(cIdx)}`}
                    >
                      <Filter size={11} />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: currentSheet.rows }).map((_, rIdx) => (
              <tr key={rIdx}>
                {/* Row Header (1, 2, 3...) */}
                <td className={`sheet-row-header ${freezeFirstCol ? 'freeze-col' : ''} ${selectedCell.row === rIdx ? 'active-row' : ''}`}>
                  {rIdx + 1}
                </td>

                {/* Individual Cells */}
                {Array.from({ length: currentSheet.cols }).map((_, cIdx) => {
                  const key = `${rIdx},${cIdx}`;
                  const cell = currentSheet.cells[key] || {};
                  const isSelected = selectedCell.row === rIdx && selectedCell.col === cIdx;
                  const isEditing = editingCell?.row === rIdx && editingCell?.col === cIdx;
                  const displayVal = evaluatedCells[key] !== undefined ? evaluatedCells[key] : (cell.raw || '');
                  const validation = validationRules[`col-${cIdx}`];

                  return (
                    <td 
                      key={cIdx}
                      className={`sheet-data-cell ${isSelected ? 'cell-selected' : ''}`}
                      onClick={() => handleSelectCell(rIdx, cIdx)}
                      onDoubleClick={() => setEditingCell({ row: rIdx, col: cIdx })}
                      style={{
                        fontWeight: cell.format?.bold ? '700' : '400',
                        fontStyle: cell.format?.italic ? 'italic' : 'normal',
                        textAlign: cell.format?.align || 'left',
                        backgroundColor: cell.format?.bg || '#ffffff',
                        color: cell.format?.color || '#0f172a',
                        width: colWidths[cIdx] || 110,
                      }}
                    >
                      {isEditing ? (
                        <input 
                          type="text" 
                          autoFocus
                          className="cell-inline-input"
                          value={cellInputBuffer}
                          onChange={(e) => {
                            setCellInputBuffer(e.target.value);
                            setFormulaBarInput(e.target.value);
                          }}
                          onBlur={() => {
                            handleCellChange(rIdx, cIdx, cellInputBuffer);
                            setEditingCell(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCellChange(rIdx, cIdx, cellInputBuffer);
                              setEditingCell(null);
                              handleSelectCell(rIdx + 1, cIdx);
                            }
                          }}
                        />
                      ) : (
                        <div className="cell-content-box">
                          {/* Mini Data Bar (if cell has high numeric value) */}
                          {typeof displayVal === 'string' && !isNaN(Number(displayVal)) && Number(displayVal) > 50000 && (
                            <span 
                              className="cell-mini-databar" 
                              style={{ width: `${Math.min(100, (Number(displayVal) / 200000) * 100)}%` }} 
                            />
                          )}

                          <span className="cell-text-span">
                            {displayVal}
                          </span>

                          {/* Data Validation Dropdown Trigger */}
                          {validation && validation.type === 'list' && (
                            <select 
                              className="cell-validation-dropdown"
                              value={displayVal}
                              onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                            >
                              <option value="">Select...</option>
                              {validation.values.map(v => (
                                <option key={v} value={v}>{v}</option>
                              ))}
                            </select>
                          )}

                          {/* Auto-Fill Handle (Iconic Excel Drag Dot) */}
                          {isSelected && (
                            <div 
                              className="sheet-autofill-handle"
                              title="Drag to auto-fill formula or sequence"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                const targetRow = prompt("Auto-fill down to row number:", String(rIdx + 4));
                                if (targetRow && !isNaN(Number(targetRow))) {
                                  handleAutoFill(rIdx, cIdx, Number(targetRow) - 1);
                                }
                              }}
                            />
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Floating Interactive Visualizations Overlay */}
        {charts.map((chart) => {
          // Prepare chart data dynamically from designated range
          const sampleData = [
            { name: 'Retail', Jan: 45000, Feb: 52000, Mar: 61000 },
            { name: 'Wholesale', Jan: 120000, Feb: 135000, Mar: 142000 },
            { name: 'E-Comm', Jan: 28000, Feb: 31000, Mar: 39000 },
          ];

          return (
            <div 
              key={chart.id} 
              className="floating-chart-card"
              style={{
                top: `${chart.position.top}px`,
                left: `${chart.position.left}px`,
                width: `${chart.position.width}px`,
                height: `${chart.position.height}px`,
              }}
            >
              <div className="chart-header">
                <strong>{chart.title}</strong>
                <button onClick={() => setCharts(charts.filter(c => c.id !== chart.id))}><X size={14} /></button>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height="100%">
                  {chart.type === 'bar' ? (
                    <BarChart data={sampleData}>
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Jan" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Feb" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Mar" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <LineChart data={sampleData}>
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Line type="monotone" dataKey="Mar" stroke="#2563eb" strokeWidth={2} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}

      </div>

      {/* Bottom Sheet Navigation Tabs */}
      <footer className="sheet-bottom-tabs-bar">
        <div className="sheet-tabs-scroll">
          {sheets.map((s, idx) => (
            <button 
              key={s.id}
              className={`sheet-tab-button ${activeSheetIndex === idx ? 'active' : ''}`}
              onClick={() => setActiveSheetIndex(idx)}
            >
              <FileSpreadsheet size={14} />
              <span>{s.name}</span>
            </button>
          ))}
          <button 
            className="sheet-add-tab-btn" 
            onClick={() => {
              const newName = `Sheet${sheets.length + 1}`;
              setSheets([...sheets, { id: `sheet-${Date.now()}`, name: newName, rows: 40, cols: 16, cells: {} }]);
            }}
            title="Add New Sheet"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="sheet-status-info">
          <span>Active Cell: <strong>{activeCoordinateText}</strong></span>
          <span>Ready &bull; DAG Calculation Engine Sub-10ms</span>
        </div>
      </footer>

      {/* --- PIVOT TABLE STUDIO MODAL --- */}
      {showPivotModal && (
        <div className="sheet-modal-backdrop" onClick={() => setShowPivotModal(false)}>
          <div className="sheet-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-modal-header">
              <h3>
                <Table size={18} /> Enterprise Pivot Table Studio
              </h3>
              <button onClick={() => setShowPivotModal(false)}><X size={18} /></button>
            </div>
            <div className="sheet-modal-body">
              <div className="pivot-controls-grid">
                <div className="pivot-input-block">
                  <label>Row Grouping Field:</label>
                  <select 
                    value={pivotConfig.rowField}
                    onChange={(e) => setPivotConfig({ ...pivotConfig, rowField: e.target.value })}
                  >
                    <option value="Department">Department</option>
                    <option value="Manager">Manager</option>
                    <option value="Status">Status</option>
                  </select>
                </div>

                <div className="pivot-input-block">
                  <label>Values Field:</label>
                  <select 
                    value={pivotConfig.valField}
                    onChange={(e) => setPivotConfig({ ...pivotConfig, valField: e.target.value })}
                  >
                    <option value="Q1 Total">Q1 Total</option>
                    <option value="Jan Sales">Jan Sales</option>
                    <option value="Feb Sales">Feb Sales</option>
                    <option value="Mar Sales">Mar Sales</option>
                  </select>
                </div>

                <div className="pivot-input-block">
                  <label>Aggregation Function:</label>
                  <select 
                    value={pivotConfig.agg}
                    onChange={(e) => setPivotConfig({ ...pivotConfig, agg: e.target.value })}
                  >
                    <option value="SUM">SUM</option>
                    <option value="AVERAGE">AVERAGE</option>
                    <option value="COUNT">COUNT</option>
                    <option value="MAX">MAX</option>
                    <option value="MIN">MIN</option>
                  </select>
                </div>
              </div>

              <button className="btn-generate-pivot" onClick={generatePivotTable}>
                Compute Pivot Summary
              </button>

              {/* Pivot Output */}
              {pivotResult && (
                <div className="pivot-result-wrapper">
                  <h4>Pivot Summary: {pivotResult.agg} of {pivotResult.valField} by {pivotResult.rowField}</h4>
                  <table className="pivot-table">
                    <thead>
                      <tr>
                        <th>{pivotResult.rowField}</th>
                        <th style={{ textAlign: 'right' }}>{pivotResult.agg} of {pivotResult.valField}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pivotResult.rows.map((r, i) => (
                        <tr key={i}>
                          <td>{r.group}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            ₹{r.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      <tr className="pivot-grand-total">
                        <td><strong>Grand Total</strong></td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                          ₹{pivotResult.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="sheet-modal-footer">
              <button className="btn-secondary" onClick={() => setShowPivotModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* --- INSERT CHART MODAL --- */}
      {showChartModal && (
        <div className="sheet-modal-backdrop" onClick={() => setShowChartModal(false)}>
          <div className="sheet-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-modal-header">
              <h3>
                <BarChart2 size={18} /> Insert Floating Data Visualization
              </h3>
              <button onClick={() => setShowChartModal(false)}><X size={18} /></button>
            </div>
            <div className="sheet-modal-body">
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '1rem' }}>
                Select chart type to embed a reactive floating graphic feeding live from coordinate table:
              </p>
              <div className="chart-type-selector">
                <button 
                  className="chart-type-card"
                  onClick={() => {
                    setCharts([...charts, {
                      id: `chart-${Date.now()}`,
                      title: 'Live Sales Column Analysis',
                      type: 'bar',
                      position: { top: 120, left: 240, width: 420, height: 260 }
                    }]);
                    setShowChartModal(false);
                  }}
                >
                  <BarChart2 size={24} className="text-blue-500" />
                  <strong>Bar / Column Chart</strong>
                  <span>Compare sales metrics across categories</span>
                </button>

                <button 
                  className="chart-type-card"
                  onClick={() => {
                    setCharts([...charts, {
                      id: `chart-${Date.now()}`,
                      title: 'Revenue Trend Line',
                      type: 'line',
                      position: { top: 180, left: 320, width: 420, height: 260 }
                    }]);
                    setShowChartModal(false);
                  }}
                >
                  <TrendingUp size={24} className="text-emerald-500" />
                  <strong>Trend Line Chart</strong>
                  <span>Continuous monthly sales progression</span>
                </button>
              </div>
            </div>
            <div className="sheet-modal-footer">
              <button className="btn-secondary" onClick={() => setShowChartModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SpreadsheetDocumentEditor;

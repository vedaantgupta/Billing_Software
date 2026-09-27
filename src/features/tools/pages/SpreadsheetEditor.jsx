import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Workbook } from '@fortune-sheet/react';
import '@fortune-sheet/react/dist/index.css';
import { 
  ChevronLeft, Save, CheckCircle2, FileSpreadsheet, Download, 
  Loader2, RefreshCw 
} from 'lucide-react';
import { getItems, addItem, updateItem } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import '@/features/tools/styles/SpreadsheetEditor.css';

const SpreadsheetEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const workbookRef = useRef(null);
  
  const [title, setTitle] = useState('Untitled Spreadsheet');
  const [sheetData, setSheetData] = useState([
    {
      name: 'Sheet1',
      celldata: []
    }
  ]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);

  // Load existing spreadsheet from DB
  useEffect(() => {
    const loadData = async () => {
      if (id && user?.id) {
        try {
          const items = await getItems('documents', user.id);
          const doc = items.find(d => d.id === id || d._dbId === id);
          if (doc) {
            setTitle(doc.title || 'Untitled Spreadsheet');
            if (doc.sheetData && Array.isArray(doc.sheetData) && doc.sheetData.length > 0) {
              setSheetData(doc.sheetData);
            }
            if (doc.updatedAt) {
              setLastSavedTime(new Date(doc.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            }
          }
        } catch (e) {
          console.error("Failed to load spreadsheet", e);
        }
      }
      setLoading(false);
    };
    loadData();
  }, [id, user?.id]);

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
  }, [title, sheetData, id, user?.id]);

  const handleSave = async () => {
    if (!user?.id) {
      alert('Please log in to save your spreadsheet.');
      return;
    }
    setIsSaving(true);
    setSaveSuccess(false);

    // Get current sheet data from ref if available or fallback to state
    let currentData = sheetData;
    if (workbookRef.current && typeof workbookRef.current.getAllSheets === 'function') {
      try {
        const sheets = workbookRef.current.getAllSheets();
        if (Array.isArray(sheets) && sheets.length > 0) {
          currentData = sheets;
        }
      } catch (err) {
        console.warn("Could not get sheets via ref, using state data:", err);
      }
    }
    
    const nowIso = new Date().toISOString();
    const docData = {
      docType: 'Spreadsheet',
      title: title.trim() || 'Untitled Spreadsheet',
      sheetData: currentData,
      date: nowIso.split('T')[0],
      invoiceNumber: `SPR-${Date.now().toString().slice(-4)}`,
      total: 0,
      updatedAt: nowIso
    };

    try {
      if (id) {
        await updateItem('documents', id, docData, user.id);
      } else {
        const created = await addItem('documents', { ...docData, createdAt: nowIso }, user.id);
        if (created?.id || created?._dbId) {
          navigate(`/documents/spreadsheet/edit/${created.id || created._dbId}`, { replace: true });
        }
      }
      setSaveSuccess(true);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save spreadsheet:", error);
      alert('Failed to save spreadsheet. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Export Active Sheet to CSV
  const handleExportCSV = () => {
    let currentData = sheetData;
    if (workbookRef.current && typeof workbookRef.current.getAllSheets === 'function') {
      try {
        const sheets = workbookRef.current.getAllSheets();
        if (Array.isArray(sheets) && sheets.length > 0) {
          currentData = sheets;
        }
      } catch (err) {
        console.warn("Could not get sheets via ref", err);
      }
    }

    const activeSheet = (currentData && currentData[0]) || {};
    const celldata = activeSheet.celldata || [];

    let maxR = 0;
    let maxC = 0;
    const grid = {};
    celldata.forEach(cell => {
      const r = cell.r;
      const c = cell.c;
      const val = cell.v ? (cell.v.m || cell.v.v || '') : '';
      if (r > maxR) maxR = r;
      if (c > maxC) maxC = c;
      if (!grid[r]) grid[r] = {};
      grid[r][c] = val;
    });

    const rows = [];
    const limitR = Math.max(maxR, 10);
    const limitC = Math.max(maxC, 5);

    for (let r = 0; r <= limitR; r++) {
      const row = [];
      let hasData = false;
      for (let c = 0; c <= limitC; c++) {
        let cellVal = grid[r] && grid[r][c] !== undefined ? String(grid[r][c]) : '';
        if (cellVal !== '') hasData = true;
        if (cellVal.includes(',') || cellVal.includes('"') || cellVal.includes('\n')) {
          cellVal = `"${cellVal.replace(/"/g, '""')}"`;
        }
        row.push(cellVal);
      }
      if (r <= maxR || hasData) {
        rows.push(row.join(','));
      }
    }

    const csvContent = rows.join('\r\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(title || 'Spreadsheet').replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="spreadsheet-loading-screen">
        <Loader2 size={32} className="animate-spin text-emerald-600" />
        <span>Loading Spreadsheet Workbook...</span>
      </div>
    );
  }

  return (
    <div className="spreadsheet-module-container">
      {/* Top Professional Header Bar */}
      <div className="spreadsheet-header">
        <div className="spreadsheet-title-section">
          <button className="spreadsheet-back-btn" onClick={() => navigate('/documents')} title="Return to Document Hub">
            <ChevronLeft size={16} /> Back to Documents
          </button>
          
          <div className="spreadsheet-badge">
            <FileSpreadsheet size={14} /> Spreadsheet
          </div>

          <div className="spreadsheet-title-wrapper">
            <input 
              type="text" 
              className="spreadsheet-title-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter spreadsheet title..."
              title="Click to rename spreadsheet"
            />
          </div>

          {/* Sync / Autosave Indicator */}
          {isSaving ? (
            <span className="spreadsheet-status-pill saving">
              <Loader2 size={12} className="animate-spin" /> Saving...
            </span>
          ) : saveSuccess ? (
            <span className="spreadsheet-status-pill saved">
              <CheckCircle2 size={12} /> Saved to Database
            </span>
          ) : lastSavedTime ? (
            <span className="spreadsheet-status-pill info" title="Last saved time">
              Saved at {lastSavedTime}
            </span>
          ) : null}
        </div>

        {/* Action Controls */}
        <div className="spreadsheet-action-section">
          <button className="spreadsheet-secondary-btn" onClick={handleExportCSV} title="Export Active Sheet to CSV">
            <Download size={15} /> Export .csv
          </button>

          <button className="spreadsheet-primary-save-btn" onClick={handleSave} disabled={isSaving} title="Save Spreadsheet (Ctrl+S)">
            {isSaving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Spreadsheet'}</span>
            <span className="spreadsheet-kbd-hint">Ctrl+S</span>
          </button>
        </div>
      </div>

      {/* Main Zero-Overflow Stage */}
      <div className="spreadsheet-main-area">
        <div className="spreadsheet-fortune-wrapper">
          <Workbook 
            ref={workbookRef}
            data={sheetData} 
            onChange={(data) => setSheetData(data)}
          />
        </div>
      </div>
    </div>
  );
};

export default SpreadsheetEditor;

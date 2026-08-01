import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Workbook } from '@fortune-sheet/react';
import '@fortune-sheet/react/dist/index.css';
import { ChevronLeft, Save } from 'lucide-react';
import { getItems, addItem, updateItem } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import '@/features/tools/styles/SpreadsheetEditor.css';

const SpreadsheetEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [title, setTitle] = useState('Untitled Spreadsheet');
  const [sheetData, setSheetData] = useState([
    {
      name: 'Sheet1',
      celldata: []
    }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (id && user?.id) {
        const items = await getItems('documents', user.id);
        const doc = items.find(d => d.id === id);
        if (doc) {
          setTitle(doc.title || 'Untitled Spreadsheet');
          if (doc.sheetData) {
            setSheetData(doc.sheetData);
          }
        }
      }
      setLoading(false);
    };
    loadData();
  }, [id, user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    
    // In fortune-sheet, we can get the current data. Actually, the onChange provides updates, or we can use ref to get data.
    // For now, let's assume sheetData is kept somewhat updated if we pass onChange, but fortune-sheet manages its own state internally.
    // FortuneSheet uses a ref or window.luckysheet to get data. @fortune-sheet/react provides an `onChange` callback or `onSave` or we can access the instance.
    // Let's rely on window.luckysheet.getAllSheets() if it exposes it, or the ref.
    
    // According to fortune-sheet docs, we can pass a ref to Workbook to get the instance methods.
    
    const docData = {
      docType: 'Spreadsheet',
      title,
      sheetData, // We need to ensure this is up-to-date
      date: new Date().toISOString().split('T')[0],
      invoiceNumber: `SPR-${Date.now().toString().slice(-4)}`,
      total: 0,
      updatedAt: new Date().toISOString()
    };

    try {
      if (id) {
        await updateItem('documents', id, docData, user.id);
        alert('Spreadsheet saved successfully!');
      } else {
        await addItem('documents', { ...docData, createdAt: new Date().toISOString() }, user.id);
        alert('Spreadsheet saved successfully!');
      }
    } catch (error) {
      console.error("Failed to save", error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="spreadsheet-module-container">
      <div className="spreadsheet-header">
        <div className="title-section">
          <button className="back-btn" onClick={() => navigate('/')}>
            <ChevronLeft size={18} /> Back to Dashboard
          </button>
          <input 
            type="text" 
            className="spreadsheet-title-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Enter spreadsheet title..."
          />
        </div>
        <div className="action-section">
          <button className="action-btn" onClick={handleSave}>
            <Save size={18} /> Save
          </button>
        </div>
      </div>
      <div className="spreadsheet-main-area">
        <Workbook 
          data={sheetData} 
          onChange={(data) => setSheetData(data)}
        />
      </div>
    </div>
  );
};

export default SpreadsheetEditor;

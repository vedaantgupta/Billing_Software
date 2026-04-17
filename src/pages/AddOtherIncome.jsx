import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Plus, Trash2, ArrowLeft, Save, Printer, Music 
} from 'lucide-react';
import { addItem, updateItem, getItems } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import './AddOtherIncome.css';

const AddOtherIncome = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    incomeNo: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    msName: '',
    items: [{ id: Date.now(), name: '', note: '', price: 0 }],
    paymentType: 'CASH',
    roundOff: true,
    totalVal: 0,
    grandTotal: 0
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchIncomeData();
    } else {
      generateIncomeNo();
    }
  }, [id]);

  const fetchIncomeData = async () => {
    if (!user?.id) return;
    try {
      const data = await getItems('otherIncome', user.id);
      const income = data.find(e => e._dbId === id);
      if (income) {
        setFormData(income);
      }
    } catch (error) {
      console.error('Error fetching income:', error);
    }
  };

  const generateIncomeNo = async () => {
    if (!user?.id) return;
    const data = await getItems('otherIncome', user.id);
    const nextNo = data.length + 1;
    setFormData(prev => ({ ...prev, incomeNo: nextNo.toString() }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleItemChange = (itemId, field, value) => {
    const newItems = formData.items.map(item => {
      if (item.id === itemId) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now(), name: '', note: '', price: 0 }]
    }));
  };

  const removeItemRow = (itemId) => {
    if (formData.items.length === 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== itemId)
    }));
  };

  useEffect(() => {
    // Recalculate totals
    let total = 0;
    formData.items.forEach(item => {
      total += parseFloat(item.price) || 0;
    });
    
    let grand = total;
    if (formData.roundOff) {
      grand = Math.round(grand);
    }
    
    setFormData(prev => ({ 
      ...prev, 
      totalVal: total,
      grandTotal: grand 
    }));
  }, [formData.items, formData.roundOff]);

  const handleSave = async (print = false) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Use msName as title for the list view
      const submissionData = { ...formData, msName: formData.items[0]?.name || 'Untitled Income' };
      if (isEdit) {
        await updateItem('otherIncome', id, submissionData, user.id);
      } else {
        await addItem('otherIncome', submissionData, user.id);
      }
      navigate('/income/other');
    } catch (error) {
      console.error('Error saving income:', error);
      alert('Failed to save income record');
    } finally {
      setLoading(false);
    }
  };

  const numberToWords = (num) => {
    if (num === 0) return "ZERO RUPEES ONLY";
    return `${num.toLocaleString('en-IN').toUpperCase()} RUPEES ONLY`;
  };

  return (
    <div className="add-income-page">
      <div className="form-header">
        <button className="back-btn" onClick={() => navigate('/income/other')}>
          <ArrowLeft size={18} /> Back
        </button>
        <h1>{isEdit ? 'Edit Other Income' : 'Add Other Income'}</h1>
      </div>

      <div className="form-section glass">
        <div className="section-header">
          <h3>Income Detail</h3>
          <button className="icon-btn"><Plus size={16} /></button>
        </div>
        
        <div className="form-grid">
          <div className="form-group">
            <label>Income No.*</label>
            <input 
              type="text" 
              name="incomeNo" 
              value={formData.incomeNo} 
              onChange={handleInputChange} 
              required
            />
          </div>
          <div className="form-group">
            <label>Date*</label>
            <input 
              type="date" 
              name="date" 
              value={formData.date} 
              onChange={handleInputChange} 
              required
            />
          </div>
          <div className="form-group">
            <label>Category</label>
            <input 
              type="text" 
              name="category" 
              value={formData.category} 
              onChange={handleInputChange} 
              placeholder="Enter category"
            />
          </div>
        </div>
      </div>

      <div className="form-section glass mt-4">
        <div className="section-header">
          <h3>Income Items</h3>
          <button className="icon-btn"><Music size={16} /></button>
        </div>

        <div className="items-table-container">
          <table className="items-table">
            <thead>
              <tr>
                <th width="40">SR.</th>
                <th>INCOME NAME</th>
                <th width="200">PRICE (RS)</th>
                <th width="40"></th>
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="sr-no">{index + 1}</td>
                  <td className="name-cell">
                    <input 
                      type="text" 
                      value={item.name} 
                      onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} 
                      placeholder="Enter Income name"
                    />
                    <textarea 
                      value={item.note} 
                      onChange={(e) => handleItemChange(item.id, 'note', e.target.value)} 
                      placeholder="Item Note..."
                    />
                  </td>
                  <td>
                    <input 
                      type="number" 
                      value={item.price} 
                      onChange={(e) => handleItemChange(item.id, 'price', e.target.value)} 
                      placeholder="Price"
                      className="text-right"
                    />
                  </td>
                  <td>
                    <button className="remove-row" onClick={() => removeItemRow(item.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="summary-row">
                <td colSpan="2" className="text-right font-bold">Total Inv. Val</td>
                <td className="summary-cell text-right font-bold">₹{formData.totalVal.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          <button className="btn btn-outline btn-sm mt-3" onClick={addItemRow}>
            <Plus size={16} /> Add Another Row
          </button>
        </div>

        <div className="totals-section">
           <div className="totals-grid">
              <div className="total-item">
                <span className="label">Round Off</span>
                <label className="switch small">
                  <input 
                    type="checkbox" 
                    name="roundOff" 
                    checked={formData.roundOff} 
                    onChange={handleInputChange} 
                  />
                  <span className="slider round"></span>
                </label>
                <span className="value">0.00</span>
              </div>
              <div className="total-item grand-total">
                <span className="label">Grand Total</span>
                <span className="value">₹{formData.grandTotal.toFixed(2)}</span>
              </div>
              <div className="total-words">
                <span className="label">Total in words</span>
                <span className="value">{numberToWords(formData.grandTotal)}</span>
              </div>

              <div className="payment-type-section">
                <span className="label">Payment Type*</span>
                <div className="payment-options">
                  {['CASH', 'CHEQUE', 'ONLINE'].map(type => (
                    <button 
                      key={type}
                      className={formData.paymentType === type ? 'active' : ''}
                      onClick={() => setFormData(prev => ({ ...prev, paymentType: type }))}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
           </div>
        </div>
      </div>

      <div className="form-footer mt-4">
        <button className="btn btn-outline" onClick={() => navigate('/income/other')}>
          Back
        </button>
        <div className="footer-actions">
          <button className="btn btn-primary btn-with-icon" onClick={() => handleSave(true)} disabled={loading}>
            <Printer size={18} /> Save & Print
          </button>
          <button className="btn btn-success btn-with-icon" onClick={() => handleSave(false)} disabled={loading}>
            <Save size={18} /> {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddOtherIncome;

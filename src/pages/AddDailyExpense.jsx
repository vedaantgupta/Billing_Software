import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Plus, Trash2, ArrowLeft, Save, Printer, ChevronDown, 
  Settings, Info, Calculator, Percent, IndianRupee 
} from 'lucide-react';
import { addItem, updateItem, getItems } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import './AddDailyExpense.css';

const AddDailyExpense = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    expenseNo: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    msName: '',
    isGstEnabled: true,
    items: [{ id: Date.now(), name: '', note: '', qty: 0, uom: '', price: 0, discount: 0, tax: 0, total: 0 }],
    paymentType: 'CASH',
    roundOff: true,
    totalTaxable: 0,
    totalTax: 0,
    grandTotal: 0
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchExpenseData();
    } else {
      generateExpenseNo();
    }
  }, [id]);

  const fetchExpenseData = async () => {
    if (!user?.id) return;
    try {
      const data = await getItems('dailyExpenses', user.id);
      const expense = data.find(e => e._dbId === id);
      if (expense) {
        setFormData(expense);
      }
    } catch (error) {
      console.error('Error fetching expense:', error);
    }
  };

  const generateExpenseNo = async () => {
    if (!user?.id) return;
    const data = await getItems('dailyExpenses', user.id);
    const nextNo = data.length + 1;
    setFormData(prev => ({ ...prev, expenseNo: nextNo.toString() }));
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
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate item total
        const qty = parseFloat(updatedItem.qty) || 0;
        const price = parseFloat(updatedItem.price) || 0;
        const discount = parseFloat(updatedItem.discount) || 0;
        const taxRate = parseFloat(updatedItem.tax) || 0;
        
        const taxable = (qty * price) - discount;
        const taxAmount = (taxable * taxRate) / 100;
        updatedItem.total = taxable + taxAmount;
        
        return updatedItem;
      }
      return item;
    });
    
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now(), name: '', note: '', qty: 0, uom: '', price: 0, discount: 0, tax: 0, total: 0 }]
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
    let taxable = 0;
    let tax = 0;
    
    formData.items.forEach(item => {
      const q = parseFloat(item.qty) || 0;
      const p = parseFloat(item.price) || 0;
      const d = parseFloat(item.discount) || 0;
      const t = parseFloat(item.tax) || 0;
      
      const itemTaxable = (q * p) - d;
      taxable += itemTaxable;
      tax += (itemTaxable * t) / 100;
    });
    
    let grand = taxable + tax;
    if (formData.roundOff) {
      grand = Math.round(grand);
    }
    
    setFormData(prev => ({ 
      ...prev, 
      totalTaxable: taxable, 
      totalTax: tax, 
      grandTotal: grand 
    }));
  }, [formData.items, formData.roundOff]);

  const handleSave = async (print = false) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      if (isEdit) {
        await updateItem('dailyExpenses', id, formData, user.id);
      } else {
        await addItem('dailyExpenses', formData, user.id);
      }
      navigate('/expenses/daily');
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  const numberToWords = (num) => {
    // Simplified Indian currency word converter
    if (num === 0) return "ZERO RUPEES ONLY";
    // This is a placeholder for a real word converter logic
    return `${num.toLocaleString('en-IN').toUpperCase()} RUPEES ONLY`;
  };

  return (
    <div className="add-expense-page">
      <div className="form-header">
        <button className="back-btn" onClick={() => navigate('/expenses/daily')}>
          <ArrowLeft size={18} /> Back
        </button>
        <h1>{isEdit ? 'Edit Expense' : 'Add Expense'}</h1>
      </div>

      <div className="form-section glass">
        <div className="section-header">
          <h3>Expense Detail</h3>
          <div className="gst-toggle">
            <span>GST</span>
            <label className="switch">
              <input 
                type="checkbox" 
                name="isGstEnabled" 
                checked={formData.isGstEnabled} 
                onChange={handleInputChange} 
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>
        
        <div className="form-grid">
           <div className="form-group full-width">
            <label>M/S.*</label>
            <input 
              type="text" 
              name="msName" 
              value={formData.msName} 
              onChange={handleInputChange} 
              placeholder="Enter name"
              required
            />
          </div>
          <div className="form-group">
            <label>Expense No.*</label>
            <input 
              type="text" 
              name="expenseNo" 
              value={formData.expenseNo} 
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
          <h3>Expense Items</h3>
          <div className="discount-type">
             <span>Discount:</span>
             <div className="toggle-buttons">
                <button className="active">Rs</button>
                <button>%</button>
             </div>
             <button className="icon-btn ml-2"><Calculator size={16} /></button>
          </div>
        </div>

        <div className="items-table-container">
          <table className="items-table">
            <thead>
              <tr>
                <th width="40">SR.</th>
                <th>EXPENSE NAME</th>
                <th width="100">QTY. / STOCK</th>
                <th width="80">UOM</th>
                <th width="100">PRICE (RS)</th>
                <th width="100">DISCOUNT</th>
                <th width="120">IGST</th>
                <th width="100">CESS</th>
                <th width="120">TOTAL</th>
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
                      placeholder="Enter Expense name"
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
                      value={item.qty} 
                      onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)} 
                      placeholder="Qty."
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      value={item.uom} 
                      onChange={(e) => handleItemChange(item.id, 'uom', e.target.value)} 
                      placeholder="UOM"
                    />
                  </td>
                  <td>
                    <input 
                      type="number" 
                      value={item.price} 
                      onChange={(e) => handleItemChange(item.id, 'price', e.target.value)} 
                      placeholder="Price"
                    />
                  </td>
                  <td>
                    <input 
                      type="number" 
                      value={item.discount} 
                      onChange={(e) => handleItemChange(item.id, 'discount', e.target.value)} 
                      placeholder="Discount"
                    />
                  </td>
                  <td>
                    <select 
                      value={item.tax} 
                      onChange={(e) => handleItemChange(item.id, 'tax', e.target.value)}
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </td>
                  <td>
                    <input type="text" placeholder="%" />
                  </td>
                  <td className="total-cell">
                    ₹{item.total.toFixed(2)}
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
                <td className="summary-cell">{formData.items.reduce((acc, item) => acc + (parseFloat(item.qty) || 0), 0)}</td>
                <td></td>
                <td className="summary-cell">{formData.items.reduce((acc, item) => acc + (parseFloat(item.price) || 0), 0)}</td>
                <td className="summary-cell">{formData.items.reduce((acc, item) => acc + (parseFloat(item.discount) || 0), 0)}</td>
                <td className="summary-cell">{formData.totalTax.toFixed(2)}</td>
                <td className="summary-cell">0</td>
                <td className="summary-cell font-bold">₹{formData.grandTotal.toFixed(2)}</td>
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
                <span className="label">Total Taxable</span>
                <span className="value">₹{formData.totalTaxable.toFixed(2)}</span>
              </div>
              <div className="total-item">
                <span className="label">Total Tax</span>
                <span className="value">₹{formData.totalTax.toFixed(2)}</span>
              </div>
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
                <span className="value">0</span>
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
        <button className="btn btn-outline" onClick={() => navigate('/expenses/daily')}>
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

export default AddDailyExpense;

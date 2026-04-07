import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getItems, addItem, logActivity } from '../utils/db';
import { postToLedger, getContactBalance } from '../utils/ledger';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Save, X, Mail, Image as ImageIcon, UploadCloud } from 'lucide-react';
import './CreateInwardPayment.css';

const CreateInwardPayment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    receiptPrefix: 'RP-',
    receiptNumber: Date.now().toString().slice(-6),
    receiptPostfix: '',
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    customerId: '',
    address: '',
    gstinPan: '',
    totalOutstanding: '0.00',
    amount: '',
    paymentType: 'Cash',
    shareEmail: false,
    remarks: '',
    status: 'Received'
  });

  useEffect(() => {
    const loadContacts = async () => {
      if (!user?.id) return;
      const data = await getItems('contacts', user.id);
      // Include all contacts (customers and vendors) for inward payments
      setContacts(data.filter(c => (c.name && c.name.trim()) || (c.companyName && c.companyName.trim())));
    };
    loadContacts();
  }, [user?.id]);

  const handleCustomerChange = async (e) => {
    const name = e.target.value;
    const selectedContact = contacts.find(c => c.name === name || c.companyName === name);
    
    if (selectedContact) {
      setLoading(true);
      const balanceInfo = await getContactBalance(selectedContact.id, user.id);
      setFormData(prev => ({
        ...prev,
        customerName: name,
        customerId: selectedContact.id,
        address: selectedContact.address || '',
        gstinPan: selectedContact.gstin || selectedContact.panno || '',
        totalOutstanding: balanceInfo.balance.toFixed(2)
      }));
      setLoading(false);
    } else {
      setFormData(prev => ({ ...prev, customerName: name, customerId: '', totalOutstanding: '0.00' }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!formData.customerName || !formData.amount || !formData.date) {
      alert('Please fill all required fields marked with *');
      return;
    }

    const fullReceiptNo = `${formData.receiptPrefix}${formData.receiptNumber}${formData.receiptPostfix}`;
    const paymentToSave = {
      ...formData,
      fullReceiptNo,
      timestamp: new Date().toISOString()
    };

    const result = await addItem('inwardPayments', paymentToSave, user.id, user.username);
    if (result) {
      // Post to Ledger (Credit Customer for inward payment)
      if (formData.customerId) {
        await postToLedger({
          contactId: formData.customerId,
          contactName: formData.customerName,
          type: 'cr',
          amount: formData.amount,
          date: formData.date,
          description: `Payment Received (Receipt #${fullReceiptNo})`,
          referenceId: fullReceiptNo,
          docType: 'Payment In'
        }, user.id);
      }

      logActivity(`Created Inward Payment Receipt #${fullReceiptNo} for ${formData.customerName}`, user.id, user.username);
      navigate('/payments/inward');
    }
  };

  return (
    <div className="create-payment-wrapper fadeInUp">
      <div className="create-payment-inner glass">
        <div className="header-actions">
          <h1 className="page-title">Add Inward Payment</h1>
          <button className="back-btn" onClick={() => navigate('/payments/inward')}>
            <ArrowLeft size={20} /> Back
          </button>
        </div>

        <form className="payment-form" onSubmit={handleSave}>
          {/* Row 1: Receipt Numbering */}
          <div className="form-row">
            <label className="form-label">Receipt No <span className="required">*</span></label>
            <div className="triplet-input">
              <input 
                type="text" 
                placeholder="Receipt Prefix" 
                value={formData.receiptPrefix} 
                onChange={e => setFormData({...formData, receiptPrefix: e.target.value})} 
              />
              <input 
                type="text" 
                required 
                value={formData.receiptNumber} 
                onChange={e => setFormData({...formData, receiptNumber: e.target.value})} 
              />
              <input 
                type="text" 
                placeholder="Receipt Postfix" 
                value={formData.receiptPostfix} 
                onChange={e => setFormData({...formData, receiptPostfix: e.target.value})} 
              />
            </div>
          </div>

          {/* Row 2: Company Details */}
          <div className="form-row">
            <label className="form-label">Company Name <span className="required">*</span></label>
            <select 
              className="form-input" 
              required 
              value={formData.customerName} 
              onChange={handleCustomerChange}
            >
              <option value="">Select Company Name</option>
              {contacts.map(c => {
                const displayName = c.name || c.companyName || 'Unknown';
                return <option key={c.id} value={displayName}>{displayName}</option>;
              })}
            </select>
          </div>

          {/* Row 3: Address */}
          <div className="form-row">
            <label className="form-label">Address</label>
            <textarea 
              className="form-input" 
              rows="2" 
              placeholder="Company address" 
              value={formData.address} 
              onChange={e => setFormData({...formData, address: e.target.value})}
            ></textarea>
          </div>

          {/* Row 4: Details Grid */}
          <div className="form-row">
              <label className="form-label">GSTIN / PAN</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="GSTIN or PAN Number" 
                value={formData.gstinPan} 
                onChange={e => setFormData({...formData, gstinPan: e.target.value})} 
              />
          </div>

          <div className="form-row">
              <label className="form-label">Total Outstanding</label>
              <div className="auto-calc-field">
                ₹{loading ? '...' : formData.totalOutstanding}
              </div>
          </div>

          {/* More Details */}
          <div className="form-row">
              <label className="form-label">Payment Date <span className="required">*</span></label>
              <input 
                type="date" 
                className="form-input" 
                required 
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})} 
              />
          </div>

          <div className="form-row">
              <label className="form-label">Amount <span className="required">*</span></label>
              <input 
                type="number" 
                className="form-input" 
                required 
                placeholder="Enter your amount" 
                value={formData.amount} 
                onChange={e => setFormData({...formData, amount: e.target.value})} 
              />
          </div>

          <div className="form-row">
              <label className="form-label">Payment Type <span className="required">*</span></label>
              <select 
                className="form-input" 
                required 
                value={formData.paymentType} 
                onChange={e => setFormData({...formData, paymentType: e.target.value})}
              >
                <option value="">Select Payment Type</option>
                <option>Cash</option>
                <option>Bank Transfer</option>
                <option>UPI / PhonePe</option>
                <option>Cheque</option>
                <option>Credit Card</option>
              </select>
          </div>

          {/* Row 6: Share Options */}
          <div className="form-row">
            <label className="form-label">Share</label>
            <label className="checkbox-wrap">
              <input 
                type="checkbox" 
                checked={formData.shareEmail} 
                onChange={e => setFormData({...formData, shareEmail: e.target.checked})} 
              />
              Email
            </label>
          </div>

          {/* Row 7: Remarks */}
          <div className="form-row">
            <label className="form-label">Remarks</label>
            <textarea 
              className="form-input textarea-large" 
              placeholder="Enter your Remarks" 
              value={formData.remarks} 
              onChange={e => setFormData({...formData, remarks: e.target.value})}
            ></textarea>
          </div>

          {/* Row 8: Attachment */}
          <div className="form-row">
            <label className="form-label">Attachment</label>
            <div className="upload-zone" onClick={() => fileInputRef.current.click()}>
              <UploadCloud size={32} />
              <div className="upload-text">Click To Upload</div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="file-input" 
                style={{ display: 'none' }} 
              />
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="form-row bottom-actions">
            <div></div>
            <div className="action-btns">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/payments/inward')}>Cancel</button>
              <button type="submit" className="btn btn-primary">
                <Save size={18} /> Save Payment
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateInwardPayment;

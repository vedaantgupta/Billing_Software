import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getItems, addItem, logActivity } from '../utils/db';
import { postToLedger, getContactBalance } from '../utils/ledger';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Save, Mail, UploadCloud, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import './CreateOutwardPayment.css';

const CreateOutwardPayment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    paymentPrefix: 'PO-',
    paymentNumber: Date.now().toString().slice(-6),
    paymentPostfix: '',
    date: new Date().toISOString().split('T')[0],
    companyName: '',
    contactId: '',
    address: '',
    gstinPan: '',
    asCustomer: 0,   // DR balance (they owe us — you collect)
    asVendor: 0,     // CR balance (you owe them — you pay)
    totalOutstanding: 0,
    amount: '',
    paymentType: 'Cash',
    shareEmail: false,
    remarks: '',
    status: 'Paid'
  });

  useEffect(() => {
    const loadContacts = async () => {
      if (!user?.id) return;
      const data = await getItems('contacts', user.id);
      setContacts(data.filter(c => (c.name && c.name.trim()) || (c.companyName && c.companyName.trim())));
    };
    loadContacts();
  }, [user?.id]);

  const handleContactChange = async (e) => {
    const name = e.target.value;
    const selectedContact = contacts.find(c => (c.name === name || c.companyName === name));

    if (selectedContact) {
      setLoading(true);
      const balanceInfo = await getContactBalance(selectedContact.id, user.id);

      // If DR > CR → they owe us (we collect) → asCustomer balance
      // If CR > DR → we owe them (we pay) → asVendor balance
      const drBal = balanceInfo.debit;
      const crBal = balanceInfo.credit;
      const asCustomer = drBal > crBal ? +(drBal - crBal).toFixed(2) : 0;  // you collect
      const asVendor   = crBal > drBal ? +(crBal - drBal).toFixed(2) : 0;  // you pay
      const total = +(asCustomer + asVendor).toFixed(2);

      setFormData(prev => ({
        ...prev,
        companyName: name,
        contactId: selectedContact.id,
        address: selectedContact.address || '',
        gstinPan: selectedContact.gstin || selectedContact.panno || '',
        asCustomer,
        asVendor,
        totalOutstanding: total
      }));
      setLoading(false);
    } else {
      setFormData(prev => ({ ...prev, companyName: name, contactId: '', asCustomer: 0, asVendor: 0, totalOutstanding: 0 }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!formData.companyName || !formData.amount || !formData.date) {
      alert('Please fill all required fields marked with *');
      return;
    }

    const fullPaymentNo = `${formData.paymentPrefix}${formData.paymentNumber}${formData.paymentPostfix}`;
    const paymentToSave = { ...formData, fullPaymentNo, timestamp: new Date().toISOString() };

    const result = await addItem('outwardPayments', paymentToSave, user.id, user.username);
    if (result) {
      if (formData.contactId) {
        await postToLedger({
          contactId: formData.contactId,
          contactName: formData.companyName,
          type: 'dr',
          amount: formData.amount,
          date: formData.date,
          description: `Payment Made (Voucher #${fullPaymentNo})`,
          referenceId: fullPaymentNo,
          docType: 'Payment Out'
        }, user.id);
      }
      logActivity(`Created Outward Payment #${fullPaymentNo} for ${formData.companyName}`, user.id, user.username);
      navigate('/payments/outward');
    }
  };

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div className="cop-wrapper">
      <div className="cop-inner glass">

        {/* ── Header ── */}
        <div className="cop-header">
          <h1 className="cop-title">Add Outward Payment</h1>
          <button className="cop-back-btn" onClick={() => navigate('/payments/outward')}>
            <ArrowLeft size={20} /> Back
          </button>
        </div>

        <form className="cop-form" onSubmit={handleSave}>

          {/* Payment No */}
          <div className="cop-row">
            <label className="cop-label">Payment No <span className="req">*</span></label>
            <div className="cop-triplet">
              <input type="text" placeholder="Payment Prefix"
                value={formData.paymentPrefix}
                onChange={e => setFormData({ ...formData, paymentPrefix: e.target.value })} />
              <input type="text" required
                value={formData.paymentNumber}
                onChange={e => setFormData({ ...formData, paymentNumber: e.target.value })} />
              <input type="text" placeholder="Payment Postfix"
                value={formData.paymentPostfix}
                onChange={e => setFormData({ ...formData, paymentPostfix: e.target.value })} />
            </div>
          </div>

          {/* Company Name */}
          <div className="cop-row">
            <label className="cop-label">Company Name <span className="req">*</span></label>
            <select className="cop-input" required value={formData.companyName} onChange={handleContactChange}>
              <option value="">Select Company Name</option>
              {contacts.map(c => {
                const name = c.name || c.companyName || '';
                return <option key={c.id} value={name}>{name}</option>;
              })}
            </select>
          </div>

          {/* Address */}
          <div className="cop-row cop-row--top">
            <label className="cop-label">Address</label>
            <textarea className="cop-input" rows="2" placeholder="Company address"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })} />
          </div>

          {/* GSTIN */}
          <div className="cop-row">
            <label className="cop-label">GSTIN / PAN</label>
            <input type="text" className="cop-input" placeholder="GSTIN or PAN Number"
              value={formData.gstinPan}
              onChange={e => setFormData({ ...formData, gstinPan: e.target.value })} />
          </div>

          {/* Total Outstanding — breakdown card */}
          <div className="cop-row cop-row--top">
            <label className="cop-label">Total Outstanding</label>
            {loading ? (
              <div className="cop-loading">Calculating...</div>
            ) : (
              <div className="cop-outstanding-card">
                <div className="cop-outstanding-row cop-collect">
                  <div className="cop-outstanding-icon">
                    <TrendingUp size={16} />
                  </div>
                  <div className="cop-outstanding-info">
                    <span className="cop-os-amount">₹ {fmt(formData.asCustomer)}</span>
                    <span className="cop-os-sublabel">( As customer )</span>
                  </div>
                  <span className="cop-os-badge cop-os-badge--collect">YOU COLLECT</span>
                </div>

                <div className="cop-outstanding-divider" />

                <div className="cop-outstanding-row cop-pay">
                  <div className="cop-outstanding-icon">
                    <TrendingDown size={16} />
                  </div>
                  <div className="cop-outstanding-info">
                    <span className="cop-os-amount">₹ {fmt(formData.asVendor)}</span>
                    <span className="cop-os-sublabel">( As vendor )</span>
                  </div>
                  <span className="cop-os-badge cop-os-badge--pay">YOU PAY</span>
                </div>

                <div className="cop-outstanding-divider" />

                <div className="cop-outstanding-total">
                  <Wallet size={16} />
                  <span>₹ {fmt(formData.totalOutstanding)}</span>
                  <span className="cop-total-label">Total</span>
                  <span className="cop-os-badge cop-os-badge--collect">YOU COLLECT</span>
                </div>
              </div>
            )}
          </div>

          {/* Payment Date */}
          <div className="cop-row">
            <label className="cop-label">Payment Date <span className="req">*</span></label>
            <input type="date" className="cop-input" required
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })} />
          </div>

          {/* Amount */}
          <div className="cop-row">
            <label className="cop-label">Amount <span className="req">*</span></label>
            <input type="number" className="cop-input" required placeholder="Enter your amount"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })} />
          </div>

          {/* Payment Type */}
          <div className="cop-row">
            <label className="cop-label">Payment Type <span className="req">*</span></label>
            <select className="cop-input" required value={formData.paymentType}
              onChange={e => setFormData({ ...formData, paymentType: e.target.value })}>
              <option value="">Select Payment Type</option>
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>UPI / PhonePe</option>
              <option>Cheque</option>
              <option>Credit Card</option>
            </select>
          </div>

          {/* Share */}
          <div className="cop-row">
            <label className="cop-label">Share</label>
            <label className="cop-checkbox">
              <input type="checkbox"
                checked={formData.shareEmail}
                onChange={e => setFormData({ ...formData, shareEmail: e.target.checked })} />
              <Mail size={15} /> Email
            </label>
          </div>

          {/* Remarks */}
          <div className="cop-row cop-row--top">
            <label className="cop-label">Remarks</label>
            <textarea className="cop-input cop-textarea" placeholder="Enter your Remarks"
              value={formData.remarks}
              onChange={e => setFormData({ ...formData, remarks: e.target.value })} />
          </div>

          {/* Attachment */}
          <div className="cop-row cop-row--top">
            <label className="cop-label">Attachment</label>
            <div className="cop-upload" onClick={() => fileInputRef.current.click()}>
              <UploadCloud size={32} />
              <span className="cop-upload-text">Click To Upload</span>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} />
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="cop-row cop-row--actions">
            <div></div>
            <div className="cop-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/payments/outward')}>Cancel</button>
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

export default CreateOutwardPayment;

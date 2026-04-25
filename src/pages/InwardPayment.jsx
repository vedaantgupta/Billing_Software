import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getItems, addItem, deleteItem, logActivity } from '../utils/db';
import { postToLedger } from '../utils/ledger';
import { useAuth } from '../hooks/useAuth';
import PrintViewModal from '../components/PrintViewModal';

import { Plus, Search, Filter, Trash2, Edit, X, ArrowDownLeft, Paperclip, Mail, Printer } from 'lucide-react';

const InwardPayment = () => {
  const [payments, setPayments] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [printDoc, setPrintDoc] = useState(null);

  const [newPayment, setNewPayment] = useState({
    receiptPrefix: '11',
    receiptNumber: Date.now().toString().slice(-6),
    receiptPostfix: '',
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    address: '',
    gstinPan: '',
    totalOutstanding: '0.00',
    amount: '',
    invoiceList: '',
    paymentType: 'Bank Transfer',
    shareEmail: false,
    remarks: '',
    status: 'Received',
    customerId: ''
  });


  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [paymentData, contactData] = await Promise.all([
        getItems('inwardPayments', user.id),
        getItems('contacts', user.id)
      ]);
      setPayments(paymentData.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setContacts(contactData.filter(c => c.type === 'customer'));
    } catch (err) {
      console.error('Failed to load inward payment data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCustomerChange = (e) => {
    const name = e.target.value;
    const selectedContact = contacts.find(c => c.name === name);
    if (selectedContact) {
      setNewPayment({
        ...newPayment,
        customerName: name,
        customerId: selectedContact.id,
        address: selectedContact.address || '',
        gstinPan: selectedContact.gstin || ''
      });

    } else {
      setNewPayment({ ...newPayment, customerName: name });
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    
    const fullReceiptNo = `${newPayment.receiptPrefix}${newPayment.receiptNumber}${newPayment.receiptPostfix}`;
    const paymentToSave = {
        ...newPayment,
        fullReceiptNo
    };

    const result = await addItem('inwardPayments', paymentToSave, user.id, user.username);
    if (result) {
      // Post to Ledger (Credit Customer)
      if (newPayment.customerId) {
        await postToLedger({
          contactId: newPayment.customerId,
          contactName: newPayment.customerName,
          type: 'cr',
          amount: newPayment.amount,
          date: newPayment.date,
          description: `Payment Received (Receipt #${fullReceiptNo})`,
          referenceId: fullReceiptNo,
          docType: 'Payment In'
        }, user.id);
      }

      setShowAddModal(false);

      setNewPayment({
        receiptPrefix: '11',
        receiptNumber: Date.now().toString().slice(-6),
        receiptPostfix: '',
        date: new Date().toISOString().split('T')[0],
        customerName: '',
        address: '',
        gstinPan: '',
        totalOutstanding: '0.00',
        amount: '',
        invoiceList: '',
        paymentType: 'Bank Transfer',
        shareEmail: false,
        remarks: '',
        status: 'Received'
      });
      loadData();
      logActivity(`Created Inward Payment Receipt #${fullReceiptNo}`, user.id, user.username);
    }
  };

  const handleDelete = async (id) => {
    if (!user?.id) return;
    if (window.confirm('Delete this payment record?')) {
      await deleteItem('inwardPayments', id, user.id);
      loadData();
    }
  };

  const filteredPayments = payments.filter(p => 
    p.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.fullReceiptNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.remarks?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalReceived = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  if (loading && user) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Inward Payments...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Inward Payments (Receipts)</h1>
        <button className="btn btn-primary" onClick={() => navigate('/payments/inward/new')}>
          <Plus size={18} /> Add Inward Payment
        </button>
      </div>

      <div className="flex gap-4 mb-6">
         <div className="glass w-full stat-card-received" style={{ padding: '1.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div className="flex items-center gap-3">
               <div style={{ background: '#10b981', color: 'white', padding: '0.75rem', borderRadius: '12px' }}>
                  <ArrowDownLeft size={24} />
               </div>
               <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#166534' }} className="stat-card-label">Total Received</p>
                  <h2 style={{ margin: 0, fontSize: '1.75rem', color: '#14532d' }} className="stat-card-value">₹{totalReceived.toLocaleString()}</h2>
               </div>
            </div>
         </div>
         <div className="glass w-full" style={{ padding: '1.5rem' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Receipts Generated</p>
            <h2 style={{ margin: 0, fontSize: '1.75rem' }}>{payments.length}</h2>
         </div>
      </div>

      <div className="glass" style={{ padding: '1.5rem' }}>
        <div className="flex justify-between items-center mb-6">
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search receipts..." 
              style={{ paddingLeft: '40px' }} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary">
            <Filter size={18} /> Filters
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Date</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Receipt #</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Company / Customer</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Payment Type</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Amount</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Status</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>{p.date}</td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{p.fullReceiptNo}</td>
                  <td style={{ padding: '1rem' }}>
                    <div><strong>{p.customerName}</strong></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>GST: {p.gstinPan || 'N/A'}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>{p.paymentType}</td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: '#10b981' }}>₹{Number(p.amount).toFixed(2)}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ background: '#d1fae5', color: '#065f46', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{p.status}</span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setPrintDoc({...p, docType: 'Payment In'})} title="Print Receipt"><Printer size={16} /></button>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem' }}><Edit size={16} /></button>
                      <button className="btn btn-danger" style={{ padding: '0.5rem', background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => handleDelete(p.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No inward payments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass" style={{ background: 'white', width: '700px', padding: '2rem', borderRadius: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 style={{ margin: 0 }}>Create Inward Payment</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddPayment}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Receipt Prefix</label>
                  <input type="text" className="form-input" value={newPayment.receiptPrefix} onChange={e => setNewPayment({...newPayment, receiptPrefix: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Receipt No*</label>
                  <input type="text" className="form-input" required value={newPayment.receiptNumber} onChange={e => setNewPayment({...newPayment, receiptNumber: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Receipt Postfix</label>
                  <input type="text" className="form-input" value={newPayment.receiptPostfix} onChange={e => setNewPayment({...newPayment, receiptPostfix: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Company Name*</label>
                    <select className="form-input" required value={newPayment.customerName} onChange={handleCustomerChange}>
                        <option value="">Select Customer</option>
                        {contacts.filter(c => c.name && c.name.trim()).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">GSTIN / PAN</label>
                    <input type="text" className="form-input" placeholder="GSTIN or PAN" value={newPayment.gstinPan} onChange={e => setNewPayment({...newPayment, gstinPan: e.target.value})} />
                  </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea className="form-input" rows="2" placeholder="Customer address..." value={newPayment.address} onChange={e => setNewPayment({...newPayment, address: e.target.value})}></textarea>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Total Outstanding</label>
                    <input type="number" className="form-input" placeholder="0.00" value={newPayment.totalOutstanding} onChange={e => setNewPayment({...newPayment, totalOutstanding: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Date*</label>
                    <input type="date" className="form-input" required placeholder="Enter your payment date" value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})} />
                  </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Amount*</label>
                    <input type="number" className="form-input" required placeholder="Enter your amount" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Type*</label>
                    <select className="form-input" required value={newPayment.paymentType} onChange={e => setNewPayment({...newPayment, paymentType: e.target.value})}>
                        <option value="">Select Payment Type</option>
                        <option>Bank Transfer</option>
                        <option>Cash</option>
                        <option>UPI</option>
                        <option>Cheque</option>
                        <option>Credit Card</option>
                    </select>
                  </div>
              </div>

              <div className="form-group">
                <label className="form-label">Invoice List (Optional)</label>
                <input type="text" className="form-input" placeholder="Comma separated invoice numbers" value={newPayment.invoiceList} onChange={e => setNewPayment({...newPayment, invoiceList: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="form-label">Remarks</label>
                <textarea className="form-input" rows="2" placeholder="Enter your Remarks" value={newPayment.remarks} onChange={e => setNewPayment({...newPayment, remarks: e.target.value})}></textarea>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0' }}>
                 <input type="checkbox" id="shareEmail" checked={newPayment.shareEmail} onChange={e => setNewPayment({...newPayment, shareEmail: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                 <label htmlFor="shareEmail" className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={16} /> Share via Email
                 </label>
              </div>

              <div className="form-group">
                <label className="form-label">Attachment</label>
                <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }} className="hover-bg-light">
                    <Paperclip size={24} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '0.875rem' }}>Click To Upload [any file]</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Max size: 5MB</div>
                    <input type="file" style={{ display: 'none' }} />
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <button type="submit" className="btn btn-primary w-full" style={{ padding: '1rem', fontSize: '1rem' }}>Create Payment Receipt</button>
                <button type="button" className="btn btn-secondary w-full" onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {printDoc && (
        <PrintViewModal 
          doc={printDoc} 
          onClose={() => setPrintDoc(null)} 
        />
      )}

      <style>{`
        .hover-bg-light:hover {
            background-color: #f8fafc;
            border-color: var(--primary-color) !important;
        }
      `}</style>
    </div>
  );
};

export default InwardPayment;

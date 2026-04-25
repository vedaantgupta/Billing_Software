import React, { useState, useEffect, useCallback } from 'react';
import { getItems, addItem, deleteItem, logActivity } from '../utils/db';
import { postToLedger } from '../utils/ledger';
import { useAuth } from '../hooks/useAuth';

import { Plus, Search, Filter, Trash2, Edit, X, ArrowUpRight, Paperclip, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const OutwardPayment = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  const [newPayment, setNewPayment] = useState({
    voucherPrefix: 'VP',
    voucherNumber: Date.now().toString().slice(-6),
    voucherPostfix: '',
    date: new Date().toISOString().split('T')[0],
    vendorName: '',
    address: '',
    gstinPan: '',
    totalOutstanding: '0.00',
    amount: '',
    invoiceList: '',
    paymentType: 'Bank Transfer',
    shareEmail: false,
    remarks: '',
    status: 'Paid',
    vendorId: ''
  });


  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [paymentData, contactData] = await Promise.all([
        getItems('outwardPayments', user.id),
        getItems('contacts', user.id)
      ]);
      setPayments(paymentData.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setContacts(contactData.filter(c => c.type === 'vendor'));
    } catch (err) {
      console.error('Failed to load outward payment data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVendorChange = (e) => {
    const name = e.target.value;
    const selectedContact = contacts.find(c => c.name === name);
    if (selectedContact) {
      setNewPayment({
        ...newPayment,
        vendorName: name,
        vendorId: selectedContact.id,
        address: selectedContact.address || '',
        gstinPan: selectedContact.gstin || ''
      });

    } else {
      setNewPayment({ ...newPayment, vendorName: name });
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    
    const fullVoucherNo = `${newPayment.voucherPrefix}${newPayment.voucherNumber}${newPayment.voucherPostfix}`;
    const paymentToSave = {
        ...newPayment,
        fullVoucherNo
    };

    const result = await addItem('outwardPayments', paymentToSave, user.id, user.username);
    if (result) {
      // Post to Ledger (Debit Vendor)
      if (newPayment.vendorId) {
        await postToLedger({
          contactId: newPayment.vendorId,
          contactName: newPayment.vendorName,
          type: 'dr',
          amount: newPayment.amount,
          date: newPayment.date,
          description: `Payment Made (Voucher #${fullVoucherNo})`,
          referenceId: fullVoucherNo,
          docType: 'Payment Out'
        }, user.id);
      }

      setShowAddModal(false);

      setNewPayment({
        voucherPrefix: 'VP',
        voucherNumber: Date.now().toString().slice(-6),
        voucherPostfix: '',
        date: new Date().toISOString().split('T')[0],
        vendorName: '',
        address: '',
        gstinPan: '',
        totalOutstanding: '0.00',
        amount: '',
        invoiceList: '',
        paymentType: 'Bank Transfer',
        shareEmail: false,
        remarks: '',
        status: 'Paid'
      });
      loadData();
      logActivity(`Created Outward Payment Voucher #${fullVoucherNo}`, user.id, user.username);
    }
  };

  const handleDelete = async (id) => {
    if (!user?.id) return;
    if (window.confirm('Delete this payment record?')) {
      await deleteItem('outwardPayments', id, user.id);
      loadData();
    }
  };

  const filteredPayments = payments.filter(p => 
    p.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.fullVoucherNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.remarks?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  if (loading && user) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Outward Payments...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Outward Payments (Vouchers)</h1>
        <button className="btn btn-primary" onClick={() => navigate('/payments/outward/new')}>
          <Plus size={18} /> Add Outward Payment
        </button>
      </div>

      <div className="flex gap-4 mb-6">
         <div className="glass w-full" style={{ padding: '1.5rem', background: '#fef2f2', border: '1px solid #fecaca' }}>
            <div className="flex items-center gap-3">
               <div style={{ background: '#ef4444', color: 'white', padding: '0.75rem', borderRadius: '12px' }}>
                  <ArrowUpRight size={24} />
               </div>
               <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#991b1b' }}>Total Paid</p>
                  <h2 style={{ margin: 0, fontSize: '1.75rem', color: '#7f1d1d' }}>₹{totalPaid.toLocaleString()}</h2>
               </div>
            </div>
         </div>
         <div className="glass w-full" style={{ padding: '1.5rem' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Vouchers Generated</p>
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
              placeholder="Search vouchers..." 
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
                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Voucher #</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Vendor / Supplier</th>
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
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{p.fullVoucherNo}</td>
                  <td style={{ padding: '1rem' }}>
                    <div><strong>{p.vendorName}</strong></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>GST: {p.gstinPan || 'N/A'}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>{p.paymentType}</td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: '#ef4444' }}>₹{Number(p.amount).toFixed(2)}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ background: '#fee2e2', color: '#991b1b', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{p.status}</span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem' }}><Edit size={16} /></button>
                      <button className="btn btn-danger" style={{ padding: '0.5rem', background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => handleDelete(p.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No outward payments found.
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
              <h2 style={{ margin: 0 }}>Create Outward Payment</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddPayment}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Voucher Prefix</label>
                  <input type="text" className="form-input" value={newPayment.voucherPrefix} onChange={e => setNewPayment({...newPayment, voucherPrefix: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Voucher No*</label>
                  <input type="text" className="form-input" required value={newPayment.voucherNumber} onChange={e => setNewPayment({...newPayment, voucherNumber: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Voucher Postfix</label>
                  <input type="text" className="form-input" value={newPayment.voucherPostfix} onChange={e => setNewPayment({...newPayment, voucherPostfix: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Vendor Name*</label>
                    <select className="form-input" required value={newPayment.vendorName} onChange={handleVendorChange}>
                        <option value="">Select Vendor</option>
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
                <textarea className="form-input" rows="2" placeholder="Vendor address..." value={newPayment.address} onChange={e => setNewPayment({...newPayment, address: e.target.value})}></textarea>
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
                <label className="form-label">Bill / Invoice List (Optional)</label>
                <input type="text" className="form-input" placeholder="Reference purchase bill numbers" value={newPayment.invoiceList} onChange={e => setNewPayment({...newPayment, invoiceList: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="form-label">Remarks</label>
                <textarea className="form-input" rows="2" placeholder="Enter your Remarks" value={newPayment.remarks} onChange={e => setNewPayment({...newPayment, remarks: e.target.value})}></textarea>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0' }}>
                 <input type="checkbox" id="shareEmailOut" checked={newPayment.shareEmail} onChange={e => setNewPayment({...newPayment, shareEmail: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                 <label htmlFor="shareEmailOut" className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                <button type="submit" className="btn btn-primary w-full" style={{ padding: '1rem', fontSize: '1rem' }}>Create Payment Voucher</button>
                <button type="button" className="btn btn-secondary w-full" onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
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

export default OutwardPayment;

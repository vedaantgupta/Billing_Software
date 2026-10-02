import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getItems, deleteItem, logActivity } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import PrintViewModal from '@/components/ui/PrintViewModal';
import CommunicationModal from '@/features/communication/components/CommunicationModal';
import '@/features/documents/styles/PaymentPages.css';

import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  ArrowUpRight, 
  Printer, 
  Send, 
  CheckCircle2,
  Receipt
} from 'lucide-react';

const OutwardPayment = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [printDoc, setPrintDoc] = useState(null);
  const [commDoc, setCommDoc] = useState(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const paymentData = await getItems('outwardPayments', user.id);
      setPayments((paymentData || []).sort((a, b) => new Date(b.date || b.timestamp || 0) - new Date(a.date || a.timestamp || 0)));
    } catch (err) {
      console.error('Failed to load outward payment data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (payment) => {
    if (!user?.id) return;
    const docId = payment._dbId || payment.id;
    const voucherNo = payment.fullVoucherNo || payment.voucherNumber || payment.fullPaymentNo || payment.paymentNumber || 'this voucher';
    
    if (window.confirm(`Are you sure you want to delete payment voucher "${voucherNo}"?`)) {
      try {
        await deleteItem('outwardPayments', docId, user.id, user.username);
        // Clean linked ledger transaction
        try {
          const ledgerTxs = await getItems('ledger_transactions', user.id);
          const linkedTx = ledgerTxs.find(t => t.referenceId === (payment.fullVoucherNo || payment.fullPaymentNo));
          if (linkedTx) {
            await deleteItem('ledger_transactions', linkedTx._dbId || linkedTx.id, user.id);
          }
        } catch (le) {
          console.warn('Notice: linked ledger entry cleanup skipped:', le);
        }

        logActivity(`Deleted Outward Payment Voucher #${voucherNo}`, user.id, user.username);
        loadData();
      } catch (err) {
        console.error('Failed to delete payment voucher:', err);
        alert('Failed to delete payment. Please try again.');
      }
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const party = p.vendorName || p.companyName || '';
      const docNo = p.fullVoucherNo || p.voucherNumber || p.fullPaymentNo || p.paymentNumber || '';
      const q = searchQuery.toLowerCase().trim();

      const matchSearch = !q || 
        party.toLowerCase().includes(q) ||
        docNo.toLowerCase().includes(q) ||
        (p.remarks && p.remarks.toLowerCase().includes(q)) ||
        (p.gstinPan && p.gstinPan.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.invoiceList && p.invoiceList.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (filterCategory !== 'all' && p.category !== filterCategory) {
        return false;
      }

      return true;
    });
  }, [payments, searchQuery, filterCategory]);

  const totalAmount = useMemo(() => {
    return filteredPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [filteredPayments]);

  return (
    <div className="pl-page">
      {/* ── Header ── */}
      <div className="pl-header">
        <div className="pl-title-group">
          <div className="pl-title-icon outward">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <h1 className="pl-title">Outward Payments</h1>
            <p className="pl-subtitle">Manage supplier payments, expense vouchers, and cash outflows</p>
          </div>
        </div>

        <button className="pl-btn-primary outward" onClick={() => navigate('/payments/outward/new')}>
          <Plus size={18} /> Add Outward Payment
        </button>
      </div>

      {/* ── Control Bar (Ledger Style) ── */}
      <div className="pl-control-bar">
        <div className="pl-search-box">
          <Search className="pl-search-icon" size={18} />
          <input 
            className="pl-search-input" 
            placeholder="Search accounts, voucher number, remarks..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="pl-filters">
          <button 
            className={`pl-filter-btn ${filterCategory === 'all' ? 'active' : ''}`}
            onClick={() => setFilterCategory('all')}
          >
            All Vouchers
          </button>
          <button 
            className={`pl-filter-btn ${filterCategory === 'Purchase' ? 'active' : ''}`}
            onClick={() => setFilterCategory('Purchase')}
          >
            Purchase
          </button>
          <button 
            className={`pl-filter-btn ${filterCategory === 'Salary' ? 'active' : ''}`}
            onClick={() => setFilterCategory('Salary')}
          >
            Salary
          </button>
          <button 
            className={`pl-filter-btn ${filterCategory === 'Rent' ? 'active' : ''}`}
            onClick={() => setFilterCategory('Rent')}
          >
            Rent
          </button>
          <button 
            className={`pl-filter-btn ${filterCategory === 'Other Expenses' ? 'active' : ''}`}
            onClick={() => setFilterCategory('Other Expenses')}
          >
            Other Expenses
          </button>
        </div>
      </div>

      {/* ── Table Section (Ledger Style) ── */}
      <div className="pl-table-card">
        <div className="pl-table-header">
          <div className="pl-table-title">
            <Receipt size={18} color="#e11d48" />
            Voucher Records ({filteredPayments.length})
          </div>
          <div className="pl-table-summary">
            Total Paid: <strong className="outward">₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
        </div>

        <div className="pl-table-wrap">
          <table className="pl-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Date</th>
                <th style={{ width: '140px' }}>Voucher #</th>
                <th>Account / Vendor</th>
                <th style={{ width: '130px' }}>Category</th>
                <th style={{ width: '140px' }}>Payment Mode</th>
                <th style={{ width: '160px' }}>Amount</th>
                <th style={{ width: '110px' }}>Status</th>
                <th style={{ width: '150px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(p => {
                const vendor = p.vendorName || p.companyName || 'Vendor';
                const voucherNo = p.fullVoucherNo || p.voucherNumber || p.fullPaymentNo || p.paymentNumber || '-';

                return (
                  <tr key={p._dbId || p.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.date}</div>
                    </td>
                    <td>
                      <span className="pl-badge">
                        {voucherNo}
                      </span>
                    </td>
                    <td>
                      <div className="pl-party-name">{vendor}</div>
                      <div className="pl-party-sub">
                        {p.gstinPan ? `GST: ${p.gstinPan}` : 'No GST'}
                        {p.invoiceList ? ` • Ref: ${p.invoiceList}` : ''}
                      </div>
                    </td>
                    <td>
                      <span className="pl-mode-pill">
                        {p.category || 'Purchase'}
                      </span>
                    </td>
                    <td>
                      <span className="pl-mode-pill">
                        {p.paymentType || 'Bank Transfer'}
                      </span>
                    </td>
                    <td>
                      <span className="pl-amount-cr">
                        ₹ {Number(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td>
                      <span className="pl-status-tag outward">
                        <CheckCircle2 size={11} style={{ display: 'inline', marginRight: '3px' }} />
                        {p.status || 'Paid'}
                      </span>
                    </td>
                    <td>
                      <div className="pl-actions">
                        <button 
                          className="pl-action-btn send" 
                          onClick={() => setCommDoc({ ...p, docType: 'Payment Voucher', customerName: vendor, name: vendor })} 
                          title="Send Voucher via WhatsApp / Email"
                        >
                          <Send size={14} />
                        </button>
                        <button 
                          className="pl-action-btn print" 
                          onClick={() => setPrintDoc({ ...p, docType: 'Payment Out', vendorName: vendor, companyName: vendor })} 
                          title="Print / View Payment Voucher"
                        >
                          <Printer size={14} />
                        </button>
                        <button 
                          className="pl-action-btn edit" 
                          onClick={() => navigate('/payments/outward/new', { state: { editPayment: p } })} 
                          title="Edit Payment Voucher"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          className="pl-action-btn delete" 
                          onClick={() => handleDelete(p)} 
                          title="Delete Payment Voucher"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredPayments.length === 0 && !loading && (
                <tr>
                  <td colSpan="8">
                    <div className="pl-empty">
                      <h3>No Outward Payments Found</h3>
                      <p>Record your vendor settlements, expense payments, and cash vouchers.</p>
                      <button className="pl-btn-primary outward" style={{ marginTop: '1rem' }} onClick={() => navigate('/payments/outward/new')}>
                        <Plus size={16} /> Add Outward Payment
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    Loading outward payments...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Print / PDF Modal ── */}
      {printDoc && (
        <PrintViewModal 
          doc={printDoc} 
          onClose={() => setPrintDoc(null)} 
        />
      )}

      {/* ── WhatsApp & Email Communication Modal ── */}
      {commDoc && (
        <CommunicationModal
          isOpen={Boolean(commDoc)}
          onClose={() => setCommDoc(null)}
          documentData={commDoc}
          defaultChannel="whatsapp"
        />
      )}
    </div>
  );
};

export default OutwardPayment;

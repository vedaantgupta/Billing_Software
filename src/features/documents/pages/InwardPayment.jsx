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
  ArrowDownLeft, 
  Printer, 
  Send, 
  CheckCircle2,
  Receipt
} from 'lucide-react';

const InwardPayment = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const [printDoc, setPrintDoc] = useState(null);
  const [commDoc, setCommDoc] = useState(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const paymentData = await getItems('inwardPayments', user.id);
      setPayments((paymentData || []).sort((a, b) => new Date(b.date || b.timestamp || 0) - new Date(a.date || a.timestamp || 0)));
    } catch (err) {
      console.error('Failed to load inward payment data:', err);
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
    const receiptNo = payment.fullReceiptNo || payment.receiptNumber || 'this receipt';
    
    if (window.confirm(`Are you sure you want to delete payment receipt "${receiptNo}"?`)) {
      try {
        await deleteItem('inwardPayments', docId, user.id, user.username);
        // Clean linked ledger transaction
        try {
          const ledgerTxs = await getItems('ledger_transactions', user.id);
          const linkedTx = ledgerTxs.find(t => t.referenceId === payment.fullReceiptNo);
          if (linkedTx) {
            await deleteItem('ledger_transactions', linkedTx._dbId || linkedTx.id, user.id);
          }
        } catch (le) {
          console.warn('Notice: linked ledger entry cleanup skipped:', le);
        }

        logActivity(`Deleted Inward Payment Receipt #${receiptNo}`, user.id, user.username);
        loadData();
      } catch (err) {
        console.error('Failed to delete payment receipt:', err);
        alert('Failed to delete payment. Please try again.');
      }
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        (p.customerName && p.customerName.toLowerCase().includes(q)) ||
        (p.fullReceiptNo && p.fullReceiptNo.toLowerCase().includes(q)) ||
        (p.remarks && p.remarks.toLowerCase().includes(q)) ||
        (p.gstinPan && p.gstinPan.toLowerCase().includes(q)) ||
        (p.invoiceList && p.invoiceList.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (filterMode !== 'all' && p.paymentType !== filterMode) {
        return false;
      }

      return true;
    });
  }, [payments, searchQuery, filterMode]);

  const totalAmount = useMemo(() => {
    return filteredPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [filteredPayments]);

  return (
    <div className="pl-page">
      {/* ── Header ── */}
      <div className="pl-header">
        <div className="pl-title-group">
          <div className="pl-title-icon inward">
            <ArrowDownLeft size={24} />
          </div>
          <div>
            <h1 className="pl-title">Inward Payments</h1>
            <p className="pl-subtitle">Manage client receipts, collections, and cash inflows</p>
          </div>
        </div>

        <button className="pl-btn-primary inward" onClick={() => navigate('/payments/inward/new')}>
          <Plus size={18} /> Add Inward Payment
        </button>
      </div>

      {/* ── Control Bar (Ledger Style) ── */}
      <div className="pl-control-bar">
        <div className="pl-search-box">
          <Search className="pl-search-icon" size={18} />
          <input 
            className="pl-search-input" 
            placeholder="Search accounts, receipt number, remarks..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="pl-filters">
          <button 
            className={`pl-filter-btn ${filterMode === 'all' ? 'active' : ''}`}
            onClick={() => setFilterMode('all')}
          >
            All Receipts
          </button>
          <button 
            className={`pl-filter-btn ${filterMode === 'Bank Transfer' ? 'active' : ''}`}
            onClick={() => setFilterMode('Bank Transfer')}
          >
            Bank Transfer
          </button>
          <button 
            className={`pl-filter-btn ${filterMode === 'UPI' ? 'active' : ''}`}
            onClick={() => setFilterMode('UPI')}
          >
            UPI
          </button>
          <button 
            className={`pl-filter-btn ${filterMode === 'Cash' ? 'active' : ''}`}
            onClick={() => setFilterMode('Cash')}
          >
            Cash
          </button>
          <button 
            className={`pl-filter-btn ${filterMode === 'Cheque' ? 'active' : ''}`}
            onClick={() => setFilterMode('Cheque')}
          >
            Cheque
          </button>
        </div>
      </div>

      {/* ── Table Section (Ledger Style) ── */}
      <div className="pl-table-card">
        <div className="pl-table-header">
          <div className="pl-table-title">
            <Receipt size={18} color="#059669" />
            Receipt Records ({filteredPayments.length})
          </div>
          <div className="pl-table-summary">
            Total Received: <strong className="inward">₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
        </div>

        <div className="pl-table-wrap">
          <table className="pl-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Date</th>
                <th style={{ width: '140px' }}>Receipt #</th>
                <th>Account / Customer</th>
                <th style={{ width: '150px' }}>Payment Mode</th>
                <th style={{ width: '160px' }}>Amount</th>
                <th style={{ width: '110px' }}>Status</th>
                <th style={{ width: '150px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(p => (
                <tr key={p._dbId || p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.date}</div>
                  </td>
                  <td>
                    <span className="pl-badge">
                      {p.fullReceiptNo || p.receiptNumber || '-'}
                    </span>
                  </td>
                  <td>
                    <div className="pl-party-name">{p.customerName || 'Walk-in Customer'}</div>
                    <div className="pl-party-sub">
                      {p.gstinPan ? `GST: ${p.gstinPan}` : 'No GST'}
                      {p.invoiceList ? ` • Ref: ${p.invoiceList}` : ''}
                    </div>
                  </td>
                  <td>
                    <span className="pl-mode-pill">
                      {p.paymentType || 'Bank Transfer'}
                    </span>
                  </td>
                  <td>
                    <span className="pl-amount-dr">
                      ₹ {Number(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td>
                    <span className="pl-status-tag inward">
                      <CheckCircle2 size={11} style={{ display: 'inline', marginRight: '3px' }} />
                      {p.status || 'Received'}
                    </span>
                  </td>
                  <td>
                    <div className="pl-actions">
                      <button 
                        className="pl-action-btn send" 
                        onClick={() => setCommDoc({ ...p, docType: 'Payment Receipt' })} 
                        title="Send Receipt via WhatsApp / Email"
                      >
                        <Send size={14} />
                      </button>
                      <button 
                        className="pl-action-btn print" 
                        onClick={() => setPrintDoc({ ...p, docType: 'Payment In' })} 
                        title="Print / View Receipt Voucher"
                      >
                        <Printer size={14} />
                      </button>
                      <button 
                        className="pl-action-btn edit" 
                        onClick={() => navigate('/payments/inward/new', { state: { editPayment: p } })} 
                        title="Edit Payment"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        className="pl-action-btn delete" 
                        onClick={() => handleDelete(p)} 
                        title="Delete Payment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredPayments.length === 0 && !loading && (
                <tr>
                  <td colSpan="7">
                    <div className="pl-empty">
                      <h3>No Inward Payments Found</h3>
                      <p>Record your incoming customer payments and bank transfers.</p>
                      <button className="pl-btn-primary inward" style={{ marginTop: '1rem' }} onClick={() => navigate('/payments/inward/new')}>
                        <Plus size={16} /> Add Inward Payment
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    Loading inward payments...
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

export default InwardPayment;

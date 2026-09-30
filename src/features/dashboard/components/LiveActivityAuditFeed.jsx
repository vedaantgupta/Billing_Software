import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, ShoppingCart, ArrowDownLeft, ArrowUpRight, 
  Clock, CheckCircle2, ChevronRight, Filter, Printer, Copy, Check, ExternalLink
} from 'lucide-react';
import dayjs from 'dayjs';

const LiveActivityAuditFeed = ({
  allUnifiedInvoices = [],
  expensesList = [],
  inwardBreakdown = {},
  privacyMode = false
}) => {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState('all');
  const [copiedId, setCopiedId] = useState(null);

  // Masking
  const mask = (val, prefix = '₹ ') => {
    if (privacyMode) return `${prefix}••••••`;
    return `${prefix}${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Compile unified feed items
  const feedItems = useMemo(() => {
    const list = [];

    // 1. Invoices (Sales & Purchases)
    (allUnifiedInvoices || []).forEach(inv => {
      const isSale = (inv.kind || 'Sale') === 'Sale';
      const docNo = inv.invoiceNumber || inv.billNumber || inv.id || 'INV';
      const date = inv.date || inv.invoiceDetail?.date || new Date().toISOString();
      const name = inv.customerName || inv.vendorName || (isSale ? 'Client' : 'Supplier');
      const amount = Number(inv.total || inv.grandTotal || 0);

      list.push({
        id: inv.id || docNo,
        type: isSale ? 'sale' : 'purchase',
        title: isSale ? 'Sale Invoice Issued' : 'Purchase Bill Logged',
        docNo,
        name,
        date,
        amount,
        status: inv.status || 'Active',
        rawDoc: inv
      });
    });

    // 2. Expenses
    (expensesList || []).forEach(exp => {
      const date = exp.date || new Date().toISOString();
      const cat = exp.category || exp.expenseCategory || 'General Expense';
      const amount = Number(exp.amount || 0);

      list.push({
        id: exp.id || `EXP-${Math.random()}`,
        type: 'expense',
        title: `Expense: ${cat}`,
        docNo: exp.referenceNo || exp.id ? `EXP-${String(exp.id).slice(-4)}` : 'VOUCHER',
        name: exp.paidTo || exp.notes || 'Operating Overhead',
        date,
        amount,
        status: 'Recorded',
        rawDoc: exp
      });
    });

    // Sort by latest date descending
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [allUnifiedInvoices, expensesList]);

  // Filtered feed
  const displayedItems = useMemo(() => {
    if (filterType === 'all') return feedItems.slice(0, 7);
    return feedItems.filter(item => item.type === filterType).slice(0, 7);
  }, [feedItems, filterType]);

  const handleCopy = (id, text) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return 'Recently';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    return dayjs(d).format('DD MMM, hh:mm A');
  };

  return (
    <div className="glass db-activity-card">
      <div className="db-activity-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="db-activity-icon-badge">
            <Clock size={16} color="var(--primary-color)" />
          </div>
          <div>
            <h4 className="db-activity-title">Live Business Activity & Audit Log</h4>
            <span className="db-activity-subtitle">Chronological ledger transactions, invoices and expense bookings</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="db-activity-filter-pills">
          <button 
            className={`db-act-pill ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All Activity
          </button>
          <button 
            className={`db-act-pill ${filterType === 'sale' ? 'active' : ''}`}
            onClick={() => setFilterType('sale')}
          >
            Sales
          </button>
          <button 
            className={`db-act-pill ${filterType === 'purchase' ? 'active' : ''}`}
            onClick={() => setFilterType('purchase')}
          >
            Purchases
          </button>
          <button 
            className={`db-act-pill ${filterType === 'expense' ? 'active' : ''}`}
            onClick={() => setFilterType('expense')}
          >
            Expenses
          </button>
        </div>
      </div>

      <div className="db-activity-list">
        {displayedItems.map((item, idx) => {
          const isSale = item.type === 'sale';
          const isPurchase = item.type === 'purchase';
          const isExpense = item.type === 'expense';

          const icon = isSale ? <FileText size={15} color="#059669" />
            : isPurchase ? <ShoppingCart size={15} color="#7c3aed" />
            : <ArrowUpRight size={15} color="#dc2626" />;

          const badgeBg = isSale ? 'rgba(16, 185, 129, 0.12)' 
            : isPurchase ? 'rgba(139, 92, 246, 0.12)' 
            : 'rgba(239, 68, 68, 0.12)';

          const amountColor = isSale ? '#059669' : isPurchase ? '#7c3aed' : '#dc2626';

          return (
            <div key={item.id || idx} className="db-activity-row">
              <div className="db-act-item-left">
                <span className="db-act-icon-box" style={{ background: badgeBg }}>
                  {icon}
                </span>

                <div className="db-act-details">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span className="db-act-item-title">{item.title}</span>
                    <button 
                      className="db-act-copy-doc"
                      onClick={() => handleCopy(item.id, item.docNo)}
                      title="Copy Document #"
                    >
                      <span>{item.docNo}</span>
                      {copiedId === item.id ? <Check size={11} color="#059669" /> : <Copy size={11} />}
                    </button>
                  </div>
                  <div className="db-act-meta">
                    <span style={{ fontWeight: 600, color: '#334155' }}>{item.name}</span>
                    <span>•</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{getRelativeTime(item.date)}</span>
                  </div>
                </div>
              </div>

              <div className="db-act-item-right">
                <span className="db-act-amount" style={{ color: amountColor }}>
                  {isSale ? '+' : '-'} {mask(item.amount)}
                </span>
                <span className={`db-act-status ${item.status.toLowerCase()}`}>
                  {item.status}
                </span>
              </div>
            </div>
          );
        })}

        {displayedItems.length === 0 && (
          <div className="db-activity-empty">
            <Clock size={24} color="#94a3b8" />
            <span>No activity records match the selected filter.</span>
          </div>
        )}
      </div>

      <div className="db-activity-footer">
        <button 
          className="db-activity-viewall-btn"
          onClick={() => navigate('/documents')}
        >
          View Full Audit Records & Documents <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default LiveActivityAuditFeed;

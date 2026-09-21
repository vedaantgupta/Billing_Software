import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Landmark, ArrowLeft, Download, Search, Filter, 
  ArrowUpRight, ArrowDownLeft, RefreshCw, X, ShieldAlert,
  Calendar, CheckCircle, RotateCcw, Plus, FileText
} from 'lucide-react';
import { getItems, addItem, updateItem } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import '@/features/banking/styles/LoanLedger.css';

const DEFAULT_LEDGER_EVENTS = [
  {
    id: 'TX-1001',
    date: '2026-03-01',
    borrowerName: 'Suresh Raina',
    loanId: 'LN-8801',
    eventType: 'DISBURSEMENT',
    amount: 750000,
    drCr: 'DR',
    category: 'Principal Outflow',
    refNumber: 'UTR981273912',
    description: 'Initial loan disbursement via RTGS to HDFC Bank',
    authorizedBy: 'Operations Manager'
  },
  {
    id: 'TX-1002',
    date: '2026-03-05',
    borrowerName: 'Suresh Raina',
    loanId: 'LN-8801',
    eventType: 'FEE_ASSESSMENT',
    amount: 11250,
    drCr: 'CR',
    category: 'Fee Income',
    refNumber: 'FEE-2026-01',
    description: 'Processing fee charged on sanction',
    authorizedBy: 'System Auto-Engine'
  },
  {
    id: 'TX-1003',
    date: '2026-03-20',
    borrowerName: 'Greenfield Retail Ventures',
    loanId: 'LN-8802',
    eventType: 'DISBURSEMENT',
    amount: 3500000,
    drCr: 'DR',
    category: 'Principal Outflow',
    refNumber: 'UTR981273955',
    description: 'Tranche 1 Working Capital disbursement',
    authorizedBy: 'Senior Credit Officer'
  },
  {
    id: 'TX-1004',
    date: '2026-04-01',
    borrowerName: 'Suresh Raina',
    loanId: 'LN-8801',
    eventType: 'REPAYMENT_PRINCIPAL',
    amount: 18500,
    drCr: 'CR',
    category: 'Principal Inflow',
    refNumber: 'UPI-49182910',
    description: 'Installment 1 Principal component collected',
    authorizedBy: 'Auto-Debit Gateway'
  },
  {
    id: 'TX-1005',
    date: '2026-04-01',
    borrowerName: 'Suresh Raina',
    loanId: 'LN-8801',
    eventType: 'REPAYMENT_INTEREST',
    amount: 6250,
    drCr: 'CR',
    category: 'Interest Income',
    refNumber: 'UPI-49182910',
    description: 'Installment 1 Interest component collected',
    authorizedBy: 'Auto-Debit Gateway'
  }
];

const LoanLedger = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ledgerEvents, setLedgerEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Reversal Modal
  const [showReversalModal, setShowReversalModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [reversalReason, setReversalReason] = useState('');

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      let events = await getItems('loan_ledger', user.id);
      if (!events || events.length === 0) {
        const seeded = [];
        for (const ev of DEFAULT_LEDGER_EVENTS) {
          const res = await addItem('loan_ledger', ev, user.id);
          seeded.push(res || ev);
        }
        setLedgerEvents(seeded);
      } else {
        setLedgerEvents(events);
      }
    } catch (err) {
      console.error('Failed to load loan ledger:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Execute Reversal: Never deletes, appends a counter REVERSAL event!
  const handleExecuteReversal = async (e) => {
    e.preventDefault();
    if (!user?.id || !selectedTx) return;

    const revPayload = {
      id: `REV-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      borrowerName: selectedTx.borrowerName,
      loanId: selectedTx.loanId,
      eventType: 'PAYMENT_REVERSAL',
      amount: selectedTx.amount,
      drCr: selectedTx.drCr === 'DR' ? 'CR' : 'DR', // Invert transaction
      category: 'Reversal / Correction',
      refNumber: `REV-OF-${selectedTx.refNumber || selectedTx.id}`,
      description: `Reversal of #${selectedTx.id} - Reason: ${reversalReason}`,
      authorizedBy: user.username || user.firstName || 'Authorized Accountant',
      originalTxId: selectedTx.id
    };

    try {
      await addItem('loan_ledger', revPayload, user.id);
      setShowReversalModal(false);
      setReversalReason('');
      setSelectedTx(null);
      loadData();
      alert('Financial reversal recorded successfully in the immutable ledger.');
    } catch (err) {
      console.error('Failed to record reversal:', err);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Transaction ID', 'Borrower', 'Event Type', 'Dr/Cr', 'Amount', 'Ref Number', 'Description', 'Authorized By'];
    const rows = filteredEvents.map(e => [
      e.date,
      e.id || e._dbId,
      `"${e.borrowerName || ''}"`,
      e.eventType,
      e.drCr || 'CR',
      e.amount,
      `"${e.refNumber || ''}"`,
      `"${e.description || ''}"`,
      `"${e.authorizedBy || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Loan_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEvents = ledgerEvents.filter(ev => {
    const matchesFilter = filterType === 'all' || ev.eventType?.toLowerCase() === filterType.toLowerCase();
    const matchesSearch = 
      ev.borrowerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.refNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Calculate Totals
  const totalDisbursed = ledgerEvents
    .filter(e => e.eventType === 'DISBURSEMENT')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const totalCollectedPrincipal = ledgerEvents
    .filter(e => e.eventType === 'REPAYMENT_PRINCIPAL')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const totalCollectedInterest = ledgerEvents
    .filter(e => e.eventType === 'REPAYMENT_INTEREST')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const totalFeesAssessed = ledgerEvents
    .filter(e => e.eventType === 'FEE_ASSESSMENT')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  return (
    <div className="llg-container">
      {/* Header */}
      <div className="llg-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/loans')} style={{ padding: '0.4rem' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="llg-title">
              <div className="llg-title-icon"><Landmark size={22} /></div>
              Lending Financial Event Ledger
            </h1>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
              Immutable double-entry transaction record: disbursements, repayments, fees, and audit reversals
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={16} /> Export Ledger CSV
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="llg-summary-row">
        <div className="llg-summary-card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Disbursed (Dr)</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>₹{totalDisbursed.toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Outflowing lending capital</div>
        </div>

        <div className="llg-summary-card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Principal Recovered (Cr)</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>₹{totalCollectedPrincipal.toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Capital returned to vault</div>
        </div>

        <div className="llg-summary-card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Interest Earned (Cr)</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4f46e5', marginTop: '4px' }}>₹{totalCollectedInterest.toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Lending yield & income</div>
        </div>

        <div className="llg-summary-card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Fees & Penalties (Cr)</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>₹{totalFeesAssessed.toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Processing, docs & late charges</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="lm-search-box" style={{ width: '320px' }}>
          <Search className="lm-search-icon" size={16} />
          <input 
            className="lm-search-input" 
            placeholder="Search borrower, ref UTR, note..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterType('all')}>All</button>
          <button className={`btn btn-sm ${filterType === 'disbursement' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterType('disbursement')}>Disbursements</button>
          <button className={`btn btn-sm ${filterType === 'repayment_principal' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterType('repayment_principal')}>Principal</button>
          <button className={`btn btn-sm ${filterType === 'repayment_interest' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterType('repayment_interest')}>Interest</button>
          <button className={`btn btn-sm ${filterType === 'payment_reversal' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterType('payment_reversal')}>Reversals</button>
        </div>
      </div>

      {/* Table Card */}
      <div className="la-table-card">
        <table className="la-table">
          <thead>
            <tr>
              <th>Date & ID</th>
              <th>Borrower / Loan</th>
              <th>Event Type</th>
              <th>Dr / Cr</th>
              <th>Amount</th>
              <th>Reference / Description</th>
              <th>Authorized By</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map(ev => {
              const id = ev.id || ev._dbId;
              const typeClass = ev.eventType?.toLowerCase() || 'disbursement';
              const isDr = ev.drCr === 'DR' || ev.eventType === 'DISBURSEMENT';

              return (
                <tr key={id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{ev.date}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>#{id.slice(-8).toUpperCase()}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{ev.borrowerName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Loan: {ev.loanId}</div>
                  </td>
                  <td>
                    <span className={`llg-type-badge ${typeClass}`}>
                      {ev.eventType?.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, color: isDr ? '#dc2626' : '#059669' }}>
                      {isDr ? 'Dr (Debit)' : 'Cr (Credit)'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: isDr ? '#dc2626' : '#059669' }}>
                      ₹{(parseFloat(ev.amount) || 0).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ev.refNumber || '--'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ev.description}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: '#475569' }}>{ev.authorizedBy || 'System'}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {ev.eventType !== 'PAYMENT_REVERSAL' && (
                      <button 
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#b45309', borderColor: '#fde68a' }}
                        onClick={() => {
                          setSelectedTx(ev);
                          setShowReversalModal(true);
                        }}
                        title="Authorize Adjustment / Reversal"
                      >
                        <RotateCcw size={13} /> Reverse
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredEvents.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  No ledger events matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Reversal Modal */}
      {showReversalModal && selectedTx && (
        <div className="lp-modal-overlay" onClick={() => setShowReversalModal(false)}>
          <div className="lp-modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="lp-modal-header">
              <h2 className="lp-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c' }}>
                <ShieldAlert size={20} /> Authorize Transaction Reversal
              </h2>
              <button className="btn-icon" onClick={() => setShowReversalModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleExecuteReversal}>
              <div className="lp-modal-body">
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', fontSize: '0.85rem', color: '#991b1b' }}>
                  <strong>Financial Audit Notice:</strong> Reversing this transaction will NOT delete records. It will append a permanent offsetting correction entry to maintain complete audit traceability.
                </div>

                <div className="lp-specs-grid" style={{ margin: '1rem 0 0 0' }}>
                  <div className="lp-spec-item">
                    <span className="lp-spec-label">Original Event</span>
                    <span className="lp-spec-value">{selectedTx.eventType}</span>
                  </div>
                  <div className="lp-spec-item">
                    <span className="lp-spec-label">Amount</span>
                    <span className="lp-spec-value">₹{(parseFloat(selectedTx.amount) || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="lp-field" style={{ marginTop: '1rem' }}>
                  <label>Mandatory Reversal Reason *</label>
                  <textarea 
                    required 
                    rows={3} 
                    value={reversalReason} 
                    onChange={e => setReversalReason(e.target.value)} 
                    placeholder="e.g. Bank chargeback / Bounced cheque / Operator entry error verified by auditor..."
                  />
                </div>
              </div>

              <div className="lp-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowReversalModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#b91c1c', borderColor: '#b91c1c' }}>
                  Execute Reversal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanLedger;

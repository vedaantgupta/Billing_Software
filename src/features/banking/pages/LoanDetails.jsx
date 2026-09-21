import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Calendar, DollarSign, User, Clock,
  CheckCircle, AlertCircle, Plus, Receipt,
  ArrowUpRight, ArrowDownLeft, Landmark, Banknote,
  FileText, Trash2, PieChart, X, Briefcase,
  ShieldCheck, HelpCircle, Users, Activity, Printer, ExternalLink,
  Percent, AlertTriangle, Send, RefreshCw, Layers, Sliders, CheckSquare, Sparkles,
  ChevronRight, Wallet, ShieldAlert
} from 'lucide-react';
import { getItems, updateItem, deleteItem, addItem } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import { calculateCreditScore } from '@/utils/creditScore';
import { 
  generateAmortizationSchedule, 
  allocatePaymentToSchedule, 
  evaluateDelinquency, 
  calculateForeclosure, 
  calculatePrepaymentImpact, 
  formatINR 
} from '@/utils/loanEngine';
import CreditScoreGauge from '@/components/ui/CreditScoreGauge';
import LoanPrintModal from '@/features/banking/components/LoanPrintModal';
import '@/features/banking/styles/LoanDetails.css';
import '@/components/ui/CreditScoreGauge.css';

const LoanDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loan, setLoan] = useState(null);
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState('overview');

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Payment Form State
  const [paymentData, setPaymentData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
    principalComponent: '',
    interestComponent: '',
    feesCharge: '',
    paymentMethod: 'Bank Transfer'
  });

  // Prepayment Simulator State
  const [prepayAmount, setPrepayAmount] = useState('');
  const [prepayMode, setPrepayMode] = useState('reduce_tenure');

  // Restructuring State
  const [restructureForm, setRestructureForm] = useState({
    newTenure: '',
    newInterestRate: '',
    moratoriumMonths: 0,
    reason: ''
  });

  const loadData = useCallback(async () => {
    if (!user?.id || !id) return;
    setLoading(true);
    try {
      const [fetchedLoans, fetchedContacts] = await Promise.all([
        getItems('loans', user.id),
        getItems('contacts', user.id)
      ]);
      const foundLoan = fetchedLoans.find(l => l.id === id || l._dbId === id);
      if (foundLoan) {
        let currentLoan = { ...foundLoan };
        if (!currentLoan.schedule || currentLoan.schedule.length === 0) {
          const autoSched = generateAmortizationSchedule({
            principal: currentLoan.principal,
            interestRate: currentLoan.interestRate,
            tenure: currentLoan.tenure,
            tenureUnit: currentLoan.tenureUnit || 'months',
            interestType: currentLoan.interestType || 'simple',
            frequency: 'monthly',
            startDate: currentLoan.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0]
          });
          currentLoan.schedule = autoSched.schedule;
          if (currentLoan.repaidAmount > 0) {
            const alloc = allocatePaymentToSchedule(currentLoan.schedule, currentLoan.repaidAmount);
            currentLoan.schedule = alloc.updatedSchedule;
          }
        }
        setLoan(currentLoan);

        const foundContact = fetchedContacts.find(c => c.id === currentLoan.contactId || c._dbId === currentLoan.contactId);
        setContact(foundContact);

        setRestructureForm({
          newTenure: currentLoan.tenure || 12,
          newInterestRate: currentLoan.interestRate || 12,
          moratoriumMonths: 0,
          reason: ''
        });
      }
    } catch (err) {
      console.error('Failed to load loan details:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Payment Recording
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!user?.id || !loan) return;

    const payAmt = parseFloat(paymentData.amount);
    if (!payAmt || payAmt <= 0) return alert('Enter a valid payment amount.');

    const schedule = loan.schedule || [];
    const { updatedSchedule, allocations } = allocatePaymentToSchedule(schedule, payAmt, paymentData.date);

    const updatedLoan = {
      ...loan,
      repaidAmount: (loan.repaidAmount || 0) + payAmt,
      schedule: updatedSchedule,
      payments: [
        ...(loan.payments || []),
        {
          ...paymentData,
          amount: payAmt,
          id: Date.now().toString(),
          allocations
        }
      ]
    };

    const totalPayable = loan.emi * (loan.tenure || 0);
    if (updatedLoan.repaidAmount >= totalPayable) {
      updatedLoan.status = 'closed';
    }

    try {
      await updateItem('loans', id, updatedLoan, user.id);

      await addItem('loan_ledger', {
        loanId: id,
        borrowerName: contact?.companyName || contact?.contactName || loan.fullName || 'Borrower',
        eventType: 'REPAYMENT_PRINCIPAL',
        amount: payAmt,
        date: paymentData.date,
        drCr: 'CR',
        refNumber: `PMT-${Date.now().toString().slice(-6)}`,
        description: `Repayment received via ${paymentData.paymentMethod}. Note: ${paymentData.note || 'None'}`
      }, user.id);

      setShowPaymentModal(false);
      setPaymentData({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        note: '',
        principalComponent: '',
        interestComponent: '',
        feesCharge: '',
        paymentMethod: 'Bank Transfer'
      });
      loadData();
    } catch (err) {
      console.error('Failed to record payment:', err);
    }
  };

  // Restructuring Execution
  const handleExecuteRestructuring = async (e) => {
    e.preventDefault();
    if (!user?.id || !loan) return;

    const remainingPrincipal = Math.max(0, parseFloat(loan.principal) - (parseFloat(loan.repaidAmount) || 0));
    const newSched = generateAmortizationSchedule({
      principal: remainingPrincipal,
      interestRate: restructureForm.newInterestRate,
      tenure: restructureForm.newTenure,
      tenureUnit: 'months',
      interestType: loan.interestType || 'reducing',
      moratoriumPeriod: restructureForm.moratoriumMonths
    });

    const updatedLoan = {
      ...loan,
      tenure: restructureForm.newTenure,
      interestRate: restructureForm.newInterestRate,
      emi: newSched.emi,
      schedule: newSched.schedule,
      restructuringHistory: [
        ...(loan.restructuringHistory || []),
        {
          date: new Date().toISOString(),
          previousTenure: loan.tenure,
          previousRate: loan.interestRate,
          newTenure: restructureForm.newTenure,
          newRate: restructureForm.newInterestRate,
          moratoriumMonths: restructureForm.moratoriumMonths,
          reason: restructureForm.reason,
          authorizedBy: user.username || user.firstName || 'Manager'
        }
      ]
    };

    try {
      await updateItem('loans', id, updatedLoan, user.id);
      alert('Loan facility restructured successfully! New amortization schedule generated.');
      loadData();
    } catch (err) {
      console.error('Failed to restructure loan:', err);
    }
  };

  // Quick WhatsApp Reminder
  const handleSendReminder = () => {
    const phone = (contact?.phone || loan.phone || '').replace(/\D/g, '');
    const cleanPhone = phone.startsWith('91') ? phone : '91' + phone;
    const name = contact?.companyName || contact?.contactName || loan.fullName || 'Borrower';
    const totalPayable = loan.emi * (loan.tenure || 0);
    const balance = totalPayable - (loan.repaidAmount || 0);

    const msg = encodeURIComponent(
      `Hello ${name},\n\nThis is a notification regarding your active loan account with us (Ref: ${id.slice(-8).toUpperCase()}).\n\nOutstanding Balance: ₹${Math.round(balance).toLocaleString('en-IN')}\nExpected Monthly EMI: ₹${Math.round(loan.emi).toLocaleString('en-IN')}\n\nPlease let us know if you need assistance with your repayment schedule.\n\nThank you!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  // Delete Loan
  const handleDeleteLoan = async () => {
    if (window.confirm('Are you sure you want to delete this loan record? This action cannot be undone.')) {
      try {
        await deleteItem('loans', id, user.id);
        navigate('/loans');
      } catch (err) {
        console.error('Failed to delete loan:', err);
      }
    }
  };

  if (loading) return (
    <div className="ld-container" style={{ textAlign: 'center', padding: '6rem', color: '#64748b' }}>
      <div className="animate-pulse" style={{ fontSize: '1.1rem', fontWeight: 600 }}>Loading loan details...</div>
    </div>
  );

  if (!loan) return (
    <div className="ld-container" style={{ textAlign: 'center', padding: '6rem', color: '#64748b' }}>
      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>Loan not found</div>
      <button className="ld-btn ld-btn-secondary" onClick={() => navigate('/loans')} style={{ marginTop: '1rem' }}>
        <ArrowLeft size={16} /> Return to Loans
      </button>
    </div>
  );

  const borrowerName = contact?.companyName || contact?.contactName || loan.fullName || 'Borrower';
  const totalPayable = loan.emi * (loan.tenure || 0);
  const balance = totalPayable - (loan.repaidAmount || 0);
  const progress = Math.min(100, Math.round(((loan.repaidAmount || 0) / (totalPayable || 1)) * 100));
  const last5Payments = (loan.payments || []).slice(-5).reverse();
  const schedule = loan.schedule || [];
  const delinq = evaluateDelinquency(schedule);

  // Prepayment impact computation
  const prepayImpact = prepayAmount ? calculatePrepaymentImpact({
    loan,
    prepaymentAmount: prepayAmount,
    mode: prepayMode
  }) : null;

  // Foreclosure statement computation
  const foreclosureData = calculateForeclosure({ loan });

  return (
    <div className="ld-container">
      {/* Breadcrumbs */}
      <div className="ld-breadcrumb">
        <span className="ld-breadcrumb-link" onClick={() => navigate('/loans')}>
          <Landmark size={14} /> Loans
        </span>
        <ChevronRight size={14} />
        <span>Servicing</span>
        <ChevronRight size={14} />
        <span className="ld-breadcrumb-current">REF-{loan.id.slice(-8).toUpperCase()}</span>
      </div>

      {/* Top Header Bar */}
      <div className="ld-topbar">
        <div className="ld-header-left">
          <div className="ld-header-avatar">
            {borrowerName.charAt(0).toUpperCase()}
          </div>
          <div className="ld-header-titles">
            <div className="ld-header-title-row">
              <h1 className="ld-header-title">{borrowerName}</h1>
              <span className={`ld-status-badge ${loan.status}`}>
                {loan.status}
              </span>
              <span className="ld-type-chip">
                {loan.type === 'lend' ? 'Lent (Receivable)' : 'Borrowed (Payable)'}
              </span>
            </div>
            <div className="ld-header-meta">
              <span>Account Ref: <strong>#{loan.id.slice(-8).toUpperCase()}</strong></span>
              <span>•</span>
              <span>Category: <strong style={{ textTransform: 'capitalize' }}>{loan.loanCategory || 'Personal'}</strong></span>
              <span>•</span>
              <span>Disbursed: <strong>{loan.disbursementDate || loan.createdAt?.split('T')[0] || 'Active'}</strong></span>
            </div>
          </div>
        </div>

        <div className="ld-header-actions">
          <button className="ld-btn ld-btn-secondary" onClick={() => navigate('/loans')}>
            <ArrowLeft size={16} /> Back
          </button>
          <button className="ld-btn ld-btn-secondary" onClick={() => setShowPrintModal(true)}>
            <Printer size={16} /> Print Statement
          </button>
          <button className="ld-btn ld-btn-secondary" onClick={handleSendReminder} style={{ color: '#059669', borderColor: '#a7f3d0' }}>
            <Send size={16} /> WhatsApp Notice
          </button>
          <button className="ld-btn ld-btn-primary" onClick={() => setShowPaymentModal(true)}>
            <Plus size={16} /> Record Repayment
          </button>
          <button className="ld-btn ld-btn-danger" onClick={handleDeleteLoan} title="Delete Record">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Sleek KPI Summary Strip */}
      <div className="ld-kpi-strip">
        <div className="ld-kpi-card">
          <div className="ld-kpi-header">
            <span className="ld-kpi-label">Sanctioned Principal</span>
            <div className="ld-kpi-icon"><Banknote size={18} /></div>
          </div>
          <div className="ld-kpi-value">₹{parseFloat(loan.principal).toLocaleString()}</div>
          <div className="ld-kpi-sub">
            <span>{loan.tenure} {loan.tenureUnit || 'Months'} @ {loan.interestRate}% ({loan.interestType})</span>
          </div>
        </div>

        <div className="ld-kpi-card">
          <div className="ld-kpi-header">
            <span className="ld-kpi-label">Balance Outstanding</span>
            <div className="ld-kpi-icon" style={{ color: '#d97706', background: '#fef3c7' }}><Clock size={18} /></div>
          </div>
          <div className="ld-kpi-value" style={{ color: '#d97706' }}>₹{Math.round(balance).toLocaleString()}</div>
          <div className="ld-kpi-sub">
            <span>Total Payable: ₹{Math.round(totalPayable).toLocaleString()}</span>
          </div>
        </div>

        <div className="ld-kpi-card">
          <div className="ld-kpi-header">
            <span className="ld-kpi-label">Monthly Repayment (EMI)</span>
            <div className="ld-kpi-icon" style={{ color: '#4f46e5', background: '#eef2ff' }}><Receipt size={18} /></div>
          </div>
          <div className="ld-kpi-value" style={{ color: '#4f46e5' }}>₹{Math.round(loan.emi).toLocaleString()}</div>
          <div className="ld-kpi-sub">
            <span>Next Due: {schedule.find(s => s.status !== 'paid')?.dueDate || 'Completed'}</span>
          </div>
        </div>

        <div className="ld-kpi-card">
          <div className="ld-kpi-header">
            <span className="ld-kpi-label">Repayment Recovery</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#059669' }}>{progress}%</span>
          </div>
          <div className="ld-kpi-value" style={{ color: '#059669' }}>₹{(loan.repaidAmount || 0).toLocaleString()}</div>
          <div className="ld-mini-progress">
            <div className="ld-mini-progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="ld-kpi-card">
          <div className="ld-kpi-header">
            <span className="ld-kpi-label">Asset Classification</span>
            <div className="ld-kpi-icon" style={{ color: delinq.badgeColor, background: '#f8fafc' }}><ShieldCheck size={18} /></div>
          </div>
          <div className="ld-kpi-value" style={{ fontSize: '1.25rem', color: delinq.badgeColor }}>
            {delinq.maxDpd} Days DPD
          </div>
          <div className="ld-kpi-sub">
            <span>{delinq.smaClassification} ({delinq.agingBucket})</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="ld-tab-nav">
        <button 
          className={`ld-tab-button ${activeTab === 'overview' ? 'active' : ''}`} 
          onClick={() => setActiveTab('overview')}
        >
          <Activity size={16} /> Overview
        </button>
        <button 
          className={`ld-tab-button ${activeTab === 'schedule' ? 'active' : ''}`} 
          onClick={() => setActiveTab('schedule')}
        >
          <Calendar size={16} /> Repayment Schedule <span className="ld-tab-badge">{schedule.length}</span>
        </button>
        <button 
          className={`ld-tab-button ${activeTab === 'disbursement' ? 'active' : ''}`} 
          onClick={() => setActiveTab('disbursement')}
        >
          <Landmark size={16} /> Disbursements & Tranches
        </button>
        <button 
          className={`ld-tab-button ${activeTab === 'prepayment' ? 'active' : ''}`} 
          onClick={() => setActiveTab('prepayment')}
        >
          <Sliders size={16} /> Prepayment & Foreclosure
        </button>
        <button 
          className={`ld-tab-button ${activeTab === 'restructuring' ? 'active' : ''}`} 
          onClick={() => setActiveTab('restructuring')}
        >
          <RefreshCw size={16} /> Restructuring
        </button>
        <button 
          className={`ld-tab-button ${activeTab === 'financials' ? 'active' : ''}`} 
          onClick={() => setActiveTab('financials')}
        >
          <Briefcase size={16} /> Financial Profile
        </button>
        <button 
          className={`ld-tab-button ${activeTab === 'personal' ? 'active' : ''}`} 
          onClick={() => setActiveTab('personal')}
        >
          <User size={16} /> KYC & Details
        </button>
        <button 
          className={`ld-tab-button ${activeTab === 'communications' ? 'active' : ''}`} 
          onClick={() => setActiveTab('communications')}
        >
          <Send size={16} /> Reminders & Notices
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="ld-grid">
          <div className="ld-card">
            <h3 className="ld-card-title"><Clock size={18} color="#4f46e5" /> Core Facility Parameters</h3>
            <div className="ld-data-row">
              <span className="ld-data-label">Sanctioned Amount</span>
              <span className="ld-data-value">₹{parseFloat(loan.principal).toLocaleString()}</span>
            </div>
            <div className="ld-data-row">
              <span className="ld-data-label">Interest Rate Method</span>
              <span className="ld-data-value">{loan.interestRate}% P.A. ({loan.interestType})</span>
            </div>
            <div className="ld-data-row">
              <span className="ld-data-label">Contracted Tenure</span>
              <span className="ld-data-value">{loan.tenure} {loan.tenureUnit || 'Months'}</span>
            </div>
            <div className="ld-data-row">
              <span className="ld-data-label">Periodic Installment (EMI)</span>
              <span className="ld-data-value" style={{ color: '#4f46e5', fontWeight: 800 }}>₹{Math.round(loan.emi).toLocaleString()}</span>
            </div>
            <div className="ld-data-row">
              <span className="ld-data-label">Delinquency Aging</span>
              <span className="ld-data-value" style={{ color: delinq.badgeColor }}>
                {delinq.maxDpd} DPD ({delinq.agingBucket})
              </span>
            </div>
          </div>

          <div className="ld-card">
            <h3 className="ld-card-title"><Receipt size={18} color="#059669" /> Recent Transactions & Repayments</h3>
            {last5Payments.length > 0 ? (
              <>
                {last5Payments.map((p, i) => (
                  <div className="ld-tx-item" key={p.id || i}>
                    <div className="ld-tx-meta">
                      <span className="date">{p.date} • <span style={{ color: '#64748b', fontWeight: 400 }}>{p.paymentMethod || 'Bank Transfer'}</span></span>
                      <span className="note">{p.note || 'Regular Repayment'}</span>
                    </div>
                    <div className="ld-tx-amount">₹{parseFloat(p.amount).toLocaleString()}</div>
                  </div>
                ))}
                <Link to={`/loans/${loan.id}/transactions`} className="ld-view-all">
                  Open Complete Ledger Stream <ExternalLink size={14} />
                </Link>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--ld-text-muted)', fontSize: '0.9rem' }}>
                No repayments posted to this account yet.
              </div>
            )}
          </div>

          <div className="ld-card">
            <h3 className="ld-card-title"><Activity size={18} color="#3b82f6" /> Internal Risk & Credit Standing</h3>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '0.75rem 0' }}>
              <CreditScoreGauge score={calculateCreditScore([loan], loan.contactId)} size={135} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ld-text-main)', margin: '0 0 0.25rem' }}>Credit Reliability Rating</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--ld-text-muted)', maxWidth: '240px', margin: 0 }}>
                  Deterministic score calculated from repayment history, obligation ratios, and tenure fulfillment.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Repayment Schedule */}
      {activeTab === 'schedule' && (
        <div className="ld-table-container">
          <div className="ld-table-toolbar">
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Amortization Schedule & Installment Breakdown</div>
              <div style={{ fontSize: '0.775rem', color: '#64748b' }}>Every installment tracked with waterfall priority: Penalties → Fees → Interest → Principal.</div>
            </div>
            <button className="ld-btn ld-btn-primary" onClick={() => setShowPaymentModal(true)}>
              <Plus size={15} /> Pay Installment
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="ld-table">
              <thead>
                <tr>
                  <th>Inst #</th>
                  <th>Due Date</th>
                  <th>Opening Principal</th>
                  <th>Principal Due</th>
                  <th>Interest Due</th>
                  <th>Total Due</th>
                  <th>Paid Amount</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((inst) => {
                  const isPaid = inst.status === 'paid';
                  const isPartial = inst.status === 'partially_paid';
                  const isOverdue = inst.status === 'overdue';

                  return (
                    <tr key={inst.installmentNumber}>
                      <td><span style={{ fontWeight: 700, color: '#4f46e5' }}>#{inst.installmentNumber}</span></td>
                      <td>{inst.dueDate}</td>
                      <td>₹{(inst.openingPrincipal || 0).toLocaleString()}</td>
                      <td>₹{(inst.principalDue || 0).toLocaleString()}</td>
                      <td>₹{(inst.interestDue || 0).toLocaleString()}</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>₹{(inst.totalDue || 0).toLocaleString()}</td>
                      <td style={{ color: '#059669', fontWeight: 600 }}>₹{(inst.paidAmount || 0).toLocaleString()}</td>
                      <td style={{ color: inst.remainingAmount > 0 ? '#dc2626' : '#64748b', fontWeight: 600 }}>
                        ₹{(inst.remainingAmount || 0).toLocaleString()}
                      </td>
                      <td>
                        {isPaid && <span className="ld-table-pill paid">Paid</span>}
                        {isPartial && <span className="ld-table-pill partially_paid">Partial</span>}
                        {isOverdue && <span className="ld-table-pill overdue">Overdue</span>}
                        {!isPaid && !isPartial && !isOverdue && <span className="ld-table-pill upcoming">Upcoming</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {!isPaid && (
                          <button 
                            className="ld-btn ld-btn-secondary"
                            style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                            onClick={() => {
                              setPaymentData(prev => ({
                                ...prev,
                                amount: inst.remainingAmount || inst.totalDue,
                                note: `Installment #${inst.installmentNumber} repayment`
                              }));
                              setShowPaymentModal(true);
                            }}
                          >
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Disbursements */}
      {activeTab === 'disbursement' && (
        <div className="ld-card" style={{ maxWidth: '800px' }}>
          <h3 className="ld-card-title"><Landmark size={18} color="#4f46e5" /> Disbursement & Staged Funding Record</h3>
          <div className="ld-data-row">
            <span className="ld-data-label">Total Sanctioned Principal</span>
            <span className="ld-data-value">₹{parseFloat(loan.principal).toLocaleString()}</span>
          </div>
          <div className="ld-data-row">
            <span className="ld-data-label">Disbursement Release Date</span>
            <span className="ld-data-value">{loan.disbursementDate || loan.createdAt?.split('T')[0] || 'Initial Date'}</span>
          </div>
          <div className="ld-data-row">
            <span className="ld-data-label">Bank Settlement Reference UTR</span>
            <span className="ld-data-value"><code>{loan.disbursementUTR || 'UTR-BANK-SETTLEMENT-VERIFIED'}</code></span>
          </div>
          <div className="ld-data-row">
            <span className="ld-data-label">Payment Channel</span>
            <span className="ld-data-value">RTGS / Direct Core Banking Credit</span>
          </div>
          <div className="ld-data-row">
            <span className="ld-data-label">Disbursement Status</span>
            <span className="ld-data-value" style={{ color: '#059669', fontWeight: 700 }}>100% Fully Disbursed</span>
          </div>
        </div>
      )}

      {/* Tab 4: Prepayment & Foreclosure */}
      {activeTab === 'prepayment' && (
        <div className="ld-grid">
          <div className="ld-card">
            <h3 className="ld-card-title"><Sliders size={18} color="#4f46e5" /> Prepayment & Part-Payment Simulator</h3>
            <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0 0 1rem' }}>
              Evaluate early partial payment impact on either tenure duration or monthly cash flow.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="lm-form-group">
                <label>Lump-Sum Part-Payment (₹)</label>
                <input 
                  type="number" 
                  placeholder="e.g. 100000" 
                  value={prepayAmount} 
                  onChange={e => setPrepayAmount(e.target.value)} 
                />
              </div>

              <div className="lm-form-group">
                <label>Restructuring Preference</label>
                <select value={prepayMode} onChange={e => setPrepayMode(e.target.value)}>
                  <option value="reduce_tenure">Reduce Tenure (Keep same EMI, finish earlier)</option>
                  <option value="reduce_emi">Reduce Monthly EMI (Keep same tenure, lower monthly outflow)</option>
                </select>
              </div>

              {prepayImpact && (
                <div className="ld-sim-result">
                  <div style={{ fontWeight: 700, color: '#065f46', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} /> Instant Impact Preview
                  </div>
                  {prepayMode === 'reduce_tenure' ? (
                    <div style={{ fontSize: '0.825rem', color: '#047857', lineHeight: '1.6' }}>
                      <div>• Remaining tenure shortens from <strong>{prepayImpact.oldTenureMonths}</strong> to <strong>{prepayImpact.newTenureMonths} months</strong>.</div>
                      <div>• Saves <strong>{prepayImpact.monthsSaved} monthly installments</strong>!</div>
                      <div>• Total estimated interest saved: <strong>₹{prepayImpact.interestSaved.toLocaleString()}</strong></div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.825rem', color: '#047857', lineHeight: '1.6' }}>
                      <div>• Monthly installment drops from <strong>₹{Math.round(prepayImpact.oldEMI).toLocaleString()}</strong> to <strong>₹{Math.round(prepayImpact.newEMI).toLocaleString()}</strong>.</div>
                      <div>• Monthly cash flow savings: <strong>₹{Math.round(prepayImpact.oldEMI - prepayImpact.newEMI).toLocaleString()}/mo</strong></div>
                      <div>• Net interest savings: <strong>₹{prepayImpact.interestSaved.toLocaleString()}</strong></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="ld-card">
            <h3 className="ld-card-title"><CheckSquare size={18} color="#059669" /> Early Foreclosure Payoff Statement</h3>
            <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0 0 1rem' }}>
              Deterministic final settlement figure to fully close this facility and issue No Due Certificate.
            </p>

            {foreclosureData && (
              <div>
                <div className="ld-data-row">
                  <span className="ld-data-label">Unbilled / Outstanding Principal</span>
                  <span className="ld-data-value">₹{foreclosureData.totalOutstandingPrincipal.toLocaleString()}</span>
                </div>
                <div className="ld-data-row">
                  <span className="ld-data-label">Accrued Interest till today</span>
                  <span className="ld-data-value">₹{foreclosureData.accruedInterest.toLocaleString()}</span>
                </div>
                <div className="ld-data-row">
                  <span className="ld-data-label">Foreclosure Charges ({foreclosureData.foreclosureFeePercent}%)</span>
                  <span className="ld-data-value">₹{foreclosureData.foreclosureCharge.toLocaleString()}</span>
                </div>
                <div className="ld-data-row" style={{ borderTop: '2px solid #e2e8f0', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <span className="ld-data-label" style={{ fontWeight: 800, color: '#0f172a' }}>Net Payoff Amount</span>
                  <span className="ld-data-value" style={{ fontWeight: 800, fontSize: '1.25rem', color: '#059669' }}>
                    ₹{foreclosureData.netSettlementAmount.toLocaleString()}
                  </span>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <button 
                    className="ld-btn ld-btn-primary"
                    onClick={() => {
                      setPaymentData(prev => ({
                        ...prev,
                        amount: foreclosureData.netSettlementAmount,
                        note: 'Early Foreclosure Settlement in Full'
                      }));
                      setShowPaymentModal(true);
                    }}
                  >
                    Execute Full Settlement
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Restructuring */}
      {activeTab === 'restructuring' && (
        <div className="ld-card" style={{ maxWidth: '750px' }}>
          <h3 className="ld-card-title"><RefreshCw size={18} color="#4f46e5" /> Loan Restructuring Facility</h3>
          <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0 0 1.5rem' }}>
            Modify tenure, rate, or grant a moratorium period while maintaining complete versioned audit history.
          </p>

          <form onSubmit={handleExecuteRestructuring}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="lm-form-group">
                <label>Revised Tenure (Months)</label>
                <input 
                  type="number" 
                  value={restructureForm.newTenure} 
                  onChange={e => setRestructureForm({ ...restructureForm, newTenure: e.target.value })} 
                />
              </div>
              <div className="lm-form-group">
                <label>Revised Interest Rate (% P.A.)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  value={restructureForm.newInterestRate} 
                  onChange={e => setRestructureForm({ ...restructureForm, newInterestRate: e.target.value })} 
                />
              </div>
            </div>

            <div className="lm-form-group" style={{ marginBottom: '1rem' }}>
              <label>Principal Moratorium Period (Months)</label>
              <input 
                type="number" 
                value={restructureForm.moratoriumMonths} 
                onChange={e => setRestructureForm({ ...restructureForm, moratoriumMonths: e.target.value })} 
              />
            </div>

            <div className="lm-form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Restructuring Business Justification *</label>
              <textarea 
                required 
                rows={2} 
                value={restructureForm.reason} 
                onChange={e => setRestructureForm({ ...restructureForm, reason: e.target.value })} 
                placeholder="e.g. Borrower faced temporary supply chain disruption; granted 3-month moratorium & extended tenure..."
              />
            </div>

            <button type="submit" className="ld-btn ld-btn-primary">
              Confirm & Re-Amortize Loan
            </button>
          </form>
        </div>
      )}

      {/* Tab 6: Financial Profile */}
      {activeTab === 'financials' && (
        <div className="ld-grid">
          <div className="ld-card">
            <h3 className="ld-card-title"><Briefcase size={18} color="#4f46e5" /> Employment & Income Details</h3>
            <div className="ld-data-row">
              <span className="ld-data-label">Employment Status</span>
              <span className="ld-data-value" style={{ textTransform: 'capitalize' }}>{loan.employmentStatus || 'Salaried'}</span>
            </div>
            <div className="ld-data-row">
              <span className="ld-data-label">Employer / Business Name</span>
              <span className="ld-data-value">{loan.employerName || '--'}</span>
            </div>
            <div className="ld-data-row">
              <span className="ld-data-label">Monthly Gross Income</span>
              <span className="ld-data-value">₹{parseFloat(loan.monthlyIncome || 0).toLocaleString()}</span>
            </div>
            <div className="ld-data-row">
              <span className="ld-data-label">Salary / Business Bank Account</span>
              <span className="ld-data-value">{loan.bankAccount || '--'}</span>
            </div>
          </div>

          <div className="ld-card">
            <h3 className="ld-card-title"><PieChart size={18} color="#059669" /> Existing Liabilities & Collaterals</h3>
            <div className="ld-data-row">
              <span className="ld-data-label">Other Outstanding Debt</span>
              <span className="ld-data-value">₹{parseFloat(loan.existingLoans || 0).toLocaleString()}</span>
            </div>
            <div className="ld-data-row">
              <span className="ld-data-label">Monthly Obligations (EMIs)</span>
              <span className="ld-data-value">₹{parseFloat(loan.existingEmis || 0).toLocaleString()}</span>
            </div>
            <div className="ld-data-row">
              <span className="ld-data-label">Pledged Collateral Assets</span>
              <span className="ld-data-value">{loan.assetsOwned || 'None listed'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Personal KYC */}
      {activeTab === 'personal' && (
        <div className="ld-grid">
          <div className="ld-card">
            <h3 className="ld-card-title"><User size={18} color="#4f46e5" /> Borrower Identity Information</h3>
            <div className="ld-data-row">
              <span className="ld-data-label">Full Name as per ID</span>
              <span className="ld-data-value">{loan.fullName || contact?.companyName}</span>
            </div>
            <div className="ld-data-row">
              <span className="ld-data-label">PAN Card</span>
              <span className="ld-data-value"><code>{loan.pan || contact?.pan || '--'}</code></span>
            </div>
            <div className="ld-data-row">
              <span className="ld-data-label">Aadhaar Number</span>
              <span className="ld-data-value"><code>{loan.aadhaar || '--'}</code></span>
            </div>
            <div className="ld-data-row">
              <span className="ld-data-label">Marital Status</span>
              <span className="ld-data-value" style={{ textTransform: 'capitalize' }}>{loan.maritalStatus || '--'}</span>
            </div>
          </div>

          <div className="ld-card">
            <h3 className="ld-card-title"><Users size={18} color="#3b82f6" /> Secondary Parties & Guarantors</h3>
            <div className="ld-data-row">
              <span className="ld-data-label">Co-Applicant Name</span>
              <span className="ld-data-value">{loan.coApplicantName || '--'}</span>
            </div>
            <div className="ld-data-row">
              <span className="ld-data-label">Guarantor Name</span>
              <span className="ld-data-value">{loan.guarantorName || '--'}</span>
            </div>
            <div className="ld-data-row">
              <span className="ld-data-label">Guarantor Contact</span>
              <span className="ld-data-value">{loan.guarantorContact || '--'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 8: Communications */}
      {activeTab === 'communications' && (
        <div className="ld-card" style={{ maxWidth: '800px' }}>
          <h3 className="ld-card-title"><Send size={18} color="#4f46e5" /> Automated Customer Notices & Communications</h3>
          <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0 0 1.5rem' }}>
            Trigger real-time communication notices to the borrower for due dates, payment acknowledgements, or overdue follow-ups.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="ld-btn ld-btn-secondary" onClick={handleSendReminder} style={{ color: '#059669', borderColor: '#a7f3d0' }}>
              <Send size={15} /> Send WhatsApp Payment Notice
            </button>
            <button className="ld-btn ld-btn-secondary" onClick={() => setShowPrintModal(true)}>
              <Printer size={15} /> Export Printable Account Statement
            </button>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="lm-modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="lm-modal" onClick={e => e.stopPropagation()}>
            <div className="lm-modal-header">
              <h2>Post Repayment</h2>
              <button className="btn-icon" onClick={() => setShowPaymentModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleRecordPayment}>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="lm-form-group">
                  <label>Amount Received (₹) *</label>
                  <input
                    type="number"
                    value={paymentData.amount}
                    onChange={e => {
                      const val = e.target.value;
                      setPaymentData(prev => ({
                        ...prev,
                        amount: val,
                        principalComponent: prev.principalComponent || (parseFloat(val) * 0.8).toFixed(0),
                        interestComponent: prev.interestComponent || (parseFloat(val) * 0.2).toFixed(0)
                      }));
                    }}
                    placeholder="₹ 0.00"
                    required
                    autoFocus
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="lm-form-group">
                    <label>Principal Portion (₹)</label>
                    <input
                      type="number"
                      value={paymentData.principalComponent}
                      onChange={e => setPaymentData(prev => ({ ...prev, principalComponent: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="lm-form-group">
                    <label>Interest Portion (₹)</label>
                    <input
                      type="number"
                      value={paymentData.interestComponent}
                      onChange={e => setPaymentData(prev => ({ ...prev, interestComponent: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="lm-form-group">
                    <label>Fees / Charges (₹)</label>
                    <input
                      type="number"
                      value={paymentData.feesCharge}
                      onChange={e => setPaymentData(prev => ({ ...prev, feesCharge: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="lm-form-group">
                    <label>Payment Method</label>
                    <select
                      value={paymentData.paymentMethod}
                      onChange={e => setPaymentData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    >
                      <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                      <option value="UPI / GPay">UPI / GPay</option>
                      <option value="Auto-Debit">NACH / Auto-Debit</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                </div>

                <div className="lm-form-group">
                  <label>Payment Date</label>
                  <input type="date" value={paymentData.date} onChange={e => setPaymentData(prev => ({ ...prev, date: e.target.value }))} required />
                </div>

                <div className="lm-form-group">
                  <label>Note / Reference (Optional)</label>
                  <input value={paymentData.note} onChange={e => setPaymentData(prev => ({ ...prev, note: e.target.value }))} placeholder="e.g. Cleared via HDFC Bank" />
                </div>
              </div>

              <div className="lm-modal-actions">
                <button type="button" className="ld-btn ld-btn-secondary" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button type="submit" className="ld-btn ld-btn-primary">Confirm & Post Repayment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Statement Modal */}
      {showPrintModal && (
        <LoanPrintModal 
          loan={loan} 
          contact={contact} 
          onClose={() => setShowPrintModal(false)} 
        />
      )}
    </div>
  );
};

export default LoanDetails;

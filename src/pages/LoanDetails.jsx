import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Calendar, DollarSign, User, Clock,
  CheckCircle, AlertCircle, Plus, Receipt,
  ArrowUpRight, ArrowDownLeft, Landmark, Banknote,
  FileText, Trash2, PieChart, X, Briefcase,
  ShieldCheck, HelpCircle, Users, Activity, Printer, ExternalLink
} from 'lucide-react';
import { getItems, updateItem, deleteItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import { calculateCreditScore } from '../utils/creditScore';
import CreditScoreGauge from '../components/CreditScoreGauge';
import LoanPrintModal from '../components/LoanPrintModal';
import './LoanDetails.css';
import '../components/CreditScoreGauge.css';

const LoanDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loan, setLoan] = useState(null);
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
    principalComponent: '',
    interestComponent: '',
    feesCharge: '',
    paymentMethod: 'Bank Transfer'
  });

  const loadData = useCallback(async () => {
    if (!user?.id || !id) return;
    setLoading(true);
    try {
      const [fetchedLoans, fetchedContacts] = await Promise.all([
        getItems('loans', user.id),
        getItems('contacts', user.id)
      ]);
      const foundLoan = fetchedLoans.find(l => l.id === id);
      if (foundLoan) {
        setLoan(foundLoan);
        const foundContact = fetchedContacts.find(c => c.id === foundLoan.contactId || c._dbId === foundLoan.contactId);
        setContact(foundContact);
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

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!user?.id || !loan) return;

    const payAmt = parseFloat(paymentData.amount);
    const updatedLoan = {
      ...loan,
      repaidAmount: (loan.repaidAmount || 0) + payAmt,
      payments: [
        ...(loan.payments || []),
        {
          ...paymentData,
          amount: payAmt,
          id: Date.now().toString()
        }
      ]
    };

    const totalPayable = loan.emi * (loan.tenure || 0);
    if (updatedLoan.repaidAmount >= totalPayable) {
      updatedLoan.status = 'closed';
    }

    try {
      await updateItem('loans', id, updatedLoan, user.id);
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

  if (loading) return <div className="ld-container">Loading details...</div>;
  if (!loan) return <div className="ld-container">Loan not found.</div>;

  const totalPayable = loan.emi * (loan.tenure || 0);
  const balance = totalPayable - (loan.repaidAmount || 0);
  const progress = ((loan.repaidAmount || 0) / totalPayable) * 100;
  const last5Payments = (loan.payments || []).slice(-5).reverse();

  return (
    <div className="ld-container">
      {/* Hero Header */}
      <div className="ld-hero">
        <div className="ld-hero-info">
          <div className="ld-type-badge">{loan.type === 'lend' ? 'Given (Lent)' : 'Taken (Borrowed)'}</div>
          <h1>{contact?.companyName || contact?.contactName || 'Loan Detail'}</h1>
          <p style={{ opacity: 0.7 }}>Ref ID: {loan.id.slice(-8).toUpperCase()}</p>
        </div>

        <div className="ld-hero-stats">
          <div className="ld-hero-stat">
            <div className="label">Total Payable</div>
            <div className="value">₹{Math.round(totalPayable).toLocaleString()}</div>
          </div>
          <div className="ld-hero-stat">
            <div className="label">Balance</div>
            <div className="value" style={{ color: '#fbbf24' }}>₹{Math.round(balance).toLocaleString()}</div>
          </div>
          <div className="ld-hero-stat">
            <div className="label">Repaid</div>
            <div className="value" style={{ color: '#10b981' }}>{Math.round(progress)}%</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="ld-tabs">
        <button className={`ld-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`ld-tab ${activeTab === 'financials' ? 'active' : ''}`} onClick={() => setActiveTab('financials')}>Financial Profile</button>
        <button className={`ld-tab ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>KYC & Details</button>
      </div>

      <div className="ld-tab-content">
        {activeTab === 'overview' && (
          <div className="ld-grid">
            <div className="ld-card">
              <h3 className="ld-card-title"><Clock size={20} /> Loan Terms</h3>
              <div className="ld-data-row">
                <span className="ld-data-label">Loan Amount (Principal)</span>
                <span className="ld-data-value">₹{parseFloat(loan.principal).toLocaleString()}</span>
              </div>
              <div className="ld-data-row">
                <span className="ld-data-label">Interest Rate</span>
                <span className="ld-data-value">{loan.interestRate}% ({loan.interestType})</span>
              </div>
              <div className="ld-data-row">
                <span className="ld-data-label">Tenure</span>
                <span className="ld-data-value">{loan.tenure} {loan.tenureUnit || (loan.frequency === 'monthly' ? 'Months' : 'Years')}</span>
              </div>
              <div className="ld-data-row">
                <span className="ld-data-label">Expected EMI</span>
                <span className="ld-data-value" style={{ color: 'var(--primary-color)' }}>₹{Math.round(loan.emi).toLocaleString()}</span>
              </div>
            </div>

            <div className="ld-card">
              <h3 className="ld-card-title"><Receipt size={20} /> Latest Repayments</h3>
              {last5Payments.length > 0 ? (
                <>
                  {last5Payments.map((p, i) => (
                    <div className="ld-tx-item" key={p.id || i}>
                      <div className="ld-tx-meta">
                        <span className="date">{p.date}</span>
                        <span className="note">{p.note || 'Regular Repayment'}</span>
                      </div>
                      <div className="ld-tx-amount">₹{parseFloat(p.amount).toLocaleString()}</div>
                    </div>
                  ))}
                  <Link to={`/loans/${loan.id}/transactions`} className="ld-view-all">
                    View Transaction History <ExternalLink size={16} />
                  </Link>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No payments recorded yet.
                </div>
              )}
            </div>

            <div className="ld-card">
              <h3 className="ld-card-title"><Activity size={20} /> Credit Reliability</h3>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '1rem 0' }}>
                <CreditScoreGauge score={calculateCreditScore([loan], loan.contactId)} size={150} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>Reliability Rating</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '200px' }}>
                    Based on repayment history for this relationship.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'financials' && (
          <div className="ld-grid">
            <div className="ld-card">
              <h3 className="ld-card-title"><Briefcase size={20} /> Employment & Income</h3>
              <div className="ld-data-row">
                <span className="ld-data-label">Status</span>
                <span className="ld-data-value" style={{ textTransform: 'capitalize' }}>{loan.employmentStatus || '--'}</span>
              </div>
              <div className="ld-data-row">
                <span className="ld-data-label">Employer Name</span>
                <span className="ld-data-value">{loan.employerName || '--'}</span>
              </div>
              <div className="ld-data-row">
                <span className="ld-data-label">Monthly Income</span>
                <span className="ld-data-value">₹{parseFloat(loan.monthlyIncome || 0).toLocaleString()}</span>
              </div>
              <div className="ld-data-row">
                <span className="ld-data-label">Primary Bank</span>
                <span className="ld-data-value">{loan.bankAccount || '--'}</span>
              </div>
            </div>

            <div className="ld-card">
              <h3 className="ld-card-title"><PieChart size={20} /> Assets & Liabilities</h3>
              <div className="ld-data-row">
                <span className="ld-data-label">Other Loans</span>
                <span className="ld-data-value">₹{parseFloat(loan.existingLoans || 0).toLocaleString()}</span>
              </div>
              <div className="ld-data-row">
                <span className="ld-data-label">Other EMIs</span>
                <span className="ld-data-value">₹{parseFloat(loan.existingEmis || 0).toLocaleString()}</span>
              </div>
              <div className="ld-data-row">
                <span className="ld-data-label">Assets</span>
                <span className="ld-data-value">{loan.assetsOwned || 'None listed'}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'personal' && (
          <div className="ld-grid">
            <div className="ld-card">
              <h3 className="ld-card-title"><User size={20} /> Personal Info</h3>
              <div className="ld-data-row">
                <span className="ld-data-label">Full Name</span>
                <span className="ld-data-value">{loan.fullName || contact?.companyName}</span>
              </div>
              <div className="ld-data-row">
                <span className="ld-data-label">PAN Number</span>
                <span className="ld-data-value">{loan.pan || '--'}</span>
              </div>
              <div className="ld-data-row">
                <span className="ld-data-label">Aadhaar Number</span>
                <span className="ld-data-value">{loan.aadhaar || '--'}</span>
              </div>
              <div className="ld-data-row">
                <span className="ld-data-label">Marital Status</span>
                <span className="ld-data-value" style={{ textTransform: 'capitalize' }}>{loan.maritalStatus}</span>
              </div>
            </div>

            <div className="ld-card">
              <h3 className="ld-card-title"><Users size={20} /> Co-Applicant / Guarantor</h3>
              <div className="ld-data-row">
                <span className="ld-data-label">Co-Applicant</span>
                <span className="ld-data-value">{loan.coApplicantName || '--'}</span>
              </div>
              <div className="ld-data-row">
                <span className="ld-data-label">Guarantor</span>
                <span className="ld-data-value">{loan.guarantorName || '--'}</span>
              </div>
              <div className="ld-data-row">
                <span className="ld-data-label">Guarantor Contact</span>
                <span className="ld-data-value">{loan.guarantorContact || '--'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Buttons */}
      <div className="ld-actions">
        <button className="ld-fab secondary" onClick={() => navigate('/loans')}><ArrowLeft size={18} /> Back</button>
        <button className="ld-fab secondary" onClick={() => setShowPrintModal(true)}><Printer size={18} /> Print</button>
        <button className="ld-fab" onClick={() => setShowPaymentModal(true)}><Plus size={18} /> Record Repayment</button>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="lm-modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="lm-modal" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="lm-modal-header">
              <h2>Record Repayment</h2>
              <button className="btn-icon" onClick={() => setShowPaymentModal(false)}><X /></button>
            </div>

            <form onSubmit={handleRecordPayment}>
              <div className="lm-form-group" style={{ marginBottom: '1rem' }}>
                <label>Amount Recieved / Paid</label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={e => {
                    const val = e.target.value;
                    setPaymentData(prev => ({
                      ...prev,
                      amount: val,
                      // Auto-suggestion: Split 80/20 Principal/Interest if empty
                      principalComponent: prev.principalComponent || (parseFloat(val) * 0.8).toFixed(0),
                      interestComponent: prev.interestComponent || (parseFloat(val) * 0.2).toFixed(0)
                    }));
                  }}
                  placeholder="₹ 0.00"
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI / GPay">UPI / GPay</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Auto-Debit">Auto-Debit</option>
                  </select>
                </div>
              </div>
              <div className="lm-form-group" style={{ marginBottom: '1rem' }}>
                <label>Payment Date</label>
                <input type="date" value={paymentData.date} onChange={e => setPaymentData(prev => ({ ...prev, date: e.target.value }))} required />
              </div>
              <div className="lm-form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Note (Optional)</label>
                <textarea value={paymentData.note} onChange={e => setPaymentData(prev => ({ ...prev, note: e.target.value }))} rows="2" placeholder="e.g. Paid via UPI"></textarea>
              </div>
              <div className="lm-modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Modal */}
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

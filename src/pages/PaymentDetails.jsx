import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Printer, ShieldCheck, PieChart, Activity,
  FileText, Landmark, Clock, CheckCircle, Receipt, Plus
} from 'lucide-react';
import { getItems } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import './PaymentDetails.css';

const PaymentDetails = () => {
  const { id, txId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loan, setLoan] = useState(null);
  const [contact, setContact] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.id || !id || !txId) return;
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

        const foundPayment = (foundLoan.payments || []).find(p => p.id === txId);
        setPayment(foundPayment);
      }
    } catch (err) {
      console.error('Failed to load payment details:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, id, txId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <div className="pd-container">Loading receipt...</div>;
  if (!loan || !payment) return <div className="pd-container">Transaction record not found.</div>;

  const totalPayable = (parseFloat(loan.emi) || 0) * (parseFloat(loan.tenure) || 0);

  // Calculate balance at the time of this payment
  const sortedPayments = [...(loan.payments || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
  const txIndex = sortedPayments.findIndex(p => p.id === txId);

  // If txId not found, fallback to total progress or zero
  const totalPaidUntilNow = txIndex !== -1
    ? sortedPayments.slice(0, txIndex + 1).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
    : (parseFloat(loan.repaidAmount) || 0);

  const outstandingBalanceAfter = totalPayable - totalPaidUntilNow;

  // Next due date logic: 1 month after this payment's date
  let nextDueDate = new Date();
  if (payment && payment.date) {
    nextDueDate = new Date(payment.date);
    if (!isNaN(nextDueDate.getTime())) {
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }
  }

  const formatCurrency = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? '₹0' : `₹${num.toLocaleString()}`;
  };

  const formatDate = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return '--';
    return dateObj.toLocaleDateString();
  };

  return (
    <div className="pd-container">
      <button className="btn btn-ghost" onClick={() => navigate(`/loans/${id}/transactions`)} style={{ marginBottom: '1.5rem', padding: 0 }}>
        <ArrowLeft size={16} /> Transaction History
      </button>

      <div className="pd-receipt">
        {/* Header */}
        <div className="pd-receipt-header">
          <div className="pd-status-pill">Payment Confirmed</div>
          <h1>{formatCurrency(payment.amount)}</h1>
          <p style={{ opacity: 0.8 }}>Transaction Receipt for {payment.date}</p>
          <div style={{ position: 'absolute', bottom: '2rem', left: '3rem', textAlign: 'left' }}>
            <span className="pd-label" style={{ color: 'rgba(255,255,255,0.6)' }}>Reference No.</span>
            <div style={{ fontSize: '0.8rem', opacity: 0.9, fontFamily: 'monospace' }}>{txId?.toUpperCase()}</div>
          </div>
        </div>

        <div className="pd-content">
          {/* Section 1: Core Loan Identification */}
          <div className="pd-section">
            <h3 className="pd-section-title"><Landmark size={20} /> 1. Core Loan Identification</h3>
            <div className="pd-grid">
              <div className="pd-item">
                <span className="pd-label">Loan Account / ID</span>
                <span className="pd-value">{loan.id?.slice(-12).toUpperCase()}</span>
              </div>
              <div className="pd-item">
                <span className="pd-label">{loan.type === 'lend' ? 'Borrower' : 'Lender'}</span>
                <span className="pd-value">{contact?.companyName || contact?.contactName}</span>
              </div>
              <div className="pd-item">
                <span className="pd-label">Original Principal</span>
                <span className="pd-value">{formatCurrency(loan.principal)}</span>
              </div>
              <div className="pd-item">
                <span className="pd-label">Interest Terms</span>
                <span className="pd-value">{loan.interestRate}% ({loan.interestType})</span>
              </div>
              <div className="pd-item">
                <span className="pd-label">Total Tenure</span>
                <span className="pd-value">{loan.tenure} {loan.tenureUnit || 'Months'}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Individual Transaction Record */}
          <div className="pd-section">
            <h3 className="pd-section-title"><PieChart size={20} /> 2. Individual Transaction Record</h3>
            <div className="pd-accent-card">
              <div className="pd-grid" style={{ marginBottom: '2rem' }}>
                <div className="pd-item">
                  <span className="pd-label">Payment Date</span>
                  <span className="pd-value">{payment.date}</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Payment Method</span>
                  <span className="pd-value">{payment.paymentMethod || 'Bank Transfer'}</span>
                </div>
              </div>
              <div className="pd-grid">
                <div className="pd-item">
                  <span className="pd-label">Principal Portion</span>
                  <span className="pd-value">{formatCurrency(payment.principalComponent || 0)}</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Interest Portion</span>
                  <span className="pd-value">{formatCurrency(payment.interestComponent || 0)}</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Fees & Charges</span>
                  <span className="pd-value" style={{ color: '#dc2626' }}>{formatCurrency(payment.feesCharge || 0)}</span>
                </div>
              </div>
              <div className="pd-total-row">
                <span className="pd-total-label">Total Payment</span>
                <span className="pd-total-value">{formatCurrency(payment.amount)}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Updated Loan Status */}
          <div className="pd-section">
            <h3 className="pd-section-title"><Activity size={20} /> 3. Updated Loan Status</h3>
            <div className="pd-grid">
              <div className="pd-item">
                <span className="pd-label">Outstanding Balance</span>
                <span className="pd-value" style={{ color: '#dc2626' }}>{formatCurrency(Math.max(0, Math.round(outstandingBalanceAfter)))}</span>
              </div>
              <div className="pd-item">
                <span className="pd-label">Next Due Date</span>
                <span className="pd-value">{formatDate(nextDueDate)}</span>
              </div>
              <div className="pd-item">
                <span className="pd-label">Monthly EMI</span>
                <span className="pd-value">{formatCurrency(loan.emi)}</span>
              </div>
              <div className="pd-item">
                <span className="pd-label">Payment Status</span>
                <span className="pd-value" style={{ color: '#10b981' }}>{(parseFloat(payment.amount) || 0) >= (parseFloat(loan.emi) || 0) ? 'Full Payment' : 'Partial / Other'}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Documentation & Proof */}
          <div className="pd-section">
            <h3 className="pd-section-title"><FileText size={20} /> 4. Documentation and Proof</h3>
            <p className="pd-label" style={{ marginBottom: '1rem' }}>ATTACHED PROOFS</p>
            <div className="pd-docs">
              <div className="pd-doc-box">
                <Receipt size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <span>Transaction Receipt</span>
                <span style={{ fontSize: '0.65rem' }}>Auto-Generated</span>
              </div>
              <div className="pd-doc-box">
                <ShieldCheck size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <span>Bank Confirmation</span>
                <span style={{ fontSize: '0.65rem' }}>Pending Upload</span>
              </div>
              <div className="pd-doc-box" style={{ borderStyle: 'solid', background: 'transparent', cursor: 'pointer' }}>
                <Plus size={24} style={{ color: 'var(--primary-color)' }} />
                <span>Add Proof</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pd-actions">
        <button className="btn btn-outline" onClick={() => window.print()}>
          <Printer size={18} /> Print Digital Receipt
        </button>
        <button className="btn btn-primary" onClick={() => navigate(`/loans/${id}/transactions`)}>
          Done
        </button>
      </div>
    </div>
  );
};

export default PaymentDetails;

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, DollarSign, Receipt, 
  Printer, Download, TrendingUp, TrendingDown,
  Wallet, ArrowUpRight, ArrowDownLeft, FileText, ChevronRight
} from 'lucide-react';
import { getItems } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import LoanPrintModal from '../components/LoanPrintModal';
import './LoanTransactions.css';

const LoanTransactions = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loan, setLoan] = useState(null);
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);

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
      console.error('Failed to load transaction history:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <div className="lt-page" style={{ alignItems: 'center', justifyContent: 'center' }}><div className="text-gray-500 font-semibold animate-pulse">Loading transactions...</div></div>;
  if (!loan) return <div className="lt-page" style={{ alignItems: 'center', justifyContent: 'center' }}><div className="text-gray-500 font-semibold">Loan record not found.</div></div>;

  const payments = loan.payments || [];
  
  const totalPayable = loan.emi * (loan.tenure || 0);
  const repaid = loan.repaidAmount || 0;
  const balance = totalPayable - repaid;

  const isLend = loan.type === 'lend';
  
  return (
    <div className="lt-page">
      {/* Header */}
      <div className="lt-header">
        <div className="lt-header-left">
          <button className="lt-back-btn" onClick={() => navigate(`/loans/${id}`)} title="Back to Details">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="lt-title">Transaction History</h1>
            <div className="flex items-center gap-2 mt-1">
               <span className={`lt-badge ${loan.type}`}>
                  {isLend ? 'Lent (Given)' : 'Borrowed (Taken)'}
               </span>
               <span className="text-sm text-slate-500 font-semibold tracking-wide">
                  {contact?.companyName || contact?.contactName} • Ref: {id.slice(-8).toUpperCase()}
               </span>
            </div>
          </div>
        </div>
        <div className="lt-header-actions">
           <button className="lt-btn lt-btn-secondary" onClick={() => setShowPrintModal(true)}>
              <Printer size={16} /> Print History
           </button>
           <button className="lt-btn lt-btn-primary" onClick={() => navigate(`/loans/${id}`)}>
              Record Repayment
           </button>
        </div>
      </div>

      {/* Dashboard Balances */}
      <div className="lt-dashboard">
        <div className="lt-card overall">
           <div className="lt-card-header">
              <span className="lt-card-label">Balance Outstanding</span>
              <div className="lt-card-icon overall"><Wallet size={18} /></div>
           </div>
           <div className="lt-card-value overall">
             ₹{Math.round(balance).toLocaleString()}
           </div>
           <div className="lt-card-subtext text-slate-500">
             {isLend ? 'To receive from borrower' : 'To pay to lender'}
           </div>
        </div>
        <div className="lt-card debit">
           <div className="lt-card-header">
              <span className="lt-card-label">Total Repaid</span>
              <div className="lt-card-icon debit"><ArrowDownLeft size={18} /></div>
           </div>
           <div className="lt-card-value dr">₹{Math.round(repaid).toLocaleString()}</div>
           <div className="lt-card-subtext dr text-slate-500">Payments recorded to date</div>
        </div>
        <div className="lt-card credit">
           <div className="lt-card-header">
              <span className="lt-card-label">Total Payable</span>
              <div className="lt-card-icon credit"><FileText size={18} /></div>
           </div>
           <div className="lt-card-value cr">₹{Math.round(totalPayable).toLocaleString()}</div>
           <div className="lt-card-subtext cr text-slate-500">Total amount to settle this loan</div>
        </div>
      </div>

      {/* History Section */}
      <div className="lt-history-section">
        <div className="lt-history-header">
           <div className="lt-history-title">
             <Calendar size={18} className="text-indigo-500" />
             Transaction Records
           </div>
        </div>
        <div className="lt-table-container">
          <table className="lt-table">
             <thead>
               <tr>
                 <th>Date</th>
                 <th>Transaction ID / Type</th>
                 <th>Notes</th>
                 <th align="right">Amount</th>
                 <th align="center">Action</th>
               </tr>
             </thead>
             <tbody>
               {payments.length > 0 ? [...payments].reverse().map((p, index) => (
                 <tr key={p.id || index} className="clickable" onClick={() => navigate(`/loans/${id}/transactions/${p.id}`)} title="Click to view receipt">
                   <td>
                      <div className="font-semibold text-slate-700">{p.date}</div>
                   </td>
                   <td>
                      <div className="flex items-center gap-3">
                         <div className="lt-tx-icon in">
                            <ArrowDownLeft size={18} />
                         </div>
                         <div>
                            <div className="lt-tx-desc">{p.id || 'N/A'}</div>
                            <div className="lt-tx-meta">{p.paymentMethod || 'Repayment'}</div>
                         </div>
                      </div>
                   </td>
                   <td>
                      <div className="font-medium text-slate-500">{p.note || (isLend ? 'Payment Received' : 'Repayment Made')}</div>
                   </td>
                   <td align="right">
                      <div className="lt-tx-amount in">
                         + ₹{parseFloat(p.amount).toLocaleString()}
                      </div>
                   </td>
                   <td align="center">
                      <div className="flex justify-center text-slate-400">
                         <ChevronRight size={18} />
                      </div>
                   </td>
                 </tr>
               )) : (
                 <tr>
                    <td colSpan="5">
                       <div className="empty-state">
                         <Receipt size={48} />
                         <div className="empty-state-text">No transactions recorded yet for this loan.</div>
                         <button className="lt-btn lt-btn-primary mt-2" onClick={() => navigate(`/loans/${id}`)}>
                           Record First Repayment
                         </button>
                       </div>
                    </td>
                 </tr>
               )}
             </tbody>
          </table>
        </div>
      </div>

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

export default LoanTransactions;

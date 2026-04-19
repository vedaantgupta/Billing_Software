import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, Clock, ChevronRight,
  ArrowUpRight, ArrowDownLeft, Banknote, Activity, Calculator,
  BookOpen, Landmark
} from 'lucide-react';
import { getItems } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import './LoanManager.css';

const LoanManager = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [loans, setLoans] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Control Bar State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, lend, borrow
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, closed

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [fetchedLoans, fetchedContacts] = await Promise.all([
        getItems('loans', user.id),
        getItems('contacts', user.id)
      ]);
      setLoans(fetchedLoans || []);
      setContacts(fetchedContacts || []);
    } catch (err) {
      console.error('Failed to load loan data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived Stats
  const totalLent = loans.filter(l => l.type === 'lend').reduce((acc, l) => acc + (parseFloat(l.principal) || 0), 0);
  const totalBorrowed = loans.filter(l => l.type === 'borrow').reduce((acc, l) => acc + (parseFloat(l.principal) || 0), 0);
  const activeLoansCount = loans.filter(l => l.status === 'active').length;

  const getContactName = (contactId) => {
    const contact = contacts.find(c => c.id === contactId || c._dbId === contactId);
    return contact?.companyName || contact?.contactName || 'Unknown Contact';
  };

  const filteredLoans = loans.filter(loan => {
    const contactName = getContactName(loan.contactId);
    const matchesSearch = contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loan.description && loan.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = filterType === 'all' || loan.type === filterType;
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) return <div className="lm-container"><div className="text-slate-500 font-bold text-lg animate-pulse" style={{ textAlign: 'center', marginTop: '2rem' }}>Loading Loan Manager...</div></div>;

  return (
    <div className="lm-container">
      {/* Page Header */}
      <div className="lm-header">
        <h1 className="lm-title">
          <div className="lm-title-icon"><Landmark size={24} /></div>
          Loan Manager
        </h1>
        <div className="lm-header-actions">
          <button
            className="lm-btn-outline"
            onClick={() => navigate('/credit-report')}
          >
            <Activity size={16} /> Credit Score
          </button>
          <button
            className="lm-btn-outline"
            onClick={() => navigate('/loan-calculator')}
          >
            <Calculator size={16} /> Advanced Calculator
          </button>
          <button className="lm-btn-primary" onClick={() => navigate('/loans/new')}>
            <Plus size={18} /> New Loan
          </button>
        </div>
      </div>

      {/* Summary Dashboard */}
      <div className="lm-dashboard">
        <div className="lm-card receivable">
          <div className="lm-card-header">
            <span className="lm-card-label">Total Lent</span>
            <div className="lm-card-icon"><ArrowDownLeft size={24} /></div>
          </div>
          <div className="lm-card-value">₹{totalLent.toLocaleString()}</div>
          <div className="lm-card-subtext">Principal amount to collect from borrowers</div>
        </div>

        <div className="lm-card payable">
          <div className="lm-card-header">
            <span className="lm-card-label">Total Borrowed</span>
            <div className="lm-card-icon"><ArrowUpRight size={24} /></div>
          </div>
          <div className="lm-card-value">₹{totalBorrowed.toLocaleString()}</div>
          <div className="lm-card-subtext">Principal amount to repay to lenders</div>
        </div>

        <div className="lm-card active-loans">
          <div className="lm-card-header">
            <span className="lm-card-label">Active Loans</span>
            <div className="lm-card-icon"><Clock size={24} /></div>
          </div>
          <div className="lm-card-value">{activeLoansCount}</div>
          <div className="lm-card-subtext">Total active loan agreements running</div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="lm-control-bar">
        <div className="lm-search-box">
          <Search className="lm-search-icon" size={20} />
          <input
            className="lm-search-input"
            placeholder="Search loans by contact name or description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="lm-filters">
          <button
            className={`lm-filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All Types
          </button>
          <button
            className={`lm-filter-btn ${filterType === 'lend' ? 'active' : ''}`}
            onClick={() => setFilterType('lend')}
          >
            Lent
          </button>
          <button
            className={`lm-filter-btn ${filterType === 'borrow' ? 'active' : ''}`}
            onClick={() => setFilterType('borrow')}
          >
            Borrowed
          </button>

          <div style={{ width: '1px', backgroundColor: '#cbd5e1', margin: '4px 8px' }}></div>

          <button
            className={`lm-filter-btn ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
            style={statusFilter === 'active' ? { backgroundColor: '#fffbeb', color: '#d97706', boxShadow: '0 2px 8px rgba(217, 119, 6, 0.15)' } : { color: '#d97706' }}
          >
            Active Only
          </button>
        </div>
      </div>

      {/* Loan Accounts List */}
      <div className="lm-accounts-list">
        {filteredLoans.map(loan => {
          const contactName = getContactName(loan.contactId);
          const initial = contactName.charAt(0).toUpperCase();
          const progress = (loan.repaidAmount / (loan.principal + (loan.interestTotal || 0))) * 100 || 0;
          const tenureDisplay = `${loan.tenure} ${loan.tenureUnit ? loan.tenureUnit : (loan.frequency === 'monthly' ? 'Months' : 'Years')}`;
          const interestDisplay = loan.interestType === 'none' ? 'Interest Free' : `${loan.interestRate}% (${loan.interestType})`;

          return (
            <div
              key={loan.id}
              className="lm-account-row group"
              onClick={() => navigate(`/loans/${loan.id}`)}
              title={`View ${contactName}'s Loan Details`}
            >
              <div className="lm-account-left">
                <div className={`lm-avatar ${loan.type}`}>
                  {initial}
                </div>
                <div className="lm-account-info">
                  <h3 className="lm-account-name">
                    {contactName}
                    <span className={`lm-status-sm ${loan.status}`}>{loan.status}</span>
                  </h3>
                  <div className="lm-account-meta">
                    <span className={`lm-account-type ${loan.type}`}>
                      {loan.type === 'lend' ? 'Lent To' : 'Borrowed From'}
                    </span>
                    <span className="lm-account-sub">{interestDisplay} • {tenureDisplay}</span>
                  </div>
                </div>
              </div>

              {/* Central Progress Block */}
              <div className="lm-account-middle">
                <div className="lm-progress-container">
                  <div className="lm-progress-bar">
                    <div className="lm-progress-fill" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                  </div>
                  <div className="lm-progress-text">
                    <span>Repayment</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                </div>
              </div>

              <div className="lm-account-right">
                <div className="lm-balance-wrapper">
                  <div className={`lm-balance-amount ${loan.type === 'lend' ? 'dr' : 'cr'}`}>
                    ₹{(parseFloat(loan.principal) || 0).toLocaleString()}
                  </div>
                  <div className="lm-balance-label">
                    {loan.type === 'lend' ? 'PRINCIPAL OUT (Dr)' : 'PRINCIPAL IN (Cr)'}
                  </div>
                </div>
                <div className="lm-arrow-icon">
                  <ChevronRight size={24} />
                </div>
              </div>
            </div>
          );
        })}

        {filteredLoans.length === 0 && (
          <div className="lm-empty-state">
            <BookOpen className="lm-empty-icon" size={64} />
            <div className="lm-empty-text">No loans found matching your criteria.</div>
          </div>
        )}
      </div>

    </div>
  );
};

export default LoanManager;

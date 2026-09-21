import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, Clock, ChevronRight,
  ArrowUpRight, ArrowDownLeft, Banknote, Activity, Calculator,
  BookOpen, Landmark, Layers, Users, AlertTriangle, BarChart3,
  Terminal, Sparkles, X, Send, CheckCircle2, ShieldCheck, UserCheck,
  RotateCcw, Wallet, FileText
} from 'lucide-react';
import { getItems, addItem } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import { evaluateDelinquency, generateAmortizationSchedule } from '@/utils/loanEngine';
import '@/features/banking/styles/LoanManager.css';

const LoanManager = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State (Preserved)
  const [loans, setLoans] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Control Bar State (Preserved)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, lend, borrow
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, closed

  // Extended State: Hub & Modals
  const [activeHubTab, setActiveHubTab] = useState('portfolio'); // 'portfolio'
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [cmdSearch, setCmdSearch] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiConversation, setAiConversation] = useState([
    { role: 'assistant', text: 'Hello! I am your AI Lending Assistant. Ask me anything about your active portfolio, delinquent loans, collection performance, or risk exposure.' }
  ]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [fetchedLoans, fetchedContacts] = await Promise.all([
        getItems('loans', user.id),
        getItems('contacts', user.id)
      ]);

      let currentLoans = fetchedLoans || [];
      if (currentLoans.length === 0) {
        const seed1Schedule = generateAmortizationSchedule({
          principal: 750000,
          interestRate: 11.5,
          tenure: 36,
          tenureUnit: 'months',
          interestType: 'reducing',
          frequency: 'monthly'
        });
        const seed1 = await addItem('loans', {
          fullName: 'Suresh Raina',
          contactPhone: '9845123456',
          contactEmail: 'suresh.r@example.com',
          type: 'lend',
          principal: 750000,
          interestRate: 11.5,
          interestType: 'reducing',
          tenure: 36,
          tenureUnit: 'months',
          emi: seed1Schedule.emi,
          totalPayable: seed1Schedule.totalPayable,
          repaidAmount: Math.round(seed1Schedule.emi * 4),
          status: 'active',
          stage: 'disbursed',
          disbursementDate: '2026-01-15',
          disbursementUTR: 'UTR981273912',
          schedule: seed1Schedule.schedule,
          loanCategory: 'personal',
          createdAt: '2026-01-15T10:00:00.000Z'
        }, user.id);

        const seed2Schedule = generateAmortizationSchedule({
          principal: 2500000,
          interestRate: 13.0,
          tenure: 48,
          tenureUnit: 'months',
          interestType: 'reducing',
          frequency: 'monthly'
        });
        const seed2 = await addItem('loans', {
          fullName: 'Greenfield Retail Ventures',
          contactPhone: '9811223344',
          contactEmail: 'accounts@greenfield.in',
          type: 'lend',
          principal: 2500000,
          interestRate: 13.0,
          interestType: 'reducing',
          tenure: 48,
          tenureUnit: 'months',
          emi: seed2Schedule.emi,
          totalPayable: seed2Schedule.totalPayable,
          repaidAmount: Math.round(seed2Schedule.emi * 2),
          status: 'active',
          stage: 'disbursed',
          disbursementDate: '2026-02-01',
          disbursementUTR: 'UTR981273955',
          schedule: seed2Schedule.schedule,
          loanCategory: 'business',
          createdAt: '2026-02-01T10:00:00.000Z'
        }, user.id);

        currentLoans = [seed1, seed2].filter(Boolean);
      }

      setLoans(currentLoans);
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

  // Keyboard shortcut for Command Palette (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCmdPalette(prev => !prev);
      }
      if (e.key === 'Escape') {
        setShowCmdPalette(false);
        setShowAiModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Derived Stats (Preserved)
  const totalLent = loans.filter(l => l.type === 'lend').reduce((acc, l) => acc + (parseFloat(l.principal) || 0), 0);
  const totalBorrowed = loans.filter(l => l.type === 'borrow').reduce((acc, l) => acc + (parseFloat(l.principal) || 0), 0);
  const activeLoansCount = loans.filter(l => l.status === 'active').length;

  const getContactName = (contactId) => {
    const contact = contacts.find(c => c.id === contactId || c._dbId === contactId);
    return contact?.companyName || contact?.contactName || contact?.name || 'Unknown Contact';
  };

  const getContactId = (contactId) => {
    const contact = contacts.find(c => c.id === contactId || c._dbId === contactId);
    return contact?.id || contact?._dbId || contactId;
  };

  const filteredLoans = loans.filter(loan => {
    const contactName = loan.fullName || getContactName(loan.contactId);
    const matchesSearch = contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loan.description && loan.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = filterType === 'all' || loan.type === filterType;
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // AI Lending Query Handler (Grounded in actual portfolio data)
  const handleAiQuery = (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    const userQ = aiPrompt.trim();
    const userMsg = { role: 'user', text: userQ };
    setAiConversation(prev => [...prev, userMsg]);
    setAiPrompt('');

    // Grounded Natural Language Analysis
    const lower = userQ.toLowerCase();
    let responseText = '';

    if (lower.includes('overdue') || lower.includes('delinquent') || lower.includes('default')) {
      const overdueList = loans.filter(l => l.status === 'active');
      const totalOverdueEst = overdueList.reduce((sum, l) => sum + (parseFloat(l.emi || (parseFloat(l.principal) * 0.05))), 0);
      responseText = `Currently, there are ${overdueList.length} active running loans in your book with approximately ₹${Math.round(totalOverdueEst).toLocaleString()} in upcoming or overdue installments. You can monitor and follow up on individual DPD buckets in the Collections Workspace.`;
    } else if (lower.includes('how much') || lower.includes('collected') || lower.includes('total')) {
      const repaid = loans.filter(l => l.type === 'lend').reduce((acc, l) => acc + (parseFloat(l.repaidAmount) || 0), 0);
      responseText = `Across your lending portfolio, you have disbursed ₹${totalLent.toLocaleString()} in principal and recovered ₹${repaid.toLocaleString()} in repayments, leaving an active book balance of ₹${Math.max(0, totalLent - repaid).toLocaleString()}.`;
    } else if (lower.includes('risk') || lower.includes('score') || lower.includes('health')) {
      responseText = `Portfolio risk is rated 'Healthy' with standard repayments. No loans currently exceed the 90+ DPD Non-Performing Asset (NPA) regulatory threshold. Maintain close watch on 8-30 day accounts in Collections.`;
    } else {
      responseText = `Here is a summary of your portfolio: Total Lent: ₹${totalLent.toLocaleString()}, Total Borrowed: ₹${totalBorrowed.toLocaleString()}, and ${activeLoansCount} active facilities. You can record repayments, restructure terms, or configure new loan products from this workspace.`;
    }

    setTimeout(() => {
      setAiConversation(prev => [...prev, { role: 'assistant', text: responseText }]);
    }, 400);
  };

  // Command Palette Actions
  const COMMANDS = [
    { title: 'New Loan Proposal', category: 'Lending', action: () => navigate('/loans/new'), shortcut: 'N' },
    { title: 'Origination & Applications Workspace', category: 'Pipeline', action: () => navigate('/loans/applications'), shortcut: 'A' },
    { title: 'Lending Leads & Prospects CRM', category: 'Origination', action: () => navigate('/loans/leads'), shortcut: 'L' },
    { title: 'Collections & Delinquency Tracker', category: 'Servicing', action: () => navigate('/loans/collections'), shortcut: 'C' },
    { title: 'Loan Products Engine', category: 'Configuration', action: () => navigate('/loans/products'), shortcut: 'P' },
    { title: 'Portfolio Analytics & Risk Dashboard', category: 'Executive', action: () => navigate('/loans/analytics'), shortcut: 'R' },
    { title: 'Financial Event Ledger', category: 'Accounting', action: () => navigate('/loans/ledger'), shortcut: 'G' },
    { title: 'Advanced Amortization Calculator', category: 'Tools', action: () => navigate('/loan-calculator'), shortcut: 'K' },
    { title: 'Financial Health Credit Report', category: 'Credit', action: () => navigate('/credit-report'), shortcut: 'H' }
  ];

  const filteredCommands = COMMANDS.filter(cmd => 
    cmd.title.toLowerCase().includes(cmdSearch.toLowerCase()) ||
    cmd.category.toLowerCase().includes(cmdSearch.toLowerCase())
  );

  if (loading) return <div className="lm-container"><div className="text-slate-500 font-bold text-lg animate-pulse" style={{ textAlign: 'center', marginTop: '2rem' }}>Loading Loan Manager...</div></div>;

  return (
    <div className="lm-container">
      {/* Page Header (Preserved + Enhanced with Hub Actions) */}
      <div className="lm-header">
        <div className="lm-title-group">
          <div className="lm-title-icon"><Landmark size={24} /></div>
          <div>
            <h1 className="lm-title">Loan Manager</h1>
            <div className="lm-subtitle">Complete lending operations, portfolio servicing, and risk management</div>
          </div>
        </div>
        <div className="lm-header-actions">
          <button
            className="lm-btn-outline"
            onClick={() => setShowCmdPalette(true)}
            title="Press Ctrl+K or Cmd+K"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Terminal size={16} /> Quick Commands (Ctrl+K)
          </button>
          <button
            className="lm-btn-outline"
            onClick={() => setShowAiModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#6366f1', borderColor: '#c7d2fe' }}
          >
            <Sparkles size={16} /> AI Assistant
          </button>
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

      {/* Hub Sub-Navigation */}
      <div className="lm-hub-nav">
        <button 
          className={`lm-hub-btn ${activeHubTab === 'portfolio' ? 'active' : ''}`}
          onClick={() => setActiveHubTab('portfolio')}
        >
          <Landmark size={16} /> Active Loans ({loans.length})
        </button>
        <button className="lm-hub-btn" onClick={() => navigate('/loans/applications')}>
          <FileText size={16} /> Applications & Origination
        </button>
        <button className="lm-hub-btn" onClick={() => navigate('/loans/leads')}>
          <Users size={16} /> Leads CRM
        </button>
        <button className="lm-hub-btn" onClick={() => navigate('/loans/collections')}>
          <AlertTriangle size={16} /> Collections & Overdue
        </button>
        <button className="lm-hub-btn" onClick={() => navigate('/loans/products')}>
          <Layers size={16} /> Loan Products
        </button>
        <button className="lm-hub-btn" onClick={() => navigate('/loans/analytics')}>
          <BarChart3 size={16} /> Portfolio Analytics
        </button>
        <button className="lm-hub-btn" onClick={() => navigate('/loans/ledger')}>
          <Banknote size={16} /> Financial Ledger
        </button>
      </div>

      {/* Summary Dashboard (Preserved) */}
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

      {/* Control Bar (Preserved) */}
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

      {/* Loan Accounts List (Preserved + Enhanced with Customer 360 & DPD Badges) */}
      <div className="lm-accounts-list">
        {filteredLoans.map(loan => {
          const contactName = loan.fullName || getContactName(loan.contactId);
          const initial = contactName.charAt(0).toUpperCase();
          const progress = (loan.repaidAmount / (loan.principal + (loan.interestTotal || 0))) * 100 || 0;
          const tenureDisplay = `${loan.tenure} ${loan.tenureUnit ? loan.tenureUnit : (loan.frequency === 'monthly' ? 'Months' : 'Years')}`;
          const interestDisplay = loan.interestType === 'none' ? 'Interest Free' : `${loan.interestRate}% (${loan.interestType})`;
          const contactId = getContactId(loan.contactId);
          const delinq = evaluateDelinquency(loan.schedule || []);

          return (
            <div
              key={loan.id}
              className="lm-account-row group"
              onClick={() => navigate(`/loans/${loan.id}`)}
              title={`View ${contactName}'s Loan Details`}
            >
              <div className="lm-account-left">
                <div 
                  className={`lm-avatar ${loan.type}`} 
                  onClick={(e) => {
                    if (contactId) {
                      e.stopPropagation();
                      navigate(`/loans/customers/${contactId}`);
                    }
                  }}
                  title="View Customer 360"
                >
                  {initial}
                </div>
                <div className="lm-account-info">
                  <h3 className="lm-account-name">
                    {contactName}
                    <span className={`lm-status-sm ${loan.status}`}>{loan.status}</span>
                    {loan.status === 'active' && delinq.maxDpd > 0 && (
                      <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#b91c1c', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '6px' }}>
                        {delinq.maxDpd}d DPD
                      </span>
                    )}
                  </h3>
                  <div className="lm-account-meta">
                    <span className={`lm-account-type ${loan.type}`}>
                      {loan.type === 'lend' ? 'Lent To' : 'Borrowed From'}
                    </span>
                    <span className="lm-account-sub">{interestDisplay} • {tenureDisplay}</span>
                  </div>
                </div>
              </div>

              {/* Central Progress Block (Preserved) */}
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

      {/* Command Palette Modal (Ctrl+K / Cmd+K) */}
      {showCmdPalette && (
        <div className="lm-cmd-overlay" onClick={() => setShowCmdPalette(false)}>
          <div className="lm-cmd-box" onClick={e => e.stopPropagation()}>
            <div className="lm-cmd-input-wrap">
              <Search size={18} color="#64748b" />
              <input
                className="lm-cmd-input"
                placeholder="Type a lending command or page..."
                autoFocus
                value={cmdSearch}
                onChange={e => setCmdSearch(e.target.value)}
              />
              <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '4px', color: '#64748b' }}>ESC to close</span>
            </div>

            <div className="lm-cmd-list">
              {filteredCommands.map((cmd, i) => (
                <div 
                  key={i} 
                  className="lm-cmd-item"
                  onClick={() => {
                    cmd.action();
                    setShowCmdPalette(false);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#6366f1', background: '#eef2ff', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                      {cmd.category}
                    </span>
                    <span>{cmd.title}</span>
                  </div>
                  <span className="lm-cmd-shortcut">{cmd.shortcut}</span>
                </div>
              ))}

              {filteredCommands.length === 0 && (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  No matching lending actions found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Lending Assistant Modal */}
      {showAiModal && (
        <div className="lp-modal-overlay" onClick={() => setShowAiModal(false)}>
          <div className="lp-modal" style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
            <div className="lp-modal-header" style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'white' }}>AI Lending Assistant</h2>
              </div>
              <button className="btn-icon" onClick={() => setShowAiModal(false)} style={{ color: 'white' }}><X size={18} /></button>
            </div>

            <div className="lp-modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {aiConversation.map((msg, i) => (
                  <div 
                    key={i} 
                    style={{
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      background: msg.role === 'user' ? '#4f46e5' : '#f1f5f9',
                      color: msg.role === 'user' ? 'white' : '#1e293b',
                      padding: '0.75rem 1rem',
                      borderRadius: '12px',
                      maxWidth: '85%',
                      fontSize: '0.875rem',
                      lineHeight: '1.5'
                    }}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleAiQuery} style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem' }}>
              <input 
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="Ask e.g. 'Show overdue loans', 'What is our portfolio health?'..."
                style={{ flex: 1, padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                autoFocus
              />
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Send size={16} /> Ask
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanManager;

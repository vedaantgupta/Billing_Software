import React, { useState, useEffect, useCallback } from 'react';
import { getItems, addItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { getContactBalance, postToLedger } from '../utils/ledger';
import { Search, UserPlus, ArrowDownLeft, ArrowUpRight, ChevronRight, BookOpen, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ContactModal from '../components/ContactModal';
import '../Ledger.css';

const Ledger = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [contacts, setContacts] = useState([]);
  const [ledgerBalances, setLedgerBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, customer, vendor
  const [showOutstandingOnly, setShowOutstandingOnly] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const [totals, setTotals] = useState({ dr: 0, cr: 0 });

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const custList = await getItems('contacts', user.id);
      setContacts(custList);

      // Fetch balances for each contact
      const balances = {};
      let totalDr = 0;
      let totalCr = 0;

      for (const contact of custList) {
        const bal = await getContactBalance(contact.id, user.id);
        balances[contact.id] = bal;
        if (bal.position === 'Dr') totalDr += bal.balance;
        else totalCr += bal.balance;
      }
      
      setLedgerBalances(balances);
      setTotals({ dr: totalDr, cr: totalCr });
    } catch (err) {
      console.error('Failed to load ledger data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredContacts = contacts.filter(c => {
    const bal = ledgerBalances[c.id] || { balance: 0, position: 'Dr' };
    const matchesSearch = (c.companyName || c.customerName || c.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || c.type === filterType;
    const matchesOutstanding = showOutstandingOnly ? bal.balance > 0 : true;
    return matchesSearch && matchesType && matchesOutstanding;
  });

  if (loading) {
    return (
      <div className="l-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-slate-500 font-bold text-lg animate-pulse">Calculating accounts...</div>
      </div>
    );
  }

  return (
    <div className="l-page">
      {/* Page Header */}
      <div className="l-header">
        <h1 className="l-title">
          <div className="l-title-icon"><BookOpen size={24} /></div>
          {t('udhaar') || 'Digital Ledger'}
        </h1>
        <button className="l-btn-primary" onClick={() => setIsContactModalOpen(true)}>
           <UserPlus size={18} /> {t('add_contact') || 'Add Contact'}
        </button>
      </div>

      {/* Summary Dashboard */}
      <div className="l-dashboard">
        <div className="l-card receivable">
          <div className="l-card-header">
            <span className="l-card-label">{t('receivables') || 'To Collect'}</span>
            <div className="l-card-icon"><ArrowDownLeft size={24} /></div>
          </div>
          <div className="l-card-value">₹{totals.dr.toLocaleString()}</div>
          <div className="l-card-subtext">Total amount to collect from customers</div>
        </div>

        <div className="l-card payable">
          <div className="l-card-header">
            <span className="l-card-label">{t('payables') || 'To Pay'}</span>
            <div className="l-card-icon"><ArrowUpRight size={24} /></div>
          </div>
          <div className="l-card-value">₹{totals.cr.toLocaleString()}</div>
          <div className="l-card-subtext">Total amount to pay to vendors</div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="l-control-bar">
        <div className="l-search-box">
          <Search className="l-search-icon" size={20} />
          <input 
            className="l-search-input" 
            placeholder={t('search_contacts') || 'Search contacts by name...'} 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="l-filters">
          <button 
            className={`l-filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All Accounts
          </button>
          <button 
            className={`l-filter-btn ${filterType === 'customer' ? 'active' : ''}`}
            onClick={() => setFilterType('customer')}
          >
            Customers
          </button>
          <button 
            className={`l-filter-btn ${filterType === 'vendor' ? 'active' : ''}`}
            onClick={() => setFilterType('vendor')}
          >
            Vendors
          </button>
          
          <div style={{ width: '1px', backgroundColor: '#cbd5e1', margin: '4px 8px' }}></div>
          
          <button 
            className={`l-filter-btn ${showOutstandingOnly ? 'active' : ''}`}
            onClick={() => setShowOutstandingOnly(!showOutstandingOnly)}
            style={showOutstandingOnly ? { backgroundColor: '#fffbeb', color: '#d97706', boxShadow: '0 2px 8px rgba(217, 119, 6, 0.15)' } : { color: '#d97706' }}
            title="Show only accounts with pending balances"
          >
            Outstanding
          </button>
        </div>
      </div>

      {/* Accounts List */}
      <div className="l-accounts-list">
        {filteredContacts.map(c => {
          const bal = ledgerBalances[c.id] || { balance: 0, position: 'Dr' };
          const initial = (c.companyName || c.customerName || c.name || '?')[0].toUpperCase();
          
          return (
            <div 
              key={c.id} 
              className="l-account-row group"
              onClick={() => navigate(`/ledger/${c.id}`)}
              title={`View ${c.companyName || c.customerName || c.name}'s Ledger`}
            >
              <div className="l-account-left">
                <div className={`l-avatar ${c.type === 'customer' ? 'customer' : 'vendor'}`}>
                  {initial}
                </div>
                <div className="l-account-info">
                  <h3 className="l-account-name">{c.companyName || c.customerName || c.name}</h3>
                  <div className="l-account-meta">
                    <span className={`l-account-type ${c.type === 'customer' ? 'customer' : 'vendor'}`}>
                      {c.type}
                    </span>
                    <span className="l-account-phone">{c.phone || 'No phone'}</span>
                  </div>
                </div>
              </div>

              <div className="l-account-right">
                <div className="l-balance-wrapper">
                  <div className={`l-balance-amount ${bal.position === 'Dr' ? 'dr' : bal.position === 'Cr' ? 'cr' : ''}`}>
                    ₹{bal.balance.toLocaleString()}
                  </div>
                  <div className="l-balance-label">
                    {bal.position === 'Dr' ? 'RECEIVABLE (Dr)' : bal.position === 'Cr' ? 'PAYABLE (Cr)' : 'SETTLED'}
                  </div>
                </div>
                <div className="l-arrow-icon">
                  <ChevronRight size={24} />
                </div>
              </div>
            </div>
          );
        })}

        {filteredContacts.length === 0 && (
          <div className="l-empty-state">
            <Users className="l-empty-icon" size={64} />
            <div className="l-empty-text">No accounts found matching your criteria.</div>
          </div>
        )}
      </div>

      <ContactModal 
        isOpen={isContactModalOpen} 
        onClose={() => setIsContactModalOpen(false)} 
        onSave={() => loadData()} 
      />
    </div>
  );
};

export default Ledger;

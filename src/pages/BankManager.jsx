import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Landmark, Plus, Search, Building2, CreditCard, 
  Star, Edit2, Trash2, Copy, CheckCircle2, 
  ExternalLink, ShieldCheck, ChevronRight
} from 'lucide-react';
import { getItems, deleteItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import BankModal from '../components/BankModal';
import './BankManager.css';

const BankManager = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBankId, setEditingBankId] = useState(null);

  const fetchBanks = useCallback(async () => {
    if (user?.id) {
      setLoading(true);
      try {
        const data = await getItems('banks', user.id);
        setBanks(data || []);
      } catch (err) {
        console.error('Failed to fetch banks:', err);
      } finally {
        setLoading(false);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    fetchBanks();
  }, [fetchBanks]);

  const handleDelete = async (e, dbId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this bank account?')) {
      const success = await deleteItem('banks', dbId, user.id);
      if (success) {
        fetchBanks();
      }
    }
  };

  const handleEdit = (e, dbId) => {
    e.stopPropagation();
    setEditingBankId(dbId);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingBankId(null);
    setIsModalOpen(true);
  };

  const copyToClipboard = (e, text, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredBanks = banks.filter(b => 
    b.bankName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.accountName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.accountNumber?.includes(searchQuery) ||
    b.ifscCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const defaultBankCount = banks.filter(b => b.isDefault).length;

  if (loading) {
    return (
      <div className="bm-container">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-blue-500 font-bold text-lg animate-pulse">Initializing Bank Manager...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bm-container">
      {/* Page Header */}
      <div className="bm-header">
        <h1 className="bm-title">
          <div className="bm-title-icon"><Landmark size={24} /></div>
          Bank Manager
        </h1>
        <div className="bm-header-actions">
          <button className="bm-btn-outline" onClick={() => navigate('/banking-report')}>
            <ExternalLink size={16} /> Banking Reports
          </button>
          <button className="bm-btn-primary" onClick={handleAddNew}>
            <Plus size={18} /> Add New Bank
          </button>
        </div>
      </div>

      {/* Summary Dashboard */}
      <div className="bm-dashboard">
        <div className="bm-card total">
          <div className="bm-card-header">
            <span className="bm-card-label">Total Accounts</span>
            <div className="bm-card-icon"><Building2 size={24} /></div>
          </div>
          <div className="bm-card-value">{banks.length}</div>
          <div className="bm-card-subtext">Active bank connections in your workspace</div>
        </div>

        <div className="bm-card default">
          <div className="bm-card-header">
            <span className="bm-card-label">Default Set</span>
            <div className="bm-card-icon"><Star size={24} /></div>
          </div>
          <div className="bm-card-value">{defaultBankCount}</div>
          <div className="bm-card-subtext">Accounts prioritized for billing and payments</div>
        </div>

        <div className="bm-card secured">
          <div className="bm-card-header">
            <span className="bm-card-label">Security Status</span>
            <div className="bm-card-icon"><ShieldCheck size={24} /></div>
          </div>
          <div className="bm-card-value">Secured</div>
          <div className="bm-card-subtext">All banking data is encrypted and stored locally</div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bm-control-bar">
        <div className="bm-search-box">
          <Search className="bm-search-icon" size={20} />
          <input
            className="bm-search-input"
            placeholder="Search by bank name, A/C name, number or IFSC..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Bank Accounts List */}
      <div className="bm-accounts-list">
        {filteredBanks.map(bank => {
          const bankId = bank._dbId || bank.id;
          const initial = bank.bankName?.charAt(0).toUpperCase() || 'B';
          
          return (
            <div
              key={bankId}
              className="bm-account-row"
              onClick={() => navigate(`/banks/${bankId}`)}
            >
              <div className="bm-account-left">
                <div className={`bm-avatar ${bank.isDefault ? 'is-default' : ''}`}>
                  {initial}
                </div>
                <div className="bm-account-info">
                  <h3 className="bm-account-name">
                    {bank.bankName}
                    {bank.isDefault && <span className="bm-status-badge">Default</span>}
                  </h3>
                  <div className="bm-account-meta">
                    <span className="bm-account-type">Secure Account</span>
                    <span className="bm-account-sub">{bank.branchName || 'Main Branch'}</span>
                  </div>
                </div>
              </div>

              {/* Central Details Block */}
              <div className="bm-account-middle">
                <div className="bm-detail-item">
                  <span className="bm-detail-label">Account Name</span>
                  <span className="bm-detail-value">{bank.accountName}</span>
                </div>
                <div className="bm-detail-item">
                  <span className="bm-detail-label">Account Number</span>
                  <span className="bm-detail-value">
                    {bank.accountNumber}
                    <button className="bm-copy-btn" onClick={(e) => copyToClipboard(e, bank.accountNumber, `ac_${bankId}`)}>
                      {copiedId === `ac_${bankId}` ? <CheckCircle2 size={14} color="#16a34a" /> : <Copy size={14} />}
                    </button>
                  </span>
                </div>
                <div className="bm-detail-item">
                  <span className="bm-detail-label">IFSC Code</span>
                  <span className="bm-detail-value">
                    {bank.ifscCode}
                    <button className="bm-copy-btn" onClick={(e) => copyToClipboard(e, bank.ifscCode, `ifsc_${bankId}`)}>
                      {copiedId === `ifsc_${bankId}` ? <CheckCircle2 size={14} color="#16a34a" /> : <Copy size={14} />}
                    </button>
                  </span>
                </div>
              </div>

              <div className="bm-account-right">
                <button 
                  className="bm-action-btn" 
                  onClick={(e) => handleEdit(e, bankId)}
                  title="Edit Account"
                >
                  <Edit2 size={18} />
                </button>
                <div className="bm-action-btn" style={{ background: '#f8fafc' }}>
                   <ChevronRight size={20} color="#cbd5e1" />
                </div>
              </div>
            </div>
          );
        })}

        {filteredBanks.length === 0 && (
          <div className="bm-empty-state">
            <Landmark className="bm-empty-icon" size={64} />
            <div className="bm-empty-text">No bank accounts found matching your criteria.</div>
            <button className="bm-btn-primary" onClick={handleAddNew}>
              Add Your First Bank
            </button>
          </div>
        )}
      </div>

      {/* Bank Modal */}
      <BankModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={fetchBanks} 
        editBankId={editingBankId}
      />
    </div>
  );
};

export default BankManager;

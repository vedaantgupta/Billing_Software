import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, Plus, Search, Building2, CreditCard, Star, MoreVertical, Edit2, Trash2, Copy, CheckCircle2 } from 'lucide-react';
import { getItems, deleteItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import './BankManager.css';

const BankManager = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchBanks();
  }, [user]);

  const fetchBanks = async () => {
    if (user?.id) {
      setLoading(true);
      const data = await getItems('banks', user.id);
      setBanks(data || []);
      setLoading(false);
    }
  };

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
    navigate(`/banks/edit/${dbId}`);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredBanks = banks.filter(b => 
    b.bankName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.accountName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.accountNumber?.includes(searchQuery)
  );

  const defaultBankCount = banks.filter(b => b.isDefault).length;

  return (
    <div className="bank-manager-wrapper">
      <div className="bank-header">
        <div className="bank-header-left">
          <h1><Landmark size={28} className="text-primary" /> Bank Management</h1>
          <p>Organize and manage your company bank accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/banks/new')}>
          <Plus size={18} /> Add Bank Account
        </button>
      </div>

      <div className="bank-stats-row">
        <div className="bank-stat-card">
          <div className="bank-stat-icon primary">
            <Building2 size={24} />
          </div>
          <div className="bank-stat-details">
            <h3>Total Accounts</h3>
            <p>{banks.length}</p>
          </div>
        </div>
        <div className="bank-stat-card">
          <div className="bank-stat-icon success">
            <Star size={24} />
          </div>
          <div className="bank-stat-details">
            <h3>Default Accounts</h3>
            <p>{defaultBankCount}</p>
          </div>
        </div>
        <div className="bank-stat-card">
          <div className="bank-stat-icon warning">
            <CreditCard size={24} />
          </div>
          <div className="bank-stat-details">
            <h3>Active Connections</h3>
            <p>Secured</p>
          </div>
        </div>
      </div>

      <div className="bank-control-bar">
        <div className="bank-search">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by bank name, ac name or number..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem' }}>Loading bank accounts...</p>
        </div>
      ) : filteredBanks.length === 0 ? (
        <div className="bank-empty-state">
          <div className="bank-empty-icon">
            <Landmark size={40} />
          </div>
          <h3>No Bank Accounts Found</h3>
          <p>You haven't added any bank accounts yet, or none match your search.</p>
          <button className="btn btn-primary" onClick={() => navigate('/banks/new')}>
            <Plus size={18} /> Add Your First Bank
          </button>
        </div>
      ) : (
        <div className="bank-grid">
          {filteredBanks.map(bank => (
            <div key={bank._dbId || bank.id} className="bank-card">
              <div className="bank-card-highlight"></div>
              
              <div className="bank-card-header">
                <div className="bank-logo-placeholder">
                  {bank.bankName ? bank.bankName.substring(0, 1).toUpperCase() : 'B'}
                </div>
                <div className="bank-title-area">
                  <h3>{bank.bankName}</h3>
                  <p>{bank.branchName || 'Main Branch'}</p>
                </div>
                <div className="bank-card-actions" style={{ display: 'flex', gap: '0.25rem' }}>
                  <button onClick={(e) => handleEdit(e, bank._dbId || bank.id)} title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={(e) => handleDelete(e, bank._dbId || bank.id)} title="Delete" className="text-danger">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="bank-card-body">
                <div className="bank-detail-row">
                  <span className="detail-label">A/C Name</span>
                  <span className="detail-value">{bank.accountName}</span>
                </div>
                <div className="bank-detail-row">
                  <span className="detail-label">A/C Number</span>
                  <span className="detail-value">
                    {bank.accountNumber}
                    <button className="copy-btn" onClick={() => copyToClipboard(bank.accountNumber, `ac_${bank.id}`)}>
                      {copiedId === `ac_${bank.id}` ? <CheckCircle2 size={14} color="#16a34a" /> : <Copy size={14} />}
                    </button>
                  </span>
                </div>
                <div className="bank-detail-row">
                  <span className="detail-label">IFSC Code</span>
                  <span className="detail-value">
                    {bank.ifscCode}
                    <button className="copy-btn" onClick={() => copyToClipboard(bank.ifscCode, `ifsc_${bank.id}`)}>
                      {copiedId === `ifsc_${bank.id}` ? <CheckCircle2 size={14} color="#16a34a" /> : <Copy size={14} />}
                    </button>
                  </span>
                </div>
                {bank.swiftCode && (
                  <div className="bank-detail-row">
                    <span className="detail-label">SWIFT</span>
                    <span className="detail-value">{bank.swiftCode}</span>
                  </div>
                )}
              </div>

              {bank.isDefault && (
                <div className="bank-card-footer">
                  <div className="default-badge">
                    <CheckCircle2 size={14} />
                    Default Account
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BankManager;

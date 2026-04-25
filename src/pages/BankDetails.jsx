import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Landmark, Building, User, Hash, 
  CreditCard, Globe, Smartphone, 
  Edit2, Trash2, Copy, CheckCircle2, ShieldCheck,
  Calendar, Star, Activity, ArrowRight
} from 'lucide-react';
import { getItems, deleteItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import BankModal from '../components/BankModal';
import './BankDetails.css';

const BankDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [bank, setBank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const fetchBank = useCallback(async () => {
    if (!user?.id || !id) return;
    setLoading(true);
    try {
      const banks = await getItems('banks', user.id);
      const found = banks.find(b => b._dbId === id || b.id === id);
      if (found) {
        setBank(found);
      } else {
        navigate('/banks');
      }
    } catch (err) {
      console.error('Failed to fetch bank:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, id, navigate]);

  useEffect(() => {
    fetchBank();
  }, [fetchBank]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this bank account? This action cannot be undone.')) {
      const success = await deleteItem('banks', bank._dbId || bank.id, user.id);
      if (success) {
        navigate('/banks');
      }
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="bd-page-loading">
        <div className="bd-loader-content">
          <Landmark size={48} className="bd-loader-icon" />
          <p>Decrypting Bank Security Protocol...</p>
        </div>
      </div>
    );
  }

  if (!bank) return null;

  return (
    <div className="bd-page">
      {/* Premium Header */}
      <div className="bd-header">
        <div className="bd-header-left">
          <button className="bd-back-btn" onClick={() => navigate('/banks')}>
            <ArrowLeft size={24} />
          </button>
          <div className="bd-title-block">
            <div className="bd-type-badge">Bank Account Profile</div>
            <h1>{bank.bankName}</h1>
            <div className="bd-subtitle">
              <Building size={14} /> {bank.branchName || 'Main Branch'} 
              {bank.isDefault && <span className="bd-default-tag"><Star size={12} fill="currentColor" /> Default</span>}
            </div>
          </div>
        </div>
        <div className="bd-header-actions">
          <button className="bd-btn-danger" onClick={handleDelete}>
            <Trash2 size={18} /> Delete Account
          </button>
          <button className="bd-btn-primary" onClick={() => setIsModalOpen(true)}>
            <Edit2 size={18} /> Modify Details
          </button>
        </div>
      </div>

      <div className="bd-content-grid">
        {/* Left Column: Visual Card */}
        <div className="bd-col-left">
          <div className="bd-virtual-card">
            <div className="bd-card-chip" />
            <div className="bd-card-bank-name">{bank.bankName}</div>
            <div className="bd-card-number">
               {bank.accountNumber.replace(/.(?=.{4})/g, '•')}
            </div>
            <div className="bd-card-holder">
               <div className="bd-label-sm">Account Holder</div>
               <div className="bd-holder-name">{bank.accountName}</div>
            </div>
            <div className="bd-card-logo">
               <div className="bd-logo-circle" />
               <div className="bd-logo-circle-inner" />
            </div>
          </div>

          <div className="bd-status-card">
             <div className="bd-status-item">
                <ShieldCheck size={20} color="#10b981" />
                <div>
                   <div className="bd-status-label">Security Protocol</div>
                   <div className="bd-status-value">Active & Secured</div>
                </div>
             </div>
             <div className="bd-status-item">
                <Activity size={20} color="#3b82f6" />
                <div>
                   <div className="bd-status-label">Last Sync</div>
                   <div className="bd-status-value">Just Now</div>
                </div>
             </div>
          </div>
        </div>

        {/* Right Column: Information Tabs/Sections */}
        <div className="bd-col-right">
           <div className="bd-info-section">
              <div className="bd-section-title">
                 <CreditCard size={18} /> Primary Account Details
              </div>
              <div className="bd-info-grid">
                 <div className="bd-info-item">
                    <label>A/C Holder Name</label>
                    <div className="bd-info-value-row">
                       <span>{bank.accountName}</span>
                       <button className="bd-copy-icon" onClick={() => copyToClipboard(bank.accountName, 'holder')}>
                          {copiedField === 'holder' ? <CheckCircle2 size={16} color="#10b981" /> : <Copy size={16} />}
                       </button>
                    </div>
                 </div>
                 <div className="bd-info-item">
                    <label>Account Number</label>
                    <div className="bd-info-value-row">
                       <span className="bd-font-mono">{bank.accountNumber}</span>
                       <button className="bd-copy-icon" onClick={() => copyToClipboard(bank.accountNumber, 'number')}>
                          {copiedField === 'number' ? <CheckCircle2 size={16} color="#10b981" /> : <Copy size={16} />}
                       </button>
                    </div>
                 </div>
                 <div className="bd-info-item">
                    <label>IFSC Code</label>
                    <div className="bd-info-value-row">
                       <span className="bd-font-mono">{bank.ifscCode}</span>
                       <button className="bd-copy-icon" onClick={() => copyToClipboard(bank.ifscCode, 'ifsc')}>
                          {copiedField === 'ifsc' ? <CheckCircle2 size={16} color="#10b981" /> : <Copy size={16} />}
                       </button>
                    </div>
                 </div>
                 <div className="bd-info-item">
                    <label>Branch</label>
                    <div className="bd-info-value-row">
                       <span>{bank.branchName || 'Not Specified'}</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bd-info-section">
              <div className="bd-section-title">
                 <Smartphone size={18} /> Digital & Global Access
              </div>
              <div className="bd-info-grid">
                 <div className="bd-info-item">
                    <label>UPI ID</label>
                    <div className="bd-info-value-row">
                       <span>{bank.upiId || 'Not Configured'}</span>
                       {bank.upiId && (
                         <button className="bd-copy-icon" onClick={() => copyToClipboard(bank.upiId, 'upi')}>
                           {copiedField === 'upi' ? <CheckCircle2 size={16} color="#10b981" /> : <Copy size={16} />}
                         </button>
                       )}
                    </div>
                 </div>
                 <div className="bd-info-item">
                    <label>SWIFT / BIC</label>
                    <div className="bd-info-value-row">
                       <span className="bd-font-mono">{bank.swiftCode || 'Not Specified'}</span>
                       {bank.swiftCode && (
                         <button className="bd-copy-icon" onClick={() => copyToClipboard(bank.swiftCode, 'swift')}>
                           {copiedField === 'swift' ? <CheckCircle2 size={16} color="#10b981" /> : <Copy size={16} />}
                         </button>
                       )}
                    </div>
                 </div>
              </div>
           </div>

           <div className="bd-quick-actions">
              <div className="bd-qa-card">
                 <div className="bd-qa-icon"><Calendar size={20} /></div>
                 <div className="bd-qa-text">
                    <strong>View Transactions</strong>
                    <p>Track all payments through this bank</p>
                 </div>
                 <ArrowRight size={20} className="bd-qa-arrow" />
              </div>
           </div>
        </div>
      </div>

      <BankModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={() => fetchBank()} 
        editBankId={bank._dbId || bank.id}
      />
    </div>
  );
};

export default BankDetails;

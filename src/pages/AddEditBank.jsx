import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getItems, addItem, updateItem } from '../utils/db';
import { ArrowLeft, Save, Building, User, Hash, SplitSquareHorizontal, Globe, Smartphone, Landmark } from 'lucide-react';
import './AddEditBank.css';

const initialForm = {
  bankName: '',
  accountName: '',
  accountNumber: '',
  ifscCode: '',
  branchName: '',
  swiftCode: '',
  upiId: '',
  isDefault: false
};

const AddEditBank = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditMode) {
      fetchBankDetails();
    }
  }, [id, user]);

  const fetchBankDetails = async () => {
    if (user?.id) {
      setLoading(true);
      try {
        const banks = await getItems('banks', user.id);
        const bank = banks.find(b => b._dbId === id || b.id === id);
        if (bank) {
          setFormData(bank);
        } else {
          setError('Bank account not found');
        }
      } catch (err) {
        setError('Failed to fetch bank details');
      }
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!formData.bankName || !formData.accountName || !formData.accountNumber || !formData.ifscCode) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    if (user?.id) {
      setLoading(true);
      try {
        // Handle "isDefault" - if this is set to true, we should ideally unset others.
        // For simplicity in UI, we just save here. A robust backend would unset others.
        if (formData.isDefault) {
           const existingBanks = await getItems('banks', user.id);
           const otherDefaults = existingBanks.filter(b => b.isDefault && (b._dbId !== id));
           for(const ob of otherDefaults) {
               await updateItem('banks', ob._dbId || ob.id, { isDefault: false }, user.id);
           }
        }

        if (isEditMode) {
          await updateItem('banks', id, formData, user.id);
        } else {
          await addItem('banks', formData, user.id);
        }
        navigate('/banks');
      } catch (err) {
        setError(err.message || 'Error saving bank account');
        setLoading(false);
      }
    }
  };

  if (loading && isEditMode && !formData.bankName) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading bank details...</div>;
  }

  return (
    <div className="bank-form-wrapper">
      <div className="bank-form-header">
        <h2>
          <button className="btn-icon" onClick={() => navigate('/banks')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '0.5rem' }}>
            <ArrowLeft size={24} color="var(--text-main)" />
          </button>
          <Landmark className="text-primary" size={28} />
          {isEditMode ? 'Edit Bank Account' : 'Add New Bank Account'}
        </h2>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem', background: '#fef2f2', color: '#dc2626', padding: '1rem', borderRadius: '8px' }}>{error}</div>}

      <div className="bank-form-container">
        <form onSubmit={handleSubmit}>
          <div className="bank-form-grid">
            
            <div className="bank-input-group full-width">
              <label>Bank Name *</label>
              <Building className="bank-input-icon" size={18} />
              <input 
                type="text" 
                name="bankName" 
                value={formData.bankName} 
                onChange={handleInputChange} 
                placeholder="e.g. HDFC Bank, State Bank of India" 
                required 
              />
            </div>

            <div className="bank-input-group full-width">
              <label>Account Holder Name *</label>
              <User className="bank-input-icon" size={18} />
              <input 
                type="text" 
                name="accountName" 
                value={formData.accountName} 
                onChange={handleInputChange} 
                placeholder="Name exactly as it appears on the account" 
                required 
              />
            </div>

            <div className="bank-input-group">
              <label>Account Number *</label>
              <Hash className="bank-input-icon" size={18} />
              <input 
                type="text" 
                name="accountNumber" 
                value={formData.accountNumber} 
                onChange={handleInputChange} 
                placeholder="Account Number" 
                required 
              />
            </div>

            <div className="bank-input-group">
              <label>IFSC Code *</label>
              <SplitSquareHorizontal className="bank-input-icon" size={18} />
              <input 
                type="text" 
                name="ifscCode" 
                value={formData.ifscCode} 
                onChange={handleInputChange} 
                placeholder="e.g. HDFC0001234" 
                required 
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div className="bank-input-group full-width">
              <label>Branch Name</label>
              <Landmark className="bank-input-icon" size={18} />
              <input 
                type="text" 
                name="branchName" 
                value={formData.branchName} 
                onChange={handleInputChange} 
                placeholder="e.g. Andheri East Branch" 
              />
            </div>

            <div className="bank-input-group">
              <label>SWIFT / BIC Code (Optional)</label>
              <Globe className="bank-input-icon" size={18} />
              <input 
                type="text" 
                name="swiftCode" 
                value={formData.swiftCode} 
                onChange={handleInputChange} 
                placeholder="For international payments" 
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div className="bank-input-group">
              <label>UPI ID (Optional)</label>
              <Smartphone className="bank-input-icon" size={18} />
              <input 
                type="text" 
                name="upiId" 
                value={formData.upiId} 
                onChange={handleInputChange} 
                placeholder="e.g. yourname@bank" 
              />
            </div>

            <div className="bank-toggle-group">
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  name="isDefault" 
                  checked={formData.isDefault} 
                  onChange={handleInputChange} 
                />
                <span className="toggle-slider"></span>
              </label>
              <div className="toggle-label-content">
                <strong>Set as Default Bank Account</strong>
                <p>This account will be automatically selected for new invoices and receipts.</p>
              </div>
            </div>

          </div>

          <div className="bank-form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/banks')} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Save size={18} /> 
              {loading ? 'Saving...' : 'Save Bank Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditBank;

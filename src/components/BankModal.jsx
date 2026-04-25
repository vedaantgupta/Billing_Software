import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Landmark, Building, User, Hash, 
  CreditCard, Globe, Smartphone, 
  Save, ShieldCheck, Star, Info, CheckCircle2
} from 'lucide-react';
import { getItems, addItem, updateItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import './BankModal.css';

const TABS = [
  { id: 'general', label: 'General Info', icon: Building, desc: 'Bank & Branch details' },
  { id: 'account', label: 'Account Details', icon: Hash, desc: 'Holder & A/C Number' },
  { id: 'digital', label: 'Digital & International', icon: Globe, desc: 'UPI & SWIFT' }
];

const EMPTY_FORM = {
  bankName: '',
  accountName: '',
  accountNumber: '',
  ifscCode: '',
  branchName: '',
  swiftCode: '',
  upiId: '',
  isDefault: false
};

const BankModal = ({ isOpen, onClose, onSave, editBankId = null }) => {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadBankData = useCallback(async () => {
    if (!user?.id || !editBankId) return;
    try {
      const banks = await getItems('banks', user.id);
      const bank = banks.find(b => b._dbId === editBankId || b.id === editBankId);
      if (bank) {
        setForm(bank);
      }
    } catch (err) {
      console.error('Failed to load bank:', err);
    }
  }, [user?.id, editBankId]);

  useEffect(() => {
    if (!user?.id || !isOpen) return;
    
    if (editBankId) {
      loadBankData();
    } else {
      setForm(EMPTY_FORM);
      setActiveTab('general');
      setError('');
    }
  }, [user?.id, isOpen, editBankId, loadBankData]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.bankName || !form.accountName || !form.accountNumber || !form.ifscCode) {
      setError('Please fill all mandatory fields (*)');
      return;
    }

    setSaving(true);
    try {
      if (form.isDefault) {
        const existingBanks = await getItems('banks', user.id);
        const otherDefaults = existingBanks.filter(b => b.isDefault && (b._dbId !== editBankId && b.id !== editBankId));
        for(const ob of otherDefaults) {
          await updateItem('banks', ob._dbId || ob.id, { isDefault: false }, user.id);
        }
      }

      if (editBankId) {
        await updateItem('banks', editBankId, form, user.id);
      } else {
        await addItem('banks', form, user.id);
      }
      
      onSave && onSave();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save bank account');
    } finally {
      setSaving(false);
    }
  };

  const activeIndex = TABS.findIndex(t => t.id === activeTab);
  const nextTab = activeIndex < TABS.length - 1 ? TABS[activeIndex + 1] : null;
  const prevTab = activeIndex > 0 ? TABS[activeIndex - 1] : null;

  return createPortal(
    <div className="bm-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bm-modal" role="dialog" aria-modal="true">
        <div className="bm-modal-header">
          <div className="bm-modal-title">
            <div className="bm-modal-icon"><Landmark size={20} /></div>
            <h2>{editBankId ? 'Edit Bank Account' : 'Add New Bank Account'}</h2>
          </div>
          <button className="bm-modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="bm-modal-content">
          <div className="bm-modal-sidebar">
            {TABS.map(tab => (
              <button 
                key={tab.id}
                type="button"
                className={`bm-sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={18} />
                <div className="bm-sidebar-text">
                  <span className="bm-sidebar-label">{tab.label}</span>
                  <span className="bm-sidebar-desc">{tab.desc}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="bm-modal-main">
            <form id="bankModalForm" onSubmit={handleSubmit} className="bm-form">
              {error && (
                <div className="bm-form-error">
                  <Info size={16} />
                  {error}
                </div>
              )}

              {activeTab === 'general' && (
                <div className="bm-tab-content">
                  <div className="bm-section-header">
                    <h3>Branch & Identity</h3>
                    <p>Enter the legal name of the bank and branch location.</p>
                  </div>
                  <div className="bm-input-group">
                    <label>Bank Name *</label>
                    <div className="bm-input-wrapper">
                      <Building size={18} className="bm-field-icon" />
                      <input 
                        type="text" 
                        value={form.bankName} 
                        onChange={e => handleChange('bankName', e.target.value)}
                        placeholder="e.g. HDFC Bank"
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="bm-grid-2">
                    <div className="bm-input-group">
                      <label>IFSC Code *</label>
                      <div className="bm-input-wrapper">
                        <CreditCard size={18} className="bm-field-icon" />
                        <input 
                          type="text" 
                          value={form.ifscCode} 
                          onChange={e => handleChange('ifscCode', e.target.value.toUpperCase())}
                          placeholder="HDFC0001234"
                          required
                        />
                      </div>
                    </div>
                    <div className="bm-input-group">
                      <label>Branch Name</label>
                      <div className="bm-input-wrapper">
                        <Landmark size={18} className="bm-field-icon" />
                        <input 
                          type="text" 
                          value={form.branchName} 
                          onChange={e => handleChange('branchName', e.target.value)}
                          placeholder="Main Branch"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'account' && (
                <div className="bm-tab-content">
                  <div className="bm-section-header">
                    <h3>Account Specifics</h3>
                    <p>Provide the account holder name and number accurately.</p>
                  </div>
                  <div className="bm-input-group">
                    <label>Account Holder Name *</label>
                    <div className="bm-input-wrapper">
                      <User size={18} className="bm-field-icon" />
                      <input 
                        type="text" 
                        value={form.accountName} 
                        onChange={e => handleChange('accountName', e.target.value)}
                        placeholder="As per passbook"
                        required
                      />
                    </div>
                  </div>
                  <div className="bm-input-group">
                    <label>Account Number *</label>
                    <div className="bm-input-wrapper">
                      <Hash size={18} className="bm-field-icon" />
                      <input 
                        type="text" 
                        value={form.accountNumber} 
                        onChange={e => handleChange('accountNumber', e.target.value)}
                        placeholder="0000 0000 0000 0000"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="bm-toggle-card" onClick={() => handleChange('isDefault', !form.isDefault)}>
                    <div className={`bm-toggle-switch ${form.isDefault ? 'active' : ''}`}>
                      <div className="bm-toggle-knob" />
                    </div>
                    <div className="bm-toggle-info">
                      <strong>Set as Default Bank</strong>
                      <p>Used automatically for your business documents</p>
                    </div>
                    {form.isDefault && <CheckCircle2 size={20} className="bm-check-icon" />}
                  </div>
                </div>
              )}

              {activeTab === 'digital' && (
                <div className="bm-tab-content">
                  <div className="bm-section-header">
                    <h3>UPI & International</h3>
                    <p>Optional details for UPI payments and foreign transfers.</p>
                  </div>
                  <div className="bm-input-group">
                    <label>UPI ID (Optional)</label>
                    <div className="bm-input-wrapper">
                      <Smartphone size={18} className="bm-field-icon" />
                      <input 
                        type="text" 
                        value={form.upiId} 
                        onChange={e => handleChange('upiId', e.target.value)}
                        placeholder="name@okaxis"
                      />
                    </div>
                  </div>
                  <div className="bm-input-group">
                    <label>SWIFT / BIC Code (Optional)</label>
                    <div className="bm-input-wrapper">
                      <Globe size={18} className="bm-field-icon" />
                      <input 
                        type="text" 
                        value={form.swiftCode} 
                        onChange={e => handleChange('swiftCode', e.target.value.toUpperCase())}
                        placeholder="HDFCINBB"
                      />
                    </div>
                  </div>
                  
                  <div className="bm-security-note">
                    <ShieldCheck size={16} />
                    <span>All banking information is stored securely and encrypted.</span>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        <div className="bm-modal-footer">
          <div className="bm-footer-left">
            <span className="bm-required-note">* Required fields</span>
          </div>
          <div className="bm-footer-right">
            {prevTab && (
              <button type="button" className="bm-btn bm-btn-ghost" onClick={() => setActiveTab(prevTab.id)}>
                Back
              </button>
            )}
            {nextTab ? (
              <button type="button" className="bm-btn bm-btn-primary" onClick={() => setActiveTab(nextTab.id)}>
                Continue
              </button>
            ) : (
              <button type="submit" form="bankModalForm" className="bm-btn bm-btn-primary" disabled={saving}>
                {saving ? 'Saving...' : (
                  <>
                    <Save size={18} style={{ marginRight: '8px' }} />
                    {editBankId ? 'Update Bank' : 'Save Bank Account'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BankModal;

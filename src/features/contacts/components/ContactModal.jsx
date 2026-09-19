import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { addItem, updateItem } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import { X, User, MapPin, CreditCard, PlusCircle, Save, Sparkles } from 'lucide-react';
import '@/features/contacts/styles/ContactModal.css';

const STATE_CODES = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
  '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra', '28': 'Andhra Pradesh', '29': 'Karnataka',
  '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
  '35': 'Andaman & Nicobar', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh'
};

const ContactModal = ({ isOpen, onClose, onSave, editingId = null, initialData = null }) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShipping, setShowShipping] = useState(false);

  const defaultBilling = { address: '', landmark: '', city: '', country: 'India', state: 'Maharashtra', pincode: '', ewayBillDistance: '' };
  const defaultShipping = { name: '', contactPerson: '', phone: '', email: '', address: '', landmark: '', city: '', country: 'India', state: 'Maharashtra', pincode: '', ewayBillDistance: '' };
  const defaultCustomFields = { licenseNo: '', field1: '', field2: '' };
  const defaultAdditional = { fax: '', website: '', creditLimit: '', dueDays: '', note: '', isEnabled: true };

  const [formData, setFormData] = useState({
    type: 'customer',
    gstin: '',
    companyName: '',
    contactName: '',
    phone: '',
    email: '',
    registrationType: 'Regular',
    pan: '',
    billing: defaultBilling,
    shipping: defaultShipping,
    openingBalance: '0',
    balanceType: 'Credit',
    customFields: defaultCustomFields,
    additionalDetails: defaultAdditional
  });

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Load initial data for editing or reset for new
  useEffect(() => {
    if (initialData && isOpen) {
      setFormData({
        ...initialData,
        billing: initialData.billing || defaultBilling,
        shipping: initialData.shipping || defaultShipping,
        customFields: initialData.customFields || defaultCustomFields,
        additionalDetails: initialData.additionalDetails || defaultAdditional
      });
      if (initialData.shipping?.address) setShowShipping(true);
      else setShowShipping(false);
    } else if (isOpen) {
      // Reset form for new contact
      setFormData({
        type: 'customer',
        gstin: '',
        companyName: '',
        contactName: '',
        phone: '',
        email: '',
        registrationType: 'Regular',
        pan: '',
        billing: defaultBilling,
        shipping: defaultShipping,
        openingBalance: '0',
        balanceType: 'Credit',
        customFields: defaultCustomFields,
        additionalDetails: defaultAdditional
      });
      setShowShipping(false);
    }
  }, [initialData, isOpen]);

  const handleChange = (e, section = null, subSection = null) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    const targetKey = subSection || name;

    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...(prev[section] || {}),
          [targetKey]: val
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [targetKey]: val
      }));
    }
  };

  const handleAutofillGSTIN = () => {
    const rawGst = (formData.gstin || '').trim().toUpperCase();
    if (!rawGst) return;

    let detectedState = formData.billing.state;
    const stateCode = rawGst.substring(0, 2);
    if (STATE_CODES[stateCode]) {
      detectedState = STATE_CODES[stateCode];
    }

    let extractedPan = formData.pan;
    if (rawGst.length >= 12) {
      extractedPan = rawGst.substring(2, 12);
    }

    setFormData(prev => ({
      ...prev,
      gstin: rawGst,
      pan: extractedPan || prev.pan,
      registrationType: 'Regular',
      billing: {
        ...prev.billing,
        state: detectedState
      }
    }));
  };

  const handleCopyBillingToShipping = () => {
    setFormData(prev => ({
      ...prev,
      shipping: {
        ...prev.shipping,
        address: prev.billing.address || '',
        landmark: prev.billing.landmark || '',
        city: prev.billing.city || '',
        state: prev.billing.state || '',
        pincode: prev.billing.pincode || '',
        country: prev.billing.country || 'India',
        ewayBillDistance: prev.billing.ewayBillDistance || ''
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsSubmitting(true);
    try {
      // Preserve the original id so the backend's data.id is not corrupted
      const contactToSave = {
        ...formData,
        name: formData.companyName || formData.contactName,
        // Keep original id (timestamp-based) so backend stores it correctly
        ...(initialData?.id ? { id: initialData.id } : {})
      };

      let result;
      if (editingId) {
        result = await updateItem('contacts', editingId, contactToSave, user.id);
      } else {
        result = await addItem('contacts', contactToSave, user.id);
      }

      if (result) {
        onSave(result);
        onClose();
      } else {
        alert('Failed to save contact. Please check your connection and try again.');
      }
    } catch (err) {
      console.error('Failed to save contact:', err);
      alert('Error saving contact: ' + (err.message || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="contact-modal-overlay">
      <div className="contact-modal-content glass">
        <header className="contact-modal-header">
          <div className="flex items-center gap-10">
            <div className="header-icon-container">
              <User size={18} />
            </div>
            <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem' }}>{editingId ? 'Edit Contact' : 'Add New Contact'}</h2>
          </div>
          <button type="button" className="close-modal-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="contact-modal-body">
          {/* Main Toggle Customer / Vendor */}
          <div className="type-toggle">
            <button
              type="button"
              className={`type-toggle-btn ${formData.type === 'customer' ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, type: 'customer' })}
            >
              Customer
            </button>
            <button
              type="button"
              className={`type-toggle-btn ${formData.type === 'vendor' ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, type: 'vendor' })}
            >
              Vendor
            </button>
          </div>

          <div className="form-section">
            <div className="form-section-header">
              <span className="form-section-title">Basic Information</span>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">GSTIN</label>
                <div className="gstin-group">
                  <input name="gstin" className="form-input uppercase-input" placeholder="Enter GSTIN" value={formData.gstin} onChange={handleChange} />
                  <button type="button" className="autofill-btn" onClick={handleAutofillGSTIN}>
                    Auto Fill
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Business Name *</label>
                <input required name="companyName" className="form-input" placeholder="Business name" value={formData.companyName} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">{formData.type === 'customer' ? 'Customer' : 'Vendor'} Name *</label>
                <input name="contactName" className="form-input" placeholder="Name" value={formData.contactName} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input name="phone" className="form-input" placeholder="Phone" value={formData.phone} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" name="email" className="form-input" placeholder="Email" value={formData.email} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Registration</label>
                <select name="registrationType" className="form-input" value={formData.registrationType} onChange={handleChange}>
                  <option value="Regular">Regular</option>
                  <option value="Composition">Composition</option>
                  <option value="Consumer">Consumer</option>
                  <option value="Unregistered">Unregistered</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">PAN No.</label>
                <input name="pan" className="form-input uppercase-input" placeholder="PAN" value={formData.pan} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header">
              <MapPin size={18} className="text-secondary" />
              <span className="form-section-title">Billing & Shipping</span>
            </div>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Billing Address *</label>
                <textarea required className="form-input" rows="2" placeholder="Full Address" value={formData.billing.address} onChange={(e) => handleChange(e, 'billing', 'address')}></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" placeholder="City" value={formData.billing.city} onChange={(e) => handleChange(e, 'billing', 'city')} />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-input" placeholder="State" value={formData.billing.state} onChange={(e) => handleChange(e, 'billing', 'state')} />
              </div>
            </div>

            <div className="address-toggle-header">
              <span className="form-section-title" style={{ fontSize: '0.8125rem' }}>Separate Shipping Address</span>
              <label className="switch">
                <input type="checkbox" checked={showShipping} onChange={(e) => setShowShipping(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>

            {showShipping && (
              <div className="mt-4 p-4 rounded bg-gray-50/50">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#475569' }}>Shipping Details</span>
                  <button type="button" className="autofill-btn" onClick={handleCopyBillingToShipping} style={{ background: '#e0e7ff', color: '#4338ca' }}>
                    Copy Billing Address
                  </button>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Contact Person</label>
                    <input className="form-input" value={formData.shipping.contactPerson} onChange={(e) => handleChange(e, 'shipping', 'contactPerson')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={formData.shipping.phone} onChange={(e) => handleChange(e, 'shipping', 'phone')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" value={formData.shipping.email} onChange={(e) => handleChange(e, 'shipping', 'email')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Landmark *</label>
                    <input className="form-input" placeholder="Landmark" value={formData.shipping.landmark} onChange={(e) => handleChange(e, 'shipping', 'landmark')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input className="form-input" value={formData.shipping.country} onChange={(e) => handleChange(e, 'shipping', 'country')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className="form-input" placeholder="City" value={formData.shipping.city} onChange={(e) => handleChange(e, 'shipping', 'city')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input className="form-input" placeholder="State" value={formData.shipping.state} onChange={(e) => handleChange(e, 'shipping', 'state')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode *</label>
                    <input className="form-input" placeholder="PIN" value={formData.shipping.pincode} onChange={(e) => handleChange(e, 'shipping', 'pincode')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Distance (Km)</label>
                    <input className="form-input" placeholder="Km" value={formData.shipping.ewayBillDistance} onChange={(e) => handleChange(e, 'shipping', 'ewayBillDistance')} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Shipping Address *</label>
                    <textarea className="form-input" rows="2" value={formData.shipping.address} onChange={(e) => handleChange(e, 'shipping', 'address')}></textarea>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="form-section">
            <div className="form-section-header">
              <CreditCard size={18} className="text-secondary" />
              <span className="form-section-title">Financials</span>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Customer Balance</label>
                <div style={{ flex: 1 }}>
                  <div className="balance-input-group">
                    <input type="number" className="form-input" value={formData.openingBalance} name="openingBalance" onChange={handleChange} />
                    <select className="balance-type-select" value={formData.balanceType} name="balanceType" onChange={handleChange}>
                      <option value="Credit">Credit</option>
                      <option value="Debit">Debit</option>
                    </select>
                  </div>
                  <div className="balance-info-text">
                    <p className={`balance-note ${(formData.balanceType || 'Credit').toLowerCase()}`}>
                      ₹ {formData.openingBalance || 0} {formData.balanceType === 'Credit' ? 'You pay the customer' : 'Customer pays you'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">License No.</label>
                <input className="form-input" value={formData.customFields.licenseNo} onChange={(e) => handleChange(e, 'customFields', 'licenseNo')} />
              </div>
              <div className="form-group">
                <label className="form-label">Custom Field 1</label>
                <input className="form-input" value={formData.customFields.field1} onChange={(e) => handleChange(e, 'customFields', 'field1')} />
              </div>
              <div className="form-group">
                <label className="form-label">Custom Field 2</label>
                <input className="form-input" value={formData.customFields.field2} onChange={(e) => handleChange(e, 'customFields', 'field2')} />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header">
              <PlusCircle size={18} className="text-secondary" />
              <span className="form-section-title">Additional Details</span>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Fax No.</label>
                <input className="form-input" name="fax" value={formData.additionalDetails.fax} onChange={(e) => handleChange(e, 'additionalDetails')} />
              </div>
              <div className="form-group">
                <label className="form-label">Website</label>
                <input className="form-input" name="website" placeholder="https://..." value={formData.additionalDetails.website} onChange={(e) => handleChange(e, 'additionalDetails')} />
              </div>
              <div className="form-group">
                <label className="form-label">Credit Limit</label>
                <input type="number" className="form-input" placeholder="Limit" value={formData.additionalDetails.creditLimit} name="creditLimit" onChange={(e) => handleChange(e, 'additionalDetails')} />
              </div>
              <div className="form-group">
                <label className="form-label">Due Days</label>
                <input type="number" className="form-input" placeholder="Days" value={formData.additionalDetails.dueDays} name="dueDays" onChange={(e) => handleChange(e, 'additionalDetails')} />
              </div>
            </div>
            <div className="form-group mt-4">
              <label className="form-label">Note / Remark</label>
              <textarea className="form-input" name="note" rows="2" placeholder="Internal notes" value={formData.additionalDetails.note} onChange={(e) => handleChange(e, 'additionalDetails')}></textarea>
            </div>
            <div className="mt-4 p-4 rounded border border-indigo-100 bg-indigo-50/30 flex items-center justify-between">
              <div>
                <p style={{ fontSize: '0.8125rem', fontWeight: 800, margin: 0, color: '#1e1b4b' }}>Enable Contact Visibility</p>
                <p style={{ fontSize: '0.75rem', margin: 0, color: '#4338ca' }}>Visible on all documents when active.</p>
              </div>
              <label className="switch">
                <input type="checkbox" checked={formData.additionalDetails.isEnabled} name="isEnabled" onChange={(e) => handleChange(e, 'additionalDetails')} />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ borderRadius: '4px' }}>Discard</button>
            <button type="submit" className="btn btn-primary" style={{ minWidth: '160px', borderRadius: '4px' }} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : <><Save size={18} /> Save Contact</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ContactModal;

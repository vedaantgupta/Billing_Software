import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, User, MapPin, CreditCard, PlusCircle, LayoutDashboard, Globe, Shield, HelpCircle, Save, X } from 'lucide-react';
import './AddContact.css';

const AddContact = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShipping, setShowShipping] = useState(false);

  const [formData, setFormData] = useState({
    type: 'customer',
    gstin: '',
    companyName: '',
    contactName: '',
    phone: '',
    email: '',
    registrationType: 'Regular',
    pan: '',
    billing: {
      address: '',
      landmark: '',
      city: '',
      country: 'India',
      state: 'Maharashtra',
      pincode: '',
      ewayBillDistance: ''
    },
    shipping: {
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      landmark: '',
      city: '',
      country: 'India',
      state: 'Maharashtra',
      pincode: '',
      ewayBillDistance: ''
    },
    openingBalance: '0',
    balanceType: 'Credit',
    customFields: {
      licenseNo: '',
      field1: '',
      field2: ''
    },
    additionalDetails: {
      fax: '',
      website: '',
      creditLimit: '',
      dueDays: '',
      note: '',
      isEnabled: true
    }
  });

  const handleChange = (e, section = null, subSection = null) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    if (section && subSection) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [subSection]: val
        }
      }));
    } else if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [name]: val
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: val
      }));
    }
  };

  const handleAutofillGSTIN = () => {
    // Simulated GSTIN Autofill logic
    if (!formData.gstin) {
      alert("Please enter a GSTIN first");
      return;
    }
    // Mocking an API call
    console.log("Mocking GSTIN data for:", formData.gstin);
    
    // Auto-populate some fields for UX demo
    setFormData(prev => ({
      ...prev,
      companyName: 'Sample Business Ltd',
      registrationType: prev.gstin.startsWith('27') ? 'Regular' : 'Interstate',
      billing: {
        ...prev.billing,
        state: 'Maharashtra',
        city: 'Mumbai',
        address: '123 Business Hub, BKC'
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsSubmitting(true);
    try {
      // Use companyName or contactName as the primary name for the listing
      const contactToSave = {
        ...formData,
        name: formData.companyName || formData.contactName
      };
      
      const result = await addItem('contacts', contactToSave, user.id);
      if (result) {
        navigate('/contacts');
      }
    } catch (err) {
      console.error('Failed to save contact:', err);
      alert('Error saving contact. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-contact-container">
      <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/contacts')} style={{ padding: '0.4rem', minWidth: 'auto' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Add New Contact</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Create a new customer or vendor in your directory</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="glass contact-form-card">
          
          {/* Main Toggle Customer / Vendor */}
          <div className="type-toggle">
            <button 
              type="button" 
              className={`type-toggle-btn ${formData.type === 'customer' ? 'active' : ''}`}
              onClick={() => setFormData({...formData, type: 'customer'})}
            >
              Customer
            </button>
            <button 
              type="button" 
              className={`type-toggle-btn ${formData.type === 'vendor' ? 'active' : ''}`}
              onClick={() => setFormData({...formData, type: 'vendor'})}
            >
              Vendor
            </button>
          </div>

          {/* Section: Basic Information */}
          <div className="form-section">
            <div className="form-section-header">
              <User size={20} className="text-secondary" />
              <span className="form-section-title">Basic Information</span>
            </div>
            
            <div className="form-grid">
              <div className="gstin-group">
                <div className="w-full">
                  <label className="form-label">GSTIN</label>
                  <input 
                    name="gstin" 
                    className="form-input" 
                    placeholder="Enter GSTIN" 
                    value={formData.gstin} 
                    onChange={handleChange}
                  />
                </div>
                <button type="button" className="autofill-btn" onClick={handleAutofillGSTIN}>
                  Auto Fill
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Company / Business Name *</label>
                <input 
                  required 
                  name="companyName" 
                  className="form-input" 
                  placeholder="Enter business name" 
                  value={formData.companyName} 
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{formData.type === 'customer' ? 'Customer' : 'Vendor'} Name (Contact Person)</label>
                <input 
                  name="contactName" 
                  className="form-input" 
                  placeholder="Contact person name" 
                  value={formData.contactName} 
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-grid mt-4">
              <div className="form-group">
                <label className="form-label">Contact No. (Phone)</label>
                <input 
                  name="phone" 
                  className="form-input" 
                  placeholder="Phone number" 
                  value={formData.phone} 
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  name="email" 
                  className="form-input" 
                  placeholder="email@example.com" 
                  value={formData.email} 
                  onChange={handleChange}
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Registration Type</label>
                  <select 
                    name="registrationType" 
                    className="form-input" 
                    value={formData.registrationType} 
                    onChange={handleChange}
                  >
                    <option value="Regular">Regular</option>
                    <option value="Composition">Composition</option>
                    <option value="Consumer">Consumer</option>
                    <option value="Unregistered">Unregistered</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">PAN Card No.</label>
                  <input 
                    name="pan" 
                    className="form-input" 
                    placeholder="Enter PAN" 
                    value={formData.pan} 
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Addresses */}
          <div className="form-section">
            <div className="form-section-header">
              <MapPin size={20} className="text-secondary" />
              <span className="form-section-title">Billing Address</span>
            </div>

            <div className="form-grid">
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Billing Address *</label>
                <textarea 
                  required 
                  className="form-input" 
                  placeholder="Enter full address" 
                  rows="2"
                  value={formData.billing.address}
                  onChange={(e) => handleChange(e, 'billing', 'address')}
                ></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Landmark</label>
                <input 
                  className="form-input" 
                  placeholder="Near something" 
                  value={formData.billing.landmark}
                  onChange={(e) => handleChange(e, 'billing', 'landmark')}
                />
              </div>
            </div>

            <div className="form-grid-3 mt-4">
              <div className="form-group">
                <label className="form-label">City</label>
                <input 
                  className="form-input" 
                  placeholder="City" 
                  value={formData.billing.city}
                  onChange={(e) => handleChange(e, 'billing', 'city')}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Country</label>
                <input 
                  className="form-input" 
                  placeholder="India" 
                  value={formData.billing.country}
                  onChange={(e) => handleChange(e, 'billing', 'country')}
                />
              </div>
              <div className="form-group">
                <label className="form-label">State *</label>
                <input 
                  required 
                  className="form-input" 
                  placeholder="e.g. Maharashtra" 
                  value={formData.billing.state}
                  onChange={(e) => handleChange(e, 'billing', 'state')}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Pin Code *</label>
                <input 
                  required 
                  className="form-input" 
                  placeholder="6-digit PIN" 
                  value={formData.billing.pincode}
                  onChange={(e) => handleChange(e, 'billing', 'pincode')}
                />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 1.5' }}>
                <label className="form-label">Distance for E-Way Bill (km)</label>
                <input 
                  className="form-input" 
                  placeholder="Enter Km" 
                  value={formData.billing.ewayBillDistance}
                  onChange={(e) => handleChange(e, 'billing', 'ewayBillDistance')}
                />
              </div>
            </div>

            {/* Shipping Address Toggle */}
            <div className="address-toggle-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Globe size={20} className="text-secondary" />
                <span className="form-section-title" style={{ fontSize: '1rem' }}>Shipping Address</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: '#e2e8f0', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>OPTIONAL</span>
              </div>
              <label className="switch">
                <input type="checkbox" checked={showShipping} onChange={(e) => setShowShipping(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>

            {showShipping && (
              <div className="mt-4 p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50/50">
                <p className="mb-4 text-xs font-semibold uppercase text-gray-500 italic">Separate Shipping Details</p>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Shipping Name</label>
                    <input 
                      className="form-input" 
                      placeholder="Receiver name" 
                      value={formData.shipping.name}
                      onChange={(e) => handleChange(e, 'shipping', 'name')}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Person</label>
                    <input 
                      className="form-input" 
                      placeholder="Name" 
                      value={formData.shipping.contactPerson}
                      onChange={(e) => handleChange(e, 'shipping', 'contactPerson')}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input 
                      className="form-input" 
                      placeholder="Receiver phone" 
                      value={formData.shipping.phone}
                      onChange={(e) => handleChange(e, 'shipping', 'phone')}
                    />
                  </div>
                </div>
                
                <div className="form-grid mt-4">
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Shipping Address</label>
                    <textarea 
                      className="form-input" 
                      placeholder="Enter shipping address" 
                      rows="2"
                      value={formData.shipping.address}
                      onChange={(e) => handleChange(e, 'shipping', 'address')}
                    ></textarea>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Landmark</label>
                    <input 
                      className="form-input" 
                      placeholder="Enter shipping landmark" 
                      value={formData.shipping.landmark}
                      onChange={(e) => handleChange(e, 'shipping', 'landmark')}
                    />
                  </div>
                </div>

                <div className="form-grid-3 mt-4">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className="form-input" placeholder="Enter City" value={formData.shipping.city} onChange={(e) => handleChange(e, 'shipping', 'city')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input className="form-input" value={formData.shipping.country} readOnly />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input className="form-input" placeholder="Select State" value={formData.shipping.state} onChange={(e) => handleChange(e, 'shipping', 'state')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode</label>
                    <input className="form-input" placeholder="Enter Pincode" value={formData.shipping.pincode} onChange={(e) => handleChange(e, 'shipping', 'pincode')} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 1.5' }}>
                    <label className="form-label">Distance for e-way bill (km)</label>
                    <input className="form-input" placeholder="Distance in Km" value={formData.shipping.ewayBillDistance} onChange={(e) => handleChange(e, 'shipping', 'ewayBillDistance')} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section: Financials */}
          <div className="form-section">
            <div className="form-section-header">
              <CreditCard size={20} className="text-secondary" />
              <span className="form-section-title">Financial Details</span>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Opening Balance</label>
                <div className="balance-input-group">
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="0" 
                    value={formData.openingBalance}
                    name="openingBalance"
                    onChange={handleChange}
                  />
                  <select 
                    className="balance-type-select" 
                    value={formData.balanceType} 
                    name="balanceType"
                    onChange={handleChange}
                  >
                    <option value="Credit">Credit</option>
                    <option value="Debit">Debit</option>
                  </select>
                </div>
                <p className="mt-1" style={{ fontSize: '0.75rem', color: formData.balanceType === 'Debit' ? 'var(--secondary-color)' : 'var(--success-color)' }}>
                  {formData.balanceType === 'Debit' ? '₹ You pay the ' + (formData.type) : '₹ ' + (formData.type) + ' pays you'}
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Credit Limit (₹)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="Max credit allowed" 
                  value={formData.additionalDetails.creditLimit}
                  name="creditLimit"
                  onChange={(e) => handleChange(e, 'additionalDetails')}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Due Days (Payment Terms)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="e.g. 15 days" 
                  value={formData.additionalDetails.dueDays}
                  name="dueDays"
                  onChange={(e) => handleChange(e, 'additionalDetails')}
                />
              </div>
            </div>
          </div>

          {/* Section: Custom Fields */}
          <div className="form-section">
            <div className="form-section-header">
              <Shield size={20} className="text-secondary" />
              <span className="form-section-title">Custom Fields</span>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <p className="custom-field-label">License No.</p>
                <input 
                  className="form-input" 
                  placeholder="DL / License number" 
                  value={formData.customFields.licenseNo} 
                  onChange={(e) => handleChange(e, 'customFields', 'licenseNo')}
                />
              </div>
              <div className="form-group">
                <p className="custom-field-label">custom field 1</p>
                <input 
                  className="form-input" 
                  placeholder="Custom value" 
                  value={formData.customFields.field1} 
                  onChange={(e) => handleChange(e, 'customFields', 'field1')}
                />
              </div>
              <div className="form-group">
                <p className="custom-field-label">custom field 2</p>
                <input 
                  className="form-input" 
                  placeholder="Custom value" 
                  value={formData.customFields.field2} 
                  onChange={(e) => handleChange(e, 'customFields', 'field2')}
                />
              </div>
            </div>
          </div>

          {/* Section: Additional Details */}
          <div className="form-section">
            <div className="form-section-header">
              <PlusCircle size={20} className="text-secondary" />
              <span className="form-section-title">Additional Details</span>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Fax No</label>
                <input className="form-input" name="fax" value={formData.additionalDetails.fax} onChange={(e) => handleChange(e, 'additionalDetails')} />
              </div>
              <div className="form-group">
                <label className="form-label">Website</label>
                <input className="form-input" name="website" placeholder="https://..." value={formData.additionalDetails.website} onChange={(e) => handleChange(e, 'additionalDetails')} />
              </div>
            </div>

            <div className="form-group mt-2">
              <label className="form-label">Note / Remark</label>
              <textarea 
                className="form-input" 
                name="note" 
                rows="2" 
                placeholder="Internal notes about this contact"
                value={formData.additionalDetails.note} 
                onChange={(e) => handleChange(e, 'additionalDetails')}
              ></textarea>
            </div>

            <div className="mt-4 p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-indigo-900">Enable Contact visibility</p>
                <p className="text-xs text-indigo-700">Company will be visible on all documents when active.</p>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={formData.additionalDetails.isEnabled} 
                  name="isEnabled"
                  onChange={(e) => handleChange(e, 'additionalDetails')}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => navigate('/contacts')}
              disabled={isSubmitting}
            >
              <X size={18} /> Discard
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isSubmitting}
              style={{ minWidth: '160px' }}
            >
              {isSubmitting ? (
                <>Saving...</>
              ) : (
                <>
                  <Save size={18} /> Save Contact
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddContact;

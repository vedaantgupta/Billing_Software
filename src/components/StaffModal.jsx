import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Briefcase, Landmark } from 'lucide-react';
import { addItem, updateItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  dob: '',
  age: '',
  gender: '',
  designation: '',
  department: '',
  employmentType: 'fulltime',
  joinDate: '',
  salary: '',
  status: 'active',
  address: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  accountHolder: '',
  branchAddress: '',
};

const StaffModal = ({ isOpen, onClose, onSave, editingData }) => {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal'); // 'personal', 'work', 'bank'

  useEffect(() => {
    if (isOpen) {
      setForm(editingData ? { ...EMPTY_FORM, ...editingData } : EMPTY_FORM);
      setActiveTab('personal');
    }
  }, [isOpen, editingData]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.name.trim()) return alert('Name is required.');
    setSaving(true);
    try {
      if (editingData?._dbId) {
        await updateItem('staff', editingData._dbId, form, user.id, user.firstName);
      } else {
        await addItem('staff', form, user.id, user.firstName);
      }
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="staff-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="staff-modal">
        <div className="staff-modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '15px', wordSpacing: '3px' }}>
            <i className="bi bi-person-square" style={{ fontSize: '1.6rem', color: '#4f46e5' }}></i>
            {editingData ? 'Edit Staff Member' : 'Add New Staff Member'}
          </h2>
          <button className="staff-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="staff-modal-form-container">
          <div className="staff-modal-sidebar">
            <button
              type="button"
              className={`staff-sidebar-item ${activeTab === 'personal' ? 'active' : ''}`}
              onClick={() => setActiveTab('personal')}
            >
              <User size={18} />
              <span>Personal</span>
            </button>
            <button
              type="button"
              className={`staff-sidebar-item ${activeTab === 'work' ? 'active' : ''}`}
              onClick={() => setActiveTab('work')}
            >
              <Briefcase size={18} />
              <span>Job Info</span>
            </button>
            <button
              type="button"
              className={`staff-sidebar-item ${activeTab === 'bank' ? 'active' : ''}`}
              onClick={() => setActiveTab('bank')}
            >
              <Landmark size={18} />
              <span>Bank</span>
            </button>
          </div>

          <div className="staff-modal-main">
            <div className="staff-modal-body">
              {activeTab === 'personal' && (
                <div className="staff-tab-content">
                  <div className="staff-content-header">
                    <p className="staff-section-title"><User size={14} /> Personal Information</p>
                    <p className="staff-section-subtitle">Manage personal contact and identity details</p>
                  </div>
                  <div className="staff-form-grid">
                    <div className="staff-field">
                      <label>Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Rohan Mehta"
                        value={form.name}
                        onChange={e => handleChange('name', e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="staff-field">
                      <label>Phone Number</label>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={form.phone}
                        onChange={e => handleChange('phone', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Email Address</label>
                      <input
                        type="email"
                        placeholder="e.g. rohan@example.com"
                        value={form.email}
                        onChange={e => handleChange('email', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Date of Birth</label>
                      <input
                        type="date"
                        value={form.dob}
                        onChange={e => handleChange('dob', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Age</label>
                      <input
                        type="number"
                        min="18"
                        max="100"
                        placeholder="e.g. 28"
                        value={form.age}
                        onChange={e => handleChange('age', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Gender</label>
                      <select
                        value={form.gender}
                        onChange={e => handleChange('gender', e.target.value)}
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not">Prefer not to say</option>
                      </select>
                    </div>
                    <div className="staff-field" style={{ gridColumn: '1 / -1' }}>
                      <label>Address</label>
                      <textarea
                        placeholder="Complete home address..."
                        value={form.address}
                        onChange={e => handleChange('address', e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'work' && (
                <div className="staff-tab-content">
                  <div className="staff-content-header">
                    <p className="staff-section-title"><Briefcase size={14} /> Work Details</p>
                    <p className="staff-section-subtitle">Set designation, salary, and employment status</p>
                  </div>
                  <div className="staff-form-grid">
                    <div className="staff-field">
                      <label>Designation / Role</label>
                      <input
                        type="text"
                        placeholder="e.g. Sales Manager"
                        value={form.designation}
                        onChange={e => handleChange('designation', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Department</label>
                      <input
                        type="text"
                        placeholder="e.g. Operations"
                        value={form.department}
                        onChange={e => handleChange('department', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Employment Type</label>
                      <select
                        value={form.employmentType}
                        onChange={e => handleChange('employmentType', e.target.value)}
                      >
                        <option value="fulltime">Full-time</option>
                        <option value="parttime">Part-time</option>
                        <option value="contract">Contract</option>
                      </select>
                    </div>
                    <div className="staff-field">
                      <label>Join Date</label>
                      <input
                        type="date"
                        value={form.joinDate}
                        onChange={e => handleChange('joinDate', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Monthly Salary (₹)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 25000"
                        value={form.salary}
                        onChange={e => handleChange('salary', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Status</label>
                      <select
                        value={form.status}
                        onChange={e => handleChange('status', e.target.value)}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'bank' && (
                <div className="staff-tab-content">
                  <div className="staff-content-header">
                    <p className="staff-section-title"><Landmark size={14} /> Bank Account Details</p>
                    <p className="staff-section-subtitle">Billing details for salary disbursements</p>
                  </div>
                  <div className="staff-form-grid">
                    <div className="staff-field">
                      <label>Account Holder Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Rohan Mehta"
                        value={form.accountHolder}
                        onChange={e => handleChange('accountHolder', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Bank Name</label>
                      <input
                        type="text"
                        placeholder="e.g. State Bank of India"
                        value={form.bankName}
                        onChange={e => handleChange('bankName', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Account Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 1234567890"
                        value={form.accountNumber}
                        onChange={e => handleChange('accountNumber', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>IFSC Code</label>
                      <input
                        type="text"
                        placeholder="e.g. SBIN0001234"
                        value={form.ifscCode}
                        onChange={e => handleChange('ifscCode', e.target.value.toUpperCase())}
                      />
                    </div>
                    <div className="staff-field" style={{ gridColumn: '1 / -1' }}>
                      <label>Branch Address</label>
                      <textarea
                        placeholder="Full branch address..."
                        value={form.branchAddress}
                        onChange={e => handleChange('branchAddress', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="staff-modal-footer">
              <div className="staff-footer-tips">
                {activeTab === 'personal' && "Fill identity for profile."}
                {activeTab === 'work' && "Job details affect payroll."}
                {activeTab === 'bank' && "Verify details carefully."}
              </div>
              <div className="staff-footer-btns">
                {activeTab !== 'personal' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={(e) => {
                      e.preventDefault(); // ✅ prevent submit
                      setActiveTab(prev => (prev === 'work' ? 'personal' : 'work'));
                    }}
                  >
                    Previous
                  </button>
                )}
                {activeTab !== 'bank' ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={(e) => {
                      e.preventDefault(); // ✅ prevent accidental form submit
                      setActiveTab(prev => (prev === 'personal' ? 'work' : 'bank'));
                    }}
                  >
                    Next Section
                  </button>
                ) : (
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editingData ? 'Update Member' : 'Create Member'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default StaffModal;

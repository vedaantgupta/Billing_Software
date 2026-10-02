import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Briefcase, Landmark, Clock, ShieldCheck, QrCode } from 'lucide-react';
import { addItem, updateItem, logActivity } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';

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
  // Multi-Basis Salary
  wageType: 'monthly', // 'monthly', 'daily', 'hourly', 'piece_rate'
  salary: '', // Monthly base
  dailyRate: '', // Per day wage
  hourlyRate: '', // Per hour wage
  pieceRate: '', // Per unit/piece wage
  overtimeMultiplier: '1.5',
  // Shifts & Rules
  shiftName: 'General Day Shift (9 AM - 6 PM)',
  lateRule: '3_lates_half_day', // 'none', '3_lates_half_day', 'strict'
  status: 'active',
  address: '',
  // Bank & UPI
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  accountHolder: '',
  branchAddress: '',
  upiId: '',
  // Statutory / Identity
  panNumber: '',
  uanNumber: '',
  esiNumber: '',
  aadhaarNumber: '',
};

const SHIFTS = [
  { label: 'General Day Shift (9:00 AM – 6:00 PM)', value: 'General Day Shift (9 AM - 6 PM)' },
  { label: 'Morning Shift (6:00 AM – 2:00 PM)', value: 'Morning Shift (6 AM - 2 PM)' },
  { label: 'Evening Shift (2:00 PM – 10:00 PM)', value: 'Evening Shift (2 PM - 10 PM)' },
  { label: 'Night Shift (10:00 PM – 6:00 AM)', value: 'Night Shift (10 PM - 6 AM)' },
  { label: 'Flexible / Open Hours', value: 'Flexible Shift' },
];

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
    setForm(prev => {
      const next = { ...prev, [field]: value };
      // Auto-calculate age from DOB
      if (field === 'dob' && value) {
        const birthDate = new Date(value);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        next.age = age > 0 ? age.toString() : '';
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.name.trim()) return alert('Full Name is required.');
    setSaving(true);
    try {
      if (editingData?._dbId) {
        await updateItem('staff', editingData._dbId, form, user.id, user.firstName);
        await logActivity(`Updated staff profile for ${form.name}`, user.id, user.firstName);
      } else {
        await addItem('staff', form, user.id, user.firstName);
        await logActivity(`Added new staff member: ${form.name}`, user.id, user.firstName);
      }
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save staff record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="staff-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="staff-modal">
        <div className="staff-modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={20} />
            </div>
            {editingData ? 'Edit Staff Profile' : 'Add New Staff Member'}
          </h2>
          <button className="staff-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
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
              <span>Personal & KYC</span>
            </button>
            <button
              type="button"
              className={`staff-sidebar-item ${activeTab === 'work' ? 'active' : ''}`}
              onClick={() => setActiveTab('work')}
            >
              <Briefcase size={18} />
              <span>Job & Wage Structure</span>
            </button>
            <button
              type="button"
              className={`staff-sidebar-item ${activeTab === 'bank' ? 'active' : ''}`}
              onClick={() => setActiveTab('bank')}
            >
              <Landmark size={18} />
              <span>Bank & UPI Disbursal</span>
            </button>
          </div>

          <div className="staff-modal-main">
            <div className="staff-modal-body">
              {/* TAB 1: Personal & Identity */}
              {activeTab === 'personal' && (
                <div className="staff-tab-content">
                  <div className="staff-content-header">
                    <p className="staff-section-title"><User size={14} /> Personal Information</p>
                    <p className="staff-section-subtitle">Contact information and basic personal identifiers</p>
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
                      <label>Phone Number (for WhatsApp alerts)</label>
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
                        min="16"
                        max="100"
                        placeholder="Auto from DOB"
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
                      </select>
                    </div>
                    <div className="staff-field" style={{ gridColumn: '1 / -1' }}>
                      <label>Complete Home Address</label>
                      <textarea
                        placeholder="Street address, city, pin code..."
                        value={form.address}
                        onChange={e => handleChange('address', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Statutory Identification */}
                  <div className="staff-content-header" style={{ marginTop: '24px' }}>
                    <p className="staff-section-title"><ShieldCheck size={14} /> Identity & Compliance</p>
                    <p className="staff-section-subtitle">PAN, UAN, ESI, and Aadhaar identification for payslips</p>
                  </div>
                  <div className="staff-form-grid">
                    <div className="staff-field">
                      <label>PAN Card Number</label>
                      <input
                        type="text"
                        placeholder="e.g. ABCDE1234F"
                        value={form.panNumber}
                        onChange={e => handleChange('panNumber', e.target.value.toUpperCase())}
                      />
                    </div>
                    <div className="staff-field">
                      <label>UAN / PF Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 100200300400"
                        value={form.uanNumber}
                        onChange={e => handleChange('uanNumber', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>ESI Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 5678901234"
                        value={form.esiNumber}
                        onChange={e => handleChange('esiNumber', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Aadhaar Number (12 Digits)</label>
                      <input
                        type="text"
                        placeholder="e.g. 1234 5678 9012"
                        value={form.aadhaarNumber}
                        onChange={e => handleChange('aadhaarNumber', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Work & Khatabook Wage Structure */}
              {activeTab === 'work' && (
                <div className="staff-tab-content">
                  <div className="staff-content-header">
                    <p className="staff-section-title"><Briefcase size={14} /> Job & Wage Configuration</p>
                    <p className="staff-section-subtitle">Set wage basis (Monthly / Daily / Hourly / Piece-Rate) and shifts</p>
                  </div>
                  <div className="staff-form-grid">
                    <div className="staff-field">
                      <label>Designation / Role</label>
                      <input
                        type="text"
                        placeholder="e.g. Store Executive, Tailor, Accountant"
                        value={form.designation}
                        onChange={e => handleChange('designation', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Department</label>
                      <input
                        type="text"
                        placeholder="e.g. Sales, Production, Billing"
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
                        <option value="fulltime">Full-time Staff</option>
                        <option value="parttime">Part-time Staff</option>
                        <option value="contract">Contract / Freelance</option>
                        <option value="casual">Casual Daily Worker</option>
                      </select>
                    </div>
                    <div className="staff-field">
                      <label>Date of Joining</label>
                      <input
                        type="date"
                        value={form.joinDate}
                        onChange={e => handleChange('joinDate', e.target.value)}
                      />
                    </div>

                    {/* Khatabook Multi-Basis Wage Selector */}
                    <div className="staff-field" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
                      <label style={{ color: '#0f172a', fontWeight: 800 }}>Wage Payment Basis *</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginTop: '0.5rem' }}>
                        {[
                          { key: 'monthly', title: 'Monthly Fixed', desc: 'Fixed monthly salary pro-rated by days' },
                          { key: 'daily', title: 'Daily Wager', desc: 'Paid per present working day' },
                          { key: 'hourly', title: 'Hourly Wage', desc: 'Paid per logged shift & OT hours' },
                          { key: 'piece_rate', title: 'Mal-Khata', desc: 'Paid per unit/piece produced' },
                        ].map((w) => (
                          <div
                            key={w.key}
                            onClick={() => handleChange('wageType', w.key)}
                            style={{
                              border: form.wageType === w.key ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                              background: form.wageType === w.key ? '#eef2ff' : '#ffffff',
                              padding: '0.75rem',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: form.wageType === w.key ? '#4338ca' : '#0f172a' }}>
                              {w.title}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                              {w.desc}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dynamic Wage Rate Inputs */}
                    {form.wageType === 'monthly' && (
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
                    )}

                    {form.wageType === 'daily' && (
                      <div className="staff-field">
                        <label>Per Day Wage Rate (₹ / Day)</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="e.g. 800"
                          value={form.dailyRate}
                          onChange={e => handleChange('dailyRate', e.target.value)}
                        />
                      </div>
                    )}

                    {form.wageType === 'hourly' && (
                      <>
                        <div className="staff-field">
                          <label>Standard Hourly Rate (₹ / Hour)</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 150"
                            value={form.hourlyRate}
                            onChange={e => handleChange('hourlyRate', e.target.value)}
                          />
                        </div>
                        <div className="staff-field">
                          <label>Overtime (OT) Multiplier</label>
                          <select
                            value={form.overtimeMultiplier}
                            onChange={e => handleChange('overtimeMultiplier', e.target.value)}
                          >
                            <option value="1.0">1.0x (Flat Hourly Rate)</option>
                            <option value="1.25">1.25x Hourly Rate</option>
                            <option value="1.5">1.5x Hourly Rate (Standard)</option>
                            <option value="2.0">2.0x Double Rate</option>
                          </select>
                        </div>
                      </>
                    )}

                    {form.wageType === 'piece_rate' && (
                      <div className="staff-field">
                        <label>Default Rate Per Unit / Piece (₹)</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="e.g. 25 per shirt / 10 per box"
                          value={form.pieceRate}
                          onChange={e => handleChange('pieceRate', e.target.value)}
                        />
                      </div>
                    )}

                    {/* Shift Assignment */}
                    <div className="staff-field">
                      <label>Assigned Work Shift</label>
                      <select
                        value={form.shiftName}
                        onChange={e => handleChange('shiftName', e.target.value)}
                      >
                        {SHIFTS.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Late Arrival Rule */}
                    <div className="staff-field">
                      <label>Late-In Penalty Rule</label>
                      <select
                        value={form.lateRule}
                        onChange={e => handleChange('lateRule', e.target.value)}
                      >
                        <option value="3_lates_half_day">3 Late arrivals = 0.5 Day deduction</option>
                        <option value="strict">Strict (1-to-1 hourly deduction)</option>
                        <option value="none">No automated late penalty</option>
                      </select>
                    </div>

                    <div className="staff-field">
                      <label>Employment Status</label>
                      <select
                        value={form.status}
                        onChange={e => handleChange('status', e.target.value)}
                      >
                        <option value="active">Active Staff</option>
                        <option value="inactive">Inactive / On Leave</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Bank & Direct UPI */}
              {activeTab === 'bank' && (
                <div className="staff-tab-content">
                  <div className="staff-content-header">
                    <p className="staff-section-title"><Landmark size={14} /> Bank Account & UPI Details</p>
                    <p className="staff-section-subtitle">Disbursement credentials for direct bank payouts and instant UPI</p>
                  </div>
                  <div className="staff-form-grid">
                    <div className="staff-field" style={{ gridColumn: '1 / -1', background: '#eff6ff', padding: '1rem', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <QrCode size={20} className="text-blue-600" />
                        <div>
                          <label style={{ color: '#1e40af', fontWeight: 800 }}>Direct UPI ID (VPA)</label>
                          <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>
                            Enables 1-click mobile salary payout via GPay, PhonePe, Paytm, or BHIM
                          </div>
                        </div>
                      </div>
                      <input
                        type="text"
                        style={{ marginTop: '0.5rem', background: '#ffffff' }}
                        placeholder="e.g. 9876543210@paytm or rohan@okhdfcbank"
                        value={form.upiId}
                        onChange={e => handleChange('upiId', e.target.value)}
                      />
                    </div>

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
                        placeholder="e.g. State Bank of India, HDFC"
                        value={form.bankName}
                        onChange={e => handleChange('bankName', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Account Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 123456789012"
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
                      <label>Bank Branch Address</label>
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
                {activeTab === 'personal' && "Identity and contact details will appear on payslips."}
                {activeTab === 'work' && "Wage basis automatically controls daily attendance calculations."}
                {activeTab === 'bank' && "UPI ID generates instant QR code for mobile wage payouts."}
              </div>
              <div className="staff-footer-actions">
                <button type="button" className="staff-btn staff-btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="staff-btn staff-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingData ? 'Update Profile' : 'Save Staff Member'}
                </button>
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

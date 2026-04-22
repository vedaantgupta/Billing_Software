import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X,
  User,
  Briefcase,
  IndianRupee,
  ShieldCheck,
  Upload,
  Landmark,
  PieChart,
  FileText,
  Users,
  Handshake,
  CheckSquare,
  HelpCircle
} from 'lucide-react';
import { getItems, addItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import './AddLoan.css';

const TABS = [
  { id: 'identity', label: 'Identity', icon: User, desc: 'Personal & Type info' },
  { id: 'income', label: 'Income & Assets', icon: Briefcase, desc: 'Employment & liabilities' },
  { id: 'loan', label: 'Loan Details', icon: IndianRupee, desc: 'Principal & interest' },
  { id: 'guarantor', label: 'Guarantor & Docs', icon: ShieldCheck, desc: 'Guarantors & approvals' }
];

const EMPTY_FORM = {
  type: 'lend',
  contactId: '',
  transactionBank: '',
  relationship: '',
  fullName: '',
  dob: '',
  pan: '',
  aadhaar: '',
  parentName: '',
  maritalStatus: '',
  employmentStatus: 'salaried',
  employerName: '',
  monthlyIncome: '',
  employmentBankName: '',
  businessDetails: '',
  principal: '',
  interestType: 'simple',
  interestRate: '',
  tenure: '',
  tenureUnit: 'months',
  existingLoans: '',
  totalExistingEMIs: '',
  assetsOwned: '',
  coApplicantName: '',
  guarantorName: '',
  guarantorContact: '',
  loanCategory: 'personal',
  consentCibil: false,
  consentTerms: false,
  consentAccuracy: false
};

const AddLoanModal = ({ isOpen, onClose, onSave }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [contacts, setContacts] = useState([]);
  const [activeTab, setActiveTab] = useState('identity');
  const [saving, setSaving] = useState(false);

  const modalOpen = typeof isOpen === 'boolean' ? isOpen : true;

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    navigate('/loans');
  };

  useEffect(() => {
    if (!user?.id || !modalOpen) return;

    getItems('contacts', user.id).then(setContacts);
    setForm(EMPTY_FORM);
    setActiveTab('identity');
  }, [user?.id, modalOpen]);

  if (!modalOpen) return null;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const calculateEMIInfo = () => {
    const principal = parseFloat(form.principal) || 0;
    const rate = parseFloat(form.interestRate) || 0;
    const tenureMonths = form.tenureUnit === 'years' ? Number(form.tenure) * 12 : Number(form.tenure);

    if (!principal || !tenureMonths) return { emi: 0, totalInterest: 0 };
    if (!rate || form.interestType === 'none') {
      return { emi: principal / tenureMonths, totalInterest: 0 };
    }

    if (form.interestType === 'simple') {
      const totalInterest = principal * (rate / 100) * (tenureMonths / 12);
      const emi = (principal + totalInterest) / tenureMonths;
      return { emi, totalInterest };
    } else {
      const monthlyRate = rate / 1200;
      const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
      const totalRepayment = emi * tenureMonths;
      return { emi, totalInterest: totalRepayment - principal };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.contactId) return alert('Select contact');

    const { emi } = calculateEMIInfo();

    setSaving(true);
    try {
      await addItem(
        'loans',
        {
          ...form,
          emi: emi,
          status: 'active',
          repaidAmount: 0,
          createdAt: new Date().toISOString()
        },
        user.id
      );
      onSave && onSave();
      handleClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const activeIndex = TABS.findIndex(tab => tab.id === activeTab);
  const previousTab = activeIndex > 0 ? TABS[activeIndex - 1] : null;
  const nextTab = activeIndex < TABS.length - 1 ? TABS[activeIndex + 1] : null;
  const { emi, totalInterest } = calculateEMIInfo();

  return createPortal(
    <div className="staff-modal-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="staff-modal" role="dialog" aria-modal="true" aria-labelledby="loan-modal-title">
        <div className="staff-modal-header">
          <h2 id="loan-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '15px', wordSpacing: '3px' }}>
            <i className="bi bi-wallet2" style={{ fontSize: '1.6rem', color: '#4f46e5' }}></i>
            Add New Loan
          </h2>
          <button type="button" className="staff-modal-close" onClick={handleClose} aria-label="Close loan form">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="staff-modal-form-container">
          <div className="staff-modal-sidebar">
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`staff-sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="staff-modal-main">
            <div className="staff-modal-body">
              {activeTab === 'identity' && (
                <div className="staff-tab-content">
                  <div className="staff-content-header">
                    <p className="staff-section-title"><CheckSquare size={14} /> Essential Identity & Type</p>
                    <p className="staff-section-subtitle">Define the nature of the loan and involved parties</p>
                  </div>
                  <div className="staff-form-grid" style={{ marginBottom: '30px' }}>
                    <div className="staff-field">
                      <label>Loan Type *</label>
                      <select value={form.type} onChange={e => handleChange('type', e.target.value)} required>
                        <option value="lend">Given (Lent)</option>
                        <option value="borrow">Taken (Borrowed)</option>
                      </select>
                    </div>
                    <div className="staff-field">
                      <label>Select Contact *</label>
                      <select value={form.contactId} onChange={e => handleChange('contactId', e.target.value)} required>
                        <option value="">Select Contact</option>
                        {contacts.map(contact => (
                          <option key={contact.id || contact._dbId} value={contact.id || contact._dbId}>
                            {contact.companyName || contact.contactName || contact.customerName || contact.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="staff-field">
                      <label>Transaction Bank</label>
                      <input
                        placeholder="e.g. HDFC Bank"
                        value={form.transactionBank}
                        onChange={e => handleChange('transactionBank', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Relationship</label>
                      <input
                        placeholder="e.g. Vendor, Partner"
                        value={form.relationship}
                        onChange={e => handleChange('relationship', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="staff-content-header">
                    <p className="staff-section-title"><User size={14} /> Applicant's Personal Details</p>
                    <p className="staff-section-subtitle">Core identity information</p>
                  </div>
                  <div className="staff-form-grid">
                    <div className="staff-field">
                      <label>Full Name (As per ID)</label>
                      <input
                        placeholder="e.g. Rahul Sharma"
                        value={form.fullName}
                        onChange={e => handleChange('fullName', e.target.value)}
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
                      <label>PAN Card Number</label>
                      <input
                        placeholder="ABCDE1234F"
                        value={form.pan}
                        onChange={e => handleChange('pan', e.target.value.toUpperCase())}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Aadhaar Number</label>
                      <input
                        placeholder="1234 5678 9012"
                        value={form.aadhaar}
                        onChange={e => handleChange('aadhaar', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Father's / Mother's Name</label>
                      <input
                        placeholder="Parent Name"
                        value={form.parentName}
                        onChange={e => handleChange('parentName', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Marital Status</label>
                      <select value={form.maritalStatus} onChange={e => handleChange('maritalStatus', e.target.value)}>
                        <option value="">Select</option>
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'income' && (
                <div className="staff-tab-content">
                  <div className="staff-content-header">
                    <p className="staff-section-title"><Briefcase size={14} /> Employment and Income Details</p>
                    <p className="staff-section-subtitle">Financial stability and income sources</p>
                  </div>
                  <div className="staff-form-grid" style={{ marginBottom: '30px' }}>
                    <div className="staff-field">
                      <label>Employment Status</label>
                      <select value={form.employmentStatus} onChange={e => handleChange('employmentStatus', e.target.value)}>
                        <option value="salaried">Salaried</option>
                        <option value="self-employed">Self Employed</option>
                        <option value="business">Business</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="staff-field">
                      <label>Employer / Business</label>
                      <input
                        placeholder="Employer or Business Name"
                        value={form.employerName}
                        onChange={e => handleChange('employerName', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Gross Monthly (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 50000"
                        value={form.monthlyIncome}
                        onChange={e => handleChange('monthlyIncome', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Salary Bank Name</label>
                      <input
                        placeholder="e.g. SBI"
                        value={form.employmentBankName}
                        onChange={e => handleChange('employmentBankName', e.target.value)}
                      />
                    </div>
                    <div className="staff-field" style={{ gridColumn: '1 / -1' }}>
                      <label>Business Details</label>
                      <textarea
                        placeholder="Nature of business, GST, etc... (If Self-Employed)"
                        value={form.businessDetails}
                        onChange={e => handleChange('businessDetails', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="staff-content-header">
                    <p className="staff-section-title"><PieChart size={14} /> Existing Liabilities and Assets</p>
                    <p className="staff-section-subtitle">Current financial standing</p>
                  </div>
                  <div className="staff-form-grid">
                    <div className="staff-field">
                      <label>Existing Loans (₹)</label>
                      <input
                        type="number"
                        placeholder="Total outstanding"
                        value={form.existingLoans}
                        onChange={e => handleChange('existingLoans', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Total EMIs (₹/mo)</label>
                      <input
                        type="number"
                        placeholder="Monthly obligations"
                        value={form.totalExistingEMIs}
                        onChange={e => handleChange('totalExistingEMIs', e.target.value)}
                      />
                    </div>
                    <div className="staff-field" style={{ gridColumn: '1 / -1' }}>
                      <label>Assets Owned</label>
                      <input
                        placeholder="Land, Building, Gold, Vehicles..."
                        value={form.assetsOwned}
                        onChange={e => handleChange('assetsOwned', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'loan' && (
                <div className="staff-tab-content">
                  <div className="staff-content-header">
                    <p className="staff-section-title"><IndianRupee size={14} /> Loan Requirements</p>
                    <p className="staff-section-subtitle">Principal, terms, and repayment estimations</p>
                  </div>
                  <div className="staff-form-grid" style={{ marginBottom: '20px' }}>
                    <div className="staff-field">
                      <label>Principal Amount (₹)</label>
                      <input
                        type="number"
                        placeholder="Requested Amount"
                        value={form.principal}
                        onChange={e => handleChange('principal', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Interest Type</label>
                      <select value={form.interestType} onChange={e => handleChange('interestType', e.target.value)}>
                        <option value="simple">Simple</option>
                        <option value="reducing">Reducing</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                    <div className="staff-field">
                      <label>Interest Rate (% P.A.)</label>
                      <input
                        type="number"
                        placeholder="e.g. 12"
                        value={form.interestRate}
                        onChange={e => handleChange('interestRate', e.target.value)}
                      />
                    </div>
                    <div className="staff-field" style={{ display: 'flex', gap: '8px' }}>
                      <label style={{ flex: 'none', width: '120px' }}>Tenure</label>
                      <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                        <input
                          type="number"
                          placeholder="Duration"
                          value={form.tenure}
                          onChange={e => handleChange('tenure', e.target.value)}
                          style={{ width: '60%' }}
                        />
                        <select
                          value={form.tenureUnit}
                          onChange={e => handleChange('tenureUnit', e.target.value)}
                          style={{ width: '40%', paddingLeft: '8px' }}
                        >
                          <option value="months">Months</option>
                          <option value="years">Years</option>
                        </select>
                      </div>
                    </div>
                    <div className="staff-field" style={{ gridColumn: '1 / -1' }}>
                      <div style={{ display: 'flex', gap: '2rem', background: '#f8fafc', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estimated Monthly Repayment</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4f46e5', marginTop: '4px' }}>₹{Math.round(emi).toLocaleString()}</div>
                        </div>
                        <div style={{ width: '1px', background: '#cbd5e1' }}></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Interest</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>₹{Math.round(totalInterest).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="staff-content-header" style={{ marginTop: '30px' }}>
                    <p className="staff-section-title"><HelpCircle size={14} /> Specific Loan Type Details</p>
                    <p className="staff-section-subtitle">Categorize the requested loan</p>
                  </div>
                  <div className="staff-form-grid">
                    <div className="staff-field">
                      <label>Category</label>
                      <select value={form.loanCategory} onChange={e => handleChange('loanCategory', e.target.value)}>
                        <option value="personal">Personal</option>
                        <option value="business">Business</option>
                        <option value="home">Home</option>
                        <option value="vehicle">Vehicle</option>
                        <option value="education">Education</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'guarantor' && (
                <div className="staff-tab-content">
                  <div className="staff-content-header">
                    <p className="staff-section-title"><Users size={14} /> Guarantor / Co-Applicant Details</p>
                    <p className="staff-section-subtitle">Secondary liability assignments</p>
                  </div>
                  <div className="staff-form-grid" style={{ marginBottom: '30px' }}>
                    <div className="staff-field">
                      <label>Co-Applicant Name</label>
                      <input
                        placeholder="e.g. Smita Sharma"
                        value={form.coApplicantName}
                        onChange={e => handleChange('coApplicantName', e.target.value)}
                      />
                    </div>
                    <div className="staff-field">
                      <label>Guarantor Name</label>
                      <input
                        placeholder="e.g. Rohit Verma"
                        value={form.guarantorName}
                        onChange={e => handleChange('guarantorName', e.target.value)}
                      />
                    </div>
                    <div className="staff-field" style={{ gridColumn: '1 / -1' }}>
                      <label>Contact Info</label>
                      <input
                        placeholder="Contact number or email of Guarantor / Co-Applicant"
                        value={form.guarantorContact}
                        onChange={e => handleChange('guarantorContact', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="staff-content-header">
                    <p className="staff-section-title"><FileText size={14} /> Declarations and Consent</p>
                    <p className="staff-section-subtitle">Supporting documents & authorization</p>
                  </div>
                  <div className="staff-form-grid">
                    <div className="staff-field" style={{ gridColumn: '1 / -1' }}>
                      <div style={{ width: '100%', border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '2rem', textAlign: 'center', backgroundColor: '#f8fafc', color: '#64748b', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <Upload size={24} color="#6366f1" />
                        <strong style={{ color: '#1e293b' }}>Click or drag files to upload documents</strong>
                        <span style={{ fontSize: '0.8rem' }}>PDF, JPG, PNG up to 10MB (Photos, KYC, Statements)</span>
                      </div>
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: '10px', gap: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', gap: '10px', fontSize: '0.85rem', color: '#334155', fontWeight: '500', lineHeight: '1.4' }}>
                        <input
                          type="checkbox"
                          style={{ marginTop: '2px', flexShrink: 0, width: 'auto' }}
                          checked={form.consentCibil}
                          onChange={e => handleChange('consentCibil', e.target.checked)}
                        />
                        <span>I authorize the lender to check my credit report (CIBIL/Equifax).</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', gap: '10px', fontSize: '0.85rem', color: '#334155', fontWeight: '500', lineHeight: '1.4' }}>
                        <input
                          type="checkbox"
                          style={{ marginTop: '2px', flexShrink: 0, width: 'auto' }}
                          checked={form.consentTerms}
                          onChange={e => handleChange('consentTerms', e.target.checked)}
                        />
                        <span>I agree to the data privacy consent and information sharing terms.</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', gap: '10px', fontSize: '0.85rem', color: '#334155', fontWeight: '500', lineHeight: '1.4' }}>
                        <input
                          type="checkbox"
                          style={{ marginTop: '2px', flexShrink: 0, width: 'auto' }}
                          checked={form.consentAccuracy}
                          onChange={e => handleChange('consentAccuracy', e.target.checked)}
                        />
                        <span>I affirm that all information provided is accurate and complete.</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="staff-modal-footer">
              <div className="staff-footer-tips">
                {TABS.find(t => t.id === activeTab)?.desc}
              </div>
              <div className="staff-footer-btns">
                {previousTab && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab(previousTab.id);
                    }}
                  >
                    Previous
                  </button>
                )}
                {nextTab ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab(nextTab.id);
                    }}
                  >
                    Next Section
                  </button>
                ) : (
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Processing...' : 'Submit Loan Proposal'}
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

export default AddLoanModal;

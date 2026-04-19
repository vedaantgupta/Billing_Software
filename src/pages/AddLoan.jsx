import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Briefcase, IndianRupee, PieChart, Users, 
  FileText, ShieldCheck, Upload, ChevronRight, 
  ArrowLeft, Info, HelpCircle, Landmark, Car, 
  GraduationCap, Check, Save, X, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { getItems, addItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import './AddLoan.css';

const sections = [
  { id: 'identity', label: 'Identity & Type', icon: ShieldCheck },
  { id: 'personal', label: 'Personal Details', icon: User },
  { id: 'employment', label: 'Income & Job', icon: Briefcase },
  { id: 'loan', label: 'Loan Terms', icon: IndianRupee },
  { id: 'liabilities', label: 'Assets & Liabilities', icon: PieChart },
  { id: 'guarantor', label: 'Co-Applicant', icon: Users },
  { id: 'specifics', label: 'Loan Specifics', icon: HelpCircle },
  { id: 'docs', label: 'Documents & Consent', icon: FileText }
];

const AddLoan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('identity');
  const [contacts, setContacts] = useState([]);
  const sectionRefs = useRef({});

  // Form State
  const [formData, setFormData] = useState({
    // Section 1: Identity & Type
    type: 'lend', // lend = Given, borrow = Taken
    contactId: '',
    disbursementBank: '',
    
    // Section 2: Personal Details
    fullName: '',
    dob: '',
    pan: '',
    aadhaar: '',
    maritalStatus: 'single',
    dependents: '0',
    mobile: '',
    email: '',
    address: '',
    parentName: '',
    
    // Section 3: Employment & Income
    employmentStatus: 'salaried',
    employerName: '',
    occupation: '',
    experience: '',
    monthlyIncome: '',
    netIncome: '',
    bankAccount: '',
    bankBranch: '',
    businessNature: '', // For self-employed
    
    // Section 4: Loan Requirements
    principal: '',
    purpose: '',
    tenure: '',
    tenureUnit: 'months',
    interestType: 'simple',
    interestRate: '',
    startDate: new Date().toISOString().split('T')[0],
    
    // Section 5: Liabilities & Assets
    existingLoans: '',
    existingEmis: '',
    assetsOwned: '',
    investments: '',
    
    // Section 6: Co-Applicant
    coApplicantName: '',
    coApplicantPan: '',
    guarantorName: '',
    guarantorContact: '',
    
    // Section 7: Loan Specifics
    loanCategory: 'personal', // personal, mortgage, auto, education
    propertyDetails: '', // for mortgage
    vehicleDetails: '', // for auto
    admissionLetter: '', // for education
    
    // Section 8: Docs & Consent
    consentCibil: false,
    consentPrivacy: false,
    truthfulness: false,
    attachments: [] // List of file names
  });

  useEffect(() => {
    if (user?.id) {
      getItems('contacts', user.id).then(setContacts);
    }
  }, [user?.id]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const scrollToSection = (id) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const calculateEMI = () => {
    const P = parseFloat(formData.principal) || 0;
    const r = (parseFloat(formData.interestRate) || 0) / 1200; // Monthly rate
    const n = formData.tenureUnit === 'years' 
      ? (parseFloat(formData.tenure) || 0) * 12 
      : (parseFloat(formData.tenure) || 0);

    if (P === 0 || n === 0) return 0;
    if (formData.interestType === 'simple') {
      const totalInterest = (P * (parseFloat(formData.interestRate) || 0) * (n / 12)) / 100;
      return (P + totalInterest) / n;
    }

    // Compound Interest (Reducing)
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return emi;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    const emi = calculateEMI();
    const finalData = {
      ...formData,
      emi,
      status: 'active',
      repaidAmount: 0,
      payments: [],
      createdAt: new Date().toISOString()
    };

    try {
      await addItem('loans', finalData, user.id);
      navigate('/loans');
    } catch (err) {
      console.error('Failed to save loan:', err);
      alert('Error saving loan. Please try again.');
    }
  };

  return (
    <div className="al-container">
      {/* Sidebar Nav */}
      <div className="al-sidebar">
        <h3 style={{ margin: '0 0 1rem 1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>LOAN SECTIONS</h3>
        {sections.map(s => (
          <div 
            key={s.id} 
            className={`al-nav-item ${activeSection === s.id ? 'active' : ''}`}
            onClick={() => scrollToSection(s.id)}
          >
            <s.icon className="al-nav-icon" />
            <span>{s.label}</span>
          </div>
        ))}
        <div style={{ marginTop: 'auto', padding: '1rem' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/loans')} style={{ width: '100%', justifyContent: 'flex-start', gap: '8px' }}>
            <ArrowLeft size={16} /> Exit Editor
          </button>
        </div>
      </div>

      {/* Form Content */}
      <form className="al-form-content" onSubmit={handleSubmit}>
        
        {/* Section 1: Identity & Type */}
        <div className="al-section" ref={el => sectionRefs.current['identity'] = el}>
          <div className="al-section-header">
            <ShieldCheck className="al-header-icon" />
            <h2>1. Essential Identity & Type</h2>
          </div>
          <div className="al-grid">
            <div className="al-field full">
              <label>What type of loan is this?</label>
              <div className="al-type-toggle">
                <button 
                  type="button" 
                  className={`al-toggle-btn ${formData.type === 'lend' ? 'active lend' : ''}`}
                  onClick={() => setFormData(p => ({...p, type: 'lend'}))}
                >
                  <ArrowUpRight size={16} style={{marginRight: '8px'}} /> Given (Lent)
                </button>
                <button 
                  type="button" 
                  className={`al-toggle-btn ${formData.type === 'borrow' ? 'active borrow' : ''}`}
                  onClick={() => setFormData(p => ({...p, type: 'borrow'}))}
                >
                  <ArrowDownLeft size={16} style={{marginRight: '8px'}} /> Taken (Borrowed)
                </button>
              </div>
            </div>
            <div className="al-field">
              <label>Select Contact</label>
              <select name="contactId" value={formData.contactId} onChange={handleInputChange} required>
                <option value="">-- Choose Contact --</option>
                {contacts.map(c => (
                  <option key={c.id || c._dbId} value={c.id || c._dbId}>
                    {c.companyName || c.contactName}
                  </option>
                ))}
              </select>
            </div>
            <div className="al-field">
              <label>Transaction Bank</label>
              <input 
                list="bank-list" 
                name="disbursementBank" 
                value={formData.disbursementBank} 
                onChange={handleInputChange} 
                placeholder="Select or type bank name" 
              />
              <datalist id="bank-list">
                <option value="Cash" />
                <option value="HDFC Bank" />
                <option value="ICICI Bank" />
                <option value="State Bank of India (SBI)" />
                <option value="Axis Bank" />
                <option value="Kotak Mahindra Bank" />
                <option value="Bank of Baroda" />
                <option value="Punjab National Bank" />
                <option value="UPI / Digital" />
              </datalist>
            </div>
            <div className="al-field">
              <label>Relationship with Borrower</label>
              <input type="text" name="purpose" value={formData.purpose} onChange={handleInputChange} placeholder="e.g. Supplier, Employee, Friend" />
            </div>
          </div>
        </div>

        {/* Section 2: Personal Details */}
        <div className="al-section" ref={el => sectionRefs.current['personal'] = el}>
          <div className="al-section-header">
            <User className="al-header-icon" />
            <h2>2. Applicant's Personal Details</h2>
          </div>
          <div className="al-grid">
            <div className="al-field">
              <label>Full Name (As per ID)</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} required />
            </div>
            <div className="al-field">
              <label>Date of Birth</label>
              <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} />
            </div>
            <div className="al-field">
              <label>PAN Card Number</label>
              <input type="text" name="pan" value={formData.pan} onChange={handleInputChange} placeholder="ABCDE1234F" />
            </div>
            <div className="al-field">
              <label>Aadhaar Number</label>
              <input type="text" name="aadhaar" value={formData.aadhaar} onChange={handleInputChange} placeholder="XXXX XXXX XXXX" />
            </div>
            <div className="al-field">
              <label>Father's / Mother's Name</label>
              <input type="text" name="parentName" value={formData.parentName} onChange={handleInputChange} />
            </div>
            <div className="al-field">
              <label>Marital Status</label>
              <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange}>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Employment & Income */}
        <div className="al-section" ref={el => sectionRefs.current['employment'] = el}>
          <div className="al-section-header">
            <Briefcase className="al-header-icon" />
            <h2>3. Employment and Income Details</h2>
          </div>
          <div className="al-grid">
            <div className="al-field">
              <label>Employment Status</label>
              <select name="employmentStatus" value={formData.employmentStatus} onChange={handleInputChange}>
                <option value="salaried">Salaried</option>
                <option value="self-employed">Self-Employed / Business</option>
                <option value="retired">Retired</option>
                <option value="student">Student</option>
              </select>
            </div>
            <div className="al-field">
              <label>Employer / Business Name</label>
              <input type="text" name="employerName" value={formData.employerName} onChange={handleInputChange} />
            </div>
            <div className="al-field">
              <label>Gross Monthly Income (₹)</label>
              <input type="number" name="monthlyIncome" value={formData.monthlyIncome} onChange={handleInputChange} />
            </div>
            <div className="al-field">
              <label>Bank Name</label>
              <input type="text" name="bankAccount" value={formData.bankAccount} onChange={handleInputChange} placeholder="e.g. HDFC, SBI" />
            </div>
            <div className="al-field full">
              <label>Business Details (If Self-Employed)</label>
              <textarea name="businessNature" value={formData.businessNature} onChange={handleInputChange} rows="2" placeholder="Nature of business, address, etc."></textarea>
            </div>
          </div>
        </div>

        {/* Section 4: Loan terms */}
        <div className="al-section" ref={el => sectionRefs.current['loan'] = el}>
          <div className="al-section-header">
            <IndianRupee className="al-header-icon" />
            <h2>4. Loan Requirements</h2>
          </div>
          <div className="al-grid">
            <div className="al-field">
              <label>Requested Principal Amount (₹)</label>
              <input type="number" name="principal" value={formData.principal} onChange={handleInputChange} required />
            </div>
            <div className="al-field">
              <label>Interest Type</label>
              <select name="interestType" value={formData.interestType} onChange={handleInputChange}>
                <option value="simple">Simple Interest</option>
                <option value="compound">Compound (Reducing Balance)</option>
              </select>
            </div>
            <div className="al-field">
              <label>Interest Rate (% P.A.)</label>
              <input type="number" name="interestRate" value={formData.interestRate} onChange={handleInputChange} step="0.1" />
            </div>
            <div className="al-field">
              <label>Tenure</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" name="tenure" value={formData.tenure} onChange={handleInputChange} style={{ flex: 1 }} />
                <select name="tenureUnit" value={formData.tenureUnit} onChange={handleInputChange} style={{ width: '100px' }}>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'var(--primary-color)', color: 'white', borderRadius: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, opacity: 0.8, fontSize: '0.8rem' }}>ESTIMATED MONTHLY REPAYMENT</p>
              <h2 style={{ margin: 0, fontSize: '2rem' }}>₹{Math.round(calculateEMI()).toLocaleString()}</h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, opacity: 0.8, fontSize: '0.8rem' }}>TOTAL INTEREST</p>
              <h3 style={{ margin: 0 }}>₹{Math.round((calculateEMI() * (formData.tenureUnit === 'years' ? formData.tenure * 12 : formData.tenure)) - formData.principal || 0).toLocaleString()}</h3>
            </div>
          </div>
        </div>

        {/* Section 5: Liabilities & Assets */}
        <div className="al-section" ref={el => sectionRefs.current['liabilities'] = el}>
          <div className="al-section-header">
            <PieChart className="al-header-icon" />
            <h2>5. Existing Liabilities and Assets</h2>
          </div>
          <div className="al-grid">
            <div className="al-field">
              <label>Current Outstanding Loans (₹)</label>
              <input type="number" name="existingLoans" value={formData.existingLoans} onChange={handleInputChange} />
            </div>
            <div className="al-field">
              <label>Total Existing EMIs (₹/mo)</label>
              <input type="number" name="existingEmis" value={formData.existingEmis} onChange={handleInputChange} />
            </div>
            <div className="al-field full">
              <label>Assets Owned (Land, Building, Gold)</label>
              <textarea name="assetsOwned" value={formData.assetsOwned} onChange={handleInputChange} rows="2" placeholder="Details of immovable property or high-value assets"></textarea>
            </div>
          </div>
        </div>

        {/* Section 6: Co-Applicant */}
        <div className="al-section" ref={el => sectionRefs.current['guarantor'] = el}>
          <div className="al-section-header">
            <Users className="al-header-icon" />
            <h2>6. Guarantor / Co-Applicant Details</h2>
          </div>
          <div className="al-grid">
            <div className="al-field">
              <label>Co-Applicant Name</label>
              <input type="text" name="coApplicantName" value={formData.coApplicantName} onChange={handleInputChange} />
            </div>
            <div className="al-field">
              <label>Guarantor Name</label>
              <input type="text" name="guarantorName" value={formData.guarantorName} onChange={handleInputChange} />
            </div>
            <div className="al-field full">
              <label>Contact Info for Co-Applicant / Guarantor</label>
              <input type="text" name="guarantorContact" value={formData.guarantorContact} onChange={handleInputChange} placeholder="Mobile, Email or Address" />
            </div>
          </div>
        </div>

        {/* Section 7: Loan Specifics */}
        <div className="al-section" ref={el => sectionRefs.current['specifics'] = el}>
          <div className="al-section-header">
            <HelpCircle className="al-header-icon" />
            <h2>7. Specific Loan Type Details</h2>
          </div>
          <div className="al-grid">
            <div className="al-field">
              <label>Category</label>
              <select name="loanCategory" value={formData.loanCategory} onChange={handleInputChange}>
                <option value="personal">General / Personal</option>
                <option value="mortgage">Mortgage / Home</option>
                <option value="auto">Auto / Vehicle</option>
                <option value="education">Education</option>
              </select>
            </div>

            {formData.loanCategory === 'mortgage' && (
              <div className="al-field full">
                <label>Property Details</label>
                <textarea name="propertyDetails" value={formData.propertyDetails} onChange={handleInputChange} rows="3" placeholder="Address, Sale agreement info, approved plan..."></textarea>
              </div>
            )}
            {formData.loanCategory === 'auto' && (
              <div className="al-field full">
                <label>Vehicle Quotation / Dealer Info</label>
                <textarea name="vehicleDetails" value={formData.vehicleDetails} onChange={handleInputChange} rows="3" placeholder="Make, Model, Dealer Name, RTO registration..."></textarea>
              </div>
            )}
            {formData.loanCategory === 'education' && (
              <div className="al-field full">
                <label>Letter of Admission & Fee Structure</label>
                <textarea name="admissionLetter" value={formData.admissionLetter} onChange={handleInputChange} rows="3" placeholder="Course name, College, Duration, Fee details..."></textarea>
              </div>
            )}
          </div>
        </div>

        {/* Section 8: Docs & Consent */}
        <div className="al-section" ref={el => sectionRefs.current['docs'] = el}>
          <div className="al-section-header">
            <FileText className="al-header-icon" />
            <h2>8. Declarations and Consent</h2>
          </div>
          
          <div className="al-field full">
            <label>Upload Supporting Documents (Photos, KYC, Statements)</label>
            <div className="al-upload-zone">
              <Upload size={32} style={{ color: 'var(--primary-color)', marginBottom: '1rem' }} />
              <p>Click or drag files to upload documents</p>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PDF, JPG, PNG up to 10MB</span>
            </div>
          </div>

          <div className="al-checklist" style={{ marginTop: '2rem' }}>
            <label className="al-check-item">
              <input type="checkbox" name="consentCibil" checked={formData.consentCibil} onChange={handleInputChange} required />
              <span>I authorize the lender to check my credit report (CIBIL/Equifax).</span>
            </label>
            <label className="al-check-item">
              <input type="checkbox" name="consentPrivacy" checked={formData.consentPrivacy} onChange={handleInputChange} required />
              <span>I agree to the data privacy consent and information sharing terms.</span>
            </label>
            <label className="al-check-item">
              <input type="checkbox" name="truthfulness" checked={formData.truthfulness} onChange={handleInputChange} required />
              <span>I affirm that all information provided is accurate and complete.</span>
            </label>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="al-footer">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/loans')}>Cancel</button>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 3rem' }}>
            <Save size={18} style={{marginRight: '8px'}} /> Save Complete Loan Application
          </button>
        </div>

      </form>
    </div>
  );
};

export default AddLoan;

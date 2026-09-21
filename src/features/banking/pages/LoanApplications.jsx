import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Plus, ArrowLeft, Search, Filter, CheckCircle2,
  AlertCircle, ShieldCheck, UserCheck, DollarSign, ArrowRight,
  Printer, X, Eye, FileSignature, Wallet, Clock, Activity, Landmark
} from 'lucide-react';
import { getItems, addItem, updateItem } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import { assessUnderwriting, generateAmortizationSchedule, formatINR } from '@/utils/loanEngine';
import SanctionLetterModal from '@/features/banking/components/SanctionLetterModal';
import '@/features/banking/styles/LoanApplications.css';

const STAGES = [
  { id: 'all', label: 'All Applications' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'kyc_pending', label: 'KYC & Docs' },
  { id: 'underwriting', label: 'Underwriting' },
  { id: 'approved', label: 'Approved' },
  { id: 'sanctioned', label: 'Sanctioned' },
  { id: 'disbursed', label: 'Disbursed' }
];

const DEFAULT_APPLICATIONS = [
  {
    applicationNumber: 'APP-2026-081',
    applicantName: 'Suresh Raina',
    contactPhone: '9845123456',
    contactEmail: 'suresh.r@example.com',
    requestedAmount: 750000,
    loanCategory: 'personal',
    tenure: 36,
    tenureUnit: 'months',
    interestRate: 11.5,
    interestMethod: 'reducing',
    stage: 'underwriting',
    monthlyIncome: 85000,
    existingEMIs: 12000,
    employmentStatus: 'salaried',
    employerName: 'Infosys Ltd',
    applicantAge: 32,
    employmentYears: 5,
    creditScore: 780,
    hasExistingDefaults: false,
    collateralValue: 0,
    createdAt: new Date().toISOString().split('T')[0]
  },
  {
    applicationNumber: 'APP-2026-082',
    applicantName: 'Greenfield Retail Ventures',
    contactPhone: '9811223344',
    contactEmail: 'accounts@greenfield.in',
    requestedAmount: 3500000,
    loanCategory: 'business',
    tenure: 48,
    tenureUnit: 'months',
    interestRate: 13.0,
    interestMethod: 'reducing',
    stage: 'approved',
    monthlyIncome: 350000,
    existingEMIs: 45000,
    employmentStatus: 'business',
    employerName: 'Greenfield Retail LLP',
    applicantAge: 41,
    employmentYears: 8,
    creditScore: 745,
    hasExistingDefaults: false,
    collateralValue: 5000000,
    createdAt: new Date(Date.now() - 86400000).toISOString().split('T')[0]
  }
];

const LoanApplications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [products, setProducts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [activeApp, setActiveApp] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSanctionModal, setShowSanctionModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form for new application
  const [form, setForm] = useState({
    applicantName: '',
    contactId: '',
    contactPhone: '',
    contactEmail: '',
    requestedAmount: 500000,
    loanCategory: 'personal',
    tenure: 24,
    tenureUnit: 'months',
    interestRate: 12.0,
    interestMethod: 'reducing',
    monthlyIncome: 60000,
    existingEMIs: 5000,
    employmentStatus: 'salaried',
    employerName: '',
    applicantAge: 30,
    employmentYears: 3,
    creditScore: 740,
    hasExistingDefaults: false,
    collateralValue: 0
  });

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [fetchedApps, fetchedProds, fetchedContacts] = await Promise.all([
        getItems('loan_applications', user.id),
        getItems('loan_products', user.id),
        getItems('contacts', user.id)
      ]);

      if (!fetchedApps || fetchedApps.length === 0) {
        const seeded = [];
        for (const app of DEFAULT_APPLICATIONS) {
          const res = await addItem('loan_applications', app, user.id);
          seeded.push(res || app);
        }
        setApplications(seeded);
      } else {
        setApplications(fetchedApps);
      }
      setProducts(fetchedProds || []);
      setContacts(fetchedContacts || []);
    } catch (err) {
      console.error('Failed to load loan applications:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateApplication = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    const appNumber = `APP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const payload = {
      ...form,
      applicationNumber: appNumber,
      requestedAmount: parseFloat(form.requestedAmount) || 0,
      tenure: parseInt(form.tenure) || 12,
      interestRate: parseFloat(form.interestRate) || 12,
      monthlyIncome: parseFloat(form.monthlyIncome) || 0,
      existingEMIs: parseFloat(form.existingEMIs) || 0,
      applicantAge: parseInt(form.applicantAge) || 30,
      employmentYears: parseInt(form.employmentYears) || 1,
      creditScore: parseInt(form.creditScore) || 750,
      collateralValue: parseFloat(form.collateralValue) || 0,
      stage: 'submitted',
      createdAt: new Date().toISOString().split('T')[0]
    };

    try {
      await addItem('loan_applications', payload, user.id);
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      console.error('Failed to create application:', err);
    }
  };

  const handleUpdateStage = async (appId, nextStage) => {
    if (!user?.id) return;
    try {
      await updateItem('loan_applications', appId, { stage: nextStage }, user.id);
      if (activeApp && (activeApp.id === appId || activeApp._dbId === appId)) {
        setActiveApp(prev => ({ ...prev, stage: nextStage }));
      }
      loadData();
    } catch (err) {
      console.error('Failed to update stage:', err);
    }
  };

  // FULL DISBURSEMENT: Converts application into an active servicing loan!
  const handleDisburseLoan = async (app) => {
    if (!user?.id) return;
    const confirmDisburse = window.confirm(
      `Confirm formal disbursement of ₹${(app.requestedAmount || 0).toLocaleString()} for ${app.applicantName}? This will generate the active loan and repayment schedule.`
    );
    if (!confirmDisburse) return;

    try {
      const appId = app.id || app._dbId;

      // 1. Generate Amortization Schedule
      const schedResult = generateAmortizationSchedule({
        principal: app.requestedAmount,
        interestRate: app.interestRate,
        tenure: app.tenure,
        tenureUnit: app.tenureUnit || 'months',
        interestType: app.interestMethod || 'reducing',
        frequency: 'monthly',
        processingFee: Math.round(app.requestedAmount * 0.015),
        documentationFee: 1500
      });

      // 2. Create Active Loan in 'loans' collection
      const newLoanPayload = {
        applicationId: appId,
        type: 'lend', // Lender portfolio
        contactId: app.contactId || '',
        fullName: app.applicantName,
        phone: app.contactPhone,
        email: app.contactEmail,
        principal: app.requestedAmount,
        interestRate: app.interestRate,
        interestType: app.interestMethod || 'reducing',
        tenure: app.tenure,
        tenureUnit: app.tenureUnit || 'months',
        emi: schedResult.emi,
        totalPayable: schedResult.totalPayable,
        repaidAmount: 0,
        status: 'active',
        stage: 'disbursed',
        disbursementDate: new Date().toISOString().split('T')[0],
        disbursementUTR: `UTR${Date.now().toString().slice(-9)}`,
        schedule: schedResult.schedule,
        payments: [],
        createdAt: new Date().toISOString()
      };

      const createdLoan = await addItem('loans', newLoanPayload, user.id);

      // 3. Record Initial Ledger Event
      await addItem('loan_ledger', {
        loanId: createdLoan?.id || createdLoan?._dbId || appId,
        borrowerName: app.applicantName,
        eventType: 'DISBURSEMENT',
        amount: app.requestedAmount,
        date: new Date().toISOString().split('T')[0],
        description: `Loan disbursement for Application ${app.applicationNumber || appId}`,
        refNumber: newLoanPayload.disbursementUTR,
        authorizedBy: user.username || user.firstName || 'Loan Manager'
      }, user.id);

      // 4. Update Application Stage to 'disbursed'
      await updateItem('loan_applications', appId, { 
        stage: 'disbursed', 
        disbursedLoanId: createdLoan?.id || createdLoan?._dbId,
        disbursedAt: new Date().toISOString() 
      }, user.id);

      alert(`Loan successfully disbursed! Active loan agreement created.`);
      setShowDetailModal(false);
      loadData();
      navigate(`/loans/${createdLoan?.id || createdLoan?._dbId}`);
    } catch (err) {
      console.error('Failed to disburse loan:', err);
    }
  };

  const filteredApps = applications.filter(app => {
    const matchesStage = selectedStage === 'all' || app.stage === selectedStage;
    const matchesSearch = 
      app.applicantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.applicationNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.contactPhone?.includes(searchQuery);
    return matchesStage && matchesSearch;
  });

  return (
    <div className="la-container">
      {/* Header */}
      <div className="la-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/loans')} style={{ padding: '0.4rem' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="la-title">
              <div className="la-title-icon"><FileText size={22} /></div>
              Loan Origination Workspace
            </h1>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
              Applications pipeline: KYC verification, underwriting assessment, sanction, and disbursement
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} /> New Loan Application
          </button>
        </div>
      </div>

      {/* Stage Stepper Tabs */}
      <div className="la-stepper">
        {STAGES.map(s => (
          <div 
            key={s.id} 
            className={`la-step-item ${selectedStage === s.id ? 'active' : ''}`}
            onClick={() => setSelectedStage(s.id)}
          >
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Control Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div className="lm-search-box" style={{ width: '320px' }}>
          <Search className="lm-search-icon" size={16} />
          <input 
            className="lm-search-input" 
            placeholder="Search by applicant, app number, phone..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
          Showing {filteredApps.length} applications
        </div>
      </div>

      {/* Applications Table */}
      <div className="la-table-card">
        <table className="la-table">
          <thead>
            <tr>
              <th>App Number</th>
              <th>Applicant</th>
              <th>Requested Facility</th>
              <th>Tenure / Rate</th>
              <th>Credit / Risk</th>
              <th>Current Stage</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredApps.map(app => {
              const id = app.id || app._dbId;
              const uw = assessUnderwriting({
                monthlyIncome: app.monthlyIncome || 60000,
                existingEMIs: app.existingEMIs || 5000,
                proposedEMI: (app.requestedAmount || 100000) * 0.04,
                loanAmount: app.requestedAmount,
                collateralValue: app.collateralValue || 0,
                creditScore: app.creditScore || 750,
                employmentYears: app.employmentYears || 3,
                hasExistingDefaults: app.hasExistingDefaults
              });

              return (
                <tr key={id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{app.applicationNumber || id.slice(-8).toUpperCase()}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{app.createdAt || 'Recent'}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{app.applicantName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{app.contactPhone}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, color: '#4f46e5' }}>₹{(app.requestedAmount || 0).toLocaleString()}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'capitalize' }}>{app.loanCategory} Loan</div>
                  </td>
                  <td>
                    <div>{app.tenure} {app.tenureUnit || 'months'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{app.interestRate}% ({app.interestMethod})</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Activity size={14} color={uw.badgeColor} />
                      <span style={{ fontWeight: 700, color: uw.badgeColor }}>Score: {app.creditScore || 750}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>FOIR: {uw.foir}%</div>
                  </td>
                  <td>
                    <span className={`la-stage-pill ${app.stage || 'submitted'}`}>
                      {app.stage?.replace('_', ' ') || 'Submitted'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setActiveApp(app);
                          setShowDetailModal(true);
                        }}
                      >
                        <Eye size={14} /> Review
                      </button>

                      {app.stage === 'approved' && (
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#0f766e', borderColor: '#99f6e4' }}
                          onClick={() => {
                            setActiveApp(app);
                            setShowSanctionModal(true);
                          }}
                        >
                          <FileSignature size={14} /> Sanction
                        </button>
                      )}

                      {(app.stage === 'sanctioned' || app.stage === 'approved') && (
                        <button 
                          className="btn btn-primary btn-sm"
                          style={{ background: '#059669', borderColor: '#059669' }}
                          onClick={() => handleDisburseLoan(app)}
                        >
                          <Wallet size={14} /> Disburse
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredApps.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  No loan applications found in this stage.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Application Detail & Underwriting Modal */}
      {showDetailModal && activeApp && (
        <div className="lp-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="lp-modal" style={{ maxWidth: '850px' }} onClick={e => e.stopPropagation()}>
            <div className="lp-modal-header">
              <div>
                <h2 className="lp-modal-title">Application Review: {activeApp.applicantName}</h2>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  {activeApp.applicationNumber} • Stage: <strong style={{ textTransform: 'capitalize' }}>{activeApp.stage}</strong>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setShowDetailModal(false)}><X size={18} /></button>
            </div>

            <div className="lp-modal-body">
              {/* Underwriting Assessment Section */}
              <div className="la-underwrite-panel">
                <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} color="#4f46e5" />
                  Automated Credit Assessment & Underwriting Rules
                </h4>

                {(() => {
                  const uw = assessUnderwriting({
                    monthlyIncome: activeApp.monthlyIncome || 60000,
                    existingEMIs: activeApp.existingEMIs || 5000,
                    proposedEMI: (activeApp.requestedAmount || 100000) * 0.04,
                    loanAmount: activeApp.requestedAmount,
                    collateralValue: activeApp.collateralValue || 0,
                    creditScore: activeApp.creditScore || 750,
                    employmentYears: activeApp.employmentYears || 3,
                    hasExistingDefaults: activeApp.hasExistingDefaults
                  });

                  return (
                    <div>
                      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', background: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Underwriting Recommendation</div>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: uw.badgeColor }}>
                            {uw.recommendation.replace('_', ' ')}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Rule Score</div>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                            {uw.passedCount} / {uw.totalRules} Rules Passed ({uw.scorePercent}%)
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>FOIR (Debt-to-Income)</div>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: uw.foir <= 50 ? '#059669' : '#dc2626' }}>
                            {uw.foir}%
                          </div>
                        </div>
                      </div>

                      <div className="la-rules-grid">
                        {uw.rules.map((r, i) => (
                          <div key={i} className={`la-rule-box ${r.passed ? 'pass' : 'fail'}`}>
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>{r.rule}</div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Target: {r.threshold} | Actual: <strong>{r.actual}</strong></div>
                            </div>
                            {r.passed ? <CheckCircle2 size={16} color="#10b981" /> : <AlertCircle size={16} color="#ef4444" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Applicant Financial Snapshot */}
              <div className="lp-specs-grid" style={{ marginBottom: 0 }}>
                <div className="lp-spec-item">
                  <span className="lp-spec-label">Monthly Gross Income</span>
                  <span className="lp-spec-value">₹{(activeApp.monthlyIncome || 0).toLocaleString()}</span>
                </div>
                <div className="lp-spec-item">
                  <span className="lp-spec-label">Current Monthly Obligations</span>
                  <span className="lp-spec-value">₹{(activeApp.existingEMIs || 0).toLocaleString()}</span>
                </div>
                <div className="lp-spec-item">
                  <span className="lp-spec-label">Employer / Business</span>
                  <span className="lp-spec-value">{activeApp.employerName || 'Self-Employed'}</span>
                </div>
                <div className="lp-spec-item">
                  <span className="lp-spec-label">Credit Bureau Score</span>
                  <span className="lp-spec-value">{activeApp.creditScore || 750} (CIBIL/Equifax)</span>
                </div>
              </div>
            </div>

            <div className="lp-modal-footer" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleUpdateStage(activeApp.id || activeApp._dbId, 'rejected')}
                  style={{ color: '#ef4444' }}
                >
                  Reject
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowSanctionModal(true);
                  }}
                >
                  <Printer size={16} /> View Sanction Letter
                </button>

                {activeApp.stage === 'underwriting' && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleUpdateStage(activeApp.id || activeApp._dbId, 'approved')}
                  >
                    Approve Application
                  </button>
                )}

                {activeApp.stage === 'approved' && (
                  <button 
                    className="btn btn-primary"
                    style={{ background: '#0f766e', borderColor: '#0f766e' }}
                    onClick={() => handleUpdateStage(activeApp.id || activeApp._dbId, 'sanctioned')}
                  >
                    Generate & Sanction
                  </button>
                )}

                {(activeApp.stage === 'sanctioned' || activeApp.stage === 'approved') && (
                  <button 
                    className="btn btn-primary"
                    style={{ background: '#059669', borderColor: '#059669' }}
                    onClick={() => handleDisburseLoan(activeApp)}
                  >
                    Disburse Active Loan
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Application Creation Modal */}
      {showCreateModal && (
        <div className="lp-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="lp-modal" style={{ maxWidth: '750px' }} onClick={e => e.stopPropagation()}>
            <div className="lp-modal-header">
              <h2 className="lp-modal-title">New Loan Origination Proposal</h2>
              <button className="btn-icon" onClick={() => setShowCreateModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateApplication}>
              <div className="lp-modal-body">
                <div className="lp-form-row">
                  <div className="lp-field">
                    <label>Applicant Name *</label>
                    <input 
                      required 
                      value={form.applicantName} 
                      onChange={e => setForm({ ...form, applicantName: e.target.value })} 
                      placeholder="e.g. Ramesh Kumar"
                    />
                  </div>
                  <div className="lp-field">
                    <label>Existing Contact (Optional)</label>
                    <select 
                      value={form.contactId} 
                      onChange={e => {
                        const cid = e.target.value;
                        const c = contacts.find(item => item.id === cid || item._dbId === cid);
                        setForm(prev => ({
                          ...prev,
                          contactId: cid,
                          applicantName: c ? (c.companyName || c.contactName || c.name) : prev.applicantName,
                          contactPhone: c?.phone || prev.contactPhone,
                          contactEmail: c?.email || prev.contactEmail
                        }));
                      }}
                    >
                      <option value="">-- Direct New Applicant --</option>
                      {contacts.map(c => (
                        <option key={c.id || c._dbId} value={c.id || c._dbId}>
                          {c.companyName || c.contactName || c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="lp-form-row">
                  <div className="lp-field">
                    <label>Mobile Number *</label>
                    <input 
                      required 
                      value={form.contactPhone} 
                      onChange={e => setForm({ ...form, contactPhone: e.target.value })} 
                      placeholder="98XXXXXXXX"
                    />
                  </div>
                  <div className="lp-field">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      value={form.contactEmail} 
                      onChange={e => setForm({ ...form, contactEmail: e.target.value })} 
                      placeholder="ramesh@example.com"
                    />
                  </div>
                </div>

                <div className="lp-form-row">
                  <div className="lp-field">
                    <label>Requested Principal (₹) *</label>
                    <input 
                      type="number" 
                      required 
                      value={form.requestedAmount} 
                      onChange={e => setForm({ ...form, requestedAmount: e.target.value })} 
                    />
                  </div>
                  <div className="lp-field">
                    <label>Loan Category</label>
                    <select value={form.loanCategory} onChange={e => setForm({ ...form, loanCategory: e.target.value })}>
                      <option value="personal">Personal Loan</option>
                      <option value="business">Business Loan</option>
                      <option value="micro">Micro-Enterprise</option>
                      <option value="vehicle">Vehicle / Equipment</option>
                      <option value="custom">Custom Facility</option>
                    </select>
                  </div>
                </div>

                <div className="lp-form-row">
                  <div className="lp-field">
                    <label>Tenure (Months) *</label>
                    <input 
                      type="number" 
                      value={form.tenure} 
                      onChange={e => setForm({ ...form, tenure: e.target.value })} 
                    />
                  </div>
                  <div className="lp-field">
                    <label>Interest Rate (% P.A.)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      value={form.interestRate} 
                      onChange={e => setForm({ ...form, interestRate: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="lp-form-row">
                  <div className="lp-field">
                    <label>Monthly Gross Income (₹) *</label>
                    <input 
                      type="number" 
                      required 
                      value={form.monthlyIncome} 
                      onChange={e => setForm({ ...form, monthlyIncome: e.target.value })} 
                    />
                  </div>
                  <div className="lp-field">
                    <label>Current Monthly EMIs (₹)</label>
                    <input 
                      type="number" 
                      value={form.existingEMIs} 
                      onChange={e => setForm({ ...form, existingEMIs: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="lp-form-row">
                  <div className="lp-field">
                    <label>Employer / Company</label>
                    <input 
                      value={form.employerName} 
                      onChange={e => setForm({ ...form, employerName: e.target.value })} 
                      placeholder="e.g. Tata Consultancy Services"
                    />
                  </div>
                  <div className="lp-field">
                    <label>Credit Bureau Score</label>
                    <input 
                      type="number" 
                      value={form.creditScore} 
                      onChange={e => setForm({ ...form, creditScore: e.target.value })} 
                    />
                  </div>
                </div>
              </div>

              <div className="lp-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Application</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sanction Letter Generator Modal */}
      {showSanctionModal && activeApp && (
        <SanctionLetterModal 
          application={activeApp} 
          onClose={() => setShowSanctionModal(false)} 
        />
      )}
    </div>
  );
};

export default LoanApplications;

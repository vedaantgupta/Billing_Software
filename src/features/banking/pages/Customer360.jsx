import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, ArrowLeft, Landmark, Phone, Mail, MapPin, 
  IndianRupee, Activity, Clock, ShieldCheck, FileText, 
  Calendar, CreditCard, CheckCircle2, ChevronRight, Plus,
  FileSignature, AlertCircle, Building2, Briefcase
} from 'lucide-react';
import { getItems, updateItem, addItem } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import { calculateCreditScore, getQualitativeLabel } from '@/utils/creditScore';
import KYCDocumentManager from '@/features/banking/components/KYCDocumentManager';
import CreditScoreGauge from '@/components/ui/CreditScoreGauge';
import '@/features/banking/styles/Customer360.css';

const Customer360 = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [contact, setContact] = useState(null);
  const [customerLoans, setCustomerLoans] = useState([]);
  const [customerApps, setCustomerApps] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = useCallback(async () => {
    if (!user?.id || !id) return;
    setLoading(true);
    try {
      const [allContacts, allLoans, allApps] = await Promise.all([
        getItems('contacts', user.id),
        getItems('loans', user.id),
        getItems('loan_applications', user.id)
      ]);

      const foundContact = allContacts.find(c => c.id === id || c._dbId === id);
      setContact(foundContact || {
        name: 'Borrower',
        phone: 'Not provided',
        email: 'Not provided',
        address: 'India'
      });

      // Match loans for this borrower
      const matchedLoans = allLoans.filter(l => 
        l.contactId === id || 
        l._dbId === id ||
        (foundContact && (l.fullName === foundContact.companyName || l.fullName === foundContact.contactName || l.fullName === foundContact.name))
      );
      setCustomerLoans(matchedLoans);

      // Match applications
      const matchedApps = allApps.filter(a => 
        a.contactId === id || 
        (foundContact && a.applicantName === (foundContact.companyName || foundContact.contactName || foundContact.name))
      );
      setCustomerApps(matchedApps);

      // Extract existing docs or initialize
      const initialDocs = foundContact?.kycDocuments || [
        { id: '1', type: 'Identity Proof (PAN)', documentNumber: foundContact?.pan || 'ABCDE1234F', status: 'verified', uploadedAt: '2026-01-10' },
        { id: '2', type: 'Address Proof', documentNumber: 'AADHAAR-9012', status: 'verified', uploadedAt: '2026-01-10' }
      ];
      setDocuments(initialDocs);

    } catch (err) {
      console.error('Failed to load customer 360:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddDocument = async (newDoc) => {
    const updated = [...documents, newDoc];
    setDocuments(updated);
    if (contact && user?.id) {
      const cid = contact.id || contact._dbId;
      await updateItem('contacts', cid, { ...contact, kycDocuments: updated }, user.id);
    }
  };

  const handleUpdateDocStatus = async (docId, status) => {
    const updated = documents.map(d => d.id === docId ? { ...d, status } : d);
    setDocuments(updated);
    if (contact && user?.id) {
      const cid = contact.id || contact._dbId;
      await updateItem('contacts', cid, { ...contact, kycDocuments: updated }, user.id);
    }
  };

  if (loading) return <div className="c360-container" style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>Loading Customer 360 View...</div>;

  const name = contact?.companyName || contact?.contactName || contact?.name || 'Customer';
  const score = calculateCreditScore(customerLoans, id);
  const { label: scoreLabel, color: scoreColor } = getQualitativeLabel(score);

  const totalBorrowed = customerLoans.reduce((acc, l) => acc + (parseFloat(l.principal) || 0), 0);
  const totalRepaid = customerLoans.reduce((acc, l) => acc + (parseFloat(l.repaidAmount) || 0), 0);
  const activeLoans = customerLoans.filter(l => l.status === 'active');
  const outstandingPrincipal = Math.max(0, totalBorrowed - totalRepaid);

  return (
    <div className="c360-container">
      {/* Header */}
      <div className="c360-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/loans')} style={{ padding: '0.4rem' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Customer 360° Profile</h1>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
              Consolidated borrower identity, credit standing, historical facilities, and KYC repository
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={() => navigate('/loans/new')}>
            <Plus size={16} /> New Loan for Customer
          </button>
        </div>
      </div>

      {/* Profile Banner */}
      <div className="c360-profile-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div className="c360-avatar">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>{name}</h2>
              <span style={{ fontSize: '0.75rem', background: '#e0e7ff', color: '#4338ca', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                {contact?.type?.toUpperCase() || 'BORROWER'}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={14} color="#64748b" /> {contact?.phone || 'No phone'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Mail size={14} color="#64748b" /> {contact?.email || 'No email'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} color="#64748b" /> {contact?.address || contact?.city || 'India'}
              </span>
              {contact?.pan && (
                <span style={{ background: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                  PAN: {contact.pan}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Credit Gauge mini */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <CreditScoreGauge score={score} size={80} />
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Credit Rating</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: scoreColor }}>{score}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: scoreColor }}>{scoreLabel}</div>
          </div>
        </div>
      </div>

      {/* Lending Stats */}
      <div className="c360-stats-row">
        <div className="c360-stat-card">
          <div className="c360-stat-label">Total Facilities Borrowed</div>
          <div className="c360-stat-value" style={{ color: '#4f46e5' }}>₹{totalBorrowed.toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>{customerLoans.length} total loan contracts</div>
        </div>

        <div className="c360-stat-card">
          <div className="c360-stat-label">Principal Repaid</div>
          <div className="c360-stat-value" style={{ color: '#10b981' }}>₹{totalRepaid.toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            {totalBorrowed > 0 ? `${Math.round((totalRepaid / totalBorrowed) * 100)}% complete` : '0%'}
          </div>
        </div>

        <div className="c360-stat-card">
          <div className="c360-stat-label">Outstanding Balance</div>
          <div className="c360-stat-value" style={{ color: '#f59e0b' }}>₹{outstandingPrincipal.toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>{activeLoans.length} active running loans</div>
        </div>

        <div className="c360-stat-card">
          <div className="c360-stat-label">KYC Status</div>
          <div className="c360-stat-value" style={{ color: '#059669', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={20} /> Verified
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>{documents.length} verified documents on file</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="c360-tabs">
        <button className={`c360-tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <Landmark size={16} /> Loans & Facilities ({customerLoans.length})
        </button>
        <button className={`c360-tab-btn ${activeTab === 'applications' ? 'active' : ''}`} onClick={() => setActiveTab('applications')}>
          <FileText size={16} /> Origination Applications ({customerApps.length})
        </button>
        <button className={`c360-tab-btn ${activeTab === 'kyc' ? 'active' : ''}`} onClick={() => setActiveTab('kyc')}>
          <ShieldCheck size={16} /> KYC & Documents Vault ({documents.length})
        </button>
      </div>

      {/* Tab: Loans */}
      {activeTab === 'overview' && (
        <div className="la-table-card">
          <table className="la-table">
            <thead>
              <tr>
                <th>Loan Reference</th>
                <th>Principal Amount</th>
                <th>Rate / Type</th>
                <th>Tenure</th>
                <th>Repaid Progress</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customerLoans.map(loan => {
                const id = loan.id || loan._dbId;
                const progress = ((loan.repaidAmount || 0) / (loan.principal || 1)) * 100;
                return (
                  <tr key={id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>REF-{id.slice(-8).toUpperCase()}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{loan.createdAt?.split('T')[0] || 'Active'}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: '#4f46e5' }}>₹{(parseFloat(loan.principal) || 0).toLocaleString()}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>EMI: ₹{Math.round(loan.emi || 0).toLocaleString()}/mo</div>
                    </td>
                    <td>
                      <div>{loan.interestRate}% P.A.</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'capitalize' }}>{loan.interestType}</div>
                    </td>
                    <td>{loan.tenure} {loan.tenureUnit || 'Months'}</td>
                    <td>
                      <div style={{ width: '120px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
                          <span>{Math.round(progress)}%</span>
                          <span>₹{(loan.repaidAmount || 0).toLocaleString()}</span>
                        </div>
                        <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, progress)}%`, height: '100%', background: '#10b981' }}></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`lm-status-sm ${loan.status}`}>{loan.status}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/loans/${id}`)}>
                        View Loan <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {customerLoans.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    No loans on record for this customer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Applications */}
      {activeTab === 'applications' && (
        <div className="la-table-card">
          <table className="la-table">
            <thead>
              <tr>
                <th>App Number</th>
                <th>Requested Amount</th>
                <th>Category</th>
                <th>Tenure</th>
                <th>Stage</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customerApps.map(app => (
                <tr key={app.id || app._dbId}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{app.applicationNumber}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{app.createdAt}</div>
                  </td>
                  <td>₹{(app.requestedAmount || 0).toLocaleString()}</td>
                  <td style={{ textTransform: 'capitalize' }}>{app.loanCategory} Loan</td>
                  <td>{app.tenure} {app.tenureUnit || 'months'}</td>
                  <td>
                    <span className={`la-stage-pill ${app.stage}`}>{app.stage?.replace('_', ' ')}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/loans/applications')}>
                      View Pipeline
                    </button>
                  </td>
                </tr>
              ))}
              {customerApps.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    No origination applications for this customer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: KYC Documents */}
      {activeTab === 'kyc' && (
        <KYCDocumentManager 
          documents={documents}
          onAddDocument={handleAddDocument}
          onUpdateStatus={handleUpdateDocStatus}
        />
      )}
    </div>
  );
};

export default Customer360;

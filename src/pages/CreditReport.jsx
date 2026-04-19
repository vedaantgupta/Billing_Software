import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Printer, ShieldCheck, Activity, 
  TrendingUp, TrendingDown, Users, Info, ExternalLink,
  Calendar, CheckCircle, AlertCircle
} from 'lucide-react';
import { getItems } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import { calculateCreditScore, getQualitativeLabel, getCreditFactors } from '../utils/creditScore';
import CreditScoreGauge from '../components/CreditScoreGauge';
import './CreditReport.css';

const CreditReport = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loans, setLoans] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [fetchedLoans, fetchedContacts] = await Promise.all([
        getItems('loans', user.id),
        getItems('contacts', user.id)
      ]);
      setLoans(fetchedLoans || []);
      setContacts(fetchedContacts || []);
    } catch (err) {
      console.error('Failed to load credit data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <div className="cr-container">Loading detailed report...</div>;

  const masterScore = calculateCreditScore(loans);
  const { label, color } = getQualitativeLabel(masterScore);
  const factors = getCreditFactors(loans);

  // Group contacts by their unique credit scores
  const contactProfiles = contacts.map(contact => {
    const contactLoans = loans.filter(l => l.contactId === contact.id || l.contactId === contact._dbId);
    if (contactLoans.length === 0) return null;
    
    const contactScore = calculateCreditScore(loans, contact.id || contact._dbId);
    const { label: contactLabel, color: contactColor } = getQualitativeLabel(contactScore);
    
    return {
      ...contact,
      score: contactScore,
      label: contactLabel,
      color: contactColor,
      loanCount: contactLoans.length,
      totalPrincipal: contactLoans.reduce((sum, l) => sum + (parseFloat(l.principal) || 0), 0)
    };
  }).filter(Boolean).sort((a, b) => b.score - a.score);

  return (
    <div className="cr-container">
      {/* Header */}
      <div className="cr-header">
        <div className="cr-title-section">
          <button className="btn btn-ghost" onClick={() => navigate('/loans')} style={{ padding: 0, marginBottom: '0.5rem' }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <h1>Financial Health Analytics</h1>
          <p>Detailed credit score analysis and contact directory</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={() => window.print()}>
            <Printer size={18} /> Print Report
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="cr-hero">
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', opacity: 0.3 }}>
          <ShieldCheck size={80} />
        </div>
        <CreditScoreGauge score={masterScore} size={250} />
        <div style={{ marginTop: '-1rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{masterScore}</h2>
          <p className="cr-hero-subtitle">
            Your credit health is <strong>{label}</strong>. This score is aggregated across all active and completed loans in your portfolio.
          </p>
        </div>
      </div>

      {/* Factor Analysis Grid */}
      <h3 className="cr-section-title"><Activity size={24} /> Key Scoring Factors</h3>
      <div className="cr-grid">
        {factors.map((f, i) => (
          <div key={i} className="cr-factor-card">
            <div className="cr-factor-header">
              <span className="cr-factor-title">{f.title}</span>
              <span className={`cr-impact-badge ${f.status.toLowerCase()}`}>
                {f.status}
              </span>
            </div>
            <div className="cr-factor-progress">
              <div 
                className="cr-factor-fill" 
                style={{ 
                  width: `${f.score}%`, 
                  backgroundColor: getQualitativeLabel(300 + (f.score / 100) * 600).color 
                }} 
              />
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              {f.desc}
            </p>
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700 }}>
              <span>Impact: <span style={{ color: f.impact.startsWith('+') ? '#059669' : '#dc2626' }}>{f.impact}</span></span>
              <span>{Math.round(f.score)}/100</span>
            </div>
          </div>
        ))}
      </div>

      {/* Contact Reliability Directory */}
      <h3 className="cr-section-title"><Users size={24} /> Contact Reliability Directory</h3>
      <div className="cr-directory-card">
        <table className="cr-table">
          <thead>
            <tr>
              <th>Contact Details</th>
              <th>Total Value</th>
              <th>Loans</th>
              <th>Reliability Score</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {contactProfiles.map(cp => (
              <tr key={cp.id}>
                <td>
                  <div className="cr-contact-info">
                    <h4>{cp.companyName || cp.contactName}</h4>
                    <p>{cp.contactName}</p>
                  </div>
                </td>
                <td>
                  <span style={{ fontWeight: 600 }}>₹{cp.totalPrincipal.toLocaleString()}</span>
                </td>
                <td>
                  <span className="badge">{cp.loanCount} Active</span>
                </td>
                <td>
                  <div className="cr-score-badge" style={{ backgroundColor: `${cp.color}15`, color: cp.color }}>
                    <Activity size={14} />
                    {cp.score} - {cp.label}
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="cr-btn-view" onClick={() => navigate(`/loans/${loans.find(l => l.contactId === cp.id || l.contactId === cp._dbId)?.id}`)}>
                    View Loans <ExternalLink size={14} />
                  </span>
                </td>
              </tr>
            ))}
            {contactProfiles.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                  <Users size={40} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                  <p>No contact-specific credit data available yet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '4rem', padding: '2rem', background: '#f8fafc', borderRadius: '1.5rem', border: '1px solid #e2e8f0' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem' }}>
          <Info size={18} /> About your Credit Score
        </h4>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          The score shown here is an internal indicator based 100% on the data within this application. It monitors your repayment behavior, debt exposure, and the reliability of your clients to help you make better financial decisions. High scores lead to better interest rates and increased trust in the business ecosystem.
        </p>
      </div>
    </div>
  );
};

export default CreditReport;

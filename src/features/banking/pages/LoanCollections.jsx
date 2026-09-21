import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, ArrowLeft, Phone, Calendar, IndianRupee,
  Clock, CheckCircle, XCircle, Send, MessageSquare, Plus,
  Users, MapPin, Search, ChevronRight, X, ShieldAlert, Sparkles
} from 'lucide-react';
import { getItems, addItem, updateItem } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import { evaluateDelinquency, formatINR } from '@/utils/loanEngine';
import '@/features/banking/styles/LoanCollections.css';

const LoanCollections = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loans, setLoans] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [ptps, setPtps] = useState([]);
  const [fieldVisits, setFieldVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('overdue'); // 'overdue', 'ptp', 'visits'
  const [selectedBucket, setSelectedBucket] = useState('all'); // 'all', '1-7 Days', '8-30 Days', '31-60 Days', '61-90 Days', '90+ Days'
  const [searchQuery, setSearchQuery] = useState('');

  // PTP Modal
  const [showPtpModal, setShowPtpModal] = useState(false);
  const [ptpForm, setPtpForm] = useState({
    loanId: '',
    borrowerName: '',
    borrowerPhone: '',
    promisedAmount: '',
    promisedDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    collectorName: 'Agent Sharma',
    notes: ''
  });

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [allLoans, allContacts, allPtps, allVisits] = await Promise.all([
        getItems('loans', user.id),
        getItems('contacts', user.id),
        getItems('loan_ptps', user.id),
        getItems('loan_field_visits', user.id)
      ]);

      setLoans(allLoans || []);
      setContacts(allContacts || []);
      setPtps(allPtps || []);
      setFieldVisits(allVisits || []);
    } catch (err) {
      console.error('Failed to load collections data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getContactName = (contactId) => {
    const contact = contacts.find(c => c.id === contactId || c._dbId === contactId);
    return contact?.companyName || contact?.contactName || contact?.name || 'Borrower';
  };

  const getContactPhone = (contactId) => {
    const contact = contacts.find(c => c.id === contactId || c._dbId === contactId);
    return contact?.phone || '98XXXXXXXX';
  };

  // Analyze delinquency for every loan
  const analyzedLoans = loans.map(loan => {
    const contactName = loan.fullName || getContactName(loan.contactId);
    const contactPhone = loan.phone || getContactPhone(loan.contactId);
    const schedule = loan.schedule || [];
    const delinq = evaluateDelinquency(schedule);

    // If no schedule exists yet, compute fallback overdue
    const isOverdue = delinq.totalOverdue > 0 || (loan.status === 'active' && (parseFloat(loan.principal) - (parseFloat(loan.repaidAmount) || 0)) > 0);
    
    return {
      ...loan,
      contactName,
      contactPhone,
      delinq,
      overdueAmount: delinq.totalOverdue || Math.round(parseFloat(loan.emi) || (parseFloat(loan.principal) * 0.05)),
      maxDpd: delinq.maxDpd || (loan.status === 'active' ? 14 : 0),
      bucket: delinq.agingBucket || '8-30 Days'
    };
  }).filter(l => l.status === 'active');

  // Buckets aggregation
  const buckets = {
    '1-7 Days': { amount: 0, count: 0, class: 'dpd1' },
    '8-30 Days': { amount: 0, count: 0, class: 'dpd8' },
    '31-60 Days': { amount: 0, count: 0, class: 'dpd31' },
    '61-90 Days': { amount: 0, count: 0, class: 'dpd61' },
    '90+ Days': { amount: 0, count: 0, class: 'dpd90' }
  };

  analyzedLoans.forEach(l => {
    if (buckets[l.bucket]) {
      buckets[l.bucket].amount += l.overdueAmount;
      buckets[l.bucket].count += 1;
    } else {
      // Default to 8-30 for active unallocated demo loans
      buckets['8-30 Days'].amount += l.overdueAmount;
      buckets['8-30 Days'].count += 1;
    }
  });

  const handleSavePtp = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    const payload = {
      ...ptpForm,
      promisedAmount: parseFloat(ptpForm.promisedAmount) || 0,
      createdAt: new Date().toISOString(),
      status: 'pending' // 'pending', 'fulfilled', 'broken'
    };

    try {
      await addItem('loan_ptps', payload, user.id);
      setShowPtpModal(false);
      loadData();
    } catch (err) {
      console.error('Failed to record PTP:', err);
    }
  };

  const handleUpdatePtpStatus = async (ptpId, status) => {
    if (!user?.id) return;
    try {
      await updateItem('loan_ptps', ptpId, { status }, user.id);
      loadData();
    } catch (err) {
      console.error('Failed to update PTP status:', err);
    }
  };

  const handleSendWhatsAppReminder = (loan) => {
    const phone = (loan.contactPhone || '').replace(/\D/g, '');
    const cleanPhone = phone.startsWith('91') ? phone : '91' + phone;
    const msg = encodeURIComponent(
      `Hello ${loan.contactName},\n\nThis is a friendly reminder regarding your active Loan Account (Ref: ${(loan.id || '').slice(-8).toUpperCase()}).\nAn overdue installment of ₹${(loan.overdueAmount || 0).toLocaleString()} is pending.\n\nPlease arrange for payment to avoid additional late penalties and impact on your credit score.\n\nThank you,\nCollections Desk`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const filteredLoans = analyzedLoans.filter(l => {
    const matchesBucket = selectedBucket === 'all' || l.bucket === selectedBucket;
    const matchesSearch = l.contactName.toLowerCase().includes(searchQuery.toLowerCase()) || (l.contactPhone || '').includes(searchQuery);
    return matchesBucket && matchesSearch;
  });

  return (
    <div className="lc-container">
      {/* Header */}
      <div className="lc-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/loans')} style={{ padding: '0.4rem' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="lc-title">
              <div className="lc-title-icon"><AlertTriangle size={22} /></div>
              Collections & Delinquency Management
            </h1>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
              Overdue aging buckets, Promise to Pay (PTP) tracking, and field recovery workflows
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={() => setShowPtpModal(true)}>
            <Plus size={16} /> Record Promise to Pay
          </button>
        </div>
      </div>

      {/* DPD Aging Buckets Row */}
      <div className="lc-buckets-row">
        <div 
          className={`lc-bucket-card ${selectedBucket === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedBucket('all')}
        >
          <div className="lc-bucket-title">All Overdue</div>
          <div className="lc-bucket-amount" style={{ color: '#ef4444' }}>
            ₹{Object.values(buckets).reduce((acc, b) => acc + b.amount, 0).toLocaleString()}
          </div>
          <div className="lc-bucket-count">{analyzedLoans.length} Loans</div>
        </div>

        {Object.entries(buckets).map(([bName, bData]) => (
          <div 
            key={bName}
            className={`lc-bucket-card ${bData.class} ${selectedBucket === bName ? 'active' : ''}`}
            onClick={() => setSelectedBucket(bName)}
          >
            <div className="lc-bucket-title">{bName}</div>
            <div className="lc-bucket-amount">₹{bData.amount.toLocaleString()}</div>
            <div className="lc-bucket-count">{bData.count} Accounts</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="lc-tabs">
        <button className={`lc-tab-btn ${activeTab === 'overdue' ? 'active' : ''}`} onClick={() => setActiveTab('overdue')}>
          <AlertTriangle size={16} /> Overdue Borrowers ({filteredLoans.length})
        </button>
        <button className={`lc-tab-btn ${activeTab === 'ptp' ? 'active' : ''}`} onClick={() => setActiveTab('ptp')}>
          <Calendar size={16} /> Promise to Pay Tracker ({ptps.length})
        </button>
      </div>

      {/* Tab 1: Overdue Loans */}
      {activeTab === 'overdue' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div className="lm-search-box" style={{ width: '320px' }}>
              <Search className="lm-search-icon" size={16} />
              <input 
                className="lm-search-input" 
                placeholder="Search delinquent borrower, phone..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Filtering: <strong>{selectedBucket}</strong>
            </div>
          </div>

          <div className="la-table-card">
            <table className="la-table">
              <thead>
                <tr>
                  <th>Borrower</th>
                  <th>Overdue Amount</th>
                  <th>Days Past Due (DPD)</th>
                  <th>Classification</th>
                  <th>Next Action</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.map(l => {
                  const id = l.id || l._dbId;
                  return (
                    <tr key={id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{l.contactName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{l.contactPhone} • Ref: {id.slice(-8).toUpperCase()}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: '#ef4444' }}>₹{l.overdueAmount.toLocaleString()}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Principal + Interest + Late Fees</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#b91c1c', background: '#fee2e2', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          {l.maxDpd} Days DPD
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                          {l.delinq?.smaClassification || 'SMA-0'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#0284c7', background: '#f0f9ff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                          Send 2nd WhatsApp Notice
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#059669', borderColor: '#a7f3d0' }}
                            onClick={() => handleSendWhatsAppReminder(l)}
                            title="Send WhatsApp Notice"
                          >
                            <Send size={14} /> Reminder
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setPtpForm(prev => ({
                                ...prev,
                                loanId: id,
                                borrowerName: l.contactName,
                                borrowerPhone: l.contactPhone,
                                promisedAmount: l.overdueAmount
                              }));
                              setShowPtpModal(true);
                            }}
                          >
                            Record PTP
                          </button>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => navigate(`/loans/${id}`)}
                          >
                            Collect
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredLoans.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      No overdue accounts found in this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Tab 2: PTP Tracker */}
      {activeTab === 'ptp' && (
        <div className="la-table-card">
          <table className="la-table">
            <thead>
              <tr>
                <th>Borrower</th>
                <th>Promised Amount</th>
                <th>Promised Date</th>
                <th>Collector</th>
                <th>PTP Status</th>
                <th style={{ textAlign: 'right' }}>Update</th>
              </tr>
            </thead>
            <tbody>
              {ptps.map(p => {
                const id = p.id || p._dbId;
                const isOverdue = new Date(p.promisedDate) < new Date() && p.status === 'pending';
                return (
                  <tr key={id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{p.borrowerName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.borrowerPhone}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: '#4f46e5' }}>₹{(p.promisedAmount || 0).toLocaleString()}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.promisedDate}</div>
                      {isOverdue && (
                        <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>
                          Broken Promise Alert
                        </span>
                      )}
                    </td>
                    <td>{p.collectorName}</td>
                    <td>
                      {p.status === 'fulfilled' && (
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                          Fulfilled
                        </span>
                      )}
                      {p.status === 'broken' && (
                        <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                          Broken
                        </span>
                      )}
                      {p.status === 'pending' && (
                        <span style={{ background: '#fef3c7', color: '#b45309', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                          Pending
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        {p.status === 'pending' && (
                          <>
                            <button 
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#15803d' }}
                              onClick={() => handleUpdatePtpStatus(id, 'fulfilled')}
                            >
                              <CheckCircle size={14} /> Fulfilled
                            </button>
                            <button 
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#b91c1c' }}
                              onClick={() => handleUpdatePtpStatus(id, 'broken')}
                            >
                              <XCircle size={14} /> Broken
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {ptps.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    No Promise-to-Pay records entered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Record PTP Modal */}
      {showPtpModal && (
        <div className="lp-modal-overlay" onClick={() => setShowPtpModal(false)}>
          <div className="lp-modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="lp-modal-header">
              <h2 className="lp-modal-title">Record Promise to Pay (PTP)</h2>
              <button className="btn-icon" onClick={() => setShowPtpModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSavePtp}>
              <div className="lp-modal-body">
                <div className="lp-field">
                  <label>Borrower Name *</label>
                  <input 
                    required 
                    value={ptpForm.borrowerName} 
                    onChange={e => setPtpForm({ ...ptpForm, borrowerName: e.target.value })} 
                    placeholder="Borrower name"
                  />
                </div>

                <div className="lp-field">
                  <label>Contact Phone</label>
                  <input 
                    value={ptpForm.borrowerPhone} 
                    onChange={e => setPtpForm({ ...ptpForm, borrowerPhone: e.target.value })} 
                    placeholder="98XXXXXXXX"
                  />
                </div>

                <div className="lp-form-row">
                  <div className="lp-field">
                    <label>Promised Amount (₹) *</label>
                    <input 
                      type="number" 
                      required 
                      value={ptpForm.promisedAmount} 
                      onChange={e => setPtpForm({ ...ptpForm, promisedAmount: e.target.value })} 
                    />
                  </div>
                  <div className="lp-field">
                    <label>Promised Date *</label>
                    <input 
                      type="date" 
                      required 
                      value={ptpForm.promisedDate} 
                      onChange={e => setPtpForm({ ...ptpForm, promisedDate: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="lp-field">
                  <label>Assigned Collector / Agent</label>
                  <input 
                    value={ptpForm.collectorName} 
                    onChange={e => setPtpForm({ ...ptpForm, collectorName: e.target.value })} 
                  />
                </div>

                <div className="lp-field">
                  <label>Interaction Notes</label>
                  <textarea 
                    rows={2} 
                    value={ptpForm.notes} 
                    onChange={e => setPtpForm({ ...ptpForm, notes: e.target.value })} 
                    placeholder="Customer promised payment via UPI after salary..."
                  />
                </div>
              </div>

              <div className="lp-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPtpModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save PTP Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanCollections;

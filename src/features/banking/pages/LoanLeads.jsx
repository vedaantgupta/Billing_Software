import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Plus, ArrowLeft, Phone, Mail, Calendar, 
  IndianRupee, ChevronRight, UserCheck, Search, Filter, X,
  ArrowRightCircle, CheckCircle2, MessageSquare
} from 'lucide-react';
import { getItems, addItem, updateItem, deleteItem } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import '@/features/banking/styles/LoanLeads.css';

const STAGES = [
  { id: 'new', label: 'New Inquiries', color: '#64748b' },
  { id: 'contacted', label: 'Contacted', color: '#0284c7' },
  { id: 'interested', label: 'Interested', color: '#8b5cf6' },
  { id: 'docs_pending', label: 'Docs Pending', color: '#f59e0b' },
  { id: 'converted', label: 'Converted to App', color: '#10b981' }
];

const DEFAULT_LEADS = [
  {
    name: 'Vikram Mehta',
    phone: '9876543210',
    email: 'vikram.mehta@example.com',
    expectedAmount: 500000,
    loanCategory: 'personal',
    source: 'Walk-in',
    assignedTo: 'Rajesh Kumar (Officer)',
    status: 'new',
    followUpDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    notes: 'Interested in home renovation personal loan.'
  },
  {
    name: 'Apex Engineering Ltd',
    phone: '9822334455',
    email: 'finance@apexeng.in',
    expectedAmount: 2500000,
    loanCategory: 'business',
    source: 'Referral',
    assignedTo: 'Priya Sharma (RM)',
    status: 'interested',
    followUpDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    notes: 'Looking for 3-year working capital enhancement.'
  },
  {
    name: 'Ananya Deshmukh',
    phone: '9123456780',
    email: 'ananya.d@example.com',
    expectedAmount: 150000,
    loanCategory: 'micro',
    source: 'Website Lead',
    assignedTo: 'Rajesh Kumar (Officer)',
    status: 'docs_pending',
    followUpDate: new Date().toISOString().split('T')[0],
    notes: 'Awaiting GST returns and electricity bill.'
  }
];

const LoanLeads = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [leads, setLeads] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    expectedAmount: '',
    loanCategory: 'personal',
    source: 'Walk-in',
    assignedTo: 'Loan Desk',
    status: 'new',
    followUpDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [fetchedLeads, fetchedProds] = await Promise.all([
        getItems('loan_leads', user.id),
        getItems('loan_products', user.id)
      ]);

      if (!fetchedLeads || fetchedLeads.length === 0) {
        const seeded = [];
        for (const l of DEFAULT_LEADS) {
          const res = await addItem('loan_leads', l, user.id);
          seeded.push(res || l);
        }
        setLeads(seeded);
      } else {
        setLeads(fetchedLeads);
      }
      setProducts(fetchedProds || []);
    } catch (err) {
      console.error('Failed to load leads data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenModal = (lead = null) => {
    if (lead) {
      setEditingLead(lead);
      setForm(lead);
    } else {
      setEditingLead(null);
      setForm({
        name: '',
        phone: '',
        email: '',
        expectedAmount: '',
        loanCategory: 'personal',
        source: 'Walk-in',
        assignedTo: 'Loan Desk',
        status: 'new',
        followUpDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
    setShowModal(true);
  };

  const handleSaveLead = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    const payload = {
      ...form,
      expectedAmount: parseFloat(form.expectedAmount) || 0
    };

    try {
      if (editingLead) {
        const id = editingLead.id || editingLead._dbId;
        await updateItem('loan_leads', id, payload, user.id);
      } else {
        await addItem('loan_leads', payload, user.id);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error('Failed to save lead:', err);
    }
  };

  const handleStatusChange = async (lead, nextStatus) => {
    if (!user?.id) return;
    const id = lead.id || lead._dbId;
    try {
      await updateItem('loan_leads', id, { ...lead, status: nextStatus }, user.id);
      loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleConvertToApplication = async (lead) => {
    if (!user?.id) return;
    const confirmConv = window.confirm(`Convert lead "${lead.name}" directly into a full Loan Origination Application?`);
    if (!confirmConv) return;

    try {
      // 1. Create Application in 'loan_applications'
      const appPayload = {
        applicantName: lead.name,
        contactPhone: lead.phone,
        contactEmail: lead.email,
        requestedAmount: lead.expectedAmount,
        loanCategory: lead.loanCategory,
        tenure: 24,
        tenureUnit: 'months',
        stage: 'submitted',
        leadId: lead.id || lead._dbId,
        source: lead.source,
        createdAt: new Date().toISOString(),
        monthlyIncome: 65000,
        proposedEMI: Math.round((lead.expectedAmount * 0.05)),
        underwritingNotes: `Converted from lead pipeline. Notes: ${lead.notes || 'None'}`
      };

      await addItem('loan_applications', appPayload, user.id);

      // 2. Mark lead converted
      const leadId = lead.id || lead._dbId;
      await updateItem('loan_leads', leadId, { ...lead, status: 'converted' }, user.id);

      alert(`Application successfully created for ${lead.name}!`);
      navigate('/loans/applications');
    } catch (err) {
      console.error('Failed to convert lead:', err);
    }
  };

  const filteredLeads = leads.filter(l => 
    l.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.phone?.includes(searchQuery) ||
    l.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="ll-container">
      {/* Header */}
      <div className="ll-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/loans')} style={{ padding: '0.4rem' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="ll-title">
              <div className="ll-title-icon"><Users size={22} /></div>
              Lending Leads & Inquiries
            </h1>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
              Prospect pipeline, agent follow-ups, and origination conversions
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div className="lm-search-box" style={{ width: '280px' }}>
            <Search className="lm-search-icon" size={16} />
            <input 
              className="lm-search-input" 
              placeholder="Search leads by name, phone..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} /> New Prospect
          </button>
        </div>
      </div>

      {/* Kanban Pipeline */}
      <div className="ll-pipeline">
        {STAGES.map(stage => {
          const stageLeads = filteredLeads.filter(l => (l.status || 'new') === stage.id);
          return (
            <div className="ll-column" key={stage.id}>
              <div className="ll-col-header">
                <span className="ll-col-title" style={{ borderLeft: `3px solid ${stage.color}`, paddingLeft: '6px' }}>
                  {stage.label}
                </span>
                <span className="ll-col-count">{stageLeads.length}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '300px' }}>
                {stageLeads.map(lead => {
                  const id = lead.id || lead._dbId;
                  return (
                    <div className="ll-card" key={id} onClick={() => handleOpenModal(lead)}>
                      <div className="ll-card-top">
                        <span className="ll-card-name">{lead.name}</span>
                        <span className="ll-card-amount">₹{(lead.expectedAmount || 0).toLocaleString()}</span>
                      </div>

                      <div className="ll-card-meta">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={12} color="#64748b" /> {lead.phone}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} color="#64748b" /> Follow-up: {lead.followUpDate || 'Today'}
                        </span>
                        {lead.notes && (
                          <span style={{ fontStyle: 'italic', color: '#475569', marginTop: '2px' }}>
                            "{lead.notes.slice(0, 45)}..."
                          </span>
                        )}
                      </div>

                      <div className="ll-card-footer">
                        <span className="ll-source-tag">{lead.source}</span>
                        {lead.status !== 'converted' ? (
                          <button 
                            type="button" 
                            className="ll-convert-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConvertToApplication(lead);
                            }}
                            title="Convert to Loan Application"
                          >
                            <ArrowRightCircle size={14} /> Convert
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle2 size={13} /> Converted
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {stageLeads.length === 0 && (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                    No leads in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="lp-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="lp-modal" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
            <div className="lp-modal-header">
              <h2 className="lp-modal-title">
                {editingLead ? 'Edit Prospect Lead' : 'New Lending Lead'}
              </h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveLead}>
              <div className="lp-modal-body">
                <div className="lp-form-row">
                  <div className="lp-field">
                    <label>Prospect Full Name *</label>
                    <input 
                      required 
                      value={form.name} 
                      onChange={e => setForm({ ...form, name: e.target.value })} 
                      placeholder="e.g. Ramesh Chandra"
                    />
                  </div>
                  <div className="lp-field">
                    <label>Mobile Number *</label>
                    <input 
                      required 
                      value={form.phone} 
                      onChange={e => setForm({ ...form, phone: e.target.value })} 
                      placeholder="98XXXXXXXX"
                    />
                  </div>
                </div>

                <div className="lp-form-row">
                  <div className="lp-field">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      value={form.email} 
                      onChange={e => setForm({ ...form, email: e.target.value })} 
                      placeholder="ramesh@example.com"
                    />
                  </div>
                  <div className="lp-field">
                    <label>Expected Amount (₹) *</label>
                    <input 
                      type="number" 
                      required 
                      value={form.expectedAmount} 
                      onChange={e => setForm({ ...form, expectedAmount: e.target.value })} 
                      placeholder="500000"
                    />
                  </div>
                </div>

                <div className="lp-form-row">
                  <div className="lp-field">
                    <label>Desired Category</label>
                    <select value={form.loanCategory} onChange={e => setForm({ ...form, loanCategory: e.target.value })}>
                      <option value="personal">Personal Loan</option>
                      <option value="business">Business Working Capital</option>
                      <option value="micro">Micro-Finance</option>
                      <option value="vehicle">Vehicle / Equipment Loan</option>
                      <option value="custom">Custom Secured Facility</option>
                    </select>
                  </div>
                  <div className="lp-field">
                    <label>Pipeline Stage</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      {STAGES.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="lp-form-row">
                  <div className="lp-field">
                    <label>Lead Source</label>
                    <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                      <option value="Walk-in">Walk-in Branch</option>
                      <option value="Website Lead">Website / Portal</option>
                      <option value="Referral">Client Referral</option>
                      <option value="Broker / DSA">Broker / DSA</option>
                      <option value="Telemarketing">Outbound Telemarketing</option>
                    </select>
                  </div>
                  <div className="lp-field">
                    <label>Next Follow-Up Date</label>
                    <input 
                      type="date" 
                      value={form.followUpDate} 
                      onChange={e => setForm({ ...form, followUpDate: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="lp-field">
                  <label>Assigned Loan Officer / Agent</label>
                  <input 
                    value={form.assignedTo} 
                    onChange={e => setForm({ ...form, assignedTo: e.target.value })} 
                    placeholder="e.g. Rajesh Kumar"
                  />
                </div>

                <div className="lp-field">
                  <label>Notes & Interaction Summary</label>
                  <textarea 
                    rows={2} 
                    value={form.notes} 
                    onChange={e => setForm({ ...form, notes: e.target.value })} 
                    placeholder="Notes from initial call or discussion..."
                  />
                </div>
              </div>

              <div className="lp-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanLeads;

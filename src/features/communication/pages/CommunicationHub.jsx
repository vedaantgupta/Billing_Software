import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Send, Mail, MessageSquare, Users, FileText, CheckCircle2, 
  Search, Filter, Plus, ArrowUpRight, ArrowDownLeft, Clock, 
  RefreshCw, Settings, Play, Phone, ExternalLink, ShieldCheck, 
  Copy, Check, FileCheck, DollarSign, BadgePercent, AlertTriangle, Eye
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getItems } from '@/utils/db';
import { getContactBalance, getAllContactBalances } from '@/utils/ledger';
import { 
  getCommunicationSettings, getCommunicationLogs, 
  cleanPhoneNumber, getWhatsAppUrl, getEmailUrl,
  logCommunicationEvent
} from '../services/communicationService';
import CommunicationModal from '../components/CommunicationModal';
import BatchReminderModal from '../components/BatchReminderModal';
import CommunicationSettings from '../components/CommunicationSettings';
import '@/features/communication/styles/CommunicationHub.css';

const CommunicationHub = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'invoices' | 'receipts' | 'quotations' | 'reminders' | 'activity' | 'settings'

  // Data states
  const [documents, setDocuments] = useState([]);
  const [inwardPayments, setInwardPayments] = useState([]);
  const [outwardPayments, setOutwardPayments] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactBalances, setContactBalances] = useState({});
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modal states
  const [selectedDocForModal, setSelectedDocForModal] = useState(null);
  const [modalDefaultChannel, setModalDefaultChannel] = useState('whatsapp');
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Load all relevant records
  const loadHubData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [docsData, inwardData, outwardData, contactsData, logsData] = await Promise.all([
        getItems('documents', user.id),
        getItems('inwardPayments', user.id),
        getItems('outwardPayments', user.id),
        getItems('contacts', user.id),
        getCommunicationLogs(user.id)
      ]);

      setDocuments(docsData || []);
      setInwardPayments(inwardData || []);
      setOutwardPayments(outwardData || []);
      setContacts(contactsData || []);
      setActivityLogs(logsData || []);

      // Calculate balances for debtors
      try {
        const balances = await getAllContactBalances(user.id);
        setContactBalances(balances || {});
      } catch (err) {
        console.warn('Could not compute contact balances:', err);
      }
    } catch (err) {
      console.error('Failed to load communication hub data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadHubData();
  }, [loadHubData]);

  // Settings
  const commSettings = useMemo(() => getCommunicationSettings(user?.id), [user?.id]);

  // Derived datasets
  const invoicesList = useMemo(() => {
    return documents.filter(d => 
      d.docType === 'Sale Invoice' || 
      d.docType === 'Invoice' || 
      d.docType === 'Purchase Invoice' || 
      d.docType === 'Proforma Invoice'
    ).map(d => ({
      ...d,
      category: 'invoice',
      itemType: d.docType || 'Invoice',
      displayTitle: `${d.docType || 'Invoice'} #${d.invoiceNumber || d.id}`,
      amount: Number(d.total || 0),
      clientName: d.customerName || d.vendorName || 'Customer',
      phone: d.customerPhone || '',
      email: d.customerEmail || ''
    }));
  }, [documents]);

  const receiptsList = useMemo(() => {
    const inward = inwardPayments.map(p => ({
      ...p,
      category: 'receipt',
      itemType: 'Payment Receipt (Inward)',
      displayTitle: `Receipt #${p.fullReceiptNo || p.receiptNumber}`,
      amount: Number(p.amount || 0),
      clientName: p.customerName || 'Customer',
      phone: p.customerPhone || '',
      email: p.customerEmail || ''
    }));

    const outward = outwardPayments.map(p => ({
      ...p,
      category: 'receipt',
      itemType: 'Payment Voucher (Outward)',
      displayTitle: `Voucher #${p.voucherNumber || p.id}`,
      amount: Number(p.amount || 0),
      clientName: p.vendorName || 'Vendor',
      phone: p.vendorPhone || '',
      email: p.vendorEmail || ''
    }));

    return [...inward, ...outward];
  }, [inwardPayments, outwardPayments]);

  const quotationsList = useMemo(() => {
    return documents.filter(d => 
      d.docType === 'Quotation' || 
      d.docType === 'Sale Order' || 
      d.docType?.toLowerCase().includes('quot') || 
      d.docType?.toLowerCase().includes('offer')
    ).map(d => ({
      ...d,
      category: 'quotation',
      itemType: d.docType || 'Quotation',
      displayTitle: `Quotation #${d.invoiceNumber || d.id}`,
      amount: Number(d.total || 0),
      clientName: d.customerName || 'Prospect',
      phone: d.customerPhone || '',
      email: d.customerEmail || ''
    }));
  }, [documents]);

  // Debtors / Outstanding payment list
  const overdueContactsList = useMemo(() => {
    return contacts.map(c => {
      const balInfo = contactBalances[c.id] || { balance: 0, position: 'Dr' };
      return {
        ...c,
        balance: balInfo.balance || 0,
        position: balInfo.position || 'Dr',
        category: 'reminder',
        itemType: 'Payment Reminder',
        displayTitle: `Outstanding: ₹${(balInfo.balance || 0).toLocaleString()} (${balInfo.position})`,
        amount: balInfo.balance || 0,
        clientName: c.companyName || c.customerName || c.name || 'Account'
      };
    }).filter(c => c.balance > 0 && c.position === 'Dr');
  }, [contacts, contactBalances]);

  // Total Outstanding Amount
  const totalReceivables = useMemo(() => {
    return overdueContactsList.reduce((sum, c) => sum + (c.balance || 0), 0);
  }, [overdueContactsList]);

  // Unified Overview dataset
  const unifiedList = useMemo(() => {
    let list = [];
    if (activeTab === 'invoices') list = invoicesList;
    else if (activeTab === 'receipts') list = receiptsList;
    else if (activeTab === 'quotations') list = quotationsList;
    else if (activeTab === 'reminders') list = overdueContactsList;
    else {
      // 'overview': combine all
      list = [...invoicesList, ...receiptsList, ...quotationsList, ...overdueContactsList];
    }

    if (typeFilter !== 'all') {
      list = list.filter(item => item.category === typeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => 
        (item.clientName && item.clientName.toLowerCase().includes(q)) ||
        (item.displayTitle && item.displayTitle.toLowerCase().includes(q)) ||
        (item.phone && item.phone.includes(q)) ||
        (item.email && item.email.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  }, [activeTab, invoicesList, receiptsList, quotationsList, overdueContactsList, typeFilter, searchQuery]);

  // Quick 1-Click WhatsApp Trigger
  const handleQuickWhatsApp = (item) => {
    const phone = item.phone || item.customerPhone || '';
    if (!phone) {
      // Open modal so user can input phone number
      setSelectedDocForModal(item);
      setModalDefaultChannel('whatsapp');
      return;
    }

    // Open universal modal for review, or direct send if settings favor
    setSelectedDocForModal(item);
    setModalDefaultChannel('whatsapp');
  };

  // Quick 1-Click Email Trigger
  const handleQuickEmail = (item) => {
    setSelectedDocForModal(item);
    setModalDefaultChannel('email');
  };

  return (
    <div className="comm-hub-page">
      {/* 1. Header */}
      <div className="comm-hub-header">
        <div className="comm-header-left">
          <div className="comm-header-icon-badge">
            <Send size={26} />
          </div>
          <div>
            <h1 className="comm-title">
              WhatsApp & Email Communication Hub
            </h1>
            <div className="comm-subtitle">
              Directly send Invoices, Payment Receipts, Quotations, and Outstanding Payment Reminders via WhatsApp Web / WhatsApp Business API or Email with 1-click actions.
            </div>
          </div>
        </div>

        <div className="comm-header-actions">
          <button 
            className="comm-btn comm-btn-outline" 
            onClick={() => setActiveTab('settings')}
            title="Configure WhatsApp, Email & Templates"
          >
            <Settings size={16} /> Configure Channels
          </button>
          <button 
            className="comm-btn comm-btn-whatsapp" 
            onClick={() => setIsBatchModalOpen(true)}
            disabled={overdueContactsList.length === 0}
          >
            <Play size={16} /> 1-Click Batch Reminders ({overdueContactsList.length})
          </button>
        </div>
      </div>

      {/* 2. Top Metric KPI Cards */}
      <div className="comm-stats-grid">
        <div className="comm-stat-card wa-card glass">
          <div className="comm-stat-info">
            <span className="comm-stat-label">WhatsApp Dispatches</span>
            <span className="comm-stat-value">
              {activityLogs.filter(l => l.channel === 'whatsapp').length}
            </span>
            <span className="comm-stat-subtext">
              Active Mode: <strong>{commSettings.whatsappMode === 'api' ? 'Business API' : 'WhatsApp Web'}</strong>
            </span>
          </div>
          <div className="comm-stat-icon-wrap">
            <MessageSquare size={24} />
          </div>
        </div>

        <div className="comm-stat-card email-card glass">
          <div className="comm-stat-info">
            <span className="comm-stat-label">Email Dispatches</span>
            <span className="comm-stat-value">
              {activityLogs.filter(l => l.channel === 'email').length}
            </span>
            <span className="comm-stat-subtext">
              Client: <strong>{commSettings.emailMode === 'gmail' ? 'Gmail Web' : 'Default Mail'}</strong>
            </span>
          </div>
          <div className="comm-stat-icon-wrap">
            <Mail size={24} />
          </div>
        </div>

        <div className="comm-stat-card due-card glass">
          <div className="comm-stat-info">
            <span className="comm-stat-label">Total Receivables (Due)</span>
            <span className="comm-stat-value" style={{ color: '#d97706' }}>
              ₹{totalReceivables.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </span>
            <span className="comm-stat-subtext">
              <strong>{overdueContactsList.length}</strong> debtors pending reminder
            </span>
          </div>
          <div className="comm-stat-icon-wrap">
            <AlertTriangle size={24} />
          </div>
        </div>

        <div className="comm-stat-card docs-card glass">
          <div className="comm-stat-info">
            <span className="comm-stat-label">Documents & Receipts</span>
            <span className="comm-stat-value">
              {invoicesList.length + receiptsList.length + quotationsList.length}
            </span>
            <span className="comm-stat-subtext">
              Ready for instant 1-click dispatch
            </span>
          </div>
          <div className="comm-stat-icon-wrap">
            <FileText size={24} />
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="comm-tabs-nav">
        <button 
          className={`comm-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => { setActiveTab('overview'); setTypeFilter('all'); }}
        >
          <span>All Dispatches</span>
          <span className="comm-tab-count">
            {invoicesList.length + receiptsList.length + quotationsList.length + overdueContactsList.length}
          </span>
        </button>

        <button 
          className={`comm-tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => { setActiveTab('invoices'); setTypeFilter('all'); }}
        >
          <FileText size={16} />
          <span>Invoices</span>
          <span className="comm-tab-count">{invoicesList.length}</span>
        </button>

        <button 
          className={`comm-tab-btn ${activeTab === 'receipts' ? 'active' : ''}`}
          onClick={() => { setActiveTab('receipts'); setTypeFilter('all'); }}
        >
          <CheckCircle2 size={16} />
          <span>Payment Receipts</span>
          <span className="comm-tab-count">{receiptsList.length}</span>
        </button>

        <button 
          className={`comm-tab-btn ${activeTab === 'quotations' ? 'active' : ''}`}
          onClick={() => { setActiveTab('quotations'); setTypeFilter('all'); }}
        >
          <BadgePercent size={16} />
          <span>Quotations & Offers</span>
          <span className="comm-tab-count">{quotationsList.length}</span>
        </button>

        <button 
          className={`comm-tab-btn ${activeTab === 'reminders' ? 'active' : ''}`}
          onClick={() => { setActiveTab('reminders'); setTypeFilter('all'); }}
        >
          <AlertTriangle size={16} color="#d97706" />
          <span style={{ color: '#b45309' }}>Payment Reminders</span>
          <span className="comm-tab-count" style={{ background: '#fef3c7', color: '#b45309' }}>
            {overdueContactsList.length}
          </span>
        </button>

        <button 
          className={`comm-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <Clock size={16} />
          <span>Dispatch History</span>
          <span className="comm-tab-count">{activityLogs.length}</span>
        </button>

        <button 
          className={`comm-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={16} />
          <span>Settings & Templates</span>
        </button>
      </div>

      {/* Tab: Settings & Templates */}
      {activeTab === 'settings' && (
        <CommunicationSettings onSaved={loadHubData} />
      )}

      {/* Tab: Activity Logs */}
      {activeTab === 'activity' && (
        <div className="comm-table-card">
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Communication Dispatch Activity Log</h3>
            <button className="comm-btn comm-btn-outline" onClick={loadHubData} style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}>
              <RefreshCw size={14} /> Refresh Log
            </button>
          </div>

          <div className="comm-table-responsive">
            <table className="comm-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Channel</th>
                  <th>Document / Subject</th>
                  <th>Recipient</th>
                  <th>Destination</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activityLogs.map((log) => (
                  <tr key={log.id || log._dbId}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {log.timestampFormatted || new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span className={`comm-badge ${log.channel === 'whatsapp' ? 'comm-badge-receipt' : 'comm-badge-invoice'}`}>
                        {log.channel === 'whatsapp' ? <MessageSquare size={12} /> : <Mail size={12} />}
                        {log.mode || log.channel}
                      </span>
                    </td>
                    <td>
                      <strong>{log.docType}</strong>
                      {log.docNumber && log.docNumber !== 'N/A' && <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginLeft: '4px' }}>#{log.docNumber}</span>}
                    </td>
                    <td><strong>{log.recipientName}</strong></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569' }}>
                      {log.recipientTarget || '-'}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {log.amount ? `₹${Number(log.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td>
                      <span className="comm-badge comm-badge-sent">
                        <Check size={12} /> {log.status || 'Sent'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="comm-btn comm-btn-outline"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                        onClick={() => {
                          setSelectedDocForModal({
                            customerName: log.recipientName,
                            customerPhone: log.recipientTarget,
                            customerEmail: log.recipientTarget,
                            docType: log.docType,
                            invoiceNumber: log.docNumber,
                            amount: log.amount
                          });
                          setModalDefaultChannel(log.channel || 'whatsapp');
                        }}
                      >
                        Resend
                      </button>
                    </td>
                  </tr>
                ))}

                {activityLogs.length === 0 && (
                  <tr>
                    <td colSpan="8">
                      <div className="comm-empty-state">
                        <div className="comm-empty-icon">
                          <Clock size={32} />
                        </div>
                        <h4 className="comm-empty-title">No Communication Logs Yet</h4>
                        <p className="comm-empty-desc">
                          Messages sent via WhatsApp or Email will appear here with full delivery details.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Table View: Overview, Invoices, Receipts, Quotations, Reminders */}
      {activeTab !== 'settings' && activeTab !== 'activity' && (
        <>
          {/* Controls Bar */}
          <div className="comm-controls-bar">
            <div className="comm-search-box">
              <Search size={16} color="var(--text-secondary)" />
              <input 
                type="text" 
                className="comm-search-input" 
                placeholder="Search by customer, invoice #, phone, email..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {activeTab === 'overview' && (
              <div className="comm-filter-pills">
                <button 
                  className={`comm-pill ${typeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setTypeFilter('all')}
                >
                  All Items
                </button>
                <button 
                  className={`comm-pill ${typeFilter === 'invoice' ? 'active' : ''}`}
                  onClick={() => setTypeFilter('invoice')}
                >
                  📄 Invoices ({invoicesList.length})
                </button>
                <button 
                  className={`comm-pill ${typeFilter === 'receipt' ? 'active' : ''}`}
                  onClick={() => setTypeFilter('receipt')}
                >
                  🧾 Receipts ({receiptsList.length})
                </button>
                <button 
                  className={`comm-pill ${typeFilter === 'quotation' ? 'active' : ''}`}
                  onClick={() => setTypeFilter('quotation')}
                >
                  💼 Quotations ({quotationsList.length})
                </button>
                <button 
                  className={`comm-pill ${typeFilter === 'reminder' ? 'active' : ''}`}
                  onClick={() => setTypeFilter('reminder')}
                >
                  ⚠️ Reminders ({overdueContactsList.length})
                </button>
              </div>
            )}
          </div>

          {/* Table Card */}
          <div className="comm-table-card">
            <div className="comm-table-responsive">
              <table className="comm-table">
                <thead>
                  <tr>
                    <th>Document / Account</th>
                    <th>Customer / Recipient</th>
                    <th>Contact Info</th>
                    <th>Date</th>
                    <th>Amount / Balance</th>
                    <th>Classification</th>
                    <th style={{ textAlign: 'right' }}>1-Click Communication Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {unifiedList.map((item) => {
                    const initials = (item.clientName || 'C')[0].toUpperCase();
                    const hasPhone = Boolean(item.phone || item.customerPhone);
                    const hasEmail = Boolean(item.email || item.customerEmail);

                    return (
                      <tr key={item.id || item._dbId || `${item.category}-${item.invoiceNumber || item.name}`}>
                        {/* Entity / Doc */}
                        <td>
                          <div className="comm-entity-cell">
                            <div className="comm-entity-avatar">
                              {initials}
                            </div>
                            <div>
                              <div className="comm-entity-name">
                                {item.displayTitle}
                              </div>
                              <div className="comm-entity-meta">
                                <span>{item.itemType}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Customer */}
                        <td>
                          <strong>{item.clientName}</strong>
                        </td>

                        {/* Contact details */}
                        <td>
                          <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ color: hasPhone ? '#0f172a' : '#94a3b8' }}>
                              📞 {item.phone || item.customerPhone || 'No phone'}
                            </span>
                            <span style={{ color: hasEmail ? '#0f172a' : '#94a3b8', fontSize: '0.75rem' }}>
                              ✉️ {item.email || item.customerEmail || 'No email'}
                            </span>
                          </div>
                        </td>

                        {/* Date */}
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          {item.date || new Date().toISOString().split('T')[0]}
                        </td>

                        {/* Amount */}
                        <td>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: item.category === 'reminder' ? '#dc2626' : '#0f172a' }}>
                            ₹{Number(item.amount || item.total || item.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          {item.category === 'reminder' && (
                            <span className="comm-badge comm-badge-dr" style={{ marginLeft: '6px' }}>
                              {item.position || 'Dr'}
                            </span>
                          )}
                        </td>

                        {/* Classification */}
                        <td>
                          {item.category === 'invoice' && <span className="comm-badge comm-badge-invoice">Invoice</span>}
                          {item.category === 'receipt' && <span className="comm-badge comm-badge-receipt">Receipt</span>}
                          {item.category === 'quotation' && <span className="comm-badge comm-badge-quotation">Quotation</span>}
                          {item.category === 'reminder' && <span className="comm-badge comm-badge-reminder">Overdue Reminder</span>}
                        </td>

                        {/* 1-Click Actions */}
                        <td>
                          <div className="comm-action-buttons">
                            {/* 1-Click WhatsApp */}
                            <button 
                              className="comm-quick-wa-btn"
                              onClick={() => handleQuickWhatsApp(item)}
                              title="Send 1-Click WhatsApp Notification"
                            >
                              <MessageSquare size={13} /> WhatsApp
                            </button>

                            {/* 1-Click Email */}
                            <button 
                              className="comm-quick-email-btn"
                              onClick={() => handleQuickEmail(item)}
                              title="Send 1-Click Email"
                            >
                              <Mail size={13} /> Email
                            </button>

                            {/* Customize & Preview */}
                            <button 
                              className="comm-icon-btn"
                              onClick={() => {
                                setSelectedDocForModal(item);
                                setModalDefaultChannel('whatsapp');
                              }}
                              title="Customize Message & Live Preview"
                            >
                              <Eye size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {unifiedList.length === 0 && (
                    <tr>
                      <td colSpan="7">
                        <div className="comm-empty-state">
                          <div className="comm-empty-icon">
                            <Send size={32} />
                          </div>
                          <h4 className="comm-empty-title">No Records Found</h4>
                          <p className="comm-empty-desc">
                            There are currently no records matching your search or filters. Create invoices, receipts, or add contacts with balances to dispatch notifications.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Universal 1-Click Dispatch Modal */}
      {selectedDocForModal && (
        <CommunicationModal
          isOpen={Boolean(selectedDocForModal)}
          onClose={() => setSelectedDocForModal(null)}
          documentData={selectedDocForModal}
          defaultChannel={modalDefaultChannel}
          onDispatched={() => {
            loadHubData();
          }}
        />
      )}

      {/* Batch Reminder Modal */}
      {isBatchModalOpen && (
        <BatchReminderModal
          isOpen={isBatchModalOpen}
          onClose={() => setIsBatchModalOpen(false)}
          overdueContacts={overdueContactsList}
          onBatchComplete={() => {
            loadHubData();
            setIsBatchModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default CommunicationHub;

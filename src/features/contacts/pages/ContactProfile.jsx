import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getItems } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import { getContactBalance } from '@/utils/ledger';
import {
  ArrowLeft, Phone, Mail, Globe, MapPin, CreditCard, Building2,
  FileText, ShoppingCart, Receipt, Wallet, ArrowDownLeft,
  ArrowUpRight, ChevronRight, Shield, User, Hash, Edit2,
  BookOpen, Package, MessageCircle, CheckCircle, AlertCircle,
  FilePlus
} from 'lucide-react';
import '@/features/contacts/styles/ContactProfile.css';

/* ── Reusable info row ── */
const InfoRow = ({ icon: Icon, label, value, chip }) => {
  const isPhone = label?.toLowerCase().includes('phone');
  const isEmail = label?.toLowerCase().includes('email');

  let formattedValue = value;
  if (value && isPhone) {
    formattedValue = <a href={`tel:${value}`} className="cp-link">{value}</a>;
  } else if (value && isEmail) {
    formattedValue = <a href={`mailto:${value}`} className="cp-link">{value}</a>;
  }

  return (
    <div className="cp-info-row">
      <div className="cp-info-icon-wrap"><Icon size={15} /></div>
      <div style={{ flex: 1 }}>
        <div className="cp-info-label">{label}</div>
        {chip ? chip : (
          <div className={`cp-info-value ${!value ? 'muted' : ''}`}>
            {formattedValue || 'Not provided'}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Card shell ── */
const Card = ({ icon: Icon, title, action, onAction, children, style }) => (
  <div className="cp-card" style={style}>
    <div className="cp-card-header">
      <div className="cp-card-title-wrap">
        <div className="cp-card-icon-wrap"><Icon size={15} /></div>
        <span className="cp-card-label">{title}</span>
      </div>
      {action && <button className="cp-card-action" onClick={onAction}>{action}</button>}
    </div>
    {children}
  </div>
);

const ContactProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [contact, setContact]       = useState(null);
  const [balanceInfo, setBalanceInfo] = useState({ balance: 0, position: '', transactions: [], debit: 0, credit: 0 });
  const [loading, setLoading]       = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.id || !id) return;
    setLoading(true);
    try {
      const contacts = await getItems('contacts', user.id);
      const found    = contacts.find(c => (c._dbId === id || c.id === id));
      setContact(found || null);

      const ledgerId = found ? (found.id || id) : id;
      const info = await getContactBalance(ledgerId, user.id);
      setBalanceInfo(info);
    } catch (err) {
      console.error('Failed to load contact profile:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, id]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Loading ── */
  if (loading) return (
    <div className="cp-page">
      <div className="cp-loading">
        <div className="cp-spinner" />
        <div className="cp-loading-text">Loading profile...</div>
      </div>
    </div>
  );

  /* ── Not found ── */
  if (!contact) return (
    <div className="cp-page">
      <div className="cp-loading">
        <AlertCircle size={52} style={{ color: '#ef4444', opacity: 0.8 }} />
        <div className="cp-loading-text" style={{ color: '#1e293b' }}>Contact not found</div>
        <button className="cp-btn primary" onClick={() => navigate('/contacts')} style={{ marginTop: '0.5rem' }}>
          Back to Contacts
        </button>
      </div>
    </div>
  );

  /* ── Derived values ── */
  const name     = contact.companyName || contact.contactName || contact.name || 'Unknown';
  const initial  = name[0].toUpperCase();
  const type     = contact.type || 'customer';
  const billing  = contact.billing  || {};
  const shipping = contact.shipping || {};
  const custom   = contact.customFields     || {};
  const extra    = contact.additionalDetails || {};

  const ledgerId = contact.id || id;

  const billingAddr  = [billing.address,  billing.landmark,  billing.city,  billing.state,  billing.pincode,  billing.country ].filter(Boolean).join(', ');
  const shippingAddr = [shipping.address, shipping.landmark, shipping.city, shipping.state, shipping.pincode                   ].filter(Boolean).join(', ');

  const sortedTx = [...(balanceInfo.transactions || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  const netBalance   = Number(balanceInfo.balance || 0);
  const totalRecv    = Number(balanceInfo.credit  || 0);
  const totalGiven   = Number(balanceInfo.debit   || 0);

  const quickActions = [
    { 
      icon: BookOpen,      
      bg: '#e0e7ff',  
      color: '#4f46e5', 
      title: 'View Ledger',             
      sub: 'Full transaction history & balance statement',             
      onClick: () => navigate(`/ledger/${ledgerId}`)         
    },
    { 
      icon: FilePlus,      
      bg: '#d1fae5',  
      color: '#059669', 
      title: 'New Document',      
      sub: 'Create invoice, order, or quote',                  
      onClick: () => navigate('/documents/select', { state: { contactId: ledgerId, contactName: name } })
    },
    { 
      icon: MessageCircle, 
      bg: '#ccfbf1',  
      color: '#0d9488', 
      title: contact.phone ? `Call ${contact.phone}` : 'No Phone Saved', 
      sub: contact.phone ? 'Tap to open dialer' : 'Add phone to call', 
      onClick: () => contact.phone && window.open(`tel:${contact.phone}`) 
    },
  ];

  return (
    <div className="cp-page">
      <div className="cp-content">

        {/* ── BREADCRUMB / BACK ── */}
        <div className="cp-back-row">
          <button className="cp-back-btn" onClick={() => navigate('/contacts')}>
            <ArrowLeft size={15} /> Back
          </button>
          <span className="cp-breadcrumb">Contacts &nbsp;/&nbsp; <span>{name}</span></span>
        </div>

        {/* ════════════════════════════════════════
            HERO CARD (Vibrant Light Header)
        ════════════════════════════════════════ */}
        <div className="cp-hero">
          <div className="cp-hero-body">
            {/* Avatar */}
            <div className="cp-avatar-wrapper">
              <div className="cp-hero-avatar">{initial}</div>
            </div>

            {/* Info */}
            <div className="cp-hero-info">
              <h1 className="cp-hero-name">{name}</h1>

              <div className="cp-hero-chips">
                <span className={`cp-chip ${type}`}>{type}</span>
                {contact.registrationType && (
                  <span className="cp-chip reg">{contact.registrationType}</span>
                )}
                {extra.isEnabled !== false && (
                  <span className="cp-chip active">
                    <CheckCircle size={11} /> Active Contact
                  </span>
                )}
              </div>

              <div className="cp-hero-contact-info">
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="cp-hero-contact-item">
                    <Phone size={14} /> {contact.phone}
                  </a>
                )}
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="cp-hero-contact-item">
                    <Mail size={14} /> {contact.email}
                  </a>
                )}
                {billing.city && (
                  <div className="cp-hero-contact-item">
                    <MapPin size={14} /> {billing.city}{billing.state ? `, ${billing.state}` : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="cp-hero-actions">
              <button className="cp-btn primary" onClick={() => navigate(`/ledger/${ledgerId}`)}>
                <BookOpen size={15} /> View Ledger
              </button>
              <button className="cp-btn ghost" onClick={() => navigate('/contacts', { state: { editId: id } })}>
                <Edit2 size={15} /> Edit Contact
              </button>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            STAT CARDS (Light Metric Grid)
        ════════════════════════════════════════ */}
        <div className="cp-stats">
          {/* Balance */}
          <div className="cp-stat balance">
            <div className="cp-stat-deco">
              <Wallet size={90} />
            </div>
            <div className="cp-stat-icon-box"><Wallet size={20} /></div>
            <div className="cp-stat-label">Net Balance (Outstanding)</div>
            <div className="cp-stat-value">₹{netBalance.toLocaleString()}</div>
            <div className="cp-stat-sub">
              {balanceInfo.position === 'Dr' && '↑ Receivable — contact owes you'}
              {balanceInfo.position === 'Cr' && '↓ Payable — you owe contact'}
              {!balanceInfo.position && 'Account fully settled ✓'}
            </div>
          </div>

          {/* Received */}
          <div className="cp-stat recv">
            <div className="cp-stat-deco">
              <ArrowDownLeft size={90} />
            </div>
            <div className="cp-stat-icon-box"><ArrowDownLeft size={20} /></div>
            <div className="cp-stat-label">Total Received</div>
            <div className="cp-stat-value">₹{totalRecv.toLocaleString()}</div>
            <div className="cp-stat-sub">Payments in / credits recorded</div>
          </div>

          {/* Given */}
          <div className="cp-stat give">
            <div className="cp-stat-deco">
              <ArrowUpRight size={90} />
            </div>
            <div className="cp-stat-icon-box"><ArrowUpRight size={20} /></div>
            <div className="cp-stat-label">Total Given</div>
            <div className="cp-stat-value">₹{totalGiven.toLocaleString()}</div>
            <div className="cp-stat-sub">Invoices raised / debits recorded</div>
          </div>
        </div>

        {/* ─── FULL WIDTH: BASIC INFO ─── */}
        <Card icon={User} title="Basic Information" style={{ marginBottom: '1.5rem' }}>
          <div className="cp-info-grid">
            <InfoRow icon={Building2} label="Company / Business Name" value={contact.companyName} />
            <InfoRow icon={User}      label="Contact Person"          value={contact.contactName} />
            <InfoRow icon={Phone}     label="Phone Number"            value={contact.phone} />
            <InfoRow icon={Mail}      label="Email Address"           value={contact.email} />
            <InfoRow icon={CreditCard} label="Contact Type"
              chip={<span className={`cp-type-pill ${type}`}>{type.toUpperCase()}</span>} />
            <InfoRow icon={Shield}    label="GST Registration Type"   value={contact.registrationType} />
            <InfoRow icon={Hash}      label="PAN Card Number"         value={contact.pan} />
            {contact.gstin && (
              <div className="cp-info-row">
                <div className="cp-info-icon-wrap"><Shield size={15} /></div>
                <div style={{ flex: 1 }}>
                  <div className="cp-info-label">GSTIN</div>
                  <span className="cp-gstin-chip"><Shield size={11} /> {contact.gstin}</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* ─── FULL WIDTH: ADDRESS DETAILS ─── */}
        <Card icon={MapPin} title="Address Details" style={{ marginBottom: '1.5rem' }}>
          <div className="cp-info-grid">
            <InfoRow icon={MapPin} label="Billing Address" value={billingAddr} />
            <InfoRow icon={MapPin} label="City" value={billing.city} />
            <InfoRow icon={MapPin} label="State" value={billing.state} />
            <InfoRow icon={Hash} label="PIN Code" value={billing.pincode} />
            {shippingAddr && (
              <div style={{ gridColumn: 'span 2' }}>
                <div className="cp-section-divider">
                  <div className="cp-section-divider-line" />
                  <span className="cp-section-divider-label">Shipping Details</span>
                  <div className="cp-section-divider-line" />
                </div>
                <div className="cp-info-grid">
                  <InfoRow icon={Globe} label="Shipping Address" value={shippingAddr} />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* ─── SPLIT ROW: QUICK ACTIONS & FINANCIALS ─── */}
        <div className="cp-grid-split">
          {/* Quick Actions */}
          <Card icon={ChevronRight} title="Quick Actions" style={{ marginBottom: 0 }}>
            {quickActions.map((qa, i) => (
              <button key={i} className="cp-qa-item" onClick={qa.onClick}>
                <div className="cp-qa-icon-box" style={{ background: qa.bg, color: qa.color }}>
                  <qa.icon size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="cp-qa-title">{qa.title}</div>
                  <div className="cp-qa-sub">{qa.sub}</div>
                </div>
                <ChevronRight size={16} className="cp-qa-arrow" />
              </button>
            ))}
          </Card>

          {/* Financials & Custom */}
          <Card icon={Wallet} title="Financial & Additional Info" style={{ marginBottom: 0 }}>
            <InfoRow icon={Wallet} label="Opening Balance"
              value={contact.openingBalance
                ? `₹${contact.openingBalance}  •  ${contact.balanceType || 'Credit'}`
                : null} />
            <InfoRow icon={CreditCard} label="Credit Limit" value={extra.creditLimit ? `₹${extra.creditLimit}` : null} />
            <InfoRow icon={FileText} label="Payment Due Days" value={extra.dueDays ? `${extra.dueDays} days` : null} />
            {custom.licenseNo && <InfoRow icon={Hash} label="License No." value={custom.licenseNo} />}
            {custom.field1 && <InfoRow icon={Hash} label="Custom Field 1" value={custom.field1} />}
          </Card>
        </div>

        {/* ─── FULL WIDTH: RECENT TRANSACTIONS (LEDGER) ─── */}
        <Card
          icon={Receipt}
          title="Recent Transactions"
          action="View Full Ledger →"
          onAction={() => navigate(`/ledger/${ledgerId}`)}
          style={{ marginTop: '1.5rem', marginBottom: 0 }}
        >
          {sortedTx.length > 0 ? (
            <table className="cp-tx-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {sortedTx.map((tx, i) => (
                  <tr key={tx.id || tx._id || i}>
                    <td><div className="cp-tx-date">{tx.date}</div></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className={`cp-tx-icon ${tx.type === 'dr' ? 'dr' : 'cr'}`}>
                          {tx.type === 'dr'
                            ? <ArrowUpRight size={15} />
                            : <ArrowDownLeft size={15} />}
                        </div>
                        <div>
                          <div className="cp-tx-desc">
                            {tx.description || (tx.type === 'dr' ? 'Debit Entry' : 'Credit Entry')}
                          </div>
                          <div className="cp-tx-meta">{tx.docType || 'Manual Entry'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className={`cp-tx-amount ${tx.type === 'dr' ? 'dr' : 'cr'}`}>
                        {tx.type === 'dr' ? '−' : '+'} ₹{Number(tx.amount || 0).toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="cp-empty" style={{ padding: '2.5rem 2rem' }}>
              <Receipt size={48} style={{ color: '#cbd5e1' }} />
              <div className="cp-empty-title">No transactions recorded yet</div>
              <div className="cp-empty-sub">Open the contact ledger to add payments, invoices, or manual entries.</div>
              <button className="cp-btn primary" style={{ marginTop: '0.75rem', fontSize: '0.82rem', padding: '0.6rem 1.2rem' }}
                onClick={() => navigate(`/ledger/${ledgerId}`)}>
                <BookOpen size={15} /> Open Contact Ledger
              </button>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
};

export default ContactProfile;

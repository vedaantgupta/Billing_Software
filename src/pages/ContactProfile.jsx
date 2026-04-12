import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getItems } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import { getContactBalance } from '../utils/ledger';
import {
  ArrowLeft, Phone, Mail, Globe, MapPin, CreditCard, Building2,
  FileText, ShoppingCart, Receipt, Wallet, ArrowDownLeft,
  ArrowUpRight, ChevronRight, Shield, User, Hash, Edit2,
  BookOpen, Package, MessageCircle, CheckCircle, AlertCircle,
  FilePlus
} from 'lucide-react';
import './ContactProfile.css';

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
        <div className="cp-card-icon-wrap"><Icon size={14} /></div>
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

      // IMPORTANT: The ledger and previous systems use the timestamp 'id' as the key.
      // If we found a contact, use its 'id' field for ledger lookups.
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
        <AlertCircle size={52} style={{ color: '#f43f5e', opacity: 0.6 }} />
        <div className="cp-loading-text">Contact not found</div>
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

  // Consistent ID for ledger navigation
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
      bg: 'rgba(99,102,241,0.2)',  
      color: '#a78bfa', 
      title: 'View Ledger',             
      sub: 'Full transaction history & balance',             
      onClick: () => navigate(`/ledger/${ledgerId}`)         
    },
    { 
      icon: FilePlus,      
      bg: 'rgba(16,185,129,0.2)',  
      color: '#34d399', 
      title: 'New Document',      
      sub: 'Create invoice, order, or quote',                  
      onClick: () => navigate('/documents/select', { state: { contactId: ledgerId, contactName: name } })
    },
    { 
      icon: MessageCircle, 
      bg: 'rgba(20,184,166,0.2)',  
      color: '#2dd4bf', 
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
            HERO
        ════════════════════════════════════════ */}
        <div className="cp-hero">
          <div className="cp-hero-gradient" />
          <div className="cp-hero-shimmer" />
          <div className="cp-hero-orb1" />
          <div className="cp-hero-orb2" />
          <div className="cp-hero-orb3" />

          <div className="cp-hero-body">
            {/* Avatar */}
            <div className="cp-avatar-wrapper">
              <div className="cp-avatar-ring" />
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
                  <span className="cp-chip" style={{ background: 'rgba(16,185,129,0.25)', color: '#6ee7b7', borderColor: 'rgba(16,185,129,0.2)' }}>
                    <CheckCircle size={10} /> Active
                  </span>
                )}
              </div>

              <div className="cp-hero-contact-info">
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="cp-hero-contact-item">
                    <Phone size={13} /> {contact.phone}
                  </a>
                )}
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="cp-hero-contact-item">
                    <Mail size={13} /> {contact.email}
                  </a>
                )}
                {billing.city && (
                  <div className="cp-hero-contact-item">
                    <MapPin size={13} /> {billing.city}{billing.state ? `, ${billing.state}` : ''}
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
                <Edit2 size={15} /> Edit
              </button>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            STAT CARDS
        ════════════════════════════════════════ */}
        <div className="cp-stats">
          {/* Balance */}
          <div className="cp-stat balance">
            <div className="cp-stat-deco">
              <Wallet size={100} />
            </div>
            <div className="cp-stat-icon-box"><Wallet size={18} /></div>
            <div className="cp-stat-label">Outstanding</div>
            <div className="cp-stat-value">₹{netBalance.toLocaleString()}</div>
            <div className="cp-stat-sub">
              {balanceInfo.position === 'Dr' && '↑ Receivable — they owe you'}
              {balanceInfo.position === 'Cr' && '↓ Payable — you owe them'}
              {!balanceInfo.position && 'Account fully settled ✓'}
            </div>
          </div>

          {/* Received */}
          <div className="cp-stat recv">
            <div className="cp-stat-deco">
              <ArrowDownLeft size={100} />
            </div>
            <div className="cp-stat-icon-box"><ArrowDownLeft size={18} /></div>
            <div className="cp-stat-label">Total Received</div>
            <div className="cp-stat-value">₹{totalRecv.toLocaleString()}</div>
            <div className="cp-stat-sub">Payments in / credits recorded</div>
          </div>

          {/* Given */}
          <div className="cp-stat give">
            <div className="cp-stat-deco">
              <ArrowUpRight size={100} />
            </div>
            <div className="cp-stat-icon-box"><ArrowUpRight size={18} /></div>
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
            <InfoRow icon={Phone}     label="Phone"                   value={contact.phone} />
            <InfoRow icon={Mail}      label="Email"                   value={contact.email} />
            <InfoRow icon={CreditCard} label="Type"
              chip={<span className={`cp-type-pill ${type}`}>{type.toUpperCase()}</span>} />
            <InfoRow icon={Shield}    label="Registration"            value={contact.registrationType} />
            <InfoRow icon={Hash}      label="PAN Number"              value={contact.pan} />
            {contact.gstin && (
              <div className="cp-info-row">
                <div className="cp-info-icon-wrap"><Shield size={15} /></div>
                <div style={{ flex: 1 }}>
                  <div className="cp-info-label">GSTIN</div>
                  <span className="cp-gstin-chip"><Shield size={10} /> {contact.gstin}</span>
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
                  <span className="cp-section-divider-label">Shipping</span>
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
                  <qa.icon size={17} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="cp-qa-title">{qa.title}</div>
                  <div className="cp-qa-sub">{qa.sub}</div>
                </div>
                <ChevronRight size={15} className="cp-qa-arrow" />
              </button>
            ))}
          </Card>

          {/* Financials + Custom */}
          <Card icon={Wallet} title="Financial & Custom" style={{ marginBottom: 0 }}>
            <InfoRow icon={Wallet} label="Opening Balance"
              value={contact.openingBalance
                ? `₹${contact.openingBalance}  •  ${contact.balanceType || 'Credit'}`
                : null} />
            <InfoRow icon={CreditCard} label="Credit Limit" value={extra.creditLimit ? `₹${extra.creditLimit}` : null} />
            <InfoRow icon={FileText} label="Due Days" value={extra.dueDays ? `${extra.dueDays} days` : null} />
            {custom.licenseNo && <InfoRow icon={Hash} label="License No." value={custom.licenseNo} />}
            {custom.field1 && <InfoRow icon={Hash} label="Custom Field 1" value={custom.field1} />}
          </Card>
        </div>

        {/* ─── FULL WIDTH: RECENT TRANSACTIONS (LEDGER) ─── */}
        <Card
          icon={Receipt}
          title="Recent Transactions"
          action="View All →"
          onAction={() => navigate(`/ledger/${ledgerId}`)}
          style={{ marginBottom: 0 }}
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
                            ? <ArrowUpRight size={14} />
                            : <ArrowDownLeft size={14} />}
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
            <div className="cp-empty" style={{ padding: '2rem' }}>
              <Receipt size={44} style={{ opacity: 0.2 }} />
              <div className="cp-empty-title">No transactions yet</div>
              <div className="cp-empty-sub">Go to Ledger to record entries for this contact.</div>
              <button className="cp-btn primary" style={{ marginTop: '0.75rem', fontSize: '0.82rem', padding: '0.55rem 1.1rem' }}
                onClick={() => navigate(`/ledger/${ledgerId}`)}>
                <BookOpen size={14} /> Open Ledger
              </button>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
};

export default ContactProfile;

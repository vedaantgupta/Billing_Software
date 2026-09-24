import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Send, Mail, MessageSquare, Check, Copy, ExternalLink, 
  Download, AlertCircle, Sparkles, CheckCheck, Phone, ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { 
  getCommunicationSettings, cleanPhoneNumber, renderTemplate,
  getWhatsAppUrl, getEmailUrl, sendWhatsAppViaBusinessAPI,
  logCommunicationEvent, generateUPILink
} from '../services/communicationService';
import '@/features/communication/styles/CommunicationHub.css';

const CommunicationModal = ({ 
  isOpen, 
  onClose, 
  documentData, 
  defaultChannel = 'whatsapp',
  onDispatched 
}) => {
  const { user } = useAuth();
  const settings = useMemo(() => getCommunicationSettings(user?.id), [user?.id]);

  const [channel, setChannel] = useState(defaultChannel); // 'whatsapp' | 'email'
  const [waSubMode, setWaSubMode] = useState(settings.whatsappMode || 'web'); // 'web' | 'api'
  const [emailSubMode, setEmailSubMode] = useState(settings.emailMode || 'gmail'); // 'gmail' | 'mailto'

  // Editable recipient details
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Selected template type
  const [templateKey, setTemplateKey] = useState('standard');
  const [includeUPI, setIncludeUPI] = useState(true);
  const [customNote, setCustomNote] = useState('');
  const [renderedMessage, setRenderedMessage] = useState('');
  const [emailSubject, setEmailSubject] = useState('');

  // Status & loading
  const [isSending, setIsSending] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Initialize fields whenever documentData or modal changes
  useEffect(() => {
    if (!documentData) return;

    setChannel(defaultChannel || 'whatsapp');
    setDispatchSuccess(false);
    setErrorMessage('');
    setCopied(false);

    const name = documentData.customerName || 
                 documentData.vendorName || 
                 documentData.name || 
                 documentData.clientName || 
                 'Customer';

    const p = documentData.customerPhone || 
              documentData.phone || 
              documentData.mobile || 
              documentData.contactPersonPhone || 
              '';

    const e = documentData.customerEmail || 
              documentData.email || 
              documentData.contactPersonEmail || 
              '';

    setRecipientName(name);
    setPhone(p);
    setEmail(e);

    // Pick matching default template
    const docType = documentData.docType || (documentData.balance ? 'Reminder' : 'Invoice');
    if (docType.includes('Receipt') || docType.includes('Payment')) {
      setTemplateKey('paymentReceipt');
    } else if (docType.includes('Quotation') || docType.includes('Offer')) {
      setTemplateKey('quotation');
    } else if (documentData.balance > 0 || docType.includes('Reminder')) {
      setTemplateKey('reminderGentle');
    } else {
      setTemplateKey('invoice');
    }
  }, [documentData, defaultChannel]);

  // Compute rendered message whenever data, template or note changes
  useEffect(() => {
    if (!documentData) return;

    const templates = settings.templates || {};
    let rawTemplate = templates[templateKey] || templates.invoice || '';

    // Interpolation data
    const amount = Number(documentData.amount ?? documentData.total ?? documentData.balance ?? 0);
    const businessName = user?.companyName || user?.businessName || user?.firstName || 'Our Business';
    const upiLink = includeUPI ? generateUPILink(amount, businessName, settings.upi?.vpa) : '';

    const payload = {
      customerName: recipientName,
      name: recipientName,
      docType: documentData.docType || 'Document',
      invoiceNumber: documentData.invoiceNumber || documentData.fullReceiptNo || documentData.id || 'N/A',
      receiptNumber: documentData.fullReceiptNo || documentData.receiptNumber || 'N/A',
      amount,
      balance: documentData.balance || amount,
      position: documentData.position || 'Dr',
      remainingBalance: documentData.remainingBalance || 0,
      paymentType: documentData.paymentType || 'Cash / Online Transfer',
      date: documentData.date || new Date().toISOString().split('T')[0],
      dueDate: documentData.dueDate || 'Immediate',
      validUntil: documentData.validUntil || 'Within 15 Days',
      businessName,
      upiLink,
      notes: customNote
    };

    let msg = renderTemplate(rawTemplate, payload);
    if (customNote.trim()) {
      msg += `\n\n📌 *Special Note:*\n${customNote}`;
    }

    setRenderedMessage(msg);

    // Email Subject
    const docNum = documentData.invoiceNumber || documentData.fullReceiptNo || '';
    if (templateKey.includes('receipt') || templateKey.includes('Receipt')) {
      setEmailSubject(`Payment Receipt #${docNum} from ${businessName}`);
    } else if (templateKey.includes('quotation') || templateKey.includes('Quotation')) {
      setEmailSubject(`Quotation #${docNum} - ${businessName}`);
    } else if (templateKey.includes('reminder') || templateKey.includes('Reminder')) {
      setEmailSubject(`Payment Reminder - Statement from ${businessName}`);
    } else {
      setEmailSubject(`${documentData.docType || 'Invoice'} #${docNum} from ${businessName}`);
    }
  }, [documentData, recipientName, templateKey, includeUPI, customNote, settings, user]);

  if (!isOpen || !documentData) return null;

  // Handle 1-Click WhatsApp Send
  const handleSendWhatsApp = async () => {
    setErrorMessage('');
    const clean = cleanPhoneNumber(phone);
    if (!clean && waSubMode === 'api') {
      setErrorMessage('Please provide a valid 10-digit phone number for WhatsApp.');
      return;
    }

    setIsSending(true);

    try {
      if (waSubMode === 'api' && settings.whatsappApi?.accessToken && settings.whatsappApi?.phoneNumberId) {
        // Send directly through WhatsApp Business API
        await sendWhatsAppViaBusinessAPI(settings.whatsappApi, clean, renderedMessage);
        setDispatchSuccess(true);
      } else {
        // WhatsApp Web / wa.me 1-click launch
        const waUrl = getWhatsAppUrl(clean, renderedMessage);
        window.open(waUrl, '_blank');
        setDispatchSuccess(true);
      }

      // Record to activity log
      await logCommunicationEvent(user?.id, {
        channel: 'whatsapp',
        mode: waSubMode === 'api' ? 'WhatsApp Business API' : 'WhatsApp Web',
        docType: documentData.docType || (documentData.balance ? 'Payment Reminder' : 'Invoice'),
        docId: documentData.id || documentData._dbId || '',
        docNumber: documentData.invoiceNumber || documentData.fullReceiptNo || documentData.name || 'N/A',
        recipientName,
        recipientTarget: clean || phone || 'WhatsApp',
        amount: Number(documentData.amount ?? documentData.total ?? documentData.balance ?? 0),
        status: 'Sent',
        messageText: renderedMessage
      });

      if (onDispatched) onDispatched({ channel: 'whatsapp', recipient: clean, mode: waSubMode });
    } catch (err) {
      console.error('WhatsApp dispatch error:', err);
      // If API failed, propose WhatsApp Web fallback
      if (waSubMode === 'api') {
        const fallbackConfirm = window.confirm(
          `WhatsApp API Error: ${err.message}\n\nWould you like to open this in WhatsApp Web instead?`
        );
        if (fallbackConfirm) {
          const waUrl = getWhatsAppUrl(clean, renderedMessage);
          window.open(waUrl, '_blank');
          setDispatchSuccess(true);
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorMessage(err.message);
      }
    } finally {
      setIsSending(false);
    }
  };

  // Handle 1-Click Email Send
  const handleSendEmail = async () => {
    setErrorMessage('');
    if (!email && emailSubMode === 'api') {
      setErrorMessage('Recipient email address is required.');
      return;
    }

    setIsSending(true);
    try {
      const emailUrl = getEmailUrl(email, emailSubject, renderedMessage, emailSubMode);
      window.open(emailUrl, '_blank');
      setDispatchSuccess(true);

      // Record to activity log
      await logCommunicationEvent(user?.id, {
        channel: 'email',
        mode: emailSubMode === 'gmail' ? 'Gmail Web' : 'Default Email Client',
        docType: documentData.docType || (documentData.balance ? 'Payment Reminder' : 'Invoice'),
        docId: documentData.id || documentData._dbId || '',
        docNumber: documentData.invoiceNumber || documentData.fullReceiptNo || documentData.name || 'N/A',
        recipientName,
        recipientTarget: email || 'Direct Email',
        amount: Number(documentData.amount ?? documentData.total ?? documentData.balance ?? 0),
        status: 'Sent',
        messageText: renderedMessage
      });

      if (onDispatched) onDispatched({ channel: 'email', recipient: email, mode: emailSubMode });
    } catch (err) {
      console.error('Email dispatch error:', err);
      setErrorMessage(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(renderedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="comm-modal-backdrop" onClick={onClose}>
      <div className="comm-modal-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="comm-modal-header">
          <div className="comm-modal-title-row">
            <div className="comm-modal-icon-badge">
              {channel === 'whatsapp' ? <MessageSquare size={22} color="#16a34a" /> : <Mail size={22} color="#ea4335" />}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                1-Click Communication Dispatch
              </h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {documentData.docType || 'Document'} {documentData.invoiceNumber || documentData.fullReceiptNo || ''} • Recipient: <strong>{recipientName}</strong>
              </div>
            </div>
          </div>
          <button className="comm-icon-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body Split */}
        <div className="comm-modal-body-split">
          {/* Left Pane: Config & Inputs */}
          <div className="comm-modal-config-pane">
            {/* Channel Switcher */}
            <div className="comm-channel-switcher">
              <button 
                type="button"
                className={`comm-channel-btn ${channel === 'whatsapp' ? 'active wa' : ''}`}
                onClick={() => setChannel('whatsapp')}
              >
                <MessageSquare size={16} /> WhatsApp
              </button>
              <button 
                type="button"
                className={`comm-channel-btn ${channel === 'email' ? 'active email' : ''}`}
                onClick={() => setChannel('email')}
              >
                <Mail size={16} /> Email / Gmail
              </button>
            </div>

            {/* Sub-mode selector */}
            {channel === 'whatsapp' ? (
              <div style={{ display: 'flex', gap: '0.5rem', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>WhatsApp Mode:</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button 
                    type="button"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: waSubMode === 'web' ? '#25D366' : '#fff', color: waSubMode === 'web' ? '#fff' : '#334155', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => setWaSubMode('web')}
                  >
                    WhatsApp Web
                  </button>
                  <button 
                    type="button"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: waSubMode === 'api' ? '#128C7E' : '#fff', color: waSubMode === 'api' ? '#fff' : '#334155', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => setWaSubMode('api')}
                    title={settings.whatsappApi?.accessToken ? "Configured & Ready" : "Requires API Credentials in Settings"}
                  >
                    Business API
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email Method:</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button 
                    type="button"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: emailSubMode === 'gmail' ? '#ea4335' : '#fff', color: emailSubMode === 'gmail' ? '#fff' : '#334155', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => setEmailSubMode('gmail')}
                  >
                    Gmail Web
                  </button>
                  <button 
                    type="button"
                    style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: emailSubMode === 'mailto' ? '#4f46e5' : '#fff', color: emailSubMode === 'mailto' ? '#fff' : '#334155', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => setEmailSubMode('mailto')}
                  >
                    Default Client
                  </button>
                </div>
              </div>
            )}

            {/* Recipient Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="comm-form-group">
                <label className="comm-form-label">Recipient Name</label>
                <input 
                  type="text" 
                  className="comm-form-input" 
                  value={recipientName} 
                  onChange={e => setRecipientName(e.target.value)} 
                  placeholder="Customer Name"
                />
              </div>

              {channel === 'whatsapp' ? (
                <div className="comm-form-group">
                  <label className="comm-form-label">Phone Number (WhatsApp)</label>
                  <input 
                    type="text" 
                    className="comm-form-input" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    placeholder="e.g. 9876543210"
                  />
                  {phone && (
                    <span style={{ fontSize: '0.68rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Phone size={10} /> Validated: +{cleanPhoneNumber(phone)}
                    </span>
                  )}
                </div>
              ) : (
                <div className="comm-form-group">
                  <label className="comm-form-label">Email Address</label>
                  <input 
                    type="email" 
                    className="comm-form-input" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="customer@domain.com"
                  />
                </div>
              )}
            </div>

            {/* Template Selector */}
            <div className="comm-form-group">
              <label className="comm-form-label">Message Template</label>
              <select 
                className="comm-form-select" 
                value={templateKey} 
                onChange={e => setTemplateKey(e.target.value)}
              >
                <option value="invoice">📄 Standard Invoice / Bill</option>
                <option value="paymentReceipt">🧾 Payment Receipt Acknowledgment</option>
                <option value="quotation">💼 Quotation & Offer Proposal</option>
                <option value="reminderGentle">🔔 Friendly Payment Reminder</option>
                <option value="reminderUrgent">⚠️ Urgent Overdue Notice</option>
              </select>
            </div>

            {/* UPI & Instant Payment Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: '0.825rem', fontWeight: 600 }}>Include Instant UPI Pay Link</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Inserts ready-to-tap UPI deep-link ({settings.upi?.vpa || 'merchant@upi'})</div>
              </div>
              <input 
                type="checkbox" 
                checked={includeUPI} 
                onChange={e => setIncludeUPI(e.target.checked)} 
                style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
              />
            </div>

            {/* Custom Note Addition */}
            <div className="comm-form-group">
              <label className="comm-form-label">Add Note / Personal Remarks (Optional)</label>
              <textarea 
                className="comm-form-textarea" 
                rows={2} 
                value={customNote} 
                onChange={e => setCustomNote(e.target.value)}
                placeholder="e.g. Thanks for your business! Goods will be dispatched today."
              />
            </div>

            {errorMessage && (
              <div style={{ padding: '0.65rem 0.85rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {dispatchSuccess && (
              <div style={{ padding: '0.65rem 0.85rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#047857', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCheck size={18} />
                <span>Message dispatched and logged successfully!</span>
              </div>
            )}
          </div>

          {/* Right Pane: Live Chat / Email Preview */}
          <div className="comm-modal-preview-pane">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                {channel === 'whatsapp' ? '📱 WhatsApp Chat Preview' : '✉️ Email Client Preview'}
              </span>
              <button 
                type="button"
                className="comm-icon-btn" 
                style={{ width: 'auto', padding: '0 0.5rem', height: '28px', fontSize: '0.75rem', gap: '4px' }}
                onClick={handleCopy}
                title="Copy formatted message text"
              >
                {copied ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy Text'}
              </button>
            </div>

            {channel === 'whatsapp' ? (
              <div className="comm-wa-chat-frame">
                <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.7)', padding: '2px 8px', borderRadius: '6px', color: '#54656f', fontWeight: 600 }}>
                    TODAY
                  </span>
                </div>
                <div className="comm-wa-bubble">
                  {renderedMessage}
                  <div className="comm-wa-bubble-time">
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <CheckCheck size={14} color="#53bdeb" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="comm-email-frame">
                <div className="comm-email-header-row">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>To:</span>
                    <strong style={{ color: '#0f172a' }}>{email || '(No email provided)'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Subject:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{emailSubject}</span>
                  </div>
                </div>
                <div className="comm-email-body-text">
                  {renderedMessage}
                </div>
              </div>
            )}

            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: 'auto' }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>100% Secure communication. Auto-logged into your audit trail.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="comm-modal-footer">
          <div className="comm-modal-footer-left">
            <button className="comm-btn comm-btn-outline" onClick={handleCopy}>
              {copied ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
          </div>
          <div className="comm-modal-footer-right">
            <button className="comm-btn comm-btn-outline" onClick={onClose}>
              Cancel
            </button>
            {channel === 'whatsapp' ? (
              <button 
                className="comm-btn comm-btn-whatsapp" 
                onClick={handleSendWhatsApp} 
                disabled={isSending}
                style={{ minWidth: '170px', justifyContent: 'center' }}
              >
                <Send size={16} />
                {isSending ? 'Sending...' : waSubMode === 'api' ? 'Send via WhatsApp API' : 'Send via WhatsApp'}
              </button>
            ) : (
              <button 
                className="comm-btn comm-btn-email" 
                onClick={handleSendEmail} 
                disabled={isSending}
                style={{ minWidth: '170px', justifyContent: 'center' }}
              >
                <Mail size={16} />
                {isSending ? 'Opening...' : emailSubMode === 'gmail' ? 'Open in Gmail' : 'Send via Email'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunicationModal;

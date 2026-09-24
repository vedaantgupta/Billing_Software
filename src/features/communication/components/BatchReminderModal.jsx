import React, { useState } from 'react';
import { 
  X, CheckSquare, Square, Send, Mail, Users, AlertCircle, 
  CheckCheck, ArrowRight, Play, Check 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { 
  getCommunicationSettings, cleanPhoneNumber, renderTemplate,
  getWhatsAppUrl, getEmailUrl, sendWhatsAppViaBusinessAPI,
  logCommunicationEvent, generateUPILink
} from '../services/communicationService';
import '@/features/communication/styles/CommunicationHub.css';

const BatchReminderModal = ({ isOpen, onClose, overdueContacts = [], onBatchComplete }) => {
  const { user } = useAuth();
  const settings = getCommunicationSettings(user?.id);

  const [selectedIds, setSelectedIds] = useState(() => 
    new Set(overdueContacts.map(c => c.id))
  );
  const [channel, setChannel] = useState('whatsapp'); // 'whatsapp' | 'email'
  const [urgency, setUrgency] = useState('gentle'); // 'gentle' | 'urgent'
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedList, setCompletedList] = useState([]);

  if (!isOpen) return null;

  const selectedContacts = overdueContacts.filter(c => selectedIds.has(c.id));
  const totalAmountSelected = selectedContacts.reduce((sum, c) => sum + (c.balance || 0), 0);

  const handleToggle = (id) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(overdueContacts.map(c => c.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Launch next reminder in batch
  const sendReminderForContact = async (contact) => {
    const clean = cleanPhoneNumber(contact.phone);
    const amount = Number(contact.balance || 0);
    const businessName = user?.companyName || user?.businessName || user?.firstName || 'Our Business';
    const upiLink = generateUPILink(amount, businessName, settings.upi?.vpa);

    const templateStr = urgency === 'urgent' 
      ? settings.templates?.reminderUrgent 
      : settings.templates?.reminderGentle;

    const message = renderTemplate(templateStr, {
      customerName: contact.companyName || contact.customerName || contact.name,
      balance: amount,
      position: contact.position || 'Dr',
      date: new Date().toISOString().split('T')[0],
      businessName,
      upiLink
    });

    if (channel === 'whatsapp') {
      if (settings.whatsappMode === 'api' && settings.whatsappApi?.accessToken) {
        try {
          await sendWhatsAppViaBusinessAPI(settings.whatsappApi, clean, message);
        } catch (err) {
          console.warn('API send failed, falling back to Web:', err);
          const url = getWhatsAppUrl(clean, message);
          window.open(url, '_blank');
        }
      } else {
        const url = getWhatsAppUrl(clean, message);
        window.open(url, '_blank');
      }

      await logCommunicationEvent(user?.id, {
        channel: 'whatsapp',
        mode: settings.whatsappMode === 'api' ? 'WhatsApp Business API' : 'WhatsApp Web',
        docType: 'Batch Payment Reminder',
        recipientName: contact.companyName || contact.customerName || contact.name,
        recipientTarget: clean || contact.phone,
        amount,
        status: 'Sent',
        messageText: message
      });
    } else {
      const subject = `Urgent Payment Reminder - Statement from ${businessName}`;
      const url = getEmailUrl(contact.email, subject, message, settings.emailMode || 'gmail');
      window.open(url, '_blank');

      await logCommunicationEvent(user?.id, {
        channel: 'email',
        mode: 'Gmail / Direct Email',
        docType: 'Batch Payment Reminder',
        recipientName: contact.companyName || contact.customerName || contact.name,
        recipientTarget: contact.email,
        amount,
        status: 'Sent',
        messageText: message
      });
    }

    setCompletedList(prev => [...prev, contact.id]);
  };

  const handleStartBatch = async () => {
    if (selectedContacts.length === 0) return;
    setIsProcessing(true);

    // If using WhatsApp Business API, we can send in rapid sequence
    if (channel === 'whatsapp' && settings.whatsappMode === 'api' && settings.whatsappApi?.accessToken) {
      for (let i = 0; i < selectedContacts.length; i++) {
        setCurrentIndex(i);
        await sendReminderForContact(selectedContacts[i]);
      }
      setIsProcessing(false);
      setCurrentIndex(-1);
      if (onBatchComplete) onBatchComplete();
    } else {
      // Step-by-step sequential trigger so browser doesn't block multiple popup tabs
      setCurrentIndex(0);
      await sendReminderForContact(selectedContacts[0]);
    }
  };

  const handleNextSequential = async () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx < selectedContacts.length) {
      setCurrentIndex(nextIdx);
      await sendReminderForContact(selectedContacts[nextIdx]);
    } else {
      setIsProcessing(false);
      setCurrentIndex(-1);
      if (onBatchComplete) onBatchComplete();
    }
  };

  return (
    <div className="comm-modal-backdrop" onClick={onClose}>
      <div className="comm-modal-container" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="comm-modal-header">
          <div className="comm-modal-title-row">
            <div className="comm-modal-icon-badge" style={{ background: '#fef3c7', color: '#d97706' }}>
              <Users size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                1-Click Batch Payment Reminders
              </h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Remind multiple customers with pending balances in a single workflow.
              </div>
            </div>
          </div>
          <button className="comm-icon-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Options Bar */}
        <div style={{ padding: '1rem 1.75rem', background: '#f8fafc', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Channel:</span>
            <button 
              type="button"
              className="comm-pill"
              style={channel === 'whatsapp' ? { background: '#25D366', color: '#fff', borderColor: '#25D366' } : {}}
              onClick={() => setChannel('whatsapp')}
            >
              WhatsApp
            </button>
            <button 
              type="button"
              className="comm-pill"
              style={channel === 'email' ? { background: '#ea4335', color: '#fff', borderColor: '#ea4335' } : {}}
              onClick={() => setChannel('email')}
            >
              Email / Gmail
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tone:</span>
            <button 
              type="button"
              className="comm-pill"
              style={urgency === 'gentle' ? { background: '#6366f1', color: '#fff', borderColor: '#6366f1' } : {}}
              onClick={() => setUrgency('gentle')}
            >
              Friendly Reminder
            </button>
            <button 
              type="button"
              className="comm-pill"
              style={urgency === 'urgent' ? { background: '#dc2626', color: '#fff', borderColor: '#dc2626' } : {}}
              onClick={() => setUrgency('urgent')}
            >
              Urgent Overdue
            </button>
          </div>
        </div>

        {/* List of Contacts */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '1rem 1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Selected <strong>{selectedContacts.length}</strong> of {overdueContacts.length} debtors • Total Outstanding: <strong style={{ color: '#b91c1c' }}>₹{totalAmountSelected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="comm-pill" onClick={handleSelectAll}>Select All</button>
              <button type="button" className="comm-pill" onClick={handleDeselectAll}>Clear</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {overdueContacts.map((contact, idx) => {
              const isSelected = selectedIds.has(contact.id);
              const isDone = completedList.includes(contact.id);
              const isCurrent = currentIndex === idx;

              return (
                <div 
                  key={contact.id} 
                  onClick={() => handleToggle(contact.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: isCurrent ? '2px solid #25D366' : '1px solid var(--border-color)',
                    background: isDone ? '#ecfdf5' : isSelected ? '#f8fafc' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ color: isSelected ? 'var(--primary-color)' : '#94a3b8' }}>
                      {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>
                        {contact.companyName || contact.customerName || contact.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Phone: {contact.phone || 'No phone'} • Email: {contact.email || 'No email'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.95rem' }}>
                        ₹{Number(contact.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#b91c1c' }}>RECEIVABLE</div>
                    </div>

                    {isDone && (
                      <span className="comm-badge comm-badge-sent">
                        <Check size={12} /> Sent
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {overdueContacts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                No outstanding contacts found. All accounts settled!
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="comm-modal-footer">
          <div className="comm-modal-footer-left">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {completedList.length} of {selectedContacts.length} dispatched
            </span>
          </div>

          <div className="comm-modal-footer-right">
            <button className="comm-btn comm-btn-outline" onClick={onClose}>
              Close
            </button>

            {currentIndex >= 0 && currentIndex < selectedContacts.length - 1 ? (
              <button 
                className="comm-btn comm-btn-primary" 
                onClick={handleNextSequential}
              >
                Send Next ({currentIndex + 2}/{selectedContacts.length}) <ArrowRight size={16} />
              </button>
            ) : (
              <button 
                className="comm-btn comm-btn-whatsapp" 
                onClick={handleStartBatch}
                disabled={selectedContacts.length === 0 || isProcessing}
              >
                <Play size={16} />
                {isProcessing ? 'Processing...' : `Dispatch ${selectedContacts.length} Reminders`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchReminderModal;

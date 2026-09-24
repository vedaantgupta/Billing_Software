import React, { useState, useEffect } from 'react';
import { 
  Save, RotateCcw, Check, MessageSquare, Mail, 
  CreditCard, Sparkles, AlertCircle, ShieldCheck, Key, RefreshCw
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { 
  getCommunicationSettings, saveCommunicationSettings, 
  DEFAULT_TEMPLATES, testWhatsAppApiConnection 
} from '../services/communicationService';
import '@/features/communication/styles/CommunicationHub.css';

const CommunicationSettings = ({ onSaved }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(() => getCommunicationSettings(user?.id));
  const [activeTemplateTab, setActiveTemplateTab] = useState('invoice');
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setSettings(getCommunicationSettings(user?.id));
  }, [user?.id]);

  const handleSave = (e) => {
    if (e) e.preventDefault();
    saveCommunicationSettings(user?.id, settings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    if (onSaved) onSaved(settings);
  };

  const handleResetTemplates = () => {
    if (window.confirm('Reset all message templates to default factory settings?')) {
      setSettings(prev => ({
        ...prev,
        templates: { ...DEFAULT_TEMPLATES }
      }));
    }
  };

  const insertVariableChip = (variable) => {
    const currentText = settings.templates[activeTemplateTab] || '';
    setSettings(prev => ({
      ...prev,
      templates: {
        ...prev.templates,
        [activeTemplateTab]: currentText + ` ${variable} `
      }
    }));
  };

  const handleTestWhatsApp = async () => {
    setIsTestingApi(true);
    setTestResult(null);
    try {
      const res = await testWhatsAppApiConnection(settings.whatsappApi);
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setIsTestingApi(false);
    }
  };

  const variableChips = [
    '{customerName}', '{docType}', '{invoiceNumber}', '{receiptNumber}', 
    '{amount}', '{date}', '{dueDate}', '{validUntil}', '{balance}', 
    '{position}', '{paymentType}', '{businessName}', '{upiLink}', '{notes}'
  ];

  return (
    <div className="comm-settings-grid">
      {/* 1. WhatsApp Configuration */}
      <div className="comm-card-section">
        <div className="comm-card-header-row">
          <div className="comm-modal-icon-badge" style={{ background: '#e8f9ee', color: '#16a34a' }}>
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="comm-card-title">WhatsApp Communication Settings</h3>
            <div className="comm-card-desc">Configure WhatsApp Web or official Meta Business Cloud API</div>
          </div>
        </div>

        <div className="comm-form-group">
          <label className="comm-form-label">Preferred WhatsApp Channel</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              type="button"
              className={`comm-btn ${settings.whatsappMode === 'web' ? 'comm-btn-whatsapp' : 'comm-btn-outline'}`}
              onClick={() => setSettings({ ...settings, whatsappMode: 'web' })}
              style={{ justifyContent: 'center' }}
            >
              WhatsApp Web / Mobile App
            </button>
            <button
              type="button"
              className={`comm-btn ${settings.whatsappMode === 'api' ? 'comm-btn-whatsapp' : 'comm-btn-outline'}`}
              onClick={() => setSettings({ ...settings, whatsappMode: 'api' })}
              style={{ justifyContent: 'center' }}
            >
              WhatsApp Business API (Cloud)
            </button>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {settings.whatsappMode === 'web' 
              ? '✅ 100% Free & Universal: 1-click opens WhatsApp Web or your phone app with recipient and message pre-filled.'
              : '⚡ Cloud API: Delivers messages directly via Meta Graph API without opening WhatsApp Web.'
            }
          </span>
        </div>

        {settings.whatsappMode === 'api' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div className="comm-form-group">
              <label className="comm-form-label">Phone Number ID <span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                type="text" 
                className="comm-form-input" 
                value={settings.whatsappApi?.phoneNumberId || ''} 
                onChange={e => setSettings({
                  ...settings,
                  whatsappApi: { ...settings.whatsappApi, phoneNumberId: e.target.value }
                })}
                placeholder="e.g. 104928372615243"
              />
            </div>

            <div className="comm-form-group">
              <label className="comm-form-label">WhatsApp Business Account ID (WABA)</label>
              <input 
                type="text" 
                className="comm-form-input" 
                value={settings.whatsappApi?.businessAccountId || ''} 
                onChange={e => setSettings({
                  ...settings,
                  whatsappApi: { ...settings.whatsappApi, businessAccountId: e.target.value }
                })}
                placeholder="e.g. 192837465019283"
              />
            </div>

            <div className="comm-form-group">
              <label className="comm-form-label">Permanent User / System Access Token <span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                type="password" 
                className="comm-form-input" 
                value={settings.whatsappApi?.accessToken || ''} 
                onChange={e => setSettings({
                  ...settings,
                  whatsappApi: { ...settings.whatsappApi, accessToken: e.target.value }
                })}
                placeholder="EAAGm0PX4ZC94BA..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
              <button 
                type="button"
                className="comm-btn comm-btn-outline" 
                onClick={handleTestWhatsApp}
                disabled={isTestingApi}
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
              >
                <RefreshCw size={14} className={isTestingApi ? 'animate-spin' : ''} />
                {isTestingApi ? 'Testing Connection...' : 'Test Connection'}
              </button>

              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                API Version: <strong>{settings.whatsappApi?.apiVersion || 'v20.0'}</strong>
              </span>
            </div>

            {testResult && (
              <div style={{ 
                padding: '0.65rem', 
                borderRadius: '8px', 
                fontSize: '0.78rem',
                background: testResult.success ? '#ecfdf5' : '#fef2f2',
                color: testResult.success ? '#047857' : '#b91c1c',
                border: `1px solid ${testResult.success ? '#a7f3d0' : '#fecaca'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {testResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Email & UPI Configuration */}
      <div className="comm-card-section">
        <div className="comm-card-header-row">
          <div className="comm-modal-icon-badge" style={{ background: '#fef2f2', color: '#ea4335' }}>
            <Mail size={20} />
          </div>
          <div>
            <h3 className="comm-card-title">Email & UPI Payment Settings</h3>
            <div className="comm-card-desc">Configure Gmail integration and UPI payment deep-links</div>
          </div>
        </div>

        <div className="comm-form-group">
          <label className="comm-form-label">Email Dispatch Method</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              type="button"
              className={`comm-btn ${settings.emailMode === 'gmail' ? 'comm-btn-email' : 'comm-btn-outline'}`}
              onClick={() => setSettings({ ...settings, emailMode: 'gmail' })}
              style={{ justifyContent: 'center' }}
            >
              Gmail Web Compose
            </button>
            <button
              type="button"
              className={`comm-btn ${settings.emailMode === 'mailto' ? 'comm-btn-primary' : 'comm-btn-outline'}`}
              onClick={() => setSettings({ ...settings, emailMode: 'mailto' })}
              style={{ justifyContent: 'center' }}
            >
              Default Client (Outlook/Mail)
            </button>
          </div>
        </div>

        <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <CreditCard size={18} color="#6366f1" />
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>UPI Quick Payment Defaults</h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="comm-form-group">
              <label className="comm-form-label">Business UPI ID (VPA)</label>
              <input 
                type="text" 
                className="comm-form-input" 
                value={settings.upi?.vpa || ''} 
                onChange={e => setSettings({
                  ...settings,
                  upi: { ...settings.upi, vpa: e.target.value }
                })}
                placeholder="e.g. yourname@okhdfcbank"
              />
            </div>
            <div className="comm-form-group">
              <label className="comm-form-label">Payee Business Name</label>
              <input 
                type="text" 
                className="comm-form-input" 
                value={settings.upi?.payeeName || ''} 
                onChange={e => setSettings({
                  ...settings,
                  upi: { ...settings.upi, payeeName: e.target.value }
                })}
                placeholder="e.g. My Company Private Limited"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Customizable Message Templates (Full Width) */}
      <div className="comm-card-section" style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="comm-card-header-row" style={{ border: 'none', padding: 0 }}>
            <div className="comm-modal-icon-badge" style={{ background: '#e0e7ff', color: '#6366f1' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="comm-card-title">Message Templates Customizer</h3>
              <div className="comm-card-desc">Personalize message text with dynamic customer and invoice tags</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="comm-btn comm-btn-outline" onClick={handleResetTemplates}>
              <RotateCcw size={14} /> Reset Defaults
            </button>
            <button type="button" className="comm-btn comm-btn-primary" onClick={handleSave}>
              <Save size={16} /> Save All Settings
            </button>
          </div>
        </div>

        {/* Template Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginTop: '0.5rem' }}>
          <button 
            type="button" 
            className={`comm-pill ${activeTemplateTab === 'invoice' ? 'active' : ''}`}
            onClick={() => setActiveTemplateTab('invoice')}
          >
            📄 Invoices
          </button>
          <button 
            type="button" 
            className={`comm-pill ${activeTemplateTab === 'paymentReceipt' ? 'active' : ''}`}
            onClick={() => setActiveTemplateTab('paymentReceipt')}
          >
            🧾 Payment Receipts
          </button>
          <button 
            type="button" 
            className={`comm-pill ${activeTemplateTab === 'quotation' ? 'active' : ''}`}
            onClick={() => setActiveTemplateTab('quotation')}
          >
            💼 Quotations & Offers
          </button>
          <button 
            type="button" 
            className={`comm-pill ${activeTemplateTab === 'reminderGentle' ? 'active' : ''}`}
            onClick={() => setActiveTemplateTab('reminderGentle')}
          >
            🔔 Gentle Reminder
          </button>
          <button 
            type="button" 
            className={`comm-pill ${activeTemplateTab === 'reminderUrgent' ? 'active' : ''}`}
            onClick={() => setActiveTemplateTab('reminderUrgent')}
          >
            ⚠️ Urgent Overdue Notice
          </button>
        </div>

        {/* Dynamic Variable Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', padding: '0.5rem 0' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Click to Insert Tag:</span>
          {variableChips.map(chip => (
            <span 
              key={chip} 
              className="comm-chip-tag" 
              onClick={() => insertVariableChip(chip)}
              title={`Click to insert ${chip}`}
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="comm-form-group">
          <textarea
            className="comm-form-textarea"
            rows={8}
            value={settings.templates?.[activeTemplateTab] || ''}
            onChange={e => setSettings({
              ...settings,
              templates: {
                ...settings.templates,
                [activeTemplateTab]: e.target.value
              }
            })}
            style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
          />
        </div>

        {saveSuccess && (
          <div style={{ padding: '0.75rem 1rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#047857', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Check size={18} />
            <span>Communication settings and message templates saved successfully!</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunicationSettings;

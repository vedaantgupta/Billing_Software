import { getDB, getItems, addItem } from '@/utils/db';

const SETTINGS_KEY = 'comm_hub_settings';
const DEFAULT_UPI_VPA = 'merchant@upi';
const DEFAULT_PAYEE_NAME = 'BaniyaBook Business';

/**
 * Default customizable templates with variables:
 * {customerName}, {docType}, {invoiceNumber}, {amount}, {date}, {dueDate},
 * {balance}, {position}, {businessName}, {upiLink}, {receiptNumber}, {paymentType},
 * {validUntil}, {notes}
 */
export const DEFAULT_TEMPLATES = {
  invoice: `📄 *INVOICE FROM {businessName}*
Hello *{customerName}*,

Here are your invoice details:
• *Document:* {docType}
• *Invoice #:* {invoiceNumber}
• *Date:* {date}
• *Total Amount:* ₹{amount}
• *Due Date:* {dueDate}

💳 *Quick UPI Payment Link:*
{upiLink}

Thank you for choosing us! Please let us know if you have any questions.`,

  paymentReceipt: `🧾 *PAYMENT RECEIPT - {businessName}*
Dear *{customerName}*,

We have successfully received your payment:
• *Receipt No:* {receiptNumber}
• *Date:* {date}
• *Amount Received:* ₹{amount}
• *Payment Mode:* {paymentType}
{balanceNote}

Thank you for your prompt payment!`,

  quotation: `💼 *QUOTATION / ESTIMATE FROM {businessName}*
Hello *{customerName}*,

We are pleased to share our quotation with you:
• *Estimate #:* {invoiceNumber}
• *Date:* {date}
• *Valid Until:* {validUntil}
• *Estimated Total:* ₹{amount}

Please review the proposal. We look forward to confirming your order!
Best regards,
*{businessName}*`,

  reminderGentle: `🔔 *FRIENDLY PAYMENT REMINDER*
Namaste *{customerName}*,

This is a gentle reminder from *{businessName}* regarding your pending account balance:
• *Outstanding Amount:* ₹{balance} ({position})
• *Statement Date:* {date}

Kindly make the payment at your earliest convenience.
💳 *Instant UPI Payment:*
{upiLink}

If payment has already been initiated, please ignore this notice. Thank you!`,

  reminderUrgent: `⚠️ *PAYMENT OVERDUE NOTICE - ACTION REQUIRED*
Dear *{customerName}*,

Your account with *{businessName}* has an overdue balance:
• *Pending Amount:* ₹{balance} ({position})
• *Status:* Urgent Follow-up

Kindly settle this pending balance today to maintain an active credit terms account.
💳 *Instant Settlement Link:*
{upiLink}

Please confirm receipt and share the transaction ID once transferred.
Thank you,
*{businessName}*`
};

/**
 * Retrieve communication hub settings for the user
 */
export const getCommunicationSettings = (userId = 'default') => {
  try {
    const raw = localStorage.getItem(`${SETTINGS_KEY}_${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to load communication settings:', err);
  }

  return {
    whatsappMode: 'web', // 'web' or 'api'
    emailMode: 'gmail',  // 'gmail' or 'mailto' or 'api'
    whatsappApi: {
      phoneNumberId: '',
      accessToken: '',
      businessAccountId: '',
      apiVersion: 'v20.0',
    },
    emailApi: {
      endpoint: '',
      apiKey: '',
      senderEmail: '',
    },
    upi: {
      vpa: DEFAULT_UPI_VPA,
      payeeName: DEFAULT_PAYEE_NAME,
    },
    templates: { ...DEFAULT_TEMPLATES }
  };
};

/**
 * Save communication hub settings
 */
export const saveCommunicationSettings = (userId = 'default', settings) => {
  try {
    localStorage.setItem(`${SETTINGS_KEY}_${userId}`, JSON.stringify(settings));
    return true;
  } catch (err) {
    console.error('Failed to save communication settings:', err);
    return false;
  }
};

/**
 * Format phone numbers into standard international format for WhatsApp
 * Defaults to +91 (India) if 10 digits without country code.
 */
export const cleanPhoneNumber = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  return digits;
};

/**
 * Generate UPI deep-link for mobile payment
 */
export const generateUPILink = (amount, businessName = 'Business', vpa = DEFAULT_UPI_VPA) => {
  const numericAmount = Number(amount) || 0;
  const cleanVpa = vpa || DEFAULT_UPI_VPA;
  const cleanName = encodeURIComponent(businessName || DEFAULT_PAYEE_NAME);
  return `upi://pay?pa=${cleanVpa}&pn=${cleanName}&am=${numericAmount.toFixed(2)}&cu=INR`;
};

/**
 * Interpolate template variables
 */
export const renderTemplate = (templateString, data = {}) => {
  if (!templateString) return '';
  let output = templateString;

  const replacements = {
    '{customerName}': data.customerName || data.name || 'Valued Customer',
    '{docType}': data.docType || 'Document',
    '{invoiceNumber}': data.invoiceNumber || data.fullReceiptNo || data.id || 'N/A',
    '{receiptNumber}': data.fullReceiptNo || data.receiptNumber || data.invoiceNumber || 'N/A',
    '{amount}': Number(data.amount ?? data.total ?? data.balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    '{date}': data.date || new Date().toISOString().split('T')[0],
    '{dueDate}': data.dueDate || data.date || 'Immediate',
    '{validUntil}': data.validUntil || 'Within 15 Days',
    '{balance}': Number(data.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    '{position}': data.position || 'Dr',
    '{paymentType}': data.paymentType || 'Cash / Bank Transfer',
    '{businessName}': data.businessName || 'Our Business',
    '{upiLink}': data.upiLink || generateUPILink(data.amount ?? data.total ?? data.balance ?? 0, data.businessName, data.upiVpa),
    '{balanceNote}': data.remainingBalance && data.remainingBalance > 0
      ? `• *Remaining Balance:* ₹${Number(data.remainingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      : '• *Account Status:* Cleared & Updated',
    '{notes}': data.remarks || data.notes || ''
  };

  Object.entries(replacements).forEach(([tag, val]) => {
    output = output.split(tag).join(val);
  });

  return output;
};

/**
 * Generate WhatsApp Web URL or wa.me deep-link
 */
export const getWhatsAppUrl = (phone, text) => {
  const clean = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(text || '');
  if (clean) {
    return `https://wa.me/${clean}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
};

/**
 * Generate Gmail Web Compose URL or mailto
 */
export const getEmailUrl = (email, subject, body, mode = 'gmail') => {
  const cleanEmail = email ? email.trim() : '';
  const encSubject = encodeURIComponent(subject || '');
  const encBody = encodeURIComponent(body || '');

  if (mode === 'gmail') {
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(cleanEmail)}&su=${encSubject}&body=${encBody}`;
  }
  return `mailto:${cleanEmail}?subject=${encSubject}&body=${encBody}`;
};

/**
 * Send WhatsApp Message via Meta Cloud Business API
 */
export const sendWhatsAppViaBusinessAPI = async (config, phone, messageText) => {
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone) {
    throw new Error('Recipient phone number is missing or invalid.');
  }

  if (!config?.phoneNumberId || !config?.accessToken) {
    throw new Error('WhatsApp Business API credentials (Phone Number ID and Access Token) are not configured.');
  }

  const endpoint = `https://graph.facebook.com/${config.apiVersion || 'v20.0'}/${config.phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
    type: 'text',
    text: {
      preview_url: true,
      body: messageText
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errMsg = `Meta WhatsApp API error (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson?.error?.message) {
        errMsg = errJson.error.message;
      }
    } catch {
      // fallback
    }
    throw new Error(errMsg);
  }

  return await response.json();
};

/**
 * Test WhatsApp Business API Connection
 */
export const testWhatsAppApiConnection = async (config) => {
  if (!config?.phoneNumberId || !config?.accessToken) {
    return { success: false, message: 'Please provide both Phone Number ID and Access Token.' };
  }

  try {
    const endpoint = `https://graph.facebook.com/${config.apiVersion || 'v20.0'}/${config.phoneNumberId}`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      return { 
        success: true, 
        message: `Connected successfully! Display Phone: ${data.display_phone_number || data.id}, Verified Name: ${data.verified_name || 'Standard'}` 
      };
    } else {
      const errData = await res.json();
      return { 
        success: false, 
        message: errData?.error?.message || `Failed with status ${res.status}` 
      };
    }
  } catch (err) {
    return { success: false, message: err.message || 'Network error while testing WhatsApp API connection.' };
  }
};

/**
 * Log communication event to communication_logs collection
 */
export const logCommunicationEvent = async (userId, logData) => {
  if (!userId) return null;

  const entry = {
    id: Date.now().toString(),
    channel: logData.channel || 'whatsapp', // 'whatsapp' | 'email'
    mode: logData.mode || 'WhatsApp Web',
    docType: logData.docType || 'Document',
    docId: logData.docId || '',
    docNumber: logData.docNumber || 'N/A',
    recipientName: logData.recipientName || 'Customer',
    recipientTarget: logData.recipientTarget || '',
    amount: Number(logData.amount || 0),
    status: logData.status || 'Sent',
    messagePreview: (logData.messageText || '').slice(0, 200),
    createdAt: new Date().toISOString(),
    timestampFormatted: new Date().toLocaleString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  };

  try {
    await addItem('communication_logs', entry, userId, 'Communication Hub');
  } catch (err) {
    console.error('Failed to log communication event:', err);
    // Local fallback
    try {
      const localLogs = JSON.parse(localStorage.getItem(`comm_logs_${userId}`) || '[]');
      localLogs.unshift(entry);
      localStorage.setItem(`comm_logs_${userId}`, JSON.stringify(localLogs.slice(0, 200)));
    } catch {
      // ignore
    }
  }

  return entry;
};

/**
 * Fetch communication activity logs
 */
export const getCommunicationLogs = async (userId) => {
  if (!userId) return [];
  try {
    const logs = await getItems('communication_logs', userId);
    if (logs && logs.length > 0) {
      return logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  } catch (err) {
    console.warn('Could not fetch remote communication logs, reading local cache:', err);
  }

  try {
    const local = JSON.parse(localStorage.getItem(`comm_logs_${userId}`) || '[]');
    return local;
  } catch {
    return [];
  }
};

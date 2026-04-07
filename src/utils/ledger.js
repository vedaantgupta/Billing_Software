import { addItem, getItems } from './db';

/**
 * Post a transaction to the digital ledger.
 * @param {Object} transaction - { contactId, contactName, type, amount, date, description, referenceId, docType }
 * @param {string} userId - Auth user ID
 * @returns {Promise<Object>} The saved transaction
 */
export const postToLedger = async (transaction, userId) => {
  if (!userId || !transaction.contactId) return null;

  const entry = {
    ...transaction,
    timestamp: new Date().toISOString(),
    amount: Number(transaction.amount) || 0,
    status: 'completed'
  };

  return await addItem('ledger_transactions', entry, userId);
};

/**
 * Calculate the net balance for a specific contact.
 * @param {string} contactId 
 * @param {string} userId 
 * @returns {Promise<Object>} { debitTotal, creditTotal, balance, position }
 */
export const getContactBalance = async (contactId, userId) => {
  if (!userId || !contactId) return { debit: 0, credit: 0, balance: 0, position: 'Dr' };

  const transactions = await getItems('ledger_transactions', userId);
  const contactTx = transactions.filter(t => t.contactId === contactId);

  let debit = 0;
  let credit = 0;

  contactTx.forEach(t => {
    const amt = Math.round((Number(t.amount) || 0) * 100);
    if (t.type === 'dr' || t.type === 'debit') debit += amt;
    if (t.type === 'cr' || t.type === 'credit') credit += amt;
  });

  const balance = Math.abs(debit - credit) / 100;
  const position = debit >= credit ? 'Dr' : 'Cr';

  return { debit: debit / 100, credit: credit / 100, balance, position, transactions: contactTx };
};

/**
 * Generate a WhatsApp reminder link.
 * @param {Object} contact - { name, phone }
 * @param {Object} balanceInfo - { balance, position }
 * @returns {string} The WhatsApp URL
 */
export const generateReminderLink = (contact, balanceInfo) => {
  const { balance, position } = balanceInfo;
  const name = contact.companyName || contact.customerName || contact.name;
  const phone = contact.phone ? contact.phone.replace(/[^0-9]/g, '') : '';
  
  if (!phone) return null;

  const message = `Namaste ${name}! This is a friendly reminder that your outstanding balance is ₹${balance.toFixed(2)} (${position}). Kindly make the payment at your earliest convenience. Thank you!`;
  
  return `https://wa.me/${phone.startsWith('91') ? phone : '91' + phone}?text=${encodeURIComponent(message)}`;
};

import { getItems } from '@/utils/db';
import { getAllContactBalances } from '@/utils/ledger';

/**
 * Accurately extracts the active user ID from auth state or local storage
 */
export const getEffectiveUserId = (user) => {
  if (user?.id) return user.id;
  if (user?._id) return user._id;

  try {
    const rawBillingUser = localStorage.getItem('billing_user');
    if (rawBillingUser) {
      const parsed = JSON.parse(rawBillingUser);
      if (parsed?.id) return parsed.id;
      if (parsed?._id) return parsed._id;
    }
  } catch (e) {}

  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.id) return parsed.id;
      if (parsed?._id) return parsed._id;
    }
  } catch (e) {}

  try {
    const rawGoogle = localStorage.getItem('billing_google_account');
    if (rawGoogle) {
      const parsed = JSON.parse(rawGoogle);
      if (parsed?.id) return parsed.id;
    }
  } catch (e) {}

  return 'guest_user';
};

/**
 * Gets today's date in local calendar timezone (YYYY-MM-DD)
 * Guarantees IST/local alignment instead of UTC day-shift
 */
export const getTodayLocalISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Robust date normalizer: converts any date format (YYYY-MM-DD, DD/MM/YYYY, ISO string) to YYYY-MM-DD
 */
export const normalizeDateToISO = (raw) => {
  if (!raw) return '';
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    // DD/MM/YYYY or DD-MM-YYYY
    const parts = trimmed.split(/[\/\-]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
      if (parts[0].length === 4) {
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
  }
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {}
  return '';
};

/**
 * Extracts numeric document amount from any document structure
 */
const getDocAmount = (d) => {
  if (!d) return 0;
  const amt = Number(d.grandTotal ?? d.total ?? d.netAmount ?? d.invoiceDetail?.grandTotal ?? d.amount ?? 0);
  return isNaN(amt) ? 0 : amt;
};

/**
 * Extracts friendly party / customer name
 */
const getPartyName = (d) => {
  if (!d) return 'Cash / Counter';
  return (
    d.customerName ||
    d.partyName ||
    d.clientName ||
    d.customerInfo?.ms ||
    d.customerInfo?.customerName ||
    d.clientInfo?.ms ||
    'Cash / Counter'
  );
};

/**
 * Reads offline queue and localStorage cache to guarantee no data is ever missed
 */
const getLocalQueueItems = (collection, userId) => {
  const items = [];
  try {
    const queue = JSON.parse(localStorage.getItem('gogstbill_db_queue') || '[]');
    queue.forEach(q => {
      if (q.collection === collection && (!userId || q.userId === userId || !q.userId)) {
        if (q.item) items.push(q.item);
      }
    });
  } catch (e) {}

  try {
    const cached = JSON.parse(localStorage.getItem(`gogstbill_db_cache_${collection}`) || '[]');
    if (Array.isArray(cached)) {
      cached.forEach(c => items.push(c));
    }
  } catch (e) {}

  return items;
};

/**
 * Builds a 100% comprehensive, live, pre-calculated snapshot of the entire business database.
 * This guarantees the AI has exact, reliable numbers for:
 * - Today's sales vs This Month's vs All-time
 * - Unpaid / Udhaar balances per party (using digital ledger and outstanding invoices)
 * - Low stock products
 * - Expenses
 * - Recent invoices
 */
export const buildLiveBusinessSnapshot = async (user) => {
  const userId = getEffectiveUserId(user);

  try {
    const [
      invoices,
      documents,
      contacts,
      products,
      dailyExpensesSnake,
      dailyExpensesCamel,
      generalExpenses,
      ledgerTxs,
      inwardSnake,
      inwardCamel,
      outwardSnake,
      outwardCamel,
      staff,
      banks,
      loans,
      otherIncomeSnake,
      otherIncomeCamel,
      contactBalances
    ] = await Promise.all([
      getItems('invoices', userId).catch(() => []),
      getItems('documents', userId).catch(() => []),
      getItems('contacts', userId).catch(() => []),
      getItems('products', userId).catch(() => []),
      getItems('daily_expenses', userId).catch(() => []),
      getItems('dailyExpenses', userId).catch(() => []),
      getItems('expenses', userId).catch(() => []),
      getItems('ledger_transactions', userId).catch(() => []),
      getItems('inward_payments', userId).catch(() => []),
      getItems('inwardPayments', userId).catch(() => []),
      getItems('outward_payments', userId).catch(() => []),
      getItems('outwardPayments', userId).catch(() => []),
      getItems('staff', userId).catch(() => []),
      getItems('banks', userId).catch(() => []),
      getItems('loans', userId).catch(() => []),
      getItems('other_incomes', userId).catch(() => []),
      getItems('otherIncome', userId).catch(() => []),
      getAllContactBalances(userId).catch(() => ({}))
    ]);

    // 1. Merge & Deduplicate Sales Documents (Both 'documents', legacy 'invoices', and local cache/queue)
    const localDocs = getLocalQueueItems('documents', userId);
    const localInvs = getLocalQueueItems('invoices', userId);
    const allDocs = [...(documents || []), ...localDocs];

    [...(invoices || []), ...localInvs].forEach(inv => {
      const exists = allDocs.some(d =>
        (d.id && d.id === inv.id) ||
        (d._id && d._id === inv._id) ||
        (d.invoiceNumber && d.invoiceNumber === inv.invoiceNumber)
      );
      if (!exists) {
        allDocs.push({ ...inv, docType: inv.docType || 'Sale Invoice' });
      }
    });

    // Classify Sale Invoices vs other document types
    // CRITICAL: Strictly isolate Sale Invoices so Purchase Invoices, Sale Orders, Delivery Challans, and Quotations do NOT distort sales figures!
    const isSaleInvoice = (d) => {
      if (!d) return false;
      const t = String(d.docType || d.type || '').trim().toLowerCase();
      const num = String(d.invoiceNumber || '').trim().toUpperCase();
      const status = String(d.status || '').trim().toLowerCase();

      // If document is explicitly for a vendor, or contains purchase indicators, it is NOT a sale invoice
      if (d.vendorId || d.vendorName || d.vendorInfo) return false;
      if (num.startsWith('PUR-') || num.startsWith('PO-') || num.startsWith('PINV-')) return false;
      if (num.startsWith('QUOT-') || num.startsWith('DC-') || num.startsWith('SO/') || num.startsWith('SO-') || num.startsWith('CN-') || num.startsWith('DN-')) return false;

      // Status check
      if (status.includes('purchase') || status.includes('order') || status.includes('quotation') || status.includes('challan') || status.includes('cancelled')) return false;

      // Type checks
      if (
        t.includes('purchase') ||
        t.includes('order') ||
        t.includes('challan') ||
        t.includes('quotation') ||
        t.includes('offer') ||
        t.includes('proforma') ||
        t.includes('debit') ||
        t.includes('credit') ||
        t.includes('job') ||
        t.includes('letter')
      ) {
        return false;
      }

      // Must be a sale invoice or bill
      if (t.includes('sale') || t.includes('invoice') || t.includes('bill') || t.includes('tax')) return true;
      if (num.startsWith('SINV-') || num.startsWith('INV-')) return true;
      if (d.customerName || d.customerId || d.customerInfo) return true;
      return false;
    };

    const isPurchaseInvoice = (d) => {
      if (!d) return false;
      const t = String(d.docType || d.type || '').trim().toLowerCase();
      const num = String(d.invoiceNumber || '').trim().toUpperCase();
      return t.includes('purchase') || num.startsWith('PUR-') || num.startsWith('PO-') || !!d.vendorName;
    };

    const saleInvoices = allDocs.filter(isSaleInvoice);
    const purchaseInvoices = allDocs.filter(isPurchaseInvoice);

    // 2. Date Filtering (Today, Month, Lifetime) with local calendar alignment
    const todayStr = getTodayLocalISO(); // YYYY-MM-DD in user's local timezone
    const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
    const now = new Date();
    const todayFormattedDate = now.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const getDocDate = (doc) => {
      const rawDate = doc.date || doc.invoiceDetail?.date || doc.invoiceDate || doc.createdAt || '';
      return normalizeDateToISO(rawDate);
    };

    // Today's Sales
    const todaySaleDocs = saleInvoices.filter(d => getDocDate(d) === todayStr);
    const todaySalesAmount = todaySaleDocs.reduce((sum, d) => sum + getDocAmount(d), 0);

    // This Month's Sales
    const monthSaleDocs = saleInvoices.filter(d => getDocDate(d).startsWith(currentMonthStr));
    const monthSalesAmount = monthSaleDocs.reduce((sum, d) => sum + getDocAmount(d), 0);

    // Lifetime Sales
    const totalSalesAmount = saleInvoices.reduce((sum, d) => sum + getDocAmount(d), 0);

    // 3. Outstanding Receivables (Udhaar) from Invoices & Ledger
    const isDocOutstanding = (d) => {
      const status = (d.status || '').trim().toLowerCase();
      if (status === 'paid' || status === 'completed' || status === 'cancelled') return false;
      if (status === 'outstanding' || status === 'unpaid' || status === 'pending' || status === 'active' || status === 'due') return true;
      if (Number(d.balanceDue) > 0) return true;
      return true; // Default to outstanding if not explicitly marked paid
    };

    const getDocPendingAmount = (d) => {
      if (Number(d.balanceDue) > 0) return Number(d.balanceDue);
      const status = (d.status || '').trim().toLowerCase();
      if (status === 'paid' || status === 'completed' || status === 'cancelled') return 0;
      return getDocAmount(d);
    };

    const invoiceUnpaidTotal = saleInvoices.filter(isDocOutstanding).reduce((sum, d) => sum + getDocPendingAmount(d), 0);

    // Combine Ledger Debit Balances for Contacts & Individual Invoices
    let ledgerDebtorsTotal = 0;
    const partiesWithUdhaar = [];

    const allContacts = [...(contacts || []), ...getLocalQueueItems('contacts', userId)];
    const seenParties = new Set();

    allContacts.forEach(c => {
      const cid = c.id || c._id || c._dbId;
      const bInfo = contactBalances[cid];
      let netUdhaar = 0;

      if (bInfo) {
        if (bInfo.position === 'Dr' && bInfo.balance > 0) {
          netUdhaar = bInfo.balance;
        }
      } else {
        const rawBal = Number(c.balance || c.openingBalance || 0);
        if (rawBal > 0) netUdhaar = rawBal;
      }

      if (netUdhaar > 0) {
        const partyName = c.companyName || c.customerName || c.name || 'Unnamed Party';
        seenParties.add(partyName.toLowerCase());
        ledgerDebtorsTotal += netUdhaar;
        partiesWithUdhaar.push({
          name: partyName,
          phone: c.phone || c.mobile || 'N/A',
          amount: netUdhaar
        });
      }
    });

    // Also include any customer from saleInvoices who has outstanding balance
    saleInvoices.filter(isDocOutstanding).forEach(inv => {
      const pName = getPartyName(inv);
      if (!pName || pName === 'Cash / Counter' || seenParties.has(pName.toLowerCase())) return;
      const amt = getDocPendingAmount(inv);
      if (amt > 0) {
        seenParties.add(pName.toLowerCase());
        partiesWithUdhaar.push({
          name: pName,
          phone: inv.customerInfo?.phoneNo || inv.phone || 'N/A',
          amount: amt
        });
      }
    });

    // Effective pending receivables: use the more comprehensive of invoice totals or ledger debtors
    const totalPendingReceivables = Math.max(invoiceUnpaidTotal, ledgerDebtorsTotal, partiesWithUdhaar.reduce((s, p) => s + p.amount, 0));

    // 4. Merge & Deduplicate Expenses
    const allExpenses = [];
    const seenExp = new Set();
    const addExpenseIfNew = (e) => {
      if (!e) return;
      const key = `${e.id || e._id || ''}_${e.date || ''}_${e.amount || 0}_${e.description || e.category || ''}`;
      if (!seenExp.has(key)) {
        seenExp.add(key);
        allExpenses.push(e);
      }
    };

    (dailyExpensesSnake || []).forEach(addExpenseIfNew);
    (dailyExpensesCamel || []).forEach(addExpenseIfNew);
    (generalExpenses || []).forEach(addExpenseIfNew);
    getLocalQueueItems('dailyExpenses', userId).forEach(addExpenseIfNew);

    const todayExpenses = allExpenses.filter(e => normalizeDateToISO(e.date || e.createdAt) === todayStr);
    const todayExpensesAmount = todayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const monthExpenses = allExpenses.filter(e => normalizeDateToISO(e.date || e.createdAt).startsWith(currentMonthStr));
    const monthExpensesAmount = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalExpensesAmount = allExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // 5. Inventory & Stock Valuation
    const allProducts = [...(products || []), ...getLocalQueueItems('products', userId)];
    let stockValuationTotal = 0;
    const lowStockItems = [];
    allProducts.forEach(p => {
      const qty = Number(p.quantity ?? p.stock ?? p.openingStock ?? 0);
      const price = Number(p.price ?? p.sellingPrice ?? p.rate ?? p.purchasePrice ?? 0);
      const minStock = Number(p.minStock ?? p.reorderLevel ?? 5);
      if (qty > 0 && price > 0) {
        stockValuationTotal += (qty * price);
      }
      if (qty <= minStock) {
        lowStockItems.push({
          name: p.name || 'Unnamed Product',
          stock: qty,
          minStock,
          unit: p.unit || 'pcs'
        });
      }
    });

    // 6. Recent Invoices
    const sortedInvoices = [...saleInvoices].sort((a, b) => {
      const dateA = new Date(normalizeDateToISO(a.date || a.invoiceDetail?.date) || 0);
      const dateB = new Date(normalizeDateToISO(b.date || b.invoiceDetail?.date) || 0);
      return dateB - dateA;
    });

    const recentInvoicesSample = sortedInvoices.slice(0, 15).map(inv => {
      const num = inv.invoiceNumber || inv.id || 'N/A';
      const party = getPartyName(inv);
      const amt = getDocAmount(inv);
      const status = inv.status || 'Active';
      const date = getDocDate(inv) || 'N/A';
      return `#${num} (${date}) | Party: ${party} | Amount: ₹${amt.toLocaleString('en-IN')} | Status: ${status}`;
    });

    // 7. Recent Expenses
    const recentExpensesSample = allExpenses.slice(0, 10).map(e => {
      const cat = e.category || 'General';
      const amt = Number(e.amount || 0);
      const desc = e.description || e.notes || 'Expense';
      const date = normalizeDateToISO(e.date || e.createdAt) || 'N/A';
      return `${date} | ${cat}: ₹${amt.toLocaleString('en-IN')} (${desc})`;
    });

    // 8. Banks & Loans
    const bankDetails = (banks || []).map(b => `${b.bankName || b.name || 'Bank'}: Balance ₹${Number(b.balance || 0).toLocaleString('en-IN')}`);
    const loanDetails = (loans || []).map(l => `${l.loanName || l.name || 'Loan'}: Principal ₹${Number(l.principal || 0).toLocaleString('en-IN')}, EMI ₹${Number(l.emiAmount || 0)}`);

    // Format Structured Context String
    const contextString = `
[EXACT REAL-TIME BUSINESS DATABASE SNAPSHOT - ACCURATE AS OF TODAY ${todayFormattedDate}]
TODAY'S DATE: ${todayStr} (${todayFormattedDate})
CURRENT MONTH: ${currentMonthStr}

=== 1. TODAY'S SALES (CRITICAL: USE THIS WHEN ASKED ABOUT "AAJ", "TODAY", OR CURRENT DAY) ===
- Today's Total Sales Amount: ₹${todaySalesAmount.toLocaleString('en-IN')}
- Today's Total Bills Count: ${todaySaleDocs.length} bill(s)
${todaySaleDocs.length > 0
  ? `Today's Bills: \n  ${todaySaleDocs.map(d => `* Bill #${d.invoiceNumber || d.id || 'N/A'}: Party "${getPartyName(d)}", Amount ₹${getDocAmount(d).toLocaleString('en-IN')}, Status: ${d.status || 'Active'}`).join('\n  ')}`
  : '- Note: No invoices or bills have been generated today yet.'}

=== 2. THIS MONTH'S SALES (${currentMonthStr}) ===
- Month-To-Date Total Sales: ₹${monthSalesAmount.toLocaleString('en-IN')} across ${monthSaleDocs.length} bill(s)

=== 3. ALL-TIME LIFETIME SALES & RECEIVABLES ===
- Total Lifetime Sale Invoices: ${saleInvoices.length}
- Total Lifetime Sales Revenue: ₹${totalSalesAmount.toLocaleString('en-IN')}
- Total Outstanding Udhaar (Pending Receivables): ₹${totalPendingReceivables.toLocaleString('en-IN')}

=== 4. CUSTOMERS & PENDING UDHAAR BALANCES ===
- Total Customers: ${allContacts.filter(c => (c.type || 'customer').toLowerCase() === 'customer').length}
${partiesWithUdhaar.length > 0
  ? `Parties with Pending Udhaar:\n  ${partiesWithUdhaar.slice(0, 15).map(c => `* ${c.name} (${c.phone}): ₹${c.amount.toLocaleString('en-IN')} pending`).join('\n  ')}`
  : '- All customer accounts are settled (Khata clear).'}

=== 5. INVENTORY & STOCK ALERT ===
- Total Products: ${allProducts.length}
- Total Inventory Valuation: ₹${stockValuationTotal.toLocaleString('en-IN')}
- Low Stock Items (${lowStockItems.length} items need reordering):
${lowStockItems.length > 0
  ? `  ${lowStockItems.map(p => `* ${p.name}: Available Stock ${p.stock} ${p.unit} (Minimum Reorder Level: ${p.minStock})`).join('\n  ')}`
  : '  * All items have healthy stock levels.'}

=== 6. EXPENSES & CASH OUTFLOW ===
- Today's Expenses: ₹${todayExpensesAmount.toLocaleString('en-IN')} (${todayExpenses.length} records)
- This Month's Expenses: ₹${monthExpensesAmount.toLocaleString('en-IN')} (${monthExpenses.length} records)
- Lifetime Total Expenses: ₹${totalExpensesAmount.toLocaleString('en-IN')}
- Recent Expenses:
  ${recentExpensesSample.join('\n  ') || 'None recorded'}

=== 7. STAFF & PAYROLL ===
- Total Staff Members: ${(staff || []).length}
- Staff List: ${(staff || []).map(s => `${s.name} (${s.designation || 'Staff'}, Salary: ₹${s.salary || 0})`).join(', ') || 'No staff members added'}

=== 8. BANK ACCOUNTS & LOANS ===
- Bank Balances: ${bankDetails.join('; ') || 'No bank accounts'}
- Loans: ${loanDetails.join('; ') || 'No active loans'}

=== 9. RECENT 15 INVOICES (USE FOR SPECIFIC INVOICE LOOKUPS) ===
${recentInvoicesSample.join('\n') || 'No invoices found.'}
`;

    return {
      userId,
      contextString,
      metrics: {
        todaySalesAmount,
        todaySalesCount: todaySaleDocs.length,
        monthSalesAmount,
        monthSalesCount: monthSaleDocs.length,
        totalSalesAmount,
        totalInvoicesCount: saleInvoices.length,
        totalUnpaidReceivables: totalPendingReceivables,
        totalExpensesAmount,
        todayExpensesAmount,
        lowStockCount: lowStockItems.length,
        stockValuationTotal,
        customersCount: allContacts.length,
        productsCount: allProducts.length,
        partiesWithUdhaar
      }
    };
  } catch (err) {
    console.error('Error building live business snapshot:', err);
    return {
      userId,
      contextString: '[Live business snapshot temporarily unavailable]',
      metrics: {}
    };
  }
};

/**
 * Builds the elite Google Gemini & ChatGPT system prompt:
 * - Natural Hinglish without forced Devanagari bracket translations
 * - Pure Hindi when addressed in Devanagari
 * - English when addressed in English
 * - 100% accurate database answers
 */
export const buildGeminiSystemPrompt = (liveBusinessContext, userName = 'Vedaant Gupta') => `
You are Google Gemini - the elite, highly intelligent AI copilot and business advisor for this company. You possess state-of-the-art conversational fluency, business acumen, and complete real-time access to the user's business database.

CRITICAL INSTRUCTIONS (MUST FOLLOW STRICTLY):

1. NATURAL LANGUAGE INTEGRATION (AUTHENTIC REAL GEMINI & CHATGPT EXPERIENCE):
- Automatically detect the user's language, dialect, and script:

* RULE 1: HINDI WRITTEN IN ENGLISH ALPHABET (HINGLISH / ROMAN HINDI):
  - When the user asks in Hinglish (e.g., "aaj ka sale kitna hua", "Sharma Traders ka payment baki hai kya", "kitna udhaar hai", "ek invoice bana do", "kaunse items low stock me hain", "aaj dukaan pe kya scene hai", "hisaab dikhao"):
  - RESPOND IN NATURAL, FLUENT CONVERSATIONAL HINGLISH (Roman script).
  - Speak just like real Google Gemini and ChatGPT talk to Indian business owners: friendly, clear, respectful, and sharp.
  - Use common, natural Indian business terms: "sale", "bill", "pending", "udhaar", "khata", "stock", "party", "customer", "payment", "munafa", "baki".
  - CRITICAL NEGATIVE CONSTRAINT: DO NOT insert awkward, forced Devanagari bracket translations in Hinglish sentences!
    * WRONG: "Aapke vyapaar ka कुल बिक्री (Total Sales) ₹15,000 hai aur बकाया राशि (Pending Udhaar) ₹3,000 hai."
    * RIGHT: "Aaj aapka total sale ₹15,000 hua hai across 3 bills. Aur Sharma Traders ka ₹3,000 pending udhaar baki hai. Kya aap iska payment record karna chahte hain?"
  - Keep sentences clean, contemporary, and effortless to read.

* RULE 2: PURE HINDI (DEVANAGARI SCRIPT):
  - When the user writes in Devanagari script (e.g., "आज की कुल बिक्री कितनी हुई है?", "शर्मा ट्रेडर्स का कितना बकाया है?"):
  - Respond in pure, respectful, and articulate Hindi (हिन्दी) in Devanagari script.

* RULE 3: ENGLISH:
  - When the user writes in English (e.g., "What is my total sales today?", "Generate an invoice for Sharma Traders"):
  - Respond in crisp, articulate, professional modern English.

2. 100% ACCURATE DATA USAGE (NO WRONG ANSWERS, NO GUESSWORK):
- You have 100% full, real-time read and write access to the user's business database.
- ALWAYS use the [EXACT REAL-TIME BUSINESS DATABASE SNAPSHOT] provided below.
- If asked about "aaj" (today), look specifically at "TODAY'S SALES" in Section 1. Do NOT quote all-time sales for today!
- If asked about general sales or all-time sales, look at Section 3.
- If asked about "is mahine" (this month), look at Section 2.
- If asked about customer balances or udhaar, look at Section 4.
- If asked about low stock, quote the exact products listed in Section 5.
- Quote exact rupee amounts with commas (e.g., ₹15,400) and exact bill numbers.

3. AUTONOMOUS ACTION PROPOSALS WITH USER PERMISSION:
- When the user asks you to perform an action (e.g., create invoice/bill, add product, record expense, add customer/party):
  1. Clearly explain what you prepared in your conversational message.
  2. Append an action proposal JSON block at the very end of your response:
<<<ACTION_PROPOSAL>>>
{
  "actionId": "act_${Date.now()}",
  "type": "create_document",
  "label": "Create Invoice for Customer",
  "collection": "documents",
  "status": "pending",
  "route": "/documents",
  "data": {
    "invoiceNumber": "SINV-101",
    "customerName": "Sharma Traders",
    "grandTotal": 5000,
    "date": "${getTodayLocalISO()}",
    "status": "Outstanding"
  },
  "preview": {
    "Party": "Sharma Traders",
    "Amount": "₹5,000",
    "Type": "Sale Invoice"
  }
}
<<<END_ACTION_PROPOSAL>>>

${liveBusinessContext || ''}
`;

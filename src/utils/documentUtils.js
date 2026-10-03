// Centralized Document Management Utilities
// Provides unique document numbering, sequential generation, item selection, blank row handling, and full conversion flows.

export const DOCUMENT_CONFIGS = {
  'Sale Invoice': {
    code: 'SINV',
    prefix: 'SINV-',
    route: '/documents/sale',
    editRoute: '/documents/sale/edit',
    newRoute: '/documents/sale/new',
    numberField: 'invoiceNo',
    parentField: 'invoiceDetail',
    partyType: 'customer'
  },
  'Purchase Invoice': {
    code: 'PUR',
    prefix: 'PUR-',
    route: '/documents/purchase',
    editRoute: '/documents/purchase/edit',
    newRoute: '/documents/purchase/new',
    numberField: 'invoiceNo',
    parentField: 'invoiceDetail',
    partyType: 'vendor'
  },
  'Quotation': {
    code: 'QTN',
    prefix: 'QTN/',
    postfix: '/25-26',
    route: '/documents/quotation',
    editRoute: '/documents/quotation/edit',
    newRoute: '/documents/quotation/new',
    numberField: 'offerNo',
    parentField: 'offerDetail',
    partyType: 'customer'
  },
  'Proforma Invoice': {
    code: 'PI',
    prefix: 'PI/',
    postfix: '/25-26',
    route: '/documents/proforma',
    editRoute: '/documents/proforma/edit',
    newRoute: '/documents/proforma/new',
    numberField: 'proNo',
    parentField: 'proDetail',
    partyType: 'customer'
  },
  'Delivery Challan': {
    code: 'DC',
    prefix: 'DC/',
    postfix: '/25-26',
    route: '/documents/delivery-challan',
    editRoute: '/documents/delivery-challan/edit',
    newRoute: '/documents/delivery-challan/new',
    numberField: 'challanNo',
    parentField: 'dcDetail',
    partyType: 'customer'
  },
  'Sale Order': {
    code: 'SO',
    prefix: 'SO/',
    postfix: '/25-26',
    route: '/documents/sale-order',
    editRoute: '/documents/sale-order/edit',
    newRoute: '/documents/sale-order/new',
    numberField: 'soNo',
    parentField: 'soDetail',
    partyType: 'customer'
  },
  'Purchase Order': {
    code: 'PO',
    prefix: 'PO-',
    route: '/documents/purchase-order',
    editRoute: '/documents/purchase-order/edit',
    newRoute: '/documents/purchase-order/new',
    numberField: 'invoiceNo',
    parentField: 'invoiceDetail',
    partyType: 'vendor'
  },
  'Credit Note': {
    code: 'CN',
    prefix: 'CN-',
    route: '/documents/credit-note',
    editRoute: '/documents/credit-note/edit',
    newRoute: '/documents/credit-note/new',
    numberField: 'cnNo',
    parentField: 'cnDetail',
    partyType: 'customer'
  },
  'Debit Note': {
    code: 'DN',
    prefix: 'DN-',
    route: '/documents/debit-note',
    editRoute: '/documents/debit-note/edit',
    newRoute: '/documents/debit-note/new',
    numberField: 'dnNo',
    parentField: 'dnDetail',
    partyType: 'vendor'
  },
  'Job Work': {
    code: 'JW',
    prefix: 'JW-',
    route: '/documents/job-work',
    editRoute: '/documents/job-work/edit',
    newRoute: '/documents/job-work/new',
    numberField: 'jobWorkNo',
    parentField: 'jwDetail',
    partyType: 'customer'
  },
  'Letter': {
    code: 'LTR',
    prefix: 'LTR-',
    route: '/documents/letters',
    editRoute: '/documents/letters/edit',
    newRoute: '/documents/letters/new',
    numberField: 'letterNo',
    parentField: null,
    partyType: 'customer'
  },
  'Daily Expense': {
    code: 'EXP',
    prefix: 'EXP-',
    route: '/expenses/daily',
    editRoute: '/expenses/daily/edit',
    newRoute: '/expenses/daily/new',
    numberField: 'expenseNo',
    parentField: null,
    partyType: 'vendor'
  },
  'Other Income': {
    code: 'INC',
    prefix: 'INC-',
    route: '/income/other',
    editRoute: '/income/other/edit',
    newRoute: '/income/other/new',
    numberField: 'incomeNo',
    parentField: null,
    partyType: 'customer'
  }
};

/**
 * Normalizes document type strings (e.g. 'Invoice' -> 'Sale Invoice')
 */
export const normalizeDocType = (docType) => {
  if (!docType) return 'Sale Invoice';
  if (docType === 'Invoice') return 'Sale Invoice';
  if (docType === 'Offer') return 'Quotation';
  return docType;
};

/**
 * Extracts the raw numeric value from a document number or doc record.
 * Handles formats like: "SINV-5" -> 5, "QTN/12/25-26" -> 12, "5" -> 5, "PO-007" -> 7
 */
export const extractDocumentNumber = (numStr) => {
  if (!numStr) return null;
  const str = String(numStr).trim();
  // Match the core digits (e.g., from SINV-5, extract 5; from QTN/12/25-26, extract 12)
  const matches = str.match(/(?:[A-Za-z\/-]+)?(\d+)(?:[A-Za-z\/-]+)?/);
  if (matches && matches[1]) {
    const parsed = parseInt(matches[1], 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
};

/**
 * Computes the next sequential document number (1, 2, 3...) for a given document type.
 */
export const getNextDocumentNumber = (docType, allDocuments = []) => {
  const normType = normalizeDocType(docType);
  const cfg = DOCUMENT_CONFIGS[normType] || {};

  let maxNum = 0;

  allDocuments.forEach(doc => {
    const docNormType = normalizeDocType(doc.docType);
    if (docNormType === normType) {
      let candidate = null;

      // Check specific nested detail field
      if (cfg.parentField && doc[cfg.parentField] && doc[cfg.parentField][cfg.numberField]) {
        candidate = extractDocumentNumber(doc[cfg.parentField][cfg.numberField]);
      } else if (normType === 'Quotation' && doc.offerDetail?.offerNo) {
        candidate = extractDocumentNumber(doc.offerDetail.offerNo);
      } else if (normType === 'Proforma Invoice' && (doc.proDetail?.proNo || doc.piDetail?.piNo)) {
        candidate = extractDocumentNumber(doc.proDetail?.proNo || doc.piDetail?.piNo);
      } else if (normType === 'Delivery Challan' && doc.dcDetail?.challanNo) {
        candidate = extractDocumentNumber(doc.dcDetail.challanNo);
      } else if (normType === 'Sale Order' && doc.soDetail?.soNo) {
        candidate = extractDocumentNumber(doc.soDetail.soNo);
      } else if (normType === 'Purchase Order' && doc.invoiceDetail?.invoiceNo) {
        candidate = extractDocumentNumber(doc.invoiceDetail.invoiceNo);
      } else if (normType === 'Credit Note' && doc.cnDetail?.cnNo) {
        candidate = extractDocumentNumber(doc.cnDetail.cnNo);
      } else if (normType === 'Debit Note' && doc.dnDetail?.dnNo) {
        candidate = extractDocumentNumber(doc.dnDetail.dnNo);
      } else if (normType === 'Job Work' && doc.jwDetail?.jobWorkNo) {
        candidate = extractDocumentNumber(doc.jwDetail.jobWorkNo);
      }

      // Also inspect overall invoiceNumber
      if (candidate === null && doc.invoiceNumber) {
        candidate = extractDocumentNumber(doc.invoiceNumber);
      }

      if (candidate !== null && candidate > maxNum) {
        maxNum = candidate;
      }
    }
  });

  return String(maxNum + 1);
};

/**
 * Checks if a document number is already in use for this docType.
 * Prevents number reuse (e.g. SINV-5 cannot be created again).
 */
export const isDocumentNumberTaken = (docType, rawNumber, currentDocId, allDocuments = []) => {
  if (!rawNumber) return false;

  // Gracefully handle swapped arguments (currentDocId, allDocuments) vs (allDocuments, currentDocId)
  let docId = currentDocId;
  let docs = allDocuments;
  if (Array.isArray(currentDocId)) {
    docs = currentDocId;
    docId = typeof allDocuments === 'string' ? allDocuments : undefined;
  }
  if (!Array.isArray(docs)) docs = [];

  const normType = normalizeDocType(docType);
  const cfg = DOCUMENT_CONFIGS[normType] || {};

  const targetNum = extractDocumentNumber(rawNumber);
  const targetClean = String(rawNumber).trim().toLowerCase();

  return docs.some(doc => {
    // Skip if it's the exact document being edited
    if (docId && (doc.id === docId || doc._dbId === docId || doc._id === docId)) {
      return false;
    }

    const docNormType = normalizeDocType(doc.docType);
    if (docNormType !== normType) return false;

    // Check raw number match
    let existingNum = null;
    let existingFull = (doc.invoiceNumber || doc.letterNo || '').trim().toLowerCase();

    if (cfg.parentField && doc[cfg.parentField] && doc[cfg.parentField][cfg.numberField]) {
      existingNum = extractDocumentNumber(doc[cfg.parentField][cfg.numberField]);
    } else if (normType === 'Quotation' && doc.offerDetail?.offerNo) {
      existingNum = extractDocumentNumber(doc.offerDetail.offerNo);
    } else if (normType === 'Proforma Invoice' && (doc.proDetail?.proNo || doc.piDetail?.piNo)) {
      existingNum = extractDocumentNumber(doc.proDetail?.proNo || doc.piDetail?.piNo);
    } else if (normType === 'Delivery Challan' && doc.dcDetail?.challanNo) {
      existingNum = extractDocumentNumber(doc.dcDetail.challanNo);
    } else if (normType === 'Sale Order' && doc.soDetail?.soNo) {
      existingNum = extractDocumentNumber(doc.soDetail.soNo);
    } else if (normType === 'Purchase Order' && doc.invoiceDetail?.invoiceNo) {
      existingNum = extractDocumentNumber(doc.invoiceDetail.invoiceNo);
    } else if (normType === 'Credit Note' && doc.cnDetail?.cnNo) {
      existingNum = extractDocumentNumber(doc.cnDetail.cnNo);
    } else if (normType === 'Debit Note' && doc.dnDetail?.dnNo) {
      existingNum = extractDocumentNumber(doc.dnDetail.dnNo);
    } else if (normType === 'Job Work' && doc.jwDetail?.jobWorkNo) {
      existingNum = extractDocumentNumber(doc.jwDetail.jobWorkNo);
    }

    if (existingNum === null && doc.invoiceNumber) {
      existingNum = extractDocumentNumber(doc.invoiceNumber);
    }

    // Match either numeric sequence or full string
    if (targetNum !== null && existingNum !== null && targetNum === existingNum) {
      return true;
    }

    if (existingFull && (existingFull === targetClean || existingFull.replace(/[\/-]/g, '') === targetClean.replace(/[\/-]/g, ''))) {
      return true;
    }

    return false;
  });
};

/**
 * Filter out empty/blank item rows.
 * Empty rows are useful in editing UI for easy addition, but MUST NOT appear in print, download, or calculations.
 */
export const filterValidItems = (items = []) => {
  return items.filter(item => {
    if (!item) return false;
    const hasName = Boolean(item.name && item.name.trim());
    const hasProductId = Boolean(item.productId && String(item.productId).trim());
    const hasValue = (Number(item.rate) > 0 || Number(item.amount) > 0);
    return hasName || hasProductId || hasValue;
  });
};

/**
 * Smart product adder/updater for item tables:
 * 1. If product is already present in another row, increase that row's quantity by 1.
 * 2. If it's a new product, populate the row.
 * 3. Automatically appends a blank row at the bottom so the user can easily continue adding products.
 */
export const handleProductRowSelection = (currentItems, product, targetIndex, createBlankItemFn) => {
  if (!product) return currentItems;

  const items = currentItems.map(item => ({ ...item }));
  const targetPid = product.id || product._id || product._dbId;

  // Check if this product is already in another row
  const existingIdx = items.findIndex((it, idx) => {
    if (idx === targetIndex) return false;
    const itPid = it.productId;
    return itPid && (itPid === targetPid || itPid === product.id);
  });

  if (existingIdx !== -1) {
    // Product already exists in another row: increase its quantity!
    const existing = items[existingIdx];
    const newQty = (Number(existing.quantity) || 1) + 1;
    existing.quantity = newQty;
    const base = newQty * (Number(existing.rate) || 0);
    const disc = Number(existing.discountPercent) || 0;
    const taxable = base - (base * (disc / 100));
    existing.amount = taxable;
    existing.taxAmount = taxable * ((Number(existing.taxRate) || 0) / 100);

    // Keep the target row clean/blank
    if (createBlankItemFn) {
      items[targetIndex] = createBlankItemFn();
    }
  } else {
    // Populate the selected row
    const item = items[targetIndex] || (createBlankItemFn ? createBlankItemFn() : {});
    item.productId = targetPid;
    item.name = product.name;
    item.barcodeNo = product.barcode || product.barcodeNo || '';
    item.hsn = product.hsn || '';
    item.unit = product.unit || 'PCS';
    item.image = product.image || '';
    item.rate = Number(product.sellingPrice || product.price || product.purchasePrice || 0);
    item.taxRate = Number(product.taxRate || product.gst || 0);
    
    const qty = Number(item.quantity) || 1;
    item.quantity = qty;
    const base = qty * item.rate;
    const disc = Number(item.discountPercent) || 0;
    const taxable = base - (base * (disc / 100));
    item.amount = taxable;
    item.taxAmount = taxable * (item.taxRate / 100);
    
    items[targetIndex] = item;
  }

  // Ensure there is always a blank row at the bottom for quick addition (Bug sheet item 8)
  const lastItem = items[items.length - 1];
  const isLastPopulated = lastItem && (lastItem.name || lastItem.productId || Number(lastItem.amount) > 0);
  if (isLastPopulated && createBlankItemFn) {
    items.push(createBlankItemFn());
  }

  return items;
};

/**
 * Document Conversion Flows Matrix (Bug sheet item 10)
 */
export const CONVERSION_OPTIONS = {
  'Quotation': [
    { targetType: 'Sale Order', label: 'Sale Order', desc: 'Convert to confirmed Sales Order when client approves' },
    { targetType: 'Sale Invoice', label: 'Sale Invoice', desc: 'Directly convert to final bill once deal is locked' }
  ],
  'Proforma Invoice': [
    { targetType: 'Sale Invoice', label: 'Sale Invoice', desc: 'Convert to tax Sale Invoice upon payment/advance' }
  ],
  'Sale Order': [
    { targetType: 'Delivery Challan', label: 'Delivery Challan', desc: 'Dispatch/transport document for transit' },
    { targetType: 'Sale Invoice', label: 'Sale Invoice', desc: 'Convert order directly into final bill' }
  ],
  'Delivery Challan': [
    { targetType: 'Sale Invoice', label: 'Sale Invoice', desc: 'Convert accepted goods challan into final invoice' }
  ],
  'Sale Invoice': [
    { targetType: 'Credit Note', label: 'Credit Note', desc: 'Issue credit for returned items or price adjustment' },
    { targetType: 'Inward Payment', label: 'Inward Payment', desc: 'Link to payment receipt when customer pays' }
  ],
  'Purchase Order': [
    { targetType: 'Purchase Invoice', label: 'Purchase Invoice', desc: 'Convert inward bill when vendor delivers' },
    { targetType: 'Debit Note', label: 'Debit Note', desc: 'Reject items or issue return note immediately' }
  ],
  'Purchase Invoice': [
    { targetType: 'Debit Note', label: 'Debit Note', desc: 'Return goods or claim rate discrepancy reduction' },
    { targetType: 'Outward Payment', label: 'Outward Payment', desc: 'Log payment settlement for pending vendor bill' }
  ],
  'Job Work': [
    { targetType: 'Delivery Challan', label: 'Delivery Challan', desc: 'Dispatch raw materials to worker' },
    { targetType: 'Sale Invoice', label: 'Sale Invoice', desc: 'Bill for processing services rendered' }
  ]
};

/**
 * Returns available conversion targets for any document type
 */
export const getAvailableConversions = (docType) => {
  const normType = normalizeDocType(docType);
  return CONVERSION_OPTIONS[normType] || [];
};

/**
 * Maps and transforms a source document into the target document structure.
 */
export const createConvertedDocumentDraft = (sourceDoc, targetType, nextNumber) => {
  const validItems = filterValidItems(sourceDoc.items || []);
  const today = new Date().toISOString().split('T')[0];

  // Customer / Vendor standardizing
  const partyId = sourceDoc.customerId || sourceDoc.vendorId || sourceDoc.contactId || '';
  const partyName = sourceDoc.customerName || sourceDoc.vendorName || sourceDoc.customerInfo?.ms || sourceDoc.vendorInfo?.ms || sourceDoc.name || '';
  const partyPhone = sourceDoc.customerPhone || sourceDoc.vendorPhone || sourceDoc.customerInfo?.phoneNo || sourceDoc.vendorInfo?.phoneNo || '';
  const partyAddress = sourceDoc.customerAddress || sourceDoc.vendorAddress || sourceDoc.customerInfo?.address || sourceDoc.vendorInfo?.address || '';
  const partyGstin = sourceDoc.customerGstin || sourceDoc.vendorGstin || sourceDoc.customerInfo?.gstinPan || sourceDoc.vendorInfo?.gstinPan || '';
  const placeOfSupply = sourceDoc.placeOfSupply || sourceDoc.customerInfo?.placeOfSupply || sourceDoc.vendorInfo?.placeOfSupply || 'Madhya Pradesh';

  const baseCustomerInfo = {
    ms: partyName,
    address: partyAddress,
    contactPerson: partyName,
    phoneNo: partyPhone,
    gstinPan: partyGstin,
    revCharge: 'No',
    shipTo: '--',
    placeOfSupply: placeOfSupply
  };

  const baseVendorInfo = {
    ms: partyName,
    address: partyAddress,
    contactPerson: partyName,
    phoneNo: partyPhone,
    gstinPan: partyGstin,
    revCharge: 'No',
    shipTo: '--',
    placeOfSupply: placeOfSupply
  };

  const sourceNumber = sourceDoc.invoiceNumber || sourceDoc.invoiceDetail?.invoiceNo || sourceDoc.offerDetail?.offerNo || sourceDoc.proDetail?.proNo || sourceDoc.dcDetail?.challanNo || sourceDoc.soDetail?.soNo || '';

  if (targetType === 'Sale Invoice') {
    return {
      docType: 'Sale Invoice',
      customerId: partyId,
      customerInfo: baseCustomerInfo,
      invoiceDetail: {
        invoiceType: 'Regular Sale',
        invoiceNo: nextNumber || '1',
        date: today,
        challanNo: sourceDoc.docType === 'Delivery Challan' ? sourceNumber : (sourceDoc.challanNo || ''),
        challanDate: sourceDoc.docType === 'Delivery Challan' ? (sourceDoc.date || today) : '',
        poNo: sourceDoc.docType === 'Sale Order' ? sourceNumber : (sourceDoc.poNo || ''),
        poDate: sourceDoc.docType === 'Sale Order' ? (sourceDoc.date || today) : '',
        lrNo: sourceDoc.lrNo || '',
        ewayNo: sourceDoc.ewayNo || '',
        deliveryMode: sourceDoc.deliveryMode || 'Hand Delivery',
      },
      items: validItems.length > 0 ? validItems : [],
      termsTitle: 'Terms & Condition',
      termsDetail: 'Subject to our home Jurisdiction. Goods once sold will not be taken back.',
      documentNote: `Converted from ${sourceDoc.docType} #${sourceNumber}`,
      additionalCharge: sourceDoc.additionalCharge || 0,
      additionalChargeName: sourceDoc.additionalChargeName || 'Freight',
      tcs: sourceDoc.tcs || { mode: '+', value: '', unit: '%' },
      discount: sourceDoc.discount || { mode: '-', value: '', unit: 'Rs' },
      roundOff: true,
      grandTotal: sourceDoc.grandTotal || sourceDoc.total || 0,
      paymentType: 'CREDIT',
    };
  }

  if (targetType === 'Sale Order') {
    return {
      docType: 'Sale Order',
      docPrefix: 'SO/',
      docPostfix: '/25-26',
      customerId: partyId,
      customerInfo: baseCustomerInfo,
      soDetail: {
        type: 'Regular Sale Order',
        soNo: nextNumber || '1',
        date: today,
        challanNo: '',
        challanDate: '',
        refNo: sourceNumber ? `QTN: ${sourceNumber}` : '',
        deliveryMode: 'Hand Delivery',
      },
      items: validItems.length > 0 ? validItems : [],
      bank: 'CANARA BANK',
      terms: sourceDoc.terms || [
        { id: 1, title: 'Jurisdiction', detail: 'Subject to our home Jurisdiction.' },
        { id: 2, title: 'Responsibility', detail: 'Our Responsibility Ceases as soon as goods leave our Premises.' }
      ],
      documentNote: `Converted from Quotation #${sourceNumber}`,
      additionalCharge: sourceDoc.additionalCharge || 0,
      additionalChargeName: sourceDoc.additionalChargeName || 'Freight',
      tcs: sourceDoc.tcs || { mode: '+', value: '', unit: '%' },
      discount: sourceDoc.discount || { mode: '-', value: '', unit: 'Rs' },
      roundOff: true,
      grandTotal: sourceDoc.grandTotal || sourceDoc.total || 0,
    };
  }

  if (targetType === 'Delivery Challan') {
    return {
      docType: 'Delivery Challan',
      docPrefix: 'DC/',
      docPostfix: '/25-26',
      customerId: partyId,
      customerInfo: {
        ...baseCustomerInfo,
        supplyType: 'Outward'
      },
      dcDetail: {
        type: 'Standard',
        challanNo: nextNumber || '1',
        date: today,
        lrNo: '',
        ewayNo: '',
        deliveryMode: 'Transport',
      },
      items: validItems.length > 0 ? validItems : [],
      terms: [
        { title: 'Goods Receipt', detail: 'Goods received in good condition and order.' },
        { title: 'Jurisdiction', detail: 'Subject to our home Jurisdiction.' }
      ],
      documentNote: `Dispatched against ${sourceDoc.docType} #${sourceNumber}`,
      additionalCharge: 0,
      additionalChargeName: 'Freight',
      tcs: { mode: '+', value: '', unit: '%' },
      discount: { mode: '-', value: '', unit: 'Rs' },
      roundOff: true,
      grandTotal: sourceDoc.grandTotal || sourceDoc.total || 0,
    };
  }

  if (targetType === 'Purchase Invoice') {
    return {
      docType: 'Purchase Invoice',
      vendorId: partyId,
      vendorInfo: baseVendorInfo,
      invoiceDetail: {
        invoiceType: 'Regular Purchase',
        invoiceNo: nextNumber || '1',
        date: today,
        challanNo: '',
        challanDate: '',
        lrNo: '',
        ewayNo: '',
        deliveryMode: 'Transport',
      },
      items: validItems.length > 0 ? validItems : [],
      termsTitle: 'Terms & Condition',
      termsDetail: '',
      documentNote: `Inward bill against Purchase Order #${sourceNumber}`,
      additionalCharge: sourceDoc.additionalCharge || 0,
      additionalChargeName: sourceDoc.additionalChargeName || 'Freight',
      tcs: sourceDoc.tcs || { mode: '+', value: '', unit: '%' },
      discount: sourceDoc.discount || { mode: '-', value: '', unit: 'Rs' },
      roundOff: true,
      grandTotal: sourceDoc.grandTotal || sourceDoc.total || 0,
      paymentType: 'CREDIT',
    };
  }

  if (targetType === 'Credit Note') {
    return {
      docType: 'Credit Note',
      customerId: partyId,
      customerInfo: baseCustomerInfo,
      cnDetail: {
        type: 'Credit Note',
        cnType: 'Regular',
        cnNo: nextNumber || '1',
        date: today,
        invoiceNo: sourceNumber,
        invoiceDate: sourceDoc.date || today,
        challanNo: '',
        challanDate: '',
        lrNo: '',
        ewayNo: '',
        deliveryMode: 'Select Delivery Mode',
      },
      items: validItems.length > 0 ? validItems : [],
      terms: [],
      documentNote: `Credit Note against Sale Invoice #${sourceNumber}`,
      additionalCharge: 0,
      additionalChargeName: 'Additional Charge',
      tcs: { mode: '+', value: '', unit: '%' },
      discount: { mode: '-', value: '', unit: 'Rs' },
      roundOff: true,
      grandTotal: sourceDoc.grandTotal || sourceDoc.total || 0,
    };
  }

  if (targetType === 'Debit Note') {
    return {
      docType: 'Debit Note',
      vendorId: partyId,
      vendorInfo: baseVendorInfo,
      dnDetail: {
        type: 'Debit Note',
        dnType: 'Regular',
        dnNo: nextNumber || '1',
        date: today,
        invoiceNo: sourceNumber,
        invoiceDate: sourceDoc.date || today,
        challanNo: '',
        challanDate: '',
        lrNo: '',
        ewayNo: '',
        deliveryMode: 'Select Delivery Mode',
      },
      items: validItems.length > 0 ? validItems : [],
      terms: [],
      documentNote: `Debit Note against ${sourceDoc.docType} #${sourceNumber}`,
      additionalCharge: 0,
      additionalChargeName: 'Additional Charge',
      tcs: { mode: '+', value: '', unit: '%' },
      discount: { mode: '-', value: '', unit: 'Rs' },
      roundOff: true,
      grandTotal: sourceDoc.grandTotal || sourceDoc.total || 0,
    };
  }

  return null;
};

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Printer, Check, User, FileText, Package } from 'lucide-react';
import { getItems, addItem, updateItem } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import ContactModal from '@/features/contacts/components/ContactModal';
import PrintViewModal from '@/components/ui/PrintViewModal';
import '@/features/expenses/styles/AddDailyExpense.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  'Office Supplies',
  'Travel & Conveyance',
  'Utilities & Bills',
  'Staff Welfare & Tea',
  'Repairs & Maintenance',
  'Marketing & Advertising',
  'Raw Materials & Supplies',
  'Food & Beverages',
  'Rent & Lease',
  'Software & Subscriptions',
  'Legal & Professional Fees',
  'Miscellaneous'
];

const STATE_CODES = {
  'Andaman & Nicobar Islands': '35', 'Andhra Pradesh': '37',
  'Arunachal Pradesh': '12', 'Assam': '18', 'Bihar': '10',
  'Chandigarh': '04', 'Chhattisgarh': '22', 'Dadra & Nagar Haveli': '26',
  'Daman & Diu': '25', 'Delhi': '07', 'Goa': '30', 'Gujarat': '24',
  'Haryana': '06', 'Himachal Pradesh': '02', 'Jammu & Kashmir': '01',
  'Jharkhand': '20', 'Karnataka': '29', 'Kerala': '32', 'Ladakh': '38',
  'Lakshadweep': '31', 'Madhya Pradesh': '23', 'Maharashtra': '27',
  'Manipur': '14', 'Meghalaya': '17', 'Mizoram': '15', 'Nagaland': '13',
  'Odisha': '21', 'Puducherry': '34', 'Punjab': '03', 'Rajasthan': '08',
  'Sikkim': '11', 'Tamil Nadu': '33', 'Telangana': '36', 'Tripura': '16',
  'Uttar Pradesh': '09', 'Uttarakhand': '05', 'West Bengal': '19',
};

const BLANK_ITEM = () => ({
  id: Date.now() + Math.random(),
  name: '',
  hsnCode: '',
  quantity: 1,
  unit: 'NOS',
  rate: 0,
  taxRate: 0,
  amount: 0,
  taxAmount: 0,
  note: '',
});

function numberToWords(num) {
  if (!num || num === 0) return 'ZERO RUPEES ONLY';
  const a = ['', 'ONE ', 'TWO ', 'THREE ', 'FOUR ', 'FIVE ', 'SIX ', 'SEVEN ', 'EIGHT ', 'NINE ', 'TEN ',
    'ELEVEN ', 'TWELVE ', 'THIRTEEN ', 'FOURTEEN ', 'FIFTEEN ', 'SIXTEEN ', 'SEVENTEEN ', 'EIGHTEEN ', 'NINETEEN '];
  const b = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const fmt = n => n < 20 ? a[n] : b[Math.floor(n / 10)] + (n % 10 ? '-' + a[n % 10] : '');
  const conv = n => {
    if (n === 0) return '';
    if (n < 100) return fmt(n);
    if (n < 1000) return a[Math.floor(n / 100)] + 'HUNDRED ' + conv(n % 100);
    if (n < 100000) return conv(Math.floor(n / 1000)) + 'THOUSAND ' + conv(n % 1000);
    if (n < 10000000) return conv(Math.floor(n / 100000)) + 'LAKH ' + conv(n % 100000);
    return conv(Math.floor(n / 10000000)) + 'CRORE ' + conv(n % 10000000);
  };
  return (conv(Math.floor(num)) + 'RUPEES ONLY').trim();
}

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

const AddDailyExpense = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [printDoc, setPrintDoc] = useState(null);

  const [doc, setDoc] = useState({
    expenseNo: '',
    vendorId: '',
    vendorInfo: {
      ms: '',
      address: '',
      contactPerson: '',
      phoneNo: '',
      gstinPan: '',
      placeOfSupply: 'Madhya Pradesh',
    },
    expenseDetail: {
      expenseNo: '',
      date: todayIso(),
      category: 'Office Supplies',
      refNo: '',
    },
    isGstEnabled: true,
    items: [BLANK_ITEM()],
    termsDetail: 'Subject to internal accounting audit and verification.',
    documentNote: '',
    paymentType: 'CASH',
    chequeNo: '',
    bankName: '',
    transactionRef: '',
    roundOff: true,
    taxable: 0,
    totalTaxable: 0,
    totalTax: 0,
    grandTotal: 0,
  });

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [contactsList, expensesList] = await Promise.all([
        getItems('contacts', user.id),
        getItems('dailyExpenses', user.id)
      ]);
      setContacts(contactsList || []);

      if (id) {
        const found = expensesList.find(e => e._dbId === id);
        if (found) {
          const loadedItems = Array.isArray(found.items) && found.items.length > 0
            ? found.items.map(it => ({
                id: it.id || Date.now() + Math.random(),
                name: it.name || '',
                hsnCode: it.hsnCode || it.hsn || '',
                quantity: Number(it.quantity || it.qty || 1),
                unit: it.unit || it.uom || 'NOS',
                rate: Number(it.rate || it.price || 0),
                taxRate: Number(it.taxRate || it.tax || 0),
                amount: Number(it.amount || it.total || 0),
                taxAmount: (Number(it.rate || it.price || 0) * Number(it.quantity || it.qty || 1) * Number(it.taxRate || it.tax || 0)) / 100,
                note: it.note || '',
              }))
            : [BLANK_ITEM()];

          setDoc({
            expenseNo: found.expenseNo || '',
            vendorId: found.vendorId || '',
            vendorInfo: {
              ms: found.vendorInfo?.ms || found.msName || found.title || '',
              address: found.vendorInfo?.address || found.address || '',
              contactPerson: found.vendorInfo?.contactPerson || found.contactPerson || '',
              phoneNo: found.vendorInfo?.phoneNo || found.phone || '',
              gstinPan: found.vendorInfo?.gstinPan || found.gstinPan || '',
              placeOfSupply: found.vendorInfo?.placeOfSupply || 'Madhya Pradesh',
            },
            expenseDetail: {
              expenseNo: found.expenseNo || '',
              date: found.date || todayIso(),
              category: found.category || found.expenseDetail?.category || 'Office Supplies',
              refNo: found.refNo || found.expenseDetail?.refNo || '',
            },
            isGstEnabled: found.isGstEnabled !== undefined ? found.isGstEnabled : true,
            items: loadedItems,
            termsDetail: found.termsDetail || 'Subject to internal accounting audit and verification.',
            documentNote: found.documentNote || found.notes || '',
            paymentType: found.paymentType || 'CASH',
            chequeNo: found.chequeNo || '',
            bankName: found.bankName || '',
            transactionRef: found.transactionRef || '',
            roundOff: found.roundOff !== undefined ? found.roundOff : true,
            taxable: Number(found.taxable || 0),
            totalTaxable: Number(found.totalTaxable || found.taxable || 0),
            totalTax: Number(found.totalTax || 0),
            grandTotal: Number(found.grandTotal || found.amount || 0),
          });
        }
      } else {
        // Auto-increment voucher number
        const nextNo = (expensesList.length + 1).toString();
        setDoc(prev => ({
          ...prev,
          expenseNo: nextNo,
          expenseDetail: {
            ...prev.expenseDetail,
            expenseNo: nextNo,
            date: todayIso(),
          }
        }));
      }
    } catch (err) {
      console.error('Error loading expense data:', err);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recalculate financial breakdown
  useEffect(() => {
    let subtotal = 0;
    let taxTotal = 0;

    const updatedItems = doc.items.map(it => {
      const q = Number(it.quantity) || 0;
      const r = Number(it.rate) || 0;
      const t = doc.isGstEnabled ? (Number(it.taxRate) || 0) : 0;
      const lineTaxable = q * r;
      const lineTax = (lineTaxable * t) / 100;
      const lineTotal = lineTaxable + lineTax;

      subtotal += lineTaxable;
      taxTotal += lineTax;

      return {
        ...it,
        taxAmount: lineTax,
        amount: lineTotal,
      };
    });

    const rawGrand = subtotal + taxTotal;
    const finalGrand = doc.roundOff ? Math.round(rawGrand) : rawGrand;

    setDoc(prev => ({
      ...prev,
      items: updatedItems,
      taxable: subtotal,
      totalTaxable: subtotal,
      totalTax: taxTotal,
      grandTotal: finalGrand,
    }));
  }, [doc.isGstEnabled, doc.roundOff, JSON.stringify(doc.items.map(i => [i.quantity, i.rate, i.taxRate]))]);

  // Field change handlers
  const handleNested = (parent, field, value) => {
    setDoc(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  const handleVendorChange = (e) => {
    const val = e.target.value;
    const match = contacts.find(c =>
      (c.companyName && c.companyName.toLowerCase() === val.toLowerCase()) ||
      (c.name && c.name.toLowerCase() === val.toLowerCase())
    );

    if (match) {
      setDoc(prev => ({
        ...prev,
        vendorId: match.id || match._id || match._dbId || '',
        vendorInfo: {
          ms: match.companyName || match.name || val,
          address: match.address || prev.vendorInfo.address,
          contactPerson: match.name || prev.vendorInfo.contactPerson,
          phoneNo: match.phone || match.mobile || prev.vendorInfo.phoneNo,
          gstinPan: match.gstin || match.pan || prev.vendorInfo.gstinPan,
          placeOfSupply: match.state || prev.vendorInfo.placeOfSupply,
        }
      }));
    } else {
      handleNested('vendorInfo', 'ms', val);
    }
  };

  const handleItemChange = (itemId, field, value) => {
    setDoc(prev => ({
      ...prev,
      items: prev.items.map(it => it.id === itemId ? { ...it, [field]: value } : it)
    }));
  };

  const addItemRow = () => {
    setDoc(prev => ({
      ...prev,
      items: [...prev.items, BLANK_ITEM()]
    }));
  };

  const removeItemRow = (itemId) => {
    if (doc.items.length <= 1) return;
    setDoc(prev => ({
      ...prev,
      items: prev.items.filter(it => it.id !== itemId)
    }));
  };

  const handleContactCreated = (newContact) => {
    if (!newContact) return;
    setContacts(prev => [...prev, newContact]);
    setDoc(prev => ({
      ...prev,
      vendorId: newContact.id || newContact._id || newContact._dbId || '',
      vendorInfo: {
        ms: newContact.companyName || newContact.name || '',
        address: newContact.address || '',
        contactPerson: newContact.name || '',
        phoneNo: newContact.phone || newContact.mobile || '',
        gstinPan: newContact.gstin || newContact.pan || '',
        placeOfSupply: newContact.state || prev.vendorInfo.placeOfSupply,
      }
    }));
    setShowContactModal(false);
  };

  // Submit / Save
  const handleSave = async (andPrint = false) => {
    if (!user?.id) return;
    if (!doc.vendorInfo.ms.trim()) {
      alert('Please enter or select a Payee / Vendor name.');
      return;
    }
    if (doc.items.length === 0 || !doc.items[0].name.trim()) {
      alert('Please enter at least one item description.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...doc,
        title: doc.vendorInfo.ms,
        msName: doc.vendorInfo.ms,
        address: doc.vendorInfo.address,
        phone: doc.vendorInfo.phoneNo,
        contactPerson: doc.vendorInfo.contactPerson,
        gstinPan: doc.vendorInfo.gstinPan,
        category: doc.expenseDetail.category,
        date: doc.expenseDetail.date,
        expenseNo: doc.expenseDetail.expenseNo,
        refNo: doc.expenseDetail.refNo,
        amount: doc.grandTotal,
        total: doc.grandTotal,
        notes: doc.documentNote,
        updatedAt: new Date().toISOString(),
      };

      let savedRecord;
      if (id) {
        await updateItem('dailyExpenses', id, payload, user.id);
        savedRecord = { ...payload, _dbId: id };
      } else {
        payload.createdAt = new Date().toISOString();
        const newId = await addItem('dailyExpenses', payload, user.id);
        savedRecord = { ...payload, _dbId: newId };
      }

      if (andPrint) {
        setPrintDoc({
          ...savedRecord,
          docType: 'Daily Expense',
          invoiceNumber: `EXP-${savedRecord.expenseNo || '1'}`,
          customerName: savedRecord.vendorInfo?.ms || savedRecord.title || 'Payee',
          total: savedRecord.grandTotal,
          amount: savedRecord.grandTotal,
          date: savedRecord.date,
        });
      } else {
        navigate('/expenses/daily');
      }
    } catch (err) {
      console.error('Error saving expense:', err);
      alert('An error occurred while saving the expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="add-expense-pro" style={{ textAlign: 'center', padding: '5rem 0' }}>
        <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: 600 }}>Loading expense record...</p>
      </div>
    );
  }

  return (
    <div className="add-expense-pro">
      {/* Header Bar */}
      <div className="form-header-bar print-hide">
        <div className="header-left">
          <button
            type="button"
            className="back-circle-btn"
            onClick={() => navigate('/expenses/daily')}
            title="Back to Daily Expenses"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="header-badge-row">
              <span className="voucher-status-tag">EXPENSE VOUCHER</span>
            </div>
            <h1 className="header-title">
              {id ? `Edit Expense Voucher #${doc.expenseDetail.expenseNo}` : 'Record Daily Expense'}
            </h1>
          </div>
        </div>

        <div className="header-actions">
          <button type="button" className="btn btn-outline" onClick={() => navigate('/expenses/daily')}>
            Cancel
          </button>
          <button type="button" className="btn btn-print-cta" onClick={() => handleSave(true)} disabled={isSubmitting}>
            <Printer size={16} /> Save &amp; Print
          </button>
          <button type="button" className="btn btn-save-primary" onClick={() => handleSave(false)} disabled={isSubmitting}>
            <Check size={16} /> {isSubmitting ? 'Saving...' : 'Save Expense'}
          </button>
        </div>
      </div>

      {/* Top 2 Cards Grid: Payee Info & Voucher Details */}
      <div className="form-cards-grid">
        {/* Card 1: Payee Information */}
        <div className="form-card">
          <div className="form-card-header">
            <div className="form-card-title-group">
              <div className="card-icon-avatar user-icon">
                <User size={18} />
              </div>
              <div>
                <h3 className="form-card-title">Payee / Vendor Information</h3>
                <p className="form-card-desc">Vendor or recipient to whom payment is made</p>
              </div>
            </div>
            <button type="button" className="btn-add-contact" onClick={() => setShowContactModal(true)}>
              <Plus size={14} /> New Contact
            </button>
          </div>

          <div className="form-card-body">
            <div className="form-group">
              <label>M/S / Payee Name <span className="req">*</span></label>
              <input
                type="text"
                list="expense-vendor-list"
                placeholder="Search or enter payee name..."
                value={doc.vendorInfo.ms}
                onChange={handleVendorChange}
                className="pro-input"
              />
              <datalist id="expense-vendor-list">
                {contacts.map(c => (
                  <option key={c.id || c._id || c._dbId} value={c.companyName || c.name} />
                ))}
              </datalist>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>Contact Person</label>
                <input
                  type="text"
                  placeholder="Contact Person"
                  value={doc.vendorInfo.contactPerson}
                  onChange={e => handleNested('vendorInfo', 'contactPerson', e.target.value)}
                  className="pro-input"
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  placeholder="Phone No"
                  value={doc.vendorInfo.phoneNo}
                  onChange={e => handleNested('vendorInfo', 'phoneNo', e.target.value)}
                  className="pro-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Address</label>
              <textarea
                rows={2}
                placeholder="Payee full address..."
                value={doc.vendorInfo.address}
                onChange={e => handleNested('vendorInfo', 'address', e.target.value)}
                className="pro-textarea"
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>GSTIN / PAN</label>
                <input
                  type="text"
                  placeholder="GSTIN or PAN (Optional)"
                  value={doc.vendorInfo.gstinPan}
                  onChange={e => handleNested('vendorInfo', 'gstinPan', e.target.value.toUpperCase())}
                  className="pro-input uppercase"
                />
              </div>
              <div className="form-group">
                <label>Place of Supply <span className="req">*</span></label>
                <select
                  value={doc.vendorInfo.placeOfSupply}
                  onChange={e => handleNested('vendorInfo', 'placeOfSupply', e.target.value)}
                  className="pro-select"
                >
                  {Object.keys(STATE_CODES).sort().map(s => (
                    <option key={s} value={s}>{s} ({STATE_CODES[s]})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Voucher Metadata */}
        <div className="form-card">
          <div className="form-card-header">
            <div className="form-card-title-group">
              <div className="card-icon-avatar doc-icon">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="form-card-title">Voucher Details</h3>
                <p className="form-card-desc">Classification and accounting reference</p>
              </div>
            </div>

            {/* GST Toggle */}
            <div className="gst-toggle-pill">
              <span className="gst-label">GST Tax</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={doc.isGstEnabled}
                  onChange={e => setDoc(prev => ({ ...prev, isGstEnabled: e.target.checked }))}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          <div className="form-card-body">
            <div className="form-grid-2">
              <div className="form-group">
                <label>Voucher No. <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="EXP-1"
                  value={doc.expenseDetail.expenseNo}
                  onChange={e => handleNested('expenseDetail', 'expenseNo', e.target.value)}
                  className="pro-input font-bold"
                />
              </div>
              <div className="form-group">
                <label>Date <span className="req">*</span></label>
                <input
                  type="date"
                  value={doc.expenseDetail.date}
                  onChange={e => handleNested('expenseDetail', 'date', e.target.value)}
                  className="pro-input"
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>Expense Category <span className="req">*</span></label>
                <select
                  value={doc.expenseDetail.category}
                  onChange={e => handleNested('expenseDetail', 'category', e.target.value)}
                  className="pro-select"
                >
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Reference / Bill No.</label>
                <input
                  type="text"
                  placeholder="Vendor Bill or Receipt Ref"
                  value={doc.expenseDetail.refNo}
                  onChange={e => handleNested('expenseDetail', 'refNo', e.target.value)}
                  className="pro-input"
                />
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div className="form-group">
              <label>Payment Mode <span className="req">*</span></label>
              <div className="payment-mode-tabs">
                {['CASH', 'ONLINE', 'BANK TRANSFER', 'CHEQUE'].map(mode => (
                  <button
                    key={mode}
                    type="button"
                    className={`mode-btn ${doc.paymentType === mode ? 'active' : ''}`}
                    onClick={() => setDoc(prev => ({ ...prev, paymentType: mode }))}
                  >
                    {mode === 'ONLINE' ? 'UPI / Online' : mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional Payment Mode Fields */}
            {doc.paymentType === 'CHEQUE' && (
              <div className="form-grid-2 alert-subbox">
                <div className="form-group">
                  <label>Cheque No.</label>
                  <input
                    type="text"
                    placeholder="Cheque No."
                    value={doc.chequeNo || ''}
                    onChange={e => setDoc(prev => ({ ...prev, chequeNo: e.target.value }))}
                    className="pro-input"
                  />
                </div>
                <div className="form-group">
                  <label>Bank Name</label>
                  <input
                    type="text"
                    placeholder="Bank Name"
                    value={doc.bankName || ''}
                    onChange={e => setDoc(prev => ({ ...prev, bankName: e.target.value }))}
                    className="pro-input"
                  />
                </div>
              </div>
            )}

            {(doc.paymentType === 'BANK TRANSFER' || doc.paymentType === 'ONLINE') && (
              <div className="form-group alert-subbox">
                <label>Transaction / UTR Reference No.</label>
                <input
                  type="text"
                  placeholder="Transaction ID / UTR No."
                  value={doc.transactionRef || ''}
                  onChange={e => setDoc(prev => ({ ...prev, transactionRef: e.target.value }))}
                  className="pro-input"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card 3: Line Items */}
      <div className="form-card items-card">
        <div className="form-card-header">
          <div className="form-card-title-group">
            <div className="card-icon-avatar items-icon">
              <Package size={18} />
            </div>
            <div>
              <h3 className="form-card-title">Expense Particulars / Line Items</h3>
              <p className="form-card-desc">{doc.items.length} item{doc.items.length !== 1 ? 's' : ''} listed</p>
            </div>
          </div>

          <button type="button" className="btn-outline-cta" onClick={addItemRow}>
            <Plus size={14} /> Add Line Item
          </button>
        </div>

        <div className="table-responsive">
          <table className="items-entry-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                <th>PARTICULARS / DESCRIPTION <span className="req">*</span></th>
                <th style={{ width: '110px' }}>HSN / SAC</th>
                <th style={{ width: '90px' }}>QTY</th>
                <th style={{ width: '100px' }}>UNIT</th>
                <th style={{ width: '120px' }}>RATE (₹)</th>
                {doc.isGstEnabled && <th style={{ width: '100px' }}>GST %</th>}
                {doc.isGstEnabled && <th style={{ width: '110px' }}>TAX (₹)</th>}
                <th style={{ width: '130px', textAlign: 'right' }}>TOTAL (₹)</th>
                <th style={{ width: '50px', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((item, idx) => (
                <tr key={item.id}>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#94a3b8' }}>{idx + 1}</td>
                  <td>
                    <input
                      type="text"
                      placeholder="Enter item or service name..."
                      value={item.name}
                      onChange={e => handleItemChange(item.id, 'name', e.target.value)}
                      className="item-name-input"
                    />
                    <input
                      type="text"
                      placeholder="Line note / remark (optional)..."
                      value={item.note || ''}
                      onChange={e => handleItemChange(item.id, 'note', e.target.value)}
                      className="item-note-input"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="HSN/SAC"
                      value={item.hsnCode || ''}
                      onChange={e => handleItemChange(item.id, 'hsnCode', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.quantity}
                      onChange={e => handleItemChange(item.id, 'quantity', e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      value={item.unit}
                      onChange={e => handleItemChange(item.id, 'unit', e.target.value)}
                    >
                      <option value="NOS">NOS</option>
                      <option value="PCS">PCS</option>
                      <option value="PKT">PKT</option>
                      <option value="BOX">BOX</option>
                      <option value="MTR">MTR</option>
                      <option value="KG">KG</option>
                      <option value="LTR">LTR</option>
                      <option value="HR">HR</option>
                      <option value="DAY">DAY</option>
                      <option value="SET">SET</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.rate}
                      onChange={e => handleItemChange(item.id, 'rate', e.target.value)}
                    />
                  </td>
                  {doc.isGstEnabled && (
                    <td>
                      <select
                        value={item.taxRate}
                        onChange={e => handleItemChange(item.id, 'taxRate', e.target.value)}
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </td>
                  )}
                  {doc.isGstEnabled && (
                    <td style={{ fontWeight: 600, color: '#475569' }}>
                      ₹{(Number(item.taxAmount) || 0).toFixed(2)}
                    </td>
                  )}
                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                    ₹{(Number(item.amount) || 0).toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {doc.items.length > 1 && (
                      <button type="button" className="remove-line-btn" onClick={() => removeItemRow(item.id)}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-footer-actions">
          <button type="button" className="btn-add-item-dashed" onClick={addItemRow}>
            <Plus size={16} /> Add Another Item
          </button>
        </div>
      </div>

      {/* Card 4: Summary & Settlement */}
      <div className="bottom-details-row">
        <div className="notes-column">
          <div className="form-card">
            <h4 className="block-label"><FileText size={16} /> Internal Remarks &amp; Voucher Notes</h4>
            <textarea
              rows={3}
              placeholder="Add any internal remarks or justification for this expense..."
              value={doc.documentNote}
              onChange={e => setDoc(prev => ({ ...prev, documentNote: e.target.value }))}
              className="pro-textarea"
            />

            <h4 className="block-label" style={{ marginTop: '1.25rem' }}>Terms &amp; Conditions</h4>
            <textarea
              rows={2}
              value={doc.termsDetail}
              onChange={e => setDoc(prev => ({ ...prev, termsDetail: e.target.value }))}
              className="pro-textarea"
            />
          </div>
        </div>

        <div className="summary-column">
          <div className="summary-calculation-card">
            <h4 className="summary-title">Financial Summary</h4>

            <div className="calc-row">
              <span>Subtotal / Taxable Value</span>
              <span style={{ fontWeight: 700 }}>₹{doc.totalTaxable.toFixed(2)}</span>
            </div>

            {doc.isGstEnabled && (
              <div className="calc-row">
                <span>GST Tax</span>
                <span style={{ fontWeight: 700 }}>₹{doc.totalTax.toFixed(2)}</span>
              </div>
            )}

            <div className="calc-row roundoff-row">
              <label className="roundoff-label">
                <input
                  type="checkbox"
                  checked={doc.roundOff}
                  onChange={e => setDoc(prev => ({ ...prev, roundOff: e.target.checked }))}
                />
                <span>Round Off</span>
              </label>
              <span style={{ color: '#64748b' }}>
                ₹{(doc.grandTotal - (doc.totalTaxable + doc.totalTax)).toFixed(2)}
              </span>
            </div>

            <div className="grand-total-banner">
              <div>
                <span className="grand-total-label">GRAND TOTAL</span>
                <div className="grand-amount">₹{doc.grandTotal.toFixed(2)}</div>
              </div>
              <span className="payment-mode-indicator">{doc.paymentType}</span>
            </div>

            <div className="amount-words-box">
              <span className="words-title">TOTAL IN WORDS</span>
              <span className="words-text">{numberToWords(doc.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Footer */}
      <div className="sticky-action-bar print-hide">
        <button type="button" className="btn btn-outline" onClick={() => navigate('/expenses/daily')}>
          <ArrowLeft size={16} /> Back to List
        </button>
        <div className="sticky-summary-text">
          <span>Total: <strong>₹{doc.grandTotal.toFixed(2)}</strong></span>
          <span className="sticky-divider">•</span>
          <span>Payment: <strong>{doc.paymentType}</strong></span>
        </div>
        <div className="sticky-right-actions">
          <button type="button" className="btn btn-print-cta" onClick={() => handleSave(true)} disabled={isSubmitting}>
            <Printer size={16} /> Save &amp; Print
          </button>
          <button type="button" className="btn btn-save-primary" onClick={() => handleSave(false)} disabled={isSubmitting}>
            <Check size={16} /> {isSubmitting ? 'Saving...' : 'Save Expense'}
          </button>
        </div>
      </div>

      {/* Contact Creation Modal */}
      {showContactModal && (
        <ContactModal
          onClose={() => setShowContactModal(false)}
          onContactCreated={handleContactCreated}
        />
      )}

      {/* Print View Modal */}
      {printDoc && (
        <PrintViewModal
          doc={printDoc}
          onClose={() => {
            setPrintDoc(null);
            navigate('/expenses/daily');
          }}
        />
      )}
    </div>
  );
};

export default AddDailyExpense;

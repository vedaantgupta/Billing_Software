import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { getItems, addItem, updateItem, getDB } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import { postToLedger } from '../utils/ledger';
import ProductModal from '../components/ProductModal';
import ContactModal from '../components/ContactModal';
import './SaleInvoice.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const SALE_INVOICE_TYPES = [
  'Regular Sale',
  'Service Invoice',
  'Export Invoice',
  'Deemed Export',
  'SEZ with Payment',
  'SEZ without Payment',
];

const DELIVERY_MODES = ['Hand Delivery', 'Courier', 'Transport', 'Self Pickup', 'Speed Post'];

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

const TAX_RATES = [0, 5, 12, 18, 28];

const BLANK_ITEM = () => ({
  productId: '',
  name: '',
  barcodeNo: '',
  hsn: '',
  quantity: 1,
  unit: 'PCS',
  rate: 0,
  discountPercent: 0,
  taxRate: 0,
  amount: 0,
  taxAmount: 0,
  note: '',
});



// ─── Number → Words ──────────────────────────────────────────────────────────

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

function futureDateIso(days) {
  return new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
}

// ─── Component ───────────────────────────────────────────────────────────────

const SaleInvoice = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [activeItemIdx, setActiveItemIdx] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [additionalChargeModal, setAdditionalChargeModal] = useState(false);
  const [additionalChargeName, setAdditionalChargeName] = useState('Freight');
  const [additionalChargeValue, setAdditionalChargeValue] = useState('');
  const [companySettings, setCompanySettings] = useState(null);

  // ── document state ──
  const [doc, setDoc] = useState({
    docType: 'Sale Invoice',
    customerId: '',
    customerInfo: {
      ms: '',
      address: '',
      contactPerson: '',
      phoneNo: '',
      gstinPan: '',
      revCharge: 'No',
      shipTo: '',
      placeOfSupply: 'Madhya Pradesh',
    },
    invoiceDetail: {
      invoiceType: 'Regular Sale',
      invoiceNo: '',
      date: todayIso(),
      challanNo: '',
      challanDate: '',
      poNo: '',
      poDate: '',
      lrNo: '',
      ewayNo: '',
      deliveryMode: '',
    },
    items: [BLANK_ITEM()],
    dueDate: futureDateIso(15),
    termsTitle: 'Terms & Condition',
    termsDetail: 'Subject to our home Jurisdiction. Our Responsibility Ceases as soon as goods leaves our Premises.',
    documentNote: '',
    taxable: 0,
    additionalCharge: 0,
    additionalChargeName: '',
    totalTaxable: 0,
    totalTax: 0,
    tcs: { mode: '+', value: '', unit: '%' },
    discount: { mode: '-', value: '', unit: 'Rs' },
    roundOff: true,
    grandTotal: 0,
    paymentType: 'CREDIT',
  });

  // ── Load master data ──
  const loadMasterData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [contactList, productList] = await Promise.all([
        getItems('contacts', user.id),
        getItems('products', user.id),
      ]);
      setCustomers(contactList.filter(c => c.type === 'customer' || !c.type));
      setProducts(productList);
      
      const db = getDB();
      if (db.company) {
        setCompanySettings(db.company);
      }

      if (id) {
        const docs = await getItems('documents', user.id);
        const existing = docs.find(d => d._dbId === id || d.id === id);
        if (existing) setDoc(existing);
      }
    } catch (err) {
      console.error('Failed to load master data:', err);
    }
  }, [user?.id, id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadMasterData();
      setLoading(false);
    };
    init();
  }, [loadMasterData]);

  // ── Recalculate totals ──
  useEffect(() => {
    const taxableTotal = doc.items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const taxSum = doc.items.reduce((acc, item) => acc + (Number(item.taxAmount) || 0), 0);
    const totalTaxable = taxableTotal + (Number(doc.additionalCharge) || 0);

    const tcsVal = Number(doc.tcs.value) || 0;
    let tcsAmt = doc.tcs.unit === '%' ? totalTaxable * (tcsVal / 100) : tcsVal;
    if (doc.tcs.mode === '-') tcsAmt = -Math.abs(tcsAmt);
    else tcsAmt = Math.abs(tcsAmt);

    const discVal = Number(doc.discount.value) || 0;
    let discAmt = doc.discount.unit === '%' ? totalTaxable * (discVal / 100) : discVal;
    discAmt = -Math.abs(discAmt);

    const rawTotal = totalTaxable + taxSum + tcsAmt + discAmt;
    const grandTotal = doc.roundOff ? Math.round(rawTotal) : Math.round(rawTotal * 100) / 100;

    setDoc(prev => ({
      ...prev,
      taxable: taxableTotal,
      totalTaxable,
      totalTax: taxSum,
      grandTotal
    }));
  }, [doc.items, doc.additionalCharge, doc.tcs, doc.discount, doc.roundOff]);

  const handleCustomerChange = (e) => {
    const cId = e.target.value;
    const c = customers.find(x => x.id === cId || x._dbId === cId || x._id === cId);
    if (c) {
      setDoc(prev => ({
        ...prev,
        customerId: cId,
        customerInfo: {
          ms: c.companyName || c.customerName || c.name || '',
          address: c.address || '',
          contactPerson: c.customerName || c.name || '',
          phoneNo: c.phone || '',
          gstinPan: c.gstin || '',
          revCharge: 'No',
          shipTo: '',
          placeOfSupply: c.state || 'Madhya Pradesh',
        },
      }));
    } else {
      setDoc(prev => ({ ...prev, customerId: cId }));
    }
  };

  const handleNested = (category, field, value) => {
    setDoc(prev => ({ ...prev, [category]: { ...prev[category], [field]: value } }));
  };

  const handleItemChange = (idx, field, value) => {
    const items = [...doc.items];
    const item = { ...items[idx] };

    if (field === 'productId') {
      const p = products.find(x => x.id === value || x._dbId === value || x._id === value);
      if (p) {
        item.productId = value;
        item.name = p.name;
        item.hsn = p.hsn || '';
        item.unit = p.unit || 'PCS';
        item.image = p.image || '';
        item.rate = Number(p.sellingPrice) || 0;
        item.taxRate = Number(p.taxRate) || 0;
      }
    } else {
      item[field] = value;
    }

    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const disc = Number(item.discountPercent) || 0;
    const tax = Number(item.taxRate) || 0;

    const base = qty * rate;
    const discAmt = base * (disc / 100);
    const taxable = base - discAmt;

    item.amount = taxable;
    item.taxAmount = taxable * (tax / 100);

    items[idx] = item;
    setDoc(prev => ({ ...prev, items }));
  };

  const addItem_ = () => setDoc(prev => ({ ...prev, items: [...prev.items, BLANK_ITEM()] }));
  const removeItem = (idx) => {
    if (doc.items.length === 1) return;
    const items = [...doc.items];
    items.splice(idx, 1);
    setDoc(prev => ({ ...prev, items }));
  };

  const handleSave = async (print = false) => {
    if (!user?.id) return;
    if (!doc.customerId) { alert('Please select a customer.'); return; }
    if (!doc.invoiceDetail.invoiceNo) { alert('Please enter Sale Invoice No.'); return; }

    setIsSubmitting(true);
    try {
      const invoiceNumber = `SINV-${doc.invoiceDetail.invoiceNo}`;
      const finalDoc = {
        ...doc,
        invoiceNumber,
        date: doc.invoiceDetail.date,
        total: doc.grandTotal,
        customerName: doc.customerInfo.ms,
        status: 'Outstanding',
      };

      if (id) {
        // Editing existing — just update the document, no duplicate ledger entry
        await updateItem('documents', id, finalDoc, user.id);
      } else {
        // New invoice — save document then auto-post to ledger
        await addItem('documents', finalDoc, user.id);

        // Auto-post: Customer owes you → Debit (Dr)
        if (doc.customerId && doc.grandTotal > 0) {
          await postToLedger({
            contactId: doc.customerId,
            contactName: doc.customerInfo.ms,
            type: 'dr',
            amount: doc.grandTotal,
            date: doc.invoiceDetail.date,
            description: `Sale Invoice ${invoiceNumber} raised`,
            referenceId: invoiceNumber,
            docType: 'Sale Invoice',
          }, user.id);
        }
      }
      navigate('/documents');
    } catch (err) {
      alert('Failed to save Sale Invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactSaved = async (newContact) => {
    await loadMasterData();
    const cid = newContact.id || newContact._id || newContact._dbId;
    setDoc(prev => ({
      ...prev,
      customerId: cid,
      customerInfo: {
        ms: newContact.companyName || newContact.customerName || newContact.name || '',
        address: newContact.address || '',
        contactPerson: newContact.customerName || newContact.name || '',
        phoneNo: newContact.phone || '',
        gstinPan: newContact.gstin || '',
        revCharge: 'No',
        shipTo: '',
        placeOfSupply: newContact.state || 'Madhya Pradesh',
      },
    }));
  };

  // ── Summary totals ──
  const totalQty = doc.items.reduce((a, i) => a + (Number(i.quantity) || 0), 0);
  const totalPrice = doc.items.reduce((a, i) => a + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0);
  const totalTaxSum = doc.items.reduce((a, i) => a + (Number(i.taxAmount) || 0), 0);
  const totalInvVal = doc.items.reduce((a, i) => a + (Number(i.amount) || 0) + (Number(i.taxAmount) || 0), 0);

  const roundOffAmt = (() => {
    const taxable = doc.items.reduce((a, i) => a + (Number(i.amount) || 0), 0);
    const totalTax = doc.items.reduce((a, i) => a + (Number(i.taxAmount) || 0), 0);
    const totalTaxable = taxable + (Number(doc.additionalCharge) || 0);
    const tcsVal = Number(doc.tcs.value) || 0;
    let tcsAmt = doc.tcs.unit === '%' ? totalTaxable * (tcsVal / 100) : tcsVal;
    if (doc.tcs.mode === '-') tcsAmt = -Math.abs(tcsAmt); else tcsAmt = Math.abs(tcsAmt);
    const discVal = Number(doc.discount.value) || 0;
    let discAmt = doc.discount.unit === '%' ? totalTaxable * (discVal / 100) : discVal;
    discAmt = -Math.abs(discAmt);
    const rawTotal = totalTaxable + totalTax + tcsAmt + discAmt;
    return doc.roundOff ? Math.round(rawTotal) - rawTotal : 0;
  })();

  if (loading && user) {
    return (
      <div className="si-loading">
        <div className="si-loading-spinner" />
        Loading Sale Invoice...
      </div>
    );
  }

  return (
    <div className="si-page">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="si-header">
        <div className="si-header-left">
          <div className="si-badge">💎 Sale</div>
          <div>
            <div className="si-title">Sale Invoice</div>
            <div className="si-subtitle">
              {id ? `Editing • SINV-${doc.invoiceDetail.invoiceNo}` : 'Create New Sale Invoice'}
            </div>
          </div>
        </div>
        <div className="si-header-actions">
          <button className="si-btn si-btn-ghost" onClick={() => navigate('/documents')}>
            ← Back
          </button>
        </div>
      </div>

      {/* ── Top Two-Column: Customer Info + Invoice Detail ────── */}
      <div className="si-top-grid">

        {/* Customer Information */}
        <div className="si-card">
          <div className="si-card-header">
            <div className="si-card-header-left">
              <div className="si-card-icon vendor">👤</div>
              <div>
                <div className="si-card-title">Customer Information</div>
                <div className="si-card-subtitle">Buyer details</div>
              </div>
            </div>
            <button className="si-menu-btn" title="Options">⋮</button>
          </div>
          <div className="si-card-body">

            {/* M/S */}
            <div className="si-field-row">
              <label className="si-label">M/S.<span className="req">*</span></label>
              <div className="si-ms-row">
                <select className="si-select" value={doc.customerId} onChange={handleCustomerChange}>
                  <option value="">Select Customer</option>
                  {customers.map(c => (
                    <option key={c.id || c._id || c._dbId} value={c.id || c._id || c._dbId}>{c.companyName || c.customerName || c.name}</option>
                  ))}
                </select>
                <button className="si-ms-add-btn" title="Add Customer" onClick={() => setShowContactModal(true)}>
                  +
                </button>
              </div>
            </div>

            {/* Address */}
            <div className="si-field-row align-top">
              <label className="si-label">Address</label>
              <textarea
                className="si-textarea"
                rows={3}
                value={doc.customerInfo.address}
                onChange={e => handleNested('customerInfo', 'address', e.target.value)}
                placeholder="Customer address..."
              />
            </div>

            {/* Contact Person */}
            <div className="si-field-row">
              <label className="si-label">Contact Person</label>
              <input
                className="si-input"
                placeholder="Contact Person"
                value={doc.customerInfo.contactPerson}
                onChange={e => handleNested('customerInfo', 'contactPerson', e.target.value)}
              />
            </div>

            {/* Phone No */}
            <div className="si-field-row">
              <label className="si-label">Phone No</label>
              <input
                className="si-input"
                placeholder="Phone No"
                value={doc.customerInfo.phoneNo}
                onChange={e => handleNested('customerInfo', 'phoneNo', e.target.value)}
              />
            </div>

            {/* GSTIN / PAN */}
            <div className="si-field-row">
              <label className="si-label">GSTIN / PAN</label>
              <input
                className="si-input"
                placeholder="GSTIN / PAN"
                value={doc.customerInfo.gstinPan}
                onChange={e => handleNested('customerInfo', 'gstinPan', e.target.value.toUpperCase())}
              />
            </div>

            {/* Rev. Charge */}
            <div className="si-field-row">
              <label className="si-label">Rev. Charge</label>
              <select
                className="si-select"
                value={doc.customerInfo.revCharge}
                onChange={e => handleNested('customerInfo', 'revCharge', e.target.value)}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            {/* Ship To */}
            <div className="si-field-row">
              <label className="si-label">Ship To</label>
              <select
                className="si-select"
                value={doc.customerInfo.shipTo}
                onChange={e => handleNested('customerInfo', 'shipTo', e.target.value)}
              >
                <option value="">--</option>
                <option value="Same as Billing">Same as Billing</option>
              </select>
            </div>

            {/* Place of Supply */}
            <div className="si-field-row">
              <label className="si-label">Place of Supply<span className="req">*</span></label>
              <select
                className="si-select"
                value={doc.customerInfo.placeOfSupply}
                onChange={e => handleNested('customerInfo', 'placeOfSupply', e.target.value)}
              >
                {Object.keys(STATE_CODES).sort().map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Sale Invoice Detail */}
        <div className="si-card">
          <div className="si-card-header">
            <div className="si-card-header-left">
              <div className="si-card-icon detail">📄</div>
              <div>
                <div className="si-card-title">Sale Invoice Detail</div>
                <div className="si-card-subtitle">Invoice metadata &amp; references</div>
              </div>
            </div>
            <button
              className="si-reset-btn"
              title="Reset Invoice Detail"
              onClick={() => setDoc(prev => ({
                ...prev,
                invoiceDetail: {
                  invoiceType: 'Regular Sale',
                  invoiceNo: '',
                  date: todayIso(),
                  challanNo: '',
                  challanDate: '',
                  poNo: '',
                  poDate: '',
                  lrNo: '',
                  ewayNo: '',
                  deliveryMode: '',
                },
              }))}
            >
              ↺
            </button>
          </div>
          <div className="si-card-body">

            {/* Sale Invoice Type */}
            <div className="si-field-row">
              <label className="si-label">Sale Invoice Type</label>
              <select
                className="si-select"
                value={doc.invoiceDetail.invoiceType}
                onChange={e => handleNested('invoiceDetail', 'invoiceType', e.target.value)}
              >
                {SALE_INVOICE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Invoice No + Date */}
            <div className="si-invoice-no-row" style={{ display: 'grid', gridTemplateColumns: '130px 1fr', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
              <label className="si-label">
                Sale Invoice No.<span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                <input
                  className="si-no-input"
                  style={{ flex: 1, padding: '0.42rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.82rem', fontFamily: 'Inter, sans-serif' }}
                  placeholder="Invoice No."
                  value={doc.invoiceDetail.invoiceNo}
                  onChange={e => handleNested('invoiceDetail', 'invoiceNo', e.target.value)}
                />
                <div className="si-date-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="si-date-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Date<span style={{ color: '#ef4444' }}>*</span></span>
                  <input
                    type="date"
                    className="si-date-input"
                    style={{ width: '140px', padding: '0.42rem 0.65rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.82rem' }}
                    value={doc.invoiceDetail.date}
                    onChange={e => handleNested('invoiceDetail', 'date', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Challan No + Challan Date */}
            <div className="si-field-row two-col">
              <label className="si-label">Challan No.</label>
              <input
                className="si-input"
                placeholder="Challan No."
                value={doc.invoiceDetail.challanNo}
                onChange={e => handleNested('invoiceDetail', 'challanNo', e.target.value)}
              />
              <label className="si-label">Challan Date</label>
              <input
                type="date"
                className="si-input"
                value={doc.invoiceDetail.challanDate}
                onChange={e => handleNested('invoiceDetail', 'challanDate', e.target.value)}
              />
            </div>

            {/* P.O. No + P.O. Date */}
            <div className="si-field-row two-col">
              <label className="si-label">P.O. No.</label>
              <input
                className="si-input"
                placeholder="P.O. No."
                value={doc.invoiceDetail.poNo}
                onChange={e => handleNested('invoiceDetail', 'poNo', e.target.value)}
              />
              <label className="si-label">P.O. Date</label>
              <input
                type="date"
                className="si-input"
                value={doc.invoiceDetail.poDate}
                onChange={e => handleNested('invoiceDetail', 'poDate', e.target.value)}
              />
            </div>

            {/* L.R. No + E-Way No */}
            <div className="si-field-row two-col">
              <label className="si-label">L.R. No.</label>
              <input
                className="si-input"
                placeholder="L.R. No."
                value={doc.invoiceDetail.lrNo}
                onChange={e => handleNested('invoiceDetail', 'lrNo', e.target.value)}
              />
              <label className="si-label">E-Way No.</label>
              <input
                className="si-input"
                placeholder="E-Way No."
                value={doc.invoiceDetail.ewayNo}
                onChange={e => handleNested('invoiceDetail', 'ewayNo', e.target.value)}
              />
            </div>

            <div className="si-divider" style={{ height: '1px', background: '#f1f5f9', margin: '0.8rem 0' }} />

            {/* Delivery */}
            <div className="si-field-row">
              <label className="si-label">Delivery</label>
              <select
                className="si-select"
                value={doc.invoiceDetail.deliveryMode}
                onChange={e => handleNested('invoiceDetail', 'deliveryMode', e.target.value)}
              >
                <option value="">Select Delivery Mode</option>
                {DELIVERY_MODES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

          </div>
        </div>
      </div>

      {/* ── Product Items Table ──────────────────────────────── */}
      <div className="si-table-card">
        <div className="si-table-header">
          <div className="si-card-header-left">
            <div className="si-card-icon items">📦</div>
            <div>
              <div className="si-card-title">Product Items</div>
              <div className="si-card-subtitle">{doc.items.length} item{doc.items.length !== 1 ? 's' : ''}</div>
            </div>
          </div>

          <div className="si-summary-actions">
            <div className="si-discount-toggle">
              <span className="si-toggle-label" style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', marginRight: '0.5rem' }}>Discount :</span>
              <span
                className={`si-toggle-chip ${doc.discount.unit === 'Rs' ? 'active' : ''}`}
                onClick={() => handleNested('discount', 'unit', 'Rs')}
              >Rs</span>
              <span
                className={`si-toggle-chip ${doc.discount.unit === '%' ? 'active' : ''}`}
                onClick={() => handleNested('discount', 'unit', '%')}
              >%</span>
            </div>
            <button className="si-add-item-btn" onClick={addItem_}>
              <span>+</span> Add Item
            </button>
            <button className="si-menu-btn">⋮</button>
          </div>
        </div>

        <div className="si-table-scroll" style={{ overflowX: 'auto' }}>
          <table className="si-product-table">
            <colgroup>
              <col style={{ width: '45px' }} />
              <col style={{ width: 'auto' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '85px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '40px' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>SR.</th>
                <th>PRODUCT / OTHER CHARGES</th>
                <th>BARCODE NO.</th>
                <th>HSN/SAC CODE</th>
                <th>QTY.</th>
                <th>UOM</th>
                <th>PRICE (RS)</th>
                <th>IGST</th>
                <th>TOTAL</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="si-sr-num" style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>{idx + 1}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select
                        className="si-cell-select"
                        style={{ flex: 1 }}
                        value={item.productId}
                        onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                      >
                        <option value="">Enter Product name</option>
                        {products.map(p => (
                          <option key={p.id || p._id || p._dbId} value={p.id || p._id || p._dbId}>{p.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="si-ms-add-btn"
                        style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => {
                          setActiveItemIdx(idx);
                          setShowAddProduct(true);
                        }}
                      >
                        +
                      </button>
                    </div>
                    <textarea
                      className="si-cell-note"
                      rows={2}
                      placeholder="Item Note..."
                      value={item.note}
                      onChange={e => handleItemChange(idx, 'note', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="si-cell-input"
                      placeholder="Barcode No."
                      value={item.barcodeNo}
                      onChange={e => handleItemChange(idx, 'barcodeNo', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="si-cell-input"
                      placeholder="HSN/SAC"
                      value={item.hsn}
                      onChange={e => handleItemChange(idx, 'hsn', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="si-cell-input"
                      style={{ textAlign: 'center' }}
                      placeholder="Qty."
                      value={item.quantity}
                      min={0}
                      onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="si-cell-input"
                      style={{ textAlign: 'center' }}
                      placeholder="UOM"
                      value={item.unit}
                      onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="si-cell-input"
                      style={{ textAlign: 'right' }}
                      placeholder="Price"
                      value={item.rate}
                      min={0}
                      onChange={e => handleItemChange(idx, 'rate', e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      className="si-cell-select"
                      value={item.taxRate}
                      onChange={e => handleItemChange(idx, 'taxRate', e.target.value)}
                    >
                      <option value="0">--</option>
                      {TAX_RATES.filter(r => r > 0).map(r => (
                        <option key={r} value={r}>{r}%</option>
                      ))}
                    </select>
                    <div className="si-tax-display" style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center', marginTop: '3px' }}>{(item.taxAmount || 0).toFixed(2)}</div>
                  </td>
                  <td>
                    <div className="si-total-value" style={{ background: '#f0fdf4', padding: '0.38rem 0.6rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#059669', textAlign: 'right' }}>
                      {((item.amount || 0) + (item.taxAmount || 0)).toFixed(2)}
                    </div>
                  </td>
                  <td>
                    <button className="si-remove-btn" onClick={() => removeItem(idx)} title="Remove item">
                      ×
                    </button>
                  </td>
                </tr>
              ))}

              {/* Summary row */}
              <tr className="si-total-inv-row">
                <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700, color: '#92400e', paddingRight: '0.75rem' }}>Total Inv. Val</td>
                <td></td>
                <td></td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{totalQty}</td>
                <td></td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{totalPrice.toFixed(2)}</td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{totalTaxSum.toFixed(2)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>{totalInvVal.toFixed(2)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Horizontal scroll hint */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem', color: '#cbd5e1', fontSize: '0.7rem' }}>
          ← scroll →
        </div>
      </div>

      {/* ── Bottom Grid: Left (Meta/Terms) + Right (Totals) ── */}
      <div className="si-bottom-grid">

        {/* LEFT: Meta + Terms */}
        <div className="si-left-bottom">

          {/* Due Date */}
          <div className="si-due-date-row" style={{ display: 'grid', gridTemplateColumns: '100px 1fr', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <label className="si-label">Due Date</label>
            <input
              type="date"
              className="si-input yellow-bg"
              style={{ background: '#fffbeb' }}
              value={doc.dueDate}
              onChange={e => setDoc(prev => ({ ...prev, dueDate: e.target.value }))}
            />
          </div>

          <div className="si-divider" style={{ height: '1px', background: '#f1f5f9', margin: '0.8rem 0' }} />

          {/* Terms & Condition */}
          <div className="si-terms-section" style={{ marginTop: '1rem' }}>
            <div className="si-section-title" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '3px', height: '14px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '2px' }}></span>
              Terms &amp; Condition / Additional Note
            </div>
            <div className="si-terms-row" style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
              <label className="si-label">Title</label>
              <input
                className="si-input"
                value={doc.termsTitle}
                onChange={e => setDoc(prev => ({ ...prev, termsTitle: e.target.value }))}
              />
            </div>
            <div className="si-terms-row align-top" style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.6rem' }}>
              <label className="si-label">Detail</label>
              <textarea
                className="si-textarea"
                rows={3}
                placeholder="Enter terms &amp; condition"
                value={doc.termsDetail}
                onChange={e => setDoc(prev => ({ ...prev, termsDetail: e.target.value }))}
              />
            </div>
            <button className="si-add-notes-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem', border: '2px dashed #e2e8f0', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', cursor: 'pointer', background: 'transparent' }}>
              + Add Notes
            </button>
          </div>

          <div className="si-divider" style={{ marginTop: '1rem' }} />

          {/* Document Note */}
          <div className="si-doc-note-row" style={{ display: 'grid', gridTemplateColumns: '130px 1fr', alignItems: 'flex-start', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
            <div className="si-doc-note-label" style={{ display: 'flex', flexDirection: 'column' }}>
              <label className="si-label">Document Note / Remarks</label>
              <span className="si-label-italic" style={{ fontSize: '0.68rem', fontStyle: 'italic', color: '#cbd5e1' }}>Not Visible on Print</span>
            </div>
            <textarea
              className="si-textarea"
              rows={3}
              value={doc.documentNote}
              onChange={e => setDoc(prev => ({ ...prev, documentNote: e.target.value }))}
            />
          </div>
        </div>

        {/* RIGHT: Totals Panel */}
        <div className="si-right-bottom">

          {/* Taxable */}
          <div className="si-totals-row">
            <span className="si-totals-label">Taxable</span>
            <span className="si-totals-value">{doc.taxable.toFixed(2)}</span>
          </div>

          {/* Add Additional Charge */}
          <div
            className="si-add-charge-link"
            onClick={() => setAdditionalChargeModal(true)}
          >
            Add Additional Charge
          </div>

          {doc.additionalCharge > 0 && (
            <div className="si-totals-row">
              <span className="si-totals-label">{doc.additionalChargeName || 'Additional Charge'}</span>
              <span className="si-totals-value">{Number(doc.additionalCharge).toFixed(2)}</span>
            </div>
          )}

          {/* Total Taxable */}
          <div className="si-totals-row">
            <span className="si-totals-label">Total Taxable</span>
            <span className="si-totals-value">{doc.totalTaxable.toFixed(2)}</span>
          </div>

          {/* Total Tax */}
          <div className="si-totals-row">
            <span className="si-totals-label">Total Tax</span>
            <span className="si-totals-value">{doc.totalTax.toFixed(2)}</span>
          </div>

          {/* TCS Row */}
          <div className="si-modifier-row">
            <span className="si-modifier-label">TCS</span>
            <select
              className="si-modifier-select"
              value={doc.tcs.mode}
              onChange={e => handleNested('tcs', 'mode', e.target.value)}
            >
              <option value="+">+</option>
              <option value="-">-</option>
            </select>
            <input
              type="number"
              className="si-modifier-input"
              placeholder="0"
              value={doc.tcs.value}
              min={0}
              onChange={e => handleNested('tcs', 'value', e.target.value)}
            />
            <select
              className="si-modifier-unit"
              value={doc.tcs.unit}
              onChange={e => handleNested('tcs', 'unit', e.target.value)}
            >
              <option value="%">%</option>
              <option value="Rs">Rs</option>
            </select>
          </div>

          {/* Discount Row */}
          <div className="si-modifier-row">
            <span className="si-modifier-label">Discount</span>
            <select
              className="si-modifier-select"
              value={doc.discount.mode}
              onChange={e => handleNested('discount', 'mode', e.target.value)}
            >
              <option value="-">-</option>
              <option value="+">+</option>
            </select>
            <input
              type="number"
              className="si-modifier-input"
              placeholder="0"
              value={doc.discount.value}
              min={0}
              onChange={e => handleNested('discount', 'value', e.target.value)}
            />
            <select
              className="si-modifier-unit"
              value={doc.discount.unit}
              onChange={e => handleNested('discount', 'unit', e.target.value)}
            >
              <option value="Rs">Rs</option>
              <option value="%">%</option>
            </select>
          </div>

          {/* Round Off */}
          <div className="si-roundoff-row">
            <div className="si-roundoff-left">
              <span style={{ fontSize: '0.83rem', fontWeight: 600, color: '#475569' }}>Round Off</span>
              <label className="si-toggle-switch">
                <input
                  type="checkbox"
                  checked={doc.roundOff}
                  onChange={e => setDoc(prev => ({ ...prev, roundOff: e.target.checked }))}
                />
                <span className="si-toggle-thumb"></span>
              </label>
            </div>
            <span style={{ fontSize: '0.83rem', fontWeight: 700, color: '#475569' }}>
              {roundOffAmt.toFixed(2)}
            </span>
          </div>

          {/* Grand Total */}
          <div className="si-grand-total">
            <span className="si-grand-label">Grand Total</span>
            <span className="si-grand-value">₹ {doc.grandTotal.toFixed(2)}</span>
          </div>

          {/* Total in words */}
          <div className="si-words-row">
            <div className="si-words-label">Total in words</div>
            <div className="si-words-value">{numberToWords(doc.grandTotal)}</div>
          </div>

          {/* UPI QR Code Preview */}
          {companySettings?.upiId && (
            <div className="si-summary-qr" style={{
              margin: '1rem 0',
              padding: '0.75rem',
              background: '#f1f5f9',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ background: '#fff', padding: '4px', borderRadius: '6px' }}>
                <QRCodeCanvas
                  value={`upi://pay?pa=${companySettings.upiId}&pn=${encodeURIComponent(companySettings.name || 'Business')}&am=${doc.grandTotal}&cu=INR&tn=${encodeURIComponent('Inv ' + (doc.invoiceDetail.invoiceNo || ''))}`}
                  size={64}
                  level="H"
                />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>Payment QR Preview</div>
                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Scannable QR with amount</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#6366f1', marginTop: '2px' }}>{companySettings.upiId}</div>
              </div>
            </div>
          )}

          {/* Payment Type */}
          <div className="si-payment-section">
            <div className="si-payment-label">
              Payment Type<span className="si-payment-req">*</span>
            </div>
            <div className="si-payment-grid">
              {['CREDIT', 'CASH', 'CHEQUE', 'ONLINE'].map(type => (
                <button
                  key={type}
                  className={`si-pay-btn ${type} ${doc.paymentType === type ? 'active' : ''}`}
                  onClick={() => setDoc(prev => ({ ...prev, paymentType: type }))}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Smart Suggestion */}
          <div className="si-smart-box">
            <span className="si-smart-label">Smart Suggestion</span>
            <button className="si-smart-add">+</button>
          </div>

        </div>
      </div>

      {/* ── Footer Actions ──────────────────────────────────────── */}
      <div className="si-footer-actions">
        <button className="si-btn si-btn-back" onClick={() => navigate('/documents')}>
          ← Back
        </button>
        <button
          className="si-btn si-btn-print"
          onClick={() => handleSave(true)}
          disabled={isSubmitting}
        >
          🖨 Save &amp; Print
        </button>
        <button
          className="si-btn si-btn-save"
          onClick={() => handleSave(false)}
          disabled={isSubmitting}
        >
          {isSubmitting ? '⏳ Saving...' : '💾 Save'}
        </button>
      </div>


      {/* ── Additional Charge Modal ──────────────────────────── */}
      {additionalChargeModal && (
        <div className="si-modal-overlay" onClick={() => setAdditionalChargeModal(false)}>
          <div className="si-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="si-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div className="si-modal-title" style={{ margin: 0 }}>Add Additional Charge</div>
              <button style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setAdditionalChargeModal(false)}>✕</button>
            </div>
            <div className="si-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="si-field-row" style={{ display: 'block' }}>
                  <label className="si-label">Charge Name</label>
                  <input
                    className="si-input"
                    value={additionalChargeName}
                    onChange={e => setAdditionalChargeName(e.target.value)}
                    placeholder="e.g. Freight, Packaging"
                  />
                </div>
                <div className="si-field-row" style={{ display: 'block' }}>
                  <label className="si-label">Amount (Rs)</label>
                  <input
                    type="number"
                    className="si-input"
                    value={additionalChargeValue}
                    onChange={e => setAdditionalChargeValue(e.target.value)}
                    placeholder="0"
                    min={0}
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '2rem' }}>
              <button className="si-btn si-btn-back" onClick={() => setAdditionalChargeModal(false)}>Cancel</button>
              <button
                className="si-btn si-btn-save"
                onClick={() => {
                  setDoc(prev => ({
                    ...prev,
                    additionalCharge: Number(additionalChargeValue) || 0,
                    additionalChargeName: additionalChargeName,
                  }));
                  setAdditionalChargeModal(false);
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}


      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        onSave={handleContactSaved}
      />

      <ProductModal
        isOpen={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        onSave={(newP) => {
          setProducts(prev => [...prev, newP]);
          const pid = newP.id || newP._id || newP._dbId;
          if (activeItemIdx !== null) {
            handleItemChange(activeItemIdx, 'productId', pid);
          }
        }}
      />
    </div>
  );
};

export default SaleInvoice;

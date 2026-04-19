import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getItems, addItem, updateItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import { postToLedger } from '../utils/ledger';
import ProductModal from '../components/ProductModal';
import ContactModal from '../components/ContactModal';
import './PurchaseInvoice.css';
import './product-table.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const PURCHASE_INVOICE_TYPES = [
  'Regular Purchase',
  'Import Purchase',
  'RCM Purchase',
  'Exempt / Non-GST',
];

const DELIVERY_MODES = ['Hand Delivery', 'Courier', 'Transport', 'Self Pickup'];

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

// ─── Format date for display ──────────────────────────────────────────────────

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
}

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

function futureDateIso(days) {
  return new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
}

// ─── Component ───────────────────────────────────────────────────────────────

const PurchaseInvoice = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [activeItemIdx, setActiveItemIdx] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [updatePurchasePrice, setUpdatePurchasePrice] = useState(false);
  const [additionalChargeModal, setAdditionalChargeModal] = useState(false);
  const [additionalChargeName, setAdditionalChargeName] = useState('Freight');
  const [additionalChargeValue, setAdditionalChargeValue] = useState('');
  const [notes, setNotes] = useState([]);

  // ── document state ──
  const [doc, setDoc] = useState({
    docType: 'Purchase Invoice',
    vendorId: '',
    vendorInfo: {
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
      invoiceType: '',
      invoiceNo: '',
      date: todayIso(),
      challanNo: '',
      challanDate: '',
      lrNo: '',
      ewayNo: '',
      deliveryMode: '',
    },
    items: [BLANK_ITEM()],
    dueDate: futureDateIso(15),
    termsTitle: 'Terms & Condition',
    termsDetail: '',
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
      const [vendorList, productList] = await Promise.all([
        getItems('contacts', user.id),
        getItems('products', user.id),
      ]);
      setVendors(vendorList.filter(c => c.type === 'vendor' || !c.type));
      setProducts(productList);
    } catch (err) {
      console.error('Failed to load master data:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadMasterData();
      setLoading(false);
    };
    init();
  }, [loadMasterData]);

  // ── Recalculate totals whenever items/modifiers change ──
  useEffect(() => {
    const taxable = doc.items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const totalTax = doc.items.reduce((acc, item) => acc + (Number(item.taxAmount) || 0), 0);
    const totalTaxable = taxable + (Number(doc.additionalCharge) || 0);

    const tcsVal = Number(doc.tcs.value) || 0;
    let tcsAmt = doc.tcs.unit === '%' ? totalTaxable * (tcsVal / 100) : tcsVal;
    if (doc.tcs.mode === '-') tcsAmt = -Math.abs(tcsAmt);
    else tcsAmt = Math.abs(tcsAmt);

    const discVal = Number(doc.discount.value) || 0;
    let discAmt = doc.discount.unit === '%' ? totalTaxable * (discVal / 100) : discVal;
    discAmt = -Math.abs(discAmt); // discount always reduces

    const rawTotal = totalTaxable + totalTax + tcsAmt + discAmt;
    const grandTotal = doc.roundOff ? Math.round(rawTotal) : Math.round(rawTotal * 100) / 100;

    setDoc(prev => ({ ...prev, taxable, totalTaxable, totalTax, grandTotal }));
  }, [doc.items, doc.additionalCharge, doc.tcs, doc.discount, doc.roundOff]);

  // ── Vendor select ──
  const handleVendorChange = (e) => {
    const vId = e.target.value;
    const v = vendors.find(x => x.id === vId);
    if (v) {
      setDoc(prev => ({
        ...prev,
        vendorId: vId,
        vendorInfo: {
          ms: v.companyName || v.customerName || v.name || '',
          address: v.address || '',
          contactPerson: v.customerName || v.name || '',
          phoneNo: v.phone || '',
          gstinPan: v.gstin || '',
          revCharge: 'No',
          shipTo: '',
          placeOfSupply: v.state || 'Madhya Pradesh',
        },
      }));
    } else {
      setDoc(prev => ({ ...prev, vendorId: vId }));
    }
  };

  // ── Nested field change ──
  const handleNested = (category, field, value) => {
    setDoc(prev => ({ ...prev, [category]: { ...prev[category], [field]: value } }));
  };

  // ── Item change ──
  const handleItemChange = (idx, field, value) => {
    const items = [...doc.items];
    const item = { ...items[idx] };

    if (field === 'productId') {
      const p = products.find(x => x.id === value);
      if (p) {
        item.productId = p.id;
        item.name = p.name;
        item.hsn = p.hsn || '';
        item.unit = p.unit || 'PCS';
        item.rate = Number(p.purchasePrice || p.sellingPrice) || 0;
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

  // Add note
  const addNote = () => {
    setNotes(prev => [
      ...prev,
      {
        id: Date.now(),
        title: '',
        detail: ''
      }
    ]);
  };

  // Update note
  const updateNote = (id, field, value) => {
    setNotes(prev =>
      prev.map(n =>
        n.id === id ? { ...n, [field]: value } : n
      )
    );
  };

  // Delete note
  const deleteNote = (id) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const addItem_ = () => setDoc(prev => ({ ...prev, items: [...prev.items, BLANK_ITEM()] }));
  const removeItem = (idx) => {
    if (doc.items.length === 1) return;
    const items = [...doc.items];
    items.splice(idx, 1);
    setDoc(prev => ({ ...prev, items }));
  };

  // ── Save ──
  const handleSave = async (print = false) => {
    if (!user?.id) return;
    if (!doc.invoiceDetail.invoiceNo) { alert('Please enter Purchase Invoice No.'); return; }
    if (doc.items.length === 0) { alert('Please add at least one item.'); return; }

    setIsSubmitting(true);
    try {
      const invoiceNumber = `PUR-${doc.invoiceDetail.invoiceNo}`;
      const finalDoc = {
        ...doc,
        invoiceNumber,
        date: doc.invoiceDetail.date,
        total: doc.grandTotal,
        vendorName: doc.vendorInfo.ms,
        status: 'Outstanding',
      };

      if (id) {
        // Editing existing — just update the document, no duplicate ledger entry
        await updateItem('documents', id, finalDoc, user.id);
      } else {
        // New invoice — save document then auto-post to ledger
        await addItem('documents', finalDoc, user.id);

        // Auto-post: You owe vendor → Credit (Cr)
        if (doc.vendorId && doc.grandTotal > 0) {
          await postToLedger({
            contactId: doc.vendorId,
            contactName: doc.vendorInfo.ms,
            type: 'cr',
            amount: doc.grandTotal,
            date: doc.invoiceDetail.date,
            description: `Purchase Invoice ${invoiceNumber} received`,
            referenceId: invoiceNumber,
            docType: 'Purchase Invoice',
          }, user.id);
        }
      }

      navigate('/documents');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save Purchase Invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Contact saved callback ──
  const handleContactSaved = async (newContact) => {
    await loadMasterData();
    setDoc(prev => ({
      ...prev,
      vendorId: newContact.id,
      vendorInfo: {
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
      <div className="pi-loading">
        <div className="pi-loading-spinner" />
        Loading Purchase Invoice...
      </div>
    );
  }

  return (
    <div className="pi-page">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="pi-header">
        <div className="pi-header-left">
          <div className="pi-badge">🛒 Purchase</div>
          <div>
            <div className="pi-title">Purchase Invoice</div>
            <div className="pi-subtitle">
              {id ? `Editing • PUR-${doc.invoiceDetail.invoiceNo}` : 'Create New Purchase Invoice'}
            </div>
          </div>
        </div>
        <div className="pi-header-actions">
          <button className="pi-btn pi-btn-ghost" onClick={() => navigate('/documents')}>
            ← Back
          </button>
        </div>
      </div>

      {/* ── Top Two-Column: Vendor Info + Invoice Detail ────── */}
      <div className="pi-top-grid">

        {/* Vendor Information */}
        <div className="pi-card">
          <div className="pi-card-header">
            <div className="pi-card-header-left">
              <div className="pi-card-icon vendor">🏪</div>
              <div>
                <div className="pi-card-title">Vendor Information</div>
                <div className="pi-card-subtitle">Supplier details</div>
              </div>
            </div>
            <button className="pi-menu-btn" title="Options">⋮</button>
          </div>
          <div className="pi-card-body">

            {/* M/S */}
            <div className="pi-field-row">
              <label className="pi-label">M/S.<span className="req">*</span></label>
              <div className="pi-ms-row">
                <select className="pi-select" value={doc.vendorId} onChange={handleVendorChange}>
                  <option value="">Select Vendor</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.companyName || v.customerName || v.name}</option>
                  ))}
                </select>
                <button className="pi-ms-add-btn" title="Add Vendor" onClick={() => setShowContactModal(true)}>
                  +
                </button>
              </div>
            </div>

            {/* Address */}
            <div className="pi-field-row align-top">
              <label className="pi-label">Address</label>
              <textarea
                className="pi-textarea"
                rows={3}
                value={doc.vendorInfo.address}
                onChange={e => handleNested('vendorInfo', 'address', e.target.value)}
                placeholder="Vendor address..."
              />
            </div>

            {/* Contact Person */}
            <div className="pi-field-row">
              <label className="pi-label">Contact Person</label>
              <input
                className="pi-input"
                placeholder="Contact Person"
                value={doc.vendorInfo.contactPerson}
                onChange={e => handleNested('vendorInfo', 'contactPerson', e.target.value)}
              />
            </div>

            {/* Phone No */}
            <div className="pi-field-row">
              <label className="pi-label">Phone No</label>
              <input
                className="pi-input"
                placeholder="Phone No"
                value={doc.vendorInfo.phoneNo}
                onChange={e => handleNested('vendorInfo', 'phoneNo', e.target.value)}
              />
            </div>

            {/* GSTIN / PAN */}
            <div className="pi-field-row">
              <label className="pi-label">GSTIN / PAN</label>
              <input
                className="pi-input"
                placeholder="GSTIN / PAN"
                value={doc.vendorInfo.gstinPan}
                onChange={e => handleNested('vendorInfo', 'gstinPan', e.target.value.toUpperCase())}
              />
            </div>

            {/* Rev. Charge */}
            <div className="pi-field-row">
              <label className="pi-label">Rev. Charge</label>
              <select
                className="pi-select"
                value={doc.vendorInfo.revCharge}
                onChange={e => handleNested('vendorInfo', 'revCharge', e.target.value)}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            {/* Ship To */}
            <div className="pi-field-row">
              <label className="pi-label">Ship To</label>
              <select
                className="pi-select"
                value={doc.vendorInfo.shipTo}
                onChange={e => handleNested('vendorInfo', 'shipTo', e.target.value)}
              >
                <option value="">--</option>
                <option value="Same as Billing">Same as Billing</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.companyName || v.customerName}</option>
                ))}
              </select>
            </div>

            {/* Place of Supply */}
            <div className="pi-field-row">
              <label className="pi-label">Place of Supply<span className="req">*</span></label>
              <select
                className="pi-select"
                value={doc.vendorInfo.placeOfSupply}
                onChange={e => handleNested('vendorInfo', 'placeOfSupply', e.target.value)}
              >
                {Object.keys(STATE_CODES).sort().map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Purchase Invoice Detail */}
        <div className="pi-card">
          <div className="pi-card-header">
            <div className="pi-card-header-left">
              <div className="pi-card-icon detail">📋</div>
              <div>
                <div className="pi-card-title">Purchase Invoice Detail</div>
                <div className="pi-card-subtitle">Invoice metadata &amp; references</div>
              </div>
            </div>
            <button
              className="pi-reset-btn"
              title="Reset Invoice Detail"
              onClick={() => setDoc(prev => ({
                ...prev,
                invoiceDetail: {
                  invoiceType: '',
                  invoiceNo: '',
                  date: todayIso(),
                  challanNo: '',
                  challanDate: '',
                  lrNo: '',
                  ewayNo: '',
                  deliveryMode: '',
                },
              }))}
            >
              ↺
            </button>
          </div>
          <div className="pi-card-body">

            {/* Purchase Invoice Type */}
            <div className="pi-field-row">
              <label className="pi-label">Purchase Invoice Type</label>
              <select
                className="pi-select"
                value={doc.invoiceDetail.invoiceType}
                onChange={e => handleNested('invoiceDetail', 'invoiceType', e.target.value)}
              >
                <option value="">-- Select Type --</option>
                {PURCHASE_INVOICE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Invoice No + Date */}
            <div className="pi-field-row two-col">
              <label className="pi-label">
                Purchase Invoice No.<span className="req">*</span>
              </label>

              <input
                className="pi-input"
                placeholder="Invoice No."
                value={doc.invoiceDetail.invoiceNo}
                onChange={e =>
                  handleNested('invoiceDetail', 'invoiceNo', e.target.value)
                }
              />

              <div></div> {/* 🔥 50px GAP */}

              <label className="pi-label">Date</label>

              <input
                type="date"
                className="pi-input"
                value={doc.invoiceDetail.date}
                onChange={e =>
                  handleNested('invoiceDetail', 'date', e.target.value)
                }
              />
            </div>

            {/* Challan No + Challan Date */}
            <div className="pi-field-row two-col">
              <label className="pi-label">Challan No.</label>
              <input
                className="pi-input"
                placeholder="Challan No."
                value={doc.invoiceDetail.challanNo}
                onChange={e =>
                  handleNested('invoiceDetail', 'challanNo', e.target.value)
                }
              />

              <div></div> {/* 🔥 50px GAP */}

              <label className="pi-label">Challan Date</label>
              <input
                className="pi-input"
                placeholder="dd/mm/yy"
                value={doc.invoiceDetail.challanDate}
                onChange={e =>
                  handleNested('invoiceDetail', 'challanDate', e.target.value)
                }
              />
            </div>

            {/* L.R. No + E-Way No */}
            <div className="pi-field-row two-col">
              <label className="pi-label">L.R. No.</label>
              <input
                className="pi-input"
                placeholder="L.R. No."
                value={doc.invoiceDetail.lrNo}
                onChange={e =>
                  handleNested('invoiceDetail', 'lrNo', e.target.value)
                }
              />

              <div></div> {/* 🔥 50px GAP */}

              <label className="pi-label">E-Way No.</label>
              <input
                className="pi-input"
                placeholder="E-Way No."
                value={doc.invoiceDetail.ewayNo}
                onChange={e =>
                  handleNested('invoiceDetail', 'ewayNo', e.target.value)
                }
              />
            </div>

            <div className="pi-divider" />

            {/* Delivery */}
            <div className="pi-field-row">
              <label className="pi-label">Delivery</label>
              <select
                className="pi-select"
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
      <div className="pt-table-card">
        <div className="pt-table-header">
          <div className="pi-card-header-left">
            <div className="pi-card-icon items">📦</div>
            <div>
              <div className="pi-card-title">Product Items</div>
              <div className="pi-card-subtitle">{doc.items.length} item{doc.items.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div className="pt-table-actions">
            <span className="pi-toggle-label" style={{ marginRight: '0.25rem' }}>Discount :</span>
            <div className="pi-discount-toggle">
              <span className="pi-toggle-label">Discount :</span>
              <span
                className={`pi-toggle-chip ${doc.discount.unit === 'Rs' ? 'active' : ''}`}
                onClick={() => handleNested('discount', 'unit', 'Rs')}
              >Rs</span>
              <span
                className={`pi-toggle-chip ${doc.discount.unit === '%' ? 'active' : ''}`}
                onClick={() => handleNested('discount', 'unit', '%')}
              >%</span>
            </div>
            <button className="pi-menu-btn">⋮</button>
          </div>
        </div>

        <div className="pt-table-scroll">
          <table className="pt-product-table">
            <colgroup>
              <col className="sr-col" />
              <col className="product-col" />
              <col className="barcode-col" />
              <col className="hsn-col" />
              <col className="qty-col" />
              <col className="uom-col" />
              <col className="price-col" />
              <col className="igst-col" />
              <col className="total-col" />
              <col className="action-col" />
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
                  <td className="pt-sr-num">{idx + 1}</td>
                  <td>
                    <div className="flex gap-2 items-center">
                      <select
                        className="pt-cell-select"
                        style={{ flex: 1 }}
                        value={item.productId}
                        onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                      >
                        <option value="">Enter Product name</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="pt-cell-add-btn"
                        onClick={() => {
                          setActiveItemIdx(idx);
                          setShowAddProduct(true);
                        }}
                      >
                        +
                      </button>
                    </div>
                    <textarea
                      className="pt-cell-note"
                      rows={2}
                      placeholder="Item Note..."
                      value={item.note}
                      onChange={e => handleItemChange(idx, 'note', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="pt-cell-input"
                      placeholder="Barcode No."
                      value={item.barcodeNo}
                      onChange={e => handleItemChange(idx, 'barcodeNo', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="pt-cell-input"
                      placeholder="HSN/SAC"
                      value={item.hsn}
                      onChange={e => handleItemChange(idx, 'hsn', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="pt-cell-input"
                      style={{ textAlign: 'center' }}
                      placeholder="Qty."
                      value={item.quantity}
                      min={0}
                      onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="pt-cell-input"
                      style={{ textAlign: 'center' }}
                      placeholder="UOM"
                      value={item.unit}
                      onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="pt-cell-input"
                      style={{ textAlign: 'right' }}
                      placeholder="Price"
                      value={item.rate}
                      min={0}
                      onChange={e => handleItemChange(idx, 'rate', e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      className="pt-cell-select"
                      value={item.taxRate}
                      onChange={e => handleItemChange(idx, 'taxRate', e.target.value)}
                    >
                      <option value="0">--</option>
                      {TAX_RATES.filter(r => r > 0).map(r => (
                        <option key={r} value={r}>{r}%</option>
                      ))}
                    </select>
                    <div className="pt-tax-display">{(item.taxAmount || 0).toFixed(2)}</div>
                  </td>
                  <td>
                    <div className="pt-total-value">
                      {((item.amount || 0) + (item.taxAmount || 0)).toFixed(2)}
                    </div>
                  </td>
                  <td>
                    <button className="pt-remove-btn" onClick={() => removeItem(idx)} title="Remove item">
                      ×
                    </button>
                  </td>
                </tr>
              ))}

              {/* Summary row */}
              <tr className="pt-total-inv-row">
                <td colSpan={2} style={{ paddingLeft: '0.5rem', paddingRight: '1rem', borderLeft: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button type="button" className="pt-add-item-btn" onClick={addItem_}>
                      <span>+</span> Add Row
                    </button>
                    <span style={{ fontWeight: 800, color: '#92400e', fontSize: '0.95rem' }}>Total Inv. Val</span>
                  </div>
                </td>
                <td></td>
                <td></td>
                <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '0.9rem' }}>{totalQty}</td>
                <td></td>
                <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.9rem' }}>{totalPrice.toFixed(2)}</td>
                <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '0.9rem' }}>{totalTaxSum.toFixed(2)}</td>
                <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.95rem', color: '#059669' }}>{totalInvVal.toFixed(2)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

      {/* ── Bottom Grid: Left (Meta/Terms) + Right (Totals) ── */}
      <div className="pi-bottom-grid">

        {/* LEFT: Meta + Terms */}
        <div className="pi-left-bottom">

          {/* Due Date */}
          <div className="pi-due-date-row">
            <label className="pi-label">Due Date</label>
            <input
              type="date"
              className="pi-input yellow-bg"
              value={doc.dueDate}
              onChange={e => setDoc(prev => ({ ...prev, dueDate: e.target.value }))}
            />
          </div>

          <div className="pi-divider" />

          {/* Terms & Condition */}
          <div className="pi-terms-section">
            <div className="pi-section-title">Terms &amp; Condition / Additional Note</div>

            {/* Default Title */}
            <div className="pi-terms-row">
              <label className="pi-label">Title</label>
              <input
                className="pi-input"
                value={doc.termsTitle}
                onChange={e => setDoc(prev => ({ ...prev, termsTitle: e.target.value }))}
              />
            </div>

            {/* Default Detail */}
            <div className="pi-terms-row align-top">
              <label className="pi-label">Detail</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <textarea
                  className="pi-textarea"
                  rows={3}
                  placeholder="Enter terms & condition"
                  value={doc.termsDetail}
                  onChange={e => setDoc(prev => ({ ...prev, termsDetail: e.target.value }))}
                  style={{ flex: 1 }}
                />
                <button
                  className="pi-delete-btn"
                  onClick={() => setDoc(prev => ({ ...prev, termsDetail: '' }))}
                  title="Delete Terms"
                >
                  <i className="bi bi-trash3-fill"></i>
                </button>
              </div>
            </div>

            {/* Dynamic Notes */}
            {notes.map(note => (
              <div key={note.id}>
                <div className="pi-terms-row">
                  <label className="pi-label">Title</label>
                  <input
                    className="pi-input"
                    placeholder="Note Title"
                    value={note.title}
                    onChange={(e) => updateNote(note.id, 'title', e.target.value)}
                  />
                </div>
                <div className="pi-terms-row align-top">
                  <label className="pi-label">Detail</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <textarea
                      className="pi-textarea"
                      rows={2}
                      placeholder="Note Detail..."
                      value={note.detail}
                      onChange={(e) => updateNote(note.id, 'detail', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="pi-delete-btn"
                      title="Delete Note"
                    >
                      <i className="bi bi-trash3-fill"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <button className="pi-add-notes-btn" onClick={addNote}>
              + Add Notes
            </button>
          </div>

          <div className="pi-divider" style={{ marginTop: '1rem' }} />

          {/* Document Note */}
          <div className="pi-doc-note-row">
            <div className="pi-doc-note-label">
              <label className="pi-label">Document Note / Remarks</label>
              <span className="pi-label-italic">Not Visible on Print</span>
            </div>
            <textarea
              className="pi-textarea"
              rows={3}
              value={doc.documentNote}
              onChange={e => setDoc(prev => ({ ...prev, documentNote: e.target.value }))}
            />
          </div>

          {/* Update purchase price checkbox */}
          <div className="pi-update-price-row">
            <input
              type="checkbox"
              className="pi-checkbox"
              id="updatePurchasePrice"
              checked={updatePurchasePrice}
              onChange={e => setUpdatePurchasePrice(e.target.checked)}
            />
            <label htmlFor="updatePurchasePrice" className="pi-update-price-text" style={{ cursor: 'pointer' }}>
              Update purchase price in the product master as per this purchase rate.
            </label>
          </div>
        </div>

        {/* RIGHT: Totals Panel */}
        <div className="pi-right-bottom">

          {/* Taxable */}
          <div className="pi-totals-row">
            <span className="pi-totals-label">Taxable</span>
            <span className="pi-totals-value">{doc.taxable.toFixed(2)}</span>
          </div>

          {/* Add Additional Charge */}
          <div
            className="pi-add-charge-link"
            onClick={() => setAdditionalChargeModal(true)}
          >
            Add Additional Charge
          </div>

          {doc.additionalCharge > 0 && (
            <div className="pi-totals-row">
              <span className="pi-totals-label">{doc.additionalChargeName || 'Additional Charge'}</span>
              <span className="pi-totals-value">{Number(doc.additionalCharge).toFixed(2)}</span>
            </div>
          )}

          {/* Total Taxable */}
          <div className="pi-totals-row">
            <span className="pi-totals-label">Total Taxable</span>
            <span className="pi-totals-value">{doc.totalTaxable.toFixed(2)}</span>
          </div>

          {/* Total Tax */}
          <div className="pi-totals-row">
            <span className="pi-totals-label">Total Tax</span>
            <span className="pi-totals-value">{doc.totalTax.toFixed(2)}</span>
          </div>

          {/* TCS Row */}
          <div className="pi-modifier-row">
            <span className="pi-modifier-label">TCS</span>
            <select
              className="pi-modifier-select"
              value={doc.tcs.mode}
              onChange={e => handleNested('tcs', 'mode', e.target.value)}
            >
              <option value="+">+</option>
              <option value="-">-</option>
            </select>
            <input
              type="number"
              className="pi-modifier-input"
              placeholder="0"
              value={doc.tcs.value}
              min={0}
              onChange={e => handleNested('tcs', 'value', e.target.value)}
            />
            <select
              className="pi-modifier-unit"
              value={doc.tcs.unit}
              onChange={e => handleNested('tcs', 'unit', e.target.value)}
            >
              <option value="%">%</option>
              <option value="Rs">Rs</option>
            </select>
          </div>

          {/* Discount Row */}
          <div className="pi-modifier-row">
            <span className="pi-modifier-label">Discount</span>
            <select
              className="pi-modifier-select"
              value={doc.discount.mode}
              onChange={e => handleNested('discount', 'mode', e.target.value)}
            >
              <option value="-">-</option>
              <option value="+">+</option>
            </select>
            <input
              type="number"
              className="pi-modifier-input"
              placeholder="0"
              value={doc.discount.value}
              min={0}
              onChange={e => handleNested('discount', 'value', e.target.value)}
            />
            <select
              className="pi-modifier-unit"
              value={doc.discount.unit}
              onChange={e => handleNested('discount', 'unit', e.target.value)}
            >
              <option value="Rs">Rs</option>
              <option value="%">%</option>
            </select>
          </div>

          {/* Round Off */}
          <div className="pi-roundoff-row">
            <div className="pi-roundoff-left">
              <span style={{ fontSize: '0.83rem', fontWeight: 600, color: '#475569' }}>Round Off</span>
              <label className="pi-toggle-switch">
                <input
                  type="checkbox"
                  checked={doc.roundOff}
                  onChange={e => setDoc(prev => ({ ...prev, roundOff: e.target.checked }))}
                />
                <span className="pi-toggle-thumb"></span>
              </label>
            </div>
            <span style={{ fontSize: '0.83rem', fontWeight: 700, color: '#475569' }}>
              {roundOffAmt.toFixed(2)}
            </span>
          </div>

          {/* Grand Total */}
          <div className="pi-grand-total">
            <span className="pi-grand-label">Grand Total</span>
            <span className="pi-grand-value">₹ {doc.grandTotal.toFixed(2)}</span>
          </div>

          {/* Total in words */}
          <div className="pi-words-row">
            <div className="pi-words-label">Total in words</div>
            <div className="pi-words-value">{numberToWords(doc.grandTotal)}</div>
          </div>

          {/* Payment Type */}
          <div className="pi-payment-section">
            <div className="pi-payment-label">
              Payment Type<span className="pi-payment-req">*</span>
            </div>
            <div className="pi-payment-grid">
              {['CREDIT', 'CASH', 'CHEQUE', 'ONLINE'].map(type => (
                <button
                  key={type}
                  className={`pi-pay-btn ${type} ${doc.paymentType === type ? 'active' : ''}`}
                  onClick={() => setDoc(prev => ({ ...prev, paymentType: type }))}
                  id={`payBtn${type}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Smart Suggestion */}
          <div className="pi-smart-box">
            <span className="pi-smart-label">Smart Suggestion</span>
            <button className="pi-smart-add">+</button>
          </div>

        </div>
      </div>

      {/* ── Action Bar ──────────────────────────────────────── */}
      <div className="pi-action-bar">
        <div className="pi-action-left">
          <button className="pi-btn pi-btn-ghost" onClick={() => navigate('/documents')}>
            ← Back
          </button>
          <button
            className="pi-btn pi-btn-danger"
            onClick={() => {
              if (window.confirm('Discard all changes?')) navigate('/documents');
            }}
          >
            🗑 Discard
          </button>
        </div>
        <div className="pi-action-right">
          <button
            className="pi-btn pi-btn-print"
            onClick={() => handleSave(true)}
            disabled={isSubmitting}
            id="savePrintBtn"
          >
            🖨 Save &amp; Print
          </button>
          <button
            className="pi-btn pi-btn-save"
            onClick={() => handleSave(false)}
            disabled={isSubmitting}
            id="saveBtn"
          >
            {isSubmitting ? '⏳ Saving...' : '💾 Save'}
          </button>
        </div>
      </div>


      {/* ── Additional Charge Modal ──────────────────────────── */}
      {additionalChargeModal && (
        <div className="pi-modal-overlay" onClick={() => setAdditionalChargeModal(false)}>
          <div className="pi-modal" onClick={e => e.stopPropagation()}>
            <div className="pi-modal-header">
              <div className="pi-modal-title">Add Additional Charge</div>
              <button className="pi-modal-close" onClick={() => setAdditionalChargeModal(false)}>✕</button>
            </div>
            <div className="pi-modal-body">
              <div className="pi-modal-grid">
                <div className="pi-modal-field">
                  <label className="pi-modal-label">Charge Name</label>
                  <input
                    className="pi-input"
                    value={additionalChargeName}
                    onChange={e => setAdditionalChargeName(e.target.value)}
                    placeholder="e.g. Freight, Packaging"
                  />
                </div>
                <div className="pi-modal-field">
                  <label className="pi-modal-label">Amount (Rs)</label>
                  <input
                    type="number"
                    className="pi-input"
                    value={additionalChargeValue}
                    onChange={e => setAdditionalChargeValue(e.target.value)}
                    placeholder="0"
                    min={0}
                  />
                </div>
              </div>
            </div>
            <div className="pi-modal-footer">
              <button className="pi-btn pi-btn-ghost" onClick={() => setAdditionalChargeModal(false)}>Cancel</button>
              <button
                className="pi-btn pi-btn-save"
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
          if (activeItemIdx !== null) {
            handleItemChange(activeItemIdx, 'productId', newP.id);
          }
        }}
      />
    </div>
  );
};

export default PurchaseInvoice;

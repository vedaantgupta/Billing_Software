import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getItems, addItem, updateItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import ProductModal from '../components/ProductModal';
import ContactModal from '../components/ContactModal';
import './PurchaseOrder.css';

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

const PurchaseOrder = () => {
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

  // ── document state ──
  const [doc, setDoc] = useState({
    docType: 'Purchase Order',
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
    if (!doc.invoiceDetail.invoiceNo) { alert('Please enter Purchase Order No.'); return; }
    if (doc.items.length === 0) { alert('Please add at least one item.'); return; }

    setIsSubmitting(true);
    try {
      const finalDoc = {
        ...doc,
        invoiceNumber: `PO-${doc.invoiceDetail.invoiceNo}`,
        date: doc.invoiceDetail.date,
        total: doc.grandTotal,
        vendorName: doc.vendorInfo.ms,
        status: 'Outstanding',
      };

      if (id) {
        await updateItem('documents', id, finalDoc, user.id);
      } else {
        await addItem('documents', finalDoc, user.id);
      }

      navigate('/documents');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save Purchase Order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Contact saved callback ──
  const handleContactSaved = async (newContact) => {
    await loadMasterData();
    setDoc(prev => ({
      ...prev,
      vendorId: newContact.id || newContact._id || newContact._dbId,
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
      <div className="po-loading">
        <div className="po-loading-spinner" />
        Loading Purchase Order...
      </div>
    );
  }

  return (
    <div className="po-page">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="po-header">
        <div className="po-header-left">
          <div className="po-badge">🛒 Purchase</div>
          <div>
            <div className="po-title">Purchase Order</div>
            <div className="po-subtitle">
              {id ? `Editing • PO-${doc.invoiceDetail.invoiceNo}` : 'Create New Purchase Order'}
            </div>
          </div>
        </div>
        <div className="po-header-actions">
          <button className="po-btn pi-btn-ghost" onClick={() => navigate('/documents')}>
            ← Back
          </button>
        </div>
      </div>

      {/* ── Top Two-Column: Vendor Info + Invoice Detail ────── */}
      <div className="po-top-grid">

        {/* Vendor Information */}
        <div className="po-card">
          <div className="po-card-header">
            <div className="po-card-header-left">
              <div className="po-card-icon vendor">🏪</div>
              <div>
                <div className="po-card-title">Vendor Information</div>
                <div className="po-card-subtitle">Supplier details</div>
              </div>
            </div>
            <button className="po-menu-btn" title="Options">⋮</button>
          </div>
          <div className="po-card-body">

            {/* M/S */}
            <div className="po-field-row">
              <label className="po-label">M/S.<span className="req">*</span></label>
              <div className="po-ms-row">
                <select className="po-select" value={doc.vendorId} onChange={handleVendorChange}>
                  <option value="">Select Vendor</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.companyName || v.customerName || v.name}</option>
                  ))}
                </select>
                <button className="po-ms-add-btn" title="Add Vendor" onClick={() => setShowContactModal(true)}>
                  +
                </button>
              </div>
            </div>

            {/* Address */}
            <div className="po-field-row align-top">
              <label className="po-label">Address</label>
              <textarea
                className="po-textarea"
                rows={3}
                value={doc.vendorInfo.address}
                onChange={e => handleNested('vendorInfo', 'address', e.target.value)}
                placeholder="Vendor address..."
              />
            </div>

            {/* Contact Person */}
            <div className="po-field-row">
              <label className="po-label">Contact Person</label>
              <input
                className="po-input"
                placeholder="Contact Person"
                value={doc.vendorInfo.contactPerson}
                onChange={e => handleNested('vendorInfo', 'contactPerson', e.target.value)}
              />
            </div>

            {/* Phone No */}
            <div className="po-field-row">
              <label className="po-label">Phone No</label>
              <input
                className="po-input"
                placeholder="Phone No"
                value={doc.vendorInfo.phoneNo}
                onChange={e => handleNested('vendorInfo', 'phoneNo', e.target.value)}
              />
            </div>

            {/* GSTIN / PAN */}
            <div className="po-field-row">
              <label className="po-label">GSTIN / PAN</label>
              <input
                className="po-input"
                placeholder="GSTIN / PAN"
                value={doc.vendorInfo.gstinPan}
                onChange={e => handleNested('vendorInfo', 'gstinPan', e.target.value.toUpperCase())}
              />
            </div>

            {/* Rev. Charge */}
            <div className="po-field-row">
              <label className="po-label">Rev. Charge</label>
              <select
                className="po-select"
                value={doc.vendorInfo.revCharge}
                onChange={e => handleNested('vendorInfo', 'revCharge', e.target.value)}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            {/* Ship To */}
            <div className="po-field-row">
              <label className="po-label">Ship To</label>
              <select
                className="po-select"
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
            <div className="po-field-row">
              <label className="po-label">Place of Supply<span className="req">*</span></label>
              <select
                className="po-select"
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

        {/* Purchase Order Detail */}
        <div className="po-card">
          <div className="po-card-header">
            <div className="po-card-header-left">
              <div className="po-card-icon detail">📋</div>
              <div>
                <div className="po-card-title">Purchase Order Detail</div>
                <div className="po-card-subtitle">Invoice metadata &amp; references</div>
              </div>
            </div>
            <button
              className="po-reset-btn"
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
          <div className="po-card-body">

            {/* Purchase Order Type */}
            <div className="po-field-row">
              <label className="po-label">Purchase Order Type</label>
              <select
                className="po-select"
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
            <div className="po-invoice-no-row">
              <label className="po-label">
                Purchase Order No.<span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                <input
                  className="po-no-input"
                  placeholder="Invoice No."
                  value={doc.invoiceDetail.invoiceNo}
                  onChange={e => handleNested('invoiceDetail', 'invoiceNo', e.target.value)}
                />
                <div className="po-date-group">
                  <span className="po-date-label">Date<span style={{ color: '#ef4444' }}>*</span></span>
                  <input
                    type="date"
                    className="po-date-input"
                    value={doc.invoiceDetail.date}
                    onChange={e => handleNested('invoiceDetail', 'date', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Expected Delivery Date */}
            <div className="po-field-row">
              <label className="po-label">Expected Delivery Date</label>
              <input
                type="date"
                className="po-input"
                value={doc.invoiceDetail.expectedDeliveryDate}
                onChange={e => handleNested('invoiceDetail', 'expectedDeliveryDate', e.target.value)}
              />
            </div>

            <div className="po-divider" />

            {/* Delivery */}
            <div className="po-field-row">
              <label className="po-label">Delivery</label>
              <select
                className="po-select"
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
      <div className="po-table-card">
        <div className="po-table-header">
          <div className="po-card-header-left">
            <div className="po-card-icon items">📦</div>
            <div>
              <div className="po-card-title">Product Items</div>
              <div className="po-card-subtitle">{doc.items.length} item{doc.items.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div className="po-table-actions">
            <span className="po-toggle-label" style={{ marginRight: '0.25rem' }}>Discount :</span>
            <div className="po-discount-toggle">
              <span className="po-toggle-label">Discount :</span>
              <span
                className={`po-toggle-chip ${doc.discount.unit === 'Rs' ? 'active' : ''}`}
                onClick={() => handleNested('discount', 'unit', 'Rs')}
              >Rs</span>
              <span
                className={`po-toggle-chip ${doc.discount.unit === '%' ? 'active' : ''}`}
                onClick={() => handleNested('discount', 'unit', '%')}
              >%</span>
            </div>
            <button className="po-add-item-btn" onClick={addItem_}>
              <span>+</span> Add Item
            </button>
            <button className="po-menu-btn">⋮</button>
          </div>
        </div>

        <div className="po-table-scroll">
          <table className="po-product-table">
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
                  <td className="po-sr-num">{idx + 1}</td>
                  <td>
                    <div className="flex gap-2 items-center">
                      <select
                        className="po-cell-select"
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
                        className="pi-ms-add-btn"
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
                      className="po-cell-note"
                      rows={2}
                      placeholder="Item Note..."
                      value={item.note}
                      onChange={e => handleItemChange(idx, 'note', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="po-cell-input"
                      placeholder="Barcode No."
                      value={item.barcodeNo}
                      onChange={e => handleItemChange(idx, 'barcodeNo', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="po-cell-input"
                      placeholder="HSN/SAC"
                      value={item.hsn}
                      onChange={e => handleItemChange(idx, 'hsn', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="po-cell-input"
                      style={{ textAlign: 'center' }}
                      placeholder="Qty."
                      value={item.quantity}
                      min={0}
                      onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="po-cell-input"
                      style={{ textAlign: 'center' }}
                      placeholder="UOM"
                      value={item.unit}
                      onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="po-cell-input"
                      style={{ textAlign: 'right' }}
                      placeholder="Price"
                      value={item.rate}
                      min={0}
                      onChange={e => handleItemChange(idx, 'rate', e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      className="po-cell-select"
                      value={item.taxRate}
                      onChange={e => handleItemChange(idx, 'taxRate', e.target.value)}
                    >
                      <option value="0">--</option>
                      {TAX_RATES.filter(r => r > 0).map(r => (
                        <option key={r} value={r}>{r}%</option>
                      ))}
                    </select>
                    <div className="po-tax-display">{(item.taxAmount || 0).toFixed(2)}</div>
                  </td>
                  <td>
                    <div className="po-total-value">
                      {((item.amount || 0) + (item.taxAmount || 0)).toFixed(2)}
                    </div>
                  </td>
                  <td>
                    <button className="po-remove-btn" onClick={() => removeItem(idx)} title="Remove item">
                      ×
                    </button>
                  </td>
                </tr>
              ))}

              {/* Summary row */}
              <tr className="po-summary-row">
                <td colSpan={2} className="po-summary-label">Total Inv. Val</td>
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
      <div className="po-bottom-grid">

        {/* LEFT: Meta + Terms */}
        <div className="po-left-bottom">

          {/* Due Date */}
          <div className="po-due-date-row">
            <label className="po-label">Due Date</label>
            <input
              type="date"
              className="po-input yellow-bg"
              value={doc.dueDate}
              onChange={e => setDoc(prev => ({ ...prev, dueDate: e.target.value }))}
            />
          </div>

          <div className="po-divider" />

          {/* Terms & Condition */}
          <div className="po-terms-section">
            <div className="po-section-title">Terms &amp; Condition / Additional Note</div>
            <div className="po-terms-row">
              <label className="po-label">Title</label>
              <input
                className="po-input"
                value={doc.termsTitle}
                onChange={e => setDoc(prev => ({ ...prev, termsTitle: e.target.value }))}
              />
            </div>
            <div className="po-terms-row align-top">
              <label className="po-label">Detail</label>
              <textarea
                className="po-textarea"
                rows={3}
                placeholder="Enter terms &amp; condition"
                value={doc.termsDetail}
                onChange={e => setDoc(prev => ({ ...prev, termsDetail: e.target.value }))}
              />
            </div>
            <button className="po-add-notes-btn" onClick={() => { }}>
              + Add Notes
            </button>
          </div>

          <div className="po-divider" style={{ marginTop: '1rem' }} />

          {/* Document Note */}
          <div className="po-doc-note-row">
            <div className="po-doc-note-label">
              <label className="po-label">Document Note / Remarks</label>
              <span className="po-label-italic">Not Visible on Print</span>
            </div>
            <textarea
              className="po-textarea"
              rows={3}
              value={doc.documentNote}
              onChange={e => setDoc(prev => ({ ...prev, documentNote: e.target.value }))}
            />
          </div>

          {/* Update purchase price checkbox */}
          <div className="po-update-price-row">
            <input
              type="checkbox"
              className="po-checkbox"
              id="updatePurchasePrice"
              checked={updatePurchasePrice}
              onChange={e => setUpdatePurchasePrice(e.target.checked)}
            />
            <label htmlFor="updatePurchasePrice" className="po-update-price-text" style={{ cursor: 'pointer' }}>
              Update purchase price in the product master as per this purchase rate.
            </label>
          </div>
        </div>

        {/* RIGHT: Totals Panel */}
        <div className="po-right-bottom">

          {/* Taxable */}
          <div className="po-totals-row">
            <span className="po-totals-label">Taxable</span>
            <span className="po-totals-value">{doc.taxable.toFixed(2)}</span>
          </div>

          {/* Add Additional Charge */}
          <div
            className="po-add-charge-link"
            onClick={() => setAdditionalChargeModal(true)}
          >
            Add Additional Charge
          </div>

          {doc.additionalCharge > 0 && (
            <div className="po-totals-row">
              <span className="po-totals-label">{doc.additionalChargeName || 'Additional Charge'}</span>
              <span className="po-totals-value">{Number(doc.additionalCharge).toFixed(2)}</span>
            </div>
          )}

          {/* Total Taxable */}
          <div className="po-totals-row">
            <span className="po-totals-label">Total Taxable</span>
            <span className="po-totals-value">{doc.totalTaxable.toFixed(2)}</span>
          </div>

          {/* Total Tax */}
          <div className="po-totals-row">
            <span className="po-totals-label">Total Tax</span>
            <span className="po-totals-value">{doc.totalTax.toFixed(2)}</span>
          </div>

          {/* TCS Row */}
          <div className="po-modifier-row">
            <span className="po-modifier-label">TCS</span>
            <select
              className="po-modifier-select"
              value={doc.tcs.mode}
              onChange={e => handleNested('tcs', 'mode', e.target.value)}
            >
              <option value="+">+</option>
              <option value="-">-</option>
            </select>
            <input
              type="number"
              className="po-modifier-input"
              placeholder="0"
              value={doc.tcs.value}
              min={0}
              onChange={e => handleNested('tcs', 'value', e.target.value)}
            />
            <select
              className="po-modifier-unit"
              value={doc.tcs.unit}
              onChange={e => handleNested('tcs', 'unit', e.target.value)}
            >
              <option value="%">%</option>
              <option value="Rs">Rs</option>
            </select>
          </div>

          {/* Discount Row */}
          <div className="po-modifier-row">
            <span className="po-modifier-label">Discount</span>
            <select
              className="po-modifier-select"
              value={doc.discount.mode}
              onChange={e => handleNested('discount', 'mode', e.target.value)}
            >
              <option value="-">-</option>
              <option value="+">+</option>
            </select>
            <input
              type="number"
              className="po-modifier-input"
              placeholder="0"
              value={doc.discount.value}
              min={0}
              onChange={e => handleNested('discount', 'value', e.target.value)}
            />
            <select
              className="po-modifier-unit"
              value={doc.discount.unit}
              onChange={e => handleNested('discount', 'unit', e.target.value)}
            >
              <option value="Rs">Rs</option>
              <option value="%">%</option>
            </select>
          </div>

          {/* Round Off */}
          <div className="po-roundoff-row">
            <div className="po-roundoff-left">
              <span style={{ fontSize: '0.83rem', fontWeight: 600, color: '#475569' }}>Round Off</span>
              <label className="po-toggle-switch">
                <input
                  type="checkbox"
                  checked={doc.roundOff}
                  onChange={e => setDoc(prev => ({ ...prev, roundOff: e.target.checked }))}
                />
                <span className="po-toggle-thumb"></span>
              </label>
            </div>
            <span style={{ fontSize: '0.83rem', fontWeight: 700, color: '#475569' }}>
              {roundOffAmt.toFixed(2)}
            </span>
          </div>

          {/* Grand Total */}
          <div className="po-grand-total">
            <span className="po-grand-label">Grand Total</span>
            <span className="po-grand-value">₹ {doc.grandTotal.toFixed(2)}</span>
          </div>

          {/* Total in words */}
          <div className="po-words-row">
            <div className="po-words-label">Total in words</div>
            <div className="po-words-value">{numberToWords(doc.grandTotal)}</div>
          </div>

          {/* Payment Type */}
          <div className="po-payment-section">
            <div className="po-payment-label">
              Payment Type<span className="po-payment-req">*</span>
            </div>
            <div className="po-payment-grid">
              {['CREDIT', 'CASH', 'CHEQUE', 'ONLINE'].map(type => (
                <button
                  key={type}
                  className={`po-pay-btn ${type} ${doc.paymentType === type ? 'active' : ''}`}
                  onClick={() => setDoc(prev => ({ ...prev, paymentType: type }))}
                  id={`payBtn${type}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Smart Suggestion */}
          <div className="po-smart-box">
            <span className="po-smart-label">Smart Suggestion</span>
            <button className="po-smart-add">+</button>
          </div>

        </div>
      </div>

      {/* ── Action Bar ──────────────────────────────────────── */}
      <div className="po-action-bar">
        <div className="po-action-left">
          <button className="po-btn pi-btn-ghost" onClick={() => navigate('/documents')}>
            ← Back
          </button>
          <button
            className="po-btn pi-btn-danger"
            onClick={() => {
              if (window.confirm('Discard all changes?')) navigate('/documents');
            }}
          >
            🗑 Discard
          </button>
        </div>
        <div className="po-action-right">
          <button
            className="po-btn pi-btn-print"
            onClick={() => handleSave(true)}
            disabled={isSubmitting}
            id="savePrintBtn"
          >
            🖨 Save &amp; Print
          </button>
          <button
            className="po-btn pi-btn-save"
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
        <div className="po-modal-overlay" onClick={() => setAdditionalChargeModal(false)}>
          <div className="po-modal" onClick={e => e.stopPropagation()}>
            <div className="po-modal-header">
              <div className="po-modal-title">Add Additional Charge</div>
              <button className="po-modal-close" onClick={() => setAdditionalChargeModal(false)}>✕</button>
            </div>
            <div className="po-modal-body">
              <div className="po-modal-grid">
                <div className="po-modal-field">
                  <label className="po-modal-label">Charge Name</label>
                  <input
                    className="po-input"
                    value={additionalChargeName}
                    onChange={e => setAdditionalChargeName(e.target.value)}
                    placeholder="e.g. Freight, Packaging"
                  />
                </div>
                <div className="po-modal-field">
                  <label className="po-modal-label">Amount (Rs)</label>
                  <input
                    type="number"
                    className="po-input"
                    value={additionalChargeValue}
                    onChange={e => setAdditionalChargeValue(e.target.value)}
                    placeholder="0"
                    min={0}
                  />
                </div>
              </div>
            </div>
            <div className="po-modal-footer">
              <button className="po-btn pi-btn-ghost" onClick={() => setAdditionalChargeModal(false)}>Cancel</button>
              <button
                className="po-btn pi-btn-save"
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

export default PurchaseOrder;

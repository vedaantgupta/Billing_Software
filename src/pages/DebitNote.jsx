import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getItems, addItem, updateItem, logActivity } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import PrintViewModal from '../components/PrintViewModal';
import ProductModal from '../components/ProductModal';
import ContactModal from '../components/ContactModal';
import {
  Printer, Save, MoreVertical, RotateCcw, Mail, X
} from 'lucide-react';
import './PurchaseInvoice.css';
import './DebitNote.css';
import './product-table.css';



// ─── Constants ────────────────────────────────────────────────────────────────
const DOC_TYPES = ['Debit Note', 'Purchase Return', 'Price Difference', 'Discount Debit Note'];
const DN_TYPES = ['Regular', 'Correction', 'Return', 'Credit Adjustment'];
const DELIVERY_MODES = ['Select Delivery Mode', 'Hand Delivery', 'Courier', 'Transport', 'Self Pickup', 'Digital Delivery'];
const BANKS = ['CASH', 'CANARA BANK', 'HDFC BANK', 'SBI', 'ICICI BANK'];

const STATE_CODES = {
  'Andaman & Nicobar Islands': '35', 'Andhra Pradesh': '37', 'Arunachal Pradesh': '12',
  'Assam': '18', 'Bihar': '10', 'Chandigarh': '04', 'Chhattisgarh': '22',
  'Dadra & Nagar Haveli': '26', 'Daman & Diu': '25', 'Delhi': '07', 'Goa': '30',
  'Gujarat': '24', 'Haryana': '06', 'Himachal Pradesh': '02', 'Jammu & Kashmir': '01',
  'Jharkhand': '20', 'Karnataka': '29', 'Kerala': '32', 'Ladakh': '38',
  'Lakshadweep': '31', 'Madhya Pradesh': '23', 'Maharashtra': '27', 'Manipur': '14',
  'Meghalaya': '17', 'Mizoram': '15', 'Nagaland': '13', 'Odisha': '21',
  'Puducherry': '34', 'Punjab': '03', 'Rajasthan': '08', 'Sikkim': '11',
  'Tamil Nadu': '33', 'Telangana': '36', 'Tripura': '16', 'Uttar Pradesh': '09',
  'Uttarakhand': '05', 'West Bengal': '19',
};

const BLANK_ITEM = () => ({
  productId: '', name: '', hsn: '', quantity: 1, unit: 'PCS',
  rate: 0, taxRate: 0, amount: 0, taxAmount: 0, note: '',
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
    return conv(Math.floor(num / 10000000)) + 'CRORE ' + conv(num % 10000000);
  };
  return (conv(Math.floor(num)) + 'RUPEES ONLY').trim();
}

function todayIso() { return new Date().toISOString().split('T')[0]; }

function formatDisplayDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
}

// ─── Main Component ───────────────────────────────────────────────────────────
const DebitNote = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [savedDoc, setSavedDoc] = useState(null);
  const [additionalChargeModal, setAdditionalChargeModal] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [activeItemIdx, setActiveItemIdx] = useState(null);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);

  const [doc, setDoc] = useState({
    docType: 'Debit Note',
    docPrefix: 'DN/',
    docPostfix: '/25-26',
    customerId: '',
    customerInfo: {
      ms: '', address: '', contactPerson: '', phoneNo: '',
      gstinPan: '', revCharge: 'No', shipTo: '--', placeOfSupply: 'Madhya Pradesh',
    },
    dnDetail: {
      type: 'Debit Note',
      dnType: 'Regular',
      dnNo: '1',
      date: todayIso(),
      invoiceNo: '',
      invoiceDate: '',
      challanNo: '',
      challanDate: '',
      lrNo: '',
      ewayNo: '',
      deliveryMode: 'Select Delivery Mode',
    },
    items: [BLANK_ITEM()],
    bank: 'CANARA BANK',
    shareEmail: false,
    terms: [],
    documentNote: '',
    taxable: 0,
    additionalCharge: 0,
    additionalChargeName: 'Additional Charge',
    totalTaxable: 0,
    totalTax: 0,
    tcs: { mode: '+', value: '', unit: '%' },
    discount: { mode: '-', value: '', unit: 'Rs' },
    roundOff: true,
    grandTotal: 0,
  });

  const loadMasterData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [contactList, productList] = await Promise.all([
        getItems('contacts', user.id),
        getItems('products', user.id),
      ]);
      setCustomers(contactList.filter(c => c.type === 'customer' || !c.type));
      setProducts(productList);
    } catch (err) { console.error('Failed to load master data:', err); }
  }, [user?.id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadMasterData();
      if (id) {
        try {
          const allDocs = await getItems('documents', user.id);
          const existing = allDocs.find(d => d._dbId === id || d.id === id);
          if (existing) setDoc(prev => ({ ...prev, ...existing }));
        } catch (err) { console.error('Error loading document:', err); }
      }
      setLoading(false);
    };
    init();
  }, [id, user?.id, loadMasterData]);

  // ─── Real-time totals ─────────────────────────────────────────────────────
  useEffect(() => {
    const taxable = doc.items.reduce((a, i) => a + (Number(i.amount) || 0), 0);
    const totalTax = doc.items.reduce((a, i) => a + (Number(i.taxAmount) || 0), 0);
    const totalTaxable = taxable + (Number(doc.additionalCharge) || 0);

    const tcsVal = Number(doc.tcs.value) || 0;
    let tcsAmt = doc.tcs.unit === '%' ? totalTaxable * (tcsVal / 100) : tcsVal;
    tcsAmt = doc.tcs.mode === '-' ? -Math.abs(tcsAmt) : Math.abs(tcsAmt);

    const discVal = Number(doc.discount.value) || 0;
    const discAmt = doc.discount.unit === '%' ? totalTaxable * (discVal / 100) : discVal;
    const finalDiscAmt = doc.discount.mode === '-' ? -Math.abs(discAmt) : Math.abs(discAmt);

    const rawTotal = totalTaxable + totalTax + tcsAmt + finalDiscAmt;
    const grandTotal = doc.roundOff ? Math.round(rawTotal) : Math.round(rawTotal * 100) / 100;

    setDoc(prev => ({ ...prev, taxable, totalTaxable, totalTax, grandTotal }));
  }, [doc.items, doc.additionalCharge, doc.tcs, doc.discount, doc.roundOff]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleCustomerChange = (e) => {
    const vId = e.target.value;
    const c = customers.find(x => x.id === vId);
    if (c) {
      setDoc(prev => ({
        ...prev, customerId: vId,
        customerInfo: {
          ...prev.customerInfo,
          ms: c.companyName || c.customerName || c.name || '',
          address: c.address || '',
          contactPerson: c.customerName || c.name || '',
          phoneNo: c.phone || '',
          gstinPan: c.gstin || '',
          placeOfSupply: c.state || 'Madhya Pradesh',
        },
      }));
    } else {
      setDoc(prev => ({ ...prev, customerId: vId }));
    }
  };

  const onNewContactSaved = async (newContact) => {
    await loadMasterData();
    setCustomers(prev => [...prev, newContact]);
    setDoc(prev => ({
      ...prev, customerId: newContact.id,
      customerInfo: {
        ...prev.customerInfo,
        ms: newContact.companyName || newContact.customerName || newContact.name || '',
        address: newContact.address || '',
        contactPerson: newContact.customerName || newContact.name || '',
        phoneNo: newContact.phone || '',
        gstinPan: newContact.gstin || '',
        placeOfSupply: newContact.state || 'Madhya Pradesh',
      },
    }));
  };

  const handleNested = (cat, field, value) =>
    setDoc(prev => ({ ...prev, [cat]: { ...prev[cat], [field]: value } }));

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
        item.rate = Number(p.sellingPrice) || 0;
        item.taxRate = Number(p.taxRate) || 0;
      }
    } else {
      item[field] = value;
    }
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const tax = Number(item.taxRate) || 0;
    item.amount = qty * rate;
    item.taxAmount = item.amount * (tax / 100);
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
    if (!doc.dnDetail.dnNo) { alert('Please enter Debit Note No.'); return; }
    setIsSubmitting(true);
    try {
      const fullNo = `${doc.docPrefix}${doc.dnDetail.dnNo}${doc.docPostfix}`;
      const finalDoc = {
        ...doc,
        invoiceNumber: fullNo,
        date: doc.dnDetail.date,
        total: doc.grandTotal,
        customerName: doc.customerInfo.ms,
        status: 'Outstanding',
        docType: 'Debit Note',
      };
      let result;
      if (id) {
        result = await updateItem('documents', id, finalDoc, user.id);
      } else {
        result = await addItem('documents', finalDoc, user.id);
      }
      logActivity(id ? `Updated Debit Note #${fullNo}` : `Created Debit Note #${fullNo}`, user.id, user.username);
      if (print) { setSavedDoc(result || finalDoc); setShowPrintModal(true); }
      else navigate('/documents');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save Debit Note.');
    } finally { setIsSubmitting(false); }
  };

  if (loading && user) {
    return <div className="pi-page dn-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Debit Note Builder...</div>;
  }

  const totalQty = doc.items.reduce((a, i) => a + Number(i.quantity), 0);

  return (
    <div className="pi-page dn-page">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="pi-header">
        <div className="pi-header-left">
          <div className="pi-badge dn-badge">📈 DEBIT NOTE</div>
          <div>
            <div className="pi-title">Debit Note Builder</div>
            <div className="pi-subtitle">
              {id ? `Editing • DN-${doc.dnDetail.dnNo}` : 'Create a new debit note record'}
            </div>
          </div>
        </div>
        <div className="pi-header-actions">
          <button className="pi-btn pi-btn-ghost" onClick={() => navigate('/documents')}>← Back to List</button>
        </div>
      </div>

      {/* ── Section 1: Customer + DN Details ──────────────────── */}
      <div className="pi-top-grid" style={{ gridTemplateColumns: '1fr 500px' }}>

        {/* Customer Information */}
        <div className="pi-card">
          <div className="pi-card-header" style={{ background: 'white' }}>
            <div className="pi-card-header-left">
              <div className="pi-card-icon vendor">👤</div>
              <div>
                <div className="pi-card-title">Customer Information</div>
                <div className="pi-card-subtitle">Identity &amp; Billing Details</div>
              </div>
            </div>
            <button className="pi-menu-btn"><MoreVertical size={18} /></button>
          </div>
          <div className="pi-card-body">

            {/* M/S */}
            <div className="pi-field-row" style={{ gridTemplateColumns: '130px 1fr' }}>
              <label className="pi-label">M/S.<span className="req">*</span></label>
              <div className="pi-ms-row">
                <select className="pi-select" value={doc.customerId} onChange={handleCustomerChange}>
                  <option value="">Select Customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.companyName || c.customerName || c.name}</option>)}
                </select>
                <button className="pi-ms-add-btn dn-add-btn" onClick={() => setIsAddContactModalOpen(true)}>+</button>
              </div>
            </div>

            {/* Address */}
            <div className="pi-field-row align-top" style={{ gridTemplateColumns: '130px 1fr' }}>
              <label className="pi-label">Address</label>
              <textarea className="pi-textarea" rows={2} value={doc.customerInfo.address} onChange={e => handleNested('customerInfo', 'address', e.target.value)} />
            </div>

            {/* Contact Person */}
            <div className="pi-field-row" style={{ gridTemplateColumns: '130px 1fr' }}>
              <label className="pi-label">Contact Person</label>
              <input className="pi-input" placeholder="Contact Person" value={doc.customerInfo.contactPerson} onChange={e => handleNested('customerInfo', 'contactPerson', e.target.value)} />
            </div>

            {/* Phone */}
            <div className="pi-field-row" style={{ gridTemplateColumns: '130px 1fr' }}>
              <label className="pi-label">Phone No</label>
              <input className="pi-input" placeholder="Phone No" value={doc.customerInfo.phoneNo} onChange={e => handleNested('customerInfo', 'phoneNo', e.target.value)} />
            </div>

            {/* GSTIN / PAN */}
            <div className="pi-field-row" style={{ gridTemplateColumns: '130px 1fr' }}>
              <label className="pi-label">GSTIN / PAN</label>
              <input className="pi-input" value={doc.customerInfo.gstinPan} onChange={e => handleNested('customerInfo', 'gstinPan', e.target.value.toUpperCase())} />
            </div>

            {/* Rev. Charge */}
            <div className="pi-field-row" style={{ gridTemplateColumns: '130px 1fr' }}>
              <label className="pi-label">Rev. Charge</label>
              <select className="pi-select" value={doc.customerInfo.revCharge} onChange={e => handleNested('customerInfo', 'revCharge', e.target.value)}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            {/* Ship To */}
            <div className="pi-field-row" style={{ gridTemplateColumns: '130px 1fr' }}>
              <label className="pi-label">Ship To</label>
              <select className="pi-select" value={doc.customerInfo.shipTo} onChange={e => handleNested('customerInfo', 'shipTo', e.target.value)}>
                <option value="--">--</option>
                <option value="Same as Billing">Same as Billing</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.companyName || c.customerName || c.name}</option>)}
              </select>
            </div>

            {/* Place of Supply */}
            <div className="pi-field-row" style={{ gridTemplateColumns: '130px 1fr' }}>
              <label className="pi-label">Place of Supply<span className="req">*</span></label>
              <select className="pi-select" value={doc.customerInfo.placeOfSupply} onChange={e => handleNested('customerInfo', 'placeOfSupply', e.target.value)}>
                {Object.keys(STATE_CODES).sort().map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

          </div>
        </div>

        {/* Debit Note Detail */}
        <div className="pi-card">
          <div className="pi-card-header" style={{ background: 'white' }}>
            <div className="pi-card-header-left">
              <div className="pi-card-icon detail">📋</div>
              <div>
                <div className="pi-card-title">Debit Note Detail</div>
                <div className="pi-card-subtitle">Tracking &amp; Linkage</div>
              </div>
            </div>
            <button className="pi-reset-btn" onClick={() => setDoc({ ...doc, dnDetail: { ...doc.dnDetail, dnNo: '1', date: todayIso() } })}>
              <RotateCcw size={16} />
            </button>
          </div>
          <div className="pi-card-body">

            {/* Row 1: Doc Type | D.N. Type — flexible middle column */}
            <div className="pi-field-row" style={{ gridTemplateColumns: '70px 1fr 85px 125px' }}>
              <label className="pi-label">Doc. Type</label>
              <select className="pi-select" value={doc.dnDetail.type} onChange={e => handleNested('dnDetail', 'type', e.target.value)}>
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <label className="pi-label" style={{ textAlign: 'right' }}>D.N. Type</label>
              <select className="pi-select" value={doc.dnDetail.dnType} onChange={e => handleNested('dnDetail', 'dnType', e.target.value)}>
                {DN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Row 2: D.N. No | D.N. Date — flexible alignment */}
            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 85px 125px', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
              <label className="pi-label">D.N. No.<span className="req">*</span></label>

              {/* Prefix / Number / Postfix grouped box — now stretches to 1fr column */}
              <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', width: '100%' }}>
                <input
                  className="pi-no-input"
                  style={{ width: '48px', textAlign: 'center', borderRadius: 0, border: 'none', borderRight: '1px solid #e2e8f0', padding: '0.42rem 0.1rem', boxSizing: 'border-box', fontSize: '0.72rem' }}
                  placeholder="Pref"
                  value={doc.docPrefix}
                  onChange={e => setDoc({ ...doc, docPrefix: e.target.value })}
                />
                <input
                  className="pi-no-input"
                  style={{ width: '44px', textAlign: 'center', borderRadius: 0, border: 'none', borderRight: '1px solid #e2e8f0', padding: '0.42rem 0.1rem', boxSizing: 'border-box', fontSize: '0.82rem' }}
                  value={doc.dnDetail.dnNo}
                  onChange={e => handleNested('dnDetail', 'dnNo', e.target.value)}
                />
                <input
                  className="pi-no-input"
                  style={{ flex: 1, textAlign: 'center', borderRadius: 0, border: 'none', padding: '0.42rem 0.1rem', boxSizing: 'border-box', fontSize: '0.72rem' }}
                  placeholder="Post"
                  value={doc.docPostfix}
                  onChange={e => setDoc({ ...doc, docPostfix: e.target.value })}
                />
              </div>

              {/* D.N. Date label */}
              <label className="pi-label" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                D.N. Date<span className="req">*</span>
              </label>

              {/* Date input */}
              <input
                type="date"
                className="pi-date-input"
                style={{ width: '125px', fontSize: '0.78rem' }}
                value={doc.dnDetail.date}
                onChange={e => handleNested('dnDetail', 'date', e.target.value)}
              />
            </div>

            {/* Row 3: Invoice No | Invoice Date — stretches to fill space */}
            <div className="pi-field-row" style={{ gridTemplateColumns: '70px 1fr 85px 125px' }}>
              <label className="pi-label">Invoice No.<span className="req">*</span></label>
              <div>
                <input className="pi-input" style={{ color: '#f59e0b', padding: '0.42rem 0.5rem' }} placeholder="Against Invoice No" value={doc.dnDetail.invoiceNo} onChange={e => handleNested('dnDetail', 'invoiceNo', e.target.value)} />
                <div style={{ marginTop: '0.2rem', color: '#94a3b8', fontSize: '0.50rem', fontStyle: 'italic', whiteSpace: 'nowrap', letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis' }}>Please invoice number with prefix &amp; postfix.</div>
              </div>
              <label className="pi-label" style={{ textAlign: 'right' }}>Invoice Date</label>
              <input type="date" className="pi-date-input" style={{ width: '125px' }} value={doc.dnDetail.invoiceDate} onChange={e => handleNested('dnDetail', 'invoiceDate', e.target.value)} />
            </div>

            {/* Row 4: Challan No | Challan Date */}
            <div className="pi-field-row" style={{ gridTemplateColumns: '70px 1fr 85px 125px' }}>
              <label className="pi-label">Challan No.</label>
              <input className="pi-input" placeholder="Challan No." value={doc.dnDetail.challanNo} onChange={e => handleNested('dnDetail', 'challanNo', e.target.value)} />
              <label className="pi-label" style={{ textAlign: 'right' }}>Challan Date</label>
              <input type="date" className="pi-date-input" style={{ width: '125px' }} value={doc.dnDetail.challanDate} onChange={e => handleNested('dnDetail', 'challanDate', e.target.value)} />
            </div>

            {/* Row 5: L.R. No | E-Way No */}
            <div className="pi-field-row" style={{ gridTemplateColumns: '70px 1fr 85px 125px' }}>
              <label className="pi-label">L.R. No.</label>
              <input className="pi-input" placeholder="L.R. No." value={doc.dnDetail.lrNo} onChange={e => handleNested('dnDetail', 'lrNo', e.target.value)} />
              <label className="pi-label" style={{ textAlign: 'right' }}>E-Way No.</label>
              <input className="pi-input" placeholder="E-Way No." value={doc.dnDetail.ewayNo} onChange={e => handleNested('dnDetail', 'ewayNo', e.target.value)} />
            </div>

            {/* Row 6: Delivery Mode */}
            <div className="pi-field-row" style={{ gridTemplateColumns: '70px 1fr' }}>
              <label className="pi-label">Delivery</label>
              <select className="pi-select" value={doc.dnDetail.deliveryMode} onChange={e => handleNested('dnDetail', 'deliveryMode', e.target.value)}>
                {DELIVERY_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

          </div>
        </div>
      </div>

      {/* ── Section 2: Product Items Table ────────────────────── */}
      <div className="pt-table-card">
        <div className="pt-table-header">
          <div className="pi-card-header-left">
            <div className="pi-card-icon items">📦</div>
            <div>
              <div className="pt-card-title">Product Items</div>
              <div className="pt-card-subtitle">{doc.items.length} row(s) active</div>
            </div>
          </div>
          <div className="pi-table-actions">
            <div className="pi-discount-toggle" style={{ background: 'white' }}>
              <span className="pi-toggle-label">Discount :</span>
              <span className={`pi-toggle-chip ${doc.discount.unit === 'Rs' ? 'dn-active-chip' : ''}`} onClick={() => handleNested('discount', 'unit', 'Rs')}>Rs</span>
              <span className={`pi-toggle-chip ${doc.discount.unit === '%' ? 'dn-active-chip' : ''}`} onClick={() => handleNested('discount', 'unit', '%')}>%</span>
              <button className="pi-menu-btn" style={{ marginLeft: '10px' }}><MoreVertical size={16} /></button>
            </div>
          </div>
        </div>

        <div className="pt-table-scroll">
          <table className="pt-product-table">
            <thead>
              <tr>
                <th className="sr-col">SR.</th>
                <th className="product-col">PRODUCT / OTHER CHARGES</th>
                <th className="hsn-col">HSN/SAC CODE</th>
                <th className="qty-col">QTY.</th>
                <th className="uom-col">UOM</th>
                <th className="price-col">PRICE (RS)</th>
                <th className="igst-col">IGST</th>
                <th className="total-col">TOTAL</th>
                <th className="action-col"></th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="pt-sr-num">{idx + 1}</td>
                  <td>
                    <div className="flex gap-2 items-center">
                      <select className="pt-cell-select" style={{ flex: 1 }} value={item.productId} onChange={e => handleItemChange(idx, 'productId', e.target.value)}>
                        <option value="">Enter Product name</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                    <textarea className="pt-cell-note" placeholder="Item Note..." rows={1} value={item.note} onChange={e => handleItemChange(idx, 'note', e.target.value)} />
                  </td>
                  <td><input className="pt-cell-input" placeholder="HSN/SAC" value={item.hsn} onChange={e => handleItemChange(idx, 'hsn', e.target.value)} /></td>
                  <td><input type="number" className="pt-cell-input" style={{ textAlign: 'center' }} placeholder="Qty." value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} /></td>
                  <td><input className="pt-cell-input" style={{ textAlign: 'center' }} placeholder="UOM" value={item.unit} onChange={e => handleItemChange(idx, 'unit', e.target.value)} /></td>
                  <td><input type="number" className="pt-cell-input" style={{ textAlign: 'right' }} placeholder="Price" value={item.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} /></td>
                  <td>
                    <div className="pi-tax-group">
                      <select className="pt-cell-select" value={item.taxRate} onChange={e => handleItemChange(idx, 'taxRate', e.target.value)}>
                        {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r === 0 ? '--' : `${r}%`}</option>)}
                      </select>
                      <div className="pt-tax-display">{item.taxAmount.toFixed(0)}</div>
                    </div>
                  </td>
                  <td><div className="pt-total-value dn-total-value">₹ {(item.amount + item.taxAmount).toFixed(2)}</div></td>
                  <td><button className="pt-remove-btn" onClick={() => removeItem(idx)}>×</button></td>
                </tr>
              ))}

              {/* Summary row */}
              <tr className="pt-total-inv-row">
                <td colSpan={2}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: '#92400e', fontSize: '0.8rem' }}>Total Debit. Val</span>
                    <button className="pt-add-item-btn dn-add-item-btn" onClick={addItem_}>+ Add Row</button>
                  </div>
                </td>
                <td></td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{totalQty}</td>
                <td></td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{doc.taxable.toFixed(2)}</td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{doc.totalTax.toFixed(2)}</td>
                <td style={{ textAlign: 'right', color: '#f59e0b', fontWeight: 800 }}>₹ {(doc.taxable + doc.totalTax).toFixed(2)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 3: Bottom Grid ─────────────────────────────── */}
      <div className="pi-bottom-grid">

        {/* Left: Bank + Notes */}
        <div className="pi-left-bottom">

          {/* Bank */}
          <div className="pi-due-date-row">
            <label className="pi-label">Bank</label>
            <select className="pi-select" value={doc.bank} onChange={e => setDoc({ ...doc, bank: e.target.value })}>
              {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="pi-divider" />

          {/* Terms & Conditions */}
          <div className="pi-terms-section">
            <div className="pi-section-title">Terms &amp; Condition / Additional Note</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {doc.terms.length > 0 && (
                <div className="pi-terms-row" style={{ color: '#94a3b8', fontWeight: 600 }}>
                  <span>Title</span><span>Detail</span>
                </div>
              )}
              {doc.terms.map((t, idx) => (
                <div key={idx} className="pi-terms-row" style={{ alignItems: 'flex-start' }}>
                  <input className="pi-input" style={{ fontWeight: 600 }} placeholder="Title" value={t.title}
                    onChange={e => { const nt = [...doc.terms]; nt[idx].title = e.target.value; setDoc({ ...doc, terms: nt }); }} />
                  <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                    <textarea className="pi-textarea" rows={1} placeholder="Detail" value={t.detail}
                      onChange={e => { const nt = [...doc.terms]; nt[idx].detail = e.target.value; setDoc({ ...doc, terms: nt }); }} />
                    <button className="pi-remove-btn" onClick={() => { const nt = [...doc.terms]; nt.splice(idx, 1); setDoc({ ...doc, terms: nt }); }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button className="pi-add-notes-btn" onClick={() => setDoc({ ...doc, terms: [...doc.terms, { title: '', detail: '' }] })}>
              + Add Notes
            </button>
          </div>

          <div className="pi-divider" />

          {/* Document Note */}
          <div className="pi-doc-note-row">
            <div className="pi-doc-note-label">
              <label className="pi-label" style={{ color: '#f59e0b' }}>Document Note /<br />Remarks</label>
              <span className="pi-label-italic">Not Visible on Print</span>
            </div>
            <textarea className="pi-textarea" rows={3} placeholder="Internal notes..." value={doc.documentNote} onChange={e => setDoc({ ...doc, documentNote: e.target.value })} />
          </div>
        </div>

        {/* Right: Totals Sidebar */}
        <div className="pi-right-bottom">

          <div className="pi-totals-row">
            <span className="pi-totals-label">Taxable</span>
            <span className="pi-totals-value">₹ {doc.taxable.toFixed(2)}</span>
          </div>

          <div className="pi-add-charge-link dn-add-charge-link" onClick={() => setAdditionalChargeModal(true)}>
            Add Additional Charge
          </div>

          <div className="pi-totals-row" style={{ color: '#334155', borderTop: '1px solid #f1f5f9', fontWeight: 700 }}>
            <span className="pi-totals-label">Total Taxable</span>
            <span className="pi-totals-value">₹ {doc.totalTaxable.toFixed(2)}</span>
          </div>

          <div className="pi-totals-row">
            <span className="pi-totals-label">Total Tax</span>
            <span className="pi-totals-value">₹ {doc.totalTax.toFixed(2)}</span>
          </div>

          {/* TCS */}
          <div className="pi-modifier-row">
            <span className="pi-modifier-label">TCS</span>
            <div style={{ display: 'flex', gap: '4px', flex: 1, justifyContent: 'flex-end' }}>
              <select className="pi-modifier-select" value={doc.tcs.mode} onChange={e => handleNested('tcs', 'mode', e.target.value)}>
                <option>+</option><option>-</option>
              </select>
              <input className="pi-modifier-input" style={{ width: '80px' }} value={doc.tcs.value} onChange={e => handleNested('tcs', 'value', e.target.value)} />
              <select className="pi-modifier-unit" value={doc.tcs.unit} onChange={e => handleNested('tcs', 'unit', e.target.value)}>
                <option>%</option><option>Rs</option>
              </select>
            </div>
          </div>

          {/* Discount */}
          <div className="pi-modifier-row">
            <span className="pi-modifier-label">Discount</span>
            <div style={{ display: 'flex', gap: '4px', flex: 1, justifyContent: 'flex-end' }}>
              <select className="pi-modifier-select" value={doc.discount.mode} onChange={e => handleNested('discount', 'mode', e.target.value)}>
                <option>-</option><option>+</option>
              </select>
              <input className="pi-modifier-input" style={{ width: '80px' }} value={doc.discount.value} onChange={e => handleNested('discount', 'value', e.target.value)} />
              <select className="pi-modifier-unit" value={doc.discount.unit} onChange={e => handleNested('discount', 'unit', e.target.value)}>
                <option>Rs</option><option>%</option>
              </select>
            </div>
          </div>

          {/* Round Off */}
          <div className="pi-totals-row" style={{ borderBottom: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span className="pi-totals-label">Round Off</span>
              <label className="pi-switch" style={{ width: '44px', height: '22px', position: 'relative', display: 'inline-block' }}>
                <input type="checkbox" checked={doc.roundOff} onChange={e => setDoc({ ...doc, roundOff: e.target.checked })} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, background: doc.roundOff ? '#f59e0b' : '#ccc', transition: '.4s', borderRadius: '34px' }}>
                  <span style={{ position: 'absolute', height: '16px', width: '16px', left: '4px', bottom: '3px', background: 'white', transition: '.4s', borderRadius: '50%', transform: doc.roundOff ? 'translateX(20px)' : 'translateX(0)' }} />
                </span>
              </label>
            </div>
            <span className="pi-label-italic">₹ {(doc.grandTotal - (doc.totalTaxable + doc.totalTax)).toFixed(2)}</span>
          </div>

          {/* Grand Total */}
          <div className="dn-grand-total">
            <span className="dn-grand-label">Grand Total</span>
            <span className="dn-grand-value">₹ {doc.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          {/* Total in Words */}
          <div className="pi-words-row" style={{ border: 'none' }}>
            <div className="pi-words-label">Total in words</div>
            <div style={{ textTransform: 'uppercase', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>{numberToWords(doc.grandTotal)}</div>
          </div>

          {/* Smart Suggestion */}
          <div className="dn-smart-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="pi-smart-label">Smart Suggestion</span>
              <button style={{ background: '#f59e0b', color: 'white', border: 'none', width: '20px', height: '20px', borderRadius: '4px', cursor: 'pointer' }}>-</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '1rem' }}>
              <input type="checkbox" id="dnEmailChk" checked={doc.shareEmail} onChange={e => setDoc({ ...doc, shareEmail: e.target.checked })} />
              <label htmlFor="dnEmailChk" className="pi-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', cursor: 'pointer' }}>
                Share on Email <Mail size={14} />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Bar ─────────────────────────────────────────── */}
      <div className="pi-action-bar" style={{ background: 'white', padding: '1.5rem 2rem', borderRadius: '12px', marginTop: '2rem' }}>
        <div className="pi-action-left" style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="pi-btn pi-btn-ghost" onClick={() => navigate('/documents')} style={{ padding: '0.75rem 2rem' }}>
            ← Back
          </button>
          <button className="dn-btn-discard" onClick={() => navigate('/documents')}>
            🗑 Discard
          </button>
        </div>
        <div className="pi-action-right" style={{ display: 'flex', gap: '1rem' }}>
          <button className="dn-btn-print" onClick={() => handleSave(true)} disabled={isSubmitting}>
            <Printer size={18} /> Save &amp; Print
          </button>
          <button className="dn-btn-save" onClick={() => handleSave(false)} disabled={isSubmitting}>
            <Save size={18} /> {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────── */}
      {showPrintModal && savedDoc && (
        <PrintViewModal doc={savedDoc} onClose={() => { setShowPrintModal(false); navigate('/documents'); }} />
      )}

      <ContactModal isOpen={isAddContactModalOpen} onClose={() => setIsAddContactModalOpen(false)} onSave={onNewContactSaved} />

      {additionalChargeModal && (
        <div className="pi-modal-overlay" style={{ zIndex: 1000 }}>
          <div className="pi-card" style={{ width: '400px', padding: '2rem' }}>
            <div className="pi-card-header" style={{ border: 'none', padding: '0 0 1.5rem 0', background: 'none' }}>
              <h3 className="pi-title">Additional Charge</h3>
              <button className="pi-reset-btn" onClick={() => setAdditionalChargeModal(false)}><X size={18} /></button>
            </div>
            <div className="pi-field-row" style={{ gridTemplateColumns: '130px 1fr', marginBottom: '1rem' }}>
              <label className="pi-label">Charge Name</label>
              <input className="pi-input" value={doc.additionalChargeName} onChange={e => setDoc({ ...doc, additionalChargeName: e.target.value })} />
            </div>
            <div className="pi-field-row" style={{ gridTemplateColumns: '130px 1fr', marginBottom: '1.5rem' }}>
              <label className="pi-label">Amount (₹)</label>
              <input type="number" className="pi-input" value={doc.additionalCharge} onChange={e => setDoc({ ...doc, additionalCharge: Number(e.target.value) })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="pi-btn pi-btn-ghost" onClick={() => setAdditionalChargeModal(false)}>Cancel</button>
              <button className="dn-btn-save" onClick={() => setAdditionalChargeModal(false)}>Apply</button>
            </div>
          </div>
        </div>
      )}
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

export default DebitNote;

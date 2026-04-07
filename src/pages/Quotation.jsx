import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PrintViewModal from '../components/PrintViewModal';
import ProductModal from '../components/ProductModal';
import ContactModal from '../components/ContactModal';
import {
  ArrowLeft, Trash2, Printer, Save, Plus,
  ChevronDown, MoreVertical, RotateCcw,
  BadgePercent, Briefcase, FileText, ShoppingCart
} from 'lucide-react';
import './Quotation.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const QUOTATION_TYPES = ['Standard Quotation', 'Service Quote', 'Project Estimate', 'International Offer'];
const DELIVERY_MODES = ['Hand Delivery', 'Courier', 'Transport', 'Self Pickup', 'Digital Delivery'];

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
  productId: '',
  name: '',
  hsn: '',
  quantity: 1,
  unit: 'PCS',
  rate: 0,
  taxRate: 0,
  amount: 0,
  taxAmount: 0,
  note: '',
});

const BLANK_CONTACT = () => ({
  customerName: '',
  companyName: '',
  gstin: '',
  state: 'Madhya Pradesh',
  stateCode: '23',
  phone: '',
  address: '',
  type: 'customer',
});

// ─── Helper Functions ────────────────────────────────────────────────────────

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
    return conv(Math.floor(num / 10000000)) + 'CRORE ' + conv(num % 10000000); // Fixed for croes but simple enough
  };
  return (conv(Math.floor(num)) + 'RUPEES ONLY').trim();
}

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

// ─── Main Component ──────────────────────────────────────────────────────────

const Quotation = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [products, setProducts] = useState([]);
  const [banks, setBanks] = useState(['CASH', 'CANARA BANK', 'HDFC BANK', 'SBI']);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [activeItemIdx, setActiveItemIdx] = useState(null);
  const [savedDoc, setSavedDoc] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);

  // ── Document State ──
  const [doc, setDoc] = useState({
    docType: 'Quotation',
    docNumberPrefix: 'QTN/',
    docNumberPostfix: '/25-26',
    customerId: '',
    customerInfo: {
      ms: '',
      address: '',
      contactPerson: '',
      phoneNo: '',
      gstinPan: '',
      revCharge: 'No',
      shipTo: '',
      distance: '',
      placeOfSupply: 'Madhya Pradesh',
    },
    offerDetail: {
      type: 'Standard Quotation',
      offerNo: '27', // Matching image example
      date: todayIso(),
      challanNo: '',
      challanDate: '',
      lrNo: '',
      deliveryMode: 'Select Delivery Mode',
    },
    items: [BLANK_ITEM()],
    bank: 'CANARA BANK',
    terms: [
      { title: 'Payment', detail: '50% advance, balance against delivery.' },
      { title: 'Jurisdiction', detail: 'Subject to our home Jurisdiction.\nOur Responsibility Ceases as soon as goods leaves our Premises.' }
    ],
    documentNote: '',
    taxable: 0,
    additionalCharge: 0,
    additionalChargeName: 'Freight',
    totalTaxable: 0,
    totalTax: 0,
    tcs: { mode: '+', value: '', unit: '%' },
    discount: { mode: '-', value: '', unit: 'Rs' },
    roundOff: true,
    grandTotal: 0,
  });

  // ── Load Data ──
  const loadMasterData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [contactList, productList] = await Promise.all([
        getItems('contacts', user.id),
        getItems('products', user.id),
      ]);
      setContacts(contactList);
      setProducts(productList);
    } catch (err) {
      console.error('Failed to load master data:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadMasterData();
      if (id) {
        const allDocs = await getItems('documents', user.id);
        const existing = allDocs.find(d => d._dbId === id || d.id === id);
        if (existing) setDoc(prev => ({ ...prev, ...existing }));
      }
      setLoading(false);
    };
    init();
  }, [id, user?.id, loadMasterData]);

  // ── Calculations ──
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
    discAmt = -Math.abs(discAmt);

    const rawTotal = totalTaxable + totalTax + tcsAmt + discAmt;
    const grandTotal = doc.roundOff ? Math.round(rawTotal) : Math.round(rawTotal * 100) / 100;

    setDoc(prev => ({ ...prev, taxable, totalTaxable, totalTax, grandTotal }));
  }, [doc.items, doc.additionalCharge, doc.tcs, doc.discount, doc.roundOff]);

  // ── Handlers ──
  const handleCustomerChange = (e) => {
    const vId = e.target.value;
    const c = contacts.find(x => x.id === vId);
    if (c) {
      setDoc(prev => ({
        ...prev,
        customerId: vId,
        customerInfo: {
          ...prev.customerInfo,
          ms: c.companyName || c.customerName || '',
          address: c.address || '',
          contactPerson: c.customerName || '',
          phoneNo: c.phone || '',
          gstinPan: c.gstin || '',
          placeOfSupply: c.state || 'Madhya Pradesh',
        },
      }));
    } else {
      setDoc(prev => ({ ...prev, customerId: vId }));
    }
  };

  const handleNested = (category, field, value) => {
    setDoc(prev => ({ ...prev, [category]: { ...prev[category], [field]: value } }));
  };

  const handleContactSaved = async (newContact) => {
    await loadMasterData();
    const cid = newContact.id || newContact._id || newContact._dbId;
    setDoc(prev => ({
      ...prev,
      customerId: cid,
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
        item.image = p.image || '';
      }
    } else {
      item[field] = value;
    }

    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const tax = Number(item.taxRate) || 0;
    const taxableTotal = qty * rate;

    item.amount = taxableTotal;
    item.taxAmount = taxableTotal * (tax / 100);

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
    if (!doc.offerDetail.offerNo) { alert('Please enter OFFER No.'); return; }

    setIsSubmitting(true);
    try {
      const fullNo = `${doc.docNumberPrefix}${doc.offerDetail.offerNo}${doc.docNumberPostfix}`;
      const finalDoc = {
        ...doc,
        invoiceNumber: fullNo,
        date: doc.offerDetail.date,
        total: doc.grandTotal,
        customerName: doc.customerInfo.ms,
        status: 'Quotation',
      };

      let result;
      if (id) {
        result = await updateItem('documents', id, finalDoc, user.id);
      } else {
        result = await addItem('documents', finalDoc, user.id);
      }

      if (print) {
        setSavedDoc(result || finalDoc);
        setShowPrintModal(true);
      } else {
        navigate('/documents');
      }
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save Quotation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTerm = () => {
    setDoc(prev => ({ ...prev, terms: [...prev.terms, { title: '', detail: '' }] }));
  };

  const updateTerm = (idx, field, value) => {
    const terms = [...doc.terms];
    terms[idx][field] = value;
    setDoc(prev => ({ ...prev, terms }));
  };

  if (loading) return <div className="quo-page"><div className="pi-loading-spinner" />Loading Quotation...</div>;

  return (
    <div className="quo-page">
      {/* Header */}
      <div className="quo-header">
        <div className="quo-header-left">
          <div className="quo-badge">
            <BadgePercent size={16} /> OFFER
          </div>
          <div>
            <div className="quo-title">Quotation / Offer</div>
            <div className="quo-subtitle">
              {id ? `Editing • ${doc.offerDetail.offerNo}` : 'Create professional business offer'}
            </div>
          </div>
        </div>
        <div className="quo-header-actions">
          <button className="quo-btn quo-btn-secondary" onClick={() => navigate('/documents')}>
            <ArrowLeft size={18} /> Back
          </button>
        </div>
      </div>

      <div className="quo-top-grid">
        {/* Customer Info */}
        <div className="quo-card">
          <div className="quo-card-header">
            <div className="quo-card-header-left">
              <div className="quo-card-icon customer">👤</div>
              <div>
                <div className="quo-card-title">Customer Information</div>
                <div className="quo-card-subtitle">Billing details for this offer</div>
              </div>
            </div>
            <MoreVertical size={18} color="#94a3b8" />
          </div>
          <div className="quo-card-body">
            <div className="quo-field-row">
              <label className="quo-label">M/S.<span className="req">*</span></label>
              <div className="quo-ms-row">
                <select className="quo-select" value={doc.customerId} onChange={handleCustomerChange}>
                  <option value="">Select Customer</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName || c.customerName}</option>
                  ))}
                </select>
                <button className="quo-ms-add-btn" onClick={() => setShowContactModal(true)}>+</button>
              </div>
            </div>
            <div className="quo-field-row align-top">
              <label className="quo-label">Address</label>
              <textarea
                className="quo-textarea"
                rows={3}
                value={doc.customerInfo.address}
                onChange={e => handleNested('customerInfo', 'address', e.target.value)}
              />
            </div>
            <div className="quo-field-row">
              <label className="quo-label">Contact Person</label>
              <input
                className="quo-input"
                placeholder="Contact Person"
                value={doc.customerInfo.contactPerson}
                onChange={e => handleNested('customerInfo', 'contactPerson', e.target.value)}
              />
            </div>
            <div className="quo-field-row">
              <label className="quo-label">Phone No</label>
              <input
                className="quo-input"
                placeholder="Phone No"
                value={doc.customerInfo.phoneNo}
                onChange={e => handleNested('customerInfo', 'phoneNo', e.target.value)}
              />
            </div>
            <div className="quo-field-row">
              <label className="quo-label">GSTIN / PAN</label>
              <input
                className="quo-input"
                placeholder="GSTIN / PAN"
                value={doc.customerInfo.gstinPan}
                onChange={e => handleNested('customerInfo', 'gstinPan', e.target.value.toUpperCase())}
              />
            </div>
            <div className="quo-field-row">
              <label className="quo-label">Rev. Charge</label>
              <select
                className="quo-select"
                value={doc.customerInfo.revCharge}
                onChange={e => handleNested('customerInfo', 'revCharge', e.target.value)}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div className="quo-field-row">
              <label className="quo-label">Ship To</label>
              <select
                className="quo-select"
                value={doc.customerInfo.shipTo}
                onChange={e => handleNested('customerInfo', 'shipTo', e.target.value)}
              >
                <option value="">--</option>
                <option value="Same as Billing">Same as Billing</option>
              </select>
            </div>
            <div className="quo-field-row">
              <label className="quo-label">Distance for e-way bill (in km)</label>
              <input
                className="quo-input"
                placeholder="0"
                value={doc.customerInfo.distance}
                onChange={e => handleNested('customerInfo', 'distance', e.target.value)}
              />
            </div>
            <div className="quo-field-row">
              <label className="quo-label">Place of Supply<span className="req">*</span></label>
              <select
                className="quo-select"
                value={doc.customerInfo.placeOfSupply}
                onChange={e => handleNested('customerInfo', 'placeOfSupply', e.target.value)}
              >
                {Object.keys(STATE_CODES).sort().map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* OFFER Detail */}
        <div className="quo-card">
          <div className="quo-card-header">
            <div className="quo-card-header-left">
              <div className="quo-card-icon detail">📋</div>
              <div>
                <div className="quo-card-title">OFFER Detail</div>
                <div className="quo-card-subtitle">Tracking & Logistics reference</div>
              </div>
            </div>
            <RotateCcw size={18} color="#94a3b8" style={{ cursor: 'pointer' }} />
          </div>
          <div className="quo-card-body">
            <div className="quo-field-row">
              <label className="quo-label">Type</label>
              <select
                className="quo-select"
                value={doc.offerDetail.type}
                onChange={e => handleNested('offerDetail', 'type', e.target.value)}
              >
                {QUOTATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="quo-field-row">
              <label className="quo-label">OFFER No.<span className="req">*</span></label>
              <div className="quo-no-row">
                <input
                  className="quo-input quo-prefix-input"
                  value={doc.docNumberPrefix}
                  onChange={e => setDoc({ ...doc, docNumberPrefix: e.target.value })}
                />
                <input
                  className="quo-input quo-number-input"
                  value={doc.offerDetail.offerNo}
                  onChange={e => handleNested('offerDetail', 'offerNo', e.target.value)}
                />
                <input
                  className="quo-input quo-postfix-input"
                  value={doc.docNumberPostfix}
                  onChange={e => setDoc({ ...doc, docNumberPostfix: e.target.value })}
                />
              </div>
            </div>
            <div className="quo-field-row">
              <label className="quo-label">OFFER Date<span className="req">*</span></label>
              <input
                type="date"
                className="quo-input"
                value={doc.offerDetail.date}
                onChange={e => handleNested('offerDetail', 'date', e.target.value)}
              />
            </div>
            <div className="quo-field-row">
              <label className="quo-label">Challan No.</label>
              <input
                className="quo-input"
                placeholder="Challan No."
                value={doc.offerDetail.challanNo}
                onChange={e => handleNested('offerDetail', 'challanNo', e.target.value)}
              />
            </div>
            <div className="quo-field-row">
              <label className="quo-label">Challan Date</label>
              <input
                type="date"
                className="quo-input"
                value={doc.offerDetail.challanDate}
                onChange={e => handleNested('offerDetail', 'challanDate', e.target.value)}
              />
            </div>
            <div className="quo-field-row">
              <label className="quo-label">L.R. No.</label>
              <input
                className="quo-input"
                placeholder="L.R. No."
                value={doc.offerDetail.lrNo}
                onChange={e => handleNested('offerDetail', 'lrNo', e.target.value)}
              />
            </div>
            <div className="quo-divider" />
            <div className="quo-field-row">
              <label className="quo-label">Delivery</label>
              <select
                className="quo-select"
                value={doc.offerDetail.deliveryMode}
                onChange={e => handleNested('offerDetail', 'deliveryMode', e.target.value)}
              >
                <option disabled>Select Delivery Mode</option>
                {DELIVERY_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="quo-card">
        <div className="quo-card-header">
          <div className="quo-card-header-left">
            <div className="quo-card-icon items">📦</div>
            <div className="quo-card-title">Product Items</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="quo-label" style={{ alignSelf: 'center' }}>Discount: </span>
            <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <button
                className={`quo-btn-secondary ${doc.discount.unit === 'Rs' ? 'active-tab' : ''}`}
                style={{ padding: '4px 12px', border: 'none', background: doc.discount.unit === 'Rs' ? '#10b981' : 'transparent', color: doc.discount.unit === 'Rs' ? 'white' : '#64748b' }}
                onClick={() => handleNested('discount', 'unit', 'Rs')}
              >Rs</button>
              <button
                className={`quo-btn-secondary ${doc.discount.unit === '%' ? 'active-tab' : ''}`}
                style={{ padding: '4px 12px', border: 'none', background: doc.discount.unit === '%' ? '#10b981' : 'transparent', color: doc.discount.unit === '%' ? 'white' : '#64748b' }}
                onClick={() => handleNested('discount', 'unit', '%')}
              >%</button>
            </div>
            <MoreVertical size={18} color="#94a3b8" />
          </div>
        </div>
        <div className="quo-table-scroll">
          <table className="quo-product-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>SR.</th>
                <th>PRODUCT / OTHER CHARGES</th>
                <th style={{ width: '150px' }}>HSN/SAC CODE</th>
                <th style={{ width: '100px' }}>QTY.</th>
                <th style={{ width: '100px' }}>UOM</th>
                <th style={{ width: '150px' }}>PRICE</th>
                <th style={{ width: '150px' }}>IGST</th>
                <th style={{ width: '150px' }}>TOTAL</th>
                <th style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="quo-sr-num">{idx + 1}</td>
                  <td>
                    <div className="flex gap-2 items-center">
                      <select
                        className="quo-cell-select"
                        style={{ flex: 1 }}
                        value={item.productId}
                        onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                      >
                        <option value="">Enter Product name</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <button
                        type="button"
                        className="quo-ms-add-btn"
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
                      className="quo-cell-note"
                      placeholder="Item Note..."
                      rows={2}
                      value={item.note}
                      onChange={e => handleItemChange(idx, 'note', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="quo-cell-input"
                      placeholder="HSN/SAC"
                      value={item.hsn}
                      onChange={e => handleItemChange(idx, 'hsn', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="quo-cell-input"
                      placeholder="Qty."
                      style={{ textAlign: 'center' }}
                      value={item.quantity}
                      onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="quo-cell-input"
                      placeholder="UOM"
                      style={{ textAlign: 'center' }}
                      value={item.unit}
                      onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="quo-cell-input"
                      placeholder="Price"
                      style={{ textAlign: 'right' }}
                      value={item.rate}
                      onChange={e => handleItemChange(idx, 'rate', e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      className="quo-cell-select"
                      value={item.taxRate}
                      onChange={e => handleItemChange(idx, 'taxRate', e.target.value)}
                    >
                      <option value="0">--</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                    <div className="quo-tax-display">{item.taxAmount.toFixed(2)}</div>
                  </td>
                  <td>
                    <div className="quo-total-value">{(item.amount + item.taxAmount).toFixed(2)}</div>
                  </td>
                  <td>
                    <button className="quo-remove-btn" onClick={() => removeItem(idx)}>×</button>
                  </td>
                </tr>
              ))}
              <tr className="quo-summary-row">
                <td colSpan={2} className="quo-summary-label">Total Quotation. Val</td>
                <td></td>
                <td style={{ textAlign: 'center' }}>{doc.items.reduce((a, i) => a + Number(i.quantity), 0)}</td>
                <td></td>
                <td style={{ textAlign: 'right' }}>{doc.items.reduce((a, i) => a + (Number(i.quantity) * Number(i.rate)), 0).toFixed(2)}</td>
                <td style={{ textAlign: 'center' }}>{doc.totalTax.toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>{(doc.taxable + doc.totalTax).toFixed(2)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ padding: '1rem', borderTop: '1px solid #f1f5f9' }}>
          <button className="quo-btn quo-btn-secondary" style={{ color: '#10b981' }} onClick={addItem_}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Footer Grid */}
      <div className="quo-footer-grid">
        <div className="quo-notes-section">
          {/* Bank */}
          <div className="quo-card" style={{ padding: '1.25rem' }}>
            <div className="quo-field-row">
              <label className="quo-label">Bank</label>
              <select className="quo-select" value={doc.bank} onChange={e => setDoc({ ...doc, bank: e.target.value })}>
                {banks.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {/* Terms */}
          <div className="quo-card" style={{ padding: '1.25rem' }}>
            <div className="quo-card-title" style={{ marginBottom: '1rem' }}>Terms & Condition / Additional Note</div>
            {doc.terms.map((term, idx) => (
              <div key={idx} className="quo-terms-card" style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                  <label className="quo-label" style={{ width: '60px' }}>Title</label>
                  <input
                    className="quo-input"
                    value={term.title}
                    onChange={e => updateTerm(idx, 'title', e.target.value)}
                  />
                  <Trash2 size={18} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => {
                    const t = [...doc.terms]; t.splice(idx, 1); setDoc({ ...doc, terms: t });
                  }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label className="quo-label" style={{ width: '60px' }}>Detail</label>
                  <textarea
                    className="quo-textarea"
                    rows={2}
                    value={term.detail}
                    onChange={e => updateTerm(idx, 'detail', e.target.value)}
                  />
                </div>
              </div>
            ))}
            <button className="quo-add-notes-btn" onClick={addTerm}><Plus size={16} /> Add Notes</button>
          </div>

          <div className="quo-card" style={{ padding: '1.25rem' }}>
            <label className="quo-label">Document Note / Remarks</label>
            <textarea
              className="quo-textarea"
              placeholder="Internal remarks..."
              value={doc.documentNote}
              onChange={e => setDoc({ ...doc, documentNote: e.target.value })}
            />
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem', fontStyle: 'italic' }}>Not Visible on Print</div>
          </div>
        </div>

        <div className="quo-summary-section">
          <div className="quo-calc-table">
            <div className="quo-calc-row">
              <span className="quo-calc-label">Taxable</span>
              <span className="quo-calc-val">{doc.taxable.toFixed(2)}</span>
            </div>
            <div className="quo-add-additional" onClick={() => setDoc({ ...doc, additionalCharge: doc.additionalCharge ? 0 : 500 })}>
              + Add Additional Charge
            </div>
            {doc.additionalCharge > 0 && (
              <div className="quo-calc-row">
                <input className="quo-input" style={{ width: '100px', padding: '2px 4px' }} value={doc.additionalChargeName} onChange={e => setDoc({ ...doc, additionalChargeName: e.target.value })} />
                <input className="quo-input" style={{ width: '80px', padding: '2px 4px', textAlign: 'right' }} type="number" value={doc.additionalCharge} onChange={e => setDoc({ ...doc, additionalCharge: Number(e.target.value) })} />
              </div>
            )}
            <div className="quo-calc-row bordered">
              <span className="quo-calc-label">Total Taxable</span>
              <span className="quo-calc-val">{doc.totalTaxable.toFixed(2)}</span>
            </div>
            <div className="quo-calc-row">
              <span className="quo-calc-label">Total Tax</span>
              <span className="quo-calc-val">{doc.totalTax.toFixed(2)}</span>
            </div>

            <div className="quo-calc-row">
              <div className="quo-modifier-row">
                <span>TCS</span>
                <select className="quo-mod-select" value={doc.tcs.mode} onChange={e => handleNested('tcs', 'mode', e.target.value)}>
                  <option value="+">+</option>
                  <option value="-">-</option>
                </select>
                <input className="quo-mod-input" type="number" value={doc.tcs.value} onChange={e => handleNested('tcs', 'value', e.target.value)} />
                <select className="quo-mod-select" value={doc.tcs.unit} onChange={e => handleNested('tcs', 'unit', e.target.value)}>
                  <option value="%">%</option>
                  <option value="Rs">Rs</option>
                </select>
              </div>
              <span className="quo-calc-val">
                {((Number(doc.tcs.unit === '%' ? doc.totalTaxable * (Number(doc.tcs.value) / 100) : doc.tcs.value)) || 0).toFixed(2)}
              </span>
            </div>

            <div className="quo-calc-row">
              <div className="quo-modifier-row">
                <span>Discount</span>
                <select className="quo-mod-select" value={doc.discount.mode} onChange={e => handleNested('discount', 'mode', e.target.value)}>
                  <option value="+">+</option>
                  <option value="-">-</option>
                </select>
                <input className="quo-mod-input" type="number" value={doc.discount.value} onChange={e => handleNested('discount', 'value', e.target.value)} />
                <select className="quo-mod-select" value={doc.discount.unit} onChange={e => handleNested('discount', 'unit', e.target.value)}>
                  <option value="%">%</option>
                  <option value="Rs">Rs</option>
                </select>
              </div>
              <span className="quo-calc-val" style={{ color: '#ef4444' }}>
                -{((Number(doc.discount.unit === '%' ? doc.totalTaxable * (Number(doc.discount.value) / 100) : doc.discount.value)) || 0).toFixed(2)}
              </span>
            </div>

            <div className="quo-calc-row bordered">
              <span className="quo-calc-label">Round Off</span>
              <label className="quo-switch">
                <input type="checkbox" checked={doc.roundOff} onChange={e => setDoc({ ...doc, roundOff: e.target.checked })} />
                <span className="quo-slider"></span>
              </label>
              <span className="quo-calc-val">
                {doc.roundOff ? (Math.round(doc.grandTotal) - doc.grandTotal).toFixed(2) : '0.00'}
              </span>
            </div>

            <div className="quo-grand-total-box">
              <span className="quo-grand-total-label">Grand Total</span>
              <span className="quo-grand-total-val">{doc.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="quo-in-words">
              Total in words: <br />
              <strong>{numberToWords(doc.grandTotal)}</strong>
            </div>

            <div className="quo-smart-suggestion">
              <span>Smart Suggestion</span>
              <div className="quo-plus-circle">+</div>
            </div>
          </div>

          <div className="quo-actions">
            <button className="quo-btn quo-btn-secondary" onClick={() => navigate('/documents')}>
              Back
            </button>
            <button className="quo-btn quo-btn-danger" onClick={() => { if (window.confirm('Discard?')) navigate('/documents'); }}>
              Discard
            </button>
            <button className="quo-btn quo-btn-primary" onClick={() => handleSave(true)} disabled={isSubmitting}>
              <Printer size={18} /> Save & Print
            </button>
            <button className="quo-btn quo-btn-primary" style={{ background: '#059669' }} onClick={() => handleSave(false)} disabled={isSubmitting}>
              <Save size={18} /> Save
            </button>
          </div>
        </div>
      </div>

      {showPrintModal && (
        <PrintViewModal
          doc={savedDoc}
          onClose={() => {
            setShowPrintModal(false);
            navigate('/documents');
          }}
        />
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
      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        onSave={handleContactSaved}
      />
    </div>
  );
};

export default Quotation;

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PrintViewModal from '../components/PrintViewModal';
import ProductModal from '../components/ProductModal';
import ContactModal from '../components/ContactModal';
import { getItems, addItem, updateItem } from '../utils/db';
import {
  ArrowLeft, Trash2, Printer, Save, Plus,
  MoreVertical, RotateCcw, Truck, Landmark
} from 'lucide-react';
import './DeliveryChallan.css';
import './product-table.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const DC_TYPES = ['Standard', 'Returnable', 'Non-Returnable', 'Job Work', 'Exhibition'];
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
  barcodeNo: '', // Added barcode for consistency
  quantity: 1,
  unit: 'PCS',
  rate: 0,
  taxRate: 0,
  amount: 0,
  taxAmount: 0,
  note: '',
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
    return conv(Math.floor(num / 10000000)) + 'CRORE ' + conv(num % 10000000);
  };
  return (conv(Math.floor(num)) + 'RUPEES ONLY').trim();
}

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

// ─── Main Component ──────────────────────────────────────────────────────────

const DeliveryChallan = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [products, setProducts] = useState([]);
  const [banks, setBanks] = useState([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [activeItemIdx, setActiveItemIdx] = useState(null);
  const [savedDoc, setSavedDoc] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);

  // ── Document State ──
  const [doc, setDoc] = useState({
    docType: 'Delivery Challan',
    docPrefix: 'DC/',
    docPostfix: '/25-26',
    customerId: '',
    customerInfo: {
      supplyType: 'Outward',
      ms: '',
      address: '',
      contactPerson: '',
      phoneNo: '',
      gstinPan: '',
      revCharge: 'No',
      shipTo: '--',
      placeOfSupply: 'Madhya Pradesh',
    },
    dcDetail: {
      type: 'Standard',
      challanNo: '1',
      date: todayIso(),
      lrNo: '',
      ewayNo: '',
      reasonForEway: '',
      deliveryMode: 'Hand Delivery',
    },
    items: [BLANK_ITEM()],
    bankId: '',
    bank: '',
    terms: [
      { title: 'Goods Receipt', detail: 'Goods received in good condition and order.' },
      { title: 'Jurisdiction', detail: 'Subject to our home Jurisdiction.' }
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
      const [contactList, productList, bankList] = await Promise.all([
        getItems('contacts', user.id),
        getItems('products', user.id),
        getItems('banks', user.id),
      ]);
      setContacts(contactList);
      setProducts(productList);
      setBanks(bankList || []);
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
    if (!doc.dcDetail.challanNo) { alert('Please enter Delivery Challan No.'); return; }

    setIsSubmitting(true);
    try {
      const fullNo = `${doc.docPrefix}${doc.dcDetail.challanNo}${doc.docPostfix}`;
      const finalDoc = {
        ...doc,
        invoiceNumber: fullNo,
        date: doc.dcDetail.date,
        total: doc.grandTotal,
        customerName: doc.customerInfo.ms,
        status: 'Delivery Challan',
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
      alert('Failed to save Delivery Challan.');
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

  if (loading) return (
    <div className="dc-page">
      <div className="pi-loading">
        <div className="pi-loading-spinner" />
        Loading Delivery Challan...
      </div>
    </div>
  );

  return (
    <div className="dc-page">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="dc-header">
        <div className="dc-header-left">
          <div className="dc-badge">
            <Truck size={16} /> DELIVERY CHALLAN
          </div>
          <div>
            <div className="dc-title">Delivery Challan</div>
            <div className="dc-subtitle">
              {id ? `Editing • ${doc.dcDetail.challanNo}` : 'Create a new dispatch record'}
            </div>
          </div>
        </div>
        <div className="dc-actions">
          <button className="dc-btn dc-btn-secondary" onClick={() => navigate('/documents')}>
            <ArrowLeft size={18} /> Back
          </button>
          <button className="dc-btn dc-btn-primary" onClick={() => handleSave(false)} disabled={isSubmitting}>
            <Save size={18} /> {isSubmitting ? 'Saving...' : 'Save Challan'}
          </button>
        </div>
      </div>

      {/* ── Top Grid: Customer Info + Challan Detail ─────── */}
      <div className="dc-top-grid">
        {/* Customer Information */}
        <div className="dc-card">
          <div className="dc-card-header">
            <div className="dc-card-header-left">
              <div className="dc-card-icon customer">🏪</div>
              <div>
                <div className="dc-card-title">Customer Information</div>
                <div className="dc-card-subtitle">Dispatch destination</div>
              </div>
            </div>
          </div>
          <div className="dc-card-body">
            <div className="dc-field-row radio-group-row">
              <label className="dc-label">Supply Type</label>
              <div className="dc-radio-group">
                <label className="dc-radio-label">
                  <input
                    type="radio"
                    name="supplyType"
                    value="Outward"
                    className="dc-radio-input"
                    checked={doc.customerInfo.supplyType === 'Outward'}
                    onChange={e => handleNested('customerInfo', 'supplyType', e.target.value)}
                  /> Outward
                </label>
                <label className="dc-radio-label">
                  <input
                    type="radio"
                    name="supplyType"
                    value="Inward"
                    className="dc-radio-input"
                    checked={doc.customerInfo.supplyType === 'Inward'}
                    onChange={e => handleNested('customerInfo', 'supplyType', e.target.value)}
                  /> Inward
                </label>
              </div>
            </div>

            <div className="dc-field-row">
              <label className="dc-label">M/S.<span className="req">*</span></label>
              <div className="dc-ms-row">
                <select className="dc-select" value={doc.customerId} onChange={handleCustomerChange}>
                  <option value="">Select Customer</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName || c.customerName}</option>
                  ))}
                </select>
                <button className="dc-ms-add-btn" onClick={() => setShowContactModal(true)}>+</button>
              </div>
            </div>

            <div className="dc-field-row align-top">
              <label className="dc-label">Address</label>
              <textarea
                className="dc-textarea"
                rows={3}
                value={doc.customerInfo.address}
                onChange={e => handleNested('customerInfo', 'address', e.target.value)}
              />
            </div>

            <div className="dc-field-row">
              <label className="dc-label">Contact Person</label>
              <input
                className="dc-input"
                placeholder="Name"
                value={doc.customerInfo.contactPerson}
                onChange={e => handleNested('customerInfo', 'contactPerson', e.target.value)}
              />
            </div>

            <div className="dc-field-row">
              <label className="dc-label">Phone No</label>
              <input
                className="dc-input"
                placeholder="Phone No"
                value={doc.customerInfo.phoneNo}
                onChange={e => handleNested('customerInfo', 'phoneNo', e.target.value)}
              />
            </div>

            <div className="dc-field-row">
              <label className="dc-label">GSTIN / PAN</label>
              <input
                className="dc-input"
                placeholder="GSTIN / PAN"
                value={doc.customerInfo.gstinPan}
                onChange={e => handleNested('customerInfo', 'gstinPan', e.target.value.toUpperCase())}
              />
            </div>

            <div className="dc-field-row">
              <label className="dc-label">Ship To</label>
              <select
                className="dc-select"
                value={doc.customerInfo.shipTo}
                onChange={e => handleNested('customerInfo', 'shipTo', e.target.value)}
              >
                <option value="--">--</option>
                <option value="Same as Billing">Same as Billing</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.companyName || c.customerName}</option>
                ))}
              </select>
            </div>

            <div className="dc-field-row">
              <label className="dc-label">Place of Supply<span className="req">*</span></label>
              <select
                className="dc-select"
                value={doc.customerInfo.placeOfSupply}
                onChange={e => handleNested('customerInfo', 'placeOfSupply', e.target.value)}
              >
                {Object.keys(STATE_CODES).sort().map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Delivery Challan Detail (1 Column) */}
        <div className="dc-card">
          <div className="dc-card-header">
            <div className="dc-card-header-left">
              <div className="dc-card-icon detail">📋</div>
              <div>
                <div className="dc-card-title">Delivery Challan Detail</div>
                <div className="dc-card-subtitle">Dispatch metadata</div>
              </div>
            </div>
            <RotateCcw size={18} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => navigate(0)} />
          </div>
          <div className="dc-card-body">
            <div className="dc-field-row">
              <label className="dc-label">Challan Type</label>
              <select
                className="dc-select"
                value={doc.dcDetail.type}
                onChange={e => handleNested('dcDetail', 'type', e.target.value)}
              >
                {DC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="dc-field-row">
              <label className="dc-label">Challan No.<span className="req">*</span></label>
              <div className="dc-no-row">
                <input
                  className="dc-input dc-prefix-input"
                  placeholder="Pre"
                  value={doc.docPrefix}
                  onChange={e => setDoc({ ...doc, docPrefix: e.target.value })}
                />
                <input
                  className="dc-input dc-number-input"
                  value={doc.dcDetail.challanNo}
                  onChange={e => handleNested('dcDetail', 'challanNo', e.target.value)}
                />
                <input
                  className="dc-input dc-postfix-input"
                  placeholder="Post"
                  value={doc.docPostfix}
                  onChange={e => setDoc({ ...doc, docPostfix: e.target.value })}
                />
              </div>
            </div>

            <div className="dc-field-row">
              <label className="dc-label">Challan Date<span className="req">*</span></label>
              <input
                type="date"
                className="dc-input"
                value={doc.dcDetail.date}
                onChange={e => handleNested('dcDetail', 'date', e.target.value)}
              />
            </div>

            <div className="dc-divider" />

            <div className="dc-field-row">
              <label className="dc-label">L.R. No.</label>
              <input
                className="dc-input"
                placeholder="L.R. No."
                value={doc.dcDetail.lrNo}
                onChange={e => handleNested('dcDetail', 'lrNo', e.target.value)}
              />
            </div>

            <div className="dc-field-row">
              <label className="dc-label">E-Way Bill No.</label>
              <input
                className="dc-input"
                placeholder="E-Way No."
                value={doc.dcDetail.ewayNo}
                onChange={e => handleNested('dcDetail', 'ewayNo', e.target.value)}
              />
            </div>

            <div className="dc-field-row">
              <label className="dc-label">Eway Reason</label>
              <input
                className="dc-input"
                placeholder="Reason"
                value={doc.dcDetail.reasonForEway}
                onChange={e => handleNested('dcDetail', 'reasonForEway', e.target.value)}
              />
            </div>

            <div className="dc-field-row">
              <label className="dc-label">Delivery Mode</label>
              <select
                className="dc-select"
                value={doc.dcDetail.deliveryMode}
                onChange={e => handleNested('dcDetail', 'deliveryMode', e.target.value)}
              >
                {DELIVERY_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Product Items Table ──────────────────────────────── */}
      <div className="pt-table-card">
        <div className="pt-table-header">
          <div className="dc-card-header-left">
            <div className="dc-card-icon items">📦</div>
            <div>
              <div className="dc-card-title">Product Items</div>
              <div className="dc-card-subtitle">{doc.items.length} item{doc.items.length !== 1 ? 's' : ''} listed</div>
            </div>
          </div>
          <div className="pt-table-actions">
            <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '20px', overflow: 'hidden', background: '#f8fafc', padding: '2px' }}>
              <button
                className={`dc-btn`}
                style={{ padding: '4px 12px', fontSize: '0.7rem', border: 'none', background: doc.discount.unit === 'Rs' ? 'var(--dc-primary, #6366f1)' : 'transparent', color: doc.discount.unit === 'Rs' ? 'white' : '#64748b' }}
                onClick={() => handleNested('discount', 'unit', 'Rs')}
              >Rs</button>
              <button
                className={`dc-btn`}
                style={{ padding: '4px 12px', fontSize: '0.7rem', border: 'none', background: doc.discount.unit === '%' ? 'var(--dc-primary, #6366f1)' : 'transparent', color: doc.discount.unit === '%' ? 'white' : '#64748b' }}
                onClick={() => handleNested('discount', 'unit', '%')}
              >%</button>
            </div>
          </div>
        </div>
        <div className="pt-table-scroll">
          <table className="pt-product-table">
            <thead>
              <tr>
                <th className="sr-col">SR.</th>
                <th className="product-col">PRODUCT / OTHER CHARGES</th>
                <th className="barcode-col">BARCODE</th>
                <th className="hsn-col">HSN/SAC</th>
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
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select
                        className="pt-cell-select"
                        style={{ flex: 1, textAlign: 'left' }}
                        value={item.productId}
                        onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                      >
                        <option value="">Enter Product name</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <button
                        type="button"
                        className="pt-cell-add-btn"
                        onClick={() => { setActiveItemIdx(idx); setShowAddProduct(true); }}
                      >+</button>
                    </div>
                    <textarea
                      className="pt-cell-note"
                      placeholder="Item Note..."
                      rows={2}
                      value={item.note}
                      onChange={e => handleItemChange(idx, 'note', e.target.value)}
                    />
                  </td>
                  <td>
                    <input className="pt-cell-input" placeholder="Barcode" value={item.barcodeNo || ''} onChange={e => handleItemChange(idx, 'barcodeNo', e.target.value)} />
                  </td>
                  <td>
                    <input className="pt-cell-input" placeholder="HSN/SAC" value={item.hsn} onChange={e => handleItemChange(idx, 'hsn', e.target.value)} />
                  </td>
                  <td>
                    <input type="number" className="pt-cell-input" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} />
                  </td>
                  <td>
                    <input className="pt-cell-input" placeholder="UOM" value={item.unit} onChange={e => handleItemChange(idx, 'unit', e.target.value)} />
                  </td>
                  <td>
                    <input type="number" className="pt-cell-input" style={{ textAlign: 'right' }} value={item.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} />
                  </td>
                  <td>
                    <select className="pt-cell-select" value={item.taxRate} onChange={e => handleItemChange(idx, 'taxRate', e.target.value)}>
                      {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                    <div className="pt-tax-display">{item.taxAmount.toFixed(2)}</div>
                  </td>
                  <td>
                    <div className="pt-total-value">{(item.amount + item.taxAmount).toFixed(2)}</div>
                  </td>
                  <td>
                    <button className="pt-remove-btn" onClick={() => removeItem(idx)}>×</button>
                  </td>
                </tr>
              ))}
              <tr className="pt-total-inv-row">
                <td colSpan={2} style={{ textAlign: 'right', fontWeight: '800', color: '#6366f1' }}>Total Summary</td>
                <td></td>
                <td></td>
                <td style={{ textAlign: 'center', fontWeight: '800' }}>{doc.items.reduce((a, i) => a + Number(i.quantity), 0)}</td>
                <td></td>
                <td style={{ textAlign: 'right', fontWeight: '800' }}>{doc.items.reduce((a, i) => a + (Number(i.quantity) * Number(i.rate)), 0).toFixed(2)}</td>
                <td style={{ textAlign: 'center', fontWeight: '800' }}>{doc.totalTax.toFixed(2)}</td>
                <td style={{ textAlign: 'right', fontWeight: '800', color: '#059669' }}>{(doc.taxable + doc.totalTax).toFixed(2)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ padding: '1rem', borderTop: '1px solid #f1f5f9', background: '#fcfcfd' }}>
          <button className="dc-btn dc-btn-secondary" style={{ color: '#6366f1' }} onClick={addItem_}>
            <Plus size={16} /> Add Product Row
          </button>
        </div>
      </div>

      {/* ── Footer Grid ────────────────────────────────────────── */}
      <div className="dc-footer-grid">
        <div className="dc-notes-section">
          {/* Bank Selection */}
          <div className="dc-card">
            <div className="dc-card-header">
              <div className="dc-card-header-left">
                <div className="dc-card-icon totals"><Landmark size={18} /></div>
                <div className="dc-card-title">Bank Selection</div>
              </div>
            </div>
            <div className="dc-card-body">
              <div className="dc-field-row">
                <label className="dc-label">Select Bank</label>
                <select className="dc-select" value={doc.bankId} onChange={e => {
                  const b = banks.find(x => x.id === e.target.value);
                  setDoc({ ...doc, bankId: e.target.value, bank: b ? b.bankName : '' });
                }}>
                  <option value="">-- Choose Account --</option>
                  {banks.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber.slice(-4)}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="dc-card">
            <div className="dc-card-header">
              <div className="dc-card-title">Terms & Conditions</div>
            </div>
            <div className="dc-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {doc.terms.map((term, idx) => (
                <div key={idx} className="dc-terms-card">
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                    <input className="dc-input" placeholder="Title" value={term.title} onChange={e => updateTerm(idx, 'title', e.target.value)} />
                    <button className="dc-btn" style={{ padding: '0.4rem', background: '#fee2e2', color: '#ef4444' }} onClick={() => {
                      const t = [...doc.terms]; t.splice(idx, 1); setDoc({ ...doc, terms: t });
                    }}><Trash2 size={16} /></button>
                  </div>
                  <textarea className="dc-textarea" rows={2} placeholder="Detail" value={term.detail} onChange={e => updateTerm(idx, 'detail', e.target.value)} />
                </div>
              ))}
              <button className="dc-add-notes-btn" onClick={addTerm}><Plus size={16} /> Add Term</button>
            </div>
          </div>

          <div className="dc-card">
            <div className="dc-card-body">
              <label className="dc-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Challan Remarks (Internal)</label>
              <textarea
                className="dc-textarea"
                placeholder="Internal notes..."
                value={doc.documentNote}
                onChange={e => setDoc({ ...doc, documentNote: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Summary / Calculator */}
        <div className="dc-summary-section">
          <div className="dc-card-title" style={{ marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '1.5px solid #f1f5f9' }}>Calculation Summary</div>
          <div className="dc-calc-table">
            <div className="dc-calc-row">
              <span className="dc-calc-label">Total Taxable</span>
              <span className="dc-calc-val">₹ {doc.taxable.toFixed(2)}</span>
            </div>

            <div className="dc-modifier-row">
              <div className="dc-modifier-label" style={{ flex: '1', textAlign: 'left' }}>
                <input className="dc-input" style={{ border: 'none', background: 'transparent', padding: 0 }} value={doc.additionalChargeName} onChange={e => setDoc({ ...doc, additionalChargeName: e.target.value })} />
              </div>
              <input type="number" className="dc-modifier-input" style={{ width: '80px', textAlign: 'right' }} value={doc.additionalCharge} onChange={e => setDoc({ ...doc, additionalCharge: Number(e.target.value) })} />
            </div>

            <div className="dc-calc-row bordered">
              <span className="dc-calc-label">Sub Total</span>
              <span className="dc-calc-val">₹ {doc.totalTaxable.toFixed(2)}</span>
            </div>

            <div className="dc-calc-row">
              <span className="dc-calc-label">Total Tax (GST)</span>
              <span className="dc-calc-val">₹ {doc.totalTax.toFixed(2)}</span>
            </div>

            <div className="dc-modifier-row">
              <div className="dc-modifier-label">TCS</div>
              <select className="dc-modifier-select" value={doc.tcs.mode} onChange={e => handleNested('tcs', 'mode', e.target.value)}>
                <option value="+">+</option><option value="-">-</option>
              </select>
              <input className="dc-modifier-input" type="number" value={doc.tcs.value} onChange={e => handleNested('tcs', 'value', e.target.value)} />
              <select className="dc-modifier-unit" value={doc.tcs.unit} onChange={e => handleNested('tcs', 'unit', e.target.value)}>
                <option value="%">%</option><option value="Rs">Rs</option>
              </select>
            </div>

            <div className="dc-modifier-row">
              <div className="dc-modifier-label">Discount</div>
              <input className="dc-modifier-input" type="number" value={doc.discount.value} onChange={e => handleNested('discount', 'value', e.target.value)} />
              <div className="dc-modifier-unit">{doc.discount.unit}</div>
            </div>

            <div className="dc-grand-total">
              <span className="dc-grand-label">GRAND TOTAL</span>
              <span className="dc-grand-value">₹ {doc.grandTotal.toFixed(2)}</span>
            </div>

            <div className="dc-words-row">
              <div className="dc-words-label">Amount in Words</div>
              <div className="dc-words-value">{numberToWords(doc.grandTotal)}</div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button className="dc-btn dc-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleSave(true)}>
                <Printer size={18} /> Save &amp; Print
              </button>
              <button className="dc-btn dc-btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleSave(false)}>
                <Save size={18} /> Save Only
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showContactModal && <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} onSave={handleContactSaved} type="customer" />}
      {showAddProduct && <ProductModal isOpen={showAddProduct} onClose={() => setShowAddProduct(false)} onSave={(p) => { handleItemChange(activeItemIdx, 'productId', p.id); loadMasterData(); }} />}
      {showPrintModal && <PrintViewModal isOpen={showPrintModal} onClose={() => { setShowPrintModal(false); navigate('/documents'); }} documentData={savedDoc} />}
    </div>
  );
};

export default DeliveryChallan;

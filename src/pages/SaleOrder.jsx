import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PrintViewModal from '../components/PrintViewModal';
import ProductModal from '../components/ProductModal';
import ContactModal from '../components/ContactModal';
import { getItems, addItem, updateItem } from '../utils/db';
import {
  Trash2, Plus, RotateCcw, Truck, Landmark, Mail, X
} from 'lucide-react';
import './SaleOrder.css';
import './product-table.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const SO_TYPES = ['Regular Sale Order', 'Contract SO', 'Export SO', 'Service SO'];
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

function futureDateIso(days) {
  return new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
}

// ─── Main Component ──────────────────────────────────────────────────────────

const SaleOrder = () => {
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
  const [additionalChargeModal, setAdditionalChargeModal] = useState(false);
  const [additionalChargeName, setAdditionalChargeName] = useState('Freight');
  const [additionalChargeValue, setAdditionalChargeValue] = useState('');

  // ── Document State ──
  const [doc, setDoc] = useState({
    docType: 'Sale Order',
    docPrefix: 'SO/',
    docPostfix: '/25-26',
    customerId: '',
    customerInfo: {
      ms: '',
      address: '',
      contactPerson: '',
      phoneNo: '',
      gstinPan: '',
      revCharge: 'No',
      shipTo: '--',
      distance: '',
      placeOfSupply: 'Madhya Pradesh',
    },
    soDetail: {
      type: 'Regular Sale Order',
      soNo: '1',
      date: todayIso(),
      challanNo: '',
      challanDate: '',
      refNo: '',
      deliveryMode: 'Hand Delivery',
    },
    items: [BLANK_ITEM()],
    bankId: '',
    bank: '',
    completionDate: futureDateIso(15),
    shareEmail: false,
    terms: [
      { id: 1, title: 'Jurisdiction', detail: 'Subject to our home Jurisdiction.' },
      { id: 2, title: 'Responsibility', detail: 'Our Responsibility Ceases as soon as goods leave our Premises.' },
      { id: 3, title: 'Returns', detail: 'Goods once sold will not taken back.' },
      { id: 4, title: 'Delivery', detail: 'Delivery Ex-Premises.' }
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
  const roundOffAmt = (() => {
    const taxableTotal = doc.items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const totalTax = doc.items.reduce((acc, item) => acc + (Number(item.taxAmount) || 0), 0);
    const subTotal = taxableTotal + (Number(doc.additionalCharge) || 0);

    const tcsVal = Number(doc.tcs.value) || 0;
    let tcsAmt = doc.tcs.unit === '%' ? subTotal * (tcsVal / 100) : tcsVal;
    if (doc.tcs.mode === '-') tcsAmt = -Math.abs(tcsAmt); else tcsAmt = Math.abs(tcsAmt);

    const discVal = Number(doc.discount.value) || 0;
    let discAmt = doc.discount.unit === '%' ? subTotal * (discVal / 100) : discVal;
    discAmt = -Math.abs(discAmt);

    const rawTotal = subTotal + totalTax + tcsAmt + discAmt;
    return doc.roundOff ? Math.round(rawTotal) - rawTotal : 0;
  })();

  useEffect(() => {
    const taxable = doc.items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const totalTax = doc.items.reduce((acc, item) => acc + (Number(item.taxAmount) || 0), 0);
    const totalTaxable = taxable + (Number(doc.additionalCharge) || 0);

    const tcsVal = Number(doc.tcs.value) || 0;
    let tcsAmt = doc.tcs.unit === '%' ? totalTaxable * (tcsVal / 100) : tcsVal;
    if (doc.tcs.mode === '-') tcsAmt = -Math.abs(tcsAmt); else tcsAmt = Math.abs(tcsAmt);

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
    if (!doc.soDetail.soNo) { alert('Please enter Sale Order No.'); return; }

    setIsSubmitting(true);
    try {
      const fullNo = `${doc.docPrefix}${doc.soDetail.soNo}${doc.docPostfix}`;
      const finalDoc = {
        ...doc,
        invoiceNumber: fullNo,
        date: doc.soDetail.date,
        total: doc.grandTotal,
        customerName: doc.customerInfo.ms,
        status: 'Sale Order',
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
      alert('Failed to save Sale Order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTerm = () => {
    setDoc(prev => ({ ...prev, terms: [...prev.terms, { id: Date.now(), title: '', detail: '' }] }));
  };

  const updateTerm = (id, field, value) => {
    const terms = doc.terms.map(t => t.id === id ? { ...t, [field]: value } : t);
    setDoc(prev => ({ ...prev, terms }));
  };

  const deleteTerm = (id) => {
    setDoc(prev => ({ ...prev, terms: prev.terms.filter(t => t.id !== id) }));
  };

  if (loading) return (
    <div className="so-page">
      <div className="so-loading">
        <div className="so-loading-spinner" />
        Loading...
      </div>
    </div>
  );

  return (
    <div className="so-page">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="so-header">
        <div className="so-header-left">
          <div className="so-badge">
            <Truck size={16} /> SALE ORDER
          </div>
          <div>
            <div className="so-title">Sale Order</div>
            <div className="so-subtitle">
              {id ? `Editing • ${doc.customerInfo.ms}` : 'Register New Sale Order'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Top Grid (Exact PI Alignment) ─────────────────── */}
      <div className="so-top-grid">
        {/* Customer Information Card */}
        <div className="so-card">
          <div className="so-card-header">
            <div className="so-card-header-left">
              <div className="so-card-icon customer">🏪</div>
              <div>
                <div className="so-card-title">Customer Information</div>
                <div className="so-card-subtitle">Client details</div>
              </div>
            </div>
          </div>
          <div className="so-card-body">
            <div className="so-field-row">
              <label className="so-label">M/S.<span className="req">*</span></label>
              <div className="so-ms-row">
                <select className="so-select" value={doc.customerId} onChange={handleCustomerChange}>
                  <option value="">Select Customer</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.companyName || c.customerName}</option>)}
                </select>
                <button className="so-ms-add-btn" onClick={() => setShowContactModal(true)}>+</button>
              </div>
            </div>
            <div className="so-field-row align-top">
              <label className="so-label">Address</label>
              <textarea className="so-textarea" rows={3} value={doc.customerInfo.address} onChange={e => handleNested('customerInfo', 'address', e.target.value)} />
            </div>
            <div className="so-field-row">
              <label className="so-label">Contact Person</label>
              <input className="so-input" value={doc.customerInfo.contactPerson} onChange={e => handleNested('customerInfo', 'contactPerson', e.target.value)} />
            </div>
            <div className="so-field-row">
              <label className="so-label">Phone No</label>
              <input className="so-input" value={doc.customerInfo.phoneNo} onChange={e => handleNested('customerInfo', 'phoneNo', e.target.value)} />
            </div>
            <div className="so-field-row">
              <label className="so-label">GSTIN / PAN</label>
              <input className="so-input" value={doc.customerInfo.gstinPan} onChange={e => handleNested('customerInfo', 'gstinPan', e.target.value.toUpperCase())} />
            </div>
            <div className="so-field-row">
              <label className="so-label">Rev. Charge</label>
              <select className="so-select" value={doc.customerInfo.revCharge} onChange={e => handleNested('customerInfo', 'revCharge', e.target.value)}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div className="so-field-row">
              <label className="so-label">Ship To</label>
              <select className="so-select" value={doc.customerInfo.shipTo} onChange={e => handleNested('customerInfo', 'shipTo', e.target.value)}>
                <option value="--">--</option>
                <option value="Same as Billing">Same as Billing</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.companyName || c.customerName}</option>)}
              </select>
            </div>
            <div className="so-field-row">
              <label className="so-label">Distance (km)</label>
              <input type="number" className="so-input" value={doc.customerInfo.distance} onChange={e => handleNested('customerInfo', 'distance', e.target.value)} />
            </div>
            <div className="so-field-row">
              <label className="so-label">Place of Supply*</label>
              <select className="so-select" value={doc.customerInfo.placeOfSupply} onChange={e => handleNested('customerInfo', 'placeOfSupply', e.target.value)}>
                {Object.keys(STATE_CODES).sort().map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Sale Order Detail Card */}
        <div className="so-card">
          <div className="so-card-header">
            <div className="so-card-header-left">
              <div className="so-card-icon detail">📋</div>
              <div>
                <div className="so-card-title">Sale Order Detail</div>
                <div className="so-card-subtitle">Order tracking</div>
              </div>
            </div>
            <RotateCcw size={18} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => navigate(0)} />
          </div>
          <div className="so-card-body">
            <div className="so-field-row">
              <label className="so-label">Type</label>
              <select className="so-select" value={doc.soDetail.type} onChange={e => handleNested('soDetail', 'type', e.target.value)}>
                {SO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="so-field-row">
              <label className="so-label">Order No.<span className="req">*</span></label>
              <div className="so-ms-row" style={{ gap: '0' }}>
                <input className="so-input" style={{ width: '60px', borderRadius: '8px 0 0 8px', borderRight: 'none' }} value={doc.docPrefix} onChange={e => setDoc({ ...doc, docPrefix: e.target.value })} />
                <input className="so-input" style={{ flex: 1, borderRadius: '0', textAlign: 'center' }} value={doc.soDetail.soNo} onChange={e => handleNested('soDetail', 'soNo', e.target.value)} />
                <input className="so-input" style={{ width: '60px', borderRadius: '0 8px 8px 0', borderLeft: 'none' }} value={doc.docPostfix} onChange={e => setDoc({ ...doc, docPostfix: e.target.value })} />
              </div>
            </div>
            <div className="so-field-row">
              <label className="so-label">Order Date</label>
              <input type="date" className="so-input" value={doc.soDetail.date} onChange={e => handleNested('soDetail', 'date', e.target.value)} />
            </div>
            <div className="so-divider" />
            <div className="so-field-row">
              <label className="so-label">Challan No.</label>
              <input className="so-input" value={doc.soDetail.challanNo} onChange={e => handleNested('soDetail', 'challanNo', e.target.value)} />
            </div>
            <div className="so-field-row">
              <label className="so-label">Challan Date</label>
              <input type="date" className="so-input" value={doc.soDetail.challanDate} onChange={e => handleNested('soDetail', 'challanDate', e.target.value)} />
            </div>
            <div className="so-field-row">
              <label className="so-label">Ref. No.</label>
              <input className="so-input" value={doc.soDetail.refNo} onChange={e => handleNested('soDetail', 'refNo', e.target.value)} />
            </div>
            <div className="so-field-row">
              <label className="so-label">Delivery Mode</label>
              <select className="so-select" value={doc.soDetail.deliveryMode} onChange={e => handleNested('soDetail', 'deliveryMode', e.target.value)}>
                {DELIVERY_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Product Items Table ──────────────────────────────── */}
      <div className="pt-table-card">
        <div className="pt-table-header">
          <div className="so-card-header-left">
            <div className="so-card-icon items">📦</div>
            <div>
              <div className="so-card-title">Product Items</div>
              <div className="so-card-subtitle">{doc.items.length} item{doc.items.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '20px', overflow: 'hidden', background: '#f8fafc', padding: '2px' }}>
              <button className="dc-btn" style={{ padding: '4px 12px', fontSize: '0.7rem', border: 'none', background: doc.discount.unit === 'Rs' ? '#3b82f6' : 'transparent', color: doc.discount.unit === 'Rs' ? 'white' : '#64748b' }} onClick={() => handleNested('discount', 'unit', 'Rs')}>Rs</button>
              <button className="dc-btn" style={{ padding: '4px 12px', fontSize: '0.7rem', border: 'none', background: doc.discount.unit === '%' ? '#3b82f6' : 'transparent', color: doc.discount.unit === '%' ? 'white' : '#64748b' }} onClick={() => handleNested('discount', 'unit', '%')}>%</button>
            </div>
          </div>
        </div>
        <div className="pt-table-scroll">
          <table className="pt-product-table">
            <thead>
              <tr>
                <th className="sr-col">SR.</th>
                <th className="product-col">PRODUCT / OTHER CHARGES</th>
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
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                      <select className="pt-cell-select" style={{ flex: 1, textAlign: 'left' }} value={item.productId} onChange={e => handleItemChange(idx, 'productId', e.target.value)}>
                        <option value="">Enter Product name</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <button type="button" className="pt-cell-add-btn" onClick={() => { setActiveItemIdx(idx); setShowAddProduct(true); }}>+</button>
                    </div>
                    <textarea className="pt-cell-note" placeholder="Item Note..." rows={2} value={item.note} onChange={e => handleItemChange(idx, 'note', e.target.value)} />
                  </td>
                  <td><input className="pt-cell-input" placeholder="HSN/SAC" value={item.hsn} onChange={e => handleItemChange(idx, 'hsn', e.target.value)} /></td>
                  <td><input type="number" className="pt-cell-input" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} /></td>
                  <td><input className="pt-cell-input" placeholder="UOM" value={item.unit} onChange={e => handleItemChange(idx, 'unit', e.target.value)} /></td>
                  <td><input type="number" className="pt-cell-input" style={{ textAlign: 'right' }} value={item.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} /></td>
                  <td>
                    <select className="pt-cell-select" value={item.taxRate} onChange={e => handleItemChange(idx, 'taxRate', e.target.value)}>
                      {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                    <div className="pt-tax-display">{item.taxAmount.toFixed(2)}</div>
                  </td>
                  <td><div className="pt-total-value">{(item.amount + item.taxAmount).toFixed(2)}</div></td>
                  <td><button className="pt-remove-btn" onClick={() => removeItem(idx)}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '1rem', background: '#fcfcfd' }}>
          <button className="so-add-notes-btn" onClick={addItem_}><Plus size={16} /> Add Product Row</button>
        </div>
      </div>

      {/* ── Footer Grid (Exact PI Split Columns) ────────────────── */}
      <div className="so-footer-grid">
        {/* Left Column: Bank, Terms, Remarks */}
        <div>
          <div className="so-card" style={{ marginBottom: '1.25rem' }}>
            <div className="so-card-header">
              <div className="so-card-title">Bank & Timeline Configuration</div>
            </div>
            <div className="so-card-body">
              <div className="so-field-row">
                <label className="so-label">Select Bank</label>
                <select className="so-select" value={doc.bankId} onChange={e => {
                  const b = banks.find(x => x.id === e.target.value);
                  setDoc({ ...doc, bankId: e.target.value, bank: b ? b.bankName : '' });
                }}>
                  <option value="">-- Choose Account --</option>
                  {banks.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber.slice(-4)}</option>)}
                </select>
              </div>
              <div className="so-field-row">
                <label className="so-label">Completion Date</label>
                <input type="date" className="so-input" value={doc.completionDate} onChange={e => setDoc({ ...doc, completionDate: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="so-card" style={{ marginBottom: '1.25rem' }}>
            <div className="so-card-header">
              <div className="so-card-title">Terms & Conditions</div>
            </div>
            <div className="so-card-body">
              {doc.terms.map((term) => (
                <div key={term.id} className="so-terms-card">
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '8px' }}>
                    <input className="so-input" style={{ fontWeight: 700 }} placeholder="Title" value={term.title} onChange={e => updateTerm(term.id, 'title', e.target.value)} />
                    <button className="so-btn so-btn-danger" style={{ padding: '0.4rem' }} onClick={() => deleteTerm(term.id)}><Trash2 size={16} /></button>
                  </div>
                  <textarea className="so-textarea" rows={2} placeholder="Detail" value={term.detail} onChange={e => updateTerm(term.id, 'detail', e.target.value)} />
                </div>
              ))}
              <button className="so-add-notes-btn" onClick={addTerm}><Plus size={16} /> Add Term</button>
            </div>
          </div>

          <div className="so-card">
            <div className="so-card-body">
              <div className="so-field-row align-top">
                <label className="so-label">Internal Remarks</label>
                <textarea className="so-textarea" rows={3} placeholder="Internal notes..." value={doc.documentNote} onChange={e => setDoc({ ...doc, documentNote: e.target.value })} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600, color: '#475569', cursor: 'pointer', marginTop: '1rem' }}>
                <input type="checkbox" checked={doc.shareEmail} onChange={e => setDoc({ ...doc, shareEmail: e.target.checked })} /> share commit on Email <Mail size={14} />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Totals */}
        <div className="so-summary-section">
          <div className="so-totals-row">
            <span className="so-totals-label">Taxable</span>
            <span className="so-totals-value">{doc.taxable.toFixed(2)}</span>
          </div>

          <div className="so-add-charge-link" onClick={() => setAdditionalChargeModal(true)}>+ Add Additional Charge</div>

          {doc.additionalCharge > 0 && (
            <div className="so-totals-row">
              <span className="so-totals-label">{doc.additionalChargeName}</span>
              <span className="so-totals-value">{doc.additionalCharge.toFixed(2)}</span>
            </div>
          )}

          <div className="so-totals-row" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
            <span className="so-totals-label">Total Taxable</span>
            <span className="so-totals-value">{doc.totalTaxable.toFixed(2)}</span>
          </div>

          <div className="so-totals-row">
            <span className="so-totals-label">Total Tax</span>
            <span className="so-totals-value">{doc.totalTax.toFixed(2)}</span>
          </div>

          <div className="so-modifier-row">
            <div className="so-modifier-label">TCS</div>
            <select className="so-modifier-select" value={doc.tcs.mode} onChange={e => handleNested('tcs', 'mode', e.target.value)}>
              <option value="+">+</option><option value="-">-</option>
            </select>
            <input className="so-modifier-input" type="number" value={doc.tcs.value} onChange={e => handleNested('tcs', 'value', e.target.value)} />
            <select className="so-modifier-unit" value={doc.tcs.unit} onChange={e => handleNested('tcs', 'unit', e.target.value)}>
              <option value="%">%</option><option value="Rs">Rs</option>
            </select>
          </div>

          <div className="so-modifier-row">
            <div className="so-modifier-label">Discount</div>
            <input className="so-modifier-input" type="number" value={doc.discount.value} onChange={e => handleNested('discount', 'value', e.target.value)} />
            <div className="so-modifier-unit">{doc.discount.unit}</div>
          </div>

          <div className="so-totals-row">
            <span className="so-totals-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Round Off <input type="checkbox" checked={doc.roundOff} onChange={e => setDoc({ ...doc, roundOff: e.target.checked })} />
            </span>
            <span className="so-totals-value">{roundOffAmt.toFixed(2)}</span>
          </div>

          <div className="so-grand-total">
            <span className="so-grand-label">GRAND TOTAL</span>
            <span className="so-grand-value">₹ {doc.grandTotal.toFixed(2)}</span>
          </div>

          <div className="so-words-row">
            <div className="so-words-label">Total in words</div>
            <div className="so-words-value">{numberToWords(doc.grandTotal)}</div>
          </div>

          <div className="so-smart-box">
            <span className="so-smart-label">Smart Suggestion</span>
            <button className="so-smart-add">+</button>
          </div>
        </div>
      </div>

      {/* ── Action Bar ─────────────────────────────────────────── */}
      <div className="so-action-bar">
        <div className="so-action-left">
          <button className="so-btn so-btn-ghost" onClick={() => navigate('/documents')}>← Back</button>
          <button className="so-btn so-btn-danger" onClick={() => { if (window.confirm('Discard changes?')) navigate('/documents'); }}>🗑 Discard</button>
        </div>
        <div className="so-action-right">
          <button className="so-btn so-btn-print" onClick={() => handleSave(true)} disabled={isSubmitting}>🖨 Save &amp; Print</button>
          <button className="so-btn so-btn-save" onClick={() => handleSave(false)} disabled={isSubmitting}>💾 {isSubmitting ? 'Saving...' : 'Save'}</button>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────── */}
      {additionalChargeModal && (
        <div className="so-modal-overlay" onClick={() => setAdditionalChargeModal(false)}>
          <div className="so-modal-card" onClick={e => e.stopPropagation()}>
            <div className="pi-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800 }}>Add Additional Charge</div>
              <button onClick={() => setAdditionalChargeModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="so-label" style={{ marginBottom: '4px' }}>Charge Name</label>
                  <input className="so-input" value={additionalChargeName} onChange={e => setAdditionalChargeName(e.target.value)} />
                </div>
                <div>
                  <label className="so-label" style={{ marginBottom: '4px' }}>Amount (Rs)</label>
                  <input type="number" className="so-input" value={additionalChargeValue} onChange={e => setAdditionalChargeValue(e.target.value)} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9' }}>
              <button className="so-btn so-btn-ghost" onClick={() => setAdditionalChargeModal(false)}>Cancel</button>
              <button className="so-btn so-btn-save" onClick={() => {
                setDoc(prev => ({ ...prev, additionalCharge: Number(additionalChargeValue) || 0, additionalChargeName }));
                setAdditionalChargeModal(false);
              }}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {showContactModal && <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} onSave={handleContactSaved} type="customer" />}
      {showAddProduct && <ProductModal isOpen={showAddProduct} onClose={() => setShowAddProduct(false)} onSave={(p) => { handleItemChange(activeItemIdx, 'productId', p.id); loadMasterData(); }} />}
      {showPrintModal && <PrintViewModal isOpen={showPrintModal} onClose={() => { setShowPrintModal(false); navigate('/documents'); }} documentData={savedDoc} />}
    </div>
  );
};

export default SaleOrder;
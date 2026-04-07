import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PrintViewModal from '../components/PrintViewModal';
import ProductModal from '../components/ProductModal';
import ContactModal from '../components/ContactModal';
import {
  ArrowLeft, Trash2, Printer, Save, Plus,
  MoreVertical, RotateCcw, Truck
} from 'lucide-react';
import './DeliveryChallan.css';

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
  const [banks, setBanks] = useState(['CASH', 'CANARA BANK', 'HDFC BANK', 'SBI']);
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
      placeOfSupply: 'Madhya Pradesh', // Match with state initial value
    },
    dcDetail: {
      type: 'Standard',
      challanNo: '1',
      date: todayIso(),
      lrNo: '',
      ewayNo: '',
      reasonForEway: '',
      deliveryMode: 'Select Delivery Mode',
    },
    items: [BLANK_ITEM()],
    bank: 'CANARA BANK',
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

  if (loading) return <div className="dc-page"><div className="pi-loading-spinner" />Loading Delivery Challan...</div>;

  return (
    <div className="dc-page">
      {/* Header */}
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
        <div className="dc-actions" style={{ margin: 0, padding: 0, border: 'none' }}>
          <button className="dc-btn dc-btn-secondary" onClick={() => navigate('/documents/select')}>
            <ArrowLeft size={18} /> Back
          </button>
        </div>
      </div>

      <div className="dc-top-grid">
        {/* Customer Information */}
        <div className="dc-card">
          <div className="dc-card-header">
            <div className="dc-card-header-left">
              <div className="dc-card-title">Customer Information</div>
            </div>
            <MoreVertical size={18} color="#94a3b8" />
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
                style={{ backgroundColor: '#f1f5f9' }}
                value={doc.customerInfo.address}
                onChange={e => handleNested('customerInfo', 'address', e.target.value)}
              />
            </div>

            <div className="dc-field-row">
              <label className="dc-label">Contact Person</label>
              <input
                className="dc-input"
                placeholder="Contact Person"
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
              <label className="dc-label">Rev. Charge</label>
              <select
                className="dc-select"
                value={doc.customerInfo.revCharge}
                onChange={e => handleNested('customerInfo', 'revCharge', e.target.value)}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
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

        {/* Delivery Challan Detail */}
        <div className="dc-card">
          <div className="dc-card-header">
            <div className="dc-card-header-left">
              <div className="dc-card-title">Delivery Challan Detail</div>
            </div>
            <RotateCcw size={18} color="#94a3b8" style={{ cursor: 'pointer' }} />
          </div>
          <div className="dc-card-body">

            <div className="dc-field-row">
              <label className="dc-label">Type</label>
              <select
                className="dc-select"
                value={doc.dcDetail.type}
                onChange={e => handleNested('dcDetail', 'type', e.target.value)}
              >
                {DC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="dc-two-col-grid">
              <div className="dc-field-row">
                <label className="dc-label">Delivery Challan No.<span className="req">*</span></label>
                <div className="dc-no-row">
                  <input
                    className="dc-input dc-prefix-input"
                    placeholder="Prefi"
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
                <label className="dc-label">Delivery Challan DATE<span className="req">*</span></label>
                <input
                  type="date"
                  className="dc-input"
                  value={doc.dcDetail.date}
                  onChange={e => handleNested('dcDetail', 'date', e.target.value)}
                />
              </div>
            </div>

            <div className="dc-two-col-grid">
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
                <label className="dc-label">E-Way No.</label>
                <input
                  className="dc-input"
                  placeholder="E-Way No."
                  value={doc.dcDetail.ewayNo}
                  onChange={e => handleNested('dcDetail', 'ewayNo', e.target.value)}
                />
              </div>
            </div>

            <div className="dc-field-row">
              <label className="dc-label">Reason For Eway</label>
              <input
                className="dc-input"
                value={doc.dcDetail.reasonForEway}
                onChange={e => handleNested('dcDetail', 'reasonForEway', e.target.value)}
              />
            </div>

            <div className="dc-divider" />

            <div className="dc-field-row">
              <label className="dc-label">Delivery</label>
              <select
                className="dc-select"
                value={doc.dcDetail.deliveryMode}
                onChange={e => handleNested('dcDetail', 'deliveryMode', e.target.value)}
              >
                <option disabled>Select Delivery Mode</option>
                {DELIVERY_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="dc-card">
        <div className="dc-card-header">
          <div className="dc-card-header-left">
            <div className="dc-card-title">Product Items</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="dc-label" style={{ alignSelf: 'center' }}>Discount: </span>
            <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <button
                className={`dc-btn-secondary ${doc.discount.unit === 'Rs' ? 'active-tab' : ''}`}
                style={{ padding: '4px 12px', border: 'none', background: doc.discount.unit === 'Rs' ? 'var(--dc-primary)' : 'transparent', color: doc.discount.unit === 'Rs' ? 'white' : '#64748b' }}
                onClick={() => handleNested('discount', 'unit', 'Rs')}
              >Rs</button>
              <button
                className={`dc-btn-secondary ${doc.discount.unit === '%' ? 'active-tab' : ''}`}
                style={{ padding: '4px 12px', border: 'none', background: doc.discount.unit === '%' ? 'var(--dc-primary)' : 'transparent', color: doc.discount.unit === '%' ? 'white' : '#64748b' }}
                onClick={() => handleNested('discount', 'unit', '%')}
              >%</button>
            </div>
            <MoreVertical size={18} color="#94a3b8" />
          </div>
        </div>
        <div className="dc-table-scroll">
          <table className="dc-product-table">
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
                  <td className="dc-sr-num">{idx + 1}</td>
                  <td>
                    <div className="flex gap-2 items-center">
                      <select
                        className="dc-cell-select"
                        style={{ flex: 1 }}
                        value={item.productId}
                        onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                      >
                        <option value="">Enter Product name</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                      className="dc-cell-note"
                      placeholder="Item Note..."
                      rows={2}
                      value={item.note}
                      onChange={e => handleItemChange(idx, 'note', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="dc-cell-input"
                      placeholder="HSN/SAC"
                      value={item.hsn}
                      onChange={e => handleItemChange(idx, 'hsn', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="dc-cell-input"
                      placeholder="Qty."
                      style={{ textAlign: 'center' }}
                      value={item.quantity}
                      onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="dc-cell-input"
                      placeholder="UOM"
                      style={{ textAlign: 'center' }}
                      value={item.unit}
                      onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="dc-cell-input"
                      placeholder="Price"
                      style={{ textAlign: 'right' }}
                      value={item.rate}
                      onChange={e => handleItemChange(idx, 'rate', e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      className="dc-cell-select"
                      value={item.taxRate}
                      onChange={e => handleItemChange(idx, 'taxRate', e.target.value)}
                    >
                      <option value="0">--</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                    <div className="dc-tax-display">{item.taxAmount.toFixed(2)}</div>
                  </td>
                  <td>
                    <div className="dc-total-value">{(item.amount + item.taxAmount).toFixed(2)}</div>
                  </td>
                  <td>
                    <button className="dc-remove-btn" onClick={() => removeItem(idx)}>×</button>
                  </td>
                </tr>
              ))}
              <tr className="dc-summary-row">
                <td colSpan={2} className="dc-summary-label">Total Inv. Val</td>
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
          <button className="dc-btn dc-btn-secondary" style={{ color: 'var(--dc-primary)' }} onClick={addItem_}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Footer Grid */}
      <div className="dc-footer-grid">
        <div className="dc-notes-section">
          {/* Bank */}
          <div className="dc-card" style={{ padding: '1.25rem' }}>
            <div className="dc-field-row">
              <label className="dc-label">Bank</label>
              <select className="dc-select" value={doc.bank} onChange={e => setDoc({ ...doc, bank: e.target.value })}>
                {banks.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {/* Terms */}
          <div className="dc-card" style={{ padding: '1.25rem' }}>
            <div className="dc-card-title" style={{ marginBottom: '1rem' }}>Terms & Condition / Additional Note</div>
            {doc.terms.map((term, idx) => (
              <div key={idx} className="dc-terms-card" style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                  <label className="dc-label" style={{ width: '60px' }}>Title</label>
                  <input
                    className="dc-input"
                    value={term.title}
                    onChange={e => updateTerm(idx, 'title', e.target.value)}
                  />
                  <Trash2 size={18} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => {
                    const t = [...doc.terms]; t.splice(idx, 1); setDoc({ ...doc, terms: t });
                  }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label className="dc-label" style={{ width: '60px' }}>Detail</label>
                  <textarea
                    className="dc-textarea"
                    rows={2}
                    value={term.detail}
                    onChange={e => updateTerm(idx, 'detail', e.target.value)}
                  />
                </div>
              </div>
            ))}
            <button className="dc-add-notes-btn" onClick={addTerm}><Plus size={16} /> Add Notes</button>
          </div>

          <div className="dc-card" style={{ padding: '1.25rem' }}>
            <label className="dc-label">Document Note / Remarks</label>
            <textarea
              className="dc-textarea"
              placeholder="Internal remarks..."
              value={doc.documentNote}
              onChange={e => setDoc({ ...doc, documentNote: e.target.value })}
            />
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem', fontStyle: 'italic' }}>Not Visible on Print</div>
          </div>
        </div>

        <div className="dc-summary-section">
          <div className="dc-calc-table">
            <div className="dc-calc-row">
              <span className="dc-calc-label">Taxable</span>
              <span className="dc-calc-val">{doc.taxable.toFixed(2)}</span>
            </div>
            <div className="dc-add-additional" onClick={() => setDoc({ ...doc, additionalCharge: doc.additionalCharge ? 0 : 500 })}>
              + Add Additional Charge
            </div>
            {doc.additionalCharge > 0 && (
              <div className="dc-calc-row">
                <input className="dc-input" style={{ width: '100px', padding: '2px 4px' }} value={doc.additionalChargeName} onChange={e => setDoc({ ...doc, additionalChargeName: e.target.value })} />
                <input className="dc-input" style={{ width: '80px', padding: '2px 4px', textAlign: 'right' }} type="number" value={doc.additionalCharge} onChange={e => setDoc({ ...doc, additionalCharge: Number(e.target.value) })} />
              </div>
            )}
            <div className="dc-calc-row bordered">
              <span className="dc-calc-label">Total Taxable</span>
              <span className="dc-calc-val">{doc.totalTaxable.toFixed(2)}</span>
            </div>
            <div className="dc-calc-row">
              <span className="dc-calc-label">Total Tax</span>
              <span className="dc-calc-val">{doc.totalTax.toFixed(2)}</span>
            </div>

            <div className="dc-calc-row">
              <div className="dc-modifier-row">
                <span>TCS</span>
                <select className="dc-mod-select" value={doc.tcs.mode} onChange={e => handleNested('tcs', 'mode', e.target.value)}>
                  <option value="+">+</option>
                  <option value="-">-</option>
                </select>
                <input className="dc-mod-input" type="number" value={doc.tcs.value} onChange={e => handleNested('tcs', 'value', e.target.value)} />
                <select className="dc-mod-select" value={doc.tcs.unit} onChange={e => handleNested('tcs', 'unit', e.target.value)}>
                  <option value="%">%</option>
                  <option value="Rs">Rs</option>
                </select>
              </div>
              <span className="dc-calc-val">
                {((Number(doc.tcs.unit === '%' ? doc.totalTaxable * (Number(doc.tcs.value) / 100) : doc.tcs.value)) || 0).toFixed(2)}
              </span>
            </div>

            <div className="dc-calc-row">
              <div className="dc-modifier-row">
                <span>Discount</span>
                <select className="dc-mod-select" value={doc.discount.mode} onChange={e => handleNested('discount', 'mode', e.target.value)}>
                  <option value="+">+</option>
                  <option value="-">-</option>
                </select>
                <input className="dc-mod-input" type="number" value={doc.discount.value} onChange={e => handleNested('discount', 'value', e.target.value)} />
                <select className="dc-mod-select" value={doc.discount.unit} onChange={e => handleNested('discount', 'unit', e.target.value)}>
                  <option value="%">%</option>
                  <option value="Rs">Rs</option>
                </select>
              </div>
              <span className="dc-calc-val" style={{ color: '#ef4444' }}>
                -{((Number(doc.discount.unit === '%' ? doc.totalTaxable * (Number(doc.discount.value) / 100) : doc.discount.value)) || 0).toFixed(2)}
              </span>
            </div>

            <div className="dc-calc-row bordered">
              <span className="dc-calc-label">Round Off</span>
              <label className="dc-switch">
                <input type="checkbox" checked={doc.roundOff} onChange={e => setDoc({ ...doc, roundOff: e.target.checked })} />
                <span className="dc-slider"></span>
              </label>
              <span className="dc-calc-val">
                {doc.roundOff ? (Math.round(doc.grandTotal) - doc.grandTotal).toFixed(2) : '0.00'}
              </span>
            </div>

            <div className="dc-grand-total-box">
              <span className="dc-grand-total-label">Grand Total</span>
              <span className="dc-grand-total-val">{doc.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="dc-in-words">
              Total in words: <br />
              <strong>{numberToWords(doc.grandTotal)}</strong>
            </div>

            <div className="dc-smart-suggestion">
              <div>Smart Suggestion</div>
              <div className="dc-plus-circle">+</div>
            </div>

            {/* Actions */}
            <div className="dc-actions">
              <button className="dc-btn dc-btn-secondary" onClick={() => navigate('/documents/select')}>
                Back
              </button>
              <button className="dc-btn dc-btn-danger" onClick={() => navigate('/documents/select')}>
                <Trash2 size={18} /> Discard
              </button>
              <button className="dc-btn dc-btn-primary" onClick={() => handleSave(true)} disabled={isSubmitting}>
                <Printer size={18} /> Save & Print
              </button>
              <button className="dc-btn dc-btn-primary" onClick={() => handleSave(false)} disabled={isSubmitting}>
                <Save size={18} /> Save
              </button>
            </div>

          </div>
        </div>
      </div>

      {showPrintModal && (
        <PrintViewModal
          document={savedDoc}
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

export default DeliveryChallan;

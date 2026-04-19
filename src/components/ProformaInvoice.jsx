import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PrintViewModal from '../components/PrintViewModal';
import ProductModal from './ProductModal';
import ContactModal from './ContactModal';
import {
  ArrowLeft, Trash2, Printer, Save, Plus,
  MoreVertical, RotateCcw, FileEdit, Truck, Zap, Info
} from 'lucide-react';
import './ProformaInvoice.css';
import "../pages/product-table.css";

// ─── Constants ───────────────────────────────────────────────────────────────

const PI_TYPES = ['Standard Proforma', 'Service Proforma', 'Export Proforma'];
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
    return conv(Math.floor(n / 10000000)) + 'CRORE ' + conv(num % 10000000);
  };
  return (conv(Math.floor(num)) + 'RUPEES ONLY').trim();
}

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

// ─── Main Component ──────────────────────────────────────────────────────────

const ProformaInvoice = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [products, setProducts] = useState([]);
  const [banks] = useState(['CASH', 'CANARA BANK', 'HDFC BANK', 'SBI']);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [activeItemIdx, setActiveItemIdx] = useState(null);
  const [savedDoc, setSavedDoc] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);

  const [doc, setDoc] = useState({
    docType: 'Proforma Invoice',
    docPrefix: 'pro/',
    docPostfix: '/25-26',
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
      placeOfSupply: '',
    },
    proDetail: {
      type: 'Standard Proforma',
      proNo: '1',
      date: todayIso(),
      challanNo: '',
      challanDate: '',
      lrNo: '',
      ewayNo: '',
      poNo: '',
      deliveryMode: 'Select Delivery Mode',
    },
    items: [BLANK_ITEM()],
    bank: 'CANARA BANK',
    terms: [
      { title: 'Payment', detail: '100% advance against Proforma Invoice.' },
      { title: 'Validity', detail: 'This Proforma Invoice is valid for 7 days.' }
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
          placeOfSupply: c.state ? c.state : '',
        },
      }));
    } else {
      setDoc(prev => ({
        ...prev,
        customerId: '',
        customerInfo: {
          ...prev.customerInfo,
          placeOfSupply: ''
        }
      }));
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
        placeOfSupply: newContact.state || 'Maharashtra',
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
    if (!doc.proDetail.proNo) { alert('Please enter Proforma No.'); return; }

    setIsSubmitting(true);
    try {
      const fullNo = `${doc.docPrefix}${doc.proDetail.proNo}${doc.docPostfix}`;
      const finalDoc = {
        ...doc,
        invoiceNumber: fullNo,
        date: doc.proDetail.date,
        total: doc.grandTotal,
        customerName: doc.customerInfo.ms,
        status: 'Proforma',
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
      alert('Failed to save Proforma Invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalQty = doc.items.reduce((a, i) => a + (Number(i.quantity) || 0), 0);
  const totalPrice = doc.items.reduce((a, i) => a + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0);
  const totalTaxSum = doc.items.reduce((a, i) => a + (Number(i.taxAmount) || 0), 0);
  const totalInvVal = doc.items.reduce((a, i) => a + (Number(i.amount) || 0) + (Number(i.taxAmount) || 0), 0);

  if (loading) return <div className="pro-page">Loading Proforma Invoice...</div>;

  return (
    <div className="pro-page">
      {/* Header */}
      <div className="pro-header">
        <div className="pro-header-left">
          <div className="pro-badge" style={{ background: '#0284c7', color: 'white' }}>
            📄 PROFORMA
          </div>
          <div>
            <div className="pro-title">Proforma Invoice</div>
            <div className="pro-subtitle">
              {id ? `Editing • ${doc.proDetail.proNo}` : 'Create advance billing record'}
            </div>
          </div>
        </div>
        <div className="pro-header-actions">
          <button className="pro-btn pro-btn-ghost" onClick={() => navigate('/documents')}>
            ← Back
          </button>
        </div>
      </div>

      <div className="pro-top-grid">
        {/* Customer Info */}
        <div className="pro-card">
          <div className="pro-card-header">
            <div className="pro-card-header-left">
              <div className="pro-card-icon vendor">👤</div>
              <div>
                <div className="pro-card-title">Customer Information</div>
                <div className="pro-card-subtitle">Billing & GST Details</div>
              </div>
            </div>
            <button className="pro-menu-btn">⋮</button>
          </div>
          <div className="pro-card-body">
            <div className="pro-field-row">
              <label className="pro-label">M/S.<span className="req">*</span></label>
              <div className="pro-ms-row">
                <select className="pro-select" value={doc.customerId} onChange={handleCustomerChange}>
                  <option value="">-- Choose Customer --</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName || c.customerName}</option>
                  ))}
                </select>
                <button className="pro-ms-add-btn" onClick={() => setShowContactModal(true)}>+</button>
              </div>
            </div>
            <div className="pro-field-row align-top">
              <label className="pro-label">Address</label>
              <textarea className="pro-textarea" rows={3} value={doc.customerInfo.address} onChange={e => handleNested('customerInfo', 'address', e.target.value)} />
            </div>

            <div className="pro-field-row">
              <label className="pro-label">Contact Person</label>
              <input className="pro-input"
                value={doc.customerInfo.contactPerson}
                onChange={e => handleNested('customerInfo', 'contactPerson', e.target.value)}
              />
            </div>

            <div className="pro-field-row">
              <label className="pro-label">Phone No</label>
              <input className="pro-input"
                value={doc.customerInfo.phoneNo}
                onChange={e => handleNested('customerInfo', 'phoneNo', e.target.value)}
              />
            </div>

            <div className="pro-field-row">
              <label className="pro-label">GSTIN / PAN</label>
              <input className="pro-input" placeholder="GST Number" value={doc.customerInfo.gstinPan} onChange={e => handleNested('customerInfo', 'gstinPan', e.target.value.toUpperCase())} />
            </div>

            <div className="pro-field-row">
              <label className="pro-label">Rev. Charge</label>
              <select className="pro-select"
                value={doc.customerInfo.revCharge}
                onChange={e => handleNested('customerInfo', 'revCharge', e.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="pro-field-row">
              <label className="pro-label">Ship To</label>
              <textarea className="pro-textarea"
                value={doc.customerInfo.shipTo}
                onChange={e => handleNested('customerInfo', 'shipTo', e.target.value)}
              />
            </div>

            <div className="pro-field-row">
              <label className="pro-label">Distance (KM)</label>
              <input type="number" className="pro-input"
                value={doc.customerInfo.distance}
                onChange={e => handleNested('customerInfo', 'distance', e.target.value)}
              />
            </div>
            <div className="pro-field-row">
              <label className="pro-label">Place of Supply<span className="req">*</span></label>
              <select
                className="pro-select"
                value={doc.customerInfo.placeOfSupply || ''}
                onChange={e => handleNested('customerInfo', 'placeOfSupply', e.target.value)}
              >
                <option value="">-- Select State --</option>
                {Object.keys(STATE_CODES).sort().map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Document Detail */}
        <div className="pro-card">
          <div className="pro-card-header">
            <div className="pro-card-header-left">
              <div className="pro-card-icon detail">📋</div>
              <div>
                <div className="pro-card-title">Document Detail</div>
                <div className="pro-card-subtitle">Invoice metadata & references</div>
              </div>
            </div>
            <button className="pro-reset-btn" title="Reset Detail" onClick={() => setDoc(prev => ({
              ...prev,
              proDetail: {
                ...prev.proDetail,
                proNo: '',
                date: todayIso(),
                challanNo: '',
                challanDate: '',
                lrNo: '',
                ewayNo: '',
                poNo: '',
                deliveryMode: 'Select Delivery Mode',
              }
            }))}>↺</button>
          </div>
          <div className="pro-card-body">
            <div className="pro-field-row">
              <label className="pro-label">Invoice Type</label>
              <select className="pro-select" value={doc.proDetail.type} onChange={e => handleNested('proDetail', 'type', e.target.value)}>
                {PI_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="pro-field-row">
              <label className="pro-label">Proforma No.<span className="req">*</span></label>
              <div style={{ display: 'flex', gap: '0.4rem', flex: 1 }}>
                <input className="pro-input" style={{ width: '60px', textAlign: 'center' }} value={doc.docPrefix} onChange={e => setDoc({ ...doc, docPrefix: e.target.value })} />
                <input className="pro-input" style={{ flex: 1 }} value={doc.proDetail.proNo} onChange={e => handleNested('proDetail', 'proNo', e.target.value)} />
                <input className="pro-input" style={{ width: '60px', textAlign: 'center' }} value={doc.docPostfix} onChange={e => setDoc({ ...doc, docPostfix: e.target.value })} />
              </div>
            </div>

            <div className="pro-field-row">
              <label className="pro-label">Date<span className="req">*</span></label>
              <input type="date" className="pro-input" value={doc.proDetail.date} onChange={e => handleNested('proDetail', 'date', e.target.value)} />
            </div>

            <div className="pro-field-row">
              <label className="pro-label">Challan No.</label>
              <input className="pro-input" placeholder="Challan No." value={doc.proDetail.challanNo} onChange={e => handleNested('proDetail', 'challanNo', e.target.value)} />
            </div>

            <div className="pro-field-row">
              <label className="pro-label">Challan Date</label>
              <input className="pro-input" placeholder="dd/mm/yy" value={doc.proDetail.challanDate} onChange={e => handleNested('proDetail', 'challanDate', e.target.value)} />
            </div>

            <div className="pro-field-row">
              <label className="pro-label">L.R. No.</label>
              <input className="pro-input" placeholder="L.R. No." value={doc.proDetail.lrNo} onChange={e => handleNested('proDetail', 'lrNo', e.target.value)} />
            </div>

            <div className="pro-field-row">
              <label className="pro-label">E-Way No.</label>
              <input className="pro-input" placeholder="E-Way No." value={doc.proDetail.ewayNo} onChange={e => handleNested('proDetail', 'ewayNo', e.target.value)} />
            </div>

            <div className="pro-field-row">
              <label className="pro-label">P.O. No.</label>
              <input className="pro-input" placeholder="Purchase Order No." value={doc.proDetail.poNo} onChange={e => handleNested('proDetail', 'poNo', e.target.value)} />
            </div>
            <div className="pro-divider" />
            <div className="pro-field-row">
              <label className="pro-label">Delivery</label>
              <select className="pro-select" value={doc.proDetail.deliveryMode} onChange={e => handleNested('proDetail', 'deliveryMode', e.target.value)}>
                {DELIVERY_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="pt-table-card">
        <div className="pt-table-header">
          <div className="pro-card-header-left">
            <div className="pro-card-icon items">📦</div>
            <div>
              <div className="pro-card-title">Product Items</div>
              <div className="pro-card-subtitle">{doc.items.length} item{doc.items.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div className="pt-table-actions">
            <div className="pro-discount-toggle">
              <span className="pro-toggle-label">Discount :</span>
              <span
                className={`pro-toggle-chip ${doc.discount.unit === 'Rs' ? 'active' : ''}`}
                onClick={() => handleNested('discount', 'unit', 'Rs')}
              >
                Rs
              </span>
              <span
                className={`pro-toggle-chip ${doc.discount.unit === '%' ? 'active' : ''}`}
                onClick={() => handleNested('discount', 'unit', '%')}
              >
                %
              </span>
            </div>
            <button className="pro-menu-btn">⋮</button>
          </div>
        </div>
      <div className="pt-table-scroll">
        <table className="pt-product-table">
          <colgroup>
            <col className="sr-col" />
            <col className="product-col" />
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
              <th>SR.</th>
              <th>PRODUCT / SERVICE</th>
              <th>HSN/SAC</th>
              <th>QTY.</th>
              <th>UOM</th>
              <th>PRICE</th>
              <th>GST %</th>
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
                    <select className="pt-cell-select" style={{ flex: 1 }} value={item.productId} onChange={e => handleItemChange(idx, 'productId', e.target.value)}>
                      <option value="">-- Select --</option>
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
                  <textarea className="pt-cell-note" placeholder="Internal item note..." rows={1} value={item.note} onChange={e => handleItemChange(idx, 'note', e.target.value)} />
                </td>
                <td><input className="pt-cell-input" value={item.hsn} onChange={e => handleItemChange(idx, 'hsn', e.target.value)} /></td>
                <td><input type="number" className="pt-cell-input" style={{ textAlign: 'center' }} value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} /></td>
                <td><input className="pt-cell-input" style={{ textAlign: 'center' }} value={item.unit} onChange={e => handleItemChange(idx, 'unit', e.target.value)} /></td>
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
            <tr className="pt-total-inv-row">
              <td colSpan={2} style={{ paddingLeft: '0.5rem', paddingRight: '1rem', borderLeft: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button type="button" className="pt-add-item-btn" onClick={addItem_}>
                    + Add Row
                  </button>
                  <span style={{ fontWeight: 800, color: '#92400e', fontSize: '0.95rem' }}>Total Inv. Val</span>
                </div>
              </td>
              <td></td>
              <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '0.9rem' }}>{totalQty}</td>
              <td></td>
              <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.9rem' }}>{totalPrice.toFixed(2)}</td>
              <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '0.9rem' }}>{totalTaxSum.toFixed(2)}</td>
              <td style={{ textAlign: 'right', color: '#059669', fontWeight: 800, fontSize: '0.95rem' }}>{totalInvVal.toFixed(2)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>

      {/* Bottom Grid */}
      <div className="pro-bottom-grid">
        <div className="pro-left-bottom">
          <div className="pro-due-date-row">
            <label className="pro-label">Expiry Date</label>
            <input type="date" className="pro-input yellow-bg" value={doc.proDetail.date} onChange={e => handleNested('proDetail', 'date', e.target.value)} />
          </div>
          <div className="pro-divider" />
          <div className="pro-terms-section">
            <div className="pro-section-title">Terms & Conditions</div>
            {doc.terms.map((term, idx) => (
              <div key={idx} className="pro-terms-row">
                <input className="pro-input" style={{ fontWeight: 600, width: '120px' }} value={term.title} onChange={e => {
                  const t = [...doc.terms]; t[idx].title = e.target.value; setDoc({ ...doc, terms: t });
                }} />
                <input className="pro-input" value={term.detail} onChange={e => {
                  const t = [...doc.terms]; t[idx].detail = e.target.value; setDoc({ ...doc, terms: t });
                }} />
              </div>
            ))}
          </div>
          <div className="pro-divider" />
          <div className="pro-doc-note-row">
            <div className="pro-doc-note-label">
              <label className="pro-label">Internal Remarks</label>
              <span className="pro-label-italic">Not Visible on Print</span>
            </div>
            <textarea className="pro-textarea" rows={3} placeholder="Staff notes..." value={doc.documentNote} onChange={e => setDoc({ ...doc, documentNote: e.target.value })} />
          </div>
          <div className="pro-field-row" style={{ marginTop: '1rem' }}>
            <label className="pro-label">Bank Details</label>
            <select className="pro-select" value={doc.bank} onChange={e => setDoc({ ...doc, bank: e.target.value })}>
              {banks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        <div className="pro-right-bottom">
          <div className="pro-totals-row">
            <span className="pro-totals-label">Taxable</span>
            <span className="pro-totals-value">{doc.taxable.toFixed(2)}</span>
          </div>
          <div className="pro-totals-row">
            <span className="pro-totals-label">Total Tax</span>
            <span className="pro-totals-value">{doc.totalTax.toFixed(2)}</span>
          </div>

          <div className="pro-modifier-row">
            <span className="pro-modifier-label">Discount</span>
            <div className="flex gap-1" style={{ flex: 1, justifyContent: 'flex-end' }}>
              <input className="pro-modifier-input" type="number" value={doc.discount.value} onChange={e => handleNested('discount', 'value', e.target.value)} />
              <select className="pro-modifier-unit" value={doc.discount.unit} onChange={e => handleNested('discount', 'unit', e.target.value)}>
                <option value="Rs">Rs</option>
                <option value="%">%</option>
              </select>
            </div>
          </div>

          <div className="pro-grand-total">
            <span className="pro-grand-label">Grand Total</span>
            <span className="pro-grand-value">₹ {doc.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="pro-words-row">
            <div className="pro-words-label">Total in words</div>
            <div className="pro-words-value">{numberToWords(doc.grandTotal)}</div>
          </div>

          <div className="pro-smart-box">
            <span className="pro-smart-label">Smart Billing Suggestion</span>
            <button className="pro-smart-add">+</button>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="pro-action-bar">
        <div className="pro-action-left">
          <button className="pro-btn pro-btn-ghost" onClick={() => navigate('/documents')}>← Back</button>
          <button className="pro-btn pro-btn-danger" onClick={() => { if (window.confirm('Discard?')) navigate('/documents'); }}>🗑 Discard</button>
        </div>
        <div className="pro-action-right">
          <button className="pro-btn pro-btn-print" onClick={() => handleSave(true)} disabled={isSubmitting}>🖨 Save & Print</button>
          <button className="pro-btn pro-btn-save" onClick={() => handleSave(false)} disabled={isSubmitting}>💾 {isSubmitting ? 'Saving...' : 'Save Record'}</button>
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

export default ProformaInvoice;
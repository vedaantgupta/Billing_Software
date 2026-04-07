import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getItems, addItem, updateItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import PrintViewModal from '../components/PrintViewModal';
import ContactModal from '../components/ContactModal';
import {
  ArrowLeft, Trash2, Printer, Save, Plus,
  MoreVertical, RotateCcw, FileCheck, Truck, Mail, Calendar, Building2
} from 'lucide-react';
import './SaleOrder.css';

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
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [banks] = useState(['CASH', 'CANARA BANK', 'HDFC BANK', 'SBI']);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [savedDoc, setSavedDoc] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);

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
      deliveryMode: 'Select Delivery Mode',
    },
    items: [BLANK_ITEM()],
    bank: 'CANARA BANK',
    completionDate: futureDateIso(15),
    shareEmail: false,
    terms: [
      { title: 'Jurisdiction', detail: 'Subject to our home Jurisdiction.' },
      { title: 'Responsibility', detail: 'Our Responsibility Ceases as soon as goods leaves our Premises.' },
      { title: 'Returns', detail: 'Goods once sold will not taken back.' },
      { title: 'Delivery', detail: 'Delivery Ex-Premises.' }
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
      setCustomers(contactList.filter(c => c.type === 'customer' || !c.type));
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
    const c = customers.find(x => x.id === vId);
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
        shipTo: '--',
        distance: '',
        placeOfSupply: newContact.state || 'Madhya Pradesh',
      },
    }));
  };

  if (loading) return <div className="so-loading">Loading Sale Order Builder...</div>;

  return (
    <div className="so-page">
      {/* Header */}
      <div className="so-header">
        <div className="so-header-left">
          <div className="so-badge">
            <FileCheck size={16} /> SALE ORDER
          </div>
          <div>
            <div className="so-title">Sale Order Builder</div>
            <div className="so-subtitle">
              {id ? `Editing • SO-${doc.soDetail.soNo}` : 'Register customer commitment'}
            </div>
          </div>
        </div>
        <div className="so-header-actions">
          <button className="so-btn so-btn-ghost" onClick={() => navigate('/documents')}>
            ← Back to List
          </button>
        </div>
      </div>

      <div className="so-top-grid">
        {/* Customer Info */}
        <div className="so-card">
          <div className="so-card-header">
            <div className="so-card-header-left">
              <div className="so-card-icon customer">👤</div>
              <div>
                <div className="so-card-title">Customer Information</div>
                <div className="so-card-subtitle">Identity & Billing</div>
              </div>
            </div>
            <MoreVertical size={18} color="#94a3b8" />
          </div>
          <div className="so-card-body">
            <div className="so-field-row">
              <label className="so-label">M/S.<span className="req">*</span></label>
              <div className="so-ms-row">
                <select className="so-select" value={doc.customerId} onChange={handleCustomerChange}>
                  <option value="">Select Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName || c.customerName}</option>
                  ))}
                </select>
                <button className="so-ms-add-btn" onClick={() => setShowContactModal(true)}>+</button>
              </div>
            </div>
            <div className="so-field-row align-top">
              <label className="so-label">Address</label>
              <textarea className="so-textarea" rows={3} value={doc.customerInfo.address} onChange={e => handleNested('customerInfo', 'address', e.target.value)} />
            </div>
            <div className="so-two-col">
              <div className="so-field-row">
                <label className="so-label">Contact Person</label>
                <input className="so-input" placeholder="Contact Person" value={doc.customerInfo.contactPerson} onChange={e => handleNested('customerInfo', 'contactPerson', e.target.value)} />
              </div>
              <div className="so-field-row">
                <label className="so-label">Phone No</label>
                <input className="so-input" placeholder="Phone No" value={doc.customerInfo.phoneNo} onChange={e => handleNested('customerInfo', 'phoneNo', e.target.value)} />
              </div>
            </div>
            <div className="so-two-col">
              <div className="so-field-row">
                <label className="so-label">GSTIN / PAN</label>
                <input className="so-input" placeholder="GST Number" value={doc.customerInfo.gstinPan} onChange={e => handleNested('customerInfo', 'gstinPan', e.target.value.toUpperCase())} />
              </div>
              <div className="so-field-row">
                <label className="so-label">Rev. Charge</label>
                <select className="so-select" value={doc.customerInfo.revCharge} onChange={e => handleNested('customerInfo', 'revCharge', e.target.value)}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            </div>
            <div className="so-two-col">
              <div className="so-field-row">
                <label className="so-label">Ship To</label>
                <select className="so-select" value={doc.customerInfo.shipTo} onChange={e => handleNested('customerInfo', 'shipTo', e.target.value)}>
                  <option value="--">--</option>
                  <option value="Same as Billing">Same as Billing</option>
                </select>
              </div>
              <div className="so-field-row">
                <label className="so-label">Distance (km)</label>
                <input className="so-input" placeholder="0" value={doc.customerInfo.distance} onChange={e => handleNested('customerInfo', 'distance', e.target.value)} />
              </div>
            </div>
            <div className="so-field-row">
              <label className="so-label">Place of Supply<span className="req">*</span></label>
              <select className="so-select" value={doc.customerInfo.placeOfSupply} onChange={e => handleNested('customerInfo', 'placeOfSupply', e.target.value)}>
                {Object.keys(STATE_CODES).sort().map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* SO Detail */}
        <div className="so-card">
          <div className="so-card-header">
            <div className="so-card-header-left">
              <div className="so-card-icon detail">📋</div>
              <div>
                <div className="so-card-title">Sale Order Detail</div>
                <div className="so-card-subtitle">Tracking & Logistics</div>
              </div>
            </div>
            <RotateCcw size={18} color="#94a3b8" style={{ cursor: 'pointer' }} />
          </div>
          <div className="so-card-body">
            <div className="so-field-row">
              <label className="so-label">Type</label>
              <select className="so-select" value={doc.soDetail.type} onChange={e => handleNested('soDetail', 'type', e.target.value)}>
                {SO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="so-invoice-no-row">
              <label className="so-label">Sale Order No.<span className="req">*</span></label>
              <div className="so-number-group">
                <input className="so-prefix-input" value={doc.docPrefix} onChange={e => setDoc({ ...doc, docPrefix: e.target.value })} />
                <input className="so-main-input" value={doc.soDetail.soNo} onChange={e => handleNested('soDetail', 'soNo', e.target.value)} />
                <input className="so-postfix-input" value={doc.docPostfix} onChange={e => setDoc({ ...doc, docPostfix: e.target.value })} />
              </div>
            </div>
            <div className="so-field-row">
              <label className="so-label">Sale Order Date<span className="req">*</span></label>
              <input type="date" className="so-input" value={doc.soDetail.date} onChange={e => handleNested('soDetail', 'date', e.target.value)} />
            </div>
            <div className="so-two-col">
              <div className="so-field-row">
                <label className="so-label">Challan No.</label>
                <input className="so-input" placeholder="Challan No." value={doc.soDetail.challanNo} onChange={e => handleNested('soDetail', 'challanNo', e.target.value)} />
              </div>
              <div className="so-field-row">
                <label className="so-label">Challan Date</label>
                <input className="so-input" placeholder="dd/mm/yy" value={doc.soDetail.challanDate} onChange={e => handleNested('soDetail', 'challanDate', e.target.value)} />
              </div>
            </div>
            <div className="so-field-row">
              <label className="so-label">Ref. No.</label>
              <input className="so-input" placeholder="Reference Number" value={doc.soDetail.refNo} onChange={e => handleNested('soDetail', 'refNo', e.target.value)} />
            </div>
            <div className="so-divider" />
            <div className="so-field-row">
              <label className="so-label">Delivery</label>
              <select className="so-select" value={doc.soDetail.deliveryMode} onChange={e => handleNested('soDetail', 'deliveryMode', e.target.value)}>
                {DELIVERY_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Product Items Table */}
      <div className="so-table-card">
        <div className="so-table-header">
          <div className="so-card-header-left">
            <div className="so-card-icon items">📦</div>
            <div className="so-card-title">Product Items</div>
          </div>
          <div className="so-table-actions">
            <div className="so-discount-toggle">
              <span className="so-toggle-label">Discount :</span>
              <span className={`so-toggle-chip ${doc.discount.unit === 'Rs' ? 'active' : ''}`} onClick={() => handleNested('discount', 'unit', 'Rs')}>Rs</span>
              <span className={`so-toggle-chip ${doc.discount.unit === '%' ? 'active' : ''}`} onClick={() => handleNested('discount', 'unit', '%')}>%</span>
            </div>
            <button className="so-add-item-btn" onClick={addItem_}>+ Add Row</button>
          </div>
        </div>
        <div className="so-table-scroll">
          <table className="so-product-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>SR.</th>
                <th>PRODUCT / OTHER CHARGES</th>
                <th style={{ width: '130px' }}>HSN/SAC CODE</th>
                <th style={{ width: '100px' }}>QTY.</th>
                <th style={{ width: '100px' }}>UOM</th>
                <th style={{ width: '120px' }}>PRICE (RS)</th>
                <th style={{ width: '120px' }}>CGST + SGST</th>
                <th style={{ width: '150px' }}>TOTAL</th>
                <th style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="so-sr-num">{idx + 1}</td>
                  <td>
                    <select className="so-cell-select" value={item.productId} onChange={e => handleItemChange(idx, 'productId', e.target.value)}>
                      <option value="">Enter Product name</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <textarea className="so-cell-note" placeholder="Item Note..." rows={1} value={item.note} onChange={e => handleItemChange(idx, 'note', e.target.value)} />
                  </td>
                  <td><input className="so-cell-input" placeholder="HSN/SAC" value={item.hsn} onChange={e => handleItemChange(idx, 'hsn', e.target.value)} /></td>
                  <td><input type="number" className="so-cell-input" style={{ textAlign: 'center' }} value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} /></td>
                  <td><input className="so-cell-input" style={{ textAlign: 'center' }} value={item.unit} onChange={e => handleItemChange(idx, 'unit', e.target.value)} /></td>
                  <td><input type="number" className="so-cell-input" style={{ textAlign: 'right' }} value={item.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} /></td>
                  <td>
                    <select className="so-cell-select" value={item.taxRate} onChange={e => handleItemChange(idx, 'taxRate', e.target.value)}>
                      {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </td>
                  <td><div className="so-total-value">{(item.amount + item.taxAmount).toFixed(2)}</div></td>
                  <td><button className="so-remove-btn" onClick={() => removeItem(idx)}>×</button></td>
                </tr>
              ))}
              <tr className="so-summary-row">
                <td colSpan={2} className="so-summary-label">Total Sale Order. Val</td>
                <td></td>
                <td style={{ textAlign: 'center' }}>{doc.items.reduce((a, i) => a + Number(i.quantity), 0)}</td>
                <td></td>
                <td style={{ textAlign: 'right' }}>{doc.taxable.toFixed(2)}</td>
                <td style={{ textAlign: 'center' }}>{doc.totalTax.toFixed(2)}</td>
                <td style={{ textAlign: 'right', color: '#059669' }}>{(doc.taxable + doc.totalTax).toFixed(2)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="so-bottom-grid">
        <div className="so-left-bottom">
          <div className="so-meta-section">
            <div className="so-meta-item">
              <label className="so-label"><Mail size={14} /> Share on Email</label>
              <label className="so-switch"><input type="checkbox" checked={doc.shareEmail} onChange={e => setDoc({ ...doc, shareEmail: e.target.checked })} /><span className="so-slider"></span></label>
            </div>
            <div className="so-meta-item">
              <label className="so-label"><Calendar size={14} /> Completion Date</label>
              <input type="date" className="so-input" value={doc.completionDate} onChange={e => setDoc({ ...doc, completionDate: e.target.value })} />
            </div>
            <div className="so-meta-item">
              <label className="so-label"><Building2 size={14} /> Bank</label>
              <select className="so-select" value={doc.bank} onChange={e => setDoc({ ...doc, bank: e.target.value })}>
                {banks.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="so-terms-section">
            <div className="so-section-title">Terms & Condition / Additional Note</div>
            {doc.terms.map((term, idx) => (
              <div key={idx} className="so-terms-row">
                <input className="so-input term-title" value={term.title} onChange={e => {
                  const t = [...doc.terms]; t[idx].title = e.target.value; setDoc({ ...doc, terms: t });
                }} />
                <input className="so-input term-detail" value={term.detail} onChange={e => {
                  const t = [...doc.terms]; t[idx].detail = e.target.value; setDoc({ ...doc, terms: t });
                }} />
                <Trash2 size={16} color="#ef4444" className="pointer" onClick={() => {
                  const t = [...doc.terms]; t.splice(idx, 1); setDoc({ ...doc, terms: t });
                }} />
              </div>
            ))}
            <button className="so-add-notes-btn" onClick={() => setDoc({ ...doc, terms: [...doc.terms, { title: '', detail: '' }] })}>+ Add Notes</button>
          </div>
          <div className="so-divider" />
          <div className="so-doc-note-row">
            <div className="so-doc-note-label">
              <label className="so-label">Document Note / Remarks</label>
              <span className="so-label-italic">Not Visible on Print</span>
            </div>
            <textarea className="so-textarea" rows={3} value={doc.documentNote} onChange={e => setDoc({ ...doc, documentNote: e.target.value })} />
          </div>
        </div>

        <div className="so-right-bottom">
          <div className="so-totals-row">
            <span className="so-totals-label">Taxable</span>
            <span className="so-totals-value">{doc.taxable.toFixed(2)}</span>
          </div>
          <div className="so-add-charge-link" onClick={() => setDoc({ ...doc, additionalCharge: doc.additionalCharge ? 0 : 500 })}>+ Add Additional Charge</div>
          <div className="so-totals-row">
            <span className="so-totals-label">Total Taxable</span>
            <span className="so-totals-value">{doc.totalTaxable.toFixed(2)}</span>
          </div>
          <div className="so-totals-row">
            <span className="so-totals-label">Total Tax</span>
            <span className="so-totals-value">{doc.totalTax.toFixed(2)}</span>
          </div>
          <div className="so-modifier-row">
            <span className="so-modifier-label">TCS</span>
            <select className="so-modifier-select" value={doc.tcs.mode} onChange={e => handleNested('tcs', 'mode', e.target.value)}><option>+</option><option>-</option></select>
            <input className="so-modifier-input" value={doc.tcs.value} onChange={e => handleNested('tcs', 'value', e.target.value)} />
            <select className="so-modifier-unit" value={doc.tcs.unit} onChange={e => handleNested('tcs', 'unit', e.target.value)}><option>%</option><option>Rs</option></select>
          </div>
          <div className="so-modifier-row">
            <span className="so-modifier-label">Discount</span>
            <select className="so-modifier-select" value={doc.discount.mode} onChange={e => handleNested('discount', 'mode', e.target.value)}><option>-</option><option>+</option></select>
            <input className="so-modifier-input" value={doc.discount.value} onChange={e => handleNested('discount', 'value', e.target.value)} />
            <select className="so-modifier-unit" value={doc.discount.unit} onChange={e => handleNested('discount', 'unit', e.target.value)}><option>Rs</option><option>%</option></select>
          </div>
          <div className="so-roundoff-row">
            <div className="so-roundoff-left"><span className="so-label">Round Off</span><label className="so-toggle-switch"><input type="checkbox" checked={doc.roundOff} onChange={e => setDoc({ ...doc, roundOff: e.target.checked })} /><span className="so-toggle-thumb"></span></label></div>
            <span className="so-totals-value">{(doc.grandTotal - (doc.totalTaxable + doc.totalTax)).toFixed(2)}</span>
          </div>
          <div className="so-grand-total">
            <span className="so-grand-label">Grand Total</span>
            <span className="so-grand-value">₹ {doc.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="so-words-row">
            <div className="so-words-label">Total in words</div>
            <div className="so-words-value">{numberToWords(doc.grandTotal)}</div>
          </div>
          <div className="so-smart-box"><span className="so-smart-label">Smart Suggestion</span><button className="so-smart-add">+</button></div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="so-action-bar">
        <div className="so-action-left">
          <button className="so-btn so-btn-secondary" onClick={() => navigate('/documents')}>Back</button>
        </div>
        <div className="so-action-right">
          <button className="so-btn so-btn-print" onClick={() => handleSave(true)} disabled={isSubmitting}>Save & Print</button>
          <button className="so-btn so-btn-save" onClick={() => handleSave(false)} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</button>
        </div>
      </div>

      {showPrintModal && <PrintViewModal doc={savedDoc} onClose={() => { setShowPrintModal(false); navigate('/documents'); }} />}
      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        onSave={handleContactSaved}
      />
    </div>
  );
};

export default SaleOrder;
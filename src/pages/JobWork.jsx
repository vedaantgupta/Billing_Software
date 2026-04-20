import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getItems, addItem, updateItem, logActivity } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import PrintViewModal from '../components/PrintViewModal';
import { ArrowLeft, Trash2, Printer, Save, Plus, MoreVertical, RotateCcw, X } from 'lucide-react';
import ProductModal from '../components/ProductModal';
import ContactModal from '../components/ContactModal';
import './JobWork.css';
import './product-table.css';

// ─── Constants ───────────────────────────────────────────────────────────────
const JW_TYPES = ['Outward Job Work', 'Inward Job Work', 'Standard Challan', 'Sub-Contracting'];
const DELIVERY_MODES = ['Select Delivery Mode', 'Hand Delivery', 'Courier', 'Transport', 'Self Pickup', 'Digital Delivery'];
const STATE_CODES = {
  'Andhra Pradesh': '37', 'Arunachal Pradesh': '12', 'Assam': '18', 'Bihar': '10',
  'Chandigarh': '04', 'Chhattisgarh': '22', 'Delhi': '07', 'Goa': '30',
  'Gujarat': '24', 'Haryana': '06', 'Himachal Pradesh': '02', 'Jammu & Kashmir': '01',
  'Jharkhand': '20', 'Karnataka': '29', 'Kerala': '32', 'Ladakh': '38',
  'Madhya Pradesh': '23', 'Maharashtra': '27', 'Manipur': '14', 'Meghalaya': '17',
  'Mizoram': '15', 'Nagaland': '13', 'Odisha': '21', 'Puducherry': '34',
  'Punjab': '03', 'Rajasthan': '08', 'Sikkim': '11', 'Tamil Nadu': '33',
  'Telangana': '36', 'Tripura': '16', 'Uttar Pradesh': '09', 'Uttarakhand': '05',
  'West Bengal': '19',
};

const BLANK_ITEM = () => ({
  productId: '', name: '', hsn: '', quantity: 1, unit: 'PCS',
  rate: 0, taxRate: 0, amount: 0, taxAmount: 0, note: '',
});

// ─── Helper ──────────────────────────────────────────────────────────────────
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

function todayIso() { return new Date().toISOString().split('T')[0]; }


// ─── Main Component ──────────────────────────────────────────────────────────
const JobWork = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [products, setProducts] = useState([]);
  const [banks] = useState(['CASH', 'CANARA BANK', 'HDFC BANK', 'SBI', 'AXIS BANK']);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [savedDoc, setSavedDoc] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [activeItemIdx, setActiveItemIdx] = useState(null);
  const [resetKey, setResetKey] = useState(0);

  const [doc, setDoc] = useState({
    docType: 'Job Work',
    docPrefix: 'JW/',
    docPostfix: '/25-26',
    customerId: '',
    customerInfo: {
      ms: '', address: '', contactPerson: '', phoneNo: '',
      gstinPan: '', revCharge: 'No', shipTo: '--',
      placeOfSupply: 'Maharashtra', distance: '',
    },
    jwDetail: {
      type: 'Outward Job Work', jobWorkNo: '1', date: todayIso(),
      challanNo: '', challanDate: '', lrNo: '',
      deliveryMode: 'Select Delivery Mode',
    },
    items: [BLANK_ITEM()],
    bank: 'CANARA BANK',
    completionDate: todayIso(),
    terms: [
      { title: 'Payment', detail: '100% advance against Job Work Challan.' },
      { title: 'Jurisdiction', detail: 'Subject to our home Jurisdiction.' },
    ],
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

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [clist, plist] = await Promise.all([getItems('contacts', user.id), getItems('products', user.id)]);
      setContacts(clist);
      setProducts(plist);
    } catch (err) { console.error(err); }
  }, [user?.id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadData();
      if (id) {
        const docs = await getItems('documents', user.id);
        const ex = docs.find(d => d._dbId === id || d.id === id);
        if (ex) setDoc(prev => ({ ...prev, ...ex }));
      }
      setLoading(false);
    };
    init();
  }, [id, user?.id, loadData]);

  useEffect(() => {
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
    const grandTotal = doc.roundOff ? Math.round(rawTotal) : Math.round(rawTotal * 100) / 100;
    setDoc(prev => ({ ...prev, taxable, totalTaxable, totalTax, grandTotal }));
  }, [doc.items, doc.additionalCharge, doc.tcs, doc.discount, doc.roundOff]);

  const handleNested = (cat, f, v) => setDoc(prev => ({ ...prev, [cat]: { ...prev[cat], [f]: v } }));

  const handleCustomerChange = (e) => {
    const c = contacts.find(x => x.id === e.target.value);
    if (c) {
      setDoc(prev => ({
        ...prev, customerId: e.target.value,
        customerInfo: {
          ...prev.customerInfo,
          ms: c.companyName || c.customerName || '',
          address: c.address || '',
          contactPerson: c.customerName || '',
          phoneNo: c.phone || '',
          gstinPan: c.gstin || '',
          placeOfSupply: c.state || 'Maharashtra',
        },
      }));
    } else {
      setDoc(prev => ({ ...prev, customerId: e.target.value }));
    }
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

  const handleItemChange = (idx, f, v) => {
    const items = [...doc.items];
    const item = { ...items[idx] };
    if (f === 'productId') {
      const p = products.find(x => x.id === v);
      if (p) { item.productId = p.id; item.name = p.name; item.hsn = p.hsn || ''; item.unit = p.unit || 'PCS'; item.image = p.image || ''; item.rate = Number(p.sellingPrice) || 0; item.taxRate = Number(p.taxRate) || 0; }
    } else { item[f] = v; }
    item.amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
    item.taxAmount = item.amount * ((Number(item.taxRate) || 0) / 100);
    items[idx] = item;
    setDoc(prev => ({ ...prev, items }));
  };

  const addRow = () => setDoc(prev => ({ ...prev, items: [...prev.items, BLANK_ITEM()] }));
  const removeRow = (idx) => { if (doc.items.length === 1) return; const items = [...doc.items]; items.splice(idx, 1); setDoc(prev => ({ ...prev, items })); };

  const resetJwDetail = () => {
    setResetKey(k => k + 1); // force date inputs to remount & clear
    setDoc(prev => ({
      ...prev,
      docPrefix: 'JW/',
      docPostfix: '/25-26',
      jwDetail: {
        type: 'Outward Job Work',
        jobWorkNo: '1',
        date: todayIso(),
        challanNo: '',
        challanDate: '',
        lrNo: '',
        deliveryMode: 'Select Delivery Mode',
      },
    }));
  };

  const handleSave = async (print = false) => {
    if (!user?.id) return;
    setIsSubmitting(true);
    try {
      const fullNo = `${doc.docPrefix}${doc.jwDetail.jobWorkNo}${doc.docPostfix}`;
      const final = { ...doc, invoiceNumber: fullNo, date: doc.jwDetail.date, total: doc.grandTotal, customerName: doc.customerInfo.ms };
      let result;
      if (id) result = await updateItem('documents', id, final, user.id);
      else result = await addItem('documents', final, user.id);
      if (print) { setSavedDoc(result || final); setShowPrintModal(true); }
      else navigate('/documents');
    } catch (err) { alert('Save failed. Please try again.'); console.error(err); }
    finally { setIsSubmitting(false); }
  };

  if (loading) return (
    <div className="jw-page">
      <div className="jw-loading">
        <div className="jw-loading-spinner" />
        Loading Job Work...
      </div>
    </div>
  );

  return (
    <div className="jw-page">
      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        onSave={handleContactSaved}
      />

      <ProductModal
        isOpen={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        onSave={p => {
          setProducts(prev => [...prev, p]);
          if (activeItemIdx !== null) handleItemChange(activeItemIdx, 'productId', p.id);
        }}
      />

      {/* Header */}
      <div className="jw-header">
        <div className="jw-header-left">
          <div className="jw-badge">⚙️ JOB WORK</div>
          <div>
            <div className="jw-title">Job Work Challan</div>
            <div className="jw-subtitle">{id ? `Editing • ${doc.jwDetail.jobWorkNo}` : 'Create new job work document'}</div>
          </div>
        </div>
        <div className="jw-header-actions">
          <button className="jw-btn jw-btn-ghost" onClick={() => navigate('/documents')}><ArrowLeft size={16} /> Back</button>
        </div>
      </div>

      {/* Top Grid */}
      <div className="jw-top-grid">
        {/* Customer Info */}
        <div className="jw-card">
          <div className="jw-card-header">
            <div className="jw-card-header-left">
              <div className="jw-card-icon vendor">👤</div>
              <div>
                <div className="jw-card-title">Customer Information</div>
                <div className="jw-card-subtitle">Billing & GST Details</div>
              </div>
            </div>
            <button className="jw-menu-btn"><MoreVertical size={16} /></button>
          </div>
          <div className="jw-card-body">
            <div className="jw-field-row">
              <label className="jw-label">M/S.<span className="req">*</span></label>
              <div className="jw-ms-row">
                <select className="jw-select" value={doc.customerId} onChange={handleCustomerChange}>
                  <option value="">-- Choose Customer --</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.companyName || c.customerName}</option>)}
                </select>
                <button type="button" className="jw-ms-add-btn" onClick={() => setShowContactModal(true)}>+</button>
              </div>
            </div>
            <div className="jw-field-row align-top">
              <label className="jw-label">Address</label>
              <textarea className="jw-textarea" rows={3} value={doc.customerInfo.address} onChange={e => handleNested('customerInfo', 'address', e.target.value)} />
            </div>
            <div className="jw-field-row">
              <label className="jw-label">Contact Person</label>
              <input className="jw-input" value={doc.customerInfo.contactPerson} onChange={e => handleNested('customerInfo', 'contactPerson', e.target.value)} />
            </div>
            <div className="jw-field-row">
              <label className="jw-label">Phone No</label>
              <input className="jw-input" value={doc.customerInfo.phoneNo} onChange={e => handleNested('customerInfo', 'phoneNo', e.target.value)} />
            </div>
            <div className="jw-field-row">
              <label className="jw-label">GSTIN / PAN</label>
              <input className="jw-input" value={doc.customerInfo.gstinPan} onChange={e => handleNested('customerInfo', 'gstinPan', e.target.value.toUpperCase())} />
            </div>
            <div className="jw-field-row">
              <label className="jw-label">Rev. Charge</label>
              <select className="jw-select" value={doc.customerInfo.revCharge} onChange={e => handleNested('customerInfo', 'revCharge', e.target.value)}>
                <option value="No">No</option><option value="Yes">Yes</option>
              </select>
            </div>
            <div className="jw-field-row">
              <label className="jw-label">Distance (km)</label>
              <input className="jw-input" placeholder="For e-way bill" value={doc.customerInfo.distance} onChange={e => handleNested('customerInfo', 'distance', e.target.value)} />
            </div>
            <div className="jw-field-row">
              <label className="jw-label">Place of Supply<span className="req">*</span></label>
              <select className="jw-select" value={doc.customerInfo.placeOfSupply} onChange={e => handleNested('customerInfo', 'placeOfSupply', e.target.value)}>
                {Object.keys(STATE_CODES).sort().map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Job Work Detail */}
        <div className="jw-card">
          <div className="jw-card-header">
            <div className="jw-card-header-left">
              <div className="jw-card-icon detail">📋</div>
              <div>
                <div className="jw-card-title">Job Work Detail</div>
                <div className="jw-card-subtitle">Document metadata & references</div>
              </div>
            </div>
            <button type="button" className="jw-reset-btn" title="Reset Job Work Details" onClick={resetJwDetail}><RotateCcw size={14} /></button>
          </div>
          <div className="jw-card-body">
            <div className="jw-field-row">
              <label className="jw-label">Type</label>
              <select className="jw-select" value={doc.jwDetail.type} onChange={e => handleNested('jwDetail', 'type', e.target.value)}>
                {JW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="jw-field-row">
              <label className="jw-label">Job Work No.<span className="req">*</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input className="jw-no-input" style={{ width: '10ch', textAlign: 'center' }} value={doc.docPrefix} onChange={e => setDoc({ ...doc, docPrefix: e.target.value })} />
                <input className="jw-no-input" style={{ width: '15ch', fontWeight: 700 }} value={doc.jwDetail.jobWorkNo} onChange={e => handleNested('jwDetail', 'jobWorkNo', e.target.value)} />
                <input className="jw-no-input" style={{ width: '10ch', textAlign: 'center' }} value={doc.docPostfix} onChange={e => setDoc({ ...doc, docPostfix: e.target.value })} />
              </div>
            </div>

            <div className="jw-field-row">
              <label className="jw-label">Job Work Date<span className="req">*</span></label>
              <input type="date" className="jw-input" value={doc.jwDetail.date} onChange={e => handleNested('jwDetail', 'date', e.target.value)} />
            </div>

            <div className="jw-field-row">
              <label className="jw-label">Challan No.</label>
              <input className="jw-input" placeholder="Challan No." value={doc.jwDetail.challanNo} onChange={e => handleNested('jwDetail', 'challanNo', e.target.value)} />
            </div>

            <div className="jw-field-row">
              <label className="jw-label">Challan Date</label>
              <input key={`challan-date-${resetKey}`} type="date" className="jw-input" value={doc.jwDetail.challanDate} onChange={e => handleNested('jwDetail', 'challanDate', e.target.value)} />
            </div>

            <div className="jw-field-row">
              <label className="jw-label">L.R. No.</label>
              <input className="jw-input" placeholder="L.R. No." value={doc.jwDetail.lrNo} onChange={e => handleNested('jwDetail', 'lrNo', e.target.value)} />
            </div>

            <div className="jw-divider" />

            <div className="jw-field-row">
              <label className="jw-label">Delivery</label>
              <select className="jw-select" value={doc.jwDetail.deliveryMode} onChange={e => handleNested('jwDetail', 'deliveryMode', e.target.value)}>
                {DELIVERY_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
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
            <div className="jw-discount-toggle">
              <span className="jw-toggle-label">Discount :</span>
              <span className={`jw-toggle-chip ${doc.discount.unit === 'Rs' ? 'active' : ''}`} onClick={() => handleNested('discount', 'unit', 'Rs')}>Rs</span>
              <span className={`jw-toggle-chip ${doc.discount.unit === '%' ? 'active' : ''}`} onClick={() => handleNested('discount', 'unit', '%')}>%</span>
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
                <th className="igst-col">IGST %</th>
                <th className="total-col">TOTAL</th>
                <th className="action-col"></th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="pt-sr-num">{idx + 1}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <select className="pt-cell-select" style={{ flex: 1 }} value={item.productId} onChange={e => handleItemChange(idx, 'productId', e.target.value)}>
                        <option value="">-- Select --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <button type="button" className="pt-cell-add-btn" onClick={() => { setActiveItemIdx(idx); setShowAddProduct(true); }}>+</button>
                    </div>
                    <textarea className="pt-cell-note" placeholder="Item note..." rows={1} value={item.note} onChange={e => handleItemChange(idx, 'note', e.target.value)} />
                  </td>
                  <td><input className="pt-cell-input" value={item.hsn} onChange={e => handleItemChange(idx, 'hsn', e.target.value)} /></td>
                  <td><input type="number" className="pt-cell-input" style={{ textAlign: 'center' }} value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} /></td>
                  <td><input className="pt-cell-input" style={{ textAlign: 'center' }} value={item.unit} onChange={e => handleItemChange(idx, 'unit', e.target.value)} /></td>
                  <td><input type="number" className="pt-cell-input" style={{ textAlign: 'right' }} value={item.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} /></td>
                  <td>
                    <select className="pt-cell-select" value={item.taxRate} onChange={e => handleItemChange(idx, 'taxRate', e.target.value)}>
                      {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                    <div className="pt-tax-display">₹{item.taxAmount.toFixed(0)}</div>
                  </td>
                  <td><div className="pt-total-value">{(item.amount + item.taxAmount).toFixed(2)}</div></td>
                  <td><button className="pt-remove-btn" onClick={() => removeRow(idx)}>×</button></td>
                </tr>
              ))}
              <tr className="pt-total-inv-row">
                <td colSpan={2}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: '#64748b', fontSize: '0.8rem' }}>Total Job Work Val.</span>
                    <button className="pt-add-item-btn" onClick={addRow}>+ Add Row</button>
                  </div>
                </td>
                <td></td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{doc.items.reduce((a, i) => a + (Number(i.quantity) || 0), 0)}</td>
                <td></td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{doc.taxable.toFixed(2)}</td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{doc.totalTax.toFixed(2)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{(doc.taxable + doc.totalTax).toFixed(2)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="jw-bottom-grid">
        {/* Left: Terms & Notes */}
        <div className="jw-left-bottom">
          <div className="jw-due-date-row">
            <label className="jw-label">Completion Date</label>
            <input type="date" className="jw-input yellow-bg" value={doc.completionDate} onChange={e => setDoc({ ...doc, completionDate: e.target.value })} />
          </div>

          <div className="jw-field-row" style={{ marginBottom: '1rem' }}>
            <label className="jw-label">Bank</label>
            <select className="jw-select" value={doc.bank} onChange={e => setDoc({ ...doc, bank: e.target.value })}>
              {banks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="jw-divider" />

          <div className="jw-terms-section">
            <div className="jw-section-title">Terms & Conditions</div>
            {doc.terms.map((term, idx) => (
              <div key={idx} className="jw-terms-row">
                <input className="jw-input" style={{ fontWeight: 600 }} placeholder="Title" value={term.title} onChange={e => { const t = [...doc.terms]; t[idx].title = e.target.value; setDoc({ ...doc, terms: t }); }} />
                <input className="jw-input" placeholder="Detail" value={term.detail} onChange={e => { const t = [...doc.terms]; t[idx].detail = e.target.value; setDoc({ ...doc, terms: t }); }} />
                <button type="button" className="jw-term-remove-btn" onClick={() => { const t = doc.terms.filter((_, i) => i !== idx); setDoc({ ...doc, terms: t }); }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button className="jw-add-notes-btn" onClick={() => setDoc({ ...doc, terms: [...doc.terms, { title: '', detail: '' }] })}>
              <Plus size={14} /> Add Note
            </button>
          </div>

          <div className="jw-divider" />

          <div className="jw-doc-note-row">
            <div className="jw-doc-note-label">
              <label className="jw-label">Internal Remarks</label>
              <span className="jw-label-italic">Not Visible on Print</span>
            </div>
            <textarea className="jw-textarea" rows={3} placeholder="Staff notes..." value={doc.documentNote} onChange={e => setDoc({ ...doc, documentNote: e.target.value })} />
          </div>
        </div>

        {/* Right: Totals */}
        <div className="jw-right-bottom">
          <div className="jw-totals-row">
            <span className="jw-totals-label">Taxable</span>
            <span className="jw-totals-value">{doc.taxable.toFixed(2)}</span>
          </div>
          <div className="jw-totals-row">
            <span className="jw-totals-label">Total Tax</span>
            <span className="jw-totals-value">{doc.totalTax.toFixed(2)}</span>
          </div>

          {/* Discount */}
          <div className="jw-modifier-row">
            <span className="jw-modifier-label">Discount</span>
            <select className="jw-modifier-select" value={doc.discount.mode} onChange={e => handleNested('discount', 'mode', e.target.value)}>
              <option value="-">-</option><option value="+">+</option>
            </select>
            <input className="jw-modifier-input" type="number" value={doc.discount.value} onChange={e => handleNested('discount', 'value', e.target.value)} />
            <select className="jw-modifier-unit" value={doc.discount.unit} onChange={e => handleNested('discount', 'unit', e.target.value)}>
              <option value="Rs">Rs</option><option value="%">%</option>
            </select>
          </div>

          {/* TCS */}
          <div className="jw-modifier-row">
            <span className="jw-modifier-label">TCS</span>
            <select className="jw-modifier-select" value={doc.tcs.mode} onChange={e => handleNested('tcs', 'mode', e.target.value)}>
              <option value="+">+</option><option value="-">-</option>
            </select>
            <input className="jw-modifier-input" type="number" value={doc.tcs.value} onChange={e => handleNested('tcs', 'value', e.target.value)} />
            <select className="jw-modifier-unit" value={doc.tcs.unit} onChange={e => handleNested('tcs', 'unit', e.target.value)}>
              <option value="%">%</option><option value="Rs">Rs</option>
            </select>
          </div>

          {/* Round Off */}
          <div className="jw-roundoff-row">
            <div className="jw-roundoff-left">
              <span className="jw-label">Round Off</span>
              <label className="jw-toggle-switch">
                <input type="checkbox" checked={doc.roundOff} onChange={e => setDoc({ ...doc, roundOff: e.target.checked })} />
                <span className="jw-toggle-thumb"></span>
              </label>
            </div>
            <span className="jw-totals-value">{(doc.grandTotal - (doc.totalTaxable + doc.totalTax)).toFixed(2)}</span>
          </div>

          {/* Grand Total */}
          <div className="jw-grand-total">
            <span className="jw-grand-label">Grand Total</span>
            <span className="jw-grand-value">₹ {doc.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          {/* Total in Words */}
          <div className="jw-words-row">
            <div className="jw-words-label">Total in words</div>
            <div className="jw-words-value">{numberToWords(doc.grandTotal)}</div>
          </div>

          {/* Smart Suggestion */}
          <div className="jw-smart-box">
            <span className="jw-smart-label">Smart Billing Suggestion</span>
            <button className="jw-smart-add">+</button>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="jw-action-bar">
        <div className="jw-action-left">
          <button className="jw-btn jw-btn-ghost" onClick={() => navigate('/documents')}><ArrowLeft size={16} /> Back</button>
          <button className="jw-btn jw-btn-danger" onClick={() => { if (window.confirm('Discard changes?')) navigate('/documents'); }}><Trash2 size={16} /> Discard</button>
        </div>
        <div className="jw-action-right">
          <button className="jw-btn jw-btn-print" onClick={() => handleSave(true)} disabled={isSubmitting}><Printer size={16} /> Save & Print</button>
          <button className="jw-btn jw-btn-save" onClick={() => handleSave(false)} disabled={isSubmitting}><Save size={16} /> {isSubmitting ? 'Saving...' : 'Save Record'}</button>
        </div>
      </div>

      {showPrintModal && savedDoc && (
        <PrintViewModal doc={savedDoc} onClose={() => { setShowPrintModal(false); navigate('/documents'); }} />
      )}
    </div>
  );
};

export default JobWork;

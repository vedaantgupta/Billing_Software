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
import '../pages/PurchaseInvoice.css'; // Switching to Purchase Invoice styles

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
    return conv(Math.floor(num / 10000000)) + 'CRORE ' + conv(num % 10000000);
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
    docPrefix: 'PI/',
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
      placeOfSupply: 'Maharashtra',
    },
    piDetail: {
      type: 'Standard Proforma',
      piNo: '1',
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
          placeOfSupply: c.state || 'Maharashtra',
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
    if (!doc.piDetail.piNo) { alert('Please enter Proforma No.'); return; }
    
    setIsSubmitting(true);
    try {
      const fullNo = `${doc.docPrefix}${doc.piDetail.piNo}${doc.docPostfix}`;
      const finalDoc = {
        ...doc,
        invoiceNumber: fullNo,
        date: doc.piDetail.date,
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

  if (loading) return <div className="quo-page">Loading Proforma Invoice...</div>;

  return (
    <div className="pi-page">
      {/* Header */}
      <div className="pi-header">
        <div className="pi-header-left">
          <div className="pi-badge" style={{ background: '#0284c7', color: 'white' }}>
            📄 PROFORMA
          </div>
          <div>
            <div className="pi-title">Proforma Invoice</div>
            <div className="pi-subtitle">
              {id ? `Editing • ${doc.piDetail.piNo}` : 'Create advance billing record'}
            </div>
          </div>
        </div>
        <div className="pi-header-actions">
          <button className="pi-btn pi-btn-ghost" onClick={() => navigate('/documents')}>
            ← Back
          </button>
        </div>
      </div>

      <div className="pi-top-grid">
        {/* Customer Info */}
        <div className="pi-card">
          <div className="pi-card-header">
            <div className="pi-card-header-left">
              <div className="pi-card-icon vendor">👤</div>
              <div>
                <div className="pi-card-title">Customer Information</div>
                <div className="pi-card-subtitle">Billing & GST Details</div>
              </div>
            </div>
            <button className="pi-menu-btn">⋮</button>
          </div>
          <div className="pi-card-body">
            <div className="pi-field-row">
              <label className="pi-label">M/S.<span className="req">*</span></label>
              <div className="pi-ms-row">
                <select className="pi-select" value={doc.customerId} onChange={handleCustomerChange}>
                  <option value="">-- Choose Customer --</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName || c.customerName}</option>
                  ))}
                </select>
                <button className="pi-ms-add-btn" onClick={() => setShowContactModal(true)}>+</button>
              </div>
            </div>
            <div className="pi-field-row align-top">
              <label className="pi-label">Address</label>
              <textarea className="pi-textarea" rows={3} value={doc.customerInfo.address} onChange={e => handleNested('customerInfo', 'address', e.target.value)} />
            </div>
            <div className="pi-field-row">
              <label className="pi-label">GSTIN / PAN</label>
              <input className="pi-input" placeholder="GST Number" value={doc.customerInfo.gstinPan} onChange={e => handleNested('customerInfo', 'gstinPan', e.target.value.toUpperCase())} />
            </div>
            <div className="pi-field-row">
              <label className="pi-label">Place of Supply<span className="req">*</span></label>
              <select className="pi-select" value={doc.customerInfo.placeOfSupply} onChange={e => handleNested('customerInfo', 'placeOfSupply', e.target.value)}>
                {Object.keys(STATE_CODES).sort().map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Document Detail */}
        <div className="pi-card">
          <div className="pi-card-header">
            <div className="pi-card-header-left">
              <div className="pi-card-icon detail">📋</div>
              <div>
                <div className="pi-card-title">Document Detail</div>
                <div className="pi-card-subtitle">Invoice metadata & references</div>
              </div>
            </div>
            <button className="pi-reset-btn" title="Reset Detail" onClick={() => setDoc(prev => ({
              ...prev,
              piDetail: {
                ...prev.piDetail,
                piNo: '',
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
          <div className="pi-card-body">
            <div className="pi-field-row">
              <label className="pi-label">Invoice Type</label>
              <select className="pi-select" value={doc.piDetail.type} onChange={e => handleNested('piDetail', 'type', e.target.value)}>
                {PI_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="pi-invoice-no-row">
              <label className="pi-label">Proforma No.<span className="req">*</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                <input className="pi-no-input" style={{ width: '60px', textAlign: 'center' }} value={doc.docPrefix} onChange={e => setDoc({...doc, docPrefix: e.target.value})} />
                <input className="pi-no-input" value={doc.piDetail.piNo} onChange={e => handleNested('piDetail', 'piNo', e.target.value)} />
                <input className="pi-no-input" style={{ width: '60px', textAlign: 'center' }} value={doc.docPostfix} onChange={e => setDoc({...doc, docPostfix: e.target.value})} />
                <div className="pi-date-group">
                  <span className="pi-date-label">Date<span className="req">*</span></span>
                  <input type="date" className="pi-date-input" value={doc.piDetail.date} onChange={e => handleNested('piDetail', 'date', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="pi-field-row two-col">
              <label className="pi-label">Challan No.</label>
              <input className="pi-input" placeholder="Challan No." value={doc.piDetail.challanNo} onChange={e => handleNested('piDetail', 'challanNo', e.target.value)} />
              <label className="pi-label">Challan Date</label>
              <input className="pi-input" placeholder="dd/mm/yy" value={doc.piDetail.challanDate} onChange={e => handleNested('piDetail', 'challanDate', e.target.value)} />
            </div>

            <div className="pi-field-row two-col">
              <label className="pi-label">L.R. No.</label>
              <input className="pi-input" placeholder="L.R. No." value={doc.piDetail.lrNo} onChange={e => handleNested('piDetail', 'lrNo', e.target.value)} />
              <label className="pi-label">E-Way No.</label>
              <input className="pi-input" placeholder="E-Way No." value={doc.piDetail.ewayNo} onChange={e => handleNested('piDetail', 'ewayNo', e.target.value)} />
            </div>

            <div className="pi-field-row">
              <label className="pi-label">P.O. No.</label>
              <input className="pi-input" placeholder="Purchase Order No." value={doc.piDetail.poNo} onChange={e => handleNested('piDetail', 'poNo', e.target.value)} />
            </div>
            <div className="pi-divider" />
            <div className="pi-field-row">
              <label className="pi-label">Delivery</label>
              <select className="pi-select" value={doc.piDetail.deliveryMode} onChange={e => handleNested('piDetail', 'deliveryMode', e.target.value)}>
                {DELIVERY_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="pi-table-card">
        <div className="pi-table-header">
          <div className="pi-card-header-left">
            <div className="pi-card-icon items">📦</div>
            <div>
              <div className="pi-card-title">Product Items</div>
              <div className="pi-card-subtitle">{doc.items.length} row(s)</div>
            </div>
          </div>
          <div className="pi-table-actions">
            <div className="pi-discount-toggle">
              <span className="pi-toggle-label">Discount :</span>
              <span className={`pi-toggle-chip ${doc.discount.unit === 'Rs' ? 'active' : ''}`} onClick={() => handleNested('discount', 'unit', 'Rs')}>Rs</span>
              <span className={`pi-toggle-chip ${doc.discount.unit === '%' ? 'active' : ''}`} onClick={() => handleNested('discount', 'unit', '%')}>%</span>
            </div>
            <button className="pi-add-item-btn" onClick={addItem_}><span>+</span> Add Row</button>
          </div>
        </div>
        <div className="pi-table-scroll">
          <table className="pi-product-table">
            <thead>
              <tr>
                <th style={{width: '50px'}}>SR.</th>
                <th>PRODUCT / SERVICE</th>
                <th style={{width: '130px'}}>HSN/SAC</th>
                <th style={{width: '100px'}}>QTY.</th>
                <th style={{width: '100px'}}>UOM</th>
                <th style={{width: '120px'}}>PRICE</th>
                <th style={{width: '120px'}}>GST %</th>
                <th style={{width: '150px'}}>TOTAL</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="pi-sr-num">{idx + 1}</td>
                  <td>
                    <div className="flex gap-2 items-center">
                      <select className="pi-cell-select" style={{ flex: 1 }} value={item.productId} onChange={e => handleItemChange(idx, 'productId', e.target.value)}>
                        <option value="">-- Select --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <button 
                        type="button" 
                        className="pi-add-item-btn" 
                        style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => {
                          setActiveItemIdx(idx);
                          setShowAddProduct(true);
                        }}
                      >
                        +
                      </button>
                    </div>
                    <textarea className="pi-cell-note" placeholder="Internal item note..." rows={1} value={item.note} onChange={e => handleItemChange(idx, 'note', e.target.value)} />
                  </td>
                  <td><input className="pi-cell-input" value={item.hsn} onChange={e => handleItemChange(idx, 'hsn', e.target.value)} /></td>
                  <td><input type="number" className="pi-cell-input" style={{textAlign: 'center'}} value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} /></td>
                  <td><input className="pi-cell-input" style={{textAlign: 'center'}} value={item.unit} onChange={e => handleItemChange(idx, 'unit', e.target.value)} /></td>
                  <td><input type="number" className="pi-cell-input" style={{textAlign: 'right'}} value={item.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} /></td>
                  <td>
                    <select className="pi-cell-select" value={item.taxRate} onChange={e => handleItemChange(idx, 'taxRate', e.target.value)}>
                      {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </td>
                  <td><div className="pi-total-value">{(item.amount + item.taxAmount).toFixed(2)}</div></td>
                  <td><button className="pi-remove-btn" onClick={() => removeItem(idx)}>×</button></td>
                </tr>
              ))}
              <tr className="pi-summary-row">
                <td colSpan={2} className="pi-summary-label">Total Document Value</td>
                <td></td>
                <td style={{textAlign: 'center'}}>{doc.items.reduce((a,i) => a + Number(i.quantity), 0)}</td>
                <td></td>
                <td style={{textAlign: 'right'}}>{doc.taxable.toFixed(2)}</td>
                <td style={{textAlign: 'center'}}>{doc.totalTax.toFixed(2)}</td>
                <td style={{textAlign: 'right', color: '#059669'}}>{doc.grandTotal.toFixed(2)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem', color: '#cbd5e1', fontSize: '0.7rem' }}>
          ← scroll →
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="pi-bottom-grid">
        <div className="pi-left-bottom">
          <div className="pi-due-date-row">
            <label className="pi-label">Expiry Date</label>
            <input type="date" className="pi-input yellow-bg" value={doc.piDetail.date} onChange={e => handleNested('piDetail', 'date', e.target.value)} />
          </div>
          <div className="pi-divider" />
          <div className="pi-terms-section">
            <div className="pi-section-title">Terms & Conditions</div>
            {doc.terms.map((term, idx) => (
              <div key={idx} className="pi-terms-row">
                <input className="pi-input" style={{ fontWeight: 600, width: '120px' }} value={term.title} onChange={e => {
                  const t = [...doc.terms]; t[idx].title = e.target.value; setDoc({...doc, terms: t});
                }} />
                <input className="pi-input" value={term.detail} onChange={e => {
                  const t = [...doc.terms]; t[idx].detail = e.target.value; setDoc({...doc, terms: t});
                }} />
              </div>
            ))}
          </div>
          <div className="pi-divider" />
          <div className="pi-doc-note-row">
            <div className="pi-doc-note-label">
              <label className="pi-label">Internal Remarks</label>
              <span className="pi-label-italic">Not Visible on Print</span>
            </div>
            <textarea className="pi-textarea" rows={3} placeholder="Staff notes..." value={doc.documentNote} onChange={e => setDoc({...doc, documentNote: e.target.value})} />
          </div>
          <div className="pi-field-row" style={{ marginTop: '1rem' }}>
            <label className="pi-label">Bank Details</label>
            <select className="pi-select" value={doc.bank} onChange={e => setDoc({...doc, bank: e.target.value})}>
              {banks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        <div className="pi-right-bottom">
          <div className="pi-totals-row">
            <span className="pi-totals-label">Taxable</span>
            <span className="pi-totals-value">{doc.taxable.toFixed(2)}</span>
          </div>
          <div className="pi-totals-row">
            <span className="pi-totals-label">Total Tax</span>
            <span className="pi-totals-value">{doc.totalTax.toFixed(2)}</span>
          </div>
          
          <div className="pi-modifier-row">
            <span className="pi-modifier-label">Discount</span>
            <div className="flex gap-1" style={{ flex: 1, justifyContent: 'flex-end' }}>
              <input className="pi-modifier-input" type="number" value={doc.discount.value} onChange={e => handleNested('discount', 'value', e.target.value)} />
              <select className="pi-modifier-unit" value={doc.discount.unit} onChange={e => handleNested('discount', 'unit', e.target.value)}>
                <option value="Rs">Rs</option>
                <option value="%">%</option>
              </select>
            </div>
          </div>

          <div className="pi-grand-total">
            <span className="pi-grand-label">Grand Total</span>
            <span className="pi-grand-value">₹ {doc.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          
          <div className="pi-words-row">
            <div className="pi-words-label">Total in words</div>
            <div className="pi-words-value">{numberToWords(doc.grandTotal)}</div>
          </div>

          <div className="pi-smart-box">
            <span className="pi-smart-label">Smart Billing Suggestion</span>
            <button className="pi-smart-add">+</button>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="pi-action-bar">
        <div className="pi-action-left">
          <button className="pi-btn pi-btn-ghost" onClick={() => navigate('/documents')}>← Back</button>
          <button className="pi-btn pi-btn-danger" onClick={() => { if(window.confirm('Discard?')) navigate('/documents'); }}>🗑 Discard</button>
        </div>
        <div className="pi-action-right">
          <button className="pi-btn pi-btn-print" onClick={() => handleSave(true)} disabled={isSubmitting}>🖨 Save & Print</button>
          <button className="pi-btn pi-btn-save" onClick={() => handleSave(false)} disabled={isSubmitting}>💾 {isSubmitting ? 'Saving...' : 'Save Record'}</button>
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
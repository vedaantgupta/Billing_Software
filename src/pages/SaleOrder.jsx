import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PrintViewModal from '../components/PrintViewModal';
import ProductModal from '../components/ProductModal';
import ContactModal from '../components/ContactModal';
import {
   ArrowLeft, Trash2, Printer, Save, Plus,
   MoreVertical, RotateCcw, FileCheck, Truck, Mail, Calendar, Building2,
   ChevronDown, ChevronRight, X, Search, Info, HelpCircle
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
      return conv(Math.floor(n / 10000000)) + 'CRORE ' + conv(n % 10000000);
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
   const location = useLocation();
   const { user } = useAuth();

   const [loading, setLoading] = useState(true);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [customers, setCustomers] = useState([]);
   const [products, setProducts] = useState([]);
   const [banks] = useState(['CASH', 'CANARA BANK', 'HDFC BANK', 'SBI', 'ICICI BANK']);
   const [showPrintModal, setShowPrintModal] = useState(false);
   const [savedDoc, setSavedDoc] = useState(null);
   const [showAddProduct, setShowAddProduct] = useState(false);
   const [activeItemIdx, setActiveItemIdx] = useState(null);
   const [additionalChargeModal, setAdditionalChargeModal] = useState(false);
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
         { title: 'Responsibility', detail: 'Our Responsibility Ceases as soon as goods leave our Premises.' }
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

   // Financial Auto-Calculation
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
            revCharge: 'No',
            shipTo: '--',
            distance: '',
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
            status: 'Outstanding',
            docType: 'Sale Order'
         };

         let result;
         if (id) {
            result = await updateItem('documents', id, finalDoc, user.id);
         } else {
            result = await addItem('documents', finalDoc, user.id);
         }

         logActivity(id ? `Updated Sale Order #${fullNo}` : `Created Sale Order #${fullNo}`, user.id, user.username);

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

   if (loading && user) {
      return <div className="so-loading"><div className="so-loading-spinner" />Loading Sale Order...</div>;
   }

   return (
      <div className="so-page">
         {/* ── Header ─────────────────────────────────────────── */}
         <div className="so-header">
            <div className="so-header-left">
               <div className="so-badge">🛒 Sale Order</div>
               <div>
                  <div className="so-title">Sale Order Builder</div>
                  <div className="so-subtitle">
                     {id ? `Editing • SO-${doc.soDetail.soNo}` : 'Register new customer commitment'}
                  </div>
               </div>
            </div>
            <div className="so-header-actions">
               <button className="so-btn so-btn-ghost" onClick={() => navigate('/documents')}>
                  ← Back to List
               </button>
            </div>
         </div>

         {/* ── Top Two-Column Grid: Customer + SO Details ────── */}
         <div className="so-top-grid">

            {/* Customer Information Card */}
            <div className="so-card">
               <div className="so-card-header">
                  <div className="so-card-header-left">
                     <div className="so-card-icon customer">👤</div>
                     <div>
                        <div className="so-card-title">Customer Information</div>
                        <div className="so-card-subtitle">Identity & Billing</div>
                     </div>
                  </div>
                  <MoreVertical size={18} color="#94a3b8" style={{ cursor: 'pointer' }} />
               </div>
               <div className="so-card-body">

                  {/* M/S Selection */}
                  <div className="so-field-row">
                     <label className="so-label">M/S.<span className="req">*</span></label>
                     <div className="so-ms-row">
                        <select className="so-select" value={doc.customerId} onChange={handleCustomerChange}>
                           <option value="">Select Customer</option>
                           {customers.map(c => <option key={c.id} value={c.id}>{c.companyName || c.customerName}</option>)}
                        </select>
                        <button className="so-ms-add-btn" onClick={() => setShowContactModal(true)}>+</button>
                     </div>
                  </div>

                  {/* Address */}
                  <div className="so-field-row align-top">
                     <label className="so-label">Address</label>
                     <textarea className="so-textarea" rows={2} value={doc.customerInfo.address} onChange={e => handleNested('customerInfo', 'address', e.target.value)} />
                  </div>

                  {/* Contact Person & Phone */}
                  <div className="so-two-col">
                     <div className="so-field-row">
                        <label className="so-label">Contact Person</label>
                        <input className="so-input" value={doc.customerInfo.contactPerson} onChange={e => handleNested('customerInfo', 'contactPerson', e.target.value)} />
                     </div>
                     <div className="so-field-row">
                        <label className="so-label">Phone No</label>
                        <input className="so-input" value={doc.customerInfo.phoneNo} onChange={e => handleNested('customerInfo', 'phoneNo', e.target.value)} />
                     </div>
                  </div>

                  {/* GSTIN & Reverse Charge */}
                  <div className="so-two-col">
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
                  </div>

                  {/* Ship To & Distance */}
                  <div className="so-two-col">
                     <div className="so-field-row">
                        <label className="so-label">Ship To</label>
                        <select className="so-select" value={doc.customerInfo.shipTo} onChange={e => handleNested('customerInfo', 'shipTo', e.target.value)}>
                           <option value="--">--</option>
                           <option value="Same as Billing">Same as Billing</option>
                           {customers.map(c => <option key={c.id} value={c.id}>{c.companyName || c.customerName}</option>)}
                        </select>
                     </div>
                     <div className="so-field-row">
                        <label className="so-label">Distance (km)</label>
                        <input className="so-input" value={doc.customerInfo.distance} onChange={e => handleNested('customerInfo', 'distance', e.target.value)} />
                     </div>
                  </div>

                  {/* Place of Supply */}
                  <div className="so-field-row">
                     <label className="so-label">Place of Supply<span className="req">*</span></label>
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
                        <div className="so-card-subtitle">Tracking & Timeline</div>
                     </div>
                  </div>
                  <RotateCcw size={18} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setDoc({ ...doc, soDetail: { ...doc.soDetail, soNo: '1', date: todayIso() } })} />
               </div>
               <div className="so-card-body">

                  {/* Type */}
                  <div className="so-field-row">
                     <label className="so-label">Type</label>
                     <select className="so-select" value={doc.soDetail.type} onChange={e => handleNested('soDetail', 'type', e.target.value)}>
                        {SO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                     </select>
                  </div>

                  {/* Sale Order No + Date */}
                  <div className="so-invoice-no-row">
                     <label className="so-label">Sale Order No.<span className="req">*</span></label>
                     <div className="so-number-group">
                        <input className="so-prefix-input" placeholder="Pref" value={doc.docPrefix} onChange={e => setDoc({ ...doc, docPrefix: e.target.value })} />
                        <input className="so-main-input" value={doc.soDetail.soNo} onChange={e => handleNested('soDetail', 'soNo', e.target.value)} />
                        <input className="so-postfix-input" placeholder="Post" value={doc.docPostfix} onChange={e => setDoc({ ...doc, docPostfix: e.target.value })} />
                     </div>
                     <div className="so-date-inner">
                        <label className="so-label">Date<span className="req">*</span></label>
                        <input type="date" className="so-date-input" value={doc.soDetail.date} onChange={e => handleNested('soDetail', 'date', e.target.value)} />
                     </div>
                  </div>

                  {/* Challan No & Date */}
                  <div className="so-two-col">
                     <div className="so-field-row">
                        <label className="so-label">Challan No.</label>
                        <input className="so-input" placeholder="Challan No." value={doc.soDetail.challanNo} onChange={e => handleNested('soDetail', 'challanNo', e.target.value)} />
                     </div>
                     <div className="so-field-row">
                        <label className="so-label">Challan Date</label>
                        <input type="date" className="so-input" value={doc.soDetail.challanDate} onChange={e => handleNested('soDetail', 'challanDate', e.target.value)} />
                     </div>
                  </div>

                  {/* Ref Number */}
                  <div className="so-field-row">
                     <label className="so-label">Ref. No.</label>
                     <input className="so-input" placeholder="Ref. No." value={doc.soDetail.refNo} onChange={e => handleNested('soDetail', 'refNo', e.target.value)} />
                  </div>

                  <div className="so-divider" />

                  {/* Delivery Mode */}
                  <div className="so-field-row">
                     <label className="so-label">Delivery</label>
                     <select className="so-select" value={doc.soDetail.deliveryMode} onChange={e => handleNested('soDetail', 'deliveryMode', e.target.value)}>
                        {DELIVERY_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                     </select>
                  </div>
               </div>
            </div>
         </div>

         {/* ── Product Items Table ──────────────────────────────── */}
         <div className="so-table-card">
            <div className="so-table-header">
               <div className="so-table-header-left">
                  <div className="so-card-icon items">📦</div>
                  <div>
                     <div className="so-card-title">Product Items</div>
                     <div className="so-card-subtitle">{doc.items.length} item{doc.items.length !== 1 ? 's' : ''}</div>
                  </div>
               </div>
               <div className="so-table-actions">
                  <div className="so-discount-toggle">
                     <span className="so-toggle-label">Discount :</span>
                     <span className={`so-toggle-chip ${doc.discount.unit === 'Rs' ? 'active' : ''}`} onClick={() => handleNested('discount', 'unit', 'Rs')}>Rs</span>
                     <span className={`so-toggle-chip ${doc.discount.unit === '%' ? 'active' : ''}`} onClick={() => handleNested('discount', 'unit', '%')}>%</span>
                  </div>
                  <button className="so-add-item-btn" onClick={addItem_}>+ Add Item</button>
               </div>
            </div>

            <div className="so-table-scroll">
               <table className="so-product-table">
                  <thead>
                     <tr>
                        <th className="th-sr">SR.</th>
                        <th className="th-product">PRODUCT / OTHER CHARGES</th>
                        <th className="th-hsn">HSN/SAC CODE</th>
                        <th className="th-qty">QTY.</th>
                        <th className="th-uom">UOM</th>
                        <th className="th-price">PRICE (RS)</th>
                        <th className="th-tax">CGST + SGST</th>
                        <th className="th-total">TOTAL</th>
                        <th className="th-action"></th>
                     </tr>
                  </thead>
                  <tbody>
                     {doc.items.map((item, idx) => (
                        <tr key={idx}>
                           <td className="so-sr-num">{idx + 1}</td>
                           <td>
                              <div className="flex gap-2 items-center">
                                 <select
                                    className="so-cell-select"
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
                              <textarea className="so-cell-note" placeholder="Item Note..." rows={1} value={item.note} onChange={e => handleItemChange(idx, 'note', e.target.value)} />
                           </td>
                           <td><input className="so-cell-input" placeholder="HSN/SAC" value={item.hsn} onChange={e => handleItemChange(idx, 'hsn', e.target.value)} /></td>
                           <td><input type="number" className="so-cell-input text-center" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} /></td>
                           <td><input className="so-cell-input text-center" value={item.unit} onChange={e => handleItemChange(idx, 'unit', e.target.value)} /></td>
                           <td><input type="number" className="so-cell-input text-right" value={item.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} /></td>
                           <td>
                              <div className="so-tax-group">
                                 <select className="so-cell-select" value={item.taxRate} onChange={e => handleItemChange(idx, 'taxRate', e.target.value)}>
                                    {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                                 </select>
                                 <div className="so-tax-val">₹{item.taxAmount.toFixed(2)}</div>
                              </div>
                           </td>
                           <td><div className="so-total-val">₹ {(item.amount + item.taxAmount).toFixed(2)}</div></td>
                           <td><button className="so-remove-btn" onClick={() => removeItem(idx)}>×</button></td>
                        </tr>
                     ))}
                     <tr className="so-summary-row">
                        <td colSpan={2} className="so-summary-label">Total Sale Order. Val</td>
                        <td></td>
                        <td className="text-center font-bold">{doc.items.reduce((a, i) => a + Number(i.quantity), 0)}</td>
                        <td></td>
                        <td className="text-right font-bold">{doc.taxable.toFixed(2)}</td>
                        <td className="text-center font-bold">{doc.totalTax.toFixed(2)}</td>
                        <td className="text-right font-bold text-success">₹ {(doc.taxable + doc.totalTax).toFixed(2)}</td>
                        <td></td>
                     </tr>
                  </tbody>
               </table>
            </div>
         </div>

         {/* ── Bottom Grid: Meta/Terms + Totals ────── */}
         <div className="so-bottom-grid">

            {/* Left Side: Completion, Bank, Terms */}
            <div className="so-bottom-left">
               <div className="so-bottom-meta">
                  <div className="so-meta-field">
                     <label className="so-label">Completion Date</label>
                     <input type="date" className="so-input" value={doc.completionDate} onChange={e => setDoc({ ...doc, completionDate: e.target.value })} />
                  </div>
                  <div className="so-meta-field">
                     <label className="so-label">Bank</label>
                     <select className="so-select" value={doc.bank} onChange={e => setDoc({ ...doc, bank: e.target.value })}>
                        {banks.map(b => <option key={b} value={b}>{b}</option>)}
                     </select>
                  </div>
               </div>

               <div className="so-terms-card">
                  <div className="so-terms-title">Terms & Condition / Additional Note</div>
                  <div className="so-terms-list">
                     {doc.terms.map((t, idx) => (
                        <div key={idx} className="so-term-row">
                           <input className="so-input term-label-input" value={t.title} onChange={e => {
                              const nt = [...doc.terms]; nt[idx].title = e.target.value; setDoc({ ...doc, terms: nt });
                           }} />
                           <textarea className="so-textarea term-detail-input" rows={1} value={t.detail} onChange={e => {
                              const nt = [...doc.terms]; nt[idx].detail = e.target.value; setDoc({ ...doc, terms: nt });
                           }} />
                           <button className="so-term-del" onClick={() => {
                              const nt = [...doc.terms]; nt.splice(idx, 1); setDoc({ ...doc, terms: nt });
                           }}><Trash2 size={14} /></button>
                        </div>
                     ))}
                  </div>
                  <button className="so-add-note-btn" onClick={() => setDoc({ ...doc, terms: [...doc.terms, { title: '', detail: '' }] })}>+ Add Notes</button>
               </div>

               <div className="so-remarks-card">
                  <div className="so-remarks-header">
                     <label className="so-label">Document Note / Remarks</label>
                     <span className="so-remarks-hint">Not Visible on Print</span>
                  </div>
                  <textarea className="so-textarea" rows={3} placeholder="Internal notes..." value={doc.documentNote} onChange={e => setDoc({ ...doc, documentNote: e.target.value })} />
               </div>
            </div>

            {/* Right Side: Totals & Financials */}
            <div className="so-bottom-right">
               <div className="so-totals-card">
                  <div className="so-total-row">
                     <span className="so-t-label">Taxable</span>
                     <span className="so-t-val">{doc.taxable.toFixed(2)}</span>
                  </div>

                  <div className="so-add-charge-btn" onClick={() => setAdditionalChargeModal(true)}>+ Add Additional Charge</div>

                  <div className="so-total-row highlight">
                     <span className="so-t-label">Total Taxable</span>
                     <span className="so-t-val">{doc.totalTaxable.toFixed(2)}</span>
                  </div>

                  <div className="so-total-row">
                     <span className="so-t-label">Total Tax</span>
                     <span className="so-t-val">{doc.totalTax.toFixed(2)}</span>
                  </div>

                  <div className="so-modifier-row">
                     <span className="so-m-label">TCS</span>
                     <div className="so-m-controls">
                        <select className="so-m-select" value={doc.tcs.mode} onChange={e => handleNested('tcs', 'mode', e.target.value)}><option>+</option><option>-</option></select>
                        <input className="so-m-input" value={doc.tcs.value} onChange={e => handleNested('tcs', 'value', e.target.value)} />
                        <select className="so-m-unit" value={doc.tcs.unit} onChange={e => handleNested('tcs', 'unit', e.target.value)}><option>%</option><option>Rs</option></select>
                     </div>
                  </div>

                  <div className="so-modifier-row">
                     <span className="so-m-label">Discount</span>
                     <div className="so-m-controls">
                        <select className="so-m-select" value={doc.discount.mode} onChange={e => handleNested('discount', 'mode', e.target.value)}><option>-</option><option>+</option></select>
                        <input className="so-m-input" value={doc.discount.value} onChange={e => handleNested('discount', 'value', e.target.value)} />
                        <select className="so-m-unit" value={doc.discount.unit} onChange={e => handleNested('discount', 'unit', e.target.value)}><option>Rs</option><option>%</option></select>
                     </div>
                  </div>

                  <div className="so-total-row roundoff">
                     <div className="so-ro-left">
                        <span className="so-t-label">Round Off</span>
                        <label className="so-switch-ro">
                           <input type="checkbox" checked={doc.roundOff} onChange={e => setDoc({ ...doc, roundOff: e.target.checked })} />
                           <span className="so-slider-ro"></span>
                        </label>
                     </div>
                     <span className="so-t-val">{(doc.grandTotal - (doc.totalTaxable + doc.totalTax)).toFixed(2)}</span>
                  </div>

                  <div className="so-grand-total">
                     <span className="so-g-label">Grand Total</span>
                     <span className="so-g-val">₹ {doc.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="so-words-card">
                     <span className="so-w-label">Total in words</span>
                     <div className="so-w-val">{numberToWords(doc.grandTotal)}</div>
                  </div>

                  <div className="so-smart-box">
                     <span className="so-smart-label">Smart Suggestion</span>
                     <button className="so-smart-add">+</button>
                  </div>

                  <div className="so-email-checkbox">
                     <input type="checkbox" id="emailShare" checked={doc.shareEmail} onChange={e => setDoc({ ...doc, shareEmail: e.target.checked })} />
                     <label htmlFor="emailShare">Share on Email <Mail size={14} /></label>
                  </div>
               </div>
            </div>
         </div>

         {/* ── Footer Action Bar ──────────────────────────────── */}
         <div className="so-action-bar">
            <button className="so-btn-back" onClick={() => navigate('/documents')}>Back</button>
            <div className="so-action-right">
               <button className="so-btn-save-print" onClick={() => handleSave(true)} disabled={isSubmitting}>
                  <Printer size={18} /> Save & Print
               </button>
               <button className="so-btn-save" onClick={() => handleSave(false)} disabled={isSubmitting}>
                  <Save size={18} /> {isSubmitting ? 'Saving...' : 'Save'}
               </button>
            </div>
         </div>

         {/* ── Modals ─────────────────────────────────────────── */}
         {showPrintModal && savedDoc && (
            <PrintViewModal doc={savedDoc} onClose={() => { setShowPrintModal(false); navigate('/documents'); }} />
         )}

         {additionalChargeModal && (
            <div className="so-modal-overlay">
               <div className="so-modal-card">
                  <div className="so-modal-header">
                     <h3>Add Additional Charge</h3>
                     <X className="pointer" onClick={() => setAdditionalChargeModal(false)} />
                  </div>
                  <div className="so-modal-body">
                     <div className="form-group mb-4">
                        <label className="so-label">Charge Name</label>
                        <input className="so-input" value={doc.additionalChargeName} onChange={e => setDoc({ ...doc, additionalChargeName: e.target.value })} />
                     </div>
                     <div className="form-group mb-4">
                        <label className="so-label">Amount</label>
                        <input type="number" className="so-input" value={doc.additionalCharge} onChange={e => setDoc({ ...doc, additionalCharge: e.target.value })} />
                     </div>
                     <button className="so-btn-save w-full" onClick={() => setAdditionalChargeModal(false)}>Apply Charge</button>
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
         <ContactModal
            isOpen={showContactModal}
            onClose={() => setShowContactModal(false)}
            onSave={handleContactSaved}
         />
      </div>
   );
};

export default SaleOrder;
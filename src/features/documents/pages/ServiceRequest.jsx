import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getItems, addItem, updateItem, logActivity } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import PrintViewModal from '@/components/ui/PrintViewModal';
import { 
  ArrowLeft, Trash2, Printer, Save, Plus, MoreVertical, 
  RotateCcw, Wrench
} from 'lucide-react';
import ProductModal from '@/features/products/components/ProductModal';
import ContactModal from '@/features/contacts/components/ContactModal';
import {
  getNextDocumentNumber,
  isDocumentNumberTaken,
  handleProductRowSelection,
  filterValidItems
} from '@/utils/documentUtils';
import '@/features/documents/styles/ServiceRequest.css';
import '@/features/products/styles/product-table.css';

// ─── Constants ───────────────────────────────────────────────────────────────
const SERVICE_TYPES = [
  'Standard Service',
  'Warranty Service',
  'AMC / Annual Maintenance',
  'Repair & Troubleshooting',
  'Installation & Setup',
  'Preventive Maintenance',
  'Inspection & Testing',
  'Consulting & Support'
];

const DELIVERY_MODES = [
  'Select Delivery Mode',
  'Direct Service / On-Site',
  'Hand Delivery / Carry-In',
  'Courier',
  'Self Pickup',
  'Transport',
  'Remote / Online Support'
];

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
  productId: '',
  name: '',
  hsn: '9987',
  quantity: 1,
  unit: 'NOS',
  rate: 0,
  taxRate: 18,
  amount: 0,
  taxAmount: 0,
  note: '',
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
    return conv(Math.floor(n / 10000000)) + 'CRORE ' + conv(n % 10000000);
  };
  return (conv(Math.floor(num)) + 'RUPEES ONLY').trim();
}

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

const ServiceRequest = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [products, setProducts] = useState([]);
  const [banks, setBanks] = useState([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [savedDoc, setSavedDoc] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [activeItemIdx, setActiveItemIdx] = useState(null);
  const [showAdditionalChargeInput, setShowAdditionalChargeInput] = useState(false);

  const [doc, setDoc] = useState({
    docType: 'Service Request',
    docPrefix: 'SR-',
    docPostfix: '',
    customerId: '',
    customerInfo: {
      ms: '',
      address: '',
      contactPerson: '',
      phoneNo: '',
      gstinPan: '',
      revCharge: 'No',
      shipTo: '--',
      placeOfSupply: 'Madhya Pradesh',
      distance: '',
    },
    srDetail: {
      type: 'Standard Service',
      srNo: '1',
      date: todayIso(),
      challanNo: '',
      challanDate: '',
      deliveryMode: 'Select Delivery Mode',
    },
    items: [BLANK_ITEM()],
    bank: 'CANARA BANK (0132)',
    completionDate: todayIso(),
    terms: [
      { title: 'Payment', detail: '100% upon completion of service and inspection.' },
      { title: 'Warranty', detail: '30 days service warranty on replaced parts and workmanship.' },
      { title: 'Jurisdiction', detail: 'Subject to our home Jurisdiction.' }
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
      const [clist, plist, blist] = await Promise.all([
        getItems('contacts', user.id),
        getItems('products', user.id),
        getItems('banks', user.id)
      ]);
      setContacts(clist || []);
      setProducts(plist || []);
      
      const formattedBanks = (blist && blist.length > 0)
        ? blist.map(b => `${b.bankName || 'BANK'} (${b.accountNumber ? b.accountNumber.slice(-4) : '0000'})`)
        : ['CANARA BANK (0132)', 'HDFC BANK (4421)', 'SBI (8819)', 'CASH'];
      setBanks(formattedBanks);
      if (formattedBanks.length > 0 && !doc.bank) {
        setDoc(prev => ({ ...prev, bank: formattedBanks[0] }));
      }
    } catch (err) {
      console.error('Error loading master data:', err);
    }
  }, [user?.id, doc.bank]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadData();

      if (user?.id) {
        try {
          const docs = await getItems('documents', user.id);

          if (id) {
            const ex = docs.find(d => d._dbId === id || d.id === id || d._id === id);
            if (ex) {
              const loadedItems = ex.items?.length > 0 ? [...ex.items] : [BLANK_ITEM()];
              const last = loadedItems[loadedItems.length - 1];
              if (last && (last.name || last.productId || Number(last.amount) > 0)) {
                loadedItems.push(BLANK_ITEM());
              }
              setDoc({
                ...ex,
                docPrefix: ex.docPrefix !== undefined ? ex.docPrefix : 'SR-',
                docPostfix: ex.docPostfix !== undefined ? ex.docPostfix : '',
                items: loadedItems
              });
              if (Number(ex.additionalCharge) > 0) {
                setShowAdditionalChargeInput(true);
              }
            }
          } else {
            const nextSrNo = getNextDocumentNumber('Service Request', docs);

            const convertedRaw = sessionStorage.getItem('prefill_converted_document');
            if (convertedRaw) {
              try {
                const draft = JSON.parse(convertedRaw);
                sessionStorage.removeItem('prefill_converted_document');
                if (draft.docType === 'Service Request') {
                  const draftItems = draft.items?.length > 0 ? [...draft.items, BLANK_ITEM()] : [BLANK_ITEM()];
                  setDoc(prev => ({
                    ...prev,
                    ...draft,
                    items: draftItems,
                    srDetail: {
                      ...prev.srDetail,
                      ...draft.srDetail,
                      srNo: draft.srDetail?.srNo || nextSrNo
                    }
                  }));
                  setLoading(false);
                  return;
                }
              } catch (e) {
                console.error('Error parsing prefilled conversion draft:', e);
              }
            }

            setDoc(prev => ({
              ...prev,
              srDetail: {
                ...prev.srDetail,
                srNo: nextSrNo
              }
            }));
          }
        } catch (err) {
          console.error('Error initializing Service Request:', err);
        }
      }
      setLoading(false);
    };

    init();
  }, [id, user?.id, loadData]);

  // Recalculate Totals
  useEffect(() => {
    const taxable = doc.items.reduce((a, i) => a + (Number(i.amount) || 0), 0);
    const totalTax = doc.items.reduce((a, i) => a + (Number(i.taxAmount) || 0), 0);
    const totalTaxable = taxable + (Number(doc.additionalCharge) || 0);

    const tcsVal = Number(doc.tcs.value) || 0;
    let tcsAmt = doc.tcs.unit === '%' ? totalTaxable * (tcsVal / 100) : tcsVal;
    if (doc.tcs.mode === '-') tcsAmt = -Math.abs(tcsAmt);
    else tcsAmt = Math.abs(tcsAmt);

    const discVal = Number(doc.discount.value) || 0;
    let discAmt = doc.discount.unit === '%' ? totalTaxable * (discVal / 100) : discVal;
    if (doc.discount.mode === '-') discAmt = -Math.abs(discAmt);
    else discAmt = Math.abs(discAmt);

    const rawTotal = totalTaxable + totalTax + tcsAmt + discAmt;
    const grandTotal = doc.roundOff ? Math.round(rawTotal) : Math.round(rawTotal * 100) / 100;

    setDoc(prev => ({ ...prev, taxable, totalTaxable, totalTax, grandTotal }));
  }, [doc.items, doc.additionalCharge, doc.tcs, doc.discount, doc.roundOff]);

  const handleNested = (category, field, value) => {
    setDoc(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleCustomerChange = (e) => {
    const selectedId = e.target.value;
    const c = contacts.find(x => x.id === selectedId || x._dbId === selectedId);
    if (c) {
      setDoc(prev => ({
        ...prev,
        customerId: selectedId,
        customerInfo: {
          ...prev.customerInfo,
          ms: c.companyName || c.customerName || c.name || '',
          address: c.billing?.address || c.address || '',
          contactPerson: c.contactName || c.customerName || c.name || '',
          phoneNo: c.phone || '',
          gstinPan: c.gstin || c.pan || '',
          placeOfSupply: c.billing?.state || c.state || 'Madhya Pradesh',
          distance: c.billing?.ewayBillDistance || ''
        }
      }));
    } else {
      setDoc(prev => ({ ...prev, customerId: selectedId }));
    }
  };

  const handleContactSaved = async (newContact) => {
    await loadData();
    const cid = newContact.id || newContact._id || newContact._dbId;
    setDoc(prev => ({
      ...prev,
      customerId: cid,
      customerInfo: {
        ...prev.customerInfo,
        ms: newContact.companyName || newContact.customerName || newContact.name || '',
        address: newContact.billing?.address || newContact.address || '',
        contactPerson: newContact.contactName || newContact.customerName || newContact.name || '',
        phoneNo: newContact.phone || '',
        gstinPan: newContact.gstin || newContact.pan || '',
        placeOfSupply: newContact.billing?.state || newContact.state || 'Madhya Pradesh',
        distance: newContact.billing?.ewayBillDistance || ''
      }
    }));
    setShowContactModal(false);
  };

  const handleItemChange = (idx, field, value) => {
    if (field === 'productId') {
      const selectedProduct = products.find(x => x.id === value || x._id === value);
      if (selectedProduct) {
        const updated = handleProductRowSelection(doc.items, selectedProduct, idx, BLANK_ITEM);
        setDoc(prev => ({ ...prev, items: updated }));
        return;
      }
    }

    const items = [...doc.items];
    const item = { ...items[idx] };
    item[field] = value;

    item.amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
    item.taxAmount = item.amount * ((Number(item.taxRate) || 0) / 100);
    items[idx] = item;

    setDoc(prev => ({ ...prev, items }));
  };

  const handleProductSaved = async (newProduct) => {
    await loadData();
    if (activeItemIdx !== null && activeItemIdx < doc.items.length) {
      const updated = handleProductRowSelection(doc.items, newProduct, activeItemIdx, BLANK_ITEM);
      setDoc(prev => ({ ...prev, items: updated }));
    }
    setShowAddProduct(false);
  };

  const addRow = () => {
    setDoc(prev => ({ ...prev, items: [...prev.items, BLANK_ITEM()] }));
  };

  const removeRow = (idx) => {
    if (doc.items.length === 1) return;
    const items = [...doc.items];
    items.splice(idx, 1);
    setDoc(prev => ({ ...prev, items }));
  };

  const resetDetails = () => {
    setDoc(prev => ({
      ...prev,
      docPrefix: 'SR-',
      docPostfix: '',
      srDetail: {
        type: 'Standard Service',
        srNo: '1',
        date: todayIso(),
        challanNo: '',
        challanDate: '',
        deliveryMode: 'Select Delivery Mode',
      }
    }));
  };

  const handleSave = async (print = false) => {
    if (!user?.id) return;

    if (!doc.srDetail.srNo) {
      alert('Please enter Service Request No.');
      return;
    }

    setIsSubmitting(true);
    try {
      const allDocs = await getItems('documents', user.id);

      if (isDocumentNumberTaken('Service Request', doc.srDetail.srNo, allDocs, id)) {
        alert(`Service Request No. "${doc.srDetail.srNo}" is already in use. Please use a unique number.`);
        setIsSubmitting(false);
        return;
      }

      const cleanItems = filterValidItems(doc.items);
      if (cleanItems.length === 0) {
        alert('Please add at least one product with name or quantity.');
        setIsSubmitting(false);
        return;
      }

      const fullNo = `${doc.docPrefix}${doc.srDetail.srNo}${doc.docPostfix}`;
      const finalDoc = {
        ...doc,
        items: cleanItems,
        invoiceNumber: fullNo,
        date: doc.srDetail.date,
        total: doc.grandTotal,
        customerName: doc.customerInfo.ms,
        docType: 'Service Request'
      };

      let result;
      if (id) {
        result = await updateItem('documents', id, finalDoc, user.id);
        logActivity(`Updated Service Request #${fullNo}`, user.id, user.username);
      } else {
        result = await addItem('documents', finalDoc, user.id);
        logActivity(`Created Service Request #${fullNo}`, user.id, user.username);
      }

      if (print) {
        setSavedDoc(result || finalDoc);
        setShowPrintModal(true);
      } else {
        navigate('/documents');
      }
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save Service Request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && user) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        Loading Service Request...
      </div>
    );
  }

  return (
    <div className="sr-page">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="sr-header">
        <div className="sr-header-left">
          <div className="sr-badge">🛠️ Service</div>
          <div>
            <div className="sr-title">Service Request</div>
            <div className="sr-subtitle">
              {id ? `Editing • ${doc.docPrefix}${doc.srDetail.srNo}` : 'Create new service request'}
            </div>
          </div>
        </div>
        <div className="sr-header-actions">
          <button className="sr-btn sr-btn-ghost" onClick={() => navigate('/documents')}>
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </div>

      {/* ── Top Two-Column: Customer Info + Service Request Detail ────── */}
      <div className="sr-top-grid">
        {/* Customer Information */}
        <div className="sr-card">
          <div className="sr-card-header">
            <div className="sr-card-header-left">
              <div className="sr-card-icon vendor">👤</div>
              <div>
                <div className="sr-card-title">Customer Information</div>
                <div className="sr-card-subtitle">Billing & GST Details</div>
              </div>
            </div>
            <button className="sr-menu-btn" title="Options"><MoreVertical size={16} /></button>
          </div>
          <div className="sr-card-body">
            {/* M/S */}
            <div className="sr-field-row">
              <label className="sr-label">M/S.<span className="req">*</span></label>
              <div className="sr-ms-row">
                <select className="sr-select" value={doc.customerId} onChange={handleCustomerChange}>
                  <option value="">-- Choose Customer --</option>
                  {contacts.map(c => (
                    <option key={c.id || c._dbId} value={c.id || c._dbId}>
                      {c.companyName || c.customerName || c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="sr-ms-add-btn"
                  title="Add Customer"
                  onClick={() => setShowContactModal(true)}
                >
                  +
                </button>
              </div>
            </div>

            {/* Address */}
            <div className="sr-field-row align-top">
              <label className="sr-label">Address</label>
              <textarea
                className="sr-textarea"
                rows={3}
                placeholder="Customer address..."
                value={doc.customerInfo.address}
                onChange={e => handleNested('customerInfo', 'address', e.target.value)}
              />
            </div>

            {/* Contact Person */}
            <div className="sr-field-row">
              <label className="sr-label">Contact Person</label>
              <input
                className="sr-input"
                placeholder="Contact Person"
                value={doc.customerInfo.contactPerson}
                onChange={e => handleNested('customerInfo', 'contactPerson', e.target.value)}
              />
            </div>

            {/* Phone No */}
            <div className="sr-field-row">
              <label className="sr-label">Phone No</label>
              <input
                className="sr-input"
                placeholder="Phone No"
                value={doc.customerInfo.phoneNo}
                onChange={e => handleNested('customerInfo', 'phoneNo', e.target.value)}
              />
            </div>

            {/* GSTIN / PAN */}
            <div className="sr-field-row">
              <label className="sr-label">GSTIN / PAN</label>
              <input
                className="sr-input"
                placeholder="GSTIN / PAN"
                value={doc.customerInfo.gstinPan}
                onChange={e => handleNested('customerInfo', 'gstinPan', e.target.value.toUpperCase())}
              />
            </div>

            {/* Rev. Charge */}
            <div className="sr-field-row">
              <label className="sr-label">Rev. Charge</label>
              <select
                className="sr-select"
                value={doc.customerInfo.revCharge}
                onChange={e => handleNested('customerInfo', 'revCharge', e.target.value)}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            {/* Ship To */}
            <div className="sr-field-row">
              <label className="sr-label">Ship To</label>
              <select
                className="sr-select"
                value={doc.customerInfo.shipTo}
                onChange={e => handleNested('customerInfo', 'shipTo', e.target.value)}
              >
                <option value="--">--</option>
                <option value="Same as Billing">Same as Billing</option>
              </select>
            </div>

            {/* Distance */}
            <div className="sr-field-row">
              <label className="sr-label">Distance (km)</label>
              <input
                className="sr-input"
                placeholder="For e-way bill"
                value={doc.customerInfo.distance}
                onChange={e => handleNested('customerInfo', 'distance', e.target.value)}
              />
            </div>

            {/* Place of Supply */}
            <div className="sr-field-row">
              <label className="sr-label">Place of Supply<span className="req">*</span></label>
              <select
                className="sr-select"
                value={doc.customerInfo.placeOfSupply}
                onChange={e => handleNested('customerInfo', 'placeOfSupply', e.target.value)}
              >
                {Object.keys(STATE_CODES).sort().map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Service Request Detail */}
        <div className="sr-card">
          <div className="sr-card-header">
            <div className="sr-card-header-left">
              <div className="sr-card-icon detail">📋</div>
              <div>
                <div className="sr-card-title">Service Request Detail</div>
                <div className="sr-card-subtitle">Document metadata & references</div>
              </div>
            </div>
            <button
              type="button"
              className="sr-reset-btn"
              title="Reset Service Details"
              onClick={resetDetails}
            >
              <RotateCcw size={14} />
            </button>
          </div>
          <div className="sr-card-body">
            {/* Service Type */}
            <div className="sr-field-row">
              <label className="sr-label">Type</label>
              <select
                className="sr-select"
                value={doc.srDetail.type}
                onChange={e => handleNested('srDetail', 'type', e.target.value)}
              >
                {SERVICE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Service Request No. */}
            <div className="sr-field-row">
              <label className="sr-label">Service Request No.<span className="req">*</span></label>
              <div className="sr-no-group">
                <input
                  className="sr-no-input"
                  style={{ width: '10ch', textAlign: 'center' }}
                  value={doc.docPrefix}
                  onChange={e => setDoc({ ...doc, docPrefix: e.target.value })}
                />
                <input
                  className="sr-no-input"
                  style={{ width: '15ch', fontWeight: 700 }}
                  value={doc.srDetail.srNo}
                  onChange={e => handleNested('srDetail', 'srNo', e.target.value)}
                />
                <input
                  className="sr-no-input"
                  style={{ width: '10ch', textAlign: 'center' }}
                  value={doc.docPostfix}
                  onChange={e => setDoc({ ...doc, docPostfix: e.target.value })}
                />
              </div>
            </div>

            {/* Date */}
            <div className="sr-field-row">
              <label className="sr-label">Service Request Date<span className="req">*</span></label>
              <input
                type="date"
                className="sr-input"
                value={doc.srDetail.date}
                onChange={e => handleNested('srDetail', 'date', e.target.value)}
              />
            </div>

            {/* Challan No. */}
            <div className="sr-field-row">
              <label className="sr-label">Challan No.</label>
              <input
                className="sr-input"
                placeholder="Challan No."
                value={doc.srDetail.challanNo}
                onChange={e => handleNested('srDetail', 'challanNo', e.target.value)}
              />
            </div>

            {/* Challan Date */}
            <div className="sr-field-row">
              <label className="sr-label">Challan Date</label>
              <input
                type="date"
                className="sr-input"
                value={doc.srDetail.challanDate}
                onChange={e => handleNested('srDetail', 'challanDate', e.target.value)}
              />
            </div>

            <div className="sr-divider" />

            {/* Delivery */}
            <div className="sr-field-row">
              <label className="sr-label">Delivery</label>
              <select
                className="sr-select"
                value={doc.srDetail.deliveryMode}
                onChange={e => handleNested('srDetail', 'deliveryMode', e.target.value)}
              >
                {DELIVERY_MODES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Product Items Table Card ──────────────────────────────── */}
      <div className="pt-table-card">
        <div className="pt-table-header">
          <div className="si-card-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="si-card-icon items" style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>📦</div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>Product Items</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>{doc.items.length} row(s) active</div>
            </div>
          </div>

          <div className="pt-table-actions">
            <div className="sr-discount-toggle">
              <span className="sr-toggle-label">Discount :</span>
              <span
                className={`sr-toggle-chip ${doc.discount.unit === 'Rs' ? 'active' : ''}`}
                onClick={() => handleNested('discount', 'unit', 'Rs')}
              >
                Rs
              </span>
              <span
                className={`sr-toggle-chip ${doc.discount.unit === '%' ? 'active' : ''}`}
                onClick={() => handleNested('discount', 'unit', '%')}
              >
                %
              </span>
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
                      <select
                        className="pt-cell-select"
                        style={{ flex: 1 }}
                        value={item.productId}
                        onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                      >
                        <option value="">-- Select Product / Service --</option>
                        {products.map(p => (
                          <option key={p.id || p._id || p._dbId} value={p.id || p._id || p._dbId}>
                            {p.name}
                          </option>
                        ))}
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
                    <textarea
                      className="pt-cell-note"
                      placeholder="Item Note..."
                      rows={1}
                      value={item.note}
                      onChange={e => handleItemChange(idx, 'note', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="pt-cell-input"
                      value={item.hsn}
                      onChange={e => handleItemChange(idx, 'hsn', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="pt-cell-input"
                      style={{ textAlign: 'center' }}
                      value={item.quantity}
                      onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="pt-cell-input"
                      style={{ textAlign: 'center' }}
                      value={item.unit}
                      onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="pt-cell-input"
                      style={{ textAlign: 'right' }}
                      value={item.rate}
                      onChange={e => handleItemChange(idx, 'rate', e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      className="pt-cell-select"
                      value={item.taxRate}
                      onChange={e => handleItemChange(idx, 'taxRate', e.target.value)}
                    >
                      {[0, 5, 12, 18, 28].map(r => (
                        <option key={r} value={r}>{r}%</option>
                      ))}
                    </select>
                    <div className="pt-tax-display">₹{item.taxAmount.toFixed(0)}</div>
                  </td>
                  <td>
                    <div className="pt-total-value">
                      {(item.amount + item.taxAmount).toFixed(2)}
                    </div>
                  </td>
                  <td>
                    <button className="pt-remove-btn" onClick={() => removeRow(idx)}>
                      ×
                    </button>
                  </td>
                </tr>
              ))}

              <tr className="pt-total-inv-row">
                <td colSpan={2}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: '#64748b', fontSize: '0.8rem' }}>
                      Total Service Val.
                    </span>
                    <button className="pt-add-item-btn" onClick={addRow}>
                      + Add Row
                    </button>
                  </div>
                </td>
                <td></td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>
                  {doc.items.reduce((a, i) => a + (Number(i.quantity) || 0), 0)}
                </td>
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

      {/* ── Bottom Grid ────────────────────────────────────────────── */}
      <div className="sr-bottom-grid">
        {/* Left: Due Date, Bank, Terms, Remarks */}
        <div className="sr-left-bottom">
          <div className="sr-due-date-row">
            <label className="sr-label">Completion Date</label>
            <input
              type="date"
              className="sr-input yellow-bg"
              value={doc.completionDate}
              onChange={e => setDoc({ ...doc, completionDate: e.target.value })}
            />
          </div>

          <div className="sr-field-row" style={{ marginBottom: '1rem' }}>
            <label className="sr-label">Bank</label>
            <select
              className="sr-select"
              value={doc.bank}
              onChange={e => setDoc({ ...doc, bank: e.target.value })}
            >
              {banks.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="sr-divider" />

          {/* Terms & Conditions */}
          <div className="sr-terms-section">
            <div className="sr-section-title">Terms & Conditions</div>
            {doc.terms.map((term, idx) => (
              <div key={idx} className="sr-terms-row">
                <input
                  className="sr-input"
                  style={{ fontWeight: 600 }}
                  placeholder="Title"
                  value={term.title}
                  onChange={e => {
                    const t = [...doc.terms];
                    t[idx].title = e.target.value;
                    setDoc({ ...doc, terms: t });
                  }}
                />
                <input
                  className="sr-input"
                  placeholder="Detail"
                  value={term.detail}
                  onChange={e => {
                    const t = [...doc.terms];
                    t[idx].detail = e.target.value;
                    setDoc({ ...doc, terms: t });
                  }}
                />
                <button
                  type="button"
                  className="sr-term-remove-btn"
                  onClick={() => {
                    const t = doc.terms.filter((_, i) => i !== idx);
                    setDoc({ ...doc, terms: t });
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              className="sr-add-notes-btn"
              onClick={() => setDoc({ ...doc, terms: [...doc.terms, { title: '', detail: '' }] })}
            >
              <Plus size={14} /> Add Note
            </button>
          </div>

          <div className="sr-divider" />

          {/* Document Note / Remarks */}
          <div className="sr-doc-note-row">
            <div className="sr-doc-note-label">
              <label className="sr-label">Internal Remarks</label>
              <span className="sr-label-italic">Not Visible on Print</span>
            </div>
            <textarea
              className="sr-textarea"
              rows={3}
              placeholder="Staff notes..."
              value={doc.documentNote}
              onChange={e => setDoc({ ...doc, documentNote: e.target.value })}
            />
          </div>
        </div>

        {/* Right: Totals */}
        <div className="sr-right-bottom">
          <div className="sr-totals-row">
            <span className="sr-totals-label">Taxable</span>
            <span className="sr-totals-value">{doc.taxable.toFixed(2)}</span>
          </div>

          {/* Add Additional Charge */}
          <div>
            {!showAdditionalChargeInput ? (
              <div
                className="sr-add-charge-link"
                onClick={() => setShowAdditionalChargeInput(true)}
              >
                + Add Additional Charge
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.4rem', margin: '0.4rem 0' }}>
                <input
                  className="sr-input"
                  style={{ flex: 1 }}
                  placeholder="Charge Name"
                  value={doc.additionalChargeName}
                  onChange={e => setDoc({ ...doc, additionalChargeName: e.target.value })}
                />
                <input
                  type="number"
                  className="sr-input"
                  style={{ width: '100px', textAlign: 'right' }}
                  placeholder="0.00"
                  value={doc.additionalCharge}
                  onChange={e => setDoc({ ...doc, additionalCharge: Number(e.target.value) || 0 })}
                />
              </div>
            )}
          </div>

          <div className="sr-totals-row">
            <span className="sr-totals-label">Total Taxable</span>
            <span className="sr-totals-value">{doc.totalTaxable.toFixed(2)}</span>
          </div>

          <div className="sr-totals-row">
            <span className="sr-totals-label">Total Tax</span>
            <span className="sr-totals-value">{doc.totalTax.toFixed(2)}</span>
          </div>

          {/* Discount */}
          <div className="sr-modifier-row">
            <span className="sr-modifier-label">Discount</span>
            <select
              className="sr-modifier-select"
              value={doc.discount.mode}
              onChange={e => handleNested('discount', 'mode', e.target.value)}
            >
              <option value="-">-</option>
              <option value="+">+</option>
            </select>
            <input
              className="sr-modifier-input"
              type="number"
              value={doc.discount.value}
              onChange={e => handleNested('discount', 'value', e.target.value)}
            />
            <select
              className="sr-modifier-unit"
              value={doc.discount.unit}
              onChange={e => handleNested('discount', 'unit', e.target.value)}
            >
              <option value="Rs">Rs</option>
              <option value="%">%</option>
            </select>
          </div>

          {/* TCS */}
          <div className="sr-modifier-row">
            <span className="sr-modifier-label">TCS</span>
            <select
              className="sr-modifier-select"
              value={doc.tcs.mode}
              onChange={e => handleNested('tcs', 'mode', e.target.value)}
            >
              <option value="+">+</option>
              <option value="-">-</option>
            </select>
            <input
              className="sr-modifier-input"
              type="number"
              value={doc.tcs.value}
              onChange={e => handleNested('tcs', 'value', e.target.value)}
            />
            <select
              className="sr-modifier-unit"
              value={doc.tcs.unit}
              onChange={e => handleNested('tcs', 'unit', e.target.value)}
            >
              <option value="%">%</option>
              <option value="Rs">Rs</option>
            </select>
          </div>

          {/* Round Off */}
          <div className="sr-roundoff-row">
            <div className="sr-roundoff-left">
              <span className="sr-label">Round Off</span>
              <label className="sr-toggle-switch">
                <input
                  type="checkbox"
                  checked={doc.roundOff}
                  onChange={e => setDoc({ ...doc, roundOff: e.target.checked })}
                />
                <span className="sr-toggle-thumb"></span>
              </label>
            </div>
            <span className="sr-totals-value">
              {(doc.grandTotal - (doc.totalTaxable + doc.totalTax)).toFixed(2)}
            </span>
          </div>

          {/* Grand Total */}
          <div className="sr-grand-total">
            <span className="sr-grand-label">Grand Total</span>
            <span className="sr-grand-value">
              ₹ {doc.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Total in Words */}
          <div className="sr-words-row">
            <div className="sr-words-label">Total in words</div>
            <div className="sr-words-value">{numberToWords(doc.grandTotal)}</div>
          </div>

          {/* Smart Suggestion */}
          <div className="sr-smart-box">
            <span className="sr-smart-label">Smart Suggestion</span>
            <button
              type="button"
              className="sr-smart-add"
              onClick={() => {
                const newItems = [...doc.items];
                const clean = newItems.filter(i => i.name || i.productId || i.rate > 0);
                clean.push({
                  productId: '',
                  name: 'Standard Service Labor Charge',
                  hsn: '9987',
                  quantity: 1,
                  unit: 'NOS',
                  rate: 1000,
                  taxRate: 18,
                  amount: 1000,
                  taxAmount: 180,
                  note: 'Standard maintenance and repair service'
                });
                clean.push(BLANK_ITEM());
                setDoc(prev => ({ ...prev, items: clean }));
              }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* ── Action Bar ────────────────────────────────────────────── */}
      <div className="sr-action-bar">
        <div className="sr-action-left">
          <button className="sr-btn sr-btn-ghost" onClick={() => navigate('/documents')}>
            <ArrowLeft size={16} /> Back
          </button>
          <button
            className="sr-btn sr-btn-danger"
            onClick={() => {
              if (window.confirm('Discard changes?')) navigate('/documents');
            }}
          >
            <Trash2 size={16} /> Discard
          </button>
        </div>
        <div className="sr-action-right">
          <button
            className="sr-btn sr-btn-print"
            onClick={() => handleSave(true)}
            disabled={isSubmitting}
          >
            <Printer size={16} /> Save & Print
          </button>
          <button
            className="sr-btn sr-btn-save"
            onClick={() => handleSave(false)}
            disabled={isSubmitting}
          >
            <Save size={16} /> {isSubmitting ? 'Saving...' : 'Save Record'}
          </button>
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <ContactModal
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
          onSave={handleContactSaved}
        />
      )}

      {/* Product Modal */}
      {showAddProduct && (
        <ProductModal
          isOpen={showAddProduct}
          onClose={() => setShowAddProduct(false)}
          onSave={handleProductSaved}
        />
      )}

      {/* Print View Modal */}
      {showPrintModal && savedDoc && (
        <PrintViewModal
          doc={savedDoc}
          onClose={() => {
            setShowPrintModal(false);
            navigate('/documents');
          }}
        />
      )}
    </div>
  );
};

export default ServiceRequest;

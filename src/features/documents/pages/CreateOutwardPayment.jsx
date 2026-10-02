import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getItems, addItem, updateItem, logActivity } from '@/utils/db';
import { postToLedger, getContactBalance } from '@/utils/ledger';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Save, Printer, UploadCloud, X, ArrowUpRight } from 'lucide-react';
import PrintViewModal from '@/components/ui/PrintViewModal';
import '@/features/documents/styles/PaymentPages.css';

// Indian numbering format to words
const toIndianWords = (num) => {
  const n = Math.round(Number(num) || 0);
  if (n <= 0) return '';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanOneThousand = (val) => {
    let s = '';
    if (val >= 100) {
      s += ones[Math.floor(val / 100)] + ' Hundred ';
      val %= 100;
    }
    if (val >= 20) {
      s += tens[Math.floor(val / 10)] + ' ';
      val %= 10;
    }
    if (val > 0) {
      s += ones[val] + ' ';
    }
    return s.trim();
  };

  let str = '';
  const crore = Math.floor(n / 10000000);
  const remCrore = n % 10000000;
  const lakh = Math.floor(remCrore / 100000);
  const remLakh = remCrore % 100000;
  const thousand = Math.floor(remLakh / 1000);
  const remThousand = remLakh % 1000;

  if (crore > 0) str += convertLessThanOneThousand(crore) + ' Crore ';
  if (lakh > 0) str += convertLessThanOneThousand(lakh) + ' Lakh ';
  if (thousand > 0) str += convertLessThanOneThousand(thousand) + ' Thousand ';
  if (remThousand > 0) str += convertLessThanOneThousand(remThousand);

  return str.trim() ? (str.trim() + ' Rupees Only') : '';
};

const CreateOutwardPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const editItem = location.state?.editPayment;
  const isEdit = Boolean(editItem);

  const [contacts, setContacts] = useState([]);
  const [printDoc, setPrintDoc] = useState(null);
  const fileInputRef = useRef(null);
  const [attachmentName, setAttachmentName] = useState(editItem?.attachmentName || '');

  const [formData, setFormData] = useState({
    voucherPrefix: editItem?.voucherPrefix || editItem?.paymentPrefix || 'VP-',
    voucherNumber: editItem?.voucherNumber || editItem?.paymentNumber || '',
    voucherPostfix: editItem?.voucherPostfix || editItem?.paymentPostfix || '',
    date: editItem?.date || new Date().toISOString().split('T')[0],
    vendorName: editItem?.vendorName || editItem?.companyName || '',
    vendorId: editItem?.vendorId || editItem?.contactId || '',
    address: editItem?.address || '',
    gstinPan: editItem?.gstinPan || '',
    totalOutstanding: editItem?.totalOutstanding || '0.00',
    amount: editItem?.amount || '',
    paymentType: editItem?.paymentType || 'Bank Transfer',
    category: editItem?.category || 'Purchase',
    invoiceList: editItem?.invoiceList || '',
    remarks: editItem?.remarks || '',
    status: editItem?.status || 'Paid'
  });

  useEffect(() => {
    const loadInitial = async () => {
      if (!user?.id) return;
      const [contactList, existingPayments] = await Promise.all([
        getItems('contacts', user.id),
        getItems('outwardPayments', user.id).catch(() => [])
      ]);
      const validContacts = contactList.filter(c => (c.name && c.name.trim()) || (c.companyName && c.companyName.trim()));
      setContacts(validContacts);

      // If NOT edit mode and voucherNumber is empty, generate sequential voucher number
      if (!isEdit && !formData.voucherNumber) {
        let maxNum = 0;
        (existingPayments || []).forEach(p => {
          const raw = p.voucherNumber || p.paymentNumber || String(p.fullVoucherNo || p.fullPaymentNo || '').replace(/\D+/g, '');
          const n = parseInt(raw, 10);
          if (!isNaN(n) && n > maxNum && n < 1000000) maxNum = n;
        });
        const nextVoucherNo = String(maxNum + 1);

        // Check if prefill was sent from other views
        const incoming = location.state || {};
        let prefilledName = incoming.vendorName || incoming.companyName || incoming.customerName || '';
        let prefilledId = incoming.vendorId || incoming.contactId || incoming.customerId || '';
        let prefilledAmount = incoming.amount || '';
        let prefilledRemarks = incoming.remarks || '';
        let prefilledAddress = '';
        let prefilledGstin = '';
        let outstanding = '0.00';

        if (prefilledName || prefilledId) {
          const matched = validContacts.find(c => c.id === prefilledId || c.name === prefilledName || c.companyName === prefilledName);
          if (matched) {
            prefilledId = matched.id;
            prefilledName = matched.companyName || matched.name;
            prefilledAddress = matched.address || '';
            prefilledGstin = matched.gstin || matched.panno || '';
            try {
              const bal = await getContactBalance(matched.id, user.id);
              outstanding = bal.balance.toFixed(2);
            } catch(e) {}
          }
        }

        setFormData(prev => ({
          ...prev,
          voucherNumber: nextVoucherNo,
          vendorName: prefilledName || prev.vendorName,
          vendorId: prefilledId || prev.vendorId,
          address: prefilledAddress || prev.address,
          gstinPan: prefilledGstin || prev.gstinPan,
          totalOutstanding: outstanding,
          amount: prefilledAmount || prev.amount,
          remarks: prefilledRemarks || prev.remarks
        }));
      }
    };
    loadInitial();
  }, [user?.id, isEdit]);

  const handleVendorChange = async (e) => {
    const name = e.target.value;
    const selectedContact = contacts.find(c => c.name === name || c.companyName === name);

    if (selectedContact) {
      let balanceStr = '0.00';
      try {
        const balanceInfo = await getContactBalance(selectedContact.id, user.id);
        balanceStr = balanceInfo.balance.toFixed(2);
      } catch (err) {}

      setFormData(prev => ({
        ...prev,
        vendorName: name,
        vendorId: selectedContact.id,
        address: selectedContact.address || '',
        gstinPan: selectedContact.gstin || selectedContact.panno || '',
        totalOutstanding: balanceStr
      }));
    } else {
      setFormData(prev => ({ ...prev, vendorName: name, vendorId: '', totalOutstanding: '0.00' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentName(file.name);
    }
  };

  const handleSave = async (e, shouldPrint = false) => {
    if (e) e.preventDefault();
    if (!user?.id) return;

    if (!formData.vendorName || !formData.amount || !formData.date) {
      alert('Please fill all required fields marked with *');
      return;
    }

    const fullVoucherNo = `${formData.voucherPrefix}${formData.voucherNumber}${formData.voucherPostfix}`;
    const paymentToSave = {
      ...formData,
      fullVoucherNo,
      companyName: formData.vendorName,
      contactId: formData.vendorId,
      attachmentName,
      timestamp: new Date().toISOString()
    };

    if (isEdit) {
      const docId = editItem._dbId || editItem.id;
      const success = await updateItem('outwardPayments', docId, paymentToSave, user.id, user.username);
      if (success) {
        logActivity(`Updated Outward Payment Voucher #${fullVoucherNo}`, user.id, user.username);
        if (shouldPrint) {
          setPrintDoc({ ...paymentToSave, docType: 'Payment Out' });
        } else {
          navigate('/payments/outward');
        }
      }
    } else {
      // Duplicate check for new voucher
      const existingPayments = await getItems('outwardPayments', user.id).catch(() => []);
      const duplicate = (existingPayments || []).some(p => (p.fullVoucherNo === fullVoucherNo || p.fullPaymentNo === fullVoucherNo || String(p.voucherNumber) === String(formData.voucherNumber)));
      if (duplicate) {
        alert(`Voucher No. "${fullVoucherNo}" is already in use! Please choose a unique voucher number.`);
        return;
      }

      const result = await addItem('outwardPayments', paymentToSave, user.id, user.username);
      if (result) {
        if (formData.vendorId) {
          await postToLedger({
            contactId: formData.vendorId,
            contactName: formData.vendorName,
            type: 'dr',
            amount: formData.amount,
            date: formData.date,
            description: `Payment Made (Voucher #${fullVoucherNo})`,
            referenceId: fullVoucherNo,
            docType: 'Payment Out'
          }, user.id);
        }

        logActivity(`Created Outward Payment Voucher #${fullVoucherNo} for ${formData.vendorName}`, user.id, user.username);

        if (shouldPrint) {
          setPrintDoc({ ...paymentToSave, docType: 'Payment Out' });
        } else {
          navigate('/payments/outward');
        }
      }
    }
  };

  const words = toIndianWords(formData.amount);

  return (
    <div className="pl-page">
      <div className="pl-form-card">
        
        {/* Header */}
        <div className="pl-form-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="pl-back-btn" onClick={() => navigate('/payments/outward')}>
              <ArrowLeft size={16} /> Back
            </button>
            <h2 className="pl-form-title">
              {isEdit ? 'Edit Outward Payment' : 'Add Outward Payment'}
            </h2>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave}>
          <div className="pl-form-body">
            
            {/* Voucher Numbering Triplet */}
            <div className="pl-form-group">
              <label className="pl-form-label">Voucher Number <span className="req">*</span></label>
              <div className="pl-triplet">
                <input 
                  type="text" 
                  placeholder="Prefix (VP-)" 
                  value={formData.voucherPrefix} 
                  onChange={e => setFormData({ ...formData, voucherPrefix: e.target.value })} 
                />
                <input 
                  type="text" 
                  required 
                  placeholder="Number" 
                  value={formData.voucherNumber} 
                  onChange={e => setFormData({ ...formData, voucherNumber: e.target.value })} 
                />
                <input 
                  type="text" 
                  placeholder="Postfix" 
                  value={formData.voucherPostfix} 
                  onChange={e => setFormData({ ...formData, voucherPostfix: e.target.value })} 
                />
              </div>
            </div>

            {/* Vendor Selection & Outstanding */}
            <div className="pl-form-grid">
              <div className="pl-form-group">
                <label className="pl-form-label">Vendor / Payee Account <span className="req">*</span></label>
                <select 
                  className="pl-form-input" 
                  required 
                  value={formData.vendorName} 
                  onChange={handleVendorChange}
                >
                  <option value="">Select Vendor Account</option>
                  {contacts.map(c => {
                    const name = c.name || c.companyName || 'Unknown';
                    return <option key={c.id} value={name}>{name}</option>;
                  })}
                </select>
              </div>

              <div className="pl-form-group">
                <label className="pl-form-label">Total Outstanding Balance</label>
                <input 
                  type="text" 
                  className="pl-form-input" 
                  readOnly 
                  value={`₹ ${Number(formData.totalOutstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  style={{ background: '#f8fafc', color: '#e11d48', fontWeight: 700 }}
                />
              </div>
            </div>

            {/* Address & GSTIN */}
            <div className="pl-form-grid">
              <div className="pl-form-group">
                <label className="pl-form-label">Address</label>
                <input 
                  type="text" 
                  className="pl-form-input" 
                  placeholder="Vendor address" 
                  value={formData.address} 
                  onChange={e => setFormData({ ...formData, address: e.target.value })} 
                />
              </div>

              <div className="pl-form-group">
                <label className="pl-form-label">GSTIN / PAN</label>
                <input 
                  type="text" 
                  className="pl-form-input" 
                  placeholder="GSTIN or PAN" 
                  value={formData.gstinPan} 
                  onChange={e => setFormData({ ...formData, gstinPan: e.target.value })} 
                />
              </div>
            </div>

            {/* Category & Date */}
            <div className="pl-form-grid">
              <div className="pl-form-group">
                <label className="pl-form-label">Category <span className="req">*</span></label>
                <select 
                  className="pl-form-input" 
                  required 
                  value={formData.category} 
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="Purchase">Purchase Settlement</option>
                  <option value="Salary">Salary Disbursement</option>
                  <option value="Rent">Rent Payment</option>
                  <option value="Other Expenses">Other Expenses</option>
                </select>
              </div>

              <div className="pl-form-group">
                <label className="pl-form-label">Payment Date <span className="req">*</span></label>
                <input 
                  type="date" 
                  required 
                  className="pl-form-input" 
                  value={formData.date} 
                  onChange={e => setFormData({ ...formData, date: e.target.value })} 
                />
              </div>
            </div>

            {/* Payment Mode */}
            <div className="pl-form-group">
              <label className="pl-form-label">Payment Mode <span className="req">*</span></label>
              <select 
                className="pl-form-input" 
                required 
                value={formData.paymentType} 
                onChange={e => setFormData({ ...formData, paymentType: e.target.value })}
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI / PhonePe / GPay</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Credit Card">Credit Card</option>
              </select>
            </div>

            {/* Amount & In Words */}
            <div className="pl-form-group">
              <label className="pl-form-label">Payment Amount (₹) <span className="req">*</span></label>
              <input 
                type="number" 
                step="any" 
                required 
                placeholder="0.00" 
                className="pl-form-input" 
                style={{ fontSize: '1.1rem', fontWeight: 800, color: '#e11d48' }} 
                value={formData.amount} 
                onChange={e => setFormData({ ...formData, amount: e.target.value })} 
              />
              {words && (
                <div className="pl-words-preview outward">
                  {words}
                </div>
              )}
            </div>

            {/* Reference Bill / Invoice */}
            <div className="pl-form-group">
              <label className="pl-form-label">Bill / Purchase Order Reference (Optional)</label>
              <input 
                type="text" 
                className="pl-form-input" 
                placeholder="e.g. BILL-402, PO-102" 
                value={formData.invoiceList} 
                onChange={e => setFormData({ ...formData, invoiceList: e.target.value })} 
              />
            </div>

            {/* Remarks */}
            <div className="pl-form-group">
              <label className="pl-form-label">Remarks / Description</label>
              <textarea 
                className="pl-form-input" 
                rows="2" 
                placeholder="Payment purpose or transaction notes..." 
                value={formData.remarks} 
                onChange={e => setFormData({ ...formData, remarks: e.target.value })}
              ></textarea>
            </div>

            {/* Attachment */}
            <div className="pl-form-group">
              <label className="pl-form-label">Attachment (Voucher / Bank Slip / Proof)</label>
              <div className="pl-upload-box" onClick={() => fileInputRef.current?.click()}>
                <UploadCloud size={24} style={{ display: 'block', margin: '0 auto 6px', color: '#94a3b8' }} />
                <span>Click to attach document or image (Max 5MB)</span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange} 
                />
              </div>
              {attachmentName && (
                <div>
                  <span className="pl-file-tag">
                    {attachmentName}
                    <X size={14} style={{ cursor: 'pointer' }} onClick={() => setAttachmentName('')} />
                  </span>
                </div>
              )}
            </div>

          </div>

          {/* Footer Actions */}
          <div className="pl-form-footer">
            <button type="button" className="pl-btn-cancel" onClick={() => navigate('/payments/outward')}>
              Cancel
            </button>
            <button type="button" className="pl-btn-print" onClick={(e) => handleSave(e, true)}>
              <Printer size={16} /> Save & Print
            </button>
            <button type="submit" className="pl-btn-primary outward">
              <Save size={16} /> {isEdit ? 'Update Payment' : 'Save Payment'}
            </button>
          </div>
        </form>

      </div>

      {printDoc && (
        <PrintViewModal 
          doc={printDoc} 
          onClose={() => navigate('/payments/outward')} 
        />
      )}
    </div>
  );
};

export default CreateOutwardPayment;

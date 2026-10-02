import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getItems, addItem, updateItem, logActivity } from '@/utils/db';
import { postToLedger, getContactBalance } from '@/utils/ledger';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Save, Printer, UploadCloud, X, ArrowDownLeft } from 'lucide-react';
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

const CreateInwardPayment = () => {
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
    receiptPrefix: editItem?.receiptPrefix || 'RP-',
    receiptNumber: editItem?.receiptNumber || '',
    receiptPostfix: editItem?.receiptPostfix || '',
    date: editItem?.date || new Date().toISOString().split('T')[0],
    customerName: editItem?.customerName || '',
    customerId: editItem?.customerId || '',
    address: editItem?.address || '',
    gstinPan: editItem?.gstinPan || '',
    totalOutstanding: editItem?.totalOutstanding || '0.00',
    amount: editItem?.amount || '',
    paymentType: editItem?.paymentType || 'Bank Transfer',
    invoiceList: editItem?.invoiceList || '',
    remarks: editItem?.remarks || '',
    status: editItem?.status || 'Received'
  });

  useEffect(() => {
    const loadInitial = async () => {
      if (!user?.id) return;
      const [contactList, existingPayments] = await Promise.all([
        getItems('contacts', user.id),
        getItems('inwardPayments', user.id).catch(() => [])
      ]);
      const validContacts = contactList.filter(c => (c.name && c.name.trim()) || (c.companyName && c.companyName.trim()));
      setContacts(validContacts);

      // If NOT edit mode and receiptNumber is empty, generate sequential receipt number
      if (!isEdit && !formData.receiptNumber) {
        let maxNum = 0;
        (existingPayments || []).forEach(p => {
          const raw = p.receiptNumber || String(p.fullReceiptNo || '').replace(/\D+/g, '');
          const n = parseInt(raw, 10);
          if (!isNaN(n) && n > maxNum && n < 1000000) maxNum = n;
        });
        const nextReceiptNo = String(maxNum + 1);

        // Check if prefill was sent from other views
        const incoming = location.state || {};
        let prefilledName = incoming.customerName || '';
        let prefilledId = incoming.customerId || '';
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
          receiptNumber: nextReceiptNo,
          customerName: prefilledName || prev.customerName,
          customerId: prefilledId || prev.customerId,
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

  const handleCustomerChange = async (e) => {
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
        customerName: name,
        customerId: selectedContact.id,
        address: selectedContact.address || '',
        gstinPan: selectedContact.gstin || selectedContact.panno || '',
        totalOutstanding: balanceStr
      }));
    } else {
      setFormData(prev => ({ ...prev, customerName: name, customerId: '', totalOutstanding: '0.00' }));
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

    if (!formData.customerName || !formData.amount || !formData.date) {
      alert('Please fill all required fields marked with *');
      return;
    }

    const fullReceiptNo = `${formData.receiptPrefix}${formData.receiptNumber}${formData.receiptPostfix}`;
    const paymentToSave = {
      ...formData,
      fullReceiptNo,
      attachmentName,
      timestamp: new Date().toISOString()
    };

    if (isEdit) {
      const docId = editItem._dbId || editItem.id;
      const success = await updateItem('inwardPayments', docId, paymentToSave, user.id, user.username);
      if (success) {
        logActivity(`Updated Inward Payment Receipt #${fullReceiptNo}`, user.id, user.username);
        if (shouldPrint) {
          setPrintDoc({ ...paymentToSave, docType: 'Payment In' });
        } else {
          navigate('/payments/inward');
        }
      }
    } else {
      // Duplicate check for new receipt
      const existingPayments = await getItems('inwardPayments', user.id).catch(() => []);
      const duplicate = (existingPayments || []).some(p => p.fullReceiptNo === fullReceiptNo || String(p.receiptNumber) === String(formData.receiptNumber));
      if (duplicate) {
        alert(`Receipt No. "${fullReceiptNo}" is already used! Please choose a unique receipt number.`);
        return;
      }

      const result = await addItem('inwardPayments', paymentToSave, user.id, user.username);
      if (result) {
        if (formData.customerId) {
          await postToLedger({
            contactId: formData.customerId,
            contactName: formData.customerName,
            type: 'cr',
            amount: formData.amount,
            date: formData.date,
            description: `Payment Received (Receipt #${fullReceiptNo})`,
            referenceId: fullReceiptNo,
            docType: 'Payment In'
          }, user.id);
        }

        logActivity(`Created Inward Payment Receipt #${fullReceiptNo} for ${formData.customerName}`, user.id, user.username);
        
        if (shouldPrint) {
          setPrintDoc({ ...paymentToSave, docType: 'Payment In' });
        } else {
          navigate('/payments/inward');
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
            <button className="pl-back-btn" onClick={() => navigate('/payments/inward')}>
              <ArrowLeft size={16} /> Back
            </button>
            <h2 className="pl-form-title">
              {isEdit ? 'Edit Inward Payment' : 'Add Inward Payment'}
            </h2>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave}>
          <div className="pl-form-body">
            
            {/* Receipt Numbering Triplet */}
            <div className="pl-form-group">
              <label className="pl-form-label">Receipt Number <span className="req">*</span></label>
              <div className="pl-triplet">
                <input 
                  type="text" 
                  placeholder="Prefix (RP-)" 
                  value={formData.receiptPrefix} 
                  onChange={e => setFormData({ ...formData, receiptPrefix: e.target.value })} 
                />
                <input 
                  type="text" 
                  required 
                  placeholder="Number" 
                  value={formData.receiptNumber} 
                  onChange={e => setFormData({ ...formData, receiptNumber: e.target.value })} 
                />
                <input 
                  type="text" 
                  placeholder="Postfix" 
                  value={formData.receiptPostfix} 
                  onChange={e => setFormData({ ...formData, receiptPostfix: e.target.value })} 
                />
              </div>
            </div>

            {/* Customer Selection & Outstanding */}
            <div className="pl-form-grid">
              <div className="pl-form-group">
                <label className="pl-form-label">Customer / Account Name <span className="req">*</span></label>
                <select 
                  className="pl-form-input" 
                  required 
                  value={formData.customerName} 
                  onChange={handleCustomerChange}
                >
                  <option value="">Select Customer Account</option>
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
                  style={{ background: '#f8fafc', color: '#059669', fontWeight: 700 }}
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
                  placeholder="Customer address" 
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

            {/* Date & Payment Mode */}
            <div className="pl-form-grid">
              <div className="pl-form-group">
                <label className="pl-form-label">Receipt Date <span className="req">*</span></label>
                <input 
                  type="date" 
                  required 
                  className="pl-form-input" 
                  value={formData.date} 
                  onChange={e => setFormData({ ...formData, date: e.target.value })} 
                />
              </div>

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
            </div>

            {/* Amount & In Words */}
            <div className="pl-form-group">
              <label className="pl-form-label">Received Amount (₹) <span className="req">*</span></label>
              <input 
                type="number" 
                step="any" 
                required 
                placeholder="0.00" 
                className="pl-form-input" 
                style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669' }} 
                value={formData.amount} 
                onChange={e => setFormData({ ...formData, amount: e.target.value })} 
              />
              {words && (
                <div className="pl-words-preview">
                  {words}
                </div>
              )}
            </div>

            {/* Bill / Invoice Reference */}
            <div className="pl-form-group">
              <label className="pl-form-label">Invoice / Bill Reference (Optional)</label>
              <input 
                type="text" 
                className="pl-form-input" 
                placeholder="e.g. INV-1001, INV-1002" 
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
                placeholder="Payment notes or transaction details..." 
                value={formData.remarks} 
                onChange={e => setFormData({ ...formData, remarks: e.target.value })}
              ></textarea>
            </div>

            {/* Attachment */}
            <div className="pl-form-group">
              <label className="pl-form-label">Attachment (Receipt / Check Slip / Proof)</label>
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
            <button type="button" className="pl-btn-cancel" onClick={() => navigate('/payments/inward')}>
              Cancel
            </button>
            <button type="button" className="pl-btn-print" onClick={(e) => handleSave(e, true)}>
              <Printer size={16} /> Save & Print
            </button>
            <button type="submit" className="pl-btn-primary inward">
              <Save size={16} /> {isEdit ? 'Update Payment' : 'Save Payment'}
            </button>
          </div>
        </form>

      </div>

      {printDoc && (
        <PrintViewModal 
          doc={printDoc} 
          onClose={() => navigate('/payments/inward')} 
        />
      )}
    </div>
  );
};

export default CreateInwardPayment;

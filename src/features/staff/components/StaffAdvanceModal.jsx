import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowDownLeft, ArrowUpRight, DollarSign, Calendar, FileText, CheckCircle, Wallet, ShieldAlert } from 'lucide-react';
import { addItem, logActivity } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';

const StaffAdvanceModal = ({ isOpen, onClose, staffList = [], defaultStaffId = null, onSaved }) => {
  const { user } = useAuth();

  const [staffId, setStaffId] = useState(defaultStaffId || '');
  const [transactionType, setTransactionType] = useState('you_gave'); // 'you_gave' (Advance/Loan/Fine) or 'you_got' (Bonus/Repayment)
  const [category, setCategory] = useState('Cash Advance');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  // Optional EMI loan fields
  const [isLoan, setIsLoan] = useState(false);
  const [monthlyEmi, setMonthlyEmi] = useState('');
  const [tenureMonths, setTenureMonths] = useState('6');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (defaultStaffId) {
      setStaffId(defaultStaffId);
    } else if (staffList.length > 0 && !staffId) {
      setStaffId(staffList[0]._dbId || staffList[0].id);
    }
  }, [defaultStaffId, staffList, staffId]);

  useEffect(() => {
    if (transactionType === 'you_gave') {
      setCategory('Cash Advance');
    } else {
      setCategory('Performance Bonus');
    }
  }, [transactionType]);

  // Auto calculate monthly EMI when loan is enabled
  useEffect(() => {
    if (isLoan && amount && tenureMonths) {
      const emi = Math.round(Number(amount) / (Number(tenureMonths) || 1));
      setMonthlyEmi(emi.toString());
    }
  }, [isLoan, amount, tenureMonths]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!staffId) return alert('Please select a staff member.');
    if (!amount || Number(amount) <= 0) return alert('Please enter a valid amount.');

    setSubmitting(true);
    const targetStaff = staffList.find(s => (s._dbId === staffId || s.id === staffId));
    const staffName = targetStaff ? targetStaff.name : 'Staff';

    const payload = {
      staffId: staffId,
      staffName: staffName,
      type: transactionType, // 'you_gave' or 'you_got'
      category: category,
      amount: Number(amount),
      date: date,
      paymentMode: paymentMode,
      notes: notes,
      receiptNo: `KHATA-${Date.now().toString().slice(-6)}`,
      isLoan: isLoan,
      loanDetails: isLoan ? {
        originalAmount: Number(amount),
        monthlyEmi: Number(monthlyEmi),
        tenureMonths: Number(tenureMonths),
        remainingBalance: Number(amount),
        status: 'active'
      } : null,
      createdAt: new Date().toISOString()
    };

    try {
      await addItem('staff_ledger', payload, user.id, user.firstName);
      await logActivity(
        `Recorded Pagar Khata entry: ${transactionType === 'you_gave' ? 'You Gave' : 'You Got'} ₹${Number(amount).toLocaleString('en-IN')} (${category}) for ${staffName}`,
        user.id,
        user.firstName
      );

      alert(`Pagar Khata ledger entry saved for ${staffName}!`);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save ledger transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div 
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)',
        backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'white', borderRadius: '24px', maxWidth: '540px', width: '100%',
          overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0', animation: 'scaleUp 0.2s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafbfc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: transactionType === 'you_gave' ? '#fff1f2' : '#ecfdf5',
              color: transactionType === 'you_gave' ? '#e11d48' : '#059669',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {transactionType === 'you_gave' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                {transactionType === 'you_gave' ? 'You Gave (Advance / Loan / Fine)' : 'You Got (Bonus / Repayment)'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Pagar Khata Staff Ledger Transaction</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="staff-modal-scroll" style={{ padding: '1.5rem 1.75rem', maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Dual-Tone Mode Toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setTransactionType('you_gave')}
              style={{
                padding: '0.75rem', borderRadius: '12px', fontWeight: 800, fontSize: '0.88rem',
                border: transactionType === 'you_gave' ? '2px solid #f43f5e' : '1px solid #e2e8f0',
                background: transactionType === 'you_gave' ? '#fff1f2' : '#ffffff',
                color: transactionType === 'you_gave' ? '#e11d48' : '#64748b', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
              }}
            >
              <ArrowDownLeft size={17} /> You Gave (आपने दिए)
            </button>

            <button
              type="button"
              onClick={() => setTransactionType('you_got')}
              style={{
                padding: '0.75rem', borderRadius: '12px', fontWeight: 800, fontSize: '0.88rem',
                border: transactionType === 'you_got' ? '2px solid #10b981' : '1px solid #e2e8f0',
                background: transactionType === 'you_got' ? '#ecfdf5' : '#ffffff',
                color: transactionType === 'you_got' ? '#059669' : '#64748b', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
              }}
            >
              <ArrowUpRight size={17} /> You Got (आपको मिले)
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.15rem' }}>
            {/* Staff Member */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Employee *</label>
              <select
                value={staffId}
                onChange={e => setStaffId(e.target.value)}
                required
                style={{ width: '100%', padding: '0.7rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}
              >
                {staffList.map(s => (
                  <option key={s._dbId || s.id} value={s._dbId || s.id}>
                    {s.name} ({s.designation || 'Staff'} • {s.department || 'General'})
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Category *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{ width: '100%', padding: '0.7rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.85rem' }}
              >
                {transactionType === 'you_gave' ? (
                  <>
                    <option value="Cash Advance">Cash Advance (Mid-Month)</option>
                    <option value="Emergency Loan">Personal / Emergency Loan</option>
                    <option value="Damage Deduction">Damage / Material Loss</option>
                    <option value="Discipline Fine">Discipline / Late Fine</option>
                    <option value="Equipment Purchase">Tools / Equipment Given</option>
                  </>
                ) : (
                  <>
                    <option value="Performance Bonus">Performance Bonus</option>
                    <option value="Diwali / Festive Bonus">Diwali / Festive Gift</option>
                    <option value="Overtime Credit">Overtime Credit (Direct)</option>
                    <option value="Cash Repayment">Cash Repayment by Staff</option>
                    <option value="Incentive">Sales / Target Incentive</option>
                  </>
                )}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Amount (₹) *</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '12px', fontWeight: 700, color: '#94a3b8' }}>₹</span>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.7rem 0.85rem 0.7rem 2rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.85rem' }}
              />
            </div>

            {/* Payment Mode */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Payment Mode</label>
              <select
                value={paymentMode}
                onChange={e => setPaymentMode(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.85rem' }}
              >
                <option value="Cash">Cash in Hand</option>
                <option value="UPI / Online">Direct UPI / GPay</option>
                <option value="Bank Transfer">Bank Transfer (NEFT)</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            {/* Loan EMI Schedule Toggle (Only for You Gave) */}
            {transactionType === 'you_gave' && (
              <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                  <input
                    type="checkbox"
                    checked={isLoan}
                    onChange={e => setIsLoan(e.target.checked)}
                  />
                  <span>Convert into Multi-Month Loan with Monthly EMI Auto-Deduction</span>
                </label>

                {isLoan && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>Tenure (Months)</label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={tenureMonths}
                        onChange={e => setTenureMonths(e.target.value)}
                        style={{ width: '100%', padding: '0.55rem', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>Monthly EMI (₹)</label>
                      <input
                        type="number"
                        value={monthlyEmi}
                        onChange={e => setMonthlyEmi(e.target.value)}
                        style={{ width: '100%', padding: '0.55rem', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Remarks / Reason</label>
              <input
                type="text"
                placeholder="e.g. Medical emergency advance, repaid on salary day"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: '1.5rem', width: '100%', padding: '0.85rem', borderRadius: '12px',
              background: transactionType === 'you_gave' ? 'linear-gradient(135deg, #f43f5e, #e11d48)' : 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white', fontWeight: 800, fontSize: '0.95rem',
              border: 'none', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              boxShadow: transactionType === 'you_gave' ? '0 4px 14px rgba(244, 63, 94, 0.3)' : '0 4px 14px rgba(16, 185, 129, 0.3)'
            }}
          >
            <CheckCircle size={18} />
            {submitting ? 'Saving...' : `Save ₹${Number(amount || 0).toLocaleString('en-IN')} to Pagar Khata`}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default StaffAdvanceModal;

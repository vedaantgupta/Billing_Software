import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { addItem, getItems, updateItem, logActivity } from '@/utils/db';
import { 
  ArrowLeft, Wallet, CheckCircle, PlusCircle, MinusCircle, FileText,
  CalendarCheck, QrCode, ArrowDownLeft, ShieldCheck, DollarSign
} from 'lucide-react';
import '@/features/staff/styles/RecordStaffPayment.css';

const getInitials = (name = '') => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

const RecordStaffPayment = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [submitting, setSubmitting] = useState(false);
  const [pendingAdvance, setPendingAdvance] = useState(0);
  const [showUpiModal, setShowUpiModal] = useState(false);

  // Core properties from previous page via state
  const staffMember = location.state?.staffMember;
  const month = location.state?.month || '';
  const year = location.state?.year || new Date().getFullYear();
  const baseSalary = location.state?.baseSalary || 0;
  const initCalcSalary = location.state?.calculatedSalary || 0;
  const absences = location.state?.absences || 0;
  const paidLeaves = location.state?.paidLeaves || 0;
  const halfDays = location.state?.halfDays || 0;
  const attendanceDays = location.state?.attendanceDays || 30;

  // New Adjustable Variables State
  const [editableBase, setEditableBase] = useState(Math.round(Number(initCalcSalary)));
  const [paymentCategory, setPaymentCategory] = useState('Full Month');
  const [overtime, setOvertime] = useState('');
  const [bonus, setBonus] = useState('');
  const [tds, setTds] = useState('');
  const [pf, setPf] = useState('');
  const [esi, setEsi] = useState('');
  const [advanceRecovery, setAdvanceRecovery] = useState('');
  const [fines, setFines] = useState('');
  
  const [paymentMode, setPaymentMode] = useState(staffMember?.bankName ? 'Bank Transfer' : 'Cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [remarks, setRemarks] = useState('');

  // Safeguard if accessed directly without state routing
  useEffect(() => {
    if (!staffMember) {
      alert('Please process payments from the attendance & payroll dashboard.');
      navigate(`/staff/account/${id}`);
    }
  }, [staffMember, navigate, id]);

  // Fetch pending advance balance from staff_ledger
  useEffect(() => {
    if (!user?.id || !staffMember) return;
    const fetchLedger = async () => {
      try {
        const mId = staffMember._dbId || staffMember.id;
        const ledger = await getItems('staff_ledger', user.id);
        let gave = 0;
        let got = 0;
        ledger.filter(l => l.staffId === mId).forEach(item => {
          const a = Number(item.amount) || 0;
          if (item.type === 'you_gave') gave += a;
          else if (item.type === 'you_got') got += a;
        });
        const bal = Math.max(0, gave - got);
        setPendingAdvance(bal);
      } catch (e) {
        console.error('Failed to fetch staff ledger advance:', e);
      }
    };
    fetchLedger();
  }, [user?.id, staffMember]);

  if (!staffMember) return null;

  // Real-time Net Payable calculation
  const currentBase = Number(editableBase) || 0;
  const ot = Number(overtime) || 0;
  const bns = Number(bonus) || 0;
  const tax = Number(tds) || 0;
  const pfAmount = Number(pf) || 0;
  const esiAmount = Number(esi) || 0;
  const adv = Number(advanceRecovery) || 0;
  const fineAmt = Number(fines) || 0;

  const totalEarnings = currentBase + ot + bns;
  const totalDeductions = tax + pfAmount + esiAmount + adv + fineAmt;
  const netPayable = Math.max(0, totalEarnings - totalDeductions);

  const handleApplyFullAdvance = () => {
    const deductAmt = Math.min(pendingAdvance, totalEarnings - (tax + pfAmount + esiAmount));
    setAdvanceRecovery(Math.max(0, deductAmt));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const mId = staffMember._dbId || staffMember.id;

    const paymentData = {
      staffId: mId,
      staffName: staffMember.name,
      month: month,
      year: year,
      paymentCategory: paymentCategory,
      baseSalary: baseSalary,
      earnedBase: currentBase,
      overtime: ot,
      bonus: bns,
      tds: tax,
      pf: pfAmount,
      esi: esiAmount,
      advanceRecovery: adv,
      fines: fineAmt,
      netSalary: netPayable,
      paymentMode: paymentMode,
      paymentRef: paymentRef,
      remarks: remarks,
      absences: absences,
      halfDays: halfDays,
      paidLeaves: paidLeaves,
      attendanceDays: attendanceDays,
      dateOfPayment: new Date().toISOString(),
      status: 'paid'
    };

    try {
      // 1. Add record to salary_history
      await addItem('salary_history', paymentData, user.id, user.firstName);

      // 2. If advance was recovered, sync an offsetting credit entry in staff_ledger
      if (adv > 0) {
        await addItem('staff_ledger', {
          staffId: mId,
          type: 'you_got',
          amount: adv,
          category: 'Salary Advance Auto-Recovery',
          date: new Date().toISOString().split('T')[0],
          paymentMode: paymentMode,
          notes: `Auto-deducted from ${month} ${year} salary settlement`,
          receiptNo: `REC-SAL-${Date.now().toString().slice(-6)}`
        }, user.id, user.firstName);
      }

      await logActivity(`Disbursed salary ₹${netPayable.toLocaleString('en-IN')} for ${staffMember.name} (${month} ${year})`, user.id, user.firstName);

      alert(`Payment of ₹${netPayable.toLocaleString('en-IN')} recorded successfully!`);
      navigate(`/staff/salary-history/${id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to record payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rsp-page">
      {/* Top Header */}
      <div className="rsp-header">
        <button className="rsp-back-btn" onClick={() => navigate(`/staff/account/${id}`)} title="Back">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="rsp-title">Record Salary Settlement</h1>
          <div className="rsp-subtitle">Pagar Khata Payroll Engine • Transparent Wage Disbursement</div>
        </div>
      </div>

      <div className="rsp-container">
        {/* Profile & Period Summary Card */}
        <div className="rsp-summary-card">
          <div className="rsp-profile-info">
            <div className="rsp-avatar">{getInitials(staffMember.name)}</div>
            <div>
              <h2 className="rsp-name">{staffMember.name}</h2>
              <div className="rsp-role">
                {staffMember.designation || 'Staff'} • {staffMember.department || 'Operations'} • {staffMember.wageType?.toUpperCase() || 'MONTHLY'}
              </div>
            </div>
          </div>

          <div className="rsp-period">
            <div className="rsp-period-label">Payout Period</div>
            <div className="rsp-period-value">{month} {year}</div>
          </div>
        </div>

        {/* Pending Advance Alert if any */}
        {pendingAdvance > 0 && (
          <div style={{
            background: '#fffbeb', border: '1.5px solid #fef08a', borderRadius: '16px',
            padding: '1.25rem 1.5rem', marginBottom: '1.75rem', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowDownLeft size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, color: '#92400e', fontSize: '0.95rem' }}>
                  Pending Advance (Udhaar): ₹{pendingAdvance.toLocaleString('en-IN')}
                </div>
                <div style={{ color: '#b45309', fontSize: '0.8rem' }}>
                  This staff member has unpaid cash advances extended previously.
                </div>
              </div>
            </div>

            <button 
              type="button"
              className="rsp-auto-btn"
              onClick={handleApplyFullAdvance}
              style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', background: '#fef3c7', borderColor: '#fde68a', color: '#b45309' }}
            >
              1-Click Deduct Advance (₹{Math.min(pendingAdvance, totalEarnings).toLocaleString('en-IN')})
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* SECTION 1: Base Earnings */}
          <div className="rsp-section">
            <div className="rsp-section-title">
              <div className="rsp-section-icon earnings">
                <PlusCircle size={18} />
              </div>
              Base Earnings & Allowances
            </div>

            <div className="rsp-grid">
              <div className="rsp-field">
                <label className="rsp-label">Earned Base Salary (₹)</label>
                <div className="rsp-input-group">
                  <span className="rsp-input-prefix">₹</span>
                  <input
                    type="number"
                    className="rsp-input with-prefix"
                    value={editableBase}
                    onChange={(e) => setEditableBase(e.target.value)}
                    required
                  />
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Base wage adjusted for {absences} unpaid absents & {halfDays || 0} half days
                </span>
              </div>

              <div className="rsp-field">
                <label className="rsp-label">Payment Category</label>
                <select
                  className="rsp-input"
                  value={paymentCategory}
                  onChange={(e) => setPaymentCategory(e.target.value)}
                >
                  <option value="Full Month">Full Month Salary</option>
                  <option value="Partial / Advance">Partial / Advance Settlement</option>
                  <option value="Final Settlement">Final Exit Settlement</option>
                </select>
              </div>

              <div className="rsp-field">
                <label className="rsp-label">Overtime Pay (OT)</label>
                <div className="rsp-input-group">
                  <span className="rsp-input-prefix">₹</span>
                  <input
                    type="number"
                    className="rsp-input with-prefix"
                    placeholder="0"
                    value={overtime}
                    onChange={(e) => setOvertime(e.target.value)}
                  />
                </div>
              </div>

              <div className="rsp-field">
                <label className="rsp-label">Bonus & Incentives</label>
                <div className="rsp-input-group">
                  <span className="rsp-input-prefix">₹</span>
                  <input
                    type="number"
                    className="rsp-input with-prefix"
                    placeholder="0"
                    value={bonus}
                    onChange={(e) => setBonus(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Deductions & Udhaar Recovery */}
          <div className="rsp-section">
            <div className="rsp-section-title">
              <div className="rsp-section-icon deductions">
                <MinusCircle size={18} />
              </div>
              Deductions, Udhaar Recovery & Fines
            </div>

            <div className="rsp-grid">
              <div className="rsp-field">
                <label className="rsp-label">Advance Recovery (Deduct Udhaar)</label>
                <div className="rsp-input-group">
                  <span className="rsp-input-prefix">₹</span>
                  <input
                    type="number"
                    className="rsp-input with-prefix"
                    placeholder="0"
                    value={advanceRecovery}
                    onChange={(e) => setAdvanceRecovery(e.target.value)}
                  />
                </div>
                {pendingAdvance > 0 && (
                  <button type="button" className="rsp-auto-btn" onClick={handleApplyFullAdvance}>
                    Auto-Fill Pending Advance (₹{pendingAdvance})
                  </button>
                )}
              </div>

              <div className="rsp-field">
                <label className="rsp-label">Penalties / Damages / Fines</label>
                <div className="rsp-input-group">
                  <span className="rsp-input-prefix">₹</span>
                  <input
                    type="number"
                    className="rsp-input with-prefix"
                    placeholder="0"
                    value={fines}
                    onChange={(e) => setFines(e.target.value)}
                  />
                </div>
              </div>

              <div className="rsp-field">
                <label className="rsp-label">Provident Fund (PF)</label>
                <div className="rsp-input-group">
                  <span className="rsp-input-prefix">₹</span>
                  <input
                    type="number"
                    className="rsp-input with-prefix"
                    placeholder="0"
                    value={pf}
                    onChange={(e) => setPf(e.target.value)}
                  />
                </div>
              </div>

              <div className="rsp-field">
                <label className="rsp-label">Employee State Insurance (ESI)</label>
                <div className="rsp-input-group">
                  <span className="rsp-input-prefix">₹</span>
                  <input
                    type="number"
                    className="rsp-input with-prefix"
                    placeholder="0"
                    value={esi}
                    onChange={(e) => setEsi(e.target.value)}
                  />
                </div>
              </div>

              <div className="rsp-field">
                <label className="rsp-label">TDS (Tax Withholding)</label>
                <div className="rsp-input-group">
                  <span className="rsp-input-prefix">₹</span>
                  <input
                    type="number"
                    className="rsp-input with-prefix"
                    placeholder="0"
                    value={tds}
                    onChange={(e) => setTds(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Disbursement & Payment Mode */}
          <div className="rsp-section">
            <div className="rsp-section-title">
              <div className="rsp-section-icon settlement">
                <Wallet size={18} />
              </div>
              Disbursement Method & References
            </div>

            <div className="rsp-grid">
              <div className="rsp-field">
                <label className="rsp-label">Payment Mode</label>
                <select
                  className="rsp-input"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option value="Direct UPI">Direct UPI Transfer</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="Cash">Cash in Hand</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="rsp-field">
                <label className="rsp-label">Transaction Reference / UTR / Cheque No.</label>
                <input
                  type="text"
                  className="rsp-input"
                  placeholder="e.g. UTR12345678 or Cash Voucher #01"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                />
              </div>

              {staffMember.upiId && (
                <div className="rsp-field" style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '0.85rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <QrCode size={20} className="text-indigo-600" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Registered UPI ID: {staffMember.upiId}</div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Scan with GPay/PhonePe to disburse exact net amount</div>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setShowUpiModal(true)}
                      style={{ background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', padding: '0.4rem 0.85rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Show Payment QR
                    </button>
                  </div>
                </div>
              )}

              <div className="rsp-field" style={{ gridColumn: 'span 2' }}>
                <label className="rsp-label">Notes / Remarks</label>
                <input
                  type="text"
                  className="rsp-input"
                  placeholder="e.g. Verified by accountant and settled via UPI"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Grand Total & Action */}
          <div className="rsp-grand-total">
            <div>
              <div className="rsp-total-label">Net Payable Disbursement</div>
              <div className="rsp-total-value">₹{netPayable.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                Gross Earnings: ₹{totalEarnings.toLocaleString('en-IN')} • Deductions: ₹{totalDeductions.toLocaleString('en-IN')}
              </div>
            </div>

            <button type="submit" className="rsp-submit-btn" disabled={submitting}>
              <CheckCircle size={20} />
              {submitting ? 'Recording...' : `Record Payment (₹${netPayable.toLocaleString('en-IN')})`}
            </button>
          </div>
        </form>

        {/* UPI QR Modal */}
        {showUpiModal && staffMember.upiId && (
          <div 
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
              backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex',
              alignItems: 'center', justifyContent: 'center', padding: '1rem'
            }}
            onClick={() => setShowUpiModal(false)}
          >
            <div 
              style={{
                background: 'white', borderRadius: '24px', padding: '2rem',
                maxWidth: '380px', width: '100%', textAlign: 'center',
                boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 0.5rem', color: '#0f172a', fontWeight: 800 }}>Scan & Pay Net Wage</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Pre-configured for ₹{netPayable.toLocaleString('en-IN')} to {staffMember.name}
              </p>

              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1.5px dashed #cbd5e1', marginBottom: '1.25rem' }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`upi://pay?pa=${staffMember.upiId}&pn=${encodeURIComponent(staffMember.name)}&am=${netPayable}`)}`}
                  alt="UPI Net Wage QR"
                  style={{ width: '180px', height: '180px', display: 'block', margin: '0 auto' }}
                />
              </div>

              <div style={{ background: '#eff6ff', padding: '0.65rem', borderRadius: '10px', color: '#1e40af', fontWeight: 700, fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                {staffMember.upiId} • ₹{netPayable.toLocaleString('en-IN')}
              </div>

              <button 
                type="button"
                onClick={() => setShowUpiModal(false)}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '12px',
                  background: '#0f172a', color: 'white', fontWeight: 700,
                  border: 'none', cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default RecordStaffPayment;

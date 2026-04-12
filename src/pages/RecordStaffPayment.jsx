import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { addItem, getItems, updateItem, logActivity } from '../utils/db';
import { 
  ArrowLeft, Wallet, CheckCircle, PlusCircle, MinusCircle, FileText,
  CalendarCheck
} from 'lucide-react';
import './RecordStaffPayment.css';

const getInitials = (name = '') => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const RecordStaffPayment = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [submitting, setSubmitting] = useState(false);

  // Core properties from previous page via state
  const staffMember = location.state?.staffMember;
  const month = location.state?.month || '';
  const year = location.state?.year || new Date().getFullYear();
  const baseSalary = location.state?.baseSalary || 0;
  const initCalcSalary = location.state?.calculatedSalary || 0;
  const absences = location.state?.absences || 0;
  const paidLeaves = location.state?.paidLeaves || 0;
  const attendanceDays = location.state?.attendanceDays || 0;

  // New Adjustable Variables State
  const [editableBase, setEditableBase] = useState(Math.round(Number(initCalcSalary)));
  const [paymentCategory, setPaymentCategory] = useState('Full Month');
  const [overtime, setOvertime] = useState('');
  const [bonus, setBonus] = useState('');
  const [tds, setTds] = useState('');
  const [pf, setPf] = useState('');
  const [advanceRecovery, setAdvanceRecovery] = useState('');
  const [advanceDays, setAdvanceDays] = useState(''); // New: for marking future absences
  const [isAdvanceDaysManual, setIsAdvanceDaysManual] = useState(false);
  
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [paymentRef, setPaymentRef] = useState('');
  const [remarks, setRemarks] = useState('');

  const dailyWage = Number(baseSalary) / (Number(attendanceDays) || 30);

  // Safeguard if accessed directly without state routing
  useEffect(() => {
    if (!staffMember) {
      alert('Invalid access. Please process payments from the attendance dashboard.');
      navigate(`/staff/account/${id}`);
    }
  }, [staffMember, navigate, id]);

  if (!staffMember) return null;

  // Real-time Net Payable calculation
  const currentBase = Number(editableBase) || 0;
  const ot = Number(overtime) || 0;
  const bns = Number(bonus) || 0;
  const tax = Number(tds) || 0;
  const pfAmount = Number(pf) || 0;
  const adv = Number(advanceRecovery) || 0;

  const netPayable = currentBase + ot + bns - tax - pfAmount - adv;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const paymentData = {
      staffId: staffMember._dbId || staffMember.id,
      month: month,
      year: year,
      baseSalary: baseSalary,
      netSalary: Math.max(0, netPayable),
      absences: absences,
      paidLeaves: paidLeaves,
      attendanceDays: attendanceDays,
      
      // Extended fields
      paymentCategory,
      overtime: ot,
      bonus: bns,
      tds: tax,
      pf: pfAmount,
      advanceRecovery: adv,
      paymentMode,
      paymentRef,
      remarks,
      
      dateOfPayment: new Date().toISOString(),
      status: 'paid'
    };

    try {
      const added = await addItem('salary_history', paymentData, user.id, user.firstName);
      if (added) {
        
        // AUTO-MARK ABSENCES LOGIC
        if (paymentCategory === 'Advance' && Number(advanceDays) > 0) {
          const mId = staffMember._dbId || staffMember.id;
          const attendanceList = await getItems('attendance', user.id);
          
          // StaffAccount uses "YYYY-MM" for the month field in the database
          // Convert "Month Year" to "YYYY-MM"
          const dateObj = new Date(`${month} 1, ${year}`);
          const currentMonthStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
          
          let record = attendanceList.find(a => a.staffId === mId && a.month === currentMonthStr);
          
          const newAbsents = [];
          const today = new Date();
          today.setHours(0,0,0,0);
          
          for (let i = 0; i < Number(advanceDays); i++) {
            const nextDay = new Date(today);
            nextDay.setDate(today.getDate() + i);
            newAbsents.push(formatDate(nextDay));
          }
          
          if (record) {
            const absents = Array.from(new Set([...(record.absentDates || []), ...newAbsents]));
            // Send full object to ensure partial update doesn't drop required fields like month/staffId
            const updatedData = { ...record, absentDates: absents };
            delete updatedData._dbId; // Don't send internal ID in data payload
            await updateItem('attendance', record._dbId || record.id, updatedData, user.id, user.firstName);
          } else {
            await addItem('attendance', {
              staffId: mId,
              month: currentMonthStr,
              absentDates: newAbsents,
              paidLeaveDates: []
            }, user.id, user.firstName);
          }
        }

        // AUTOMATIC OUTWARD PAYMENT ENTRY
        const outwardPaymentData = {
          date: new Date().toISOString().split('T')[0],
          vendorName: staffMember.name,   // Match OutwardPayment.jsx
          companyName: staffMember.name,  // Match CreateOutwardPayment.jsx
          amount: Math.max(0, netPayable),
          paymentType: paymentMode,
          category: 'Salary',
          remarks: `Salary for ${month} ${year}. ${remarks}`,
          voucherPrefix: 'SAL-',               // Match OutwardPayment.jsx
          voucherNumber: Date.now().toString().slice(-6),
          voucherPostfix: '',
          fullVoucherNo: `SAL-${Date.now().toString().slice(-6)}`,  // Match OutwardPayment.jsx
          fullPaymentNo: `SAL-${Date.now().toString().slice(-6)}`,  // Match CreateOutwardPayment.jsx
          status: 'Paid',
          timestamp: new Date().toISOString()
        };

        await addItem('outwardPayments', outwardPaymentData, user.id, user.firstName);
        logActivity(`Automated Outward Payment salary entry for ${staffMember.name}`, user.id, user.firstName);

        alert('Salary payment finalized and Outward Payment entry created!');
        navigate(`/staff/salary-history/${id}`);
      }
    } catch (error) {
      console.error('Failed to record extended salary:', error);
      alert('Error finalizing salary payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rsp-page">
      <div className="rsp-header">
        <button className="rsp-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="rsp-title">Record Staff Payment</h1>
          <div className="rsp-subtitle">Complete final ledger entries before generating payslip</div>
        </div>
      </div>

      <div className="rsp-glass-container">
        
        {/* SUMMARY CARD */}
        <div className="rsp-summary-card">
          <div className="rsp-profile-info">
            <div className="rsp-avatar">{getInitials(staffMember.name)}</div>
            <div>
              <h2 className="rsp-name">{staffMember.name}</h2>
              <div className="rsp-role">{staffMember.designation || 'Staff'} • {staffMember.department || 'General'}</div>
            </div>
          </div>
          <div className="rsp-period">
            <div className="rsp-period-label">Billing Cycle</div>
            <div className="rsp-period-value">{month} {year}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          
          <div className="rsp-grid">
            {/* EARNINGS SECTION */}
            <div className="rsp-section">
              <h3 className="rsp-section-title">
                <div className="rsp-section-icon earnings"><PlusCircle size={20} /></div>
                Earnings Overview
              </h3>

              <div className="rsp-field mb-4">
                <label className="rsp-label">Payment Category</label>
                <select 
                  className="rsp-input"
                  value={paymentCategory}
                  onChange={e => setPaymentCategory(e.target.value)}
                >
                  <option value="Full Month">Full Month Salary</option>
                  <option value="Between Month">Mid-Month Settlement</option>
                  <option value="Advance">Advance Payment</option>
                </select>
              </div>

              {paymentCategory === 'Advance' && (
                <div className="rsp-field mb-4 animate-in fade-in slide-in-from-top-2">
                  <label className="rsp-label">Advance Days (Auto-mark as Absent)</label>
                  <div className="rsp-input-group">
                    <span className="rsp-input-prefix"><CalendarCheck size={16} /></span>
                    <input 
                      type="number" 
                      min="0"
                      className="rsp-input with-prefix" 
                      placeholder="e.g. 15"
                      value={advanceDays} 
                      onChange={e => {
                        const val = e.target.value;
                        setAdvanceDays(val);
                        setIsAdvanceDaysManual(true);
                        // Two-way sync: Update Base Pay based on days
                        if (paymentCategory === 'Advance' && val && dailyWage > 0) {
                          setEditableBase(Math.round(Number(val) * dailyWage));
                        }
                      }} 
                    />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6366f1', marginTop: '0.25rem', fontWeight: '600' }}>
                    This will mark the next {advanceDays || '0'} days as 'Absent' in attendance logs.
                  </div>
                </div>
              )}
              
              <div className="rsp-field mb-4">
                <label className="rsp-label">Base Pay</label>
                <div className="rsp-input-group">
                  <span className="rsp-input-prefix">₹</span>
                  <input 
                    type="number" 
                    min="0"
                    className="rsp-input with-prefix" 
                    value={editableBase} 
                    onChange={e => {
                      const val = e.target.value;
                      setEditableBase(val);
                      // Two-way sync: Update Advance Days based on amount
                      if (paymentCategory === 'Advance' && val && dailyWage > 0) {
                        setAdvanceDays(Math.round(Number(val) / dailyWage));
                        setIsAdvanceDaysManual(true);
                      }
                    }} 
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Auto-calculated at ₹{Math.round(Number(initCalcSalary)).toLocaleString()} from {absences} Absences, {paidLeaves} Paid Leaves. You can edit this directly.
                </div>
              </div>

              <div className="rsp-field mb-4">
                <label className="rsp-label">Overtime Pay</label>
                <div className="rsp-input-group">
                  <span className="rsp-input-prefix">₹</span>
                  <input 
                    type="number" 
                    min="0" 
                    className="rsp-input with-prefix" 
                    placeholder="e.g. 500"
                    value={overtime} 
                    onChange={e => setOvertime(e.target.value)} 
                  />
                </div>
              </div>

              <div className="rsp-field">
                <label className="rsp-label">Bonus / Commissions</label>
                <div className="rsp-input-group">
                  <span className="rsp-input-prefix">₹</span>
                  <input 
                    type="number" 
                    min="0" 
                    className="rsp-input with-prefix" 
                    placeholder="e.g. 1500"
                    value={bonus} 
                    onChange={e => setBonus(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* DEDUCTIONS SECTION */}
            <div className="rsp-section">
              <h3 className="rsp-section-title">
                <div className="rsp-section-icon deductions"><MinusCircle size={20} /></div>
                Deductions
              </h3>

              <div className="rsp-field mb-4">
                <label className="rsp-label">TDS / Professional Tax</label>
                <div className="rsp-input-group">
                  <span className="rsp-input-prefix">₹</span>
                  <input 
                    type="number" 
                    min="0" 
                    className="rsp-input with-prefix" 
                    placeholder="e.g. 200"
                    value={tds} 
                    onChange={e => setTds(e.target.value)} 
                  />
                </div>
              </div>

              <div className="rsp-field mb-4">
                <label className="rsp-label">PF / ESI Contributions</label>
                <div className="rsp-input-group">
                  <span className="rsp-input-prefix">₹</span>
                  <input 
                    type="number" 
                    min="0" 
                    className="rsp-input with-prefix" 
                    placeholder="e.g. 1800"
                    value={pf} 
                    onChange={e => setPf(e.target.value)} 
                  />
                </div>
              </div>

              <div className="rsp-field">
                <label className="rsp-label">Advance / Loan Recovery</label>
                <div className="rsp-input-group">
                  <span className="rsp-input-prefix">₹</span>
                  <input 
                    type="number" 
                    min="0" 
                    className="rsp-input with-prefix" 
                    placeholder="e.g. 5000"
                    value={advanceRecovery} 
                    onChange={e => setAdvanceRecovery(e.target.value)} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SETTLEMENT DETAILS */}
          <div className="rsp-section" style={{ marginTop: '0' }}>
             <h3 className="rsp-section-title">
                <div className="rsp-section-icon settlement"><Wallet size={20} /></div>
                Settlement Details
              </h3>
              
              <div className="rsp-grid">
                <div className="rsp-field">
                  <label className="rsp-label">Payment Mode *</label>
                  <select 
                    className="rsp-input"
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value)}
                    required
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="Cash">Cash Handover</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                
                <div className="rsp-field">
                  <label className="rsp-label">Transaction ID / Reference (Optional)</label>
                  <div className="rsp-input-group">
                    <span className="rsp-input-prefix"><FileText size={16} /></span>
                    <input 
                      type="text" 
                      className="rsp-input with-prefix" 
                      placeholder="e.g. UTR123456789"
                      value={paymentRef} 
                      onChange={e => setPaymentRef(e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              <div className="rsp-field" style={{ marginTop: '1.5rem' }}>
                <label className="rsp-label">Additional Remarks / Notes</label>
                <textarea 
                  className="rsp-input" 
                  rows="2" 
                  placeholder="e.g. Performance bonus included for excellent target completion."
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                ></textarea>
              </div>
          </div>

          {/* GRAND TOTAL */}
          <div className="rsp-grand-total">
            <div>
              <div className="rsp-total-label">Final Net Payable</div>
              <div className="rsp-total-value">₹{Math.max(0, Math.round(netPayable)).toLocaleString('en-IN')}</div>
            </div>
            
            <button type="submit" className="rsp-submit-btn" disabled={submitting}>
              {submitting ? 'Processing...' : (
                <>
                  <CheckCircle size={22} /> Confirm & Record Payment
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default RecordStaffPayment;

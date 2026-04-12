import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Wallet, CheckCircle } from 'lucide-react';
import { getItems, addItem, updateItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import PrintViewModal from '../components/PrintViewModal';
import './ContactLedger.css';
import './StaffAccount.css';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helper to format date as YYYY-MM
const formatMonth = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
// Helper to format date as YYYY-MM-DD
const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const StaffAccount = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [staffMember, setStaffMember] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Attendance DB record for current month
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [localAttendance, setLocalAttendance] = useState({ absentDates: [], paidLeaveDates: [] }); // Track unsaved changes
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printDoc, setPrintDoc] = useState(null);
  const [pastPayments, setPastPayments] = useState({ amount: 0, textDesc: 'advance', record: null });

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // 1. Fetch Staff info
      const staffList = await getItems('staff', user.id);
      const member = staffList.find(s => (s._dbId === id || s.id === id));
      if (!member) {
        navigate('/staff');
        return;
      }
      setStaffMember(member);

      // 2. Fetch Attendance info for this month
      const monthStr = formatMonth(currentDate);
      const attendanceList = await getItems('attendance', user.id);
      const record = attendanceList.find(a =>
        (a.staffId === member._dbId || a.staffId === member.id) &&
        a.month === monthStr
      );

      if (record) {
        setAttendanceRecord(record);
        setLocalAttendance({
          absentDates: record.absentDates || [],
          paidLeaveDates: record.paidLeaveDates || []
        });
      } else {
        const emptyRecord = { absentDates: [], paidLeaveDates: [] };
        setAttendanceRecord(emptyRecord);
        setLocalAttendance(emptyRecord);
      }

      // 3. Fetch past cumulative payments for this month
      const allHistory = await getItems('salary_history', user.id);
      const thisMonthName = currentDate.toLocaleString('default', { month: 'long' });
      const currentYear = currentDate.getFullYear();
      
      const paymentsThisMonth = allHistory.filter(h => 
        (h.staffId === member._dbId || h.staffId === member.id) &&
        h.month === thisMonthName &&
        h.year === currentYear
      );
      
      const totalPaid = paymentsThisMonth.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0);
      
      let priorType = 'advance';
      if (paymentsThisMonth.some(p => p.paymentCategory === 'Between Month')) {
        priorType = 'mid-month';
      }
      
      setPastPayments({ 
        amount: totalPaid, 
        textDesc: priorType, 
        record: paymentsThisMonth.length > 0 ? paymentsThisMonth[0] : null 
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id, navigate, currentDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Month Change
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Toggle Attendance locally
  const toggleAttendance = (dateStr) => {
    setLocalAttendance(prev => {
      const isAbsent = prev.absentDates.includes(dateStr);
      const isPaidLeave = prev.paidLeaveDates.includes(dateStr);

      if (!isAbsent && !isPaidLeave) {
        // Mark as Absent
        return { ...prev, absentDates: [...prev.absentDates, dateStr] };
      } else if (isAbsent) {
        // Switch to Paid Leave
        return {
          ...prev,
          absentDates: prev.absentDates.filter(d => d !== dateStr),
          paidLeaveDates: [...prev.paidLeaveDates, dateStr]
        };
      } else {
        // Back to Present
        return {
          ...prev,
          paidLeaveDates: prev.paidLeaveDates.filter(d => d !== dateStr)
        };
      }
    });
  };

  const hasChanges = useMemo(() => {
    if (!attendanceRecord) return false;
    const sortedSavedAbs = [...(attendanceRecord.absentDates || [])].sort().join(',');
    const sortedLocalAbs = [...localAttendance.absentDates].sort().join(',');
    const sortedSavedPaid = [...(attendanceRecord.paidLeaveDates || [])].sort().join(',');
    const sortedLocalPaid = [...localAttendance.paidLeaveDates].sort().join(',');

    return sortedSavedAbs !== sortedLocalAbs || sortedSavedPaid !== sortedLocalPaid;
  }, [attendanceRecord, localAttendance]);

  const saveAttendance = async () => {
    if (!staffMember) return;

    const newRecordData = {
      staffId: staffMember._dbId || staffMember.id,
      month: formatMonth(currentDate),
      absentDates: localAttendance.absentDates,
      paidLeaveDates: localAttendance.paidLeaveDates
    };

    try {
      if (attendanceRecord && attendanceRecord._dbId) {
        await updateItem('attendance', attendanceRecord._dbId, newRecordData, user.id, user.firstName);
        setAttendanceRecord(prev => ({ ...prev, ...newRecordData }));
      } else {
        const added = await addItem('attendance', newRecordData, user.id, user.firstName);
        if (added) {
          setAttendanceRecord(added);
        }
      }
      alert('Attendance updated successfully!');
    } catch (error) {
      console.error("Failed to update attendance", error);
      alert('Failed to save changes. Please try again.');
    }
  };

  // Calendar Logic
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Standard 1st of month to end of month grid
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Lock dates before staff joined
    let joinDateObj = null;
    if (staffMember?.joinDate) {
      joinDateObj = new Date(staffMember.joinDate);
      joinDateObj.setHours(0, 0, 0, 0);
    }

    const days = [];

    // Empty cells for alignment
    for (let i = 0; i < firstDay; i++) {
      days.push({ empty: true, key: `empty-${i}` });
    }

    const absences = localAttendance.absentDates || [];
    const paidLeaves = localAttendance.paidLeaveDates || [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = formatDate(dateObj);
      
      const isFuture = dateObj > today;
      const isBeforeJoin = joinDateObj && dateObj < joinDateObj;
      const isLocked = isFuture || isBeforeJoin;
      
      const isAbsent = absences.includes(dateStr);
      const isPaidLeave = paidLeaves.includes(dateStr);

      days.push({
        empty: false,
        day: d,
        dateStr,
        isFuture: isLocked, // Pass isLocked as isFuture to keep styling uneditable
        isAbsent,
        isPaidLeave,
        isPresent: !isAbsent && !isPaidLeave && !isLocked,
        key: dateStr
      });
    }

    return { days, daysInMonth, firstDay };
  }, [currentDate, localAttendance, staffMember]);

  if (loading || !staffMember) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Account Data...</div>;
  }

  // Derived Info
  const baseSalary = Number(staffMember.salary) || 0;
  const daysInMonth = calendarData.daysInMonth;
  const absences = (localAttendance.absentDates || []).length;
  const paidLeaves = (localAttendance.paidLeaveDates || []).length;

  // Calculate salary (Daily Wage = Base Salary / Days in month)
  // Calculate based on actually elapsed "Present" days + "Paid Leaves" (Good for advance payments)
  const dailyWage = baseSalary / daysInMonth;
  const presentDaysCount = calendarData.days.filter(d => !d.empty && d.isPresent).length;
  const totalPayableDays = presentDaysCount + paidLeaves;
  const initialCalculatedSalary = dailyWage * totalPayableDays;
  const calculatedSalary = initialCalculatedSalary - pastPayments.amount;

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Dynamic Leaves Card Logic
  let totalLeaves = absences + paidLeaves;
  let leaveLabel = "Total Absences";
  let leaveSubtext = pastPayments.amount > 0 ? "Deducted from salary [taken advance]" : "Deducted from salary";
  let leaveColor = "#e11d48"; // Default Red
  let leaveBgColor = "#ffe4e6";
  let leaveGradient = "linear-gradient(90deg, #f43f5e, #fb7185)";

  if (paidLeaves > 0 && absences === 0) {
    leaveLabel = "Paid Leaves";
    leaveSubtext = "Not deducted from salary";
    leaveColor = "#ea580c"; // Orange
    leaveBgColor = "#ffedd5";
    leaveGradient = "linear-gradient(90deg, #f97316, #fb923c)";
  } else if (absences > 0 && paidLeaves > 0) {
    leaveLabel = "Leaves & Absences";
    leaveSubtext = `${absences} unpaid, ${paidLeaves} paid${pastPayments.amount > 0 ? ' [taken advance]' : ''}`;
    leaveColor = "#8b5cf6"; // Purple for mixed
    leaveBgColor = "#ede9fe";
    leaveGradient = "linear-gradient(90deg, #8b5cf6, #a78bfa)";
  }

  const handleRecordPayment = async () => {
    if (!staffMember) return;

    // Navigate to the beautiful Record Staff Payment form with auto-filled props
    navigate(`/staff/record-payment/${id}`, {
      state: {
        staffMember,
        month: currentDate.toLocaleString('default', { month: 'long' }),
        year: currentDate.getFullYear(),
        baseSalary: baseSalary,
        calculatedSalary: calculatedSalary,
        absences: absences,
        paidLeaves: paidLeaves,
        attendanceDays: daysInMonth
      }
    });
  };

  const handlePrintSlip = () => {
    const docData = {
      docType: 'Salary Slip',
      staffId: staffMember._dbId || staffMember.id,
      staffName: staffMember.name,
      designation: staffMember.designation || 'Staff',
      department: staffMember.department || 'General',
      salary: baseSalary,
      calculatedSalary: calculatedSalary,
      // Attendance
      absences: absences,
      paidLeaves: paidLeaves,
      attendanceDays: daysInMonth,

      month: currentDate.toLocaleString('default', { month: 'long' }),
      year: currentDate.getFullYear(),
      customerPhone: staffMember.phone || '', // for whatsapp
      customerEmail: staffMember.email || '', // for email

      // New Identity Fields
      panNumber: staffMember.panNumber || '',
      uanNumber: staffMember.uanNumber || '',
      esiNumber: staffMember.esiNumber || '',

      // Bank Details
      bankName: staffMember.bankName || '',
      accountNumber: staffMember.accountNumber || '',

      // Extended Fields from most recent record if available
      overtime: pastPayments.record?.overtime || 0,
      bonus: pastPayments.record?.bonus || 0,
      tds: pastPayments.record?.tds || 0,
      pf: pastPayments.record?.pf || 0,
      advanceRecovery: pastPayments.record?.advanceRecovery || 0,
      paymentMode: pastPayments.record?.paymentMode || '',
      remarks: pastPayments.record?.remarks || ''
    };
    setPrintDoc(docData);
    setShowPrintModal(true);
  };

  return (
    <div className="cl-page">
      {/* Header */}
      <div className="cl-header">
        <div className="cl-header-left">
          <button className="cl-back-btn" onClick={() => navigate('/staff')} title="Back to Staff List">
            <ArrowLeft size={20} />
          </button>

          <div className="sa-profile-avatar" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {staffMember.name.substring(0, 2)}
          </div>
          <div>
            <h1 className="cl-title">{staffMember.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="cl-badge vendor">
                {staffMember.designation || 'Staff'}
              </span>
              <span className="text-sm text-slate-500 font-semibold uppercase tracking-wide">
                {staffMember.department || 'General'}
              </span>
            </div>
          </div>
        </div>

        <div className="cl-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          
          {/* Unified Month Selector Pill */}
          <div className="sa-month-pill" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            background: 'white', 
            borderRadius: '12px', 
            border: '1.5px solid #e2e8f0', 
            padding: '0.2rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
          }}>
            <button 
              className="sa-month-nav" 
              onClick={prevMonth} 
              style={{ background: '#f1f5f9', border: 'none', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <ChevronLeft size={18} />
            </button>
            
            <div className="sa-month-display" style={{ padding: '0 0.5rem', minWidth: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>
              <CalendarIcon size={16} />
              {monthName}
            </div> 
            
            <button
              className="sa-month-nav"
              onClick={nextMonth}
              disabled={currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()}
              style={{ background: '#f1f5f9', border: 'none', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: (currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()) ? 0.4 : 1 }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Record Payment Button */}
          <button
            className="cl-btn cl-btn-secondary"
            onClick={handleRecordPayment}
            style={{
              padding: '0.6rem 1rem',
              fontWeight: '600',
              borderColor: 'rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              borderRadius: '10px',
              backgroundColor: '#f0fdf4'
            }}
          >
            <CheckCircle size={15} style={{ marginRight: '5px' }} /> Record Payment
          </button>

          {/* Generate Payslip Button */}
          <button
            className="cl-btn cl-btn-primary"
            onClick={handlePrintSlip}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              border: 'none',
              padding: '0.6rem 1.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '600',
              borderRadius: '10px',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
            }}
          >
            <Wallet size={16} /> Generate Payslip
          </button>
        </div>
      </div>

      {/* Metrics Dashboard */}
      <div className="cl-dashboard">
        <div className="cl-card overall">
          <div className="cl-card-header">
            <span className="cl-card-label">Base Salary</span>
            <div className="cl-card-icon overall"><Wallet size={18} /></div>
          </div>
          <div className="cl-card-value overall">₹{baseSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          <div className="cl-card-subtext overall text-slate-500">Fixed Monthly Pay</div>
        </div>

        <div className="cl-card" style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: leaveGradient }}></div>
          <div className="cl-card-header">
            <span className="cl-card-label">{leaveLabel}</span>
            <div className="cl-card-icon" style={{ background: leaveBgColor, color: leaveColor }}><User size={18} /></div>
          </div>
          <div className="cl-card-value" style={{ color: leaveColor }}>{totalLeaves} Days</div>
          <div className="cl-card-subtext text-slate-500" style={{ fontWeight: '500' }}>{leaveSubtext}</div>
        </div>

        <div className="cl-card debit" style={{ position: 'relative' }}>
          {calculatedSalary < 0 && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#ef4444' }}></div>
          )}
          <div className="cl-card-header">
            <span className="cl-card-label">Calculated Salary</span>
            <div className="cl-card-icon debit"><Wallet size={18} /></div>
          </div>
          <div className="cl-card-value dr" style={{ color: calculatedSalary < 0 ? '#ef4444' : undefined }}>
            {calculatedSalary < 0 ? '-' : ''}₹{Math.abs(calculatedSalary).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="cl-card-subtext dr text-slate-500">
            {pastPayments.amount > 0 ? `₹${pastPayments.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} taken in ${pastPayments.textDesc}` : 'Payable Amount'}
          </div>
        </div>
      </div>

      {/* Attendance Grid section */}
      <div className="cl-history-section">
        <div className="cl-history-header">
          <div className="cl-history-title">
            <CalendarIcon size={18} className="text-indigo-500" />
            Monthly Attendance
          </div>

          <div className="sa-attendance-legend">
            <div className="sa-legend-item">
              <div className="sa-legend-dot present"></div> Present
            </div>
            <div className="sa-legend-item">
              <div className="sa-legend-dot absent"></div> Absent
            </div>
            <div className="sa-legend-item">
              <div className="sa-legend-dot paid-leave"></div> Paid Leave
            </div>

            {hasChanges && (
              <button
                className="cl-btn cl-btn-primary"
                onClick={saveAttendance}
                style={{
                  marginLeft: '1rem',
                  fontSize: '0.75rem',
                  padding: '0.4rem 0.8rem',
                  background: 'var(--success-color)'
                }}
              >
                Update Attendance
              </button>
            )}
          </div>
        </div>

        <div className="sa-calendar-container">
          <div className="sa-calendar-grid">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="sa-calendar-day-header">{day}</div>
            ))}

            {calendarData.days.map((item) => {
              if (item.empty) {
                return <div key={item.key} className="sa-day-cell empty"></div>;
              }

              let cellClass = "sa-day-cell ";
              if (item.isFuture) cellClass += "future";
              else if (item.isAbsent) cellClass += "absent";
              else if (item.isPaidLeave) cellClass += "paid-leave";
              else cellClass += "present";

              return (
                <div
                  key={item.key}
                  className={cellClass}
                  onClick={() => !item.isFuture && toggleAttendance(item.dateStr)}
                >
                  <span className="sa-day-number">{item.day}</span>
                  <span className="sa-day-status">
                    {item.isFuture ? '-' : item.isAbsent ? 'Absent' : item.isPaidLeave ? 'Paid Leave' : 'Present'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showPrintModal && (
        <PrintViewModal
          doc={printDoc}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};

export default StaffAccount;

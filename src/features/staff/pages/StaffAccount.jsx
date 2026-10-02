import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  User, Wallet, CheckCircle, Share2, Plus, ArrowDownLeft, 
  ArrowUpRight, Clock, Package, AlertCircle, BookOpen, Trash2
} from 'lucide-react';
import { getItems, addItem, updateItem, deleteItem, logActivity } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import PrintViewModal from '@/components/ui/PrintViewModal';
import StaffAdvanceModal from '@/features/staff/components/StaffAdvanceModal';
import MalKhataModal from '@/features/staff/components/MalKhataModal';
import '@/features/contacts/styles/ContactLedger.css';
import '@/features/staff/styles/StaffAccount.css';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatMonth = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const StaffAccount = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [staffMember, setStaffMember] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Active sub-tab: 'attendance' or 'ledger' or 'mal_khata'
  const queryTab = new URLSearchParams(location.search).get('tab');
  const [activeTab, setActiveTab] = useState(queryTab === 'ledger' ? 'ledger' : 'attendance');

  // Attendance DB record for current month
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [localAttendance, setLocalAttendance] = useState({
    absentDates: [],
    paidLeaveDates: [],
    halfDayDates: [],
    weeklyOffDates: [],
    holidayDates: [],
    overtimeHours: {} // { '2026-10-02': 2.5 }
  });

  // Pagar Khata Staff Ledger
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [malKhataEntries, setMalKhataEntries] = useState([]);

  // Modals
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printDoc, setPrintDoc] = useState(null);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showMalKhataModal, setShowMalKhataModal] = useState(false);
  const [editingDayModal, setEditingDayModal] = useState(null); // Day being edited with OT

  // Past payments for month
  const [pastPayments, setPastPayments] = useState({ amount: 0, textDesc: 'advance', record: null });

  const loadData = useCallback(async () => {
    if (!user?.id || !id) return;
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

      const mId = member._dbId || member.id;

      // 2. Fetch Attendance info for this month
      const monthStr = formatMonth(currentDate);
      const attendanceList = await getItems('attendance', user.id);
      const record = attendanceList.find(a => a.staffId === mId && a.month === monthStr);

      if (record) {
        setAttendanceRecord(record);
        setLocalAttendance({
          absentDates: record.absentDates || [],
          paidLeaveDates: record.paidLeaveDates || [],
          halfDayDates: record.halfDayDates || [],
          weeklyOffDates: record.weeklyOffDates || [],
          holidayDates: record.holidayDates || [],
          overtimeHours: record.overtimeHours || {}
        });
      } else {
        const emptyRecord = {
          absentDates: [],
          paidLeaveDates: [],
          halfDayDates: [],
          weeklyOffDates: [],
          holidayDates: [],
          overtimeHours: {}
        };
        setAttendanceRecord(emptyRecord);
        setLocalAttendance(emptyRecord);
      }

      // 3. Fetch Staff Ledger ("You Gave" & "You Got")
      const allLedger = await getItems('staff_ledger', user.id);
      const memberLedger = allLedger
        .filter(l => l.staffId === mId)
        .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
      setLedgerEntries(memberLedger);

      // 4. Fetch Mal-Khata piece rate entries
      const allMal = await getItems('staff_mal_khata', user.id);
      const memberMal = allMal.filter(m => m.staffId === mId);
      setMalKhataEntries(memberMal);

      // 5. Fetch past cumulative payments for this month
      const allHistory = await getItems('salary_history', user.id);
      const thisMonthName = currentDate.toLocaleString('default', { month: 'long' });
      const currentYear = currentDate.getFullYear();
      
      const paymentsThisMonth = allHistory.filter(h => 
        h.staffId === mId &&
        h.month === thisMonthName &&
        h.year === currentYear
      );
      
      const totalPaid = paymentsThisMonth.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0);
      setPastPayments({ 
        amount: totalPaid, 
        textDesc: paymentsThisMonth.length > 0 ? 'prior payment' : 'advance', 
        record: paymentsThisMonth.length > 0 ? paymentsThisMonth[0] : null 
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id, navigate, currentDate]);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle Month Navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Toggle Attendance locally cycling through: Present -> Half-Day -> Absent -> Paid Leave -> Weekly Off -> Holiday -> Present
  const cycleAttendance = (dateStr) => {
    setLocalAttendance(prev => {
      const isAbsent = (prev.absentDates || []).includes(dateStr);
      const isHalf = (prev.halfDayDates || []).includes(dateStr);
      const isPaid = (prev.paidLeaveDates || []).includes(dateStr);
      const isWO = (prev.weeklyOffDates || []).includes(dateStr);
      const isH = (prev.holidayDates || []).includes(dateStr);

      // Default state was Present
      if (!isAbsent && !isHalf && !isPaid && !isWO && !isH) {
        // -> Half-Day
        return { ...prev, halfDayDates: [...prev.halfDayDates, dateStr] };
      } else if (isHalf) {
        // -> Absent
        return {
          ...prev,
          halfDayDates: prev.halfDayDates.filter(d => d !== dateStr),
          absentDates: [...prev.absentDates, dateStr]
        };
      } else if (isAbsent) {
        // -> Paid Leave
        return {
          ...prev,
          absentDates: prev.absentDates.filter(d => d !== dateStr),
          paidLeaveDates: [...prev.paidLeaveDates, dateStr]
        };
      } else if (isPaid) {
        // -> Weekly Off
        return {
          ...prev,
          paidLeaveDates: prev.paidLeaveDates.filter(d => d !== dateStr),
          weeklyOffDates: [...(prev.weeklyOffDates || []), dateStr]
        };
      } else if (isWO) {
        // -> Holiday
        return {
          ...prev,
          weeklyOffDates: (prev.weeklyOffDates || []).filter(d => d !== dateStr),
          holidayDates: [...(prev.holidayDates || []), dateStr]
        };
      } else {
        // -> Back to Present
        return {
          ...prev,
          holidayDates: (prev.holidayDates || []).filter(d => d !== dateStr)
        };
      }
    });
  };

  const hasChanges = useMemo(() => {
    if (!attendanceRecord) return false;
    const sortedSavedAbs = [...(attendanceRecord.absentDates || [])].sort().join(',');
    const sortedLocalAbs = [...(localAttendance.absentDates || [])].sort().join(',');
    const sortedSavedHalf = [...(attendanceRecord.halfDayDates || [])].sort().join(',');
    const sortedLocalHalf = [...(localAttendance.halfDayDates || [])].sort().join(',');
    const sortedSavedPaid = [...(attendanceRecord.paidLeaveDates || [])].sort().join(',');
    const sortedLocalPaid = [...(localAttendance.paidLeaveDates || [])].sort().join(',');

    return sortedSavedAbs !== sortedLocalAbs || 
           sortedSavedHalf !== sortedLocalHalf || 
           sortedSavedPaid !== sortedLocalPaid;
  }, [attendanceRecord, localAttendance]);

  const saveAttendance = async () => {
    if (!staffMember) return;
    const mId = staffMember._dbId || staffMember.id;

    const newRecordData = {
      staffId: mId,
      month: formatMonth(currentDate),
      absentDates: localAttendance.absentDates,
      halfDayDates: localAttendance.halfDayDates,
      paidLeaveDates: localAttendance.paidLeaveDates,
      weeklyOffDates: localAttendance.weeklyOffDates || [],
      holidayDates: localAttendance.holidayDates || [],
      overtimeHours: localAttendance.overtimeHours || {}
    };

    try {
      if (attendanceRecord && attendanceRecord._dbId) {
        await updateItem('attendance', attendanceRecord._dbId, newRecordData, user.id, user.firstName);
        setAttendanceRecord(prev => ({ ...prev, ...newRecordData }));
      } else {
        const added = await addItem('attendance', newRecordData, user.id, user.firstName);
        if (added) setAttendanceRecord(added);
      }
      await logActivity(`Updated monthly attendance records for ${staffMember.name}`, user.id, user.firstName);
      alert('Attendance changes saved successfully!');
    } catch (error) {
      console.error("Failed to update attendance", error);
      alert('Failed to save changes. Please try again.');
    }
  };

  // Calendar Construction
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let joinDateObj = null;
    if (staffMember?.joinDate) {
      joinDateObj = new Date(staffMember.joinDate);
      joinDateObj.setHours(0, 0, 0, 0);
    }

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push({ empty: true, key: `empty-${i}` });
    }

    const absences = localAttendance.absentDates || [];
    const halfDays = localAttendance.halfDayDates || [];
    const paidLeaves = localAttendance.paidLeaveDates || [];
    const weeklyOffs = localAttendance.weeklyOffDates || [];
    const holidays = localAttendance.holidayDates || [];
    const otMap = localAttendance.overtimeHours || {};

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = formatDate(dateObj);
      
      const isFuture = dateObj > today;
      const isBeforeJoin = joinDateObj && dateObj < joinDateObj;
      const isLocked = isFuture || isBeforeJoin;
      
      const isAbsent = absences.includes(dateStr);
      const isHalf = halfDays.includes(dateStr);
      const isPaid = paidLeaves.includes(dateStr);
      const isWO = weeklyOffs.includes(dateStr);
      const isH = holidays.includes(dateStr);
      const isPres = !isAbsent && !isHalf && !isPaid && !isWO && !isH && !isLocked;
      const otHours = otMap[dateStr] || 0;

      days.push({
        empty: false,
        day: d,
        dateStr,
        isFuture: isLocked,
        isAbsent,
        isHalf,
        isPaid,
        isWO,
        isH,
        isPresent: isPres,
        otHours,
        key: dateStr
      });
    }

    return { days, daysInMonth, firstDay };
  }, [currentDate, localAttendance, staffMember]);

  // Derived Info & Multi-Basis Salary Calculation
  const wageType = staffMember?.wageType || 'monthly';
  const baseSalary = Number(staffMember?.salary || staffMember?.dailyRate || staffMember?.hourlyRate || 0);
  const daysInMonth = calendarData.daysInMonth;

  const absencesCount = (localAttendance.absentDates || []).length;
  const halfDaysCount = (localAttendance.halfDayDates || []).length;
  const paidLeavesCount = (localAttendance.paidLeaveDates || []).length;
  const presentDaysCount = calendarData.days.filter(d => !d.empty && d.isPresent).length;

  // Total payable units
  const totalPayableDays = presentDaysCount + (halfDaysCount * 0.5) + paidLeavesCount;

  // Wage calculation based on model
  let initialCalculatedSalary = 0;
  if (wageType === 'daily') {
    initialCalculatedSalary = baseSalary * totalPayableDays;
  } else if (wageType === 'hourly') {
    initialCalculatedSalary = baseSalary * (totalPayableDays * 8); // 8 hr baseline
  } else if (wageType === 'piece_rate') {
    initialCalculatedSalary = malKhataEntries.reduce((sum, m) => sum + (Number(m.totalAmount) || 0), 0);
  } else {
    // Fixed Monthly
    const dailyWage = baseSalary / daysInMonth;
    initialCalculatedSalary = dailyWage * totalPayableDays;
  }

  // Outstanding Udhaar Balance from staff_ledger
  let totalGave = 0;
  let totalGot = 0;
  ledgerEntries.forEach(item => {
    const a = Number(item.amount) || 0;
    if (item.type === 'you_gave') totalGave += a;
    else if (item.type === 'you_got') totalGot += a;
  });
  const pendingAdvance = Math.max(0, totalGave - totalGot);

  const calculatedSalary = Math.round(initialCalculatedSalary - pastPayments.amount);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Record Payment
  const handleRecordPayment = () => {
    if (!staffMember) return;
    navigate(`/staff/record-payment/${id}`, {
      state: {
        staffMember,
        month: currentDate.toLocaleString('default', { month: 'long' }),
        year: currentDate.getFullYear(),
        baseSalary: baseSalary,
        calculatedSalary: calculatedSalary,
        absences: absencesCount,
        halfDays: halfDaysCount,
        paidLeaves: paidLeavesCount,
        attendanceDays: daysInMonth
      }
    });
  };

  // WhatsApp Attendance Report
  const handleShareWhatsApp = () => {
    const phone = (staffMember.phone || '').replace(/\D/g, '');
    const msg = `*ATTENDANCE & WAGE SUMMARY*\n` +
      `--------------------------------\n` +
      `Staff: ${staffMember.name}\n` +
      `Month: ${monthName}\n` +
      `Present: ${presentDaysCount} Days | Half-Days: ${halfDaysCount}\n` +
      `Unpaid Absents: ${absencesCount} | Paid Leaves: ${paidLeavesCount}\n` +
      `Calculated Payable: ₹${calculatedSalary.toLocaleString('en-IN')}\n` +
      (pendingAdvance > 0 ? `Pending Advance (Udhaar): ₹${pendingAdvance.toLocaleString('en-IN')}\n` : '') +
      `--------------------------------\n` +
      `BaniyaBook Pagar Khata.`;

    const waUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
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
      absences: absencesCount,
      halfDays: halfDaysCount,
      paidLeaves: paidLeavesCount,
      attendanceDays: daysInMonth,
      month: currentDate.toLocaleString('default', { month: 'long' }),
      year: currentDate.getFullYear(),
      customerPhone: staffMember.phone || '',
      customerEmail: staffMember.email || '',
      panNumber: staffMember.panNumber || '',
      uanNumber: staffMember.uanNumber || '',
      esiNumber: staffMember.esiNumber || '',
      bankName: staffMember.bankName || '',
      accountNumber: staffMember.accountNumber || '',
      overtime: pastPayments.record?.overtime || 0,
      bonus: pastPayments.record?.bonus || 0,
      tds: pastPayments.record?.tds || 0,
      pf: pastPayments.record?.pf || 0,
      advanceRecovery: pastPayments.record?.advanceRecovery || 0,
      paymentMode: pastPayments.record?.paymentMode || 'Bank Transfer'
    };
    setPrintDoc(docData);
    setShowPrintModal(true);
  };

  if (loading || !staffMember) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
        Loading Staff Account Data...
      </div>
    );
  }

  return (
    <div className="cl-page">
      {/* Header */}
      <div className="cl-header" style={{ marginBottom: '1.5rem' }}>
        <div className="cl-header-left">
          <button className="cl-back-btn" onClick={() => navigate('/staff')} title="Back to Staff Directory">
            <ArrowLeft size={20} />
          </button>

          <div className="sa-profile-avatar" style={{ background: 'linear-gradient(135deg, #4f46e5, #2563eb)' }}>
            {staffMember.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="cl-title" style={{ fontSize: '1.6rem' }}>{staffMember.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="cl-badge vendor">
                {staffMember.designation || 'Staff'}
              </span>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                {staffMember.department || 'Operations'} • {wageType.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="cl-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Month Selector Pill */}
          <div className="sa-month-pill" style={{ 
            display: 'flex', alignItems: 'center', background: 'white', 
            borderRadius: '12px', border: '1.5px solid #e2e8f0', padding: '0.2rem'
          }}>
            <button 
              className="sa-month-nav" 
              onClick={prevMonth} 
              style={{ background: '#f1f5f9', border: 'none', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <ChevronLeft size={18} />
            </button>
            
            <div className="sa-month-display" style={{ padding: '0 0.5rem', minWidth: '110px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
              <CalendarIcon size={16} className="text-blue-600" />
              {monthName}
            </div> 
            
            <button
              className="sa-month-nav"
              onClick={nextMonth}
              style={{ background: '#f1f5f9', border: 'none', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* WhatsApp Summary */}
          <button
            onClick={handleShareWhatsApp}
            style={{
              padding: '0.6rem 0.9rem', fontWeight: '700', borderRadius: '10px',
              border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#059669',
              display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem'
            }}
            title="Share summary on WhatsApp"
          >
            <Share2 size={15} /> WhatsApp
          </button>

          {/* Record Payment Button */}
          <button
            className="cl-btn"
            onClick={handleRecordPayment}
            style={{
              padding: '0.6rem 1rem', fontWeight: '700', borderRadius: '10px',
              border: '1px solid #bbf7d0', color: '#047857', backgroundColor: '#f0fdf4',
              display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem'
            }}
          >
            <CheckCircle size={15} /> Settle Salary
          </button>

          {/* Generate Payslip Button */}
          <button
            onClick={handlePrintSlip}
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #2563eb)', color: 'white',
              border: 'none', padding: '0.6rem 1.15rem', display: 'flex',
              alignItems: 'center', gap: '0.5rem', fontWeight: '700', borderRadius: '10px',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)', cursor: 'pointer', fontSize: '0.82rem'
            }}
          >
            <Wallet size={16} /> Payslip
          </button>
        </div>
      </div>

      {/* Tabs Switcher: Attendance Grid vs Pagar Khata Ledger vs Mal-Khata */}
      <div className="sa-tabs-bar">
        <button 
          className={`sa-tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <CalendarIcon size={16} /> Monthly Attendance & Shifts
        </button>

        <button 
          className={`sa-tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
          onClick={() => setActiveTab('ledger')}
        >
          <BookOpen size={16} /> Pagar Khata Ledger (Udhaar & Advances)
          {pendingAdvance > 0 && (
            <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '10px', fontWeight: 800 }}>
              ₹{pendingAdvance.toLocaleString('en-IN')}
            </span>
          )}
        </button>

        {wageType === 'piece_rate' && (
          <button 
            className={`sa-tab-btn ${activeTab === 'mal_khata' ? 'active' : ''}`}
            onClick={() => setActiveTab('mal_khata')}
          >
            <Package size={16} /> Mal-Khata Piece Output Log
          </button>
        )}
      </div>

      {/* TAB 1: Monthly Attendance Grid */}
      {activeTab === 'attendance' && (
        <>
          {/* Metrics Dashboard */}
          <div className="sa-dashboard-grid">
            <div className="cl-card overall">
              <div className="cl-card-header">
                <span className="cl-card-label">Base Wage</span>
                <div className="cl-card-icon overall"><Wallet size={18} /></div>
              </div>
              <div className="cl-card-value overall">₹{baseSalary.toLocaleString('en-IN')}</div>
              <div className="cl-card-subtext overall text-slate-500">
                {wageType === 'daily' ? 'Per Day Rate' : wageType === 'hourly' ? 'Per Hour Rate' : 'Fixed Monthly'}
              </div>
            </div>

            <div className="cl-card" style={{ borderLeft: '5px solid #22c55e' }}>
              <div className="cl-card-header">
                <span className="cl-card-label">Payable Days</span>
                <div className="cl-card-icon" style={{ background: '#ecfdf5', color: '#16a34a' }}><CheckCircle size={18} /></div>
              </div>
              <div className="cl-card-value" style={{ color: '#16a34a' }}>{totalPayableDays} Days</div>
              <div className="cl-card-subtext text-slate-500">
                {presentDaysCount} full, {halfDaysCount} half, {paidLeavesCount} paid
              </div>
            </div>

            <div className="cl-card" style={{ borderLeft: '5px solid #f43f5e' }}>
              <div className="cl-card-header">
                <span className="cl-card-label">Unpaid Absences</span>
                <div className="cl-card-icon" style={{ background: '#fff1f2', color: '#e11d48' }}><User size={18} /></div>
              </div>
              <div className="cl-card-value" style={{ color: '#e11d48' }}>{absencesCount} Days</div>
              <div className="cl-card-subtext text-slate-500">Deducted from wage</div>
            </div>

            <div className="cl-card debit">
              <div className="cl-card-header">
                <span className="cl-card-label">Calculated Wage</span>
                <div className="cl-card-icon debit"><Wallet size={18} /></div>
              </div>
              <div className="cl-card-value dr">
                ₹{calculatedSalary.toLocaleString('en-IN')}
              </div>
              <div className="cl-card-subtext dr text-slate-500">
                {pastPayments.amount > 0 ? `₹${pastPayments.amount.toLocaleString()} settled prior` : 'Net Payable'}
              </div>
            </div>
          </div>

          {/* Attendance Grid section */}
          <div className="cl-history-section">
            <div className="cl-history-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
              <div className="cl-history-title">
                <CalendarIcon size={18} className="text-indigo-600" />
                Monthly Attendance Register
              </div>

              {/* 6-State Interactive Legend */}
              <div className="sa-attendance-legend">
                <div className="sa-legend-item">
                  <div className="sa-legend-dot present"></div> Present (P)
                </div>
                <div className="sa-legend-item">
                  <div className="sa-legend-dot half-day"></div> Half-Day (HD)
                </div>
                <div className="sa-legend-item">
                  <div className="sa-legend-dot absent"></div> Absent (A)
                </div>
                <div className="sa-legend-item">
                  <div className="sa-legend-dot paid-leave"></div> Paid Leave (PL)
                </div>
                <div className="sa-legend-item">
                  <div className="sa-legend-dot weekly-off"></div> Weekly Off (WO)
                </div>
                <div className="sa-legend-item">
                  <div className="sa-legend-dot holiday"></div> Holiday (H)
                </div>

                {hasChanges && (
                  <button
                    className="cl-btn"
                    onClick={saveAttendance}
                    style={{
                      marginLeft: '0.5rem', fontSize: '0.8rem', padding: '0.45rem 1rem',
                      background: '#10b981', color: 'white', border: 'none', borderRadius: '8px',
                      fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
                    }}
                  >
                    Save Changes
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
                  let statusText = "Present";

                  if (item.isFuture) {
                    cellClass += "future";
                    statusText = "-";
                  } else if (item.isAbsent) {
                    cellClass += "absent";
                    statusText = "Absent";
                  } else if (item.isHalf) {
                    cellClass += "half-day";
                    statusText = "Half-Day";
                  } else if (item.isPaid) {
                    cellClass += "paid-leave";
                    statusText = "Paid Leave";
                  } else if (item.isWO) {
                    cellClass += "weekly-off";
                    statusText = "Weekly Off";
                  } else if (item.isH) {
                    cellClass += "holiday";
                    statusText = "Holiday";
                  } else {
                    cellClass += "present";
                    statusText = "Present";
                  }

                  return (
                    <div
                      key={item.key}
                      className={cellClass}
                      onClick={() => !item.isFuture && cycleAttendance(item.dateStr)}
                      title={!item.isFuture ? "Click to toggle: Present -> Half-Day -> Absent -> Paid Leave -> Weekly Off -> Holiday" : "Locked date"}
                    >
                      {item.otHours > 0 && (
                        <div className="sa-day-ot-badge">+{item.otHours}h OT</div>
                      )}
                      <span className="sa-day-number">{item.day}</span>
                      <span className="sa-day-status">
                        {statusText}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.78rem', color: '#64748b' }}>
                💡 <em>Tip: Single-tap any day to cycle through states: <strong>Present</strong> ➔ <strong>Half-Day (0.5)</strong> ➔ <strong>Absent</strong> ➔ <strong>Paid Leave</strong> ➔ <strong>Weekly Off</strong> ➔ <strong>Holiday</strong>. Click "Save Changes" when done.</em>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: Pagar Khata Staff Ledger (Udhaar & Advances) */}
      {activeTab === 'ledger' && (
        <div>
          {/* Dual Balance Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
            <div style={{ background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: '18px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#b91c1c' }}>
                  Total You Gave (आपने दिए)
                </span>
                <ArrowDownLeft size={20} className="text-rose-600" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#e11d48', margin: '0.5rem 0 0.25rem', fontFamily: "var(--staff-num-font, 'Plus Jakarta Sans', 'Inter', sans-serif)", fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>
                ₹{totalGave.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#991b1b' }}>Advances, loans & fines</div>
            </div>

            <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '18px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#047857' }}>
                  Total You Got (आपको मिले)
                </span>
                <ArrowUpRight size={20} className="text-emerald-600" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#059669', margin: '0.5rem 0 0.25rem', fontFamily: "var(--staff-num-font, 'Plus Jakarta Sans', 'Inter', sans-serif)", fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>
                ₹{totalGot.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#065f46' }}>Bonuses, incentives & repayments</div>
            </div>

            <div style={{
              background: pendingAdvance > 0 ? '#fffbeb' : '#f8fafc',
              border: pendingAdvance > 0 ? '1.5px solid #fde68a' : '1.5px solid #e2e8f0',
              borderRadius: '18px', padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: pendingAdvance > 0 ? '#92400e' : '#475569' }}>
                  Net Udhaar Outstanding
                </span>
                <Wallet size={20} style={{ color: pendingAdvance > 0 ? '#d97706' : '#64748b' }} />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: pendingAdvance > 0 ? '#d97706' : '#0f172a', margin: '0.5rem 0 0.25rem', fontFamily: "var(--staff-num-font, 'Plus Jakarta Sans', 'Inter', sans-serif)", fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>
                ₹{pendingAdvance.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {pendingAdvance > 0 ? 'Staff owes company (auto-deducted)' : 'All advances cleared'}
              </div>
            </div>
          </div>

          {/* Quick Transaction Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Staff Ledger Statement
            </h3>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowAdvanceModal(true)}
                style={{
                  padding: '0.55rem 1.15rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.82rem',
                  background: 'linear-gradient(135deg, #f43f5e, #e11d48)', color: 'white', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  boxShadow: '0 4px 12px rgba(244, 63, 94, 0.25)'
                }}
              >
                <ArrowDownLeft size={16} /> Give Advance (आपने दिए)
              </button>

              <button
                onClick={() => setShowAdvanceModal(true)}
                style={{
                  padding: '0.55rem 1.15rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.82rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                }}
              >
                <ArrowUpRight size={16} /> Add Perk / Bonus (आपको मिले)
              </button>
            </div>
          </div>

          {/* Ledger Table with Scroll Container & Sticky Header */}
          <div className="staff-table-scroll" style={{ background: 'white', borderRadius: '18px', border: '1px solid #e2e8f0', maxHeight: '480px', overflowY: 'auto', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, boxShadow: '0 1px 0 #e2e8f0' }}>Date</th>
                  <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, boxShadow: '0 1px 0 #e2e8f0' }}>Type</th>
                  <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, boxShadow: '0 1px 0 #e2e8f0' }}>Category & Remarks</th>
                  <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, boxShadow: '0 1px 0 #e2e8f0' }}>Mode</th>
                  <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, boxShadow: '0 1px 0 #e2e8f0' }}>Amount</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, boxShadow: '0 1px 0 #e2e8f0' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((item, idx) => (
                  <tr key={item._dbId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1.25rem', color: '#475569', fontWeight: 600 }}>{item.date}</td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <span style={{
                        padding: '0.25rem 0.65rem', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 800,
                        background: item.type === 'you_gave' ? '#fff1f2' : '#ecfdf5',
                        color: item.type === 'you_gave' ? '#e11d48' : '#059669'
                      }}>
                        {item.type === 'you_gave' ? 'You Gave' : 'You Got'}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.category}</div>
                      {item.notes && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.notes}</div>}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: '#64748b' }}>{item.paymentMode || 'Cash'}</td>
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right', fontWeight: 800, fontFamily: "var(--staff-num-font, 'Plus Jakarta Sans', 'Inter', sans-serif)", fontVariantNumeric: 'tabular-nums', color: item.type === 'you_gave' ? '#e11d48' : '#059669', fontSize: '0.95rem' }}>
                      {item.type === 'you_gave' ? '-' : '+'}₹{Number(item.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                      <button
                        onClick={async () => {
                          if (!window.confirm('Delete this ledger entry?')) return;
                          if (item._dbId) {
                            await deleteItem('staff_ledger', item._dbId, user.id, user.firstName);
                            setLedgerEntries(prev => prev.filter(l => l._dbId !== item._dbId));
                          }
                        }}
                        style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', padding: '0.3rem 0.5rem', borderRadius: '6px', cursor: 'pointer' }}
                        title="Delete entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {ledgerEntries.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                      No Pagar Khata entries logged yet. Click "Give Advance" or "Add Perk" above to record cash advances or incentives.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Mal-Khata Piece Output Log */}
      {activeTab === 'mal_khata' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Mal-Khata Piece-Rate Register
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Work-based production output credited to worker</p>
            </div>

            <button
              onClick={() => setShowMalKhataModal(true)}
              style={{
                padding: '0.55rem 1.15rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.82rem',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
              }}
            >
              <Plus size={16} /> + Add Piece Work Output
            </button>
          </div>

          <div className="staff-table-scroll" style={{ background: 'white', borderRadius: '18px', border: '1px solid #e2e8f0', maxHeight: '480px', overflowY: 'auto', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, boxShadow: '0 1px 0 #e2e8f0' }}>Date</th>
                  <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, boxShadow: '0 1px 0 #e2e8f0' }}>Item / Operation</th>
                  <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, boxShadow: '0 1px 0 #e2e8f0' }}>Units Produced</th>
                  <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, boxShadow: '0 1px 0 #e2e8f0' }}>Piece Rate</th>
                  <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, boxShadow: '0 1px 0 #e2e8f0' }}>Total Earned</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, boxShadow: '0 1px 0 #e2e8f0' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {malKhataEntries.map((m, idx) => (
                  <tr key={m._dbId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1.25rem', color: '#475569', fontWeight: 600 }}>{m.date}</td>
                    <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: '#0f172a' }}>
                      {m.itemDescription}
                      {m.batchNo && <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '6px' }}>({m.batchNo})</span>}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700 }}>{m.unitsProduced} units</td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>₹{m.ratePerUnit}/unit</td>
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right', fontWeight: 800, color: '#059669', fontFamily: "var(--staff-num-font, 'Plus Jakarta Sans', 'Inter', sans-serif)", fontVariantNumeric: 'tabular-nums', fontSize: '0.95rem' }}>
                      ₹{Number(m.totalAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                      <button
                        onClick={async () => {
                          if (!window.confirm('Delete this piece-rate record?')) return;
                          if (m._dbId) {
                            await deleteItem('staff_mal_khata', m._dbId, user.id, user.firstName);
                            setMalKhataEntries(prev => prev.filter(item => item._dbId !== m._dbId));
                          }
                        }}
                        style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', padding: '0.3rem 0.5rem', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {malKhataEntries.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                      No piece-work records logged yet. Click "+ Add Piece Work Output" above to log units produced.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payslip Modal */}
      {showPrintModal && (
        <PrintViewModal
          doc={printDoc}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Staff Advance Modal */}
      <StaffAdvanceModal
        isOpen={showAdvanceModal}
        onClose={() => setShowAdvanceModal(false)}
        staffList={staffMember ? [staffMember] : []}
        defaultStaffId={staffMember?._dbId || staffMember?.id}
        onSaved={loadData}
      />

      {/* Mal-Khata Modal */}
      <MalKhataModal
        isOpen={showMalKhataModal}
        onClose={() => setShowMalKhataModal(false)}
        staffList={staffMember ? [staffMember] : []}
        defaultStaffId={staffMember?._dbId || staffMember?.id}
        onSaved={loadData}
      />
    </div>
  );
};

export default StaffAccount;

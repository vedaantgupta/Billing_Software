import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Wallet } from 'lucide-react';
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
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printDoc, setPrintDoc] = useState(null);
  
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
      } else {
        setAttendanceRecord({ absentDates: [] }); // default empty
      }
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

  // Toggle Attendance
  const toggleAttendance = async (dateStr) => {
    if (!staffMember) return;
    
    // Optimistic UI update
    let currentAbsences = attendanceRecord?.absentDates || [];
    let newAbsences;
    
    if (currentAbsences.includes(dateStr)) {
      newAbsences = currentAbsences.filter(d => d !== dateStr);
    } else {
      newAbsences = [...currentAbsences, dateStr];
    }
    
    // Update local state temporarily
    const newRecordData = {
      staffId: staffMember._dbId || staffMember.id,
      month: formatMonth(currentDate),
      absentDates: newAbsences
    };
    
    setAttendanceRecord(prev => ({ ...prev, absentDates: newAbsences }));
    
    // Save to DB
    try {
      if (attendanceRecord && attendanceRecord._dbId) {
        await updateItem('attendance', attendanceRecord._dbId, newRecordData, user.id, user.firstName);
      } else {
        const added = await addItem('attendance', newRecordData, user.id, user.firstName);
        if (added) {
          setAttendanceRecord(added);
        }
      }
    } catch (error) {
      console.error("Failed to update attendance", error);
      // Revert optimistic update ideally here, but leaving as is for simplicity
      loadData();
    }
  };

  // Calendar Logic
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of month (0-6)
    const firstDay = new Date(year, month, 1).getDay();
    // Total days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const days = [];
    
    // Empty cells for alignment
    for (let i = 0; i < firstDay; i++) {
        days.push({ empty: true, key: `empty-${i}` });
    }
    
    const absences = attendanceRecord?.absentDates || [];
    
    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dateStr = formatDate(dateObj);
        const isFuture = dateObj > today;
        const isAbsent = absences.includes(dateStr);
        
        days.push({
            empty: false,
            day: d,
            dateStr,
            isFuture,
            isAbsent,
            isPresent: !isAbsent && !isFuture,
            key: dateStr
        });
    }
    
    return { days, daysInMonth, firstDay };
  }, [currentDate, attendanceRecord]);

  if (loading || !staffMember) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Account Data...</div>;
  }

  // Derived Info
  const baseSalary = Number(staffMember.salary) || 0;
  const daysInMonth = calendarData.daysInMonth;
  const absences = (attendanceRecord?.absentDates || []).length;
  
  // Calculate salary (Daily Wage = Base Salary / Days in month)
  const dailyWage = baseSalary / daysInMonth;
  const calculatedSalary = baseSalary - (dailyWage * absences);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const handlePrintSlip = () => {
    const docData = {
      docType: 'Salary Slip',
      staffId: staffMember._dbId || staffMember.id,
      staffName: staffMember.name,
      designation: staffMember.designation || 'Staff',
      department: staffMember.department || 'General',
      salary: baseSalary,
      calculatedSalary: calculatedSalary,
      absences: absences,
      attendanceDays: daysInMonth,
      month: currentDate.toLocaleString('default', { month: 'long' }),
      year: currentDate.getFullYear(),
      customerPhone: staffMember.phoneNo || '', // for whatsapp
      customerEmail: staffMember.email || '', // for email
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

        <div className="cl-header-actions sa-month-selector">
          <button className="cl-btn cl-btn-secondary" onClick={prevMonth} style={{ padding: '0.5rem' }}>
            <ChevronLeft size={18} />
          </button>
          <div className="sa-month-display">
            <CalendarIcon size={16} />
            {monthName}
          </div>
          <button 
            className="cl-btn cl-btn-secondary" 
            onClick={nextMonth} 
            disabled={currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()}
            style={{ padding: '0.5rem' }}
          >
            <ChevronRight size={18} />
          </button>
          
          <button 
            className="cl-btn cl-btn-primary" 
            onClick={handlePrintSlip}
            style={{ 
              marginLeft: '1rem', 
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
              color: 'white',
              border: 'none',
              padding: '0.6rem 1.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '600',
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
        
        <div className="cl-card credit">
          <div className="cl-card-header">
             <span className="cl-card-label">Total Absences</span>
             <div className="cl-card-icon credit"><User size={18} /></div>
          </div>
          <div className="cl-card-value cr">{absences} Days</div>
          <div className="cl-card-subtext cr">Deducted from salary</div>
        </div>
        
        <div className="cl-card debit">
          <div className="cl-card-header">
             <span className="cl-card-label">Calculated Salary</span>
             <div className="cl-card-icon debit"><Wallet size={18} /></div>
          </div>
          <div className="cl-card-value dr">₹{calculatedSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          <div className="cl-card-subtext dr text-slate-500">Payable Amount</div>
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
              <div className="sa-legend-dot present"></div> Present (Auto)
            </div>
            <div className="sa-legend-item">
              <div className="sa-legend-dot absent"></div> Absent
            </div>
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
              else cellClass += "present";

              return (
                <div 
                  key={item.key} 
                  className={cellClass}
                  onClick={() => !item.isFuture && toggleAttendance(item.dateStr)}
                >
                  <span className="sa-day-number">{item.day}</span>
                  <span className="sa-day-status">
                    {item.isFuture ? '-' : item.isAbsent ? 'Absent' : 'Present'}
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

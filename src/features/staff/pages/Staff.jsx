import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getItems, deleteItem, getDB, addItem, updateItem, logActivity } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import {
  Search, Edit2, Trash2, Users, UserPlus,
  CheckCircle, XCircle, UserCog, Wallet, ChevronRight, X, Calendar,
  Camera, ArrowDownLeft, ArrowUpRight, Package, FileSpreadsheet,
  Clock, ShieldAlert, BookOpen, AlertCircle, Share2, Check,
  ShieldCheck, Filter
} from 'lucide-react';
import StaffModal from '@/features/staff/components/StaffModal';
import StaffAdvanceModal from '@/features/staff/components/StaffAdvanceModal';
import SelfieAttendanceModal from '@/features/staff/components/SelfieAttendanceModal';
import MalKhataModal from '@/features/staff/components/MalKhataModal';
import ShiftManagementModal from '@/features/staff/components/ShiftManagementModal';
import StaffReportsModal from '@/features/staff/components/StaffReportsModal';
import StaffSelfServiceModal from '@/features/staff/components/StaffSelfServiceModal';
import '@/Ledger.css';
import '@/features/staff/styles/Staff.css';

// Curated avatar color palette
const AVATAR_COLORS = [
  '#4f46e5', '#7c3aed', '#059669', '#d97706',
  '#2563eb', '#e11d48', '#0891b2', '#475569'
];

const getAvatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (name = '') =>
  name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || 'S';

const Staff = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [wageFilter, setWageFilter] = useState('all');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceModalType, setAdvanceModalType] = useState('you_gave');
  const [showSelfieModal, setShowSelfieModal] = useState(false);
  const [showMalKhataModal, setShowMalKhataModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [passbookStaff, setPassbookStaff] = useState(null);

  // Quick Attendance Stamper Toggle
  const [showQuickStamper, setShowQuickStamper] = useState(false);
  const [todayAttendanceMap, setTodayAttendanceMap] = useState({});

  // Stats & Filters
  const [todayStats, setTodayStats] = useState({ present: 0, absent: 0, halfDay: 0 });
  const [totalAdvanceOutstanding, setTotalAdvanceOutstanding] = useState(0);
  const [staffAdvanceBalances, setStaffAdvanceBalances] = useState({});
  const [pendingAdvanceRequests, setPendingAdvanceRequests] = useState([]);
  const [cardFilter, setCardFilter] = useState('all'); // 'all', 'active', 'present', 'halfDay', 'absent', 'advance'

  const loadStaffData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // 1. Fetch Staff List
      const data = await getItems('staff', user.id);
      setStaffList(data);

      // 2. Calculate Today's Attendance
      const todayFull = new Date();
      const todayStr = `${todayFull.getFullYear()}-${String(todayFull.getMonth() + 1).padStart(2, '0')}-${String(todayFull.getDate()).padStart(2, '0')}`;
      const monthStr = todayStr.substring(0, 7);

      const attData = await getItems('attendance', user.id);
      const activeStaff = data.filter(s => s.status === 'active');
      const activeStaffIds = activeStaff.map(s => s._dbId || s.id);

      const todayMap = {};
      let absentCount = 0;
      let halfCount = 0;
      let presentCount = 0;

      activeStaffIds.forEach(id => {
        const record = attData.find(a => a.staffId === id && a.month === monthStr);
        const abs = record?.absentDates || [];
        const half = record?.halfDayDates || [];
        const paid = record?.paidLeaveDates || [];
        const wo = record?.weeklyOffDates || [];

        if (abs.includes(todayStr)) {
          todayMap[id] = 'A';
          absentCount++;
        } else if (half.includes(todayStr)) {
          todayMap[id] = 'HD';
          halfCount++;
        } else if (paid.includes(todayStr)) {
          todayMap[id] = 'PL';
          presentCount++;
        } else if (wo.includes(todayStr)) {
          todayMap[id] = 'WO';
        } else {
          todayMap[id] = 'P';
          presentCount++;
        }
      });

      setTodayAttendanceMap(todayMap);
      setTodayStats({
        present: presentCount,
        absent: absentCount,
        halfDay: halfCount
      });

      // 3. Outstanding Advances from staff_ledger
      const ledger = await getItems('staff_ledger', user.id);
      let gaveTotal = 0;
      let gotTotal = 0;
      const advBalances = {};
      ledger.forEach(item => {
        const amt = Number(item.amount) || 0;
        const sId = item.staffId;
        if (!advBalances[sId]) advBalances[sId] = 0;
        if (item.type === 'you_gave') {
          gaveTotal += amt;
          advBalances[sId] += amt;
        } else if (item.type === 'you_got') {
          gotTotal += amt;
          advBalances[sId] -= amt;
        }
      });
      setStaffAdvanceBalances(advBalances);
      setTotalAdvanceOutstanding(Math.max(0, gaveTotal - gotTotal));

      // 4. Pending digital advance requests from staff
      const requests = await getItems('staff_advance_requests', user.id);
      setPendingAdvanceRequests(requests.filter(r => r.status === 'pending'));
    } catch (err) {
      console.error('Failed to load staff management data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadStaffData(); }, [loadStaffData]);

  // Quick Daily Attendance Stamper: Single-click to mark a staff for today
  const handleMarkTodayStatus = async (staffId, status) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const monthStr = todayStr.substring(0, 7);

    try {
      const attData = await getItems('attendance', user.id);
      const existing = attData.find(a => a.staffId === staffId && a.month === monthStr);

      let absentDates = (existing?.absentDates || []).filter(d => d !== todayStr);
      let halfDayDates = (existing?.halfDayDates || []).filter(d => d !== todayStr);
      let paidLeaveDates = (existing?.paidLeaveDates || []).filter(d => d !== todayStr);
      let weeklyOffDates = (existing?.weeklyOffDates || []).filter(d => d !== todayStr);

      if (status === 'A') absentDates.push(todayStr);
      else if (status === 'HD') halfDayDates.push(todayStr);
      else if (status === 'PL') paidLeaveDates.push(todayStr);
      else if (status === 'WO') weeklyOffDates.push(todayStr);

      const payload = {
        staffId,
        month: monthStr,
        absentDates,
        halfDayDates,
        paidLeaveDates,
        weeklyOffDates
      };

      if (existing?._dbId) {
        await updateItem('attendance', existing._dbId, payload, user.id, user.firstName);
      } else {
        await addItem('attendance', payload, user.id, user.firstName);
      }

      setTodayAttendanceMap(prev => ({ ...prev, [staffId]: status }));
      loadStaffData();
    } catch (err) {
      console.error('Failed to mark today status:', err);
    }
  };

  // Mark all active staff as Present today in 1-click
  const handleMarkAllPresentToday = async () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const monthStr = todayStr.substring(0, 7);

    setLoading(true);
    try {
      const attData = await getItems('attendance', user.id);
      const activeStaff = staffList.filter(s => s.status === 'active');

      for (const staff of activeStaff) {
        const mId = staff._dbId || staff.id;
        const existing = attData.find(a => a.staffId === mId && a.month === monthStr);

        const payload = {
          staffId: mId,
          month: monthStr,
          absentDates: (existing?.absentDates || []).filter(d => d !== todayStr),
          halfDayDates: (existing?.halfDayDates || []).filter(d => d !== todayStr),
          paidLeaveDates: (existing?.paidLeaveDates || []).filter(d => d !== todayStr),
          weeklyOffDates: (existing?.weeklyOffDates || []).filter(d => d !== todayStr)
        };

        if (existing?._dbId) {
          await updateItem('attendance', existing._dbId, payload, user.id, user.firstName);
        } else {
          await addItem('attendance', payload, user.id, user.firstName);
        }
      }

      await logActivity(`Marked all ${activeStaff.length} active staff as Present for today`, user.id, user.firstName);
      alert(`Marked all ${activeStaff.length} staff as Present today!`);
      loadStaffData();
    } catch (e) {
      console.error(e);
      alert('Failed to batch mark attendance');
    } finally {
      setLoading(false);
    }
  };

  // Advance Request Approve
  const handleApproveAdvanceRequest = async (request) => {
    if (!window.confirm(`Approve cash advance of ₹${Number(request.amount).toLocaleString('en-IN')} for ${request.staffName}?`)) return;

    try {
      await addItem('staff_ledger', {
        staffId: request.staffId,
        staffName: request.staffName,
        type: 'you_gave',
        category: 'Cash Advance (Digital Request)',
        amount: Number(request.amount),
        date: new Date().toISOString().split('T')[0],
        paymentMode: 'Cash / Direct Transfer',
        notes: `Approved advance request: ${request.reason || 'Personal'}`,
        receiptNo: `ADV-${Date.now().toString().slice(-6)}`
      }, user.id, user.firstName);

      if (request._dbId) {
        await updateItem('staff_advance_requests', request._dbId, {
          ...request,
          status: 'approved',
          approvedAt: new Date().toISOString()
        }, user.id, user.firstName);
      }

      await logActivity(`Approved advance ₹${request.amount} for ${request.staffName}`, user.id, user.firstName);
      alert(`Advance of ₹${request.amount} approved and credited to ${request.staffName}'s Pagar Khata ledger.`);
      loadStaffData();
    } catch (err) {
      console.error(err);
      alert('Failed to approve request.');
    }
  };

  // Advance Request Reject
  const handleRejectAdvanceRequest = async (request) => {
    if (!window.confirm(`Reject advance request for ${request.staffName}?`)) return;
    try {
      if (request._dbId) {
        await updateItem('staff_advance_requests', request._dbId, {
          ...request,
          status: 'rejected',
          rejectedAt: new Date().toISOString()
        }, user.id, user.firstName);
      }
      loadStaffData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEdit = (member) => {
    setEditingData(member);
    setModalOpen(true);
  };

  const handleDelete = async (member) => {
    if (!window.confirm(`Delete ${member.name}? This will remove their profile and records.`)) return;
    const success = await deleteItem('staff', member._dbId || member.id, user.id, user.firstName);
    if (success) {
      setStaffList(prev => prev.filter(s => s.id !== member.id && s._dbId !== member._dbId));
      await logActivity(`Deleted staff profile for ${member.name}`, user.id, user.firstName);
    }
  };

  const handleAddNew = () => {
    setEditingData(null);
    setModalOpen(true);
  };

  const openAdvanceModal = (type) => {
    setAdvanceModalType(type);
    setShowAdvanceModal(true);
  };

  // Filtered staff list
  const filtered = staffList.filter(s => {
    const q = search.toLowerCase();
    const matchSearch =
      (s.name || '').toLowerCase().includes(q) ||
      (s.designation || '').toLowerCase().includes(q) ||
      (s.department || '').toLowerCase().includes(q) ||
      (s.phone || '').includes(q) ||
      (s.email || '').toLowerCase().includes(q);

    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchWage = wageFilter === 'all' || (s.wageType || 'monthly') === wageFilter;

    // Card filter
    const sId = s._dbId || s.id;
    let matchCard = true;
    if (cardFilter === 'active') {
      matchCard = s.status === 'active';
    } else if (cardFilter === 'present') {
      matchCard = todayAttendanceMap[sId] === 'P' || todayAttendanceMap[sId] === 'PL';
    } else if (cardFilter === 'halfDay') {
      matchCard = todayAttendanceMap[sId] === 'HD';
    } else if (cardFilter === 'absent') {
      matchCard = todayAttendanceMap[sId] === 'A';
    } else if (cardFilter === 'advance') {
      matchCard = (staffAdvanceBalances[sId] || 0) > 0;
    }

    return matchSearch && matchStatus && matchWage && matchCard;
  });

  // Payroll & Workforce Metrics
  const totalStaff = staffList.length;
  const activeCount = staffList.filter(s => s.status === 'active').length;
  const inactiveCount = staffList.filter(s => s.status === 'inactive').length;
  const totalSalary = staffList
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (Number(s.salary || s.dailyRate || s.hourlyRate) || 0), 0);
  const activeStaffTotal = activeCount || totalStaff || 1;
  const attendanceRate = totalStaff > 0 ? Math.round((todayStats.present / activeStaffTotal) * 100) : 0;
  const staffWithAdvanceCount = Object.values(staffAdvanceBalances).filter(b => b > 0).length;

  return (
    <div className="l-page" style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: "var(--staff-font, 'Plus Jakarta Sans', 'Inter', sans-serif)" }}>
      {/* Executive Light Header */}
      <div className="l-header" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="l-title" style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.75px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #4f46e5, #2563eb)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)' }}>
              <Users size={22} />
            </div>
            Staff & Pagar Khata Management
          </h1>
          <p style={{ margin: '0.25rem 0 0 3.5rem', color: '#64748b', fontSize: '0.875rem', fontWeight: 500 }}>
            Automate daily attendance, shifts, wages, cash advances & payout slips
          </p>
        </div>

        {/* Action Buttons Matrix with Sleek Scroller Track */}
        <div className="staff-quick-actions-track" style={{ background: '#ffffff', padding: '0.4rem 0.65rem', borderRadius: '16px', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
          <button
            onClick={() => setShowQuickStamper(!showQuickStamper)}
            style={{
              padding: '0.65rem 1.1rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.82rem',
              background: showQuickStamper ? '#2563eb' : '#eff6ff',
              color: showQuickStamper ? '#ffffff' : '#2563eb',
              border: '1.5px solid #bfdbfe', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem',
              whiteSpace: 'nowrap', transition: 'all 0.15s'
            }}
          >
            <Calendar size={15} /> {showQuickStamper ? 'Hide Today Stamper' : '⚡ Quick Attendance'}
          </button>

          <button
            onClick={() => setShowSelfieModal(true)}
            style={{
              padding: '0.65rem 1.1rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.82rem',
              background: '#ffffff', color: '#334155', border: '1.5px solid #e2e8f0',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem',
              whiteSpace: 'nowrap', transition: 'all 0.15s'
            }}
            title="Punch in via employee selfie & workplace GPS"
          >
            <Camera size={15} className="text-indigo-600" /> Geo-Selfie
          </button>

          <button
            onClick={() => openAdvanceModal('you_gave')}
            style={{
              padding: '0.65rem 1.1rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.82rem',
              background: '#fff1f2', color: '#e11d48', border: '1.5px solid #fecdd3',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem',
              whiteSpace: 'nowrap', transition: 'all 0.15s'
            }}
            title="Record cash advance or loan"
          >
            <ArrowDownLeft size={15} /> Give Advance
          </button>

          <button
            onClick={() => openAdvanceModal('you_got')}
            style={{
              padding: '0.65rem 1.1rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.82rem',
              background: '#ecfdf5', color: '#059669', border: '1.5px solid #a7f3d0',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem',
              whiteSpace: 'nowrap', transition: 'all 0.15s'
            }}
            title="Record performance bonus or repayment"
          >
            <ArrowUpRight size={15} /> Add Bonus
          </button>

          <button
            onClick={() => setShowMalKhataModal(true)}
            style={{
              padding: '0.65rem 1.1rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.82rem',
              background: '#ffffff', color: '#334155', border: '1.5px solid #e2e8f0',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem',
              whiteSpace: 'nowrap', transition: 'all 0.15s'
            }}
            title="Log piece-rate production units"
          >
            <Package size={15} className="text-blue-600" /> Mal-Khata
          </button>

          <button
            onClick={() => setShowReportsModal(true)}
            style={{
              padding: '0.65rem 1.1rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.82rem',
              background: '#ffffff', color: '#334155', border: '1.5px solid #e2e8f0',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem',
              whiteSpace: 'nowrap', transition: 'all 0.15s'
            }}
            title="View 31-Day Muster Roll and Salary Register"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" /> Muster Roll
          </button>

          <button
            onClick={() => setShowShiftModal(true)}
            style={{
              padding: '0.65rem 0.95rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.82rem',
              background: '#ffffff', color: '#334155', border: '1.5px solid #e2e8f0',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem',
              whiteSpace: 'nowrap', transition: 'all 0.15s'
            }}
            title="Configure Shift Timings & OT multipliers"
          >
            <Clock size={16} className="text-amber-600" /> Shifts
          </button>

          <button
            className="l-btn-primary"
            onClick={handleAddNew}
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #2563eb)',
              color: 'white', padding: '0.65rem 1.35rem', borderRadius: '12px',
              fontWeight: 800, fontSize: '0.85rem', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)'
            }}
          >
            <UserPlus size={16} /> Add Staff Member
          </button>
        </div>
      </div>

      {/* Pending Digital Advance Requests Alert */}
      {pendingAdvanceRequests.length > 0 && (
        <div style={{
          background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '18px',
          padding: '1.25rem 1.75rem', marginBottom: '1.75rem', display: 'flex',
          flexDirection: 'column', gap: '0.75rem', boxShadow: '0 2px 10px rgba(245, 158, 11, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <AlertCircle size={20} className="text-amber-600" />
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#92400e' }}>
              Pending Staff Advance Requests ({pendingAdvanceRequests.length})
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {pendingAdvanceRequests.map(req => (
              <div
                key={req._dbId || req.id}
                style={{
                  background: 'white', padding: '0.85rem 1.25rem', borderRadius: '12px',
                  border: '1px solid #fef08a', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap'
                }}
              >
                <div>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>{req.staffName}</span> requested{' '}
                  <strong style={{ color: '#b45309', fontWeight: 800 }}>
                    ₹{Number(req.amount).toLocaleString('en-IN')}
                  </strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Reason: <em>"{req.reason || 'General advance'}"</em> • Date: {req.date}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleApproveAdvanceRequest(req)}
                    style={{
                      background: '#10b981', color: 'white', border: 'none',
                      padding: '0.45rem 1rem', borderRadius: '8px', fontWeight: 700,
                      fontSize: '0.75rem', cursor: 'pointer'
                    }}
                  >
                    1-Click Approve & Disburse
                  </button>
                  <button
                    onClick={() => handleRejectAdvanceRequest(req)}
                    style={{
                      background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
                      padding: '0.45rem 0.85rem', borderRadius: '8px', fontWeight: 700,
                      fontSize: '0.75rem', cursor: 'pointer'
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6 Executive Metric Cards with Pure Bold Geometric Numbers & Interactive Filters */}
      <div className="staff-metrics-grid">
        {/* Card 1: Total Staff */}
        <div
          className={`staff-metric-card theme-blue ${cardFilter === 'active' ? 'is-active-filter' : ''}`}
          onClick={() => setCardFilter(prev => prev === 'active' ? 'all' : 'active')}
          title="Click to filter active workforce"
        >
          <div className="staff-metric-top">
            <span className="staff-metric-label">Total Staff</span>
            <div className="staff-metric-icon-wrap blue">
              <Users size={18} />
            </div>
          </div>
          <div className="staff-metric-main">
            <div className="staff-metric-number">{totalStaff}</div>
            <span className="staff-metric-subbadge" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
              Workforce
            </span>
          </div>
          <div className="staff-metric-bottom">
            <span className="staff-metric-pill blue">
              <span className="pill-dot" />
              {activeCount} active, {inactiveCount} inactive
            </span>
            <span className="staff-metric-filter-hint">
              {cardFilter === 'active' ? '● Active' : 'Filter →'}
            </span>
          </div>
        </div>

        {/* Card 2: Present Today */}
        <div
          className={`staff-metric-card theme-emerald ${cardFilter === 'present' ? 'is-active-filter' : ''}`}
          onClick={() => setCardFilter(prev => prev === 'present' ? 'all' : 'present')}
          title="Click to filter staff present today"
        >
          <div className="staff-metric-top">
            <span className="staff-metric-label" style={{ color: '#047857' }}>Present Today</span>
            <div className="staff-metric-icon-wrap emerald">
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="staff-metric-main">
            <div className="staff-metric-number" style={{ color: '#059669' }}>
              {todayStats.present}
            </div>
            <span className="staff-metric-subbadge" style={{ background: '#ecfdf5', color: '#047857' }}>
              {attendanceRate}% rate
            </span>
          </div>
          <div className="staff-metric-progress-track">
            <div
              className="staff-metric-progress-fill"
              style={{
                width: `${Math.min(100, Math.max(0, attendanceRate))}%`,
                background: 'linear-gradient(90deg, #10b981, #059669)'
              }}
            />
          </div>
          <div className="staff-metric-bottom">
            <span className="staff-metric-pill emerald">
              <span className="pill-dot" />
              {todayStats.present === (activeCount || totalStaff) && totalStaff > 0
                ? '100% on duty (All present)'
                : `${todayStats.present} of ${activeCount || totalStaff} on duty`}
            </span>
            <span className="staff-metric-filter-hint">
              {cardFilter === 'present' ? '● Active' : 'Filter →'}
            </span>
          </div>
        </div>

        {/* Card 3: Half-Day Today */}
        <div
          className={`staff-metric-card theme-amber ${cardFilter === 'halfDay' ? 'is-active-filter' : ''}`}
          onClick={() => setCardFilter(prev => prev === 'halfDay' ? 'all' : 'halfDay')}
          title="Click to filter half-day staff"
        >
          <div className="staff-metric-top">
            <span className="staff-metric-label" style={{ color: '#b45309' }}>Half-Day Today</span>
            <div className="staff-metric-icon-wrap amber">
              <Clock size={18} />
            </div>
          </div>
          <div className="staff-metric-main">
            <div className="staff-metric-number" style={{ color: todayStats.halfDay > 0 ? '#d97706' : '#0f172a' }}>
              {todayStats.halfDay}
            </div>
            <span className="staff-metric-subbadge" style={{ background: '#fffbeb', color: '#b45309' }}>
              0.5 shift
            </span>
          </div>
          <div className="staff-metric-bottom">
            {todayStats.halfDay > 0 ? (
              <span className="staff-metric-pill amber">
                <span className="pill-dot" />
                {todayStats.halfDay} logged 0.5 shift
              </span>
            ) : (
              <span className="staff-metric-pill slate">
                <span className="pill-dot" />
                No half-days logged
              </span>
            )}
            <span className="staff-metric-filter-hint">
              {cardFilter === 'halfDay' ? '● Active' : 'Filter →'}
            </span>
          </div>
        </div>

        {/* Card 4: Absent Today */}
        <div
          className={`staff-metric-card ${todayStats.absent > 0 ? 'theme-rose' : 'theme-emerald'} ${cardFilter === 'absent' ? 'is-active-filter' : ''}`}
          onClick={() => setCardFilter(prev => prev === 'absent' ? 'all' : 'absent')}
          title="Click to filter absent staff"
        >
          <div className="staff-metric-top">
            <span className="staff-metric-label" style={{ color: todayStats.absent > 0 ? '#b91c1c' : '#047857' }}>
              Absent Today
            </span>
            <div className={`staff-metric-icon-wrap ${todayStats.absent > 0 ? 'rose' : 'emerald'}`}>
              {todayStats.absent > 0 ? <XCircle size={18} /> : <Check size={18} />}
            </div>
          </div>
          <div className="staff-metric-main">
            <div className="staff-metric-number" style={{ color: todayStats.absent > 0 ? '#dc2626' : '#0f172a' }}>
              {todayStats.absent}
            </div>
            <span
              className="staff-metric-subbadge"
              style={{
                background: todayStats.absent > 0 ? '#fff1f2' : '#ecfdf5',
                color: todayStats.absent > 0 ? '#b91c1c' : '#047857'
              }}
            >
              {todayStats.absent > 0 ? 'Action needed' : 'All clear'}
            </span>
          </div>
          <div className="staff-metric-bottom">
            {todayStats.absent > 0 ? (
              <span className="staff-metric-pill rose">
                <span className="pill-dot" />
                {todayStats.absent} marked absent
              </span>
            ) : (
              <span className="staff-metric-pill emerald">
                <span className="pill-dot" />
                Zero unexcused absents
              </span>
            )}
            <span className="staff-metric-filter-hint">
              {cardFilter === 'absent' ? '● Active' : 'Filter →'}
            </span>
          </div>
        </div>

        {/* Card 5: Monthly Payroll */}
        <div
          className="staff-metric-card theme-indigo"
          onClick={() => setShowReportsModal(true)}
          title="Click to view full salary statement & muster roll"
        >
          <div className="staff-metric-top">
            <span className="staff-metric-label" style={{ color: '#4338ca' }}>Monthly Payroll</span>
            <div className="staff-metric-icon-wrap indigo">
              <Wallet size={18} />
            </div>
          </div>
          <div className="staff-metric-main">
            <div className="staff-metric-number currency" style={{ color: '#3730a3' }}>
              ₹{totalSalary.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="staff-metric-bottom">
            <span className="staff-metric-pill indigo">
              <span className="pill-dot" />
              Active wage base ({activeCount} staff)
            </span>
            <span className="staff-metric-filter-hint">
              Register →
            </span>
          </div>
        </div>

        {/* Card 6: Udhaar (Advances) */}
        <div
          className={`staff-metric-card ${totalAdvanceOutstanding > 0 ? 'theme-coral' : 'theme-emerald'} ${cardFilter === 'advance' ? 'is-active-filter' : ''}`}
          onClick={() => {
            if (totalAdvanceOutstanding > 0) {
              setCardFilter(prev => prev === 'advance' ? 'all' : 'advance');
            } else {
              openAdvanceModal('you_gave');
            }
          }}
          title={totalAdvanceOutstanding > 0 ? "Click to filter staff with pending advances" : "Click to record cash advance"}
        >
          <div className="staff-metric-top">
            <span className="staff-metric-label" style={{ color: totalAdvanceOutstanding > 0 ? '#b91c1c' : '#047857' }}>
              Udhaar (Advances)
            </span>
            <div className={`staff-metric-icon-wrap ${totalAdvanceOutstanding > 0 ? 'coral' : 'emerald'}`}>
              {totalAdvanceOutstanding > 0 ? <ArrowDownLeft size={18} /> : <ShieldCheck size={18} />}
            </div>
          </div>
          <div className="staff-metric-main">
            <div
              className="staff-metric-number currency"
              style={{ color: totalAdvanceOutstanding > 0 ? '#dc2626' : '#059669' }}
            >
              ₹{totalAdvanceOutstanding.toLocaleString('en-IN')}
            </div>
            <span
              className="staff-metric-subbadge"
              style={{
                background: totalAdvanceOutstanding > 0 ? '#fef2f2' : '#ecfdf5',
                color: totalAdvanceOutstanding > 0 ? '#b91c1c' : '#047857'
              }}
            >
              {totalAdvanceOutstanding > 0 ? 'Pending' : 'Zero debt'}
            </span>
          </div>
          <div className="staff-metric-bottom">
            {totalAdvanceOutstanding > 0 ? (
              <span className="staff-metric-pill coral">
                <span className="pill-dot" />
                Pending recovery ({staffWithAdvanceCount} staff)
              </span>
            ) : (
              <span className="staff-metric-pill emerald">
                <span className="pill-dot" />
                All advances cleared (₹0)
              </span>
            )}
            <span className="staff-metric-filter-hint">
              {totalAdvanceOutstanding > 0 ? (cardFilter === 'advance' ? '● Active' : 'Filter →') : 'Give →'}
            </span>
          </div>
        </div>
      </div>

      {/* Active Filter Notification Bar */}
      {cardFilter !== 'all' && (
        <div style={{
          background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '14px',
          padding: '0.65rem 1.15rem', marginBottom: '1.5rem', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: '#1e40af', fontWeight: 700 }}>
            <Filter size={16} className="text-blue-600" />
            <span>
              Showing <strong>{filtered.length}</strong> staff filtered by{' '}
              <strong style={{ textDecoration: 'underline' }}>
                {cardFilter === 'active' && 'Active Workforce'}
                {cardFilter === 'present' && 'Present Today'}
                {cardFilter === 'halfDay' && 'Half-Day Today'}
                {cardFilter === 'absent' && 'Absent Today'}
                {cardFilter === 'advance' && 'Pending Udhaar / Advances'}
              </strong>
            </span>
          </div>
          <button
            onClick={() => setCardFilter('all')}
            style={{
              background: '#ffffff', border: '1.5px solid #93c5fd', borderRadius: '10px',
              padding: '0.35rem 0.85rem', fontSize: '0.78rem', fontWeight: 700,
              color: '#1d4ed8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
              transition: 'all 0.15s'
            }}
          >
            <X size={14} /> Clear Card Filter
          </button>
        </div>
      )}

      {/* TODAY'S QUICK ATTENDANCE STAMPER WITH SLIM SCROLLER */}
      {showQuickStamper && (
        <div style={{
          background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '20px',
          padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} className="text-blue-600" />
                Today's Daily Attendance Stamper ({new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Single-tap P (Present), HD (Half-Day), A (Absent), or PL (Paid Leave) for each employee.
              </p>
            </div>

            <button
              onClick={handleMarkAllPresentToday}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white',
                border: 'none', padding: '0.6rem 1.35rem', borderRadius: '12px',
                fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.45rem',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
              }}
            >
              <CheckCircle size={15} /> Mark All Present Today
            </button>
          </div>

          {/* Scrollable Container with Slim Custom Scrollbar */}
          <div className="staff-stamper-scroll">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '0.85rem' }}>
              {staffList.filter(s => s.status === 'active').map(staff => {
                const mId = staff._dbId || staff.id;
                const currentStatus = todayAttendanceMap[mId] || 'P';

                return (
                  <div
                    key={mId}
                    style={{
                      background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '14px',
                      border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', gap: '0.75rem', transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {staff.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                        {staff.designation || 'Staff'} • {staff.shiftName?.split(' ')[0] || 'Day'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button
                        onClick={() => handleMarkTodayStatus(mId, 'P')}
                        title="Present"
                        style={{
                          padding: '0.4rem 0.65rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800,
                          border: currentStatus === 'P' ? '2px solid #22c55e' : '1px solid #cbd5e1',
                          background: currentStatus === 'P' ? '#dcfce7' : '#ffffff',
                          color: currentStatus === 'P' ? '#15803d' : '#64748b', cursor: 'pointer'
                        }}
                      >
                        P
                      </button>
                      <button
                        onClick={() => handleMarkTodayStatus(mId, 'HD')}
                        title="Half-Day (0.5)"
                        style={{
                          padding: '0.4rem 0.65rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800,
                          border: currentStatus === 'HD' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                          background: currentStatus === 'HD' ? '#fef3c7' : '#ffffff',
                          color: currentStatus === 'HD' ? '#b45309' : '#64748b', cursor: 'pointer'
                        }}
                      >
                        HD
                      </button>
                      <button
                        onClick={() => handleMarkTodayStatus(mId, 'A')}
                        title="Absent"
                        style={{
                          padding: '0.4rem 0.65rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800,
                          border: currentStatus === 'A' ? '2px solid #ef4444' : '1px solid #cbd5e1',
                          background: currentStatus === 'A' ? '#fee2e2' : '#ffffff',
                          color: currentStatus === 'A' ? '#dc2626' : '#64748b', cursor: 'pointer'
                        }}
                      >
                        A
                      </button>
                      <button
                        onClick={() => handleMarkTodayStatus(mId, 'PL')}
                        title="Paid Leave"
                        style={{
                          padding: '0.4rem 0.65rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800,
                          border: currentStatus === 'PL' ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                          background: currentStatus === 'PL' ? '#dbeafe' : '#ffffff',
                          color: currentStatus === 'PL' ? '#1d4ed8' : '#64748b', cursor: 'pointer'
                        }}
                      >
                        PL
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Toolbar / Search & Filter Controls */}
      <div className="l-control-bar" style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '18px', padding: '1rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(15,23,42,0.02)' }}>
        <div className="l-search-box" style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px' }}>
          <Search className="l-search-icon" size={18} style={{ color: '#94a3b8' }} />
          <input
            className="l-search-input"
            placeholder="Search by employee name, role, mobile, department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'transparent', fontFamily: "var(--staff-font, 'Plus Jakarta Sans', 'Inter', sans-serif)" }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <div className="l-filters" style={{ borderRadius: '12px', background: '#f1f5f9', padding: '0.25rem' }}>
            {['all', 'active', 'inactive'].map(st => (
              <button
                key={st}
                className={`l-filter-btn ${filterStatus === st ? 'active' : ''}`}
                onClick={() => setFilterStatus(st)}
                style={{
                  background: filterStatus === st ? '#2563eb' : 'transparent',
                  color: filterStatus === st ? '#ffffff' : '#64748b',
                  fontWeight: 700, padding: '0.5rem 1rem', borderRadius: '8px', border: 'none'
                }}
              >
                {st.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Wage Type Filter */}
          <select
            value={wageFilter}
            onChange={e => setWageFilter(e.target.value)}
            style={{
              padding: '0.55rem 0.95rem', borderRadius: '12px', border: '1.5px solid #e2e8f0',
              background: '#ffffff', color: '#0f172a', fontWeight: 700, fontSize: '0.85rem',
              fontFamily: "var(--staff-font, 'Plus Jakarta Sans', 'Inter', sans-serif)"
            }}
          >
            <option value="all">All Wage Types</option>
            <option value="monthly">Monthly Fixed</option>
            <option value="daily">Daily Wager</option>
            <option value="hourly">Hourly Wage</option>
            <option value="piece_rate">Mal-Khata Piece</option>
          </select>
        </div>
      </div>

      {/* Staff Accounts List */}
      <div className="l-accounts-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {filtered.map(member => {
          const initial = getInitials(member.name);
          const mId = member._dbId || member.id;
          const wageT = member.wageType || 'monthly';
          const todayStatus = todayAttendanceMap[mId] || 'P';

          return (
            <div
              key={mId}
              className="l-account-row group"
              onClick={() => navigate(`/staff/account/${mId}`)}
              title={`View ${member.name}'s Account`}
              style={{
                background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '18px',
                padding: '1.25rem 1.5rem', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'pointer'
              }}
            >
              {/* Left Profile Info */}
              <div className="l-account-left" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div
                  className="l-avatar"
                  style={{
                    background: getAvatarColor(member.name), color: 'white',
                    width: 52, height: 52, borderRadius: 16, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.25rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                >
                  {initial}
                </div>

                <div className="l-account-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <h3 className="l-account-name" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                      {member.name}
                    </h3>

                    {/* Today's Status Pill */}
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '8px',
                      background: todayStatus === 'P' ? '#ecfdf5' : todayStatus === 'HD' ? '#fffbeb' : todayStatus === 'A' ? '#fff1f2' : '#eff6ff',
                      color: todayStatus === 'P' ? '#047857' : todayStatus === 'HD' ? '#b45309' : todayStatus === 'A' ? '#e11d48' : '#1e40af',
                      border: `1px solid ${todayStatus === 'P' ? '#a7f3d0' : todayStatus === 'HD' ? '#fde68a' : todayStatus === 'A' ? '#fecdd3' : '#bfdbfe'}`
                    }}>
                      Today: {todayStatus === 'P' ? 'Present' : todayStatus === 'HD' ? 'Half-Day' : todayStatus === 'A' ? 'Absent' : 'Leave'}
                    </span>
                  </div>

                  <div className="l-account-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                    <span style={{ background: '#eef2ff', color: '#4338ca', fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 700 }}>
                      {member.designation || 'Staff'}
                    </span>
                    <span style={{ background: '#f0fdf4', color: '#166534', fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 700 }}>
                      {wageT === 'daily' ? 'Daily Wager' : wageT === 'hourly' ? 'Hourly' : wageT === 'piece_rate' ? 'Piece-Rate' : 'Monthly Fixed'}
                    </span>
                    <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 500 }}>
                      {member.phone || member.department || 'Operations'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Salary & Actions */}
              <div className="l-account-right" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div className="l-balance-wrapper" style={{ textAlign: 'right' }}>
                  <div className="l-balance-amount" style={{ color: '#0f172a', fontWeight: 900, fontSize: '1.35rem', letterSpacing: '-0.5px' }}>
                    {member.salary || member.dailyRate || member.hourlyRate
                      ? `₹${Number(member.salary || member.dailyRate || member.hourlyRate).toLocaleString('en-IN')}`
                      : '—'}
                  </div>
                  <div className="l-balance-label" style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                    {member.status?.toUpperCase()} • {wageT.toUpperCase()}
                  </div>
                </div>

                {/* Quick Row Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPassbookStaff(member); }}
                    style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', color: '#2563eb', padding: '0.5rem 0.85rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    title="Open employee passbook & Udhaar statement"
                  >
                    <BookOpen size={14} /> Passbook
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/staff/account/${mId}`); }}
                    style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#334155', padding: '0.5rem 0.85rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                    title="Attendance Calendar"
                  >
                    Attendance
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/staff/profile/${mId}`); }}
                    style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#334155', padding: '0.5rem 0.85rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                    title="Full Profile"
                  >
                    Profile
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(member); }}
                    style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#475569', width: 36, height: 36, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    title="Edit Staff"
                  >
                    <Edit2 size={15} />
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(member); }}
                    style={{ background: '#fff1f2', border: '1.5px solid #fee2e2', color: '#dc2626', width: 36, height: 36, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    title="Delete Staff"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ background: '#ffffff', borderRadius: '20px', border: '1.5px solid #e2e8f0', padding: '4rem 2rem', textAlign: 'center' }}>
            <Users size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem', display: 'block' }} />
            <h3 style={{ color: '#0f172a', fontWeight: 800, margin: '0 0 0.5rem' }}>No Staff Members Found</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
              {search ? 'No employees match your search query.' : 'Get started by adding your first employee to track attendance and salaries.'}
            </p>
            <button
              onClick={handleAddNew}
              style={{
                background: '#2563eb', color: 'white', border: 'none',
                padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 700,
                fontSize: '0.875rem', cursor: 'pointer'
              }}
            >
              + Add First Staff Member
            </button>
          </div>
        )}
      </div>

      {/* MODALS */}
      <StaffModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={loadStaffData}
        editingData={editingData}
      />

      <StaffAdvanceModal
        isOpen={showAdvanceModal}
        onClose={() => setShowAdvanceModal(false)}
        staffList={staffList.filter(s => s.status === 'active')}
        onSaved={loadStaffData}
      />

      <SelfieAttendanceModal
        isOpen={showSelfieModal}
        onClose={() => setShowSelfieModal(false)}
        staffList={staffList.filter(s => s.status === 'active')}
        onAttendanceMarked={loadStaffData}
      />

      <MalKhataModal
        isOpen={showMalKhataModal}
        onClose={() => setShowMalKhataModal(false)}
        staffList={staffList.filter(s => s.status === 'active')}
        onSaved={loadStaffData}
      />

      <ShiftManagementModal
        isOpen={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        onSave={loadStaffData}
      />

      <StaffReportsModal
        isOpen={showReportsModal}
        onClose={() => setShowReportsModal(false)}
        staffList={staffList}
      />

      <StaffSelfServiceModal
        isOpen={Boolean(passbookStaff)}
        onClose={() => setPassbookStaff(null)}
        staffMember={passbookStaff}
        onAdvanceRequested={loadStaffData}
      />
    </div>
  );
};

export default Staff;

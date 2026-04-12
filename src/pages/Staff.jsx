import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getItems, deleteItem, getDB, addItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import {
  Search, Edit2, Trash2, Users, UserPlus,
  CheckCircle, XCircle, UserCog, Wallet, ChevronRight, X, Calendar
} from 'lucide-react';
import StaffModal from '../components/StaffModal';
import '../Ledger.css';
import './Staff.css';

// Avatar colour palette
const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
];

const getAvatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (name = '') =>
  name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('');

const Employment = ({ type }) => {
  const map = {
    fulltime: { label: 'Full-time', cls: 'fulltime' },
    parttime: { label: 'Part-time', cls: 'parttime' },
    contract: { label: 'Contract', cls: 'contract' },
  };
  const t = map[type] || { label: type || '—', cls: '' };
  return <span className={`staff-badge ${t.cls}`}>{t.label}</span>;
};

const Staff = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [actionMember, setActionMember] = useState(null);
  const [todayStats, setTodayStats] = useState({ present: 0, absent: 0 });
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [salaryDateNum, setSalaryDateNum] = useState(1);

  const loadStaff = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    // 1. Fetch Staff List
    const data = await getItems('staff', user.id);
    setStaffList(data);

    // 2. Calculate Today's Attendance
    const todayFull = new Date();
    const todayStr = todayFull.getFullYear() + '-' + String(todayFull.getMonth() + 1).padStart(2, '0') + '-' + String(todayFull.getDate()).padStart(2, '0');
    const monthStr = todayStr.substring(0, 7); // YYYY-MM

    const attData = await getItems('attendance', user.id);
    const monthAtt = attData.filter(a => a.month === monthStr);

    const activeStaff = data.filter(s => s.status === 'active');
    const activeStaffIds = activeStaff.map(s => s._dbId || s.id);

    const absentTodayCount = monthAtt.filter(a =>
      activeStaffIds.includes(a.staffId) && a.absentDates.includes(todayStr)
    ).length;

    setTodayStats({
      absent: absentTodayCount,
      present: Math.max(0, activeStaff.length - absentTodayCount)
    });

    // Check global settings for salary cycle day
    const db = getDB();
    const cycleStart = parseInt(db?.company?.salaryCycleStart) || 1;
    setSalaryDateNum(cycleStart);

    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const handleBulkPay = async () => {
    if (!window.confirm("Record salary for ALL active staff based on their current attendance?")) return;
    
    setLoading(true);
    const currentDate = new Date();
    const monthLong = currentDate.toLocaleString('default', { month: 'long' });
    const year = currentDate.getFullYear();
    const daysInMonth = new Date(year, currentDate.getMonth() + 1, 0).getDate();
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const allHistory = await getItems('salary_history', user.id);
    const attData = await getItems('attendance', user.id);
    const formattedMonth = year + '-' + String(currentDate.getMonth() + 1).padStart(2, '0');
    
    let processedCount = 0;

    for (const member of staffList) {
      if (member.status !== 'active') continue;
      const mId = member._dbId || member.id;
      
      const exists = allHistory.find(h => h.staffId === mId && h.month === monthLong && h.year === year);
      if (exists) continue; // Skip already paid
      
      const memberAtt = attData.find(a => a.staffId === mId && a.month === formattedMonth) || {};
      const absences = (memberAtt.absentDates || []);
      const paidLeaves = (memberAtt.paidLeaveDates || []);
      
      let joinDateObj = null;
      if (member.joinDate) {
        joinDateObj = new Date(member.joinDate);
        joinDateObj.setHours(0,0,0,0);
      }
      
      let presentCount = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dObj = new Date(year, currentDate.getMonth(), d);
        if (dObj > today) continue;
        if (joinDateObj && dObj < joinDateObj) continue;
        
        const dStr = dObj.getFullYear() + '-' + String(dObj.getMonth()+1).padStart(2,'0') + '-' + String(dObj.getDate()).padStart(2,'0');
        if (!absences.includes(dStr) && !paidLeaves.includes(dStr)) {
          presentCount++;
        }
      }
      
      const baseSal = Number(member.salary) || 0;
      const totalPayable = presentCount + paidLeaves.length;
      const dailyWage = baseSal / daysInMonth;
      const calculatedSalary = dailyWage * totalPayable;
      
      const pData = {
        staffId: mId,
        month: monthLong,
        year: year,
        baseSalary: baseSal,
        netSalary: calculatedSalary,
        absences: absences.length,
        paidLeaves: paidLeaves.length,
        attendanceDays: daysInMonth,
        dateOfPayment: new Date().toISOString(),
        status: 'paid'
      };
      
      await addItem('salary_history', pData, user.id, user.firstName);
      processedCount++;
    }
    
    setLoading(false);
    setAlertDismissed(true);
    if(processedCount > 0) alert(`Successfully recorded payments for ${processedCount} active staff members!`);
    else alert(`No new payments recorded. All active staff might be already paid for this month.`);
  };

  const handleEdit = (member) => {
    setEditingData(member);
    setModalOpen(true);
    setActionMember(null); // Close action modal if edit starts
  };

  const handleDelete = async (member) => {
    if (!window.confirm(`Delete ${member.name}? This cannot be undone.`)) return;
    const success = await deleteItem('staff', member._dbId || member.id, user.id, user.firstName);
    if (success) {
      setStaffList(prev => prev.filter(s => s.id !== member.id && s._dbId !== member._dbId));
      setActionMember(null);
    }
  };

  const handleAddNew = () => {
    setEditingData(null);
    setModalOpen(true);
  };

  // Filtered list
  const filtered = staffList.filter(s => {
    const q = search.toLowerCase();
    const matchSearch =
      (s.name || '').toLowerCase().includes(q) ||
      (s.designation || '').toLowerCase().includes(q) ||
      (s.department || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Stats
  const totalStaff = staffList.length;
  const activeCount = staffList.filter(s => s.status === 'active').length;
  const inactiveCount = staffList.filter(s => s.status === 'inactive').length;
  const totalSalary = staffList
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (Number(s.salary) || 0), 0);

  // ── Action Modal Component ──
  const ActionModal = ({ member, onClose }) => {
    if (!member) return null;
    const initial = getInitials(member.name);
    const mId = member._dbId || member.id;

    return (
      <div className="staff-action-overlay" onClick={onClose}>
        <div className="staff-action-container" onClick={e => e.stopPropagation()}>
          <button className="staff-action-close" onClick={onClose}><X size={18} /></button>
          
          <div className="staff-action-header">
            <div className="staff-action-avatar" style={{ background: getAvatarColor(member.name) }}>
              {initial}
            </div>
            <h2 className="staff-action-name">{member.name}</h2>
            <div className="staff-action-sub">{member.designation || 'Staff Member'} • {member.department || 'General'}</div>
          </div>

          <div className="staff-action-list">
            <button className="staff-action-btn-large" onClick={() => { navigate(`/staff/profile/${mId}`); onClose(); }}>
              <div className="staff-action-icon-box" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
                <UserCog size={24} />
              </div>
              <div className="staff-action-info">
                <div className="staff-action-title">Staff Details</div>
                <div className="staff-action-desc">View full profile, identity & employment info</div>
              </div>
              <ChevronRight size={18} opacity={0.3} />
            </button>

            <button className="staff-action-btn-large" onClick={() => { navigate(`/staff/account/${mId}`); onClose(); }}>
              <div className="staff-action-icon-box" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>
                <Calendar size={24} />
              </div>
              <div className="staff-action-info">
                <div className="staff-action-title">Attendance</div>
                <div className="staff-action-desc">Manage monthly attendance & leave logs</div>
              </div>
              <ChevronRight size={18} opacity={0.3} />
            </button>

            <button className="staff-action-btn-large" onClick={() => { navigate(`/staff/salary-history/${mId}`); onClose(); }}>
              <div className="staff-action-icon-box" style={{ background: 'rgba(244,63,94,0.2)', color: '#f43f5e' }}>
                <Wallet size={24} />
              </div>
              <div className="staff-action-info">
                <div className="staff-action-title">Salary History</div>
                <div className="staff-action-desc">View all past payments & earnings records</div>
              </div>
              <ChevronRight size={18} opacity={0.3} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="l-page">
      {/* Header */}
      <div className="l-header">
        <h1 className="l-title">
          <div className="l-title-icon"><Users size={24} /></div>
          Staff Management
        </h1>
        <button className="l-btn-primary" onClick={handleAddNew}>
          <UserPlus size={18} /> Add Staff
        </button>
      </div>

      {new Date().getDate() === salaryDateNum && !alertDismissed && (
        <div style={{
          background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
          borderLeft: '4px solid #8b5cf6',
          padding: '1.25rem 2rem',
          borderRadius: '16px',
          margin: '0 0 1.5rem 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          boxShadow: '0 4px 15px rgba(139, 92, 246, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              background: 'white',
              padding: '0.75rem',
              borderRadius: '50%',
              color: '#8b5cf6',
              display: 'flex',
              boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
            }}>
              <Wallet size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#4c1d95', fontSize: '1.1rem', fontWeight: '800' }}>Salary Processing Day</h3>
              <p style={{ margin: '0.25rem 0 0 0', color: '#5b21b6', fontSize: '0.9rem', fontWeight: '600' }}>
                Today is your company's salary day (the {salaryDateNum}{['st', 'nd', 'rd'][((salaryDateNum + 90) % 100 - 10) % 10 - 1] || 'th'}). Do you paid salary to all workers?
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              onClick={() => setAlertDismissed(true)}
              style={{
                background: 'transparent',
                color: '#6d28d9',
                border: '1.5px solid #a78bfa',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#f5f3ff'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              Dismiss
            </button>
            <button 
              onClick={handleBulkPay}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                border: 'none',
                padding: '0.6rem 1.5rem',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <CheckCircle size={18} /> Paid All
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="l-dashboard s-dashboard">
        <div className="l-card" style={{ borderLeft: '6px solid #3b82f6' }}>
          <div className="l-card-header">
            <span className="l-card-label" style={{ color: '#2563eb' }}>Total Staff</span>
            <div className="l-card-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><Users size={24} /></div>
          </div>
          <div className="l-card-value">{totalStaff}</div>
          <div className="l-card-subtext">Registered employees</div>
        </div>

        <div className="l-card receivable">
          <div className="l-card-header">
            <span className="l-card-label">Active</span>
            <div className="l-card-icon"><CheckCircle size={24} /></div>
          </div>
          <div className="l-card-value">{activeCount}</div>
          <div className="l-card-subtext">Currently working</div>
        </div>

        <div className="l-card payable">
          <div className="l-card-header">
            <span className="l-card-label">Inactive</span>
            <div className="l-card-icon"><XCircle size={24} /></div>
          </div>
          <div className="l-card-value">{inactiveCount}</div>
          <div className="l-card-subtext">Past employees</div>
        </div>

        <div className="l-card" style={{ borderLeft: '6px solid #8b5cf6' }}>
          <div className="l-card-header">
            <span className="l-card-label" style={{ color: '#7c3aed' }}>Monthly Payroll</span>
            <div className="l-card-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}><Wallet size={24} /></div>
          </div>
          <div className="l-card-value">₹{totalSalary.toLocaleString('en-IN')}</div>
          <div className="l-card-subtext">Total active salary</div>
        </div>

        <div className="l-card" style={{ borderLeft: '6px solid #10b981' }}>
          <div className="l-card-header">
            <span className="l-card-label" style={{ color: '#059669' }}>Present Today</span>
            <div className="l-card-icon" style={{ background: '#d1fae5', color: '#059669' }}><CheckCircle size={24} /></div>
          </div>
          <div className="l-card-value" style={{ color: '#059669' }}>{todayStats.present}</div>
          <div className="l-card-subtext">Available staff members</div>
        </div>

        <div className="l-card" style={{ borderLeft: '6px solid #ef4444' }}>
          <div className="l-card-header">
            <span className="l-card-label" style={{ color: '#dc2626' }}>Absent Today</span>
            <div className="l-card-icon" style={{ background: '#fee2e2', color: '#dc2626' }}><XCircle size={24} /></div>
          </div>
          <div className="l-card-value" style={{ color: '#dc2626' }}>{todayStats.absent}</div>
          <div className="l-card-subtext">Staff marked absent</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="l-control-bar">
        <div className="l-search-box">
          <Search className="l-search-icon" size={20} />
          <input
            className="l-search-input"
            placeholder="Search by name, designation, department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="l-filters">
          <button
            className={`l-filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All
          </button>
          <button
            className={`l-filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
            onClick={() => setFilterStatus('active')}
          >
            Active
          </button>
          <button
            className={`l-filter-btn ${filterStatus === 'inactive' ? 'active' : ''}`}
            onClick={() => setFilterStatus('inactive')}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Accounts List */}
      <div className="l-accounts-list">
        {filtered.map(member => {
          const initial = getInitials(member.name) || '?';

          return (
            <div
              key={member._dbId || member.id}
              className="l-account-row group"
              onClick={() => setActionMember(member)}
              title={`View ${member.name}'s Account`}
            >
              <div className="l-account-left">
                <div
                  className="l-avatar"
                  style={{ background: getAvatarColor(member.name), color: 'white' }}
                >
                  {initial}
                </div>
                <div className="l-account-info">
                  <h3 className="l-account-name">{member.name}</h3>
                  <div className="l-account-meta">
                    <span className="l-account-type" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                      {member.designation || 'Staff'}
                    </span>
                    <span className="l-account-phone">{member.phone || member.department || 'No details'}</span>
                  </div>
                </div>
              </div>

              <div className="l-account-right">
                <div className="l-balance-wrapper">
                  <div className="l-balance-amount" style={{ color: '#1e293b' }}>
                    {member.salary ? `₹${Number(member.salary).toLocaleString('en-IN')}` : '—'}
                  </div>
                  <div className="l-balance-label">
                    {member.status === 'active' ? 'ACTIVE' : 'INACTIVE'} • {(member.employmentType || '').toUpperCase()}
                  </div>
                </div>

                <div className="staff-actions ml-4">
                  <button
                    className="staff-action-btn"
                    style={{ zIndex: 10, position: 'relative' }}
                    onClick={(e) => { e.stopPropagation(); handleEdit(member); }}
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="staff-action-btn"
                    style={{ zIndex: 10, position: 'relative' }}
                    onClick={(e) => { e.stopPropagation(); handleDelete(member); }}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="l-arrow-icon ml-2">
                    <ChevronRight size={24} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="l-empty-state">
            <UserCog className="l-empty-icon" size={64} />
            <div className="l-empty-text">No staff found matching your criteria.</div>
          </div>
        )}
      </div>

      <StaffModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={loadStaff}
        editingData={editingData}
      />

      <ActionModal 
        member={actionMember} 
        onClose={() => setActionMember(null)} 
      />
    </div>

  );
};

export default Staff;

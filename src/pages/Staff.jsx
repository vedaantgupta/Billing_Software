import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getItems, deleteItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import {
  Search, Edit2, Trash2, Users, UserPlus,
  CheckCircle, XCircle, UserCog, Wallet, ChevronRight
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
  const [todayStats, setTodayStats] = useState({ present: 0, absent: 0 });

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

    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const handleEdit = (member) => {
    setEditingData(member);
    setModalOpen(true);
  };

  const handleDelete = async (member) => {
    if (!window.confirm(`Delete ${member.name}? This cannot be undone.`)) return;
    const success = await deleteItem('staff', member._dbId || member.id, user.id, user.firstName);
    if (success) setStaffList(prev => prev.filter(s => s.id !== member.id && s._dbId !== member._dbId));
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
              onClick={() => navigate(`/staff/account/${member._dbId || member.id}`)}
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
    </div>
  );
};

export default Staff;

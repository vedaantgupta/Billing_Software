import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getItems } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import {
  ArrowLeft, Phone, Mail, MapPin, CreditCard, Building2,
  Wallet, ArrowDownLeft, ArrowUpRight, ChevronRight, 
  Shield, User, Hash, Edit2, BookOpen, Briefcase, 
  Calendar, Landmark, CheckCircle, AlertCircle, FilePlus,
  FileText, TrendingUp, UserCheck, UserMinus
} from 'lucide-react';
import './StaffProfile.css';

/* ── Info Row Component ── */
const InfoRow = ({ icon: Icon, label, value, chip }) => {
  const isPhone = label?.toLowerCase().includes('phone');
  const isEmail = label?.toLowerCase().includes('email');

  let formattedValue = value;
  if (value && isPhone) {
    formattedValue = <a href={`tel:${value}`} className="sp-link">{value}</a>;
  } else if (value && isEmail) {
    formattedValue = <a href={`mailto:${value}`} className="sp-link">{value}</a>;
  }

  return (
    <div className="sp-info-row">
      <div className="sp-info-icon-wrap"><Icon size={15} /></div>
      <div style={{ flex: 1 }}>
        <div className="sp-info-label">{label}</div>
        {chip ? chip : (
          <div className={`sp-info-value ${!value ? 'muted' : ''}`}>
            {formattedValue || 'Not provided'}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Card Component ── */
const Card = ({ icon: Icon, title, children, style }) => (
  <div className="sp-card" style={style}>
    <div className="sp-card-header">
      <div className="sp-card-title-wrap">
        <Icon size={18} className="text-indigo-400" />
        <span className="sp-card-label">{title}</span>
      </div>
    </div>
    <div className="sp-card-content">
      {children}
    </div>
  </div>
);

const StaffProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [staff, setStaff] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.id || !id) return;
    setLoading(true);
    try {
      // 1. Fetch Staff
      const staffList = await getItems('staff', user.id);
      const member = staffList.find(s => (s._dbId === id || s.id === id));
      setStaff(member || null);

      if (member) {
        // 2. Fetch Attendance for stats
        const attData = await getItems('attendance', user.id);
        const today = new Date();
        const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        
        const record = attData.find(a => 
          (a.staffId === (member._dbId || member.id)) && a.month === monthStr
        );

        if (record) {
          const abs = (record.absentDates || []).length;
          const paid = (record.paidLeaveDates || []).length;
          const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
          
          setAttendanceStats({
            absent: abs,
            paid: paid,
            present: Math.max(0, daysInMonth - abs - (today.getDate() < daysInMonth ? daysInMonth - today.getDate() : 0)), // Approx present so far
            total: daysInMonth
          });
        }
      }
    } catch (err) {
      console.error('Failed to load staff profile:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return (
    <div className="sp-page">
      <div className="sp-loading">
        <div className="sp-spinner" />
        <div className="sp-loading-text">Loading profile...</div>
      </div>
    </div>
  );

  if (!staff) return (
    <div className="sp-page">
      <div className="sp-loading">
        <AlertCircle size={52} style={{ color: '#f43f5e', opacity: 0.6 }} />
        <div className="sp-loading-text">Staff member not found</div>
        <button className="sp-back-btn" onClick={() => navigate('/staff')} style={{ marginTop: '0.5rem' }}>
          Back to Staff List
        </button>
      </div>
    </div>
  );

  const name = staff.name || 'Unknown Staff';
  const initial = name[0].toUpperCase();
  const status = staff.status || 'active';
  const salary = Number(staff.salary || 0);

  const quickActions = [
    { icon: Wallet,       bg: 'rgba(99,102,241,0.2)',  color: '#a78bfa', title: 'Manage Attendance', sub: 'View/Mark attendance log', onClick: () => navigate(`/staff/account/${id}`) },
    { icon: TrendingUp,   bg: 'rgba(16,185,129,0.2)',  color: '#34d399', title: 'Generate Payslip',  sub: 'Calculate & print monthly slip', onClick: () => navigate(`/staff/account/${id}`) },
    { icon: Phone,        bg: 'rgba(20,184,166,0.2)',  color: '#2dd4bf', title: staff.phone ? `Call ${staff.phone}` : 'No Phone', sub: 'Open device dialer', onClick: () => staff.phone && window.open(`tel:${staff.phone}`) },
  ];

  return (
    <div className="sp-page">
      <div className="sp-content">
        
        {/* Breadcrumb */}
        <div className="sp-back-row">
          <button className="sp-back-btn" onClick={() => navigate('/staff')}>
            <ArrowLeft size={15} /> Back
          </button>
          <span className="sp-breadcrumb">Staff Management &nbsp;/&nbsp; <span>{name}</span></span>
        </div>

        {/* Hero */}
        <div className="sp-hero">
          <div className="sp-hero-gradient" />
          <div className="sp-hero-shimmer" />
          <div className="sp-hero-body">
            <div className="sp-avatar-wrapper">
              <div className="sp-avatar-ring" />
              <div className="sp-hero-avatar">{initial}</div>
            </div>

            <div className="sp-hero-info">
              <h1 className="sp-hero-name">{name}</h1>
              <div className="sp-hero-chips">
                <span className={`sp-chip ${status}`}>{status}</span>
                <span className="sp-chip role">{staff.designation || 'Staff Member'}</span>
                <span className="sp-chip role" style={{ opacity: 0.8 }}>{staff.department || 'General'}</span>
              </div>

              <div className="sp-hero-contact-info">
                {staff.phone && (
                  <a href={`tel:${staff.phone}`} className="sp-hero-contact-item">
                    <Phone size={13} /> {staff.phone}
                  </a>
                )}
                {staff.email && (
                  <a href={`mailto:${staff.email}`} className="sp-hero-contact-item">
                    <Mail size={13} /> {staff.email}
                  </a>
                )}
              </div>
            </div>

            <div className="sp-hero-actions">
              <button className="sp-back-btn" style={{ background: 'rgba(99,102,241,0.2)', color: '#c7d2fe' }} onClick={() => navigate(`/staff/account/${id}`)}>
                <Calendar size={15} /> Attendance
              </button>
              <button className="sp-back-btn" onClick={() => navigate('/staff', { state: { editId: id } })}>
                <Edit2 size={15} /> Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="sp-stats">
          <div className="sp-stat salary">
            <div className="sp-stat-icon-box"><Wallet size={18} /></div>
            <div className="sp-stat-label">Monthly Salary</div>
            <div className="sp-stat-value">₹{salary.toLocaleString()}</div>
            <div className="sp-stat-sub">Fixed Pay Rate</div>
          </div>
          <div className="sp-stat present">
            <div className="sp-stat-icon-box"><UserCheck size={18} /></div>
            <div className="sp-stat-label">Present (Current Month)</div>
            <div className="sp-stat-value">{attendanceStats.present} Days</div>
            <div className="sp-stat-sub">Work days so far</div>
          </div>
          <div className="sp-stat absent">
            <div className="sp-stat-icon-box"><UserMinus size={18} /></div>
            <div className="sp-stat-label">Unpaid Absent</div>
            <div className="sp-stat-value">{attendanceStats.absent} Days</div>
            <div className="sp-stat-sub">Deducted from salary</div>
          </div>
        </div>

        {/* Full Width 1: Basic Information */}
        <Card icon={User} title="Basic Information" style={{ marginBottom: '1.5rem' }}>
          <div className="sp-info-grid">
            <InfoRow icon={User} label="Full Name" value={staff.name} />
            <InfoRow icon={Hash} label="Staff ID" value={staff._dbId || staff.id} />
            <InfoRow icon={Phone} label="Phone Number" value={staff.phone} />
            <InfoRow icon={Mail} label="Email Address" value={staff.email} />
            <InfoRow icon={Shield} label="PAN Number" value={staff.panNumber} />
            <InfoRow icon={Shield} label="UAN Number" value={staff.uanNumber} />
            <InfoRow icon={Shield} label="ESI Number" value={staff.esiNumber} />
            <InfoRow icon={Calendar} label="Date of Birth" value={staff.dob} />
          </div>
        </Card>

        {/* Full Width 2: Residential Address */}
        <Card icon={MapPin} title="Residential Address" style={{ marginBottom: '1.5rem' }}>
          <div className="sp-info-grid">
            <div style={{ gridColumn: 'span 2' }}>
              <InfoRow icon={MapPin} label="Current Address" value={staff.address} />
            </div>
          </div>
        </Card>

        {/* Split Row: Employment & Bank */}
        <div className="sp-grid-split">
          <Card icon={Briefcase} title="Employment Details">
            <InfoRow icon={Briefcase} label="Designation" value={staff.designation} />
            <InfoRow icon={Building2} label="Department" value={staff.department} />
            <InfoRow icon={Calendar}  label="Join Date"   value={staff.joinDate} />
            <InfoRow icon={Shield}    label="Work Mode"   value={staff.employmentType} />
            <InfoRow icon={CheckCircle} label="Work Status" value={staff.status} />
          </Card>

          <Card icon={Landmark} title="Bank Account Details">
            <InfoRow icon={User}      label="Account Holder" value={staff.accountHolder} />
            <InfoRow icon={Landmark}  label="Bank Name"       value={staff.bankName} />
            <InfoRow icon={Hash}      label="Account Number" value={staff.accountNumber} />
            <InfoRow icon={Hash}      label="IFSC Code"      value={staff.ifscCode} />
            <div style={{ gridColumn: 'span 2' }}>
              <InfoRow icon={MapPin}  label="Branch"         value={staff.branchAddress} />
            </div>
          </Card>
        </div>

        {/* Full Width Bottom: Quick Actions */}
        <Card icon={TrendingUp} title="Quick Actions & Operations">
          <div className="sp-grid-split">
            {quickActions.map((qa, i) => (
              <button key={i} className="sp-qa-item" onClick={qa.onClick}>
                <div className="sp-qa-icon-box" style={{ background: qa.bg, color: qa.color }}>
                  <qa.icon size={17} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="sp-qa-title">{qa.title}</div>
                  <div className="sp-qa-sub">{qa.sub}</div>
                </div>
                <ChevronRight size={15} className="sp-qa-arrow" />
              </button>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
};

export default StaffProfile;

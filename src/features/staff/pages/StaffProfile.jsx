import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getItems } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft, Phone, Mail, MapPin, Building2,
  Wallet, ChevronRight, Shield, User, Hash, Edit2,
  Briefcase, Calendar, Landmark, CheckCircle, AlertCircle,
  TrendingUp, UserCheck, UserMinus, QrCode, Clock, BookOpen,
  DollarSign, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import '@/features/staff/styles/StaffProfile.css';

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
      <div className="sp-info-icon-wrap"><Icon size={16} /></div>
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
        <Icon size={18} className="text-indigo-600" />
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
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, halfDay: 0, total: 0 });
  const [ledgerSummary, setLedgerSummary] = useState({ advanceBalance: 0, totalGave: 0, totalGot: 0 });
  const [loading, setLoading] = useState(true);
  const [showUpiModal, setShowUpiModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id || !id) return;
    setLoading(true);
    try {
      // 1. Fetch Staff
      const staffList = await getItems('staff', user.id);
      const member = staffList.find(s => (s._dbId === id || s.id === id));
      setStaff(member || null);

      if (member) {
        const mId = member._dbId || member.id;

        // 2. Fetch Attendance
        const attData = await getItems('attendance', user.id);
        const today = new Date();
        const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        
        const record = attData.find(a => (a.staffId === mId) && a.month === monthStr);
        if (record) {
          const abs = (record.absentDates || []).length;
          const paid = (record.paidLeaveDates || []).length;
          const half = (record.halfDayDates || []).length;
          const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
          
          setAttendanceStats({
            absent: abs,
            paid: paid,
            halfDay: half,
            present: Math.max(0, daysInMonth - abs - half - (today.getDate() < daysInMonth ? daysInMonth - today.getDate() : 0)),
            total: daysInMonth
          });
        }

        // 3. Fetch Staff Ledger for Outstanding Advances ("You Gave" vs "You Got")
        const ledgerEntries = await getItems('staff_ledger', user.id);
        const staffLedger = ledgerEntries.filter(l => l.staffId === mId);
        let gaveSum = 0;
        let gotSum = 0;
        staffLedger.forEach(item => {
          const amt = Number(item.amount) || 0;
          if (item.type === 'you_gave') gaveSum += amt;
          else if (item.type === 'you_got') gotSum += amt;
        });

        setLedgerSummary({
          advanceBalance: Math.max(0, gaveSum - gotSum),
          totalGave: gaveSum,
          totalGot: gotSum
        });
      }
    } catch (err) {
      console.error('Failed to load staff profile:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return (
    <div className="sp-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', color: '#64748b' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
        <p style={{ fontWeight: 600 }}>Loading profile...</p>
      </div>
    </div>
  );

  if (!staff) return (
    <div className="sp-page" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <AlertCircle size={52} style={{ color: '#f43f5e', margin: '0 auto 1rem', display: 'block' }} />
      <h2 style={{ color: '#0f172a', fontWeight: 800 }}>Staff Member Not Found</h2>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>The requested staff record does not exist or has been removed.</p>
      <button className="sp-back-btn" onClick={() => navigate('/staff')} style={{ margin: '0 auto' }}>
        <ArrowLeft size={16} /> Back to Staff Directory
      </button>
    </div>
  );

  const name = staff.name || 'Unknown Staff';
  const initial = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'S';
  const status = staff.status || 'active';
  const wageType = staff.wageType || 'monthly';
  const baseSalary = Number(staff.salary || staff.dailyRate || staff.hourlyRate || 0);

  const wageLabels = {
    monthly: 'Fixed Monthly',
    daily: 'Daily Wager (Per Day)',
    hourly: 'Hourly Wage',
    piece_rate: 'Piece-Rate (Mal-Khata)'
  };

  const quickActions = [
    { icon: Calendar,     bg: '#eef2ff', color: '#4f46e5', title: 'Monthly Attendance', sub: 'View/mark daily attendance & shifts', onClick: () => navigate(`/staff/account/${id}`) },
    { icon: BookOpen,     bg: '#ecfdf5', color: '#059669', title: 'Pagar Khata Ledger', sub: 'Cash advances, perks, fines & loans', onClick: () => navigate(`/staff/account/${id}?tab=ledger`) },
    { icon: Wallet,       bg: '#fff1f2', color: '#e11d48', title: 'Salary & Payslips', sub: 'View payment history & download slip', onClick: () => navigate(`/staff/salary-history/${id}`) },
    { icon: TrendingUp,   bg: '#f0fdf4', color: '#16a34a', title: 'Record Settlement', sub: 'Process monthly wage disbursement', onClick: () => navigate(`/staff/account/${id}`) },
    { icon: Phone,        bg: '#eff6ff', color: '#0284c7', title: staff.phone ? `Call ${staff.phone}` : 'No Phone Provided', sub: 'Click to dial immediately', onClick: () => staff.phone && window.open(`tel:${staff.phone}`) },
  ];

  return (
    <div className="sp-page">
      <div className="sp-content">
        
        {/* Breadcrumb Navigation */}
        <div className="sp-back-row">
          <button className="sp-back-btn" onClick={() => navigate('/staff')}>
            <ArrowLeft size={16} /> Back to Staff
          </button>
          <span className="sp-breadcrumb">Staff Management &nbsp;/&nbsp; <span>{name}</span></span>
        </div>

        {/* Hero Card */}
        <div className="sp-hero">
          <div className="sp-hero-gradient" />
          <div className="sp-hero-body">
            <div className="sp-avatar-wrapper">
              <div className="sp-avatar-ring" />
              <div className="sp-hero-avatar">{initial}</div>
            </div>

            <div className="sp-hero-info">
              <h1 className="sp-hero-name">{name}</h1>
              <div className="sp-hero-chips">
                <span className={`sp-chip ${status}`}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: status === 'active' ? '#10b981' : '#ef4444' }} />
                  {status.toUpperCase()}
                </span>
                <span className="sp-chip role">{staff.designation || 'Staff Member'}</span>
                <span className="sp-chip role">{staff.department || 'Operations'}</span>
                <span className="sp-chip wage">{wageLabels[wageType] || 'Fixed Monthly'}</span>
                {staff.shiftName && <span className="sp-chip shift">{staff.shiftName}</span>}
              </div>

              <div className="sp-hero-contact-info">
                {staff.phone && (
                  <a href={`tel:${staff.phone}`} className="sp-hero-contact-item">
                    <Phone size={14} /> {staff.phone}
                  </a>
                )}
                {staff.email && (
                  <a href={`mailto:${staff.email}`} className="sp-hero-contact-item">
                    <Mail size={14} /> {staff.email}
                  </a>
                )}
                {staff.upiId && (
                  <button 
                    onClick={() => setShowUpiModal(true)} 
                    className="sp-hero-contact-item"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f46e5', fontWeight: 600 }}
                  >
                    <QrCode size={14} /> UPI: {staff.upiId}
                  </button>
                )}
              </div>
            </div>

            <div className="sp-hero-actions">
              <button className="sp-primary-btn" onClick={() => navigate(`/staff/account/${id}`)}>
                <Calendar size={16} /> Manage Attendance
              </button>
              <button className="sp-secondary-btn" onClick={() => navigate('/staff', { state: { editId: id } })}>
                <Edit2 size={16} /> Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* 4-Column KPI Stats Row */}
        <div className="sp-stats">
          <div className="sp-stat salary">
            <div className="sp-stat-icon-box"><Wallet size={20} /></div>
            <div className="sp-stat-label">
              {wageType === 'daily' ? 'Daily Rate' : wageType === 'hourly' ? 'Hourly Rate' : 'Monthly Salary'}
            </div>
            <div className="sp-stat-value">₹{baseSalary.toLocaleString('en-IN')}</div>
            <div className="sp-stat-sub">{wageLabels[wageType] || 'Base Salary'}</div>
          </div>

          <div className="sp-stat present">
            <div className="sp-stat-icon-box"><UserCheck size={20} /></div>
            <div className="sp-stat-label">Present (This Month)</div>
            <div className="sp-stat-value">{attendanceStats.present} Days</div>
            <div className="sp-stat-sub">Worked this cycle</div>
          </div>

          <div className="sp-stat absent">
            <div className="sp-stat-icon-box"><UserMinus size={20} /></div>
            <div className="sp-stat-label">Absences & Leaves</div>
            <div className="sp-stat-value">{attendanceStats.absent} Unpaid</div>
            <div className="sp-stat-sub">{attendanceStats.paid} Paid leaves</div>
          </div>

          <div className="sp-stat advance">
            <div className="sp-stat-icon-box"><ArrowDownLeft size={20} /></div>
            <div className="sp-stat-label">Pending Advance (Udhaar)</div>
            <div className="sp-stat-value" style={{ color: ledgerSummary.advanceBalance > 0 ? '#e11d48' : '#059669' }}>
              ₹{ledgerSummary.advanceBalance.toLocaleString('en-IN')}
            </div>
            <div className="sp-stat-sub">
              {ledgerSummary.advanceBalance > 0 ? 'Deducted in next salary' : 'No balance pending'}
            </div>
          </div>
        </div>

        {/* Basic Personal Information */}
        <Card icon={User} title="Personal & Identity Details" style={{ marginBottom: '1.75rem' }}>
          <div className="sp-info-grid">
            <InfoRow icon={User} label="Full Name" value={staff.name} />
            <InfoRow icon={Hash} label="Staff Employee Code" value={(staff._dbId || staff.id)?.slice(-6)?.toUpperCase()} />
            <InfoRow icon={Phone} label="Primary Mobile" value={staff.phone} />
            <InfoRow icon={Mail} label="Email Address" value={staff.email} />
            <InfoRow icon={Calendar} label="Date of Birth" value={staff.dob} />
            <InfoRow icon={User} label="Age / Gender" value={`${staff.age ? staff.age + ' yrs' : '—'} • ${staff.gender ? staff.gender.toUpperCase() : '—'}`} />
            <InfoRow icon={Shield} label="PAN Card Number" value={staff.panNumber} />
            <InfoRow icon={Shield} label="UAN / PF Number" value={staff.uanNumber} />
            <InfoRow icon={Shield} label="ESI Number" value={staff.esiNumber} />
            <InfoRow icon={Hash} label="Aadhaar ID (Last 4)" value={staff.aadhaarNumber ? `XXXX-XXXX-${staff.aadhaarNumber.slice(-4)}` : ''} />
          </div>
        </Card>

        {/* Residential Address */}
        <Card icon={MapPin} title="Residential Address" style={{ marginBottom: '1.75rem' }}>
          <div className="sp-info-grid">
            <div style={{ gridColumn: 'span 2' }}>
              <InfoRow icon={MapPin} label="Full Address" value={staff.address} />
            </div>
          </div>
        </Card>

        {/* Split Section: Employment Details & Bank/UPI Payout */}
        <div className="sp-grid-split">
          <Card icon={Briefcase} title="Employment & Wage Structure">
            <InfoRow icon={Briefcase} label="Designation / Role" value={staff.designation} />
            <InfoRow icon={Building2} label="Department" value={staff.department} />
            <InfoRow icon={Calendar} label="Date of Joining" value={staff.joinDate} />
            <InfoRow icon={Shield} label="Employment Type" value={(staff.employmentType || 'fulltime').toUpperCase()} />
            <InfoRow icon={Clock} label="Assigned Shift" value={staff.shiftName || 'General Day Shift (9 AM - 6 PM)'} />
            <InfoRow icon={DollarSign} label="Wage Basis" value={wageLabels[wageType] || 'Monthly'} />
          </Card>

          <Card icon={Landmark} title="Disbursement & Bank Account">
            <InfoRow icon={User} label="Account Holder Name" value={staff.accountHolder || staff.name} />
            <InfoRow icon={Landmark} label="Bank Name" value={staff.bankName} />
            <InfoRow icon={Hash} label="Account Number" value={staff.accountNumber} />
            <InfoRow icon={Hash} label="IFSC Code" value={staff.ifscCode} />
            <InfoRow icon={QrCode} label="Direct UPI ID" value={staff.upiId} />
            <div style={{ gridColumn: 'span 2' }}>
              <InfoRow icon={MapPin} label="Bank Branch & Address" value={staff.branchAddress} />
            </div>
          </Card>
        </div>

        {/* Quick Operations Matrix */}
        <Card icon={TrendingUp} title="Operations & Quick Workflows">
          <div className="sp-grid-split">
            {quickActions.map((qa, i) => (
              <button key={i} className="sp-qa-item" onClick={qa.onClick}>
                <div className="sp-qa-icon-box" style={{ background: qa.bg, color: qa.color }}>
                  <qa.icon size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="sp-qa-title">{qa.title}</div>
                  <div className="sp-qa-sub">{qa.sub}</div>
                </div>
                <ChevronRight size={18} className="sp-qa-arrow" />
              </button>
            ))}
          </div>
        </Card>

        {/* UPI QR Modal if open */}
        {showUpiModal && staff.upiId && (
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
              <h3 style={{ margin: '0 0 0.5rem', color: '#0f172a', fontWeight: 800 }}>Employee UPI QR</h3>
              <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Scan with GPay, PhonePe, Paytm, or BHIM to pay {staff.name}
              </p>

              <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1.5px dashed #cbd5e1', marginBottom: '1.25rem' }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`upi://pay?pa=${staff.upiId}&pn=${encodeURIComponent(staff.name)}`)}`}
                  alt="UPI QR Code"
                  style={{ width: '180px', height: '180px', display: 'block', margin: '0 auto' }}
                />
              </div>

              <div style={{ background: '#eff6ff', padding: '0.75rem', borderRadius: '10px', color: '#1e40af', fontWeight: 700, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                {staff.upiId}
              </div>

              <button 
                onClick={() => setShowUpiModal(false)}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '12px',
                  background: '#0f172a', color: 'white', fontWeight: 700,
                  border: 'none', cursor: 'pointer'
                }}
              >
                Close QR Code
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default StaffProfile;

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getItems, deleteItem, logActivity } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import { 
  ArrowLeft, Wallet, Calendar, Download, AlertCircle, 
  History, Receipt, TrendingUp, CheckCircle, Search, Trash2,
  Share2, ArrowUpRight, DollarSign, Clock, ShieldCheck
} from 'lucide-react';
import PrintViewModal from '@/components/ui/PrintViewModal';
import '@/features/staff/styles/StaffSalaryHistory.css';

const StaffSalaryHistory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [staff, setStaff] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [printDoc, setPrintDoc] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id || !id) return;
    setLoading(true);
    try {
      // 1. Fetch Staff
      const staffList = await getItems('staff', user.id);
      const member = staffList.find(s => (s._dbId === id || s.id === id));
      setStaff(member || null);

      if (member) {
        // 2. Fetch Salary History
        const allHistory = await getItems('salary_history', user.id);
        const filtered = allHistory
          .filter(h => h.staffId === (member._dbId || member.id))
          .sort((a, b) => new Date(b.dateOfPayment || b.id) - new Date(a.dateOfPayment || a.id));
        setHistory(filtered);
      }
    } catch (err) {
      console.error('Failed to load salary history:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePrintSlip = (record) => {
    const docData = {
      docType: 'Salary Slip',
      staffId: staff._dbId || staff.id,
      staffName: staff.name,
      designation: staff.designation || 'Staff',
      department: staff.department || 'General',
      salary: record.baseSalary,
      calculatedSalary: record.netSalary,
      absences: record.absences || 0,
      paidLeaves: record.paidLeaves || 0,
      attendanceDays: record.attendanceDays || 30,
      month: record.month,
      year: record.year,
      customerPhone: staff.phone || '',
      customerEmail: staff.email || '',
      panNumber: staff.panNumber || '',
      uanNumber: staff.uanNumber || '',
      esiNumber: staff.esiNumber || '',
      bankName: staff.bankName || '',
      accountNumber: staff.accountNumber || '',
      overtime: record.overtime || 0,
      bonus: record.bonus || 0,
      tds: record.tds || 0,
      pf: record.pf || 0,
      advanceRecovery: record.advanceRecovery || 0,
      paymentMode: record.paymentMode || 'Bank Transfer',
      remarks: record.remarks || ''
    };
    setPrintDoc(docData);
    setShowPrintModal(true);
  };

  const handleWhatsAppSlip = (record) => {
    const phone = (staff.phone || '').replace(/\D/g, '');
    const msg = `*SALARY DISBURSEMENT RECEIPT*\n` +
      `--------------------------------\n` +
      `Employee: ${staff.name}\n` +
      `Month: ${record.month} ${record.year}\n` +
      `Net Salary: ₹${Number(record.netSalary || 0).toLocaleString('en-IN')}\n` +
      `Payment Mode: ${record.paymentMode || 'Direct Payout'}\n` +
      (record.absences ? `Unpaid Absences: ${record.absences} days\n` : '') +
      (record.advanceRecovery ? `Advance Deducted: ₹${record.advanceRecovery}\n` : '') +
      `Status: PAID (Confirmed)\n` +
      `--------------------------------\n` +
      `Generated via BaniyaBook Staff OS.`;
    
    const waUrl = phone 
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  const handleDeleteRecord = async (record) => {
    if (!window.confirm(`Are you sure you want to delete this salary record for ${record.month} ${record.year}?`)) return;
    
    const recId = record._dbId || record.id;
    if (!recId) return;
    
    try {
      const success = await deleteItem('salary_history', recId, user.id, user.firstName);
      if (success) {
        setHistory(prev => prev.filter(h => (h._dbId !== recId && h.id !== recId)));
        await logActivity(`Deleted salary disbursement record for ${staff.name} (${record.month})`, user.id, user.firstName);
      }
    } catch(err) {
      console.error(err);
      alert('Failed to delete record.');
    }
  };

  const filteredHistory = history.filter(h => {
    const q = searchTerm.toLowerCase();
    const m = (h.month || '').toLowerCase();
    const y = String(h.year || '');
    const mode = (h.paymentMode || '').toLowerCase();
    return m.includes(q) || y.includes(q) || mode.includes(q);
  });

  const totalPaid = history.reduce((sum, h) => sum + (Number(h.netSalary) || 0), 0);
  const avgMonthly = history.length > 0 ? totalPaid / history.length : 0;

  if (loading) return (
    <div className="ssh-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', color: '#64748b' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
        <p style={{ fontWeight: 600 }}>Loading salary records...</p>
      </div>
    </div>
  );

  return (
    <div className="ssh-page">
      <div className="ssh-content">
        
        {/* Header */}
        <div className="ssh-header">
          <div className="ssh-header-left">
            <button className="ssh-back-btn" onClick={() => navigate('/staff')} title="Back to Staff Directory">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="ssh-title">Salary & Payout History</h1>
              <p className="ssh-subtitle">Complete disbursement records for {staff?.name || 'Staff'}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button 
              className="ssh-action-btn primary"
              onClick={() => navigate(`/staff/account/${id}`)}
            >
              <Calendar size={15} /> Attendance & Pagar Khata
            </button>
            <button 
              className="ssh-action-btn"
              onClick={() => navigate(`/staff/profile/${id}`)}
            >
              Staff Profile
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="ssh-stats">
          <div className="ssh-stat total">
            <div className="ssh-stat-label">
              <span>Total Disbursed (Lifetime)</span>
              <DollarSign size={16} className="text-emerald-600" />
            </div>
            <div className="ssh-stat-value">₹{totalPaid.toLocaleString('en-IN')}</div>
            <div className="ssh-stat-sub">Cumulative wages settled</div>
          </div>

          <div className="ssh-stat avg">
            <div className="ssh-stat-label">
              <span>Average Monthly Pay</span>
              <TrendingUp size={16} className="text-blue-600" />
            </div>
            <div className="ssh-stat-value">₹{Math.round(avgMonthly).toLocaleString('en-IN')}</div>
            <div className="ssh-stat-sub">Across {history.length} payout cycles</div>
          </div>

          <div className="ssh-stat count">
            <div className="ssh-stat-label">
              <span>Payslips Issued</span>
              <Receipt size={16} className="text-indigo-600" />
            </div>
            <div className="ssh-stat-value">{history.length}</div>
            <div className="ssh-stat-sub">Verified salary statements</div>
          </div>
        </div>

        {/* Table Card */}
        <div className="ssh-table-card">
          <div className="ssh-table-toolbar">
            <div className="ssh-search-input-wrap">
              <Search size={16} />
              <input 
                type="text" 
                className="ssh-search-input"
                placeholder="Filter by month, year, or payment mode..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
              Showing {filteredHistory.length} of {history.length} records
            </div>
          </div>

          {filteredHistory.length > 0 ? (
            <div className="ssh-table-responsive">
              <table className="ssh-table">
                <thead>
                  <tr>
                    <th>Payout Period</th>
                    <th>Payment Date</th>
                    <th>Attendance & Deductions</th>
                    <th>Mode & Reference</th>
                    <th style={{ textAlign: 'right' }}>Net Salary</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((record, i) => (
                    <tr key={record._dbId || record.id || i}>
                      <td>
                        <div className="ssh-month-cell">
                          <div className="ssh-month-icon">
                            <Receipt size={17} />
                          </div>
                          <div>
                            <span style={{ fontWeight: 800 }}>{record.month}</span> {record.year}
                            {record.paymentCategory && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{record.paymentCategory}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: '#475569' }}>
                          {record.dateOfPayment 
                            ? new Date(record.dateOfPayment).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) 
                            : '—'}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                          <span style={{ color: '#059669' }}>{Number(record.attendanceDays || 30) - Number(record.absences || 0)} Days Worked</span>
                          {record.absences > 0 && <span style={{ color: '#e11d48' }}> • {record.absences} Absents</span>}
                          {record.advanceRecovery > 0 && (
                            <div style={{ fontSize: '0.72rem', color: '#d97706', marginTop: '2px' }}>
                              Adv. Deducted: ₹{Number(record.advanceRecovery).toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className="ssh-badge mode">
                          {record.paymentMode || 'Bank Transfer'}
                        </span>
                        {record.paymentRef && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                            Ref: {record.paymentRef}
                          </div>
                        )}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className="ssh-amount">
                          ₹{Number(record.netSalary || 0).toLocaleString('en-IN')}
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span className="ssh-badge paid">
                          <CheckCircle size={12} /> Paid
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className="ssh-actions-cell" style={{ justifyContent: 'flex-end' }}>
                          <button 
                            className="ssh-action-btn primary"
                            onClick={() => handlePrintSlip(record)} 
                            title="Download / Print Payslip PDF"
                          >
                            <Download size={15} /> Payslip
                          </button>
                          
                          <button 
                            className="ssh-action-btn whatsapp"
                            onClick={() => handleWhatsAppSlip(record)}
                            title="Share Salary Slip on WhatsApp"
                          >
                            <Share2 size={15} />
                          </button>

                          <button 
                            className="ssh-action-btn delete"
                            onClick={() => handleDeleteRecord(record)} 
                            title="Delete Record"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="ssh-empty">
              <div className="ssh-empty-icon">
                <History size={28} />
              </div>
              <h3 style={{ color: '#0f172a', fontWeight: 800, margin: '0 0 0.5rem' }}>No Salary Records Found</h3>
              <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                {searchTerm ? 'No payments match your filter criteria.' : 'Monthly payouts recorded for this employee will be tracked here.'}
              </p>
              <button 
                className="ssh-action-btn primary"
                onClick={() => navigate(`/staff/account/${id}`)}
              >
                Go to Attendance & Record Payout
              </button>
            </div>
          )}
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

export default StaffSalaryHistory;

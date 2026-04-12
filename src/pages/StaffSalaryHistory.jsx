import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getItems, deleteItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import { 
  ArrowLeft, Wallet, Calendar, Download, AlertCircle, 
  History, Receipt, TrendingUp, CheckCircle, Search, Trash2
} from 'lucide-react';
import PrintViewModal from '../components/PrintViewModal';
import './StaffSalaryHistory.css';

const StaffSalaryHistory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [staff, setStaff] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
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

      // Extended Fields for accurate Payslip
      overtime: record.overtime || 0,
      bonus: record.bonus || 0,
      tds: record.tds || 0,
      pf: record.pf || 0,
      advanceRecovery: record.advanceRecovery || 0,
      paymentMode: record.paymentMode || '',
      remarks: record.remarks || ''
    };
    setPrintDoc(docData);
    setShowPrintModal(true);
  };

  const handleDeleteRecord = async (record) => {
    if (!window.confirm(`Are you sure you want to delete this salary record for ${record.month}?`)) return;
    
    const recId = record._dbId || record.id;
    if (!recId) return;
    
    try {
      const success = await deleteItem('salary_history', recId, user.id, user.firstName);
      if (success) {
        setHistory(prev => prev.filter(h => (h._dbId !== recId && h.id !== recId)));
      }
    } catch(err) {
      console.error(err);
      alert('Failed to delete record.');
    }
  };

  if (loading) return (
    <div className="ssh-page">
      <div className="ssh-content" style={{ textAlign: 'center', paddingTop: '10rem' }}>
        <TrendingUp size={48} className="animate-pulse text-indigo-500" />
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '1rem' }}>Fetching salary records...</p>
      </div>
    </div>
  );

  const totalPaid = history.reduce((sum, h) => sum + (Number(h.netSalary) || 0), 0);
  const avgMonthly = history.length > 0 ? totalPaid / history.length : 0;

  return (
    <div className="ssh-page">
      <div className="ssh-content">
        
        <div className="ssh-header">
          <div className="ssh-header-left">
            <button className="ssh-back-btn" onClick={() => navigate('/staff')}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="ssh-title">Salary History</h1>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontWeight: 500 }}>
                Earnings record for {staff?.name}
              </div>
            </div>
          </div>

          <div className="ssh-header-actions">
             <button className="sp-back-btn" onClick={() => navigate(`/staff/account/${id}`)}>
               <Calendar size={15} /> Attendance Logs
             </button>
          </div>
        </div>

        {/* Dash Stats */}
        <div className="ssh-stats">
          <div className="ssh-stat total">
            <div className="ssh-stat-label">Total Earnings (Lifetime)</div>
            <div className="ssh-stat-value">₹{totalPaid.toLocaleString()}</div>
          </div>
          <div className="ssh-stat avg">
            <div className="ssh-stat-label">Average Monthly Pay</div>
            <div className="ssh-stat-value">₹{avgMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          <div className="ssh-stat count">
            <div className="ssh-stat-label">Slips Generated</div>
            <div className="ssh-stat-value">{history.length}</div>
          </div>
        </div>

        {/* History Table */}
        <div className="ssh-table-card">
          {history.length > 0 ? (
            <table className="ssh-table">
              <thead>
                <tr>
                  <th>Payout Month</th>
                  <th>Payment Date</th>
                  <th>Attendance Summary</th>
                  <th style={{ textAlign: 'right' }}>Net Salary Paid</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Slip</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record, i) => (
                  <tr key={record._dbId || record.id || i}>
                    <td>
                      <div className="ssh-row-month">
                        <div className="ssh-icon-box" style={{ color: '#a78bfa' }}><Receipt size={18} /></div>
                        {record.month}
                      </div>
                    </td>
                    <td>
                      <div className="ssh-row-date">
                        {record.dateOfPayment ? new Date(record.dateOfPayment).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                        <span style={{ color: '#f87171' }}>{record.absences} Absents</span> • <span style={{ color: '#34d399' }}>{record.paidLeaves} Paid Leaves</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="ssh-row-salary">₹{Number(record.netSalary).toLocaleString()}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="ssh-row-status paid">
                        <CheckCircle size={12} /> Paid
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-2 justify-end">
                        <button className="ssh-btn-icon" onClick={() => handlePrintSlip(record)} title="Print Slip">
                          <Download size={18} />
                        </button>
                        <button className="ssh-btn-icon" onClick={() => handleDeleteRecord(record)} title="Delete Record" style={{ color: '#f87171' }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="ssh-empty">
              <History size={48} className="ssh-empty-icon" />
              <h3 style={{ color: 'white', margin: '0 0 0.5rem' }}>No salary records yet</h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                Salary payments recorded in the attendance section will appear here.
              </p>
              <button 
                className="sp-back-btn" 
                style={{ marginTop: '1.5rem', background: 'rgba(99,102,241,0.2)', color: '#fff' }}
                onClick={() => navigate(`/staff/account/${id}`)}
              >
                Go to Attendance & Mark Paid
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

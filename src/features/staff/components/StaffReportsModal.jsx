import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileSpreadsheet, Download, Printer, Filter, Calendar, Users, DollarSign, ArrowDownLeft } from 'lucide-react';
import { getItems } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';

const StaffReportsModal = ({ isOpen, onClose, staffList = [] }) => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('muster_roll'); // 'muster_roll', 'salary_register', 'advance_ledger', 'mal_khata'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const [attendanceData, setAttendanceData] = useState([]);
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [malKhataEntries, setMalKhataEntries] = useState([]);

  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth();
  const monthStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  useEffect(() => {
    if (!isOpen || !user?.id) return;

    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [att, sal, led, mal] = await Promise.all([
          getItems('attendance', user.id),
          getItems('salary_history', user.id),
          getItems('staff_ledger', user.id),
          getItems('staff_mal_khata', user.id)
        ]);

        setAttendanceData(att || []);
        setSalaryHistory(sal || []);
        setLedgerEntries(led || []);
        setMalKhataEntries(mal || []);
      } catch (err) {
        console.error('Failed to load reports data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  // Export to CSV helper
  const handleExportCSV = () => {
    let csvRows = [];

    if (reportType === 'muster_roll') {
      const header = ['Staff Name', 'Designation', ...Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`), 'Present Days', 'Absences', 'Paid Leaves'];
      csvRows.push(header.join(','));

      staffList.filter(s => s.status === 'active').forEach(staff => {
        const mId = staff._dbId || staff.id;
        const record = attendanceData.find(a => a.staffId === mId && a.month === monthStr);
        const absences = record?.absentDates || [];
        const paidLeaves = record?.paidLeaveDates || [];
        const halfDays = record?.halfDayDates || [];

        let present = 0;
        const row = [staff.name, staff.designation || 'Staff'];

        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          if (absences.includes(dateStr)) {
            row.push('A');
          } else if (paidLeaves.includes(dateStr)) {
            row.push('PL');
          } else if (halfDays.includes(dateStr)) {
            row.push('HD');
            present += 0.5;
          } else {
            row.push('P');
            present += 1;
          }
        }

        row.push(present);
        row.push(absences.length);
        row.push(paidLeaves.length);
        csvRows.push(row.join(','));
      });
    } else if (reportType === 'advance_ledger') {
      const header = ['Employee', 'Date', 'Type', 'Category', 'Amount', 'Payment Mode', 'Notes'];
      csvRows.push(header.join(','));

      ledgerEntries.forEach(item => {
        csvRows.push([
          item.staffName || 'Staff',
          item.date || '',
          item.type === 'you_gave' ? 'You Gave (Advance)' : 'You Got (Credit)',
          item.category || '',
          item.amount || 0,
          item.paymentMode || '',
          `"${item.notes || ''}"`
        ].join(','));
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BaniyaBook_${reportType}_${monthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div 
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)',
        backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'white', borderRadius: '24px', maxWidth: '1100px', width: '100%',
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0', animation: 'scaleUp 0.2s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafbfc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                Consolidated Khata Reports & Muster Roll
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                Audited attendance registers, salary ledgers & advance statements for {monthName} {year}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button 
              onClick={handleExportCSV}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0',
                padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.8rem',
                fontWeight: 700, cursor: 'pointer'
              }}
            >
              <Download size={14} /> Export CSV / Excel
            </button>

            <button 
              onClick={handlePrint}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                background: '#ffffff', color: '#334155', border: '1px solid #cbd5e1',
                padding: '0.5rem 0.9rem', borderRadius: '10px', fontSize: '0.8rem',
                fontWeight: 600, cursor: 'pointer'
              }}
            >
              <Printer size={14} /> Print
            </button>

            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Report Selector Pills */}
        <div style={{ padding: '0.85rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', overflowX: 'auto' }}>
          {[
            { key: 'muster_roll', label: '31-Day Attendance Muster Roll' },
            { key: 'salary_register', label: 'Itemized Salary Register' },
            { key: 'advance_ledger', label: 'Advance & Udhaar Statements' },
            { key: 'mal_khata', label: 'Mal-Khata Piece Output Log' },
          ].map(r => (
            <button
              key={r.key}
              onClick={() => setReportType(r.key)}
              style={{
                padding: '0.55rem 1rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.82rem',
                border: reportType === r.key ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                background: reportType === r.key ? '#2563eb' : '#ffffff',
                color: reportType === r.key ? '#ffffff' : '#475569',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s'
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="staff-modal-scroll" style={{ flex: 1, padding: '1.5rem 2rem', overflowY: 'auto' }}>
          {reportType === 'muster_roll' && (
            <div className="staff-table-scroll" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '58vh', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', minWidth: '160px', position: 'sticky', left: 0, top: 0, zIndex: 12, background: '#f8fafc', boxShadow: '1px 1px 0 #e2e8f0' }}>
                      Staff Member
                    </th>
                    {Array.from({ length: daysInMonth }, (_, i) => (
                      <th key={i + 1} style={{ padding: '0.5rem 0.25rem', minWidth: '28px', borderRight: '1px solid #f1f5f9', position: 'sticky', top: 0, zIndex: 9, background: '#f8fafc', boxShadow: '0 1px 0 #e2e8f0' }}>
                        {i + 1}
                      </th>
                    ))}
                    <th style={{ padding: '0.75rem', background: '#ecfdf5', color: '#047857', position: 'sticky', top: 0, zIndex: 9, boxShadow: '0 1px 0 #e2e8f0' }}>Present</th>
                    <th style={{ padding: '0.75rem', background: '#fff1f2', color: '#b91c1c', position: 'sticky', top: 0, zIndex: 9, boxShadow: '0 1px 0 #e2e8f0' }}>Absent</th>
                    <th style={{ padding: '0.75rem', background: '#eff6ff', color: '#1e40af', position: 'sticky', top: 0, zIndex: 9, boxShadow: '0 1px 0 #e2e8f0' }}>Paid Leaves</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.filter(s => s.status === 'active').map((staff, idx) => {
                    const mId = staff._dbId || staff.id;
                    const record = attendanceData.find(a => a.staffId === mId && a.month === monthStr);
                    const absences = record?.absentDates || [];
                    const paidLeaves = record?.paidLeaveDates || [];
                    const halfDays = record?.halfDayDates || [];
                    const weeklyOffs = record?.weeklyOffDates || [];

                    let presentCount = 0;

                    return (
                      <tr key={mId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.65rem 1rem', textAlign: 'left', fontWeight: 700, color: '#0f172a', position: 'sticky', left: 0, zIndex: 8, background: '#ffffff', borderRight: '1px solid #e2e8f0', boxShadow: '1px 0 0 #e2e8f0' }}>
                          {staff.name}
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{staff.designation || 'Staff'}</div>
                        </td>

                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                          const isAbs = absences.includes(dateStr);
                          const isPaid = paidLeaves.includes(dateStr);
                          const isHalf = halfDays.includes(dateStr);
                          const isWO = weeklyOffs.includes(dateStr);
                          const isPres = !isAbs && !isPaid && !isHalf && !isWO;

                          if (isPres || isPaid) presentCount += 1;
                          else if (isHalf) presentCount += 0.5;

                          return (
                            <td 
                              key={i + 1}
                              style={{
                                padding: '0.4rem 0.2rem',
                                borderRight: '1px solid #f8fafc',
                                fontWeight: 800,
                                background: isAbs ? '#fff1f2' : isPaid ? '#eff6ff' : isHalf ? '#fffbeb' : isWO ? '#f1f5f9' : '#f0fdf4',
                                color: isAbs ? '#e11d48' : isPaid ? '#2563eb' : isHalf ? '#d97706' : isWO ? '#64748b' : '#16a34a'
                              }}
                            >
                              {isAbs ? 'A' : isPaid ? 'PL' : isHalf ? 'HD' : isWO ? 'WO' : 'P'}
                            </td>
                          );
                        })}

                        <td style={{ fontWeight: 800, color: '#059669', background: '#f0fdf4', fontFamily: "var(--staff-num-font, 'Plus Jakarta Sans', 'Inter', sans-serif)", fontVariantNumeric: 'tabular-nums' }}>{presentCount}</td>
                        <td style={{ fontWeight: 800, color: '#e11d48', background: '#fff1f2', fontFamily: "var(--staff-num-font, 'Plus Jakarta Sans', 'Inter', sans-serif)", fontVariantNumeric: 'tabular-nums' }}>{absences.length}</td>
                        <td style={{ fontWeight: 800, color: '#2563eb', background: '#eff6ff', fontFamily: "var(--staff-num-font, 'Plus Jakarta Sans', 'Inter', sans-serif)", fontVariantNumeric: 'tabular-nums' }}>{paidLeaves.length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'salary_register' && (
            <div className="staff-table-scroll" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '58vh', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.85rem 1rem', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 5, boxShadow: '0 1px 0 #e2e8f0' }}>Employee Name</th>
                    <th style={{ padding: '0.85rem 1rem', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 5, boxShadow: '0 1px 0 #e2e8f0' }}>Payout Month</th>
                    <th style={{ padding: '0.85rem 1rem', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 5, boxShadow: '0 1px 0 #e2e8f0' }}>Base Salary</th>
                    <th style={{ padding: '0.85rem 1rem', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 5, boxShadow: '0 1px 0 #e2e8f0' }}>Overtime / Bonus</th>
                    <th style={{ padding: '0.85rem 1rem', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 5, boxShadow: '0 1px 0 #e2e8f0' }}>Advance Deductions</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 5, boxShadow: '0 1px 0 #e2e8f0' }}>Net Disbursed</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 5, boxShadow: '0 1px 0 #e2e8f0' }}>Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryHistory.map((s, idx) => (
                    <tr key={s._dbId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>{s.staffName || 'Staff'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{s.month} {s.year}</td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: "var(--staff-num-font, 'Plus Jakarta Sans', 'Inter', sans-serif)", fontVariantNumeric: 'tabular-nums' }}>₹{Number(s.baseSalary || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#059669', fontWeight: 700, fontFamily: "var(--staff-num-font, 'Plus Jakarta Sans', 'Inter', sans-serif)", fontVariantNumeric: 'tabular-nums' }}>+₹{(Number(s.overtime || 0) + Number(s.bonus || 0)).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#e11d48', fontWeight: 700, fontFamily: "var(--staff-num-font, 'Plus Jakarta Sans', 'Inter', sans-serif)", fontVariantNumeric: 'tabular-nums' }}>-₹{Number(s.advanceRecovery || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontFamily: "var(--staff-num-font, 'Plus Jakarta Sans', 'Inter', sans-serif)", fontVariantNumeric: 'tabular-nums' }}>
                        ₹{Number(s.netSalary || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <span style={{ background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                          {s.paymentMode || 'Bank'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {salaryHistory.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        No salary history records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'advance_ledger' && (
            <div className="staff-table-scroll" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '58vh', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.85rem 1rem', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 5, boxShadow: '0 1px 0 #e2e8f0' }}>Employee</th>
                    <th style={{ padding: '0.85rem 1rem', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 5, boxShadow: '0 1px 0 #e2e8f0' }}>Date</th>
                    <th style={{ padding: '0.85rem 1rem', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 5, boxShadow: '0 1px 0 #e2e8f0' }}>Type</th>
                    <th style={{ padding: '0.85rem 1rem', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 5, boxShadow: '0 1px 0 #e2e8f0' }}>Category</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 5, boxShadow: '0 1px 0 #e2e8f0' }}>Amount</th>
                    <th style={{ padding: '0.85rem 1rem', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 5, boxShadow: '0 1px 0 #e2e8f0' }}>Payment Mode</th>
                    <th style={{ padding: '0.85rem 1rem', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 5, boxShadow: '0 1px 0 #e2e8f0' }}>Notes / Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.map((l, idx) => (
                    <tr key={l._dbId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>{l.staffName || 'Staff'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{l.date}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800,
                          background: l.type === 'you_gave' ? '#fff1f2' : '#ecfdf5',
                          color: l.type === 'you_gave' ? '#e11d48' : '#059669'
                        }}>
                          {l.type === 'you_gave' ? 'You Gave' : 'You Got'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{l.category}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, fontFamily: "var(--staff-num-font, 'Plus Jakarta Sans', 'Inter', sans-serif)", fontVariantNumeric: 'tabular-nums', color: l.type === 'you_gave' ? '#e11d48' : '#059669' }}>
                        ₹{Number(l.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{l.paymentMode || 'Cash'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{l.notes || '—'}</td>
                    </tr>
                  ))}
                  {ledgerEntries.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        No Pagar Khata entries logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'mal_khata' && (
            <div className="staff-table-scroll" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '58vh', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.85rem 1rem', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 5, boxShadow: '0 1px 0 #e2e8f0' }}>Worker Name</th>
                    <th style={{ padding: '0.85rem 1rem', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 5, boxShadow: '0 1px 0 #e2e8f0' }}>Date</th>
                    <th style={{ padding: '0.85rem 1rem', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 5, boxShadow: '0 1px 0 #e2e8f0' }}>Article / Item Operation</th>
                    <th style={{ padding: '0.85rem 1rem', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 5, boxShadow: '0 1px 0 #e2e8f0' }}>Units Produced</th>
                    <th style={{ padding: '0.85rem 1rem', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 5, boxShadow: '0 1px 0 #e2e8f0' }}>Piece Rate</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 5, boxShadow: '0 1px 0 #e2e8f0' }}>Total Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {malKhataEntries.map((m, idx) => (
                    <tr key={m._dbId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>{m.staffName || 'Worker'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{m.date}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{m.itemDescription}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{m.unitsProduced} units</td>
                      <td style={{ padding: '0.75rem 1rem' }}>₹{m.ratePerUnit}/unit</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: '#059669', fontFamily: "var(--staff-num-font, 'Plus Jakarta Sans', 'Inter', sans-serif)", fontVariantNumeric: 'tabular-nums' }}>
                        ₹{Number(m.totalAmount || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                  {malKhataEntries.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        No Mal-Khata piece rate records logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 2rem', borderTop: '1px solid #f1f5f9', background: '#fafbfc', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose}
            style={{ padding: '0.65rem 1.5rem', background: '#0f172a', color: 'white', borderRadius: '10px', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Close Report
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StaffReportsModal;

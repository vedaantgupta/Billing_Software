import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Calendar, BookOpen, Clock, Download, Plus, CheckCircle, AlertCircle, Share2, Wallet, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { addItem, getItems, logActivity } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';

const StaffSelfServiceModal = ({ isOpen, onClose, staffMember, onAdvanceRequested }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('passbook'); // 'passbook', 'attendance', 'request_advance'
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [pastSlips, setPastSlips] = useState([]);
  const [loading, setLoading] = useState(true);

  // Request advance form
  const [requestAmount, setRequestAmount] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!isOpen || !staffMember || !user?.id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const mId = staffMember._dbId || staffMember.id;

        // 1. Fetch Ledger
        const allLedger = await getItems('staff_ledger', user.id);
        const memberLedger = allLedger
          .filter(l => l.staffId === mId)
          .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
        setLedgerEntries(memberLedger);

        // 2. Fetch Attendance
        const today = new Date();
        const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const allAtt = await getItems('attendance', user.id);
        const memberAtt = allAtt.find(a => a.staffId === mId && a.month === monthStr);
        setAttendanceRecord(memberAtt || null);

        // 3. Fetch past salary slips
        const allSal = await getItems('salary_history', user.id);
        const memberSal = allSal.filter(s => s.staffId === mId);
        setPastSlips(memberSal);
      } catch (err) {
        console.error('Failed to load passbook data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, staffMember, user?.id]);

  if (!isOpen || !staffMember) return null;

  // Running balance calculation
  let totalGave = 0;
  let totalGot = 0;
  ledgerEntries.forEach(item => {
    const amt = Number(item.amount) || 0;
    if (item.type === 'you_gave') totalGave += amt;
    else if (item.type === 'you_got') totalGot += amt;
  });
  const advanceOutstanding = Math.max(0, totalGave - totalGot);

  const handleAdvanceSubmit = async (e) => {
    e.preventDefault();
    if (!requestAmount || Number(requestAmount) <= 0) return alert('Enter valid advance amount.');
    setRequesting(true);

    const mId = staffMember._dbId || staffMember.id;
    const payload = {
      staffId: mId,
      staffName: staffMember.name,
      amount: Number(requestAmount),
      reason: requestReason,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      await addItem('staff_advance_requests', payload, user.id, user.firstName);
      await logActivity(`Staff ${staffMember.name} submitted digital advance request of ₹${Number(requestAmount).toLocaleString('en-IN')}`, user.id, user.firstName);

      alert(`Advance request of ₹${Number(requestAmount).toLocaleString('en-IN')} submitted to manager for approval!`);
      setRequestAmount('');
      setRequestReason('');
      setActiveTab('passbook');
      if (onAdvanceRequested) onAdvanceRequested();
    } catch (err) {
      console.error(err);
      alert('Failed to submit request.');
    } finally {
      setRequesting(false);
    }
  };

  const sharePassbookWhatsApp = () => {
    const phone = (staffMember.phone || '').replace(/\D/g, '');
    const msg = `*STAFF PASSBOOK STATEMENT*\n` +
      `--------------------------------\n` +
      `Employee: ${staffMember.name}\n` +
      `Designation: ${staffMember.designation || 'Staff'}\n` +
      `Outstanding Advance: ₹${advanceOutstanding.toLocaleString('en-IN')}\n` +
      `Total Transactions: ${ledgerEntries.length}\n` +
      `--------------------------------\n` +
      `Sent via BaniyaBook Employee Portal.`;
    
    const waUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
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
          background: 'white', borderRadius: '24px', maxWidth: '680px', width: '100%',
          overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0', animation: 'scaleUp 0.2s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafbfc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                {staffMember.name}'s Digital Passbook
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Staff Self-Service View & Udhaar Statement</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button 
              onClick={sharePassbookWhatsApp} 
              style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '0.45rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Share statement on WhatsApp"
            >
              <Share2 size={13} /> WhatsApp
            </button>
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', background: '#ffffff', padding: '0 1.5rem' }}>
          {[
            { key: 'passbook', label: 'Khata Passbook & Udhaar' },
            { key: 'attendance', label: 'Attendance & Hours' },
            { key: 'request_advance', label: '+ Request Advance' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '0.9rem 1.25rem', border: 'none', background: 'none',
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                color: activeTab === t.key ? '#2563eb' : '#64748b',
                borderBottom: activeTab === t.key ? '2px solid #2563eb' : '2px solid transparent'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="staff-modal-scroll" style={{ padding: '1.5rem 1.75rem', maxHeight: '65vh', overflowY: 'auto' }}>
          {activeTab === 'passbook' && (
            <div>
              {/* Summary Balance Card */}
              <div style={{
                background: advanceOutstanding > 0 ? '#fff1f2' : '#ecfdf5',
                border: advanceOutstanding > 0 ? '1.5px solid #fecdd3' : '1.5px solid #a7f3d0',
                borderRadius: '16px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: advanceOutstanding > 0 ? '#b91c1c' : '#047857' }}>
                    {advanceOutstanding > 0 ? 'Net Advance Balance (Udhaar)' : 'Settled Balance'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: advanceOutstanding > 0 ? '#991b1b' : '#065f46', marginTop: '2px' }}>
                    {advanceOutstanding > 0 ? 'To be deducted in upcoming salary cycle' : 'No outstanding advance pending'}
                  </div>
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: advanceOutstanding > 0 ? '#e11d48' : '#059669', fontFamily: "var(--staff-num-font, 'Plus Jakarta Sans', 'Inter', sans-serif)", fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>
                  ₹{advanceOutstanding.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Transactions List */}
              <h4 style={{ margin: '0 0 0.85rem', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                Recent Passbook Transactions
              </h4>

              {ledgerEntries.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {ledgerEntries.map((item, idx) => (
                    <div 
                      key={item._dbId || item.id || idx}
                      style={{
                        padding: '0.85rem 1.15rem', borderRadius: '12px', border: '1px solid #e2e8f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: '#ffffff', transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 10,
                          background: item.type === 'you_gave' ? '#fff1f2' : '#ecfdf5',
                          color: item.type === 'you_gave' ? '#e11d48' : '#059669',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {item.type === 'you_gave' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                            {item.category || (item.type === 'you_gave' ? 'Cash Advance' : 'Earnings Credit')}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {item.date} • {item.paymentMode || 'Cash'} {item.notes && `• ${item.notes}`}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontWeight: 800, fontSize: '0.95rem', fontFamily: "var(--staff-num-font, 'Plus Jakarta Sans', 'Inter', sans-serif)", fontVariantNumeric: 'tabular-nums',
                          color: item.type === 'you_gave' ? '#e11d48' : '#059669'
                        }}>
                          {item.type === 'you_gave' ? '-' : '+'}₹{Number(item.amount || 0).toLocaleString('en-IN')}
                        </div>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{item.receiptNo || 'Verified'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '14px' }}>
                  No khata entries logged yet for this employee.
                </div>
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>Paid Present</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857' }}>
                    {Math.max(0, 30 - ((attendanceRecord?.absentDates || []).length))} Days
                  </div>
                </div>

                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>Unpaid Absences</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b91c1c' }}>
                    {(attendanceRecord?.absentDates || []).length} Days
                  </div>
                </div>

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>Paid Leaves</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e40af' }}>
                    {(attendanceRecord?.paidLeaveDates || []).length} Days
                  </div>
                </div>
              </div>

              {attendanceRecord?.lastPunch && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>Latest Verified Punch</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {attendanceRecord.lastPunch.date} at {attendanceRecord.lastPunch.time} ({attendanceRecord.lastPunch.type?.toUpperCase()})
                    </div>
                  </div>
                  <span style={{ background: '#ecfdf5', color: '#059669', padding: '0.25rem 0.6rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem' }}>
                    Verified Selfie
                  </span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'request_advance' && (
            <form onSubmit={handleAdvanceSubmit} style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1.5px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                Submit Advance / Loan Request
              </h4>
              <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0 0 1.25rem' }}>
                The request will be routed into the manager's dashboard for one-click approval.
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Requested Advance Amount (₹) *</label>
                <input
                  type="number"
                  min="500"
                  step="100"
                  placeholder="e.g. 5000"
                  value={requestAmount}
                  onChange={e => setRequestAmount(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '1rem', fontWeight: 700 }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Reason / Purpose *</label>
                <textarea
                  placeholder="e.g. Urgent family medical expense or school fee..."
                  value={requestReason}
                  onChange={e => setRequestReason(e.target.value)}
                  required
                  rows={3}
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.85rem' }}
                />
              </div>

              <button
                type="submit"
                disabled={requesting}
                style={{
                  width: '100%', padding: '0.85rem', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: 'white', fontWeight: 800, fontSize: '0.95rem',
                  border: 'none', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
                }}
              >
                <CheckCircle size={18} />
                {requesting ? 'Submitting Request...' : 'Send Request to Manager'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid #f1f5f9', background: '#fafbfc', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose}
            style={{ padding: '0.6rem 1.25rem', background: '#0f172a', color: 'white', borderRadius: '10px', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Close Passbook
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StaffSelfServiceModal;

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Package, Calculator, CheckCircle, Plus, Calendar, FileText, User } from 'lucide-react';
import { addItem, logActivity } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';

const MalKhataModal = ({ isOpen, onClose, staffList = [], defaultStaffId = null, onSaved }) => {
  const { user } = useAuth();

  const [staffId, setStaffId] = useState(defaultStaffId || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [itemDescription, setItemDescription] = useState('');
  const [unitsProduced, setUnitsProduced] = useState('');
  const [ratePerUnit, setRatePerUnit] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (defaultStaffId) {
      setStaffId(defaultStaffId);
    } else if (staffList.length > 0 && !staffId) {
      setStaffId(staffList[0]._dbId || staffList[0].id);
    }
  }, [defaultStaffId, staffList, staffId]);

  // When staff changes, auto-fill default piece-rate if set
  useEffect(() => {
    if (staffId) {
      const s = staffList.find(item => (item._dbId === staffId || item.id === staffId));
      if (s && s.pieceRate) {
        setRatePerUnit(s.pieceRate.toString());
      }
    }
  }, [staffId, staffList]);

  if (!isOpen) return null;

  const totalEarned = (Number(unitsProduced) || 0) * (Number(ratePerUnit) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!staffId) return alert('Select an employee.');
    if (!itemDescription.trim()) return alert('Item description is required.');
    if (!unitsProduced || Number(unitsProduced) <= 0) return alert('Enter valid quantity produced.');
    if (!ratePerUnit || Number(ratePerUnit) <= 0) return alert('Enter rate per piece.');

    setSubmitting(true);
    const targetStaff = staffList.find(s => (s._dbId === staffId || s.id === staffId));
    const staffName = targetStaff ? targetStaff.name : 'Staff';

    const payload = {
      staffId: staffId,
      staffName: staffName,
      date: date,
      itemDescription: itemDescription,
      unitsProduced: Number(unitsProduced),
      ratePerUnit: Number(ratePerUnit),
      totalAmount: totalEarned,
      batchNo: batchNo,
      notes: notes,
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Add to staff_mal_khata
      await addItem('staff_mal_khata', payload, user.id, user.firstName);

      // 2. Also append a credit entry to staff_ledger so the worker's earnings balance updates
      await addItem('staff_ledger', {
        staffId: staffId,
        staffName: staffName,
        type: 'you_got',
        category: 'Mal-Khata Piece Work',
        amount: totalEarned,
        date: date,
        paymentMode: 'Output Ledger Credit',
        notes: `${unitsProduced} units of ${itemDescription} @ ₹${ratePerUnit}/unit`,
        receiptNo: `MAL-${Date.now().toString().slice(-6)}`
      }, user.id, user.firstName);

      await logActivity(
        `Recorded Mal-Khata piece work: ${unitsProduced} units for ${staffName} (Earned: ₹${totalEarned.toLocaleString('en-IN')})`,
        user.id,
        user.firstName
      );

      alert(`Mal-Khata entry saved! ₹${totalEarned.toLocaleString('en-IN')} credited to ${staffName}.`);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save piece-rate entry.');
    } finally {
      setSubmitting(false);
    }
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
          background: 'white', borderRadius: '24px', maxWidth: '520px', width: '100%',
          overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0', animation: 'scaleUp 0.2s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafbfc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Mal-Khata Piece-Rate Entry
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Work-based production output ledger</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="staff-modal-scroll" style={{ padding: '1.5rem 1.75rem', maxHeight: '75vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.15rem' }}>
            {/* Staff Select */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Worker / Employee *</label>
              <select
                value={staffId}
                onChange={e => setStaffId(e.target.value)}
                required
                style={{ width: '100%', padding: '0.7rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}
              >
                {staffList.map(s => (
                  <option key={s._dbId || s.id} value={s._dbId || s.id}>
                    {s.name} ({s.designation || 'Staff'} • {s.wageType === 'piece_rate' ? 'Piece-Rate' : (s.wageType || 'Worker')})
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Production Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.85rem' }}
              />
            </div>

            {/* Batch / Job No */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Batch / Job Card No</label>
              <input
                type="text"
                placeholder="e.g. JOB-409"
                value={batchNo}
                onChange={e => setBatchNo(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.85rem' }}
              />
            </div>

            {/* Item Produced */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Item / Operation Name *</label>
              <input
                type="text"
                placeholder="e.g. Cotton Shirt Stitching / Box Packing / Metal Cutting"
                value={itemDescription}
                onChange={e => setItemDescription(e.target.value)}
                required
                style={{ width: '100%', padding: '0.7rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.9rem' }}
              />
            </div>

            {/* Quantity Produced */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Units Produced (Qty) *</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 50"
                value={unitsProduced}
                onChange={e => setUnitsProduced(e.target.value)}
                required
                style={{ width: '100%', padding: '0.7rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 700 }}
              />
            </div>

            {/* Rate Per Unit */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Rate per Unit (₹) *</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                placeholder="e.g. 25"
                value={ratePerUnit}
                onChange={e => setRatePerUnit(e.target.value)}
                required
                style={{ width: '100%', padding: '0.7rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 700 }}
              />
            </div>

            {/* Notes */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Remarks / Quality Notes</label>
              <input
                type="text"
                placeholder="e.g. Quality passed by supervisor"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Auto-Calculated Total Ribbon */}
          <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '14px', padding: '1rem 1.25rem', marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700, textTransform: 'uppercase' }}>
                Total Piece-Rate Earnings
              </div>
              <div style={{ fontSize: '0.8rem', color: '#065f46' }}>
                {unitsProduced || 0} units × ₹{ratePerUnit || 0}
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#047857', fontFamily: "var(--staff-num-font, 'Plus Jakarta Sans', 'Inter', sans-serif)", fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>
              ₹{totalEarned.toLocaleString('en-IN')}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: '1.5rem', width: '100%', padding: '0.85rem', borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: 'white', fontWeight: 800, fontSize: '0.95rem',
              border: 'none', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
            }}
          >
            <CheckCircle size={18} />
            {submitting ? 'Recording...' : `Credit ₹${totalEarned.toLocaleString('en-IN')} to Worker`}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default MalKhataModal;

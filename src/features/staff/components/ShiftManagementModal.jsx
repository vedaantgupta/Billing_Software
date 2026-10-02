import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, Plus, Trash2, CheckCircle, ShieldAlert } from 'lucide-react';
import { addItem, getItems, updateItem, deleteItem } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';

const DEFAULT_SHIFTS = [
  { id: 'shift-1', name: 'General Day Shift', startTime: '09:00', endTime: '18:00', graceMinutes: 15, otMultiplier: '1.5', breakMinutes: 60 },
  { id: 'shift-2', name: 'Morning Shift', startTime: '06:00', endTime: '14:00', graceMinutes: 10, otMultiplier: '1.5', breakMinutes: 45 },
  { id: 'shift-3', name: 'Evening Shift', startTime: '14:00', endTime: '22:00', graceMinutes: 10, otMultiplier: '1.5', breakMinutes: 45 },
  { id: 'shift-4', name: 'Night Shift', startTime: '22:00', endTime: '06:00', graceMinutes: 15, otMultiplier: '2.0', breakMinutes: 60 },
];

const ShiftManagementModal = ({ isOpen, onClose, onSave }) => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newShift, setNewShift] = useState({
    name: '',
    startTime: '09:00',
    endTime: '18:00',
    graceMinutes: 15,
    otMultiplier: '1.5',
    breakMinutes: 60
  });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!isOpen || !user?.id) return;
    const fetchShifts = async () => {
      setLoading(true);
      try {
        const data = await getItems('staff_shifts', user.id);
        if (data && data.length > 0) {
          setShifts(data);
        } else {
          // Pre-populate with defaults
          for (const s of DEFAULT_SHIFTS) {
            await addItem('staff_shifts', s, user.id, user.firstName);
          }
          const loaded = await getItems('staff_shifts', user.id);
          setShifts(loaded.length > 0 ? loaded : DEFAULT_SHIFTS);
        }
      } catch (e) {
        console.error('Failed to load shifts:', e);
        setShifts(DEFAULT_SHIFTS);
      } finally {
        setLoading(false);
      }
    };
    fetchShifts();
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  const handleCreateShift = async (e) => {
    e.preventDefault();
    if (!newShift.name.trim()) return alert('Shift name is required');
    try {
      const added = await addItem('staff_shifts', newShift, user.id, user.firstName);
      setShifts(prev => [...prev, added || { ...newShift, _dbId: Date.now().toString() }]);
      setNewShift({ name: '', startTime: '09:00', endTime: '18:00', graceMinutes: 15, otMultiplier: '1.5', breakMinutes: 60 });
      setShowAddForm(false);
      if (onSave) onSave();
    } catch (err) {
      console.error(err);
      alert('Failed to add shift');
    }
  };

  const handleDeleteShift = async (shift) => {
    if (!window.confirm(`Delete ${shift.name}?`)) return;
    try {
      if (shift._dbId) {
        await deleteItem('staff_shifts', shift._dbId, user.id, user.firstName);
      }
      setShifts(prev => prev.filter(s => (s._dbId !== shift._dbId && s.id !== shift.id)));
      if (onSave) onSave();
    } catch (err) {
      console.error(err);
    }
  };

  return createPortal(
    <div 
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
        backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'white', borderRadius: '24px', maxWidth: '640px', width: '100%',
          overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0', animation: 'scaleUp 0.2s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafbfc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Work Shifts & Timings</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Configure schedules, grace periods & overtime rules</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="staff-modal-scroll" style={{ padding: '1.75rem 2rem', maxHeight: '68vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>Active Shift Schedules</span>
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                fontSize: '0.8rem', fontWeight: 700, color: '#2563eb',
                background: '#eff6ff', border: '1px solid #bfdbfe',
                padding: '0.45rem 0.85rem', borderRadius: '10px', cursor: 'pointer'
              }}
            >
              <Plus size={15} /> {showAddForm ? 'Cancel' : 'Add New Shift'}
            </button>
          </div>

          {/* Add Shift Form */}
          {showAddForm && (
            <form onSubmit={handleCreateShift} style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1.5px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Create New Shift</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Shift Title *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Early Morning Bakery Shift"
                    value={newShift.name}
                    onChange={e => setNewShift({ ...newShift, name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Start Time</label>
                  <input 
                    type="time" 
                    value={newShift.startTime}
                    onChange={e => setNewShift({ ...newShift, startTime: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>End Time</label>
                  <input 
                    type="time" 
                    value={newShift.endTime}
                    onChange={e => setNewShift({ ...newShift, endTime: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Grace Time (Mins)</label>
                  <input 
                    type="number" 
                    value={newShift.graceMinutes}
                    onChange={e => setNewShift({ ...newShift, graceMinutes: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Overtime (OT) Multiplier</label>
                  <select 
                    value={newShift.otMultiplier}
                    onChange={e => setNewShift({ ...newShift, otMultiplier: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.85rem' }}
                  >
                    <option value="1.0">1.0x (Flat Hourly)</option>
                    <option value="1.25">1.25x Hourly</option>
                    <option value="1.5">1.5x Hourly (Standard)</option>
                    <option value="2.0">2.0x Double Rate</option>
                  </select>
                </div>
              </div>
              <button 
                type="submit"
                style={{
                  marginTop: '1rem', width: '100%', padding: '0.75rem', background: '#2563eb',
                  color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700,
                  fontSize: '0.875rem', cursor: 'pointer'
                }}
              >
                Save Shift
              </button>
            </form>
          )}

          {/* Shifts List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {shifts.map((shift, idx) => (
              <div 
                key={shift._dbId || shift.id || idx}
                style={{
                  background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px',
                  padding: '1.15rem 1.35rem', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: '1rem', transition: 'all 0.2s',
                  boxShadow: '0 2px 6px rgba(15,23,42,0.02)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{shift.name}</span>
                    <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '0.72rem', padding: '0.15rem 0.55rem', borderRadius: '10px', fontWeight: 700 }}>
                      {shift.startTime} – {shift.endTime}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                    Grace Period: <strong>{shift.graceMinutes} mins</strong> • Overtime: <strong>{shift.otMultiplier}x rate</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => handleDeleteShift(shift)}
                    style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', width: 34, height: 34, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    title="Delete Shift"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 2rem', borderTop: '1px solid #f1f5f9', background: '#fafbfc', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose}
            style={{ padding: '0.65rem 1.5rem', background: '#0f172a', color: 'white', borderRadius: '10px', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ShiftManagementModal;

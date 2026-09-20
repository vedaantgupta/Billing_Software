import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Plus, Flag } from 'lucide-react';
import { useProject } from '@/features/projects/context/ProjectContext';

const ProjectCalendarView = () => {
  const {
    tasks,
    milestones,
    setSelectedTaskForDrawer,
    setIsTaskModalOpen
  } = useProject();

  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Compute days in month and padding days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Previous month padding
    const prevTotal = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevTotal - i),
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      days.push({
        date: new Date(year, month, d),
        isCurrentMonth: true
      });
    }

    // Next month padding to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let n = 1; n <= remaining; n++) {
      days.push({
        date: new Date(year, month + 1, n),
        isCurrentMonth: false
      });
    }

    return days;
  }, [year, month]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const isToday = (d) => {
    const now = new Date();
    return d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem 1.75rem' }}>
      
      {/* Calendar Header */}
      <div className="pm-control-bar" style={{ borderRadius: '14px 14px 0 0', borderBottom: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>
            {monthName} {year}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button className="pm-btn pm-btn-secondary pm-btn-sm" onClick={prevMonth} title="Previous Month">
              <ChevronLeft size={16} />
            </button>
            <button className="pm-btn pm-btn-secondary pm-btn-sm" onClick={goToday}>
              Today
            </button>
            <button className="pm-btn pm-btn-secondary pm-btn-sm" onClick={nextMonth} title="Next Month">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <button className="pm-btn pm-btn-primary" onClick={() => setIsTaskModalOpen(true)}>
          <Plus size={16} /> Add Task
        </button>
      </div>

      {/* Days of Week Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f8fafc', border: '1px solid #e2e8f0', borderBottom: 'none' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 800, fontSize: '0.75rem', color: '#64748b' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid of Days */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#e2e8f0', gap: '1px', border: '1px solid #e2e8f0', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
        {calendarDays.map((cell, idx) => {
          const dateStr = cell.date.toISOString().split('T')[0];
          const cellTasks = tasks.filter(t => t.dueDate === dateStr);
          const cellMilestones = milestones.filter(m => m.date === dateStr);
          const today = isToday(cell.date);

          return (
            <div
              key={idx}
              style={{
                minHeight: '110px',
                background: cell.isCurrentMonth ? 'white' : '#f8fafc',
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                opacity: cell.isCurrentMonth ? 1 : 0.45
              }}
            >
              {/* Day Number Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: today ? '#4f46e5' : 'transparent',
                    color: today ? 'white' : '#334155'
                  }}
                >
                  {cell.date.getDate()}
                </span>
                {cellMilestones.length > 0 && (
                  <span title={cellMilestones.map(m => m.name).join(', ')}>
                    <Flag size={14} color="#f59e0b" />
                  </span>
                )}
              </div>

              {/* Task Chips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto', maxHeight: '80px' }}>
                {cellTasks.map(t => (
                  <div
                    key={t.id || t._dbId}
                    onClick={() => setSelectedTaskForDrawer(t)}
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 5px',
                      borderRadius: '4px',
                      background: t.status === 'Done' ? '#dcfce7' : '#e0e7ff',
                      color: t.status === 'Done' ? '#15803d' : '#4338ca',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      cursor: 'pointer',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}
                    title={`${t.name} (${t.status})`}
                  >
                    {t.name}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default ProjectCalendarView;

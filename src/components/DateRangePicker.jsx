import React, { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import './DateRangePicker.css';

dayjs.extend(isBetween);

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const DateRangePicker = ({ onChange, initialRange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(
    initialRange?.start ? dayjs(initialRange.start) : dayjs().subtract(29, 'day')
  );
  const [endDate, setEndDate] = useState(
    initialRange?.end ? dayjs(initialRange.end) : dayjs()
  );
  const [hoverDate, setHoverDate] = useState(null);
  const [viewYear, setViewYear] = useState(dayjs().year());
  const [viewMonth, setViewMonth] = useState(
    initialRange?.start ? dayjs(initialRange.start).month() : Math.max(0, dayjs().month() - 1)
  );

  const containerRef = useRef(null);

  const presets = [
    { label: 'Today',         getValue: () => [dayjs(), dayjs()] },
    { label: 'Yesterday',     getValue: () => [dayjs().subtract(1,'day'), dayjs().subtract(1,'day')] },
    { label: 'Last 7 Days',   getValue: () => [dayjs().subtract(6,'day'), dayjs()] },
    { label: 'Last 30 Days',  getValue: () => [dayjs().subtract(29,'day'), dayjs()] },
    { label: 'Last Month',    getValue: () => [dayjs().subtract(1,'month').startOf('month'), dayjs().subtract(1,'month').endOf('month')] },
    { label: 'Last 3 Month',  getValue: () => [dayjs().subtract(3,'month').startOf('month'), dayjs().subtract(1,'month').endOf('month')] },
    { label: 'Last 6 Month',  getValue: () => [dayjs().subtract(6,'month').startOf('month'), dayjs().subtract(1,'month').endOf('month')] },
    { label: 'Last 1 Year',   getValue: () => [dayjs().subtract(1,'year').startOf('year'), dayjs().subtract(1,'year').endOf('year')] },
    { label: 'Current Month', getValue: () => [dayjs().startOf('month'), dayjs().endOf('month')] },
    { label: 'Current F.Y.',  getValue: () => {
      const today = dayjs();
      const startYear = today.month() < 3 ? today.year() - 1 : today.year();
      return [dayjs(`${startYear}-04-01`), today];
    }},
  ];

  const handlePresetClick = (preset) => {
    const [start, end] = preset.getValue();
    setStartDate(start);
    setEndDate(end);
    setViewYear(start.year());
    setViewMonth(start.month());
  };

  const handleDayClick = (clickedDay) => {
    if (!startDate || (startDate && endDate)) {
      // Start new selection
      setStartDate(clickedDay);
      setEndDate(null);
      setHoverDate(null);
    } else {
      // Complete the range
      if (clickedDay.isBefore(startDate, 'day')) {
        setStartDate(clickedDay);
        setEndDate(null);
      } else {
        setEndDate(clickedDay);
        // Automatically trigger onChange when range is completed
        if (onChange) {
          onChange({ start: startDate.toDate(), end: clickedDay.toDate() });
        }
      }
    }
  };

  const handleApply = () => {
    if (startDate && endDate && onChange) {
      onChange({ start: startDate.toDate(), end: endDate.toDate() });
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigateMonth = (direction) => {
    let newMonth = viewMonth + direction;
    let newYear = viewYear;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    if (newMonth < 0)  { newMonth = 11; newYear--; }
    setViewMonth(newMonth);
    setViewYear(newYear);
  };

  const renderCalendar = (year, month, navButton, isRight) => {
    const firstDay = dayjs(`${year}-${String(month + 1).padStart(2, '0')}-01`);
    const daysInMonth = firstDay.daysInMonth();

    // Shift to Monday-start (0=Mon, 6=Sun)
    const startDow = firstDay.day(); // 0=Sun
    const offset = startDow === 0 ? 6 : startDow - 1;

    const cells = [];

    // Empty cells
    for (let i = 0; i < offset; i++) {
      cells.push(<div key={`e-${i}`} className="day-cell empty" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const current = firstDay.date(d);
      const isStart = startDate && current.isSame(startDate, 'day');
      const isEnd   = endDate   && current.isSame(endDate,   'day');
      const isInRange = startDate && endDate && current.isBetween(startDate, endDate, 'day', '[]');
      const isHovering = startDate && !endDate && hoverDate && (
        current.isBetween(startDate, hoverDate, 'day', '[]') ||
        current.isBetween(hoverDate, startDate, 'day', '[]')
      );

      let cls = 'day-cell';
      if (isStart || isEnd) cls += ' selected';
      if (isStart && endDate) cls += ' range-start';
      if (isEnd && startDate) cls += ' range-end';
      if ((isInRange || isHovering) && !isStart && !isEnd) cls += ' in-range';

      cells.push(
        <div
          key={d}
          className={cls}
          onClick={() => handleDayClick(current)}
          onMouseEnter={() => { if (startDate && !endDate) setHoverDate(current); }}
        >
          {d}
        </div>
      );
    }

    const yearOptions = [];
    const thisYear = dayjs().year();
    for (let y = thisYear - 5; y <= thisYear + 2; y++) {
      yearOptions.push(<option key={y} value={y}>{y}</option>);
    }

    return (
      <div className="calendar-pane">
        <div className="calendar-header">
          {!isRight ? navButton : <div className="nav-btn-placeholder" />}
          <div className="month-selector">
            <select
              className="calendar-nav-select"
              value={month}
              onChange={(e) => setViewMonth(parseInt(e.target.value))}
            >
              {MONTHS.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
            </select>
            <select
              className="calendar-nav-select"
              value={year}
              onChange={(e) => setViewYear(parseInt(e.target.value))}
            >
              {yearOptions}
            </select>
          </div>
          {isRight ? navButton : <div className="nav-btn-placeholder" />}
        </div>
        <div className="calendar-grid">
          {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
            <div key={d} className="weekday-header">{d}</div>
          ))}
          {cells}
        </div>
      </div>
    );
  };

  // Compute the second month (viewMonth + 1)
  let secondMonth = viewMonth + 1;
  let secondYear  = viewYear;
  if (secondMonth > 11) { secondMonth = 0; secondYear++; }

  const formatDisplay = (date) => date ? date.format('DD-MM-YYYY') : '';
  const rangeLabel = startDate && endDate
    ? `${formatDisplay(startDate)}  To  ${formatDisplay(endDate)}`
    : startDate
      ? `${formatDisplay(startDate)}  —  ...`
      : 'Select Date Range';

  return (
    <div className="date-range-picker-container" ref={containerRef}>
      <button
        type="button"
        className="date-range-trigger"
        onClick={() => setIsOpen(prev => !prev)}
      >
        <Calendar size={18} color="#10b981" />
        {rangeLabel}
      </button>

      {isOpen && (
        <div className="date-range-popover" onMouseLeave={() => setHoverDate(null)}>
          {/* Sidebar Presets */}
          <div className="date-range-presets">
            {presets.map(p => {
              const [ps, pe] = p.getValue();
              const isActive = startDate && endDate
                && ps.isSame(startDate, 'day')
                && pe.isSame(endDate, 'day');
              return (
                <div
                  key={p.label}
                  className={`preset-item${isActive ? ' active' : ''}`}
                  onClick={() => handlePresetClick(p)}
                >
                  {p.label}
                </div>
              );
            })}
          </div>

          {/* Calendars + Footer */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <div className="date-range-calendars">
              {/* Left Calendar */}
              <div style={{ flex: 1 }}>
                {renderCalendar(viewYear, viewMonth, (
                  <button
                    type="button"
                    className="nav-btn"
                    onClick={() => navigateMonth(-1)}
                  >
                    <ChevronLeft size={20} />
                  </button>
                ), false)}
              </div>

              <div style={{ width: '1px', background: '#f1f5f9', margin: '0 8px' }} />

              {/* Right Calendar */}
              <div style={{ flex: 1 }}>
                {renderCalendar(secondYear, secondMonth, (
                  <button
                    type="button"
                    className="nav-btn"
                    onClick={() => navigateMonth(1)}
                  >
                    <ChevronRight size={20} />
                  </button>
                ), true)}
              </div>
            </div>

            <div className="date-range-footer">
              <div className="footer-range-text">
                {startDate && formatDisplay(startDate)}
                {endDate && ` To ${formatDisplay(endDate)}`}
              </div>
              <div className="footer-actions">
                <button type="button" className="cancel-btn" onClick={handleCancel}>Cancel</button>
                <button type="button" className="apply-btn" onClick={handleApply} disabled={!startDate || !endDate}>Apply</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;

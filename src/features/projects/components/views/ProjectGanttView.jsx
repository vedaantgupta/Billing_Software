import React, { useState, useMemo, useRef } from 'react';
import {
  ZoomIn, ZoomOut, Calendar, Layers, Eye,
  ChevronRight, Clock, AlertTriangle
} from 'lucide-react';
import { useProject } from '@/features/projects/context/ProjectContext';

const ProjectGanttView = () => {
  const {
    tasks,
    milestones,
    activeProject,
    dependencyAnalysis,
    setSelectedTaskForDrawer,
    updateTask
  } = useProject();

  const [zoomLevel, setZoomLevel] = useState('days'); // 'days', 'weeks'
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const containerRef = useRef(null);

  // Compute timeline boundaries
  const { startDate, totalDays, dayList } = useMemo(() => {
    let minDate = activeProject?.startDate ? new Date(activeProject.startDate) : new Date();
    let maxDate = activeProject?.endDate ? new Date(activeProject.endDate) : new Date(minDate.getTime() + 30 * 86400000);

    tasks.forEach(t => {
      if (t.startDate) {
        const d = new Date(t.startDate);
        if (d < minDate) minDate = d;
      }
      if (t.dueDate) {
        const d = new Date(t.dueDate);
        if (d > maxDate) maxDate = d;
      }
    });

    // Pad by 3 days before and 10 days after
    minDate = new Date(minDate.getTime() - 3 * 86400000);
    maxDate = new Date(maxDate.getTime() + 10 * 86400000);

    const diffMs = maxDate - minDate;
    const days = Math.max(14, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const list = [];
    for (let i = 0; i < days; i++) {
      const cur = new Date(minDate.getTime() + i * 86400000);
      list.push(cur);
    }

    return { startDate: minDate, totalDays: days, dayList: list };
  }, [activeProject, tasks]);

  const cellWidth = zoomLevel === 'days' ? 44 : 22;
  const rowHeight = 44;

  const filteredTasks = useMemo(() => {
    if (showCriticalOnly) {
      return tasks.filter(t => dependencyAnalysis.criticalTaskIds?.has(t.id || t._dbId));
    }
    return tasks;
  }, [tasks, showCriticalOnly, dependencyAnalysis]);

  // Calculate task bar position
  const getTaskBarCoords = (task) => {
    const tStart = task.startDate ? new Date(task.startDate) : new Date();
    const tEnd = task.dueDate ? new Date(task.dueDate) : new Date(tStart.getTime() + 2 * 86400000);

    const startOffsetDays = Math.max(0, (tStart - startDate) / (1000 * 60 * 60 * 24));
    const durationDays = Math.max(1, (tEnd - tStart) / (1000 * 60 * 60 * 24));

    const left = Math.round(startOffsetDays * cellWidth);
    const width = Math.max(cellWidth, Math.round(durationDays * cellWidth));

    return { left, width };
  };

  const todayOffsetDays = (new Date() - startDate) / (1000 * 60 * 60 * 24);
  const todayLeft = Math.round(todayOffsetDays * cellWidth);

  return (
    <div className="pm-gantt-wrapper">
      
      {/* Gantt Toolbar */}
      <div className="pm-gantt-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'white', padding: '0.2rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <button
              className={`pm-btn pm-btn-sm ${zoomLevel === 'days' ? 'pm-btn-primary' : 'pm-btn-ghost'}`}
              onClick={() => setZoomLevel('days')}
            >
              Days
            </button>
            <button
              className={`pm-btn pm-btn-sm ${zoomLevel === 'weeks' ? 'pm-btn-primary' : 'pm-btn-ghost'}`}
              onClick={() => setZoomLevel('weeks')}
            >
              Weeks
            </button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showCriticalOnly}
              onChange={e => setShowCriticalOnly(e.target.checked)}
              style={{ accentColor: '#ef4444', cursor: 'pointer' }}
            />
            <span style={{ color: showCriticalOnly ? '#dc2626' : '#64748b' }}>
              Highlight Critical Path ({dependencyAnalysis.criticalTaskIds?.size || 0})
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#4f46e5' }} /> Normal
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ef4444' }} /> Critical Path
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', transform: 'rotate(45deg)', background: '#f59e0b' }} /> Milestone
          </span>
        </div>
      </div>

      {/* Gantt Body */}
      <div className="pm-gantt-body" ref={containerRef}>
        
        {/* Left Column: Task Labels */}
        <div className="pm-gantt-task-col">
          {/* Header */}
          <div style={{ height: '48px', padding: '0 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', fontWeight: 800, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
            Task Name ({filteredTasks.length})
          </div>

          {/* Task Rows */}
          {filteredTasks.map(task => {
            const isCritical = dependencyAnalysis.criticalTaskIds?.has(task.id || task._dbId);
            return (
              <div
                key={task.id || task._dbId}
                className="pm-gantt-row"
                onClick={() => setSelectedTaskForDrawer(task)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', overflow: 'hidden' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isCritical ? '#ef4444' : '#4f46e5', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.825rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {task.name}
                  </span>
                </div>
              </div>
            );
          })}

          {filteredTasks.length === 0 && (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
              No tasks to display.
            </div>
          )}
        </div>

        {/* Right Column: Timeline Grid */}
        <div className="pm-gantt-timeline-col" style={{ width: `${dayList.length * cellWidth}px` }}>
          
          {/* Header Days */}
          <div style={{ height: '48px', borderBottom: '1px solid #e2e8f0', display: 'flex', background: '#f8fafc' }}>
            {dayList.map((day, i) => {
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              return (
                <div
                  key={i}
                  style={{
                    width: `${cellWidth}px`,
                    flexShrink: 0,
                    borderRight: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.675rem',
                    color: isWeekend ? '#94a3b8' : '#475569',
                    background: isWeekend ? 'rgba(0,0,0,0.02)' : 'transparent',
                    fontWeight: 700
                  }}
                >
                  {zoomLevel === 'days' ? (
                    <>
                      <span>{day.toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
                      <span>{day.getDate()}</span>
                    </>
                  ) : (
                    <span>{day.getDate()}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Today Indicator Line */}
          {todayLeft >= 0 && todayLeft <= dayList.length * cellWidth && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${todayLeft}px`,
                width: '2px',
                background: '#ef4444',
                zIndex: 8,
                pointerEvents: 'none'
              }}
            >
              <span style={{ position: 'absolute', top: 2, left: 4, fontSize: '0.65rem', fontWeight: 800, background: '#ef4444', color: 'white', padding: '1px 4px', borderRadius: '4px' }}>
                TODAY
              </span>
            </div>
          )}

          {/* SVG Dependency Link Lines */}
          <svg
            style={{
              position: 'absolute',
              top: 48,
              left: 0,
              width: '100%',
              height: `${filteredTasks.length * rowHeight}px`,
              pointerEvents: 'none',
              zIndex: 5
            }}
          >
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#818cf8" />
              </marker>
              <marker id="arrow-critical" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#ef4444" />
              </marker>
            </defs>

            {filteredTasks.map((task, rowIdx) => {
              const fromCoords = getTaskBarCoords(task);
              const fromX = fromCoords.left + fromCoords.width;
              const fromY = rowIdx * rowHeight + rowHeight / 2;

              return (task.dependencies || []).map((dep, depIdx) => {
                const predId = typeof dep === 'object' ? dep.taskId : dep;
                const predRowIdx = filteredTasks.findIndex(t => (t.id || t._dbId) === predId);
                if (predRowIdx === -1) return null;

                const toCoords = getTaskBarCoords(filteredTasks[predRowIdx]);
                const toX = toCoords.left;
                const toY = predRowIdx * rowHeight + rowHeight / 2;

                const isCrit = dependencyAnalysis.criticalTaskIds?.has(task.id || task._dbId);

                // Bezier curve connecting tasks
                return (
                  <path
                    key={`${task.id}-${predId}-${depIdx}`}
                    d={`M ${toX + toCoords.width} ${toY} C ${(toX + toCoords.width + fromCoords.left) / 2} ${toY}, ${(toX + toCoords.width + fromCoords.left) / 2} ${fromY}, ${fromCoords.left} ${fromY}`}
                    fill="none"
                    stroke={isCrit ? '#ef4444' : '#818cf8'}
                    strokeWidth="1.5"
                    markerEnd={isCrit ? 'url(#arrow-critical)' : 'url(#arrow)'}
                    strokeDasharray={isCrit ? 'none' : '3,3'}
                  />
                );
              });
            })}
          </svg>

          {/* Timeline Task Bars */}
          {filteredTasks.map((task, idx) => {
            const { left, width } = getTaskBarCoords(task);
            const isCritical = dependencyAnalysis.criticalTaskIds?.has(task.id || task._dbId);

            return (
              <div
                key={task.id || task._dbId}
                style={{
                  height: `${rowHeight}px`,
                  borderBottom: '1px solid #f1f5f9',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <div
                  className={`pm-gantt-bar ${isCritical ? 'critical' : ''}`}
                  style={{
                    left: `${left}px`,
                    width: `${width}px`,
                    zIndex: 6
                  }}
                  onClick={() => setSelectedTaskForDrawer(task)}
                  title={`${task.name} (${task.status}) - ${task.startDate || 'No start'} to ${task.dueDate || 'No end'}`}
                >
                  {task.name}
                </div>
              </div>
            );
          })}

          {/* Milestones Diamonds on Timeline */}
          {milestones.map(m => {
            if (!m.date) return null;
            const mDate = new Date(m.date);
            const offset = (mDate - startDate) / (1000 * 60 * 60 * 24);
            const mLeft = Math.round(offset * cellWidth);
            if (mLeft < 0 || mLeft > dayList.length * cellWidth) return null;

            return (
              <div
                key={m.id || m._dbId}
                style={{
                  position: 'absolute',
                  top: '55px',
                  left: `${mLeft}px`,
                  zIndex: 7,
                  cursor: 'pointer'
                }}
                title={`Milestone: ${m.name} (${m.date})`}
              >
                <div style={{ width: '12px', height: '12px', background: '#f59e0b', transform: 'rotate(45deg)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
              </div>
            );
          })}

        </div>

      </div>

    </div>
  );
};

export default ProjectGanttView;

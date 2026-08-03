import React from 'react';

const DashboardRingGauge = ({
  title,
  totalLabel = 'Total Payment',
  totalValue = 0,
  segments = [],
  size = 110,
  strokeWidth = 10,
  icon: Icon
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const totalSegmentsSum = segments.reduce((sum, s) => sum + (Number(s.value) || 0), 0) || 1;

  let accumulatedPercent = 0;

  return (
    <div className="glass db-ring-card">
      <div className="db-ring-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {Icon && <Icon size={18} className="db-ring-icon" />}
          <h4 className="db-ring-card-title">{title}</h4>
        </div>
      </div>

      <div className="db-ring-card-body">
        {/* SVG Ring with centered text */}
        <div className="db-ring-wrapper" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Background Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(226, 232, 240, 0.7)"
              strokeWidth={strokeWidth}
            />

            {/* Segments */}
            {segments.map((seg, i) => {
              const val = Number(seg.value) || 0;
              if (val <= 0) return null;
              const percent = val / totalSegmentsSum;
              const strokeDasharray = `${percent * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedPercent * circumference;
              accumulatedPercent += percent;

              return (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={seg.color || '#10b981'}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{
                    transform: 'rotate(-90deg)',
                    transformOrigin: '50% 50%',
                    transition: 'stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <title>{`${seg.label}: ₹${val.toLocaleString()} (${(percent * 100).toFixed(0)}%)`}</title>
                </circle>
              );
            })}
          </svg>

          {/* Ring Center Summary */}
          <div className="db-ring-center-text">
            <span className="db-ring-center-val">
              {totalSegmentsSum > 0 ? '100%' : '0%'}
            </span>
          </div>
        </div>

        {/* Legend & Stats */}
        <div className="db-ring-info">
          <div className="db-ring-total-label">{totalLabel}</div>
          <div className="db-ring-total-value">
            ₹ {Number(totalValue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>

          <div className="db-ring-segments-list">
            {segments.map((seg, idx) => {
              const val = Number(seg.value) || 0;
              const pct = totalSegmentsSum > 0 ? Math.round((val / totalSegmentsSum) * 100) : 0;

              return (
                <div key={idx} className="db-ring-segment-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      className="db-ring-dot"
                      style={{ backgroundColor: seg.color || '#10b981' }}
                    />
                    <span className="db-ring-seg-name">{seg.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {pct}%
                    </span>
                    <span className="db-ring-seg-val">
                      ₹ {val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardRingGauge;

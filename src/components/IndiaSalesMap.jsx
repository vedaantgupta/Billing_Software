import React, { useState, useMemo } from 'react';
import mapData from '../data/indiaMapData';

const IndiaSalesMap = ({ salesData = [] }) => {
  const [hoveredState, setHoveredState] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.3, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.3, 0.5));

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMoveMap = (e) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Normalize data for easy lookup
  const stateSalesMap = useMemo(() => {
    const map = {};
    let max = 0;
    let total = 0;

    salesData.forEach(item => {
      // Map database state names to the map data IDs or Names
      // Most common mapping: ID (e.g., 'mh') or lowercase name
      const stateKey = item.state.toLowerCase().replace(/ & /g, ' and ');
      map[stateKey] = item;
      if (item.total > max) max = item.total;
      total += item.total;
    });

    return { map, max, total };
  }, [salesData]);

  const getColor = (location) => {
    const stateKey = location.name.toLowerCase();
    const data = stateSalesMap.map[stateKey];
    
    if (!data || data.total === 0) return 'rgba(99, 102, 241, 0.1)'; // Light indigo/gray for no sales
    
    const intensity = Math.max(0.2, (data.total / stateSalesMap.max) || 0);
    return `rgba(99, 102, 241, ${intensity})`; // Scale indigo based on sales
  };

  const handleMouseMove = (e, location) => {
    const stateKey = location.name.toLowerCase();
    const data = stateSalesMap.map[stateKey] || { total: 0, state: location.name };
    const percentage = stateSalesMap.total > 0 ? ((data.total / stateSalesMap.total) * 100).toFixed(1) : 0;
    
    setHoveredState({
      ...data,
      percentage,
      name: location.name
    });
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div 
      className="india-sales-map" 
      style={{ 
        width: '100%', 
        maxWidth: '100%', 
        position: 'relative', 
        display: 'block', 
        margin: '0 auto', 
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMoveMap}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      
      <div style={{ position: 'absolute', bottom: '15px', right: '15px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 10 }}>
        <button 
          title="Zoom In"
          onClick={handleZoomIn}
          style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: '#e2e8f0', borderRadius: '4px', cursor: 'pointer', fontSize: '18px', color: '#1e293b', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        >
          +
        </button>
        <button 
          title="Zoom Out"
          onClick={handleZoomOut}
          style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: '#e2e8f0', borderRadius: '4px', cursor: 'pointer', fontSize: '18px', color: '#1e293b', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        >
          -
        </button>
      </div>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={mapData.viewBox}
        aria-label={mapData.label}
        style={{ 
          width: '100%', 
          height: 'auto', 
          maxHeight: '460px', 
          display: 'block', 
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        <g>
          {mapData.locations.map((location) => (
            <path
              key={location.id}
              id={location.id}
              name={location.name}
              d={location.path}
              fill={getColor(location)}
              stroke="#fff"
              strokeWidth="0.5"
              style={{ 
                transition: 'fill 0.2s, stroke-width 0.2s',
                cursor: isDragging ? 'grabbing' : 'pointer',
                outline: 'none'
              }}
              onMouseMove={(e) => {
                if (!isDragging) {
                  handleMouseMove(e, location);
                }
              }}
              onMouseEnter={() => {}}
              onMouseLeave={() => setHoveredState(null)}
            />
          ))}
        </g>
      </svg>

      {hoveredState && (
        <div
          style={{
            position: 'fixed',
            left: tooltipPos.x + 15,
            top: tooltipPos.y - 10,
            background: 'white',
            border: '1px solid var(--border-color)',
            padding: '10px',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            pointerEvents: 'none',
            minWidth: '150px'
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-primary)' }}>
            {hoveredState.name}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Sales: <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>₹{hoveredState.total.toLocaleString()}</span>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Contribution: <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>{hoveredState.percentage}%</span>
          </div>
        </div>
      )}

      <style>{`
        .india-sales-map path:hover {
          fill: var(--primary-light) !important;
          stroke-width: 1.5;
          filter: brightness(1.1);
        }
      `}</style>
    </div>
  );
};

export default IndiaSalesMap;

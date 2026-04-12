import React, { useState, useMemo, useRef, useEffect } from "react";
import mapData from "../data/indiaMapData";
import { Plus, Minus, RotateCcw, Move } from "lucide-react";

const IndiaMap = ({ salesData = [] }) => {
    const [tooltip, setTooltip] = useState(null);
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    // Normalize salesData array into an object for efficient lookup
    const salesLookup = useMemo(() => {
        if (!Array.isArray(salesData)) return salesData || {};
        return salesData.reduce((acc, item) => {
            acc[item.state] = item.total;
            return acc;
        }, {});
    }, [salesData]);

    const totalSales = useMemo(() => {
        return Object.values(salesLookup).reduce((sum, val) => sum + val, 0);
    }, [salesLookup]);

    const getColor = (stateName) => {
        const sale = salesLookup[stateName] || 0;
        if (sale === 0) return "#ccc";    
        if (sale > 4000) return "#8b5cf6"; 
        if (sale > 1000) return "#3b82f6"; 
        return "#93c5fd";                  
    };

    const handleMouseMove = (event, stateName) => {
        if (!containerRef.current || isDragging) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        setTooltip({
            x,
            y,
            name: stateName,
            sale: salesLookup[stateName] || 0,
            percent: totalSales > 0 ? (((salesLookup[stateName] || 0) / totalSales) * 100).toFixed(1) : "0.0"
        });
    };

    // Zoom Functions
    const zoomIn = () => setTransform(prev => ({ ...prev, scale: Math.min(prev.scale + 0.2, 5) }));
    const zoomOut = () => setTransform(prev => ({ ...prev, scale: Math.max(prev.scale - 0.2, 0.5) }));
    const resetZoom = () => setTransform({ scale: 1, x: 0, y: 0 });

    // Drag Functions
    const onMouseDown = (e) => {
        if (e.target.tagName === 'path') {
            // Check if we should allow drag start even on paths
            // If they just click a state, it might move. 
            // Better to allow drag anywhere in container.
        }
        setIsDragging(true);
        setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
        setTooltip(null); // Hide tooltip when dragging starts
    };

    const onContainerMouseMove = (e) => {
        if (!isDragging) return;
        setTransform(prev => ({
            ...prev,
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        }));
    };

    const onMouseUp = () => setIsDragging(false);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', onContainerMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        } else {
            window.removeEventListener('mousemove', onContainerMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', onContainerMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDragging, dragStart]);

    return (
        <div 
            ref={containerRef}
            onMouseDown={onMouseDown}
            style={{ 
                position: "relative", 
                width: "100%", 
                height: "100%", 
                display: "flex", 
                justifyContent: "center", 
                alignItems: "center", 
                overflow: "hidden",
                cursor: isDragging ? "grabbing" : "grab",
                background: "#f8fafc"
            }}
        >
            {/* Zoom Controls Overlay */}
            <div style={{
                position: "absolute",
                bottom: "20px",
                left: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                zIndex: 20
            }}>
                <button onClick={zoomIn} style={controlButtonStyle} title="Zoom In"><Plus size={18} /></button>
                <button onClick={zoomOut} style={controlButtonStyle} title="Zoom Out"><Minus size={18} /></button>
                <button onClick={resetZoom} style={controlButtonStyle} title="Reset"><RotateCcw size={18} /></button>
            </div>

            <div style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                fontSize: "0.75rem",
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(255,255,255,0.8)",
                padding: "4px 8px",
                borderRadius: "20px",
                zIndex: 10
            }}>
                <Move size={12} /> Drag to explore
            </div>

            <svg 
                viewBox={mapData.viewBox} 
                style={{ 
                    maxWidth: "100%", 
                    maxHeight: "100%", 
                    width: "auto", 
                    height: "auto", 
                    display: "block",
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    transformOrigin: "center",
                    transition: isDragging ? "none" : "transform 0.1s ease-out"
                }}
                xmlns="http://www.w3.org/2000/svg"
            >
                {mapData.locations.map((location) => (
                    <path
                        key={location.id}
                        d={location.path}
                        fill={getColor(location.name)}
                        stroke="#fff"
                        strokeWidth="0.7"
                        style={{ 
                            transition: "fill 0.3s ease, stroke 0.3s ease",
                            cursor: "pointer",
                            pointerEvents: "all"
                        }}
                        onMouseEnter={(e) => {
                            if (isDragging) return;
                            e.currentTarget.setAttribute("stroke-width", "2");
                            e.currentTarget.setAttribute("stroke", "#4338ca");
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.setAttribute("stroke-width", "0.7");
                            e.currentTarget.setAttribute("stroke", "#fff");
                            setTooltip(null);
                        }}
                        onMouseMove={(e) => handleMouseMove(e, location.name)}
                    />
                ))}
            </svg>

            {tooltip && !isDragging && (
                <div
                    style={{
                        position: "absolute",
                        top: tooltip.y < 150 ? tooltip.y + 20 : tooltip.y - 130,
                        left: tooltip.x > 300 ? tooltip.x - 175 : tooltip.x + 15,
                        background: "rgba(255, 255, 255, 0.98)",
                        padding: "12px 16px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        pointerEvents: "none",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                        zIndex: 1000,
                        minWidth: "160px",
                        backdropFilter: "blur(4px)",
                        borderLeft: `4px solid ${getColor(tooltip.name)}`
                    }}
                >
                    <div style={{ fontWeight: 800, color: "#1e293b", marginBottom: "6px", fontSize: "1rem" }}>
                        {tooltip.name}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#64748b", display: "flex", justifyContent: "space-between" }}>
                        <span>Revenue:</span>
                        <span style={{ color: getColor(tooltip.name), fontWeight: 700, marginLeft: "12px" }}>
                            ₹{tooltip.sale.toLocaleString('en-IN')}
                        </span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                        <span>Contribution:</span>
                        <span style={{ fontWeight: 600, color: "#475569" }}>{tooltip.percent}%</span>
                    </div>
                    <div style={{ 
                        marginTop: "8px", 
                        paddingTop: "8px", 
                        borderTop: "1px solid #f1f5f9",
                        fontSize: "0.75rem",
                        color: tooltip.sale > 4000 ? "#8b5cf6" : tooltip.sale > 1000 ? "#3b82f6" : "#94a3b8",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.025em"
                    }}>
                        {tooltip.sale > 4000 ? "High Performance" : tooltip.sale > 1000 ? "Moderate" : tooltip.sale > 0 ? "Low Sales" : "No Sales"}
                    </div>
                </div>
            )}
        </div>
    );
};

const controlButtonStyle = {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    background: "#fff",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    color: "#475569",
    transition: "all 0.2s"
};

export default IndiaMap;
;
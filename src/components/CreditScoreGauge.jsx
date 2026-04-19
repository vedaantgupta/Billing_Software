import React, { useState, useEffect } from 'react';
import { getQualitativeLabel } from '../utils/creditScore';
import './CreditScoreGauge.css';

const CreditScoreGauge = ({ score = 750 }) => {
  const size = 500; // Strictly enforced as per user request
  const [animatedScore, setAnimatedScore] = useState(300);
  const { label, color } = getQualitativeLabel(score);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  // Needle Rotation: -90deg is 300, +90deg is 900
  const needleRotation = ((animatedScore - 300) / (900 - 300)) * 180 - 90;

  return (
    <div className="cs-gauge-pixel-perfect" style={{ width: size }}>
      {/* Background Tech Details */}
      <div className="cs-tech-bg"></div>

      {/* Top Points Indicator (Optional Header) */}
      <div className="cs-top-points">
        <span className="plus-pts">+18 PTS</span> <span className="pts-label">THIS MONTH</span>
      </div>

      <svg viewBox="0 0 200 120" className="cs-svg-hq">
        <defs>
          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="blur" in2="SourceGraphic" operator="over" />
          </filter>

          <linearGradient id="needleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.2" />
          </linearGradient>

          {/* Gradients for each segment — vivid neon */}
          <linearGradient id="gradPoor" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7f0000" />
            <stop offset="100%" stopColor="#ff2020" />
          </linearGradient>
          <linearGradient id="gradFair" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7a4100" />
            <stop offset="100%" stopColor="#ffcc00" />
          </linearGradient>
          <linearGradient id="gradGood" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#004d30" />
            <stop offset="100%" stopColor="#00ffaa" />
          </linearGradient>
          <linearGradient id="gradExcellent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#005540" />
            <stop offset="100%" stopColor="#00ffcc" />
          </linearGradient>

          {/* Paths for curved labels — tighter spacing between segments */}
          <path id="curvePoor"      d="M 22 100 A 78 78 0 0 1 46 46" />
          <path id="curveFair"      d="M 50 41  A 78 78 0 0 1 96 21" />
          <path id="curveGood"      d="M 104 21 A 78 78 0 0 1 150 41" />
          <path id="curveExcellent" d="M 154 46 A 78 78 0 0 1 178 100" />
        </defs>

        {/* 4 Main Segments — tighter gaps, gradients, neon glow */}
        <g className="cs-hq-segments">
          {/* POOR */}
          <path d="M 22 100 A 78 78 0 0 1 46 46" fill="none" stroke="url(#gradPoor)" strokeWidth="22" className="segment-path seg-poor" />
          <text className="cs-hq-label">
            <textPath xlinkHref="#curvePoor" startOffset="50%" textAnchor="middle">POOR</textPath>
          </text>

          {/* FAIR */}
          <path d="M 50 41 A 78 78 0 0 1 96 21" fill="none" stroke="url(#gradFair)" strokeWidth="22" className="segment-path seg-fair" />
          <text className="cs-hq-label">
            <textPath xlinkHref="#curveFair" startOffset="50%" textAnchor="middle">FAIR</textPath>
          </text>

          {/* GOOD */}
          <path d="M 104 21 A 78 78 0 0 1 150 41" fill="none" stroke="url(#gradGood)" strokeWidth="22" className="segment-path seg-good" />
          <text className="cs-hq-label">
            <textPath xlinkHref="#curveGood" startOffset="50%" textAnchor="middle">GOOD</textPath>
          </text>

          {/* EXCELLENT */}
          <path d="M 154 46 A 78 78 0 0 1 178 100" fill="none" stroke="url(#gradExcellent)" strokeWidth="22" className="segment-path seg-excellent" />
          <text className="cs-hq-label">
            <textPath xlinkHref="#curveExcellent" startOffset="50%" textAnchor="middle">EXCELLENT</textPath>
          </text>
        </g>

        {/* Small ticks under the arc */}
        <g className="cs-hq-ticks">
          {[...Array(25)].map((_, i) => {
            const angle = (i * 7.5) * (Math.PI / 180);
            const r1 = 65;
            const r2 = 68;
            const x1 = 100 - r1 * Math.cos(angle);
            const y1 = 105 - r1 * Math.sin(angle);
            const x2 = 100 - r2 * Math.cos(angle);
            const y2 = 105 - r2 * Math.sin(angle);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.2)" />;
          })}
        </g>

        {/* Main Center Score */}
        <text x="100" y="85" textAnchor="middle" className="cs-hq-score-num">{Math.round(animatedScore)}</text>
        <text x="100" y="105" textAnchor="middle" className="cs-hq-score-label" fill={color}>{label.toUpperCase()}</text>

        <g transform={`rotate(${needleRotation} 100 105)`} filter="url(#neonGlow)">
          <path d="M 100 105 L 100 30" stroke="url(#needleGrad)" strokeWidth="2.5" strokeLinecap="round" />
          {/* Futuristic Arrow Tip — no hub circle */}
          <path d="M 95 35 L 100 12 L 105 35 L 100 28 Z" fill="#fff" filter="url(#neonGlow)" />
        </g>
      </svg>

      <div className="cs-bottom-pills hq-style">
        <div className="cs-pill pill-status" style={{ backgroundColor: color }}>{label.toUpperCase()}</div>
        <div className="cs-pill pill-range">750-850</div>
      </div>
    </div>
  );
};

export default CreditScoreGauge;
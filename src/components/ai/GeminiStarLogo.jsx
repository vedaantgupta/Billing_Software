import React, { useId } from 'react';

/**
 * Official Google Gemini Multi-Color Star Logo with flowing animated colors INSIDE the star silhouette.
 * Features rotating SVG linearGradient and CSS-driven hover shimmer.
 */
const GeminiStarLogo = ({ size = 22, className = '', id = '' }) => {
  const generatedId = useId ? useId().replace(/[:]/g, '') : 'star';
  const gradId = `gemini_inside_grad_${id || generatedId}_${size}`;
  return (
    <div className={`gemini-star-wrapper ${className}`} style={{ width: size, height: size }} title="Google Gemini">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="gemini-star-svg">
        <path
          d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
          fill={`url(#${gradId})`}
        />
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a73e8">
              <animate attributeName="stop-color" values="#1a73e8;#38bdf8;#8b5cf6;#9333ea;#1a73e8" dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="30%" stopColor="#38bdf8">
              <animate attributeName="stop-color" values="#38bdf8;#8b5cf6;#9333ea;#1a73e8;#38bdf8" dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="65%" stopColor="#8b5cf6">
              <animate attributeName="stop-color" values="#8b5cf6;#9333ea;#1a73e8;#38bdf8;#8b5cf6" dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#9333ea">
              <animate attributeName="stop-color" values="#9333ea;#1a73e8;#38bdf8;#8b5cf6;#9333ea" dur="3s" repeatCount="indefinite" />
            </stop>
            <animateTransform
              attributeName="gradientTransform"
              type="rotate"
              values="0 0.5 0.5; 360 0.5 0.5"
              dur="4s"
              repeatCount="indefinite"
            />
          </linearGradient>
        </defs>
      </svg>
      <div className="gemini-star-hover-glow" />
    </div>
  );
};

export default GeminiStarLogo;

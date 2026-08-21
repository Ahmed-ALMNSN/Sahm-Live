import React from 'react';

interface BowArrowIconProps {
  className?: string;
  size?: number;
}

export const BowArrowIcon: React.FC<BowArrowIconProps> = ({ 
  className = 'w-6 h-6', 
  size 
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-hidden="true"
    >
      <defs>
        {/* Emerald to Mint Primary Gradient */}
        <linearGradient id="sahmEmeraldGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="40%" stopColor="#10b981" />
          <stop offset="80%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#6ee7b7" />
        </linearGradient>

        {/* Golden Cyan Accent Gradient */}
        <linearGradient id="sahmGoldCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>

        {/* Bow Body Metallic Gradient */}
        <linearGradient id="sahmBowGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="30%" stopColor="#059669" />
          <stop offset="70%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>

        {/* Glow Filter */}
        <filter id="sahmGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Target Reticle Orbit Rings (Precision Quant Scanning) */}
      <circle 
        cx="32" 
        cy="32" 
        r="28" 
        stroke="url(#sahmEmeraldGrad)" 
        strokeWidth="1" 
        strokeOpacity="0.25" 
        strokeDasharray="3 3"
      />
      <circle 
        cx="32" 
        cy="32" 
        r="20" 
        stroke="#34d399" 
        strokeWidth="0.75" 
        strokeOpacity="0.18" 
      />

      {/* Modern High-Tech Archery Bow (Curved Aerodynamic Arc) */}
      <path
        d="M 16 50 C 9 39 9 25 16 14 C 20 10 24 9 27 9 C 27 11.5 24 13.5 21 18 C 16 26 16 38 21 46 C 24 50.5 27 52.5 27 55 C 24 55 20 54 16 50 Z"
        fill="url(#sahmBowGrad)"
        stroke="#064e3b"
        strokeWidth="0.8"
      />

      {/* Inner Bow Highlight Spine */}
      <path
        d="M 18 47 C 12 38 12 26 18 17"
        stroke="#6ee7b7"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeOpacity="0.8"
      />

      {/* High-Tension Bowstring with Nock Pull Angle */}
      <path
        d="M 27 9 L 17 32 L 27 55"
        stroke="#94a3b8"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.75"
      />

      {/* Glowing Energy Arrow Shaft (Trajectory piercing forward) */}
      <g filter="url(#sahmGlow)">
        <line
          x1="15"
          y1="32"
          x2="51"
          y2="32"
          stroke="url(#sahmEmeraldGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        {/* Core Arrow Light Beam */}
        <line
          x1="17"
          y1="32"
          x2="48"
          y2="32"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </g>

      {/* Precision Diamond Arrowhead (Multi-faceted Bullish Wedge) */}
      <path
        d="M 55 32 L 40 23.5 L 44 32 L 40 40.5 Z"
        fill="url(#sahmEmeraldGrad)"
        stroke="#6ee7b7"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Arrowhead Center Ridge */}
      <path
        d="M 44 32 L 55 32"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Arrow Fletching / Stabilizer Wings (Tail Feathers) */}
      <g stroke="url(#sahmGoldCyanGrad)" strokeWidth="1.8" strokeLinecap="round">
        <line x1="17" y1="32" x2="10" y2="24" />
        <line x1="17" y1="32" x2="10" y2="40" />
        <line x1="22" y1="32" x2="15" y2="24" />
        <line x1="22" y1="32" x2="15" y2="40" />
      </g>

      {/* Center Nock Lock Node */}
      <circle cx="17" cy="32" r="2.2" fill="#fbbf24" stroke="#047857" strokeWidth="0.8" />

      {/* Breakout Velocity Sparks / Candlestick Accent */}
      <circle cx="56" cy="27" r="1" fill="#38bdf8" />
      <circle cx="58" cy="35" r="1.2" fill="#34d399" />
      <circle cx="49" cy="21" r="0.8" fill="#fbbf24" />
    </svg>
  );
};


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
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="arrowGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>

      {/* Bow Curve (القوس) */}
      <path
        d="M 12,40 C 4,28 4,20 12,8 C 16,5 20,4 23,4 C 23,6 20,8 18,12 C 14,20 14,28 18,36 C 20,40 23,42 23,44 C 20,44 16,43 12,40 Z"
        fill="url(#bowGradient)"
        stroke="#047857"
        strokeWidth="1.5"
      />

      {/* Bow String (الوتر) */}
      <path
        d="M 23,4 L 14,24 L 23,44"
        stroke="#94a3b8"
        strokeWidth="1.5"
        strokeDasharray="none"
      />

      {/* Arrow Shaft (عمود السهم) */}
      <line
        x1="12"
        y1="24"
        x2="42"
        y2="24"
        stroke="#f8fafc"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Arrowhead (رأس السهم الماسي/المثلث) */}
      <path
        d="M 44,24 L 33,18 L 36,24 L 33,30 Z"
        fill="#10b981"
        stroke="#34d399"
        strokeWidth="1.5"
      />

      {/* Arrow Fletching / Feathers (ريش ذيل السهم) */}
      <path
        d="M 14,24 L 8,18 M 14,24 L 8,30 M 17,24 L 12,18 M 17,24 L 12,30"
        stroke="#f59e0b"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Center Nock Guide Point */}
      <circle cx="14" cy="24" r="1.5" fill="#f59e0b" />
    </svg>
  );
};

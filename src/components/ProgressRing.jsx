import React from 'react';

// Anel de progresso (SVG). value: 0–100.
export default function ProgressRing({ value = 0, size = 56, stroke = 6, className, children }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value));
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className || ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="hsl(var(--primary))" strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-200">
        {children ?? `${Math.round(pct)}%`}
      </div>
    </div>
  );
}

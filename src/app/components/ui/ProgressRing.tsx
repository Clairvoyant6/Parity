import { useEffect, useState } from 'react';

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
}

function getStatusColor(value: number): string {
  if (value <= 30) return '#10B981';
  if (value <= 60) return '#F59E0B';
  return '#EF4444';
}

function getStatusLabel(value: number): string {
  if (value <= 30) return 'Low Risk';
  if (value <= 60) return 'Caution';
  return 'High Risk';
}

export function ProgressRing({ value, size = 160, strokeWidth = 12, label = 'Overall Bias Risk' }: ProgressRingProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;
  const color = getStatusColor(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      const duration = 1500;
      const start = performance.now();
      const animate = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        setAnimatedValue(Math.round(ease * value));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="progress-ring-circle"
            style={{ transition: 'stroke-dashoffset 1.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-4xl font-bold"
            style={{ color, fontFamily: 'DM Sans, sans-serif' }}
          >
            {animatedValue}
          </span>
          <span className="text-xs font-medium mt-1" style={{ color, fontFamily: 'Inter, sans-serif' }}>
            {getStatusLabel(value)}
          </span>
        </div>
      </div>
      <p className="text-xs text-[#6B7280] mt-2 text-center">{label}</p>
    </div>
  );
}

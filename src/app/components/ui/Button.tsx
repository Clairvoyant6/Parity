import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export function PrimaryButton({ variant = 'primary', size = 'md', loading, children, className = '', ...props }: ButtonProps) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
  };

  if (variant === 'ghost') {
    return (
      <button
        className={`inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-all duration-200 ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading ? <LoadingSpinner /> : null}
        {children}
      </button>
    );
  }

  if (variant === 'outline') {
    return (
      <button
        className={`inline-flex items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] text-[#374151] hover:border-[#3B82F6] hover:text-[#3B82F6] transition-all duration-200 bg-white ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading ? <LoadingSpinner color="blue" /> : null}
        {children}
      </button>
    );
  }

  if (variant === 'danger') {
    return (
      <button
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-[#EF4444] text-white hover:bg-[#DC2626] transition-all duration-200 ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] active:bg-[#1E40AF] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading ? <LoadingSpinner /> : null}
      {children}
    </button>
  );
}

function LoadingSpinner({ color = 'white' }: { color?: string }) {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

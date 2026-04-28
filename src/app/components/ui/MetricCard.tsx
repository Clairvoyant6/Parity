interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  status: 'fair' | 'caution' | 'risk';
  description?: string;
}

const statusConfig = {
  fair: {
    color: '#10B981',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    label: 'Fair',
    dot: 'bg-[#10B981]',
  },
  caution: {
    color: '#F59E0B',
    bg: '#FFFBEB',
    border: '#FDE68A',
    label: 'Caution',
    dot: 'bg-[#F59E0B]',
  },
  risk: {
    color: '#EF4444',
    bg: '#FEF2F2',
    border: '#FECACA',
    label: 'Risk',
    dot: 'bg-[#EF4444]',
  },
};

export function MetricCard({ label, value, delta, status, description }: MetricCardProps) {
  const config = statusConfig[status];

  return (
    <div
      className="bg-white rounded-xl p-5 border"
      style={{ borderColor: config.border }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">{label}</span>
        <span
          className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ color: config.color, backgroundColor: config.bg }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
          {config.label}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span
          className="text-2xl font-bold font-mono"
          style={{ color: config.color, fontFamily: 'JetBrains Mono, monospace' }}
        >
          {value}
        </span>
        {delta && (
          <span className="text-xs text-[#6B7280] mb-1">{delta}</span>
        )}
      </div>
      {description && (
        <p className="text-xs text-[#9CA3AF] mt-2">{description}</p>
      )}
    </div>
  );
}

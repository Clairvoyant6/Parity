type Domain = 'hiring' | 'lending' | 'health' | 'education' | 'justice' | 'social';

interface DomainTagProps {
  domain: Domain;
  size?: 'sm' | 'md';
}

const domainConfig: Record<Domain, { color: string; bg: string; label: string }> = {
  hiring: { color: '#8B5CF6', bg: '#F5F3FF', label: 'Hiring' },
  lending: { color: '#059669', bg: '#ECFDF5', label: 'Finance' },
  health: { color: '#DC2626', bg: '#FEF2F2', label: 'Healthcare' },
  education: { color: '#D97706', bg: '#FFFBEB', label: 'Education' },
  justice: { color: '#2563EB', bg: '#EFF6FF', label: 'Criminal Justice' },
  social: { color: '#EC4899', bg: '#FDF2F8', label: 'Social Media' },
};

export function DomainTag({ domain, size = 'md' }: DomainTagProps) {
  const config = domainConfig[domain];
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-3 py-1';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClass}`}
      style={{ color: config.color, backgroundColor: config.bg, fontFamily: 'Inter, sans-serif' }}
    >
      {config.label}
    </span>
  );
}

export { domainConfig };
export type { Domain };

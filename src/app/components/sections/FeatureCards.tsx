import { SectionLabel } from '../ui/SectionLabel';

const features = [
  {
    heading: 'Multi-Metric Bias Detection',
    body: '12 fairness metrics computed simultaneously across all demographic groups.',
    illustration: <RadarIllustration />,
    accent: '#8B5CF6',
    accentBg: '#F5F3FF',
  },
  {
    heading: 'Proxy Corruption Detector',
    body: 'Automatically flags features that correlate with protected attributes like race.',
    illustration: <ProxyIllustration />,
    accent: '#EF4444',
    accentBg: '#FEF2F2',
  },
  {
    heading: 'Plain-Language Explanations',
    body: 'Not just numbers. Parity tells you why the bias exists in plain English.',
    illustration: <ExplanationIllustration />,
    accent: '#2563EB',
    accentBg: '#EFF6FF',
  },
  {
    heading: 'What-If Explorer',
    body: 'Change a feature value and watch the prediction flip. See bias made visible.',
    illustration: <WhatIfIllustration />,
    accent: '#10B981',
    accentBg: '#ECFDF5',
  },
  {
    heading: 'One-Click Compliance Report',
    body: 'Export a PDF audit report mapped to EU AI Act, NYC LL144, and ECOA.',
    illustration: <ReportIllustration />,
    accent: '#D97706',
    accentBg: '#FFFBEB',
  },
  {
    heading: 'Domain-Specific Benchmarks',
    body: 'Pre-loaded templates for hiring, lending, healthcare, and criminal justice.',
    illustration: <DomainIllustration />,
    accent: '#EC4899',
    accentBg: '#FDF2F8',
  },
];

export function FeatureCards() {
  return (
    <section className="py-24 bg-white" id="features">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <SectionLabel text="Features" className="justify-center mb-4" />
          <h2
            className="tracking-tight"
            style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#111827' }}
          >
            See. Understand. Fix.
          </h2>
          <p
            className="mt-4 max-w-2xl mx-auto"
            style={{ fontFamily: 'Inter, sans-serif', color: '#6B7280', fontSize: '1.0625rem' }}
          >
            Every tool you need to audit, explain, and remediate algorithmic bias — in one platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="feature-card rounded-2xl border border-[#E5E7EB] overflow-hidden bg-white cursor-pointer"
            >
              {/* Illustration area */}
              <div
                className="h-44 flex items-center justify-center overflow-hidden relative"
                style={{ backgroundColor: f.accentBg }}
              >
                {f.illustration}
              </div>

              {/* Content */}
              <div className="p-6">
                <h3
                  className="mb-2"
                  style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.0625rem', color: '#111827' }}
                >
                  {f.heading}
                </h3>
                <p
                  style={{ fontFamily: 'Inter, sans-serif', color: '#6B7280', fontSize: '0.875rem', lineHeight: 1.6 }}
                >
                  {f.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Animated SVG Illustrations */

function RadarIllustration() {
  return (
    <svg width="160" height="130" viewBox="0 0 160 130">
      {/* Radar web */}
      {[30, 50, 70].map((r, i) => (
        <polygon key={i} points={hexPoints(80, 65, r)} fill="none" stroke="#8B5CF6" strokeWidth="1" opacity={0.3 + i * 0.15} />
      ))}
      {/* Spokes */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        return <line key={i} x1="80" y1="65" x2={80 + 70 * Math.cos(rad)} y2={65 + 70 * Math.sin(rad)} stroke="#8B5CF6" strokeWidth="1" opacity="0.3" />;
      })}
      {/* Data polygon */}
      <polygon
        points={hexPoints(80, 65, 55, [0.8, 0.6, 0.9, 0.5, 0.7, 0.85])}
        fill="#8B5CF6"
        fillOpacity="0.2"
        stroke="#8B5CF6"
        strokeWidth="2"
      >
        <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
      </polygon>
      {/* Metric labels */}
      {['DI', 'EO', 'PP', 'CB', 'FP', 'FN'].map((label, i) => {
        const angle = (i * 60 * Math.PI) / 180;
        return (
          <text key={i} x={80 + 78 * Math.cos(angle)} y={65 + 78 * Math.sin(angle)}
            textAnchor="middle" fill="#8B5CF6" fontSize="9" fontFamily="JetBrains Mono" dominantBaseline="middle">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function hexPoints(cx: number, cy: number, r: number, scales?: number[]) {
  return [0, 60, 120, 180, 240, 300].map((angle, i) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    const scale = scales ? scales[i] : 1;
    return `${cx + r * scale * Math.cos(rad)},${cy + r * scale * Math.sin(rad)}`;
  }).join(' ');
}

function ProxyIllustration() {
  const nodes = [
    { x: 80, y: 30, label: 'Race', protected: true },
    { x: 30, y: 80, label: 'ZIP', proxy: true },
    { x: 130, y: 80, label: 'Name', proxy: true },
    { x: 55, y: 115, label: 'School', proxy: false },
    { x: 105, y: 115, label: 'Age', protected: false },
  ];

  return (
    <svg width="160" height="130" viewBox="0 0 160 130">
      {/* Proxy connections */}
      <line x1="80" y1="30" x2="30" y2="80" stroke="#EF4444" strokeWidth="2" strokeDasharray="4 2" opacity="0.8">
        <animate attributeName="stroke-dashoffset" values="0;-12" dur="1s" repeatCount="indefinite" />
      </line>
      <line x1="80" y1="30" x2="130" y2="80" stroke="#EF4444" strokeWidth="2" strokeDasharray="4 2" opacity="0.8">
        <animate attributeName="stroke-dashoffset" values="0;-12" dur="1.3s" repeatCount="indefinite" />
      </line>
      <line x1="30" y1="80" x2="55" y2="115" stroke="#9CA3AF" strokeWidth="1" opacity="0.4" />
      <line x1="130" y1="80" x2="105" y2="115" stroke="#9CA3AF" strokeWidth="1" opacity="0.4" />

      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={n.protected ? 14 : 10}
            fill={n.protected ? '#FEF2F2' : n.proxy ? '#FEF2F2' : '#F9FAFB'}
            stroke={n.protected ? '#EF4444' : n.proxy ? '#FECACA' : '#E5E7EB'}
            strokeWidth="2" />
          <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="middle"
            fontSize="7" fontFamily="Inter" fill={n.protected ? '#EF4444' : '#6B7280'}>
            {n.label}
          </text>
        </g>
      ))}

      {/* Warning badge */}
      <text x="80" y="10" textAnchor="middle" fontSize="9" fill="#EF4444" fontFamily="Inter" fontWeight="600">⚠ Proxy Risk</text>
    </svg>
  );
}

function ExplanationIllustration() {
  return (
    <svg width="160" height="130" viewBox="0 0 160 130">
      {/* Text lines streaming */}
      {[20, 35, 50, 65, 80, 95].map((y, i) => (
        <g key={i}>
          <rect x="20" y={y} width={80 + Math.random() * 40} height="8" rx="4" fill="#E5E7EB">
            <animate attributeName="width" values={`${60 + i * 10};${80 + i * 8};${60 + i * 10}`} dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
          </rect>
          {/* Highlighted segment */}
          {i % 2 === 0 && (
            <rect x="20" y={y} width={30 + i * 5} height="8" rx="4" fill="#3B82F6" opacity="0.6" />
          )}
        </g>
      ))}
      {/* AI indicator */}
      <circle cx="140" cy="65" r="12" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="2" />
      <text x="140" y="65" textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#2563EB">AI</text>
    </svg>
  );
}

function WhatIfIllustration() {
  return (
    <svg width="160" height="130" viewBox="0 0 160 130">
      {/* Before card */}
      <rect x="10" y="20" width="55" height="80" rx="8" fill="white" stroke="#FECACA" strokeWidth="2" />
      <rect x="18" y="30" width="39" height="6" rx="3" fill="#E5E7EB" />
      <rect x="18" y="42" width="30" height="6" rx="3" fill="#E5E7EB" />
      <text x="37" y="78" textAnchor="middle" fontSize="9" fill="#EF4444" fontFamily="Inter" fontWeight="700">DENIED</text>
      <text x="37" y="90" textAnchor="middle" fontSize="8" fill="#9CA3AF" fontFamily="JetBrains Mono">34%</text>

      {/* Arrow */}
      <path d="M 72 65 L 88 65" stroke="#374151" strokeWidth="2" markerEnd="url(#arrow)" />
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M 0 0 L 6 3 L 0 6 z" fill="#374151" />
        </marker>
      </defs>

      {/* After card */}
      <rect x="95" y="20" width="55" height="80" rx="8" fill="white" stroke="#A7F3D0" strokeWidth="2" />
      <rect x="103" y="30" width="39" height="6" rx="3" fill="#D1FAE5" />
      <rect x="103" y="42" width="30" height="6" rx="3" fill="#D1FAE5" />
      <text x="122" y="78" textAnchor="middle" fontSize="8" fill="#10B981" fontFamily="Inter" fontWeight="700">APPROVED</text>
      <text x="122" y="90" textAnchor="middle" fontSize="8" fill="#9CA3AF" fontFamily="JetBrains Mono">71%</text>

      {/* Flip banner */}
      <rect x="30" y="108" width="100" height="16" rx="4" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="1" />
      <text x="80" y="116" textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#059669" fontFamily="Inter" fontWeight="600">Prediction Flipped!</text>
    </svg>
  );
}

function ReportIllustration() {
  return (
    <svg width="160" height="130" viewBox="0 0 160 130">
      {/* Document */}
      <rect x="40" y="10" width="80" height="100" rx="6" fill="white" stroke="#E5E7EB" strokeWidth="2" />
      <rect x="40" y="10" width="80" height="18" rx="6" fill="#1E3A5F" />
      <text x="80" y="22" textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="white" fontFamily="DM Sans" fontWeight="600">PARITY AUDIT</text>

      {/* Content lines */}
      {[35, 45, 55, 65].map((y) => (
        <rect key={y} x="52" y={y} width={y % 20 === 15 ? 60 : 45} height="5" rx="2.5" fill="#E5E7EB" />
      ))}

      {/* Checkmarks */}
      {[80, 90, 100].map((y, i) => (
        <g key={y}>
          <circle cx="60" cy={y} r="6" fill={i < 2 ? '#ECFDF5' : '#FEF2F2'} stroke={i < 2 ? '#10B981' : '#EF4444'} strokeWidth="1.5" />
          <text x="60" y={y} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill={i < 2 ? '#10B981' : '#EF4444'}>
            {i < 2 ? '✓' : '✗'}
          </text>
          <rect x="72" y={y - 3} width={40} height="5" rx="2.5" fill="#E5E7EB" />
        </g>
      ))}

      {/* Animated checkmark appearing */}
      <circle cx="60" cy="80" r="6" fill="#ECFDF5" stroke="#10B981" strokeWidth="1.5" opacity="0">
        <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" begin="1s" />
      </circle>
    </svg>
  );
}

function DomainIllustration() {
  const domains = [
    { label: 'Hiring', color: '#8B5CF6', x: 50, y: 40 },
    { label: 'Health', color: '#DC2626', x: 110, y: 40 },
    { label: 'Finance', color: '#059669', x: 50, y: 90 },
    { label: 'Justice', color: '#2563EB', x: 110, y: 90 },
  ];

  return (
    <svg width="160" height="130" viewBox="0 0 160 130">
      {domains.map((d, i) => (
        <g key={i}>
          {/* Hexagon shape approximated as rounded rect */}
          <rect x={d.x - 22} y={d.y - 18} width="44" height="36" rx="8"
            fill="white" stroke={d.color} strokeWidth="2" />
          {/* Glow */}
          <rect x={d.x - 22} y={d.y - 18} width="44" height="36" rx="8"
            fill={d.color} opacity="0.1">
            <animate attributeName="opacity" values="0.05;0.2;0.05" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
          </rect>
          <text x={d.x} y={d.y - 2} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill={d.color} fontFamily="Inter" fontWeight="600">
            {d.label}
          </text>
          <text x={d.x} y={d.y + 9} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill={d.color}>
            {i === 0 ? '🧑‍💼' : i === 1 ? '🏥' : i === 2 ? '💰' : '⚖️'}
          </text>
        </g>
      ))}
      {/* Center hub */}
      <circle cx="80" cy="65" r="10" fill="#EFF6FF" stroke="#2563EB" strokeWidth="2" />
      <text x="80" y="65" textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#2563EB" fontFamily="Inter" fontWeight="700">P</text>
    </svg>
  );
}

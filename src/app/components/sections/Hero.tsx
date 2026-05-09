import { Link } from 'react-router';
import { PrimaryButton } from '../ui/Button';
import { ArrowRight, BarChart3, Play, ShieldCheck, Terminal } from 'lucide-react';

const comparisonBars = [
  { group: 'Male', rate: 72, color: '#60A5FA' },
  { group: 'Female', rate: 34, color: '#EF4444' },
  { group: 'White', rate: 68, color: '#3B82F6' },
  { group: 'Black', rate: 29, color: '#F97316' },
  { group: 'Latinx', rate: 38, color: '#F59E0B' },
  { group: 'Asian', rate: 61, color: '#10B981' },
];

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden" style={{ background: '#0B1220' }}>
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: 'linear-gradient(rgba(147,197,253,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(147,197,253,0.13) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
      }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.22) 0%, transparent 34%, rgba(16,185,129,0.12) 68%, rgba(15,23,42,0.92) 100%)' }} />
      <ParticleField />

      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-28 lg:pt-36">
        <div className="grid items-center gap-14 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="text-center lg:text-left">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#93C5FD]/20 bg-white/5 px-3 py-1.5 shadow-lg shadow-blue-950/30 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#10B981] shadow-[0_0_18px_rgba(16,185,129,0.9)]" />
              <span className="text-xs font-semibold uppercase tracking-wide text-[#BFDBFE]" style={{ fontFamily: 'Inter, sans-serif' }}>
                AI Fairness Infrastructure
              </span>
            </div>

            <h1
              className="mb-6 max-w-4xl tracking-tight"
              style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 800, fontSize: 'clamp(3.25rem, 7vw, 6.75rem)', lineHeight: 0.92, color: 'white' }}
            >
              Your AI might be{' '}
              <span className="parity-gradient-text">discriminating.</span>
              <br />
              Know before it harms people.
            </h1>

            <p
              className="mx-auto mb-9 max-w-2xl leading-relaxed lg:mx-0"
              style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.15rem', color: '#CBD5E1' }}
            >
              Parity audits machine learning systems for discrimination across hiring, healthcare, finance, and criminal justice using explainable fairness intelligence.
            </p>

            <div className="mb-10 flex flex-wrap justify-center gap-4 lg:justify-start">
              <Link to="/app/onboard">
                <PrimaryButton size="lg" className="shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50">
                  Start Free Audit
                  <ArrowRight size={18} />
                </PrimaryButton>
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-8 py-3.5 text-white backdrop-blur-sm transition-all duration-200 hover:border-[#93C5FD]/50 hover:bg-white/10"
                style={{ fontFamily: 'Inter, sans-serif', fontSize: '1rem' }}
              >
                <Play size={16} fill="white" />
                Watch Interactive Demo
              </a>
            </div>

            <div className="grid max-w-2xl grid-cols-3 gap-3">
              {[
                ['12+', 'fairness metrics'],
                ['5', 'regulated domains'],
                ['PDF', 'audit evidence'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left backdrop-blur-sm">
                  <div className="font-mono text-xl font-bold text-white">{value}</div>
                  <div className="mt-1 text-xs text-[#94A3B8]">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <FairnessCommandCenter />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-36 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, #F9FAFB)' }} />
    </section>
  );
}

function FairnessCommandCenter() {
  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <div className="absolute inset-0 rounded-[28px] border border-white/10 bg-white/[0.035] shadow-[0_32px_120px_rgba(15,23,42,0.55)] backdrop-blur-xl" />
      <div className="relative rounded-[28px] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl">
      <div className="rounded-2xl border border-white/10 bg-[#020617]/80 p-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563EB]/20 text-[#93C5FD]">
              <Terminal size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>Live fairness audit</div>
              <div className="text-xs text-[#64748B] font-mono">model://credit-risk-v7</div>
            </div>
          </div>
          <span className="rounded-full border border-[#10B981]/25 bg-[#10B981]/10 px-2.5 py-1 text-xs font-medium text-[#A7F3D0]">Scanning</span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-wide text-[#94A3B8]">
              Risk score
              <ShieldCheck size={15} className="text-[#93C5FD]" />
            </div>
            <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
              <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="48" fill="none" stroke="#1E293B" strokeWidth="12" />
                <circle cx="60" cy="60" r="48" fill="none" stroke="#F59E0B" strokeWidth="12" strokeDasharray="301" strokeDashoffset="86" strokeLinecap="round" />
              </svg>
              <div className="text-center">
                <div className="font-mono text-4xl font-bold text-white">72</div>
                <div className="mt-1 text-xs text-[#FDE68A]">Needs review</div>
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-wide text-[#94A3B8]">
              Group comparison
              <BarChart3 size={15} className="text-[#93C5FD]" />
            </div>
            <div className="flex h-36 items-end gap-2">
              {comparisonBars.map((bar, index) => (
                <div key={bar.group} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[10px] font-mono text-[#CBD5E1]">{bar.rate}%</span>
                  <div
                    className="w-full rounded-t-md"
                    style={{
                      height: `${bar.rate * 1.25}px`,
                      minHeight: 8,
                      background: `linear-gradient(180deg, ${bar.color}, rgba(15,23,42,0.2))`,
                      animation: `barRise 1.1s ${index * 80}ms cubic-bezier(.2,.8,.2,1) both`,
                    }}
                  />
                  <span className="max-w-full truncate text-[9px] text-[#64748B]">{bar.group}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <MetricBadge label="Disparate Impact" value="0.54" tone="risk" />
          <MetricBadge label="Equalized Odds" value="0.31" tone="warn" />
          <MetricBadge label="Proxy Risk" value="High" tone="risk" />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#93C5FD]/15 bg-[#020617]/85 p-4 shadow-2xl shadow-blue-950/40 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">AI decision trace</div>
          <div className="text-xs text-[#93C5FD] font-mono">explainable</div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {['income', 'zip', 'school', 'race proxy', 'decision'].map((node, index) => (
            <div key={node} className={`rounded-lg border px-2 py-2 text-center text-[10px] ${index === 3 ? 'border-[#EF4444]/40 bg-[#EF4444]/10 text-[#FECACA]' : 'border-white/10 bg-white/[0.04] text-[#CBD5E1]'}`}>
              {node}
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg bg-[#0F172A] px-3 py-2 font-mono text-[11px] leading-5 text-[#93C5FD]">
          &gt; proxy_correlation: 0.74 · mitigation: rebalance threshold
        </div>
      </div>
      </div>
    </div>
  );
}

function MetricBadge({ label, value, tone }: { label: string; value: string; tone: 'risk' | 'warn' }) {
  const color = tone === 'risk' ? '#EF4444' : '#F59E0B';
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <div className="text-[10px] text-[#94A3B8]">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function ParticleField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 34 }, (_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-blue-300"
          style={{
            left: `${(i * 31) % 100}%`,
            top: `${(i * 17) % 100}%`,
            width: 1 + (i % 3),
            height: 1 + (i % 3),
            opacity: 0.16,
            animation: `drift ${6 + (i % 5)}s ease-in-out ${(i % 7) * 0.4}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

import { Link } from 'react-router';
import { SectionLabel } from '../ui/SectionLabel';
import { PrimaryButton } from '../ui/Button';
import { Upload, BarChart2, FileCheck, ArrowRight } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Upload',
    icon: Upload,
    description: 'Drop your CSV dataset or connect your model via API. Label sensitive attributes (race, gender, age) in 30 seconds.',
    color: '#8B5CF6',
    bg: '#F5F3FF',
  },
  {
    number: '02',
    title: 'Analyse',
    icon: BarChart2,
    description: 'Parity computes Disparate Impact, Equalized Odds, Calibration, and proxy correlations across every demographic group.',
    color: '#2563EB',
    bg: '#EFF6FF',
  },
  {
    number: '03',
    title: 'Act',
    icon: FileCheck,
    description: 'Get a plain-language explanation, a what-if explorer, mitigation recommendations, and a one-click compliance PDF.',
    color: '#10B981',
    bg: '#ECFDF5',
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <SectionLabel text="How It Works" className="justify-center mb-4" />
          <h2
            className="tracking-tight"
            style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#111827' }}
          >
            Three steps to fairness.
          </h2>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-16 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-[#8B5CF6] via-[#2563EB] to-[#10B981] opacity-30" style={{ top: '3.5rem' }} />

          <div className="grid md:grid-cols-3 gap-8 relative">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex flex-col items-center md:items-start text-center md:text-left">
                  {/* Step indicator */}
                  <div className="relative mb-6">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: step.bg }}
                    >
                      <Icon size={24} style={{ color: step.color }} />
                    </div>
                    <span
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: step.color, fontFamily: 'DM Sans, sans-serif', fontSize: '10px' }}
                    >
                      {i + 1}
                    </span>
                  </div>

                  <div
                    className="text-xs font-bold mb-2 tracking-widest uppercase"
                    style={{ color: step.color, fontFamily: 'Inter, sans-serif' }}
                  >
                    {step.number}
                  </div>
                  <h3
                    className="mb-3"
                    style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.25rem', color: '#111827' }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="leading-relaxed"
                    style={{ fontFamily: 'Inter, sans-serif', color: '#6B7280', fontSize: '0.9375rem' }}
                  >
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="mt-16 rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-xl">
          <div className="bg-[#1E3A5F] px-4 py-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
              <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
              <div className="w-3 h-3 rounded-full bg-[#10B981]" />
            </div>
            <div className="flex-1 bg-[#0F172A] rounded px-3 py-1 text-xs text-[#9CA3AF] text-center" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              parity.ai/app/analysis/demo-123
            </div>
          </div>
          <DashboardPreview />
        </div>

        <div className="mt-10 text-center">
          <Link to="/app/onboard">
            <PrimaryButton size="lg">
              Try It Now — Free
              <ArrowRight size={18} />
            </PrimaryButton>
          </Link>
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <div className="bg-[#F9FAFB] p-6 grid grid-cols-3 gap-4">
      {/* Score Ring placeholder */}
      <div className="col-span-1 bg-white rounded-xl p-4 border border-[#E5E7EB] flex flex-col items-center justify-center">
        <div className="relative w-24 h-24 mb-3">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#E5E7EB" strokeWidth="10" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="#F59E0B" strokeWidth="10"
              strokeDasharray="251.2" strokeDashoffset="83" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-[#F59E0B]" style={{ fontFamily: 'DM Sans, sans-serif' }}>67</span>
          </div>
        </div>
        <span className="text-xs text-[#6B7280] text-center" style={{ fontFamily: 'Inter, sans-serif' }}>Overall Bias Risk</span>
      </div>

      {/* Metric cards */}
      <div className="col-span-2 grid grid-cols-2 gap-3">
        {[
          { label: 'Disparate Impact', value: '0.45', status: 'risk', color: '#EF4444' },
          { label: 'Demographic Parity', value: '-18%', status: 'risk', color: '#EF4444' },
          { label: 'Equalized Odds', value: '0.12', status: 'caution', color: '#F59E0B' },
          { label: 'Calibration Error', value: '2.1%', status: 'fair', color: '#10B981' },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-lg p-3 border border-[#E5E7EB]">
            <div className="text-xs text-[#9CA3AF] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>{m.label}</div>
            <div className="text-lg font-bold" style={{ color: m.color, fontFamily: 'JetBrains Mono, monospace' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Bar chart preview */}
      <div className="col-span-3 bg-white rounded-xl p-4 border border-[#E5E7EB]">
        <div className="text-xs font-medium text-[#374151] mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>Group Comparison — Positive Prediction Rate</div>
        <div className="flex items-end gap-4 h-20">
          {[
            { group: 'Male', rate: 72, color: '#3B82F6' },
            { group: 'Female', rate: 34, color: '#EF4444' },
            { group: 'White', rate: 68, color: '#3B82F6' },
            { group: 'Black', rate: 29, color: '#EF4444' },
            { group: 'Hispanic', rate: 38, color: '#F59E0B' },
            { group: 'Asian', rate: 61, color: '#10B981' },
          ].map((g) => (
            <div key={g.group} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-mono" style={{ color: g.color, fontSize: '10px' }}>{g.rate}%</span>
              <div className="w-full rounded-t" style={{ height: `${g.rate * 0.8}px`, backgroundColor: g.color, minHeight: '4px' }} />
              <span className="text-xs text-[#9CA3AF]" style={{ fontSize: '9px' }}>{g.group}</span>
            </div>
          ))}
          {/* Threshold line */}
          <div className="absolute left-0 right-0 border-t-2 border-dashed border-[#EF4444] opacity-50" style={{ bottom: '40%' }} />
        </div>
      </div>
    </div>
  );
}

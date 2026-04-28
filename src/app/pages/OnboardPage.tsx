import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, Database, HelpCircle, BarChart2, FileText } from 'lucide-react';
import { PrimaryButton } from '../components/ui/Button';

const goals = [
  {
    icon: Search,
    title: 'Audit a Model',
    subtitle: 'Upload a trained ML model and find its bias',
    mode: 'model',
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
  },
  {
    icon: Database,
    title: 'Check a Dataset',
    subtitle: 'Scan training data for representation problems',
    mode: 'dataset',
    color: '#8B5CF6',
    bg: '#F5F3FF',
    border: '#DDD6FE',
  },
  {
    icon: HelpCircle,
    title: 'Understand an Output',
    subtitle: 'You received an AI decision — was it biased?',
    mode: 'output',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  {
    icon: BarChart2,
    title: 'Compare Groups',
    subtitle: 'See how your model performs across demographics',
    mode: 'groups',
    color: '#10B981',
    bg: '#ECFDF5',
    border: '#A7F3D0',
  },
  {
    icon: FileText,
    title: 'Generate a Report',
    subtitle: 'Produce a compliance-ready audit document',
    mode: 'report',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
  },
];

export function OnboardPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const navigate = useNavigate();

  function handleSelect(mode: string) {
    setSelected(mode);
    setTimeout(() => {
      navigate(`/app/upload?mode=${mode}`);
    }, 300);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: '#F9FAFB' }}>
      {/* Step indicator */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center gap-0">
          {['Choose Goal', 'Upload & Configure', 'Analyse'].map((step, i) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: i === 0 ? '#2563EB' : '#E5E7EB',
                    color: i === 0 ? 'white' : '#9CA3AF',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {i + 1}
                </div>
                <span
                  className="text-xs hidden sm:block"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    color: i === 0 ? '#2563EB' : '#9CA3AF',
                    fontWeight: i === 0 ? 600 : 400,
                  }}
                >
                  {step}
                </span>
              </div>
              {i < 2 && <div className="flex-1 h-px mx-3" style={{ backgroundColor: '#E5E7EB' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-[#F3F4F6]">
          <div className="flex items-center gap-3 mb-2">
            <LogoIcon />
            <span className="text-xs text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
              Step 1 of 3: Choose Your Goal
            </span>
          </div>
          <h1
            className="tracking-tight"
            style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '1.875rem', color: '#111827' }}
          >
            What do you want to achieve?
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#6B7280', fontFamily: 'Inter, sans-serif' }}>
            Choose a goal and we'll configure the right analysis for you.
          </p>
        </div>

        {/* Goal tiles */}
        <div className="p-8">
          <div className="grid grid-cols-2 gap-4">
            {goals.map((goal) => {
              const Icon = goal.icon;
              const isSelected = selected === goal.mode;
              return (
                <button
                  key={goal.mode}
                  onClick={() => handleSelect(goal.mode)}
                  className="text-left rounded-xl p-5 border transition-all duration-200"
                  style={{
                    borderColor: isSelected ? goal.color : '#E5E7EB',
                    backgroundColor: isSelected ? goal.bg : 'white',
                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isSelected ? `0 4px 20px ${goal.color}25` : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLElement).style.borderColor = goal.color;
                      (e.currentTarget as HTMLElement).style.backgroundColor = goal.bg + '80';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB';
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'white';
                    }
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: goal.bg }}
                  >
                    <Icon size={20} style={{ color: goal.color }} />
                  </div>
                  <div
                    className="mb-1"
                    style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '0.9375rem', color: '#111827' }}
                  >
                    {goal.title}
                  </div>
                  <div className="text-xs" style={{ color: '#6B7280', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
                    {goal.subtitle}
                  </div>
                </button>
              );
            })}

            {/* 5th tile centered in 2-col grid */}
            {goals.length % 2 !== 0 && null}
          </div>

          {/* Skip option */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/app/upload')}
              className="text-xs text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Skip — just upload a file
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="14" fill="#2563EB" />
      <rect x="13" y="6" width="2" height="16" rx="1" fill="white" />
      <rect x="8" y="10" width="12" height="1.5" rx="0.75" fill="white" />
      <path d="M6 15.5 Q8.5 13 11 15.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M17 15.5 Q19.5 13 22 15.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

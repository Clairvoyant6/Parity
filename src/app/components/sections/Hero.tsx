import { Link } from 'react-router';
import { PrimaryButton } from '../ui/Button';
import { ArrowRight, Play } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background: '#0F172A' }}>
      {/* Particle background */}
      <ParticleField />

      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: 'radial-gradient(circle, #3B82F6, transparent)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: 'radial-gradient(circle, #8B5CF6, transparent)' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 border border-[#3B82F6]/30 bg-[#3B82F6]/10">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-xs font-medium text-[#93C5FD]" style={{ fontFamily: 'Inter, sans-serif' }}>
                AI Bias Detection Platform
              </span>
            </div>

            <h1
              className="mb-6 leading-tight tracking-tight"
              style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 'clamp(3rem, 6vw, 5rem)', color: 'white' }}
            >
              Detect the{' '}
              <span className="parity-gradient-text" data-text="Bias">
                Bias
              </span>
              <br />
              Fix it.
            </h1>

            <p
              className="mb-8 max-w-xl leading-relaxed"
              style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.125rem', color: '#9CA3AF' }}
            >
              AI is making decisions about your job, loan, and health. Parity shows you exactly where the bias is — and how to fix it.
            </p>

            <div className="flex flex-wrap gap-4 justify-center lg:justify-start mb-12">
              <Link to="/app/onboard">
                <PrimaryButton size="lg" className="shadow-lg shadow-blue-500/30">
                  Audit Your Model
                  <ArrowRight size={18} />
                </PrimaryButton>
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-all duration-200"
                style={{ fontFamily: 'Inter, sans-serif', fontSize: '1rem' }}
              >
                <Play size={16} fill="white" />
                See it in Action
              </a>
            </div>


          </div>

          {/* Right - Animated Balance Scale + Floating Metric Cards */}
          <div className="relative flex items-center justify-center h-[500px]">
            <AnimatedBalanceScale />

            {/* Floating metric cards */}
            <div
              className="absolute top-8 right-0 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 text-white"
              style={{ animation: 'floatUp 3s ease-in-out infinite' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                <span className="text-xs text-[#9CA3AF]" style={{ fontFamily: 'Inter, sans-serif' }}>Disparate Impact</span>
              </div>
              <span className="text-lg font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#EF4444' }}>0.45</span>
              <span className="text-xs text-[#9CA3AF] ml-2">⚠ Below threshold</span>
            </div>

            <div
              className="absolute bottom-16 left-0 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 text-white"
              style={{ animation: 'floatDown 3.5s ease-in-out infinite' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span className="text-xs text-[#9CA3AF]" style={{ fontFamily: 'Inter, sans-serif' }}>Equalized Odds</span>
              </div>
              <span className="text-lg font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#10B981' }}>Fair ✓</span>
            </div>

            <div
              className="absolute top-1/2 left-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 text-white"
              style={{ animation: 'floatUp 4s ease-in-out infinite 1s' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                <span className="text-xs text-[#9CA3AF]" style={{ fontFamily: 'Inter, sans-serif' }}>Calibration Error</span>
              </div>
              <span className="text-lg font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F59E0B' }}>7.2%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom vignette */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, #0F172A)' }} />
    </section>
  );
}

function AnimatedBalanceScale() {
  return (
    <svg width="280" height="300" viewBox="0 0 280 300" fill="none" style={{ filter: 'drop-shadow(0 0 40px rgba(59, 130, 246, 0.3))' }}>
      {/* Center post */}
      <rect x="136" y="60" width="8" height="180" rx="4" fill="#3B82F6" />

      {/* Top ornament */}
      <circle cx="140" cy="55" r="8" fill="#93C5FD" />

      {/* Base */}
      <rect x="100" y="235" width="80" height="8" rx="4" fill="#3B82F6" />
      <rect x="120" y="243" width="40" height="6" rx="3" fill="#1D4ED8" />

      {/* Balance beam - animates */}
      <g style={{ transformOrigin: '140px 100px', animation: 'scaleTip 4s ease-in-out infinite' }}>
        <rect x="60" y="96" width="160" height="8" rx="4" fill="#93C5FD" />

        {/* Left chain */}
        <line x1="75" y1="104" x2="75" y2="155" stroke="#93C5FD" strokeWidth="2" strokeDasharray="4 2" />

        {/* Right chain */}
        <line x1="205" y1="104" x2="205" y2="140" stroke="#93C5FD" strokeWidth="2" strokeDasharray="4 2" />

        {/* Left pan */}
        <ellipse cx="75" cy="165" rx="30" ry="12" fill="#1D4ED8" stroke="#3B82F6" strokeWidth="2" />
        <rect x="45" y="155" width="60" height="10" rx="5" fill="#2563EB" />

        {/* Left pan content - bias metrics */}
        <text x="75" y="163" textAnchor="middle" fill="#93C5FD" fontSize="8" fontFamily="JetBrains Mono">0.45</text>

        {/* Right pan */}
        <ellipse cx="205" cy="150" rx="30" ry="12" fill="#065F46" stroke="#10B981" strokeWidth="2" />
        <rect x="175" y="140" width="60" height="10" rx="5" fill="#059669" />

        {/* Right pan content */}
        <text x="205" y="148" textAnchor="middle" fill="#A7F3D0" fontSize="8" fontFamily="JetBrains Mono">Fair</text>
      </g>

      {/* Glowing dots decoration */}
      <circle cx="40" cy="80" r="3" fill="#3B82F6" opacity="0.6" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
      <circle cx="240" cy="120" r="2" fill="#8B5CF6" opacity="0.6" style={{ animation: 'pulse 2.5s ease-in-out infinite' }} />
      <circle cx="60" cy="200" r="2" fill="#10B981" opacity="0.6" style={{ animation: 'pulse 3s ease-in-out infinite' }} />
    </svg>
  );
}

function ParticleField() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 5,
    duration: Math.random() * 5 + 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-blue-400"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            opacity: 0.15,
            animation: `drift ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

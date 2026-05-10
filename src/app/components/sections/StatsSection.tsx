import { useEffect, useRef, useState } from 'react';
import { SectionLabel } from '../ui/SectionLabel';

const stats = [
  {
    value: 85,
    suffix: '%',
    description: 'AI résumé screeners preferred white-associated names over Black names',
    source: 'UW, 2024',
    color: '#8B5CF6',
    bg: '#F5F3FF',
    border: '#DDD6FE',
  },
  {
    value: 26.3,
    suffix: '%',
    description: 'More chronic conditions in Black patients than white at the same algorithmic risk score',
    source: 'Obermeyer, Science 2019',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
  },
  {
    value: 44.9,
    suffix: '%',
    description: 'False positive risk rate for Black defendants in COMPAS criminal justice AI',
    source: 'ProPublica, 2016',
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
  },
];

function useCountUp(target: number, triggered: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!triggered) return;
    const duration = 1500;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(parseFloat((ease * target).toFixed(1)));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [triggered, target]);

  return count;
}

function StatCard({ stat, triggered }: { stat: typeof stats[0]; triggered: boolean }) {
  const count = useCountUp(stat.value, triggered);

  return (
    <div
      className="bg-white rounded-2xl p-8 border reveal-on-scroll revealed flex flex-col shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
      style={{ borderColor: stat.border, boxShadow: `0 24px 60px ${stat.color}10` }}
    >
      <div
        className="text-5xl mb-4 tracking-tight"
        style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, color: stat.color }}
      >
        {count}{stat.suffix}
      </div>
      <p
        className="mb-4 flex-1 leading-relaxed"
        style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9375rem', color: '#374151' }}
      >
        {stat.description}
      </p>
      <span
        className="text-xs font-medium px-3 py-1 rounded-full self-start"
        style={{ color: stat.color, backgroundColor: stat.bg, fontFamily: 'Inter, sans-serif' }}
      >
        {stat.source}
      </span>
    </div>
  );
}

export function StatsSection() {
  const [triggered, setTriggered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTriggered(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-28" style={{ background: 'linear-gradient(180deg, #F9FAFB 0%, #FFFFFF 100%)' }} id="domains">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16" ref={ref}>
          <SectionLabel text="The Problem" className="justify-center mb-4" />
          <h2
            className="tracking-tight"
            style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#111827' }}
          >
            AI bias is not abstract.
            <br />
            <span style={{ color: '#2563EB' }}>It is already deciding.</span>
          </h2>
          <p
            className="mt-4 max-w-2xl mx-auto"
            style={{ fontFamily: 'Inter, sans-serif', color: '#6B7280', fontSize: '1.0625rem' }}
          >
            Across high-stakes systems, small statistical gaps become real outcomes. Parity turns that hidden harm into measurable evidence.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {stats.map((stat, i) => (
            <StatCard key={i} stat={stat} triggered={triggered} />
          ))}
        </div>
      </div>
    </section>
  );
}

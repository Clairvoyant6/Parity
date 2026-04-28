import { useState } from 'react';
import { SectionLabel } from '../ui/SectionLabel';
import { DomainTag } from '../ui/DomainTag';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import type { Domain } from '../ui/DomainTag';

const slides = [
  {
    domain: 'hiring' as Domain,
    heading: 'Amazon scrapped its AI hiring tool after 4 years',
    stat: '85% preference for white-associated names',
    source: 'Reuters 2018',
    detail: "Amazon's machine learning model trained on resumes submitted over a 10-year period, predominantly from men, and taught itself that male candidates were preferable.",
    year: '2018',
    icon: '🧑‍💼',
    link: 'https://www.reuters.com/article/us-amazon-com-jobs-automation-insight-idUSKCN1MK08G/'
  },
  {
    domain: 'health' as Domain,
    heading: 'An algorithm decided Black patients were healthier',
    stat: '26.3% more chronic conditions at the same risk score',
    source: 'Science 2019',
    detail: "A widely used healthcare algorithm systematically assigned lower risk scores to Black patients, leading to far less care being recommended compared to white patients with the same conditions.",
    year: '2019',
    icon: '🏥',
    link: 'https://www.science.org/doi/10.1126/science.aax2342'
  },
  {
    domain: 'justice' as Domain,
    heading: 'COMPAS mislabelled Black defendants as high-risk',
    stat: '44.9% vs 23.5% false positive rate',
    source: 'ProPublica 2016',
    detail: "The COMPAS recidivism risk scoring system showed significant racial bias, with Black defendants nearly twice as likely to be falsely flagged as future criminals compared to white defendants.",
    year: '2016',
    icon: '⚖️',
    link: 'https://www.propublica.org/article/machine-bias-risk-assessments-in-criminal-sentencing'
  },
  {
    domain: 'lending' as Domain,
    heading: 'FinTech lenders still charge minorities more',
    stat: '5–8 basis points higher on mortgage rates',
    source: 'NBER 2019',
    detail: "Algorithmic mortgage lenders charge Black and Hispanic borrowers higher rates than comparable white borrowers, despite claims that removing human judgment would eliminate discrimination.",
    year: '2019',
    icon: '💳',
    link: 'https://www.nber.org/papers/w25360'
  },
  {
    domain: 'education' as Domain,
    heading: 'UK algorithm downgraded 40% of student grades',
    stat: 'Reversed within days after public outcry',
    source: 'Ofqual 2020',
    detail: "An Ofqual algorithm downgraded 40% of teacher-predicted A-level grades, disproportionately affecting students from lower-income areas and state schools.",
    year: '2020',
    icon: '🎓',
    link: 'https://www.nature.com/articles/d41586-020-02450-4'
  },
  {
    domain: 'social' as Domain,
    heading: 'Content moderation AI silences victims of racism',
    stat: 'All 5 tested algorithms showed the bias',
    source: 'PNAS 2024',
    detail: "AI content moderation systems disproportionately flag and remove posts by Black users and anti-hate speech advocates, effectively amplifying the voices of harassers.",
    year: '2024',
    icon: '📱',
    link: 'https://www.pnas.org/doi/10.1073/pnas.2308064121'
  },
];

export function DomainCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  const prev = () => setActiveIndex((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setActiveIndex((i) => (i + 1) % slides.length);

  const slide = slides[activeIndex];

  return (
    <section className="py-24" style={{ background: '#0F172A' }} id="research">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <SectionLabel text="Real-World Bias" className="justify-center mb-4" />
          <h2
            className="text-white tracking-tight"
            style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 'clamp(2rem, 4vw, 3rem)' }}
          >
            Every domain.{' '}
            <span className="parity-gradient-text">Every day.</span>
          </h2>
        </div>

        <div className="relative">
          {/* Main slide */}
          <div className="grid lg:grid-cols-5 gap-8 items-center">
            {/* Domain icon */}
            <div className="hidden lg:flex col-span-1 justify-center">
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                {slide.icon}
              </div>
            </div>

            {/* Content */}
            <div className="col-span-3">
              <div className="mb-4 flex items-center gap-3">
                <DomainTag domain={slide.domain} />
                <span className="text-xs text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>{slide.year}</span>
              </div>
              <h3
                className="text-white mb-4 leading-tight"
                style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)' }}
              >
                {slide.heading}
              </h3>
              <p
                className="mb-6 leading-relaxed"
                style={{ fontFamily: 'Inter, sans-serif', color: '#9CA3AF', fontSize: '0.9375rem' }}
              >
                {slide.detail}
              </p>
              <div className="flex items-center gap-4">
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <div
                    className="text-white mb-0.5"
                    style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '1.125rem' }}
                  >
                    {slide.stat}
                  </div>
                  <div className="text-xs text-[#6B7280]" style={{ fontFamily: 'Inter, sans-serif' }}>{slide.source}</div>
                </div>
                <a 
                  href={slide.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-1.5 text-xs text-[#3B82F6] hover:text-[#93C5FD] transition-colors" 
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Read paper <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* Navigation */}
            <div className="col-span-1 flex flex-col items-center gap-4">
              <button
                onClick={prev}
                className="w-10 h-10 rounded-full flex items-center justify-center border border-white/10 text-white hover:bg-white/10 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex flex-col gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className="w-2 h-2 rounded-full transition-all duration-200"
                    style={{ backgroundColor: i === activeIndex ? '#3B82F6' : 'rgba(255,255,255,0.2)', transform: i === activeIndex ? 'scale(1.5)' : 'scale(1)' }}
                  />
                ))}
              </div>
              <button
                onClick={next}
                className="w-10 h-10 rounded-full flex items-center justify-center border border-white/10 text-white hover:bg-white/10 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Bottom slide row */}
          <div className="mt-10 grid grid-cols-3 lg:grid-cols-6 gap-3">
            {slides.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className="rounded-xl p-3 border transition-all duration-200 text-left"
                style={{
                  borderColor: i === activeIndex ? '#3B82F6' : 'rgba(255,255,255,0.08)',
                  backgroundColor: i === activeIndex ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)',
                }}
              >
                <div className="text-xl mb-1">{s.icon}</div>
                <DomainTag domain={s.domain} size="sm" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import { Link } from 'react-router';
import { Github, Twitter, Linkedin, ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer style={{ background: '#0F172A', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Logo & Tagline */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <LogoMark />
              <span className="text-white text-xl font-bold" style={{ fontFamily: 'DM Sans, sans-serif' }}>Parity</span>
            </div>
            <p className="text-sm leading-relaxed mb-6" style={{ color: '#6B7280', fontFamily: 'Inter, sans-serif' }}>
              Open-source AI fairness auditing. Detect, understand, and fix algorithmic bias before it causes harm.
            </p>

          </div>



          {/* Resources */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>Resources</h4>
            <ul className="space-y-3">
              {[
                { name: 'EU AI Act Guide', href: 'https://artificialintelligenceact.eu/' },
                { name: 'NYC Local Law 144', href: 'https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page' },
                { name: 'COMPAS Dataset', href: 'https://www.propublica.org/datastore/dataset/compas-recidivism-risk-score-data-and-analysis' },
                { name: 'Fairness Metrics Explained', href: 'https://aif360.readthedocs.io/en/latest/modules/metrics.html' },
                { name: 'Blog', href: '#' },
              ].map((item) => (
                <li key={item.name}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-sm text-[#6B7280] hover:text-white transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#4B5563]" style={{ fontFamily: 'Inter, sans-serif' }}>
            © 2026 Parity. Built on{' '}
            <a href="https://aif360.readthedocs.io" className="hover:text-[#6B7280] transition-colors" target="_blank" rel="noopener noreferrer">AIF360</a>
            {' '}+{' '}
            <a href="https://fairlearn.org" className="hover:text-[#6B7280] transition-colors" target="_blank" rel="noopener noreferrer">Fairlearn</a>
            . Open-source under MIT license.
          </p>

        </div>
      </div>
    </footer>
  );
}

function LogoMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="14" fill="#2563EB" />
      <rect x="13" y="6" width="2" height="16" rx="1" fill="white" />
      <rect x="8" y="10" width="12" height="1.5" rx="0.75" fill="white" />
      <path d="M6 15.5 Q8.5 13 11 15.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M17 15.5 Q19.5 13 22 15.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

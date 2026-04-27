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
            <div className="flex gap-3">
              {[
                { icon: Github, href: 'https://github.com', label: 'GitHub' },
                { icon: Twitter, href: '#', label: 'Twitter' },
                { icon: Linkedin, href: '#', label: 'LinkedIn' },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  className="w-9 h-9 rounded-lg flex items-center justify-center border border-white/10 text-[#6B7280] hover:text-white hover:border-white/30 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>Platform</h4>
            <ul className="space-y-3">
              {[
                { label: 'Features', href: '#features' },
                { label: 'Pricing', href: '#pricing' },
                { label: 'Research', href: '#' },
                { label: 'API Docs', href: '#' },
                { label: 'GitHub', href: 'https://github.com', external: true },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-[#6B7280] hover:text-white transition-colors flex items-center gap-1"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                  >
                    {link.label}
                    {link.external && <ExternalLink size={12} />}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>Resources</h4>
            <ul className="space-y-3">
              {[
                'EU AI Act Guide',
                'NYC Local Law 144',
                'COMPAS Dataset',
                'Fairness Metrics Explained',
                'Blog',
              ].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-[#6B7280] hover:text-white transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {item}
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
          <div className="flex items-center gap-4">
            {['Privacy Policy', 'Terms of Service'].map((item) => (
              <a key={item} href="#" className="text-xs text-[#4B5563] hover:text-[#6B7280] transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
                {item}
              </a>
            ))}
          </div>
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

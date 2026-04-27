import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { Menu, X } from 'lucide-react';
import { PrimaryButton } from './ui/Button';

interface NavbarProps {
  variant?: 'marketing' | 'app';
}

export function Navbar({ variant = 'marketing' }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const marketingLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Domains', href: '#domains' },
    { label: 'Research', href: '#' },
  ];

  const appLinks = [
    { label: 'Upload', href: '/app/upload' },
    { label: 'Docs', href: '#' },
  ];

  const links = variant === 'app' ? appLinks : marketingLinks;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || variant === 'app'
          ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-[#E5E7EB]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <BalanceScaleIcon />
          <span
            className="text-xl font-bold tracking-tight"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              color: scrolled || variant === 'app' ? '#111827' : 'white',
            }}
          >
            Parity
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`text-sm font-medium transition-colors duration-200 ${
                scrolled || variant === 'app'
                  ? 'text-[#6B7280] hover:text-[#111827]'
                  : 'text-white/70 hover:text-white'
              }`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right Group */}
        <div className="hidden md:flex items-center gap-4">
          {variant === 'marketing' ? (
            <>
              <Link
                to="/app/onboard"
                className={`text-sm font-medium transition-colors ${
                  scrolled ? 'text-[#6B7280] hover:text-[#111827]' : 'text-white/70 hover:text-white'
                }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Sign In
              </Link>
              <Link to="/app/onboard">
                <PrimaryButton size="sm">Try Free</PrimaryButton>
              </Link>
            </>
          ) : (
            <Link to="/app/onboard">
              <PrimaryButton size="sm">New Analysis</PrimaryButton>
            </Link>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className={`md:hidden p-2 rounded-lg transition-colors ${
            scrolled || variant === 'app' ? 'text-[#374151]' : 'text-white'
          }`}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-[#E5E7EB] px-6 py-4 flex flex-col gap-4">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-[#374151] hover:text-[#2563EB]"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <Link to="/app/onboard">
            <PrimaryButton className="w-full justify-center">Try Free</PrimaryButton>
          </Link>
        </div>
      )}
    </nav>
  );
}

function BalanceScaleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="14" fill="#2563EB" />
      <rect x="13" y="6" width="2" height="16" rx="1" fill="white" />
      <rect x="8" y="10" width="12" height="1.5" rx="0.75" fill="white" />
      <circle cx="8.5" cy="11" r="1" fill="white" />
      <circle cx="19.5" cy="11" r="1" fill="white" />
      <path d="M6 15.5 Q8.5 13 11 15.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M17 15.5 Q19.5 13 22 15.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

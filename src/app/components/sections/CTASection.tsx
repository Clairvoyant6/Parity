import { Link } from 'react-router';
import { PrimaryButton } from '../ui/Button';
import { ArrowRight } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-32" style={{ background: '#0F172A' }}>
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2
          className="text-white mb-6 leading-tight"
          style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 'clamp(2rem, 4vw, 3.25rem)' }}
        >
          Your AI is making consequential decisions.
          <br />
          <span className="parity-gradient-text">Make them fair.</span>
        </h2>
        <p
          className="mb-8"
          style={{ fontFamily: 'Inter, sans-serif', color: '#9CA3AF', fontSize: '1.125rem' }}
        >
          No credit card. No setup. Results in 60 seconds.
        </p>
        <Link to="/app/onboard">
          <PrimaryButton size="lg" className="shadow-lg shadow-blue-500/30">
            Audit Your First Model — Free
            <ArrowRight size={20} />
          </PrimaryButton>
        </Link>

      </div>
    </section>
  );
}

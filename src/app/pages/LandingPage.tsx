import { Navbar } from '../components/Navbar';
import { Hero } from '../components/sections/Hero';
import { StatsSection } from '../components/sections/StatsSection';
import { HowItWorks } from '../components/sections/HowItWorks';
import { FeatureCards } from '../components/sections/FeatureCards';
import { DomainCarousel } from '../components/sections/DomainCarousel';
import { BiasCalculator } from '../components/sections/BiasCalculator';
import { CTASection } from '../components/sections/CTASection';
import { Footer } from '../components/sections/Footer';

export function LandingPage() {
  return (
    <div>
      <Navbar variant="marketing" />
      <Hero />
      <StatsSection />
      <HowItWorks />
      <FeatureCards />
      <DomainCarousel />
      <BiasCalculator />
      <CTASection />
      <Footer />
    </div>
  );
}

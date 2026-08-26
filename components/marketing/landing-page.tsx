import { BlendedFamiliesSection } from "@/components/marketing/blended-families-section";
import { BentoGridSection } from "@/components/marketing/bento-grid-section";
import { CoParentingSection } from "@/components/marketing/co-parenting-section";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { LandingHeader } from "@/components/marketing/landing-header";
import { PrivacyTrustSection } from "@/components/marketing/privacy-trust-section";
import { RecognitionSection } from "@/components/marketing/recognition-section";
import { ShoppingHighlightSection } from "@/components/marketing/shopping-highlight-section";
import { ThreePillarsSection } from "@/components/marketing/three-pillars-section";

export function MarketingLandingPage({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <>
      <LandingHeader isLoggedIn={isLoggedIn} />
      <HeroSection />
      <RecognitionSection />
      <ThreePillarsSection />
      <BentoGridSection />
      <BlendedFamiliesSection />
      <CoParentingSection />
      <ShoppingHighlightSection />
      <PrivacyTrustSection />
      <FinalCtaSection />
      <footer className="border-t border-[color:var(--famli-border)] py-8">
        <p className="text-center text-sm text-[color:var(--famli-muted)]">
          © {new Date().getFullYear()} Famli — voor ieder gezin
        </p>
      </footer>
    </>
  );
}

import { FamliWash } from "@/components/brand/wash";
import { BentoGridSection } from "@/components/marketing/bento-grid-section";
import { BlendedFamiliesSection } from "@/components/marketing/blended-families-section";
import { CoParentingSection } from "@/components/marketing/co-parenting-section";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { LandingHeader } from "@/components/marketing/landing-header";
import { PrivacySection } from "@/components/marketing/privacy-section";
import { RecognitionSection } from "@/components/marketing/recognition-section";
import { ShoppingHighlightSection } from "@/components/marketing/shopping-highlight-section";
import { ThreePillarsSection } from "@/components/marketing/three-pillars-section";
import { getSession } from "@/lib/auth/session";

export default async function LandingPage() {
  const session = await getSession();

  return (
    <FamliWash>
      <div className="min-h-dvh">
        <LandingHeader isLoggedIn={Boolean(session)} />
        <HeroSection />
        <RecognitionSection />
        <ThreePillarsSection />
        <BentoGridSection />
        <BlendedFamiliesSection />
        <CoParentingSection />
        <ShoppingHighlightSection />
        <PrivacySection />
        <FinalCtaSection />
      </div>
    </FamliWash>
  );
}

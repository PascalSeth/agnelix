import { LandingStyles } from "@/components/landing/landing-styles"
import { GlowBackground } from "@/components/landing/glow-background"
import { Hero } from "@/components/landing/hero"
import { TrustMarquee } from "@/components/landing/trust-marquee"
import { ProblemSolution } from "@/components/landing/problem-solution"
import { HowItWorks } from "@/components/landing/how-it-works"
import { BentoFeatures } from "@/components/landing/bento-features"
import { Pricing } from "@/components/landing/pricing"
import { Verticals } from "@/components/landing/verticals"
import { FinalCTA } from "@/components/landing/final-cta"
import { LandingFooter } from "@/components/landing/landing-footer"
import { CurveDarkToLight, CurveLightToDark } from "@/components/landing/curve-transitions"

export default async function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#111216] text-slate-100 selection:bg-white/10">
      <LandingStyles />
      <GlowBackground />
      
      <main>
        <Hero />
        <TrustMarquee />
        
        <CurveDarkToLight />
        <div id="solutions">
          <ProblemSolution />
        </div>
        
        <CurveLightToDark />
        <div id="how-it-works">
          <HowItWorks />
        </div>
        
        <CurveDarkToLight />
        <div id="features">
          <BentoFeatures />
        </div>
        
        <CurveLightToDark />
        <div id="pricing">
          <Pricing />
        </div>
        
        <CurveDarkToLight />
        <Verticals />
        
        <CurveLightToDark />
        <FinalCTA />
      </main>

      <LandingFooter />
    </div>
  )
}
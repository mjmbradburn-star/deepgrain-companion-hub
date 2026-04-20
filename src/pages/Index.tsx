import { SiteNav } from "@/components/aioi/SiteNav";
import { Hero } from "@/components/aioi/Hero";
import { PillarsGrid } from "@/components/aioi/PillarsGrid";
import { MaturityLadder } from "@/components/aioi/MaturityLadder";
import { ThreeLevels } from "@/components/aioi/ThreeLevels";
import { BenchmarkCounter } from "@/components/aioi/BenchmarkCounter";
import { WhyDeepgrain } from "@/components/aioi/WhyDeepgrain";
import { SiteFooter } from "@/components/aioi/SiteFooter";

const Index = () => {
  return (
    <main className="min-h-screen bg-walnut text-cream">
      <SiteNav />
      <Hero />
      <PillarsGrid />
      <MaturityLadder />
      <ThreeLevels />
      <BenchmarkCounter />
      <WhyDeepgrain />
      <SiteFooter />
    </main>
  );
};

export default Index;

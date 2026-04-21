import { SiteNav } from "@/components/aioi/SiteNav";
import { Hero } from "@/components/aioi/Hero";
import { PillarsGrid } from "@/components/aioi/PillarsGrid";
import { MaturityLadder } from "@/components/aioi/MaturityLadder";
import { ThreeLevels } from "@/components/aioi/ThreeLevels";
import { BenchmarkCounter } from "@/components/aioi/BenchmarkCounter";
import { WhyDeepgrain } from "@/components/aioi/WhyDeepgrain";
import { SiteFooter } from "@/components/aioi/SiteFooter";
import { Reveal } from "@/components/aioi/Reveal";

const Index = () => {
  return (
    <main className="min-h-screen bg-walnut text-cream">
      <SiteNav />
      <Hero />
      <Reveal index={0}><PillarsGrid /></Reveal>
      <Reveal index={1}><MaturityLadder /></Reveal>
      <Reveal index={0}><ThreeLevels /></Reveal>
      <Reveal index={1}><BenchmarkCounter /></Reveal>
      <Reveal index={0}><WhyDeepgrain /></Reveal>
      <SiteFooter />
    </main>
  );
};

export default Index;

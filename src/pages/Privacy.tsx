import { SiteFooter } from "@/components/aioi/SiteFooter";
import { SiteNav } from "@/components/aioi/SiteNav";
import { Seo } from "@/components/aioi/Seo";
import { breadcrumbJsonLd, seoRoutes } from "@/lib/seo";

const sections = [
  {
    title: "Who we are",
    body: "AIOI is operated by Deepgrain Studio. The service helps visitors assess AI operating maturity and, where requested, receive links, reports and related communications.",
  },
  {
    title: "Personal data we process",
    body: "We may process assessment answers, organisation context, email address, authentication details, report access events, communication preferences, technical logs, device/browser data and cookie consent choices.",
  },
  {
    title: "Why we process it",
    body: "We process data to provide the assessment and reports, secure accounts and report links, send requested emails, maintain suppression/unsubscribe records, improve benchmarks in aggregate, monitor reliability and comply with legal obligations.",
  },
  {
    title: "GDPR lawful bases",
    body: "Depending on the activity, we rely on consent, contract necessity, legitimate interests, and legal obligation. Marketing communications are only sent where you have consented or where permitted by applicable law, and you can opt out at any time.",
  },
  {
    title: "Cookies and local storage",
    body: "Essential local storage keeps draft assessments, sessions and privacy choices working. Optional analytics cookies may be used only after consent to understand usage and improve the product. You can clear cookies or local storage in your browser at any time.",
  },
  {
    title: "Sharing and processors",
    body: "We use trusted infrastructure and email providers to host the service, authenticate users, store data and send transactional messages. They process data under appropriate contractual safeguards and only for the purposes we instruct.",
  },
  {
    title: "International transfers",
    body: "Where data is transferred outside the UK or EEA, we rely on appropriate safeguards such as adequacy decisions, standard contractual clauses or equivalent protections.",
  },
  {
    title: "Retention",
    body: "We keep personal data only as long as needed for the purposes above, including report access, security, audit, suppression and legal requirements. Aggregated benchmark data may be retained without directly identifying you.",
  },
  {
    title: "Your rights",
    body: "You may request access, correction, deletion, restriction, portability, objection to certain processing, and withdrawal of consent. You also have the right to complain to your local data protection authority.",
  },
  {
    title: "Contact",
    body: "For privacy requests, email hello@deepgrain.ai with the subject line “AIOI privacy request”. We may need to verify your identity before acting on a request.",
  },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-walnut text-cream">
      <Seo {...seoRoutes.privacy} jsonLd={[breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Privacy", path: "/privacy" }])]} />
      <SiteNav />
      <main className="container max-w-4xl pb-20 pt-28 sm:pb-28 sm:pt-36">
        <p className="eyebrow mb-5">Legal</p>
        <h1 className="font-display text-5xl leading-none tracking-tight text-cream sm:text-7xl">Privacy policy</h1>
        <p className="mt-6 max-w-2xl font-display text-xl leading-relaxed text-cream/70">
          This policy explains how AIOI handles personal data, cookies and privacy rights under GDPR and related privacy laws.
        </p>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-cream/45">
          Last updated 23 April 2026
        </p>

        <div className="mt-14 divide-y divide-cream/10 border-y border-cream/10">
          {sections.map((section) => (
            <section key={section.title} className="grid gap-4 py-8 sm:grid-cols-[220px_1fr]">
              <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.16em] text-brass">{section.title}</h2>
              <p className="font-display text-lg leading-relaxed text-cream/75">{section.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-12 rounded-sm border border-cream/10 bg-surface-0 p-6">
          <h2 className="font-ui text-sm font-semibold uppercase tracking-[0.16em] text-brass">Search and analytics links</h2>
          <p className="mt-3 font-display text-lg text-cream/75">
            Sitemap: <a className="text-cream underline decoration-brass underline-offset-4 hover:text-brass" href="/sitemap.xml">https://aioi.deepgrain.ai/sitemap.xml</a>
            <br />
            LLM discovery: <a className="text-cream underline decoration-brass underline-offset-4 hover:text-brass" href="/llms.txt">https://aioi.deepgrain.ai/llms.txt</a>
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
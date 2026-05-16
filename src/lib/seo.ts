export const SITE_URL = "https://aioi.deepgrain.ai";
export const SITE_NAME = "The AI Operating Index";
export const OG_IMAGE = `${SITE_URL}/og/home.png`;

export type SeoRouteKey =
  | "home"
  | "assess"
  | "pillars"
  | "ladder"
  | "benchmarks"
  | "aiOverview"
  | "privacy"
  | "signin"
  | "reports"
  | "report"
  | "flow"
  | "notFound"
  | "unsubscribe"
  | "admin";

export interface SeoConfig {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  noindex?: boolean;
  type?: "website" | "article";
}

export const seoRoutes: Record<SeoRouteKey, SeoConfig> = {
  home: {
    title: "AI Operating Archetype | AI Operating Index",
    description: "Take the free 60-second AI archetype scan from Deepgrain. Discover your AI Operating Archetype across five profiles and find your leverage point.",
    path: "/",
    image: `${SITE_URL}/og/home.png`,
    imageAlt: "AI Operating Archetype scan share card",
  },
  assess: {
    title: "Free AI Archetype Scan | AIOI",
    description: "Start the 60-second AI archetype scan for companies, functions, or individuals. Get your AI Operating Archetype and a clear leverage point instantly.",
    path: "/assess",
    image: `${SITE_URL}/og/assess.png`,
    imageAlt: "Free AI archetype scan share card",
  },
  pillars: {
    title: "Eight AI Operating Model Pillars | AIOI",
    description: "Explore the eight pillars behind the AI Operating Index: strategy, data, tooling, workflow, skills, governance, measurement, and culture.",
    path: "/pillars",
    image: `${SITE_URL}/og/pillars.png`,
    imageAlt: "Eight AI operating model pillars share card",
  },
  ladder: {
    title: "AI Maturity Ladder: Dormant to AI-Native | AIOI",
    description: "Understand the six AI maturity tiers used by AIOI, from Dormant and Exploring through Deployed, Integrated, Leveraged, and AI-Native.",
    path: "/ladder",
    image: `${SITE_URL}/og/ladder.png`,
    imageAlt: "AI maturity ladder share card",
  },
  benchmarks: {
    title: "AI Adoption Benchmark Data | AIOI",
    description: "Compare AI operating maturity by level, function, sector, region, and organisation size using AIOI benchmark cohorts and fallback scoring.",
    path: "/benchmarks",
    image: `${SITE_URL}/og/benchmarks.png`,
    imageAlt: "AI adoption benchmark data share card",
  },
  aiOverview: {
    title: "AI Overview for LLMs | AI Operating Index",
    description: "A public AI-readable overview of the AI Operating Index, crawlable entry points, navigation, and the eight-pillar AI maturity framework.",
    path: "/ai/overview",
    image: `${SITE_URL}/og/home.png`,
    imageAlt: "AI Operating Index overview share card",
  },
  privacy: {
    title: "Privacy Policy | AI Operating Index",
    description: "How Deepgrain handles AIOI assessment data, report access, cookies, analytics consent, GDPR rights, retention, and processors.",
    path: "/privacy",
    image: `${SITE_URL}/og/privacy.png`,
    imageAlt: "AI Operating Index privacy policy share card",
  },
  signin: {
    title: "Sign in to AIOI Reports | AI Operating Index",
    description: "Sign in with a secure one-time email link to save or revisit your AI Operating Index reports.",
    path: "/signin",
    noindex: true,
  },
  reports: {
    title: "My Reports | AI Operating Index",
    description: "Private AIOI report dashboard.",
    path: "/reports",
    noindex: true,
  },
  report: {
    title: "AI Operating Archetype Result | AI Operating Index",
    description: "Your AI Operating Archetype result page with profile definition, leverage point, and next steps.",
    path: "/assess/result",
    noindex: true,
  },
  flow: {
    title: "Archetype Scan in Progress | AI Operating Index",
    description: "AI Operating Archetype scan in progress.",
    path: "/assess/scan",
    noindex: true,
  },
  unsubscribe: {
    title: "Email Preferences | AI Operating Index",
    description: "Manage AIOI email preferences.",
    path: "/unsubscribe",
    noindex: true,
  },
  notFound: {
    title: "Page Not Found | AI Operating Index",
    description: "This AIOI page could not be found.",
    path: "/404",
    noindex: true,
  },
  admin: {
    title: "Admin · Playbook | AI Operating Index",
    description: "Internal AIOI Moves library admin.",
    path: "/admin/playbook",
    noindex: true,
  },
};

export function canonicalUrl(path: string) {
  if (!path || path === "/") return `${SITE_URL}/`;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Deepgrain",
    url: "https://deepgrain.ai",
    brand: { "@type": "Brand", name: SITE_NAME },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "en-GB",
    publisher: { "@type": "Organization", name: "Deepgrain" },
    potentialAction: {
      "@type": "Action",
      name: "Start the 60-second AI archetype scan",
      target: canonicalUrl("/assess"),
    },
  };
}

export function applicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${SITE_URL}/#ai-maturity-scan`,
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description: seoRoutes.home.description,
    isAccessibleForFree: true,
    keywords: ["AI archetype scan", "AI operating archetype", "AI readiness assessment", "AI operating model", "AI team profile"],
    audience: [
      { "@type": "BusinessAudience", audienceType: "Companies" },
      { "@type": "BusinessAudience", audienceType: "Functions" },
      { "@type": "Audience", audienceType: "Individuals" },
    ],
    offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
    publisher: { "@type": "Organization", name: "Deepgrain" },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  };
}

export const faqItems = [
  {
    question: "What is an AI Operating Archetype?",
    answer: "An AI Operating Archetype is a profile that describes how your team handles work, where the bottleneck is, and what to change first. There are five: Operator, Fragment, Explorer, Integrator, and Architect.",
  },
  {
    question: "How long does the AI Operating Index take?",
    answer: "The archetype scan takes about sixty seconds: three questions, five options each. Your result is shown instantly with no email required.",
  },
  {
    question: "What are the five AI Operating Archetypes?",
    answer: "The five archetypes are The Operator (manual, people-dependent), The Fragment (tools everywhere, nothing connects), The Explorer (individual experiments, no system), The Integrator (partially connected, partially fragile), and The Architect (designed for scale).",
  },
  {
    question: "Do I need to enter an email?",
    answer: "No email is required for the archetype result. Email is used only when you want to save the result, book a follow-up call, or receive updates.",
  },
  {
    question: "Who is Deepgrain?",
    answer: "Deepgrain is the studio behind the AI Operating Index, building diagnostic and operating tools for AI enablement and transformation.",
  },
  {
    question: "What does the archetype result include?",
    answer: "Your archetype result includes a profile definition, why it matters, a leverage point to act on first, and a description of what good looks like for your next stage.",
  },
  {
    question: "Is AIOI for companies or individuals?",
    answer: "AIOI can be taken at company, function, or individual level, so the same framework can describe a whole organisation, a single team, or a personal operating model.",
  },
];

export function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    url: canonicalUrl("/"),
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function benchmarkDatasetJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "AI Operating Index benchmark cohorts",
    description: "Aggregated, opted-in AI maturity benchmark cohorts across level, function, sector, region, and organisation size.",
    url: canonicalUrl("/benchmarks"),
    creator: { "@type": "Organization", name: "Deepgrain" },
    isAccessibleForFree: true,
    keywords: ["AI adoption benchmark", "AI maturity benchmark", "AI readiness data", "AI operating model"],
  };
}
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
  | "unsubscribe";

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
    title: "AI Maturity Assessment | AI Operating Index",
    description: "Take the free 3-minute AI maturity assessment from Deepgrain. Score AI readiness across eight operating pillars and compare against peer benchmarks.",
    path: "/",
    image: `${SITE_URL}/og/home.png`,
    imageAlt: "AI Operating Index maturity assessment share card",
  },
  assess: {
    title: "Free AI Readiness Assessment | AIOI",
    description: "Start the 3-minute AI readiness scan for companies, functions, or individuals. Get an AIOI score, maturity tier, hotspots, and benchmark context.",
    path: "/assess",
    image: `${SITE_URL}/og/assess.png`,
    imageAlt: "Free AI readiness scan share card",
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
    title: "Private AI Maturity Report | AI Operating Index",
    description: "A private AIOI report link with AI maturity score, tier, hotspots, recommendations, and benchmark context.",
    path: "/assess/r/",
    noindex: true,
  },
  flow: {
    title: "Assessment in Progress | AI Operating Index",
    description: "AIOI assessment flow in progress.",
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
      name: "Start the 3-minute AI maturity scan",
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
    keywords: ["AI maturity assessment", "AI readiness assessment", "AI adoption benchmark", "AI operating model", "AI governance maturity"],
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
    question: "What is an AI maturity assessment?",
    answer: "An AI maturity assessment measures how ready an organisation, function, or individual is to use AI in day-to-day operating work, not just whether tools have been purchased.",
  },
  {
    question: "How long does the AI Operating Index take?",
    answer: "The quickscan takes about three minutes: eight questions, one per pillar. A deeper follow-up can refine the report after the first score.",
  },
  {
    question: "What are the eight AIOI pillars?",
    answer: "The eight pillars are Strategy & Mandate, Data Foundations, Tooling & Infrastructure, Workflow Integration, Skills & Fluency, Governance & Risk, Measurement & ROI, and Culture & Adoption.",
  },
  {
    question: "Do I need to enter an email?",
    answer: "No email is required for the first quickscan score. Email is used only when you want to save the report, receive a secure link, or unlock the Deep Dive.",
  },
  {
    question: "How are AIOI benchmarks calculated?",
    answer: "Benchmarks use opted-in assessment data, grouped by level, function, sector, region, and organisation size. When a precise cohort is thin, AIOI shows the closest available cohort and explains confidence.",
  },
  {
    question: "Who is Deepgrain?",
    answer: "Deepgrain is the studio behind the AI Operating Index, building diagnostic and operating tools for AI enablement and transformation.",
  },
  {
    question: "What does the AIOI score include?",
    answer: "The AIOI score includes a weighted readout across eight pillars, a maturity tier, weakest-pillar hotspots, recommended next actions, and peer benchmark context where available.",
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
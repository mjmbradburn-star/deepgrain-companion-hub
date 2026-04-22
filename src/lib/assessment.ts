// Shared content + types for the AIOI diagnostic flow.
// Function-level v3 — 12 questions across 8 pillars, with per-function variants
// for two of them (workflow + ROI). Function picker added to the qualifier.

import type { PillarIndex } from "@/components/aioi/PillarChip";
import type { Tier } from "@/components/aioi/TierBadge";

export type Level = "company" | "function" | "individual";

export type BusinessFunction =
  | "sales"
  | "marketing"
  | "engineering-product"
  | "people-hr"
  | "finance"
  | "ops-cs";

/** Region labels MUST match the Benchmarks page filter exactly so respondents
 *  roll up cleanly into the materialised cohort medians. */
export const REGIONS = [
  "North America",
  "Europe",
  "UK & Ireland",
  "Asia-Pacific",
  "Latin America",
  "Middle East & Africa",
] as const;
export type Region = (typeof REGIONS)[number];

export const FUNCTIONS: { id: BusinessFunction; title: string; tagline: string }[] = [
  { id: "sales",                title: "Sales",               tagline: "Pipeline, prospecting, calls, deals." },
  { id: "marketing",            title: "Marketing",           tagline: "Briefs, content, campaigns, brand." },
  { id: "engineering-product",  title: "Engineering & Product", tagline: "Code, specs, reviews, releases." },
  { id: "people-hr",            title: "People & HR",         tagline: "Hiring, onboarding, internal comms." },
  { id: "finance",              title: "Finance",             tagline: "Close, FP&A, reporting, controls." },
  { id: "ops-cs",               title: "Operations & CS",     tagline: "Tickets, deflection, success, ops." },
];

export const LEVELS: Record<Level, { title: string; tagline: string; time: string; audience: string }> = {
  company:    { title: "Company",    tagline: "The whole organisation.", time: "~12 min", audience: "Exec / Board" },
  function:   { title: "Function",   tagline: "One team, deeply.",       time: "~7 min",  audience: "Function lead" },
  individual: { title: "Individual", tagline: "Your personal stack.",    time: "~7 min",  audience: "IC / Operator" },
};

export const PILLAR_NAMES: Record<PillarIndex, string> = {
  1: "Strategy & Mandate",
  2: "Data Foundations",
  3: "Tooling & Infrastructure",
  4: "Workflow Integration",
  5: "Skills & Fluency",
  6: "Governance & Risk",
  7: "Measurement & ROI",
  8: "Culture & Adoption",
};

export const TIER_BY_INDEX: Tier[] = ["Dormant", "Exploring", "Deployed", "Integrated", "Leveraged", "AI-Native"];

export interface QuestionOption {
  /** 0..5 maps to Tier index */
  tier: number;
  label: string;
  detail?: string;
}

export interface QuestionDetail {
  rationale: string;
  trap: string;
  crosscheck: string;
}

export type QuestionFlow = "quickscan" | "deep" | "both";
export type QuestionStatus = "active" | "archived";

export interface Question {
  id: string;
  pillar: PillarIndex;
  prompt: string;
  options: QuestionOption[]; // length 6, ordered Dormant..AI-Native
  detail?: QuestionDetail;
  version?: string;
  status?: QuestionStatus;
  flow?: QuestionFlow;
}

// ─── FUNCTION level v3 — 12 questions ───────────────────────────────────────
export const FUNCTION_QUESTIONS: Question[] = [
  // P1 Strategy & Mandate (×2)
  {
    id: "f-p1-owner",
    pillar: 1,
    prompt: "Who actually owns AI in your function?",
    options: [
      { tier: 0, label: "Nobody. It hasn't really come up." },
      { tier: 1, label: "Whoever shouts loudest in a given week." },
      { tier: 2, label: "An interested deputy, on the side of their desk." },
      { tier: 3, label: "A named lead with a remit, no budget." },
      { tier: 4, label: "A named lead with a remit and a budget." },
      { tier: 5, label: "It's the function head's first agenda item, every week." },
    ],
  },
  {
    id: "f-p1-strategy",
    pillar: 1,
    prompt: "Is there a written plan for what AI should do here?",
    options: [
      { tier: 0, label: "No, and nobody has asked for one." },
      { tier: 1, label: "A few slides someone made for an offsite." },
      { tier: 2, label: "A draft we keep meaning to finish." },
      { tier: 3, label: "A one-pager with goals, owned by the lead." },
      { tier: 4, label: "A plan with quarterly milestones tied to OKRs." },
      { tier: 5, label: "AI is the operating model. The plan is the plan." },
    ],
  },
  // P2 Data Foundations (×2)
  {
    id: "f-p2-data",
    pillar: 2,
    prompt: "If a tool tried to read your function's data tomorrow, what would it find?",
    options: [
      { tier: 0, label: "PDFs, inboxes and Slack threads." },
      { tier: 1, label: "A few shared drives and a battered spreadsheet." },
      { tier: 2, label: "A CRM or warehouse, half-populated." },
      { tier: 3, label: "Clean tables for the core entities, gaps elsewhere." },
      { tier: 4, label: "A documented schema engineering trusts." },
      { tier: 5, label: "Versioned, governed, queryable by a tool today." },
    ],
  },
  {
    id: "f-p2-access",
    pillar: 2,
    prompt: "How easily can the team get the data they need to answer a question?",
    options: [
      { tier: 0, label: "They ask in Slack and hope." },
      { tier: 1, label: "Someone in BI runs it on request, eventually." },
      { tier: 2, label: "Self-serve dashboards for the obvious questions." },
      { tier: 3, label: "Self-serve for most things, BI for the long tail." },
      { tier: 4, label: "Natural-language queries on a governed warehouse." },
      { tier: 5, label: "Tools fetch and join data across systems on their own." },
    ],
  },
  // P3 Tooling & Infrastructure (×1)
  {
    id: "f-p3-tools",
    pillar: 3,
    prompt: "What AI tooling is actually in use here, day to day?",
    options: [
      { tier: 0, label: "None." },
      { tier: 1, label: "Personal ChatGPT accounts on company cards." },
      { tier: 2, label: "One team licence to Copilot or similar." },
      { tier: 3, label: "An approved stack with SSO and data controls." },
      { tier: 4, label: "Approved stack plus internal copilots wired into two workflows." },
      { tier: 5, label: "Bespoke tools in production, monitored, with fallbacks." },
    ],
  },
  // P4 Workflow Integration (×2; first has function variants)
  {
    id: "f-p4-workflow",
    pillar: 4,
    prompt: "Where does AI sit in the actual day to day?",
    options: [
      { tier: 0, label: "Nowhere. It's a separate tab people open occasionally." },
      { tier: 1, label: "A few people use it for first drafts, off-process." },
      { tier: 2, label: "It's part of one named workflow, owned by one team." },
      { tier: 3, label: "Built into two or three workflows, with playbooks." },
      { tier: 4, label: "The default for most production work, with humans on review." },
      { tier: 5, label: "Workflows are designed model-first; people handle exceptions." },
    ],
  },
  {
    id: "f-p4-redesign",
    pillar: 4,
    prompt: "Have you redesigned any work around AI, rather than bolting it on?",
    options: [
      { tier: 0, label: "No. Workflows are exactly as they were." },
      { tier: 1, label: "We've talked about it. Nothing changed." },
      { tier: 2, label: "One workflow has been tweaked to include AI steps." },
      { tier: 3, label: "Two or three workflows were redesigned around AI." },
      { tier: 4, label: "Most core workflows have been rebuilt model-first." },
      { tier: 5, label: "New work is designed for AI by default; people handle exceptions." },
    ],
  },
  // P5 Skills & Fluency (×2)
  {
    id: "f-p5-fluency",
    pillar: 5,
    prompt: "How fluent is the average person in your function, not the keenest?",
    options: [
      { tier: 0, label: "Hasn't really tried it." },
      { tier: 1, label: "Has typed into ChatGPT once or twice." },
      { tier: 2, label: "Uses it weekly for ad-hoc tasks." },
      { tier: 3, label: "Uses it daily, can iterate on prompts." },
      { tier: 4, label: "Builds prompts, templates and small tools they reuse." },
      { tier: 5, label: "Builds small tools and ships them to colleagues." },
    ],
  },
  {
    id: "f-p5-growth",
    pillar: 5,
    prompt: "What's in place to help people get better at this?",
    options: [
      { tier: 0, label: "Nothing. People figure it out alone." },
      { tier: 1, label: "An optional Lunch & Learn happened once." },
      { tier: 2, label: "A self-serve library of links and recordings." },
      { tier: 3, label: "Structured onboarding and a shared prompt library." },
      { tier: 4, label: "Role-specific training with ongoing peer review." },
      { tier: 5, label: "AI fluency is a hiring and promotion criterion." },
    ],
  },
  // P6 Governance & Risk (×1)
  {
    id: "f-p6-policy",
    pillar: 6,
    prompt: "What governance is in place?",
    options: [
      { tier: 0, label: "None. We hope for the best." },
      { tier: 1, label: "An informal 'don't paste customer data' rule." },
      { tier: 2, label: "A written policy nobody has read." },
      { tier: 3, label: "Policy plus an approved-tools list, lightly enforced." },
      { tier: 4, label: "Policy, tooling, audit trails and periodic reviews." },
      { tier: 5, label: "Live monitoring, model risk register, board-level oversight." },
    ],
  },
  // P7 Measurement & ROI (×1; has function variants)
  {
    id: "f-p7-roi",
    pillar: 7,
    prompt: "Can you point to the value AI has produced for this function?",
    options: [
      { tier: 0, label: "No, and we haven't tried to measure." },
      { tier: 1, label: 'Anecdotes. "It saves me an hour a week."' },
      { tier: 2, label: "One pilot with a rough time-saving figure." },
      { tier: 3, label: "Two or three named workflows with hours-saved tracked." },
      { tier: 4, label: "Hours, quality and cycle time, reported quarterly." },
      { tier: 5, label: "AI-attributable revenue or margin in the P&L." },
    ],
  },
  // P8 Culture & Adoption (×1)
  {
    id: "f-p8-talk",
    pillar: 8,
    prompt: "How do colleagues talk about using AI in their work?",
    options: [
      { tier: 0, label: "They don't." },
      { tier: 1, label: "Quietly, in case it looks like cheating." },
      { tier: 2, label: "Curiously, in 1:1s but not standups." },
      { tier: 3, label: "Openly, with the better users teaching the rest." },
      { tier: 4, label: 'It\'s expected. "Have you tried it with the model?" is normal.' },
      { tier: 5, label: "Not using it for a task is the thing that needs explaining." },
    ],
  },
];

// ─── Function-specific variants for f-p4-workflow + f-p7-roi ────────────────
// Same question id, alternative prompt + options. If a respondent picks a
// function, we swap in the variant; otherwise we use the base above.
type VariantsByFunction = Partial<Record<BusinessFunction, { prompt: string; options: QuestionOption[] }>>;

export const FUNCTION_VARIANTS: Record<string, VariantsByFunction> = {
  "f-p4-workflow": {
    sales: {
      prompt: "Where does AI sit in the actual sales day, beyond the demo?",
      options: [
        { tier: 0, label: "Nowhere. Reps open ChatGPT in a separate tab now and then." },
        { tier: 1, label: "A few reps use it for first-draft emails, off-process." },
        { tier: 2, label: "Built into prospecting or follow-ups for one team." },
        { tier: 3, label: "In two or three plays (research, drafting, summaries) with playbooks." },
        { tier: 4, label: "The default first pass for outbound and call notes, with reps on review." },
        { tier: 5, label: "Plays are designed model-first; reps handle the relationship moments." },
      ],
    },
    marketing: {
      prompt: "Where does AI sit in the actual marketing day, beyond the demo?",
      options: [
        { tier: 0, label: "Nowhere. The team opens it in a tab now and then." },
        { tier: 1, label: "A few people use it for first-draft copy, off-process." },
        { tier: 2, label: "Built into one named workflow (briefing, drafting or research)." },
        { tier: 3, label: "In two or three workflows (briefs, drafts, asset variants) with playbooks." },
        { tier: 4, label: "The default first pass for most production work, with humans on review." },
        { tier: 5, label: "Campaigns are designed model-first; humans curate and approve." },
      ],
    },
    "engineering-product": {
      prompt: "Where does AI sit in the actual engineering and product day, beyond the demo?",
      options: [
        { tier: 0, label: "Nowhere. People open it in a separate tab occasionally." },
        { tier: 1, label: "A few engineers use Copilot for autocomplete, nothing structural." },
        { tier: 2, label: "Embedded in one workflow (PR review, test gen, or spec drafting)." },
        { tier: 3, label: "In two or three workflows (PRs, tests, design docs) with conventions." },
        { tier: 4, label: "The default first pass for code, tests and specs, with humans on review." },
        { tier: 5, label: "Workflows are designed agent-first; engineers handle the hard reviews." },
      ],
    },
    "people-hr": {
      prompt: "Where does AI sit in the actual People day, beyond the demo?",
      options: [
        { tier: 0, label: "Nowhere. The team opens it in a separate tab now and then." },
        { tier: 1, label: "A few people use it for first-draft comms or JD edits, off-process." },
        { tier: 2, label: "Built into one named workflow (screening, summaries, or comms)." },
        { tier: 3, label: "In two or three workflows (sourcing, screening, internal comms) with playbooks." },
        { tier: 4, label: "The default first pass for most production work, with humans on review." },
        { tier: 5, label: "Workflows are designed model-first; people handle the human moments." },
      ],
    },
    finance: {
      prompt: "Where does AI sit in the actual finance day, beyond the demo?",
      options: [
        { tier: 0, label: "Nowhere. People open it in a separate tab occasionally." },
        { tier: 1, label: "A few analysts use it to draft commentary, off-process." },
        { tier: 2, label: "Built into one workflow (variance commentary, AP coding, or summaries)." },
        { tier: 3, label: "In two or three workflows (close, FP&A drafts, audit prep) with playbooks." },
        { tier: 4, label: "The default first pass for analysis and commentary, with humans on review." },
        { tier: 5, label: "Workflows are designed model-first; finance handles judgement calls." },
      ],
    },
    "ops-cs": {
      prompt: "Where does AI sit in the actual operations or customer success day, beyond the demo?",
      options: [
        { tier: 0, label: "Nowhere. People open it in a separate tab occasionally." },
        { tier: 1, label: "A few agents use it for first-draft replies, off-process." },
        { tier: 2, label: "Built into one workflow (triage, summaries, or knowledge-base draft)." },
        { tier: 3, label: "In two or three workflows (deflection, summaries, QBR prep) with playbooks." },
        { tier: 4, label: "The default first pass for tickets and comms, with humans on review." },
        { tier: 5, label: "Workflows are designed model-first; humans handle the trickiest cases." },
      ],
    },
  },
  "f-p7-roi": {
    sales: {
      prompt: "Can you point to the value AI has produced for sales?",
      options: [
        { tier: 0, label: "No, and we haven't tried to measure." },
        { tier: 1, label: 'Anecdotes. "It saves me an hour on prep."' },
        { tier: 2, label: "One pilot with a rough time-saving figure." },
        { tier: 3, label: "Hours saved tracked across drafting and research." },
        { tier: 4, label: "Pipeline coverage, reply rates and cycle time, reported quarterly." },
        { tier: 5, label: "AI-attributable bookings or win-rate uplift in the forecast." },
      ],
    },
    marketing: {
      prompt: "Can you point to the value AI has produced for marketing?",
      options: [
        { tier: 0, label: "No, and we haven't tried to measure." },
        { tier: 1, label: 'Anecdotes. "It saves me an hour on each brief."' },
        { tier: 2, label: "One pilot with a rough time-saving figure." },
        { tier: 3, label: "Hours saved tracked across briefs and asset production." },
        { tier: 4, label: "Output volume, quality scores and cycle time, reported quarterly." },
        { tier: 5, label: "AI-attributable pipeline contribution in the marketing P&L." },
      ],
    },
    "engineering-product": {
      prompt: "Can you point to the value AI has produced for engineering and product?",
      options: [
        { tier: 0, label: "No, and we haven't tried to measure." },
        { tier: 1, label: 'Anecdotes. "It saves me an hour on boilerplate."' },
        { tier: 2, label: "One pilot with a rough time-saving figure." },
        { tier: 3, label: "Hours saved tracked across PRs, tests and docs." },
        { tier: 4, label: "Cycle time, defect rate and PR throughput, reported quarterly." },
        { tier: 5, label: "AI-attributable shipping velocity reflected in roadmap commitments." },
      ],
    },
    "people-hr": {
      prompt: "Can you point to the value AI has produced for People?",
      options: [
        { tier: 0, label: "No, and we haven't tried to measure." },
        { tier: 1, label: 'Anecdotes. "It saves an hour on each role."' },
        { tier: 2, label: "One pilot with a rough time-saving figure." },
        { tier: 3, label: "Hours saved tracked across sourcing, screening and comms." },
        { tier: 4, label: "Time-to-hire, quality of hire and comms throughput, reported quarterly." },
        { tier: 5, label: "AI-attributable improvements in retention or time-to-productivity." },
      ],
    },
    finance: {
      prompt: "Can you point to the value AI has produced for finance?",
      options: [
        { tier: 0, label: "No, and we haven't tried to measure." },
        { tier: 1, label: 'Anecdotes. "It saves an hour on the close."' },
        { tier: 2, label: "One pilot with a rough time-saving figure." },
        { tier: 3, label: "Hours saved tracked across close, AP and reporting drafts." },
        { tier: 4, label: "Days-to-close, error rate and analyst throughput, reported quarterly." },
        { tier: 5, label: "AI-attributable margin or working-capital improvement in the P&L." },
      ],
    },
    "ops-cs": {
      prompt: "Can you point to the value AI has produced for operations or customer success?",
      options: [
        { tier: 0, label: "No, and we haven't tried to measure." },
        { tier: 1, label: 'Anecdotes. "It saves an hour on each escalation."' },
        { tier: 2, label: "One pilot with a rough time-saving figure." },
        { tier: 3, label: "Hours saved tracked across triage, replies and QBR prep." },
        { tier: 4, label: "Deflection rate, CSAT and handle time, reported quarterly." },
        { tier: 5, label: "AI-attributable retention or NRR uplift in the customer book." },
      ],
    },
  },
};

// ─── (Old 17-question function set removed; replaced by FUNCTION_QUESTIONS above) ─

// ─── COMPANY level ──────────────────────────────────────────────────────────
// Whole-organisation lens: the exec/board view. Same 8 pillars, framed at scale.
export const COMPANY_QUESTIONS: Question[] = [
  // P1 Strategy & Mandate
  {
    id: "c-p1-mandate",
    pillar: 1,
    prompt: "Who, at board or exec level, owns AI for the company?",
    options: [
      { tier: 0, label: "Nobody. It's not on the agenda." },
      { tier: 1, label: "It surfaces in passing when something breaks." },
      { tier: 2, label: "An exec sponsor in name, no remit." },
      { tier: 3, label: "A named exec with a written remit." },
      { tier: 4, label: "An exec with a remit, budget, and quarterly review." },
      { tier: 5, label: "The CEO sets and tracks AI as a top-three priority." },
    ],
  },
  {
    id: "c-p1-strategy",
    pillar: 1,
    prompt: "Is there a company-wide AI strategy?",
    options: [
      { tier: 0, label: "No. We react to whatever happens." },
      { tier: 1, label: "A few decks, no agreement." },
      { tier: 2, label: "A draft strategy circulating internally." },
      { tier: 3, label: "An approved strategy with named owners per pillar." },
      { tier: 4, label: "Strategy tied to OKRs and capital allocation." },
      { tier: 5, label: "AI is the operating model. Strategy and AI are inseparable." },
    ],
  },
  // P2 Data Foundations
  {
    id: "c-p2-data",
    pillar: 2,
    prompt: "What state is the company's data in?",
    options: [
      { tier: 0, label: "Siloed across teams, mostly documents and inboxes." },
      { tier: 1, label: "Some warehouses, lots of shadow spreadsheets." },
      { tier: 2, label: "A central warehouse with patchy coverage." },
      { tier: 3, label: "Core domains modelled and documented." },
      { tier: 4, label: "Governed data platform with named stewards." },
      { tier: 5, label: "Unified, versioned, and queryable by agents today." },
    ],
  },
  {
    id: "c-p2-quality",
    pillar: 2,
    prompt: "How is data quality managed across the business?",
    options: [
      { tier: 0, label: "It isn't." },
      { tier: 1, label: "Each team fixes their own when it bites them." },
      { tier: 2, label: "A BI team does spot checks." },
      { tier: 3, label: "Quality SLAs on core entities." },
      { tier: 4, label: "Cross-functional data quality programme with KPIs." },
      { tier: 5, label: "Continuous monitoring and automated remediation." },
    ],
  },
  // P3 Tooling & Infrastructure
  {
    id: "c-p3-tools",
    pillar: 3,
    prompt: "What AI tooling is sanctioned company-wide?",
    options: [
      { tier: 0, label: "None." },
      { tier: 1, label: "Whatever individuals expense." },
      { tier: 2, label: "One enterprise licence rolled out unevenly." },
      { tier: 3, label: "An approved stack with SSO across the company." },
      { tier: 4, label: "Approved stack plus internal copilots in production." },
      { tier: 5, label: "Bespoke agents in production with monitoring and fallbacks." },
    ],
  },
  {
    id: "c-p3-infra",
    pillar: 3,
    prompt: "How does AI tooling integrate with core enterprise systems?",
    options: [
      { tier: 0, label: "It doesn't. Copy-paste between tabs." },
      { tier: 1, label: "Browser extensions and ad-hoc connectors." },
      { tier: 2, label: "A few off-the-shelf integrations to CRM/ERP." },
      { tier: 3, label: "Sanctioned connectors for systems of record." },
      { tier: 4, label: "API-level integration across the core stack." },
      { tier: 5, label: "A unified context layer feeding every model and agent." },
    ],
  },
  // P4 Workflow Integration
  {
    id: "c-p4-workflow",
    pillar: 4,
    prompt: "Where does AI sit in real cross-company workflows?",
    options: [
      { tier: 0, label: "Nowhere structural." },
      { tier: 1, label: "A few enthusiasts, off-process." },
      { tier: 2, label: "One named workflow in one function." },
      { tier: 3, label: "Embedded in workflows across 2–3 functions." },
      { tier: 4, label: "Default for most production work company-wide." },
      { tier: 5, label: "Workflows are designed model-first; humans escalate." },
    ],
  },
  {
    id: "c-p4-redesign",
    pillar: 4,
    prompt: "Has the company redesigned operating models around AI?",
    options: [
      { tier: 0, label: "No. Org chart and processes unchanged." },
      { tier: 1, label: "Talked about; nothing shipped." },
      { tier: 2, label: "One team has restructured around AI." },
      { tier: 3, label: "Two or three functions redesigned around AI." },
      { tier: 4, label: "Most functions have been rebuilt model-first." },
      { tier: 5, label: "The org is structured around AI-augmented work by default." },
    ],
  },
  // P5 Skills & Fluency
  {
    id: "c-p5-skills",
    pillar: 5,
    prompt: "How fluent is the median employee?",
    options: [
      { tier: 0, label: "Hasn't tried it." },
      { tier: 1, label: "Tried ChatGPT once or twice." },
      { tier: 2, label: "Uses it weekly for ad-hoc tasks." },
      { tier: 3, label: "Uses it daily, iterates on prompts." },
      { tier: 4, label: "Builds reusable assets: prompts, templates, mini-tools." },
      { tier: 5, label: "Composes and ships agents to colleagues." },
    ],
  },
  {
    id: "c-p5-training",
    pillar: 5,
    prompt: "What does the company invest in fluency?",
    options: [
      { tier: 0, label: "Nothing." },
      { tier: 1, label: "Optional Lunch & Learns." },
      { tier: 2, label: "A self-serve learning library." },
      { tier: 3, label: "Structured onboarding and shared prompt libraries." },
      { tier: 4, label: "Role-specific training with peer review and certification." },
      { tier: 5, label: "AI fluency is a hiring and promotion criterion." },
    ],
  },
  // P6 Governance & Risk
  {
    id: "c-p6-governance",
    pillar: 6,
    prompt: "What governance is in place company-wide?",
    options: [
      { tier: 0, label: "None." },
      { tier: 1, label: "An informal 'don't paste customer data' rule." },
      { tier: 2, label: "A written policy nobody has read." },
      { tier: 3, label: "Policy plus an approved-tools list, lightly enforced." },
      { tier: 4, label: "Policy, tooling, audit trails, periodic reviews." },
      { tier: 5, label: "Live monitoring, model risk register, board-level oversight." },
    ],
  },
  {
    id: "c-p6-review",
    pillar: 6,
    prompt: "How are high-stakes AI outputs reviewed?",
    options: [
      { tier: 0, label: "They aren't." },
      { tier: 1, label: "Author eyeballs it." },
      { tier: 2, label: "Peer review for customer-facing outputs." },
      { tier: 3, label: "Documented review steps for risky outputs." },
      { tier: 4, label: "Tiered sign-off thresholds by risk class." },
      { tier: 5, label: "Automated evals plus human-in-the-loop on high-stakes work." },
    ],
  },
  // P7 Measurement & ROI
  {
    id: "c-p7-roi",
    pillar: 7,
    prompt: "Can the company point to AI's value in the P&L?",
    options: [
      { tier: 0, label: "No, and we haven't tried to measure." },
      { tier: 1, label: "Anecdotes from individuals." },
      { tier: 2, label: "One pilot with a rough time-saving figure." },
      { tier: 3, label: "Several workflows with hours-saved tracked." },
      { tier: 4, label: "Hours, quality, and cycle time reported quarterly." },
      { tier: 5, label: "AI-attributable revenue or margin in the P&L." },
    ],
  },
  {
    id: "c-p7-baseline",
    pillar: 7,
    prompt: "Are there baselines the company measures improvements against?",
    options: [
      { tier: 0, label: "No." },
      { tier: 1, label: "Gut feel only." },
      { tier: 2, label: "One workflow has a rough baseline." },
      { tier: 3, label: "Baselines for everything we've automated." },
      { tier: 4, label: "Baselines plus quarterly re-measurement." },
      { tier: 5, label: "Live ROI dashboards feeding capital allocation." },
    ],
  },
  // P8 Culture & Adoption
  {
    id: "c-p8-culture",
    pillar: 8,
    prompt: "How do people across the company talk about using AI?",
    options: [
      { tier: 0, label: "They don't." },
      { tier: 1, label: "Quietly, almost guiltily." },
      { tier: 2, label: "Curiously in private channels." },
      { tier: 3, label: "Openly; better users teach the rest." },
      { tier: 4, label: "It's expected and normal across the org." },
      { tier: 5, label: "Not using it for a task is the thing that needs explaining." },
    ],
  },
  {
    id: "c-p8-leadership",
    pillar: 8,
    prompt: "How visibly does the executive team use AI?",
    options: [
      { tier: 0, label: "They don't." },
      { tier: 1, label: "One or two execs in private." },
      { tier: 2, label: "Some execs talk about it; few use it." },
      { tier: 3, label: "Execs demo AI use in town halls." },
      { tier: 4, label: "Execs ship AI-built artefacts as a matter of course." },
      { tier: 5, label: "The exec team operates AI-first; the company follows." },
    ],
  },
];

// ─── INDIVIDUAL level ───────────────────────────────────────────────────────
// IC / operator lens: your own stack, habits, and outputs. Shorter.
export const INDIVIDUAL_QUESTIONS: Question[] = [
  // P1 Strategy & Mandate (personal intent)
  {
    id: "i-p1-intent",
    pillar: 1,
    prompt: "How deliberate are you about AI in your own work?",
    options: [
      { tier: 0, label: "Not at all." },
      { tier: 1, label: "I try things when I remember." },
      { tier: 2, label: "I have a rough sense of where it helps me." },
      { tier: 3, label: "I have a written list of where I use it and where I don't." },
      { tier: 4, label: "I review and refine that list each quarter." },
      { tier: 5, label: "AI use is the default; I design my work around it." },
    ],
  },
  // P2 Data Foundations (personal context)
  {
    id: "i-p2-context",
    pillar: 2,
    prompt: "How well-organised is the context you feed your tools?",
    options: [
      { tier: 0, label: "I paste whatever's on screen." },
      { tier: 1, label: "I keep a few prompts in a notes app." },
      { tier: 2, label: "I have a folder of reference docs I reuse." },
      { tier: 3, label: "A structured prompt library with examples." },
      { tier: 4, label: "Versioned prompts and context bundles per task." },
      { tier: 5, label: "A personal knowledge base that agents can query." },
    ],
  },
  // P3 Tooling
  {
    id: "i-p3-tools",
    pillar: 3,
    prompt: "What does your personal AI stack look like?",
    options: [
      { tier: 0, label: "Nothing." },
      { tier: 1, label: "One free chatbot tab." },
      { tier: 2, label: "A paid chatbot plus one IDE/editor copilot." },
      { tier: 3, label: "A curated set of 3–5 tools I use daily." },
      { tier: 4, label: "Tools wired together with shortcuts and automations." },
      { tier: 5, label: "Personal agents that act on my behalf across systems." },
    ],
  },
  // P4 Workflow
  {
    id: "i-p4-workflow",
    pillar: 4,
    prompt: "Where does AI sit in your day-to-day work?",
    options: [
      { tier: 0, label: "It doesn't." },
      { tier: 1, label: "Occasional first drafts, off to the side." },
      { tier: 2, label: "Part of one specific recurring task." },
      { tier: 3, label: "Embedded in 2–3 of my regular workflows." },
      { tier: 4, label: "Default for most of my production work." },
      { tier: 5, label: "I design new work model-first; I escalate to myself." },
    ],
  },
  // P5 Skills
  {
    id: "i-p5-fluency",
    pillar: 5,
    prompt: "How would you rate your own fluency?",
    options: [
      { tier: 0, label: "Beginner. I don't really know what to ask." },
      { tier: 1, label: "Can get a passable first draft." },
      { tier: 2, label: "Comfortable iterating on prompts." },
      { tier: 3, label: "Comfortable with multi-step prompts and tool use." },
      { tier: 4, label: "I build reusable prompts, templates, and mini-tools." },
      { tier: 5, label: "I compose and ship agents others use." },
    ],
  },
  {
    id: "i-p5-learning",
    pillar: 5,
    prompt: "How do you keep learning?",
    options: [
      { tier: 0, label: "I don't." },
      { tier: 1, label: "I scroll posts when they appear." },
      { tier: 2, label: "I follow a couple of newsletters." },
      { tier: 3, label: "I block time weekly to try new tools and patterns." },
      { tier: 4, label: "I run small experiments and write up what worked." },
      { tier: 5, label: "I publish or teach what I learn." },
    ],
  },
  // P6 Governance (personal hygiene)
  {
    id: "i-p6-hygiene",
    pillar: 6,
    prompt: "How careful are you with sensitive data and AI outputs?",
    options: [
      { tier: 0, label: "I don't think about it." },
      { tier: 1, label: "I try not to paste obviously sensitive things." },
      { tier: 2, label: "I follow the company's basic rules." },
      { tier: 3, label: "I use approved tools and check outputs before sharing." },
      { tier: 4, label: "I keep an audit trail of where AI touched my work." },
      { tier: 5, label: "I have a personal review checklist for high-stakes outputs." },
    ],
  },
  // P7 ROI (personal time)
  {
    id: "i-p7-time",
    pillar: 7,
    prompt: "Can you point to time AI saves you?",
    options: [
      { tier: 0, label: "No idea." },
      { tier: 1, label: "Feels like some, can't quantify it." },
      { tier: 2, label: "A rough figure for one task." },
      { tier: 3, label: "Hours-saved tracked across my main workflows." },
      { tier: 4, label: "Hours plus quality and cycle-time, reviewed monthly." },
      { tier: 5, label: "I redirect saved hours into measurably higher-leverage work." },
    ],
  },
  // P8 Culture
  {
    id: "i-p8-share",
    pillar: 8,
    prompt: "How openly do you share what you do with AI?",
    options: [
      { tier: 0, label: "I don't tell anyone." },
      { tier: 1, label: "Only a couple of trusted colleagues." },
      { tier: 2, label: "I'll mention it in 1:1s." },
      { tier: 3, label: "I demo regularly to my team." },
      { tier: 4, label: "I publish prompts and patterns to the org." },
      { tier: 5, label: "I'm a known go-to for AI know-how." },
    ],
  },
];


const DEFAULT_DETAIL: QuestionDetail = {
  rationale: "This question tests whether AI is part of the operating system, not just an isolated tool choice.",
  trap: "Overclaiming is common here. The tier should reflect what happens reliably, not what has happened once.",
  crosscheck: "The answer should be consistent with adjacent pillars and the respondent's operating reality.",
};

export const RETIRED_DEEP_QUESTION_IDS = new Set<string>([
  "c-p1-mandate", "c-p2-data", "c-p3-tools", "c-p4-workflow", "c-p5-skills", "c-p6-governance", "c-p7-roi", "c-p8-culture",
  "f-p1-owner", "f-p2-data", "f-p3-tools", "f-p4-workflow", "f-p5-fluency", "f-p6-policy", "f-p7-roi", "f-p8-talk",
  "i-p1-intent", "i-p2-context", "i-p3-tools", "i-p4-workflow", "i-p5-fluency", "i-p6-hygiene", "i-p7-time", "i-p8-share",
]);

export const V11_COMPANY_DEEP_QUESTIONS: Question[] = [
  {
    id: "c-p2-corpus", pillar: 2, prompt: "How curated is the corpus your AI actually reads?",
    options: [
      { tier: 0, label: "Whatever we point it at." }, { tier: 1, label: "Some documents have been selected, mostly ad hoc." },
      { tier: 2, label: "A curated set of references per use case, refreshed irregularly." }, { tier: 3, label: "Governed RAG corpus with named owners and refresh cadence." },
      { tier: 4, label: "Live quality signals feed refresh decisions." }, { tier: 5, label: "Corpus quality is measured continuously and tied to output evals." },
    ],
    detail: { rationale: "Most RAG implementations fail at the corpus, not the model. Named ownership is the step-change at Tier 3.", trap: "Putting docs in a vector store is Tier 1 or 2, not Tier 3. Governance and ownership shift the tier.", crosscheck: "Cannot exceed the Data Foundations score by more than 1." }, version: "v1.1", flow: "deep", status: "active",
  },
  {
    id: "c-p2-memory", pillar: 2, prompt: "What does memory look like for your agents and workflows?",
    options: [
      { tier: 0, label: "None. Every session starts cold." }, { tier: 1, label: "Per-session memory only." }, { tier: 2, label: "Some shared context passed between steps, uncurated." },
      { tier: 3, label: "A deliberate memory architecture for the main agents." }, { tier: 4, label: "Memory is governed, versioned, and reviewed." }, { tier: 5, label: "Memory is treated as an IP asset with evals on retrieval quality." },
    ],
    detail: { rationale: "Memory is the quiet differentiator. Most companies have not thought about it at all.", trap: "Vendor-provided memory features count as Tier 1 unless there is deliberate architecture on top.", crosscheck: "Memory tier cannot exceed Agents tier." }, version: "v1.1", flow: "deep", status: "active",
  },
  {
    id: "c-p3-orchestration", pillar: 3, prompt: "What orchestrates your AI workflows?",
    options: [
      { tier: 0, label: "Nothing. Everything is manual copy-paste." }, { tier: 1, label: "A few Zapier or Make flows, owned informally." }, { tier: 2, label: "n8n, Temporal, or similar is in use for a handful of workflows." },
      { tier: 3, label: "A workflow engine is in production with named owners and failure handling." }, { tier: 4, label: "Event-driven orchestration feeds AI with fresh context. Memory and vector stores are deliberate." }, { tier: 5, label: "Orchestration, memory, and retrieval are a first-class discipline with cost telemetry." },
    ],
    detail: { rationale: "The plumbing underneath agents is what makes them compound or fail. Named owners at Tier 3 is non-negotiable.", trap: "Some Zapier flows are Tier 1 if nobody owns each flow.", crosscheck: "Orchestration should be within 1 tier of the agent question." }, version: "v1.1", flow: "deep", status: "active",
  },
  {
    id: "c-p3-observability", pillar: 3, prompt: "How do you observe AI in production?",
    options: [
      { tier: 0, label: "We don't." }, { tier: 1, label: "We see errors when customers complain." }, { tier: 2, label: "We log model calls somewhere we can query." },
      { tier: 3, label: "We track latency, cost, and failure rates per agent or workflow." }, { tier: 4, label: "Traces and evals run on live traffic with alerts." }, { tier: 5, label: "Observability drives routing, retries, and model swaps automatically." },
    ],
    detail: { rationale: "If you cannot see it, you cannot trust it. Tier 3 is where AI becomes a production system.", trap: "Logging calls is not the same as a dashboard showing cost per workflow.", crosscheck: "Observability tier cannot exceed orchestration tier." }, version: "v1.1", flow: "deep", status: "active",
  },
  {
    id: "c-p3-toolconnect", pillar: 3, prompt: "How are your agents connected to tools and data?",
    options: [
      { tier: 0, label: "They aren't. Agents exist only in chat windows." }, { tier: 1, label: "Agents use vendor-native integrations." }, { tier: 2, label: "Agents call named APIs through custom glue code." },
      { tier: 3, label: "Agents use MCP or an equivalent shared tool registry." }, { tier: 4, label: "A shared tool registry and skill library is used across all agents." }, { tier: 5, label: "Tool-use and skills are governed, versioned, and eval-tested as IP." },
    ],
    detail: { rationale: "Tool connection is where agent quality actually lives. Shared registries separate serious implementation from glue code.", trap: "Custom API calls are Tier 2, not Tier 3.", crosscheck: "Cannot exceed the agent tier by more than 1." }, version: "v1.1", flow: "deep", status: "active",
  },
  {
    id: "c-p5-prompts", pillar: 5, prompt: "Where do your organisation's best prompts actually live?",
    options: [
      { tier: 0, label: "In people's heads or private chat histories." }, { tier: 1, label: "Pasted into Slack, lost within days." }, { tier: 2, label: "In a shared Notion or Google Doc library, lightly organised." },
      { tier: 3, label: "In a versioned prompt or skills library with named owners." }, { tier: 4, label: "In Git or a dedicated platform with change history." }, { tier: 5, label: "Prompts and skills are treated as IP, with evals and reuse metrics." },
    ],
    detail: { rationale: "Prompt storage reveals whether skills are treated as craft or disposable.", trap: "A big library nobody uses is Tier 1, not Tier 2.", crosscheck: "Cannot exceed Skills & Fluency by more than 1." }, version: "v1.1", flow: "deep", status: "active",
  },
  {
    id: "c-p5-evals", pillar: 5, prompt: "How do you evaluate prompt and skill changes before deploying?",
    options: [
      { tier: 0, label: "We don't." }, { tier: 1, label: "Someone tries it and eyeballs the output." }, { tier: 2, label: "A second person reviews sample outputs before rollout." },
      { tier: 3, label: "A test set with known-good outputs is run manually." }, { tier: 4, label: "Automated evals gate deployment." }, { tier: 5, label: "Evals run on live traffic and trigger rollback on regression." },
    ],
    detail: { rationale: "Eval discipline separates teams shipping real craft from teams generating churn.", trap: "Trying it a few times is Tier 1, not Tier 3.", crosscheck: "Cannot exceed Observability by more than 1." }, version: "v1.1", flow: "deep", status: "active",
  },
];

export const V11_FUNCTION_DEEP_QUESTIONS: Question[] = [
  { id: "f-p3-agents", pillar: 3, prompt: "Does this function have agents of its own, running day to day?", options: [
    { tier: 0, label: "No." }, { tier: 1, label: "Someone has experimented with an agent on their own time." }, { tier: 2, label: "One agent is running for a specific task, with informal oversight." }, { tier: 3, label: "Two or three agents live, each with a named owner and review cadence." }, { tier: 4, label: "Agents handle the default first pass on production work; humans review." }, { tier: 5, label: "Function workflows are designed agent-first; people handle the hard judgment calls." },
  ], detail: { rationale: "Functions without agents are still paying full operational debt. Named ownership is the Tier 3 gate.", trap: "Built-in vendor AI features are Tier 1. They are not owned agents.", crosscheck: "Cannot exceed company-level agent tier by more than 1." }, version: "v1.1", flow: "deep", status: "active" },
  { id: "f-p5-prompts", pillar: 5, prompt: "How are prompts and skills shared across this function?", options: [
    { tier: 0, label: "They aren't. Everyone starts fresh." }, { tier: 1, label: "A couple of people swap prompts in Slack." }, { tier: 2, label: "A shared document most of the team has read once." }, { tier: 3, label: "An active prompt library used weekly, with named contributors." }, { tier: 4, label: "Versioned skills library with reuse tracked." }, { tier: 5, label: "Skills are function-owned IP, reviewed and eval-gated before deploy." },
  ], detail: { rationale: "Prompt reuse is the lead indicator of function-level craft.", trap: "A stale Notion page is Tier 1, not Tier 2.", crosscheck: "Should not exceed company-level prompts tier by more than 1." }, version: "v1.1", flow: "deep", status: "active" },
];

export const V11_INDIVIDUAL_DEEP_QUESTIONS: Question[] = [
  { id: "i-p3-agents", pillar: 3, prompt: "Have you built any personal agents or automations that run without you triggering them?", options: [
    { tier: 0, label: "No. Everything I use is manual." }, { tier: 1, label: "I've experimented but nothing runs on its own." }, { tier: 2, label: "One scheduled automation I built or configured." }, { tier: 3, label: "A handful of agents or scripts handling routine work." }, { tier: 4, label: "Tools wired together act on my behalf across systems." }, { tier: 5, label: "Personal agents run my day-to-day in the background; I review outputs." },
  ], detail: { rationale: "Builder density starts at the individual level. One shipped personal automation is already Tier 2.", trap: "Scheduled tasks are Tier 2, not Tier 3. Multiple workflows are the gate.", crosscheck: "Personal agent tier cannot exceed Individual skills by more than 1." }, version: "v1.1", flow: "deep", status: "active" },
];

function withInstrumentMetadata(question: Question, flow: QuestionFlow = "deep"): Question {
  return {
    ...question,
    detail: question.detail ?? DEFAULT_DETAIL,
    version: question.version ?? "v1.1",
    status: question.status ?? (RETIRED_DEEP_QUESTION_IDS.has(question.id) ? "archived" : "active"),
    flow: question.flow ?? flow,
  };
}

function applyFunctionVariant(question: Question, fn?: BusinessFunction): Question {
  const variant = fn ? FUNCTION_VARIANTS[question.id]?.[fn] : undefined;
  return variant ? { ...question, prompt: variant.prompt, options: variant.options } : question;
}

function byPillarThenStableId(a: Question, b: Question) {
  if (a.pillar !== b.pillar) return a.pillar - b.pillar;
  return a.id.localeCompare(b.id);
}

export function getQuestions(level: Level | undefined, fn?: BusinessFunction): Question[] {
  if (level === "company") return COMPANY_QUESTIONS.map((q) => withInstrumentMetadata(q, "deep"));
  if (level === "individual") return INDIVIDUAL_QUESTIONS.map((q) => withInstrumentMetadata(q, "deep"));
  return FUNCTION_QUESTIONS.map((q) => withInstrumentMetadata(applyFunctionVariant(q, fn), "deep"));
}

export function getDeepDiveQuestions(level: Level | undefined, fn?: BusinessFunction): Question[] {
  const base = getQuestions(level, fn).filter((q) => q.status !== "archived");
  if (level === "company") return [...base, ...V11_COMPANY_DEEP_QUESTIONS].sort(byPillarThenStableId);
  if (level === "individual") return [...base, ...V11_INDIVIDUAL_DEEP_QUESTIONS].sort(byPillarThenStableId);
  return [...base, ...V11_FUNCTION_DEEP_QUESTIONS].sort(byPillarThenStableId);
}

const DRAFT_KEY = "aioi:draft:v1";

export interface AssessmentDraft {
  level?: Level;
  qualifier?: {
    role?: string;
    size?: string;
    pain?: string;
    function?: BusinessFunction;
    region?: Region;
    email?: string;
    consentMarketing?: boolean;
    consentBenchmark?: boolean;
  };
  /** questionId -> selected tier index (0..5) */
  answers: Record<string, number>;
  startedAt?: string;
  respondentId?: string;
  respondentSlug?: string;
  magicLinkSent?: boolean;
}

export function loadDraft(): AssessmentDraft {
  if (typeof window === "undefined") return { answers: {} };
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { answers: {} };
    const parsed = JSON.parse(raw) as AssessmentDraft;
    return { answers: {}, ...parsed };
  } catch {
    return { answers: {} };
  }
}

export function saveDraft(draft: AssessmentDraft) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DRAFT_KEY);
}

// Shared content + types for the AIOI diagnostic flow.
// Function-level pillar question bank (v2 — 19 questions across 8 pillars).

import type { PillarIndex } from "@/components/aioi/PillarChip";
import type { Tier } from "@/components/aioi/TierBadge";

export type Level = "company" | "function" | "individual";

export const LEVELS: Record<Level, { title: string; tagline: string; time: string; audience: string }> = {
  company:    { title: "Company",    tagline: "The whole organisation.", time: "~22 min", audience: "Exec / Board" },
  function:   { title: "Function",   tagline: "One team, deeply.",       time: "~18 min", audience: "Function lead" },
  individual: { title: "Individual", tagline: "Your personal stack.",    time: "~12 min", audience: "IC / Operator" },
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

export const TIER_BY_INDEX: Tier[] = ["Dormant", "Reactive", "Exploratory", "Operational", "Integrated", "AI-Native"];

export interface QuestionOption {
  /** 0..5 maps to Tier index */
  tier: number;
  label: string;
  detail?: string;
}

export interface Question {
  id: string;
  pillar: PillarIndex;
  prompt: string;
  options: QuestionOption[]; // length 6, ordered Dormant..AI-Native
}

// 2–3 questions per pillar. Order matters: the diagnostic walks pillar by pillar.
// ─── FUNCTION level ─────────────────────────────────────────────────────────
export const FUNCTION_QUESTIONS: Question[] = [
  // ─── P1 Strategy & Mandate ──────────────────────────────────────────────
  {
    id: "p1-mandate",
    pillar: 1,
    prompt: "Who actually owns AI in your function?",
    options: [
      { tier: 0, label: "Nobody. It hasn't come up." },
      { tier: 1, label: "Whoever shouts loudest in a given week." },
      { tier: 2, label: "An interested deputy, on the side of their desk." },
      { tier: 3, label: "A named lead with a remit, no budget." },
      { tier: 4, label: "A named lead with a remit and a budget." },
      { tier: 5, label: "It's the function head's first agenda item, every week." },
    ],
  },
  {
    id: "p1-strategy",
    pillar: 1,
    prompt: "Is there a written AI strategy for the function?",
    options: [
      { tier: 0, label: "No, and nobody has asked for one." },
      { tier: 1, label: "A few slides someone made for an offsite." },
      { tier: 2, label: "A draft document, never finalised." },
      { tier: 3, label: "A one-pager with goals, owned by the lead." },
      { tier: 4, label: "Strategy with quarterly milestones tied to OKRs." },
      { tier: 5, label: "AI is the operating model — the strategy is the strategy." },
    ],
  },

  // ─── P2 Data Foundations ────────────────────────────────────────────────
  {
    id: "p2-data",
    pillar: 2,
    prompt: "If a model needed to read your function's data tomorrow, what would it find?",
    options: [
      { tier: 0, label: "PDFs, inboxes and Slack threads." },
      { tier: 1, label: "A few shared drives and one battered spreadsheet." },
      { tier: 2, label: "A CRM or warehouse, half-populated." },
      { tier: 3, label: "Clean tables for the core entities, gaps elsewhere." },
      { tier: 4, label: "A documented schema that engineering trusts." },
      { tier: 5, label: "Versioned, governed, and queryable by an agent today." },
    ],
  },
  {
    id: "p2-quality",
    pillar: 2,
    prompt: "How confident are you in the quality of that data?",
    options: [
      { tier: 0, label: "We don't really know what's in there." },
      { tier: 1, label: "We know it's messy; nobody has time to fix it." },
      { tier: 2, label: "We trust one or two reports, not the rest." },
      { tier: 3, label: "Core entities are clean; we audit occasionally." },
      { tier: 4, label: "Quality SLAs exist; owners are named." },
      { tier: 5, label: "Continuous monitoring; data quality is a tracked KPI." },
    ],
  },
  {
    id: "p2-access",
    pillar: 2,
    prompt: "How easily can the team get the data they need?",
    options: [
      { tier: 0, label: "They ask in Slack and hope." },
      { tier: 1, label: "Someone in BI runs it on request, eventually." },
      { tier: 2, label: "Self-serve dashboards for the obvious questions." },
      { tier: 3, label: "Self-serve for most, BI for the long tail." },
      { tier: 4, label: "Natural-language queries on a governed warehouse." },
      { tier: 5, label: "Agents pull and join data across systems autonomously." },
    ],
  },

  // ─── P3 Tooling & Infrastructure ────────────────────────────────────────
  {
    id: "p3-tools",
    pillar: 3,
    prompt: "What AI tooling is actually deployed in the function?",
    options: [
      { tier: 0, label: "None." },
      { tier: 1, label: "Personal ChatGPT accounts on company cards." },
      { tier: 2, label: "One team licence to Copilot or similar." },
      { tier: 3, label: "An approved stack with SSO and data controls." },
      { tier: 4, label: "Approved stack plus internal copilots for two workflows." },
      { tier: 5, label: "Bespoke agents in production, monitored, with fallbacks." },
    ],
  },
  {
    id: "p3-integration",
    pillar: 3,
    prompt: "How well does AI tooling connect to the rest of your stack?",
    options: [
      { tier: 0, label: "It doesn't. Copy-paste is the integration." },
      { tier: 1, label: "Browser extensions and clipboard." },
      { tier: 2, label: "A handful of off-the-shelf integrations." },
      { tier: 3, label: "Sanctioned connectors for the systems that matter." },
      { tier: 4, label: "API-level integration with our core systems." },
      { tier: 5, label: "Models and tools share a unified context layer." },
    ],
  },

  // ─── P4 Workflow Integration ────────────────────────────────────────────
  {
    id: "p4-workflow",
    pillar: 4,
    prompt: "Where does AI sit in the actual day-to-day?",
    options: [
      { tier: 0, label: "Nowhere. It's a separate tab people open occasionally." },
      { tier: 1, label: "A few people use it for first drafts, off-process." },
      { tier: 2, label: "It's part of one named workflow, owned by one team." },
      { tier: 3, label: "Embedded in 2–3 workflows, with playbooks." },
      { tier: 4, label: "Default for most production work, with humans on review." },
      { tier: 5, label: "Workflows are designed model-first; humans escalate." },
    ],
  },
  {
    id: "p4-redesign",
    pillar: 4,
    prompt: "Have you redesigned any workflows around AI, rather than bolting it on?",
    options: [
      { tier: 0, label: "No — workflows are exactly as they were." },
      { tier: 1, label: "We've talked about it. Nothing changed." },
      { tier: 2, label: "One workflow has been tweaked to include AI steps." },
      { tier: 3, label: "Two or three workflows were redesigned around AI." },
      { tier: 4, label: "Most core workflows have been rebuilt model-first." },
      { tier: 5, label: "New work is designed for AI by default; humans escalate." },
    ],
  },

  // ─── P5 Skills & Fluency ────────────────────────────────────────────────
  {
    id: "p5-skills",
    pillar: 5,
    prompt: "How fluent is the median person in your function?",
    options: [
      { tier: 0, label: "Hasn't tried it." },
      { tier: 1, label: "Has typed into ChatGPT once or twice." },
      { tier: 2, label: "Uses it weekly for ad-hoc tasks." },
      { tier: 3, label: "Uses it daily, can iterate on prompts." },
      { tier: 4, label: "Builds reusable assets — prompts, templates, mini-tools." },
      { tier: 5, label: "Composes agents and ships them to colleagues." },
    ],
  },
  {
    id: "p5-training",
    pillar: 5,
    prompt: "What's in place to grow that fluency?",
    options: [
      { tier: 0, label: "Nothing. People figure it out alone." },
      { tier: 1, label: "An optional Lunch & Learn happened once." },
      { tier: 2, label: "A self-serve library of links and recordings." },
      { tier: 3, label: "Structured onboarding and a shared prompt library." },
      { tier: 4, label: "Role-specific training with ongoing peer review." },
      { tier: 5, label: "AI fluency is a hiring and promotion criterion." },
    ],
  },

  // ─── P6 Governance & Risk ───────────────────────────────────────────────
  {
    id: "p6-governance",
    pillar: 6,
    prompt: "What governance is in place?",
    options: [
      { tier: 0, label: "None. We hope for the best." },
      { tier: 1, label: "An informal 'don't paste customer data' rule." },
      { tier: 2, label: "A written policy nobody has read." },
      { tier: 3, label: "Policy plus an approved-tools list, lightly enforced." },
      { tier: 4, label: "Policy, tooling, audit trails, periodic reviews." },
      { tier: 5, label: "Live monitoring, model risk register, board-level oversight." },
    ],
  },
  {
    id: "p6-review",
    pillar: 6,
    prompt: "How are AI outputs reviewed before they reach a customer or decision?",
    options: [
      { tier: 0, label: "They aren't. Whatever the model said, ships." },
      { tier: 1, label: "The author eyeballs it." },
      { tier: 2, label: "Peer review for anything customer-facing." },
      { tier: 3, label: "Documented review steps for risky outputs." },
      { tier: 4, label: "Tiered review with sign-off thresholds by risk." },
      { tier: 5, label: "Automated evals plus human-in-the-loop for high-stakes." },
    ],
  },

  // ─── P7 Measurement & ROI ───────────────────────────────────────────────
  {
    id: "p7-roi",
    pillar: 7,
    prompt: "Can you point to the value AI has produced for this function?",
    options: [
      { tier: 0, label: "No, and we haven't tried to measure." },
      { tier: 1, label: "Anecdotes — 'it saves me an hour a week'." },
      { tier: 2, label: "One pilot with a rough time-saving figure." },
      { tier: 3, label: "Two or three named workflows with hours-saved tracked." },
      { tier: 4, label: "Hours, quality and cycle time, reported quarterly." },
      { tier: 5, label: "AI-attributable revenue or margin in the P&L." },
    ],
  },
  {
    id: "p7-baseline",
    pillar: 7,
    prompt: "Do you have a baseline you measure improvements against?",
    options: [
      { tier: 0, label: "No baseline. No measurement." },
      { tier: 1, label: "Gut feel from before vs after." },
      { tier: 2, label: "Rough baseline for one workflow." },
      { tier: 3, label: "Baselines for the workflows we've automated." },
      { tier: 4, label: "Baselines plus quarterly re-measurement." },
      { tier: 5, label: "Continuous baselines feeding a live ROI dashboard." },
    ],
  },

  // ─── P8 Culture & Adoption ──────────────────────────────────────────────
  {
    id: "p8-culture",
    pillar: 8,
    prompt: "How do colleagues talk about using AI in their work?",
    options: [
      { tier: 0, label: "They don't." },
      { tier: 1, label: "Quietly, in case it looks like cheating." },
      { tier: 2, label: "Curiously, in 1:1s but not standups." },
      { tier: 3, label: "Openly, with the better users teaching the rest." },
      { tier: 4, label: "It's expected — 'have you tried with the model?' is normal." },
      { tier: 5, label: "Not using it for a task is the thing that needs explaining." },
    ],
  },
  {
    id: "p8-leadership",
    pillar: 8,
    prompt: "How visibly does leadership use AI themselves?",
    options: [
      { tier: 0, label: "They don't, and don't pretend to." },
      { tier: 1, label: "A curious exec or two in private." },
      { tier: 2, label: "The function head dabbles, talks about it sometimes." },
      { tier: 3, label: "Leadership demos AI use in team meetings." },
      { tier: 4, label: "Leaders ship AI-built artefacts as a matter of course." },
      { tier: 5, label: "Leadership operates AI-first; the team follows the example." },
    ],
  },
];

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
      { tier: 5, label: "AI is the operating model — strategy and AI are inseparable." },
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
      { tier: 0, label: "No — org chart and processes unchanged." },
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
      { tier: 4, label: "Builds reusable assets — prompts, templates, mini-tools." },
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

export function getQuestions(level: Level | undefined): Question[] {
  if (level === "company") return COMPANY_QUESTIONS;
  if (level === "individual") return INDIVIDUAL_QUESTIONS;
  return FUNCTION_QUESTIONS;
}

const DRAFT_KEY = "aioi:draft:v1";

export interface AssessmentDraft {
  level?: Level;
  qualifier?: {
    role?: string;
    size?: string;
    pain?: string;
    email?: string;
    consentMarketing?: boolean;
    consentBenchmark?: boolean;
  };
  /** questionId -> selected tier index (0..5) */
  answers: Record<string, number>;
  startedAt?: string;
  /** Set once the user has signed in and the respondent row exists. */
  respondentId?: string;
  respondentSlug?: string;
  /** True once we've fired signInWithOtp for this draft's email. */
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

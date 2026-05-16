// Edge-runtime copy of the archetype catalogue — kept in sync with
// src/lib/archetypes.ts so the email pipeline does not depend on the
// React app bundle. If you edit one, edit the other.

export interface ArchetypeRecord {
  index: number
  name: string
  tagline: string
  definition: string
  whyItMatters: string
  leveragePoint: string
  whatGoodLooksLike: string
}

export const ARCHETYPES: ArchetypeRecord[] = [
  {
    index: 0,
    name: 'The Operator',
    tagline: 'Everything runs on people.',
    definition:
      'Your operation is handcrafted. Work gets done because capable people show up and figure it out. Processes are informal, knowledge lives in heads, and scaling means hiring more heads.',
    whyItMatters:
      'This is sustainable at small scale and dangerous at medium scale. When your best person leaves, something breaks. When volume increases, quality drops. You are paying premium salaries for work that does not require judgement.',
    leveragePoint:
      'Map your five most repetitive workflows and identify which steps are pure execution versus judgement. The execution steps are your first automation candidates.',
    whatGoodLooksLike:
      'The Fragment has tools in place, even if they do not connect yet. The work is documented and repeatable without the same person doing it every time.',
  },
  {
    index: 1,
    name: 'The Fragment',
    tagline: 'Tools everywhere, nothing connects.',
    definition:
      'You have invested in software but your systems do not talk. Data is copied between tabs. Reports are assembled by hand from three different sources. The team spends more time navigating tools than using them.',
    whyItMatters:
      'Tool fragmentation is expensive in ways that do not show on invoices. The real cost is context-switching, rekeying errors, and the slow death of anyone trying to get a straight answer from your data.',
    leveragePoint:
      'Audit your top ten weekly workflows and count the manual handoffs between systems. Every handoff is a chance to integrate or automate. Start with the one that happens most often.',
    whatGoodLooksLike:
      'The Explorer has individuals who experiment with new ways of working. There is curiosity and initiative, even if it is not yet organised.',
  },
  {
    index: 2,
    name: 'The Explorer',
    tagline: 'Trying things, no system.',
    definition:
      'Individuals on your team are experimenting with new technology, but nothing is shared or governed. One person has a brilliant setup. Their colleague has never heard of it. There is no standard, no onboarding, no centre of gravity.',
    whyItMatters:
      'Exploration without structure creates inequality. The people who figure it out get ahead; the people who do not fall behind. And when your best experimenter leaves, their setup leaves with them.',
    leveragePoint:
      'Identify the three most effective individual workflows in your team. Document them, standardise them, and make them the default. Turn private experiments into shared capability.',
    whatGoodLooksLike:
      'The Integrator has connected workflows that run without constant attention. Some processes are automated, even if they are not yet bulletproof.',
  },
  {
    index: 3,
    name: 'The Integrator',
    tagline: 'Partially connected, partially fragile.',
    definition:
      'You have automated some workflows and connected some systems, but the setup is brittle. Automations break when edge cases appear. No-one owns maintenance. The team does not trust the machines to run unsupervised.',
    whyItMatters:
      'Partial automation is often worse than no automation because it creates a false sense of security. When the automation fails, no-one notices until it is expensive. And because it usually works, no-one learns the manual process either.',
    leveragePoint:
      'Assign an owner to every automation. Build a simple health dashboard. Create a runbook for when things break. Trust comes from knowing someone is watching.',
    whatGoodLooksLike:
      'The Architect designs operations for scale. Systems handle routine work. People focus on exceptions, judgement, and relationships.',
  },
  {
    index: 4,
    name: 'The Architect',
    tagline: 'Designed for scale.',
    definition:
      'Your operations are built to run. Routine work is handled by systems. People are reserved for exceptions, judgement, and relationships. You think in workflows, not tasks. New work is designed with the system in mind from day one.',
    whyItMatters:
      'This is the operating model that lets you scale without proportionally scaling headcount. It is also where the real work begins: continuous improvement, human transition, and deciding what to stop doing altogether.',
    leveragePoint:
      'Measure the ratio of routine to exception work in your key functions. When routine drops below twenty percent, you are running a genuinely architected operation. If it is higher, there is still work to do.',
    whatGoodLooksLike:
      'You are here. The next frontier is optimisation: faster feedback loops, richer context for your agents, and freeing your best people to do work only they can do.',
  },
]

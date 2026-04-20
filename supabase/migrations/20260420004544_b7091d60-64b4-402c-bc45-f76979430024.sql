
-- Upsert all 19 Function-level questions
INSERT INTO public.questions (id, level, pillar, position, prompt, active) VALUES
  ('p1-mandate',     'function', 1, 1,  'Who actually owns AI in your function?', true),
  ('p1-strategy',    'function', 1, 2,  'Is there a written AI strategy for the function?', true),
  ('p2-data',        'function', 2, 3,  'If a model needed to read your function''s data tomorrow, what would it find?', true),
  ('p2-quality',     'function', 2, 4,  'How confident are you in the quality of that data?', true),
  ('p2-access',      'function', 2, 5,  'How easily can the team get the data they need?', true),
  ('p3-tools',       'function', 3, 6,  'What AI tooling is actually deployed in the function?', true),
  ('p3-integration', 'function', 3, 7,  'How well does AI tooling connect to the rest of your stack?', true),
  ('p4-workflow',    'function', 4, 8,  'Where does AI sit in the actual day-to-day?', true),
  ('p4-redesign',    'function', 4, 9,  'Have you redesigned any workflows around AI, rather than bolting it on?', true),
  ('p5-skills',      'function', 5, 10, 'How fluent is the median person in your function?', true),
  ('p5-training',    'function', 5, 11, 'What''s in place to grow that fluency?', true),
  ('p6-governance',  'function', 6, 12, 'What governance is in place?', true),
  ('p6-review',      'function', 6, 13, 'How are AI outputs reviewed before they reach a customer or decision?', true),
  ('p7-roi',         'function', 7, 14, 'Can you point to the value AI has produced for this function?', true),
  ('p7-baseline',    'function', 7, 15, 'Do you have a baseline you measure improvements against?', true),
  ('p8-culture',     'function', 8, 16, 'How do colleagues talk about using AI in their work?', true),
  ('p8-leadership',  'function', 8, 17, 'How visibly does leadership use AI themselves?', true)
ON CONFLICT (id) DO UPDATE SET
  level = EXCLUDED.level,
  pillar = EXCLUDED.pillar,
  position = EXCLUDED.position,
  prompt = EXCLUDED.prompt,
  active = EXCLUDED.active,
  updated_at = now();

-- Replace options for these questions
DELETE FROM public.question_options WHERE question_id IN (
  'p1-mandate','p1-strategy','p2-data','p2-quality','p2-access',
  'p3-tools','p3-integration','p4-workflow','p4-redesign',
  'p5-skills','p5-training','p6-governance','p6-review',
  'p7-roi','p7-baseline','p8-culture','p8-leadership'
);

INSERT INTO public.question_options (question_id, tier, label) VALUES
  -- p1-mandate
  ('p1-mandate', 0, 'Nobody. It hasn''t come up.'),
  ('p1-mandate', 1, 'Whoever shouts loudest in a given week.'),
  ('p1-mandate', 2, 'An interested deputy, on the side of their desk.'),
  ('p1-mandate', 3, 'A named lead with a remit, no budget.'),
  ('p1-mandate', 4, 'A named lead with a remit and a budget.'),
  ('p1-mandate', 5, 'It''s the function head''s first agenda item, every week.'),
  -- p1-strategy
  ('p1-strategy', 0, 'No, and nobody has asked for one.'),
  ('p1-strategy', 1, 'A few slides someone made for an offsite.'),
  ('p1-strategy', 2, 'A draft document, never finalised.'),
  ('p1-strategy', 3, 'A one-pager with goals, owned by the lead.'),
  ('p1-strategy', 4, 'Strategy with quarterly milestones tied to OKRs.'),
  ('p1-strategy', 5, 'AI is the operating model — the strategy is the strategy.'),
  -- p2-data
  ('p2-data', 0, 'PDFs, inboxes and Slack threads.'),
  ('p2-data', 1, 'A few shared drives and one battered spreadsheet.'),
  ('p2-data', 2, 'A CRM or warehouse, half-populated.'),
  ('p2-data', 3, 'Clean tables for the core entities, gaps elsewhere.'),
  ('p2-data', 4, 'A documented schema that engineering trusts.'),
  ('p2-data', 5, 'Versioned, governed, and queryable by an agent today.'),
  -- p2-quality
  ('p2-quality', 0, 'We don''t really know what''s in there.'),
  ('p2-quality', 1, 'We know it''s messy; nobody has time to fix it.'),
  ('p2-quality', 2, 'We trust one or two reports, not the rest.'),
  ('p2-quality', 3, 'Core entities are clean; we audit occasionally.'),
  ('p2-quality', 4, 'Quality SLAs exist; owners are named.'),
  ('p2-quality', 5, 'Continuous monitoring; data quality is a tracked KPI.'),
  -- p2-access
  ('p2-access', 0, 'They ask in Slack and hope.'),
  ('p2-access', 1, 'Someone in BI runs it on request, eventually.'),
  ('p2-access', 2, 'Self-serve dashboards for the obvious questions.'),
  ('p2-access', 3, 'Self-serve for most, BI for the long tail.'),
  ('p2-access', 4, 'Natural-language queries on a governed warehouse.'),
  ('p2-access', 5, 'Agents pull and join data across systems autonomously.'),
  -- p3-tools
  ('p3-tools', 0, 'None.'),
  ('p3-tools', 1, 'Personal ChatGPT accounts on company cards.'),
  ('p3-tools', 2, 'One team licence to Copilot or similar.'),
  ('p3-tools', 3, 'An approved stack with SSO and data controls.'),
  ('p3-tools', 4, 'Approved stack plus internal copilots for two workflows.'),
  ('p3-tools', 5, 'Bespoke agents in production, monitored, with fallbacks.'),
  -- p3-integration
  ('p3-integration', 0, 'It doesn''t. Copy-paste is the integration.'),
  ('p3-integration', 1, 'Browser extensions and clipboard.'),
  ('p3-integration', 2, 'A handful of off-the-shelf integrations.'),
  ('p3-integration', 3, 'Sanctioned connectors for the systems that matter.'),
  ('p3-integration', 4, 'API-level integration with our core systems.'),
  ('p3-integration', 5, 'Models and tools share a unified context layer.'),
  -- p4-workflow
  ('p4-workflow', 0, 'Nowhere. It''s a separate tab people open occasionally.'),
  ('p4-workflow', 1, 'A few people use it for first drafts, off-process.'),
  ('p4-workflow', 2, 'It''s part of one named workflow, owned by one team.'),
  ('p4-workflow', 3, 'Embedded in 2–3 workflows, with playbooks.'),
  ('p4-workflow', 4, 'Default for most production work, with humans on review.'),
  ('p4-workflow', 5, 'Workflows are designed model-first; humans escalate.'),
  -- p4-redesign
  ('p4-redesign', 0, 'No — workflows are exactly as they were.'),
  ('p4-redesign', 1, 'We''ve talked about it. Nothing changed.'),
  ('p4-redesign', 2, 'One workflow has been tweaked to include AI steps.'),
  ('p4-redesign', 3, 'Two or three workflows were redesigned around AI.'),
  ('p4-redesign', 4, 'Most core workflows have been rebuilt model-first.'),
  ('p4-redesign', 5, 'New work is designed for AI by default; humans escalate.'),
  -- p5-skills
  ('p5-skills', 0, 'Hasn''t tried it.'),
  ('p5-skills', 1, 'Has typed into ChatGPT once or twice.'),
  ('p5-skills', 2, 'Uses it weekly for ad-hoc tasks.'),
  ('p5-skills', 3, 'Uses it daily, can iterate on prompts.'),
  ('p5-skills', 4, 'Builds reusable assets — prompts, templates, mini-tools.'),
  ('p5-skills', 5, 'Composes agents and ships them to colleagues.'),
  -- p5-training
  ('p5-training', 0, 'Nothing. People figure it out alone.'),
  ('p5-training', 1, 'An optional Lunch & Learn happened once.'),
  ('p5-training', 2, 'A self-serve library of links and recordings.'),
  ('p5-training', 3, 'Structured onboarding and a shared prompt library.'),
  ('p5-training', 4, 'Role-specific training with ongoing peer review.'),
  ('p5-training', 5, 'AI fluency is a hiring and promotion criterion.'),
  -- p6-governance
  ('p6-governance', 0, 'None. We hope for the best.'),
  ('p6-governance', 1, 'An informal ''don''t paste customer data'' rule.'),
  ('p6-governance', 2, 'A written policy nobody has read.'),
  ('p6-governance', 3, 'Policy plus an approved-tools list, lightly enforced.'),
  ('p6-governance', 4, 'Policy, tooling, audit trails, periodic reviews.'),
  ('p6-governance', 5, 'Live monitoring, model risk register, board-level oversight.'),
  -- p6-review
  ('p6-review', 0, 'They aren''t. Whatever the model said, ships.'),
  ('p6-review', 1, 'The author eyeballs it.'),
  ('p6-review', 2, 'Peer review for anything customer-facing.'),
  ('p6-review', 3, 'Documented review steps for risky outputs.'),
  ('p6-review', 4, 'Tiered review with sign-off thresholds by risk.'),
  ('p6-review', 5, 'Automated evals plus human-in-the-loop for high-stakes.'),
  -- p7-roi
  ('p7-roi', 0, 'No, and we haven''t tried to measure.'),
  ('p7-roi', 1, 'Anecdotes — ''it saves me an hour a week''.'),
  ('p7-roi', 2, 'One pilot with a rough time-saving figure.'),
  ('p7-roi', 3, 'Two or three named workflows with hours-saved tracked.'),
  ('p7-roi', 4, 'Hours, quality and cycle time, reported quarterly.'),
  ('p7-roi', 5, 'AI-attributable revenue or margin in the P&L.'),
  -- p7-baseline
  ('p7-baseline', 0, 'No baseline. No measurement.'),
  ('p7-baseline', 1, 'Gut feel from before vs after.'),
  ('p7-baseline', 2, 'Rough baseline for one workflow.'),
  ('p7-baseline', 3, 'Baselines for the workflows we''ve automated.'),
  ('p7-baseline', 4, 'Baselines plus quarterly re-measurement.'),
  ('p7-baseline', 5, 'Continuous baselines feeding a live ROI dashboard.'),
  -- p8-culture
  ('p8-culture', 0, 'They don''t.'),
  ('p8-culture', 1, 'Quietly, in case it looks like cheating.'),
  ('p8-culture', 2, 'Curiously, in 1:1s but not standups.'),
  ('p8-culture', 3, 'Openly, with the better users teaching the rest.'),
  ('p8-culture', 4, 'It''s expected — ''have you tried with the model?'' is normal.'),
  ('p8-culture', 5, 'Not using it for a task is the thing that needs explaining.'),
  -- p8-leadership
  ('p8-leadership', 0, 'They don''t, and don''t pretend to.'),
  ('p8-leadership', 1, 'A curious exec or two in private.'),
  ('p8-leadership', 2, 'The function head dabbles, talks about it sometimes.'),
  ('p8-leadership', 3, 'Leadership demos AI use in team meetings.'),
  ('p8-leadership', 4, 'Leaders ship AI-built artefacts as a matter of course.'),
  ('p8-leadership', 5, 'Leadership operates AI-first; the team follows the example.');

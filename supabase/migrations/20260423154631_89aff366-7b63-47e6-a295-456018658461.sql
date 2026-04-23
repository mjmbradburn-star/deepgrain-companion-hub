INSERT INTO public.questions (id, level, pillar, position, prompt, detail, version, status, active)
VALUES (
  'i-p5-learning',
  'individual',
  5,
  52,
  'How do you keep learning?',
  jsonb_build_object(
    'rationale', 'Learning cadence is what separates occasional AI users from operators who compound gains over time.',
    'trap', 'Passive scrolling is not the same as deliberate practice. Regular experiments are the real threshold.',
    'crosscheck', 'Learning should stay close to the respondent''s fluency and workflow maturity.'
  ),
  'v1.1',
  'active',
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.question_options (question_id, tier, label)
SELECT 'i-p5-learning', option_row.tier, option_row.label
FROM (
  VALUES
    (0, 'I don''t.'),
    (1, 'I scroll posts when they appear.'),
    (2, 'I follow a couple of newsletters.'),
    (3, 'I block time weekly to try new tools and patterns.'),
    (4, 'I run small experiments and write up what worked.'),
    (5, 'I publish or teach what I learn.')
) AS option_row(tier, label)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.question_options existing
  WHERE existing.question_id = 'i-p5-learning'
    AND existing.tier = option_row.tier
);
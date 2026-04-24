import { z } from "zod";

import {
  FUNCTIONS,
  LENSES,
  PILLARS,
  SIZE_BANDS,
  TIER_BANDS,
} from "@/lib/playbook";

const trimNonEmpty = (max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, { message: `${label} is required` })
    .max(max, { message: `${label} must be ${max} characters or fewer` });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: `Must be ${max} characters or fewer` })
    .optional()
    .or(z.literal("").transform(() => undefined));

export const moveFormSchema = z
  .object({
    title: trimNonEmpty(160, "Title"),
    lens: z.enum(LENSES),
    pillar: z.coerce.number().int().min(1).max(8),
    applies_to_tier: z.coerce.number().int().min(0).max(5),
    tier_band: z.enum(TIER_BANDS),
    function: z.enum(FUNCTIONS).nullable(),
    size_bands: z.array(z.enum(SIZE_BANDS)).default([]),
    why_matters: optionalText(800),
    what_to_do: optionalText(2400),
    how_to_know: optionalText(800),
    body: trimNonEmpty(2400, "Body"),
    effort: z.coerce.number().int().min(1).max(4).nullable(),
    impact: z.coerce.number().int().min(1).max(4).nullable(),
    time_to_value: optionalText(80),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
    cta_type: optionalText(40),
    cta_url: optionalText(400),
    notes: optionalText(2000),
    active: z.boolean().default(true),
  })
  .superRefine((val, ctx) => {
    if (val.lens === "functional" && !val.function) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["function"],
        message: "Functional Moves must target a function",
      });
    }
    if (val.lens !== "functional" && val.function) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["function"],
        message: "Only functional Moves carry a function",
      });
    }
    if (val.cta_url && !/^https?:\/\//i.test(val.cta_url)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cta_url"],
        message: "CTA URL must start with http(s)://",
      });
    }
  });

export type MoveFormValues = z.infer<typeof moveFormSchema>;

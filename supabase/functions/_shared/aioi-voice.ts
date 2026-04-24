// Shared AIOI voice rules. Imported by report-chat (assistant replies) and
// backfill-move-copy (Move field drafting) so both speak in the same voice.
//
// Rules of thumb:
// - Direct, dry, plain. British English.
// - No em-dashes. No AI tells. No marketing words.
// - Contractions are fine. Speak to the reader as "you".
// - Never invent vendors, statistics or sources.

export const VOICE_GUIDE = `VOICE AND STYLE (non-negotiable)
- British English. Direct and dry. Short sentences. Plain words.
- Speak to the reader as "you". Contractions are fine ("you're", "don't").
- NEVER use em-dashes (—). Use commas, full stops or "and" instead.
- NEVER use these words or phrases: unlock, leverage, delve, synergy, journey, exciting, game-changing, revolutionary, seamless, cutting-edge, navigate, landscape, robust, comprehensive, dive in, foster, empower, holistic, ecosystem, paradigm, transformative.
- NEVER use these AI tells: "I hope this helps", "I'd be happy to", "Feel free to", "As an AI", "It's important to note", "In order to", "Going forward", "At the end of the day", "Let's explore", "Let's dive in", "In today's fast-paced world", "ensure that".
- NEVER open with "Great question", "Certainly", "Of course", "Sure", "Absolutely".
- No rhetorical questions. No emoji. No exclamation marks.
- Never invent vendor names, tools, statistics, dates or quotes. If a tool is needed, say "your existing chat tool", "whatever you use for docs", "your HR system".
- Don't patronise. The reader runs the business.`;

// Patterns we strip server-side before persisting assistant text. Keep these
// in sync with the words listed in VOICE_GUIDE so the model and the cleanup
// agree on what counts as a tell.
export const BANNED_PATTERNS: Array<[RegExp, string]> = [
  // Em-dash and its lookalikes.
  [/—/g, ", "],
  [/–/g, ", "],
  // Marketing words.
  [/\bunlock(ing|ed|s)?\b/gi, "open up"],
  [/\bleverag(e|ed|es|ing)\b/gi, "use"],
  [/\bdelve(s|d|ing)?\b/gi, "look at"],
  [/\bsynerg(y|ies|istic)\b/gi, "fit"],
  [/\bjourney(s)?\b/gi, "path"],
  [/\bexciting\b/gi, "useful"],
  [/\bgame[- ]chang(er|ing|ed)\b/gi, "big shift"],
  [/\brevolution(ary|ise|ize)?\b/gi, "new"],
  [/\bseamless(ly)?\b/gi, "clean"],
  [/\bcutting[- ]edge\b/gi, "current"],
  [/\bnavigat(e|ing|ed|es)\s+the\s+landscape\b/gi, "work through this"],
  [/\bnavigat(e|ing|ed|es)\b/gi, "work through"],
  [/\blandscape\b/gi, "picture"],
  [/\brobust\b/gi, "solid"],
  [/\bcomprehensive\b/gi, "full"],
  [/\bdive\s+in(to)?\b/gi, "start"],
  [/\bfoster(ing|ed)?\b/gi, "build"],
  [/\bempower(ing|ed|s|ment)?\b/gi, "let"],
  [/\bholistic\b/gi, "whole"],
  [/\becosystem\b/gi, "setup"],
  [/\bparadigm\b/gi, "model"],
  [/\btransformative\b/gi, "real"],
  // AI tells.
  [/\bI\s+hope\s+this\s+helps[.!]?/gi, ""],
  [/\bI'?d?\s+be\s+happy\s+to\b/gi, "I can"],
  [/\bfeel\s+free\s+to\b/gi, "you can"],
  [/\bas\s+an\s+AI\b/gi, ""],
  [/\bit'?s\s+important\s+to\s+note\s+that\b/gi, ""],
  [/\bin\s+order\s+to\b/gi, "to"],
  [/\bgoing\s+forward\b/gi, "from here"],
  [/\bat\s+the\s+end\s+of\s+the\s+day\b/gi, ""],
  [/\bensure\s+that\b/gi, "make sure"],
  [/\bensure\b/gi, "make sure"],
  [/\bin\s+today'?s\s+fast[- ]paced\s+world[,.]?\s*/gi, ""],
];

// Openers we strip from the very start of an assistant reply.
export const BANNED_OPENERS: RegExp[] = [
  /^\s*(great\s+question[!.,]?\s*)+/i,
  /^\s*(certainly[!.,]?\s*)+/i,
  /^\s*(of\s+course[!.,]?\s*)+/i,
  /^\s*(sure[!.,]?\s*)+/i,
  /^\s*(absolutely[!.,]?\s*)+/i,
  /^\s*(happy\s+to\s+help[!.,]?\s*)+/i,
];

/** Strip banned phrases, openers and em-dashes. Idempotent. */
export function sanitise(input: string): string {
  let out = String(input ?? "");
  for (const re of BANNED_OPENERS) out = out.replace(re, "");
  for (const [re, replacement] of BANNED_PATTERNS) out = out.replace(re, replacement);
  // Tidy double punctuation/spaces left behind by deletions.
  out = out.replace(/\s+([.,;:!?])/g, "$1");
  out = out.replace(/([.,;:])\1+/g, "$1");
  out = out.replace(/[ \t]{2,}/g, " ");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

/**
 * Motion contract test.
 *
 * Locks the Tailwind animation map so a future refactor that drops the
 * iPhone-grade easing animations fails CI. The names below are referenced
 * across Hero, Reveal, Button, and the dev harness — losing one silently
 * would degrade the site's motion language.
 */
import { describe, it, expect } from "vitest";
import tailwindConfig from "../../tailwind.config";

describe("motion utilities", () => {
  // @ts-expect-error - tailwind types are deep; we only need the extend block
  const animation = tailwindConfig.theme?.extend?.animation as Record<string, string>;
  // @ts-expect-error - same
  const keyframes = tailwindConfig.theme?.extend?.keyframes as Record<string, unknown>;

  const REQUIRED_ANIMATIONS = [
    "fade-up",
    "fade-up-soft",
    "fade-in",
    "fade-in-slow",
    "scale-in",
    "slide-up-mask",
    "underline-draw",
    "shimmer",
    "float",
    "pulse-ring",
    "blur-in",
    "scroll-bob",
    "gap-draw",
  ] as const;

  it("exposes every animation in the motion language", () => {
    for (const name of REQUIRED_ANIMATIONS) {
      expect(animation[name], `missing animation: ${name}`).toBeTruthy();
    }
  });

  it("uses the iPhone-grade ease curve on entrance animations", () => {
    const entrance = ["fade-up", "fade-up-soft", "slide-up-mask", "scale-in", "underline-draw"];
    for (const name of entrance) {
      // Either ease-out-quart (0.22, 1, 0.36, 1) or ease-out-expo (0.16, 1, 0.3, 1)
      expect(animation[name]).toMatch(/cubic-bezier\(0\.(22|16),\s*1,\s*0\.(36|3),\s*1\)/);
    }
  });

  it("declares a keyframe for every named animation", () => {
    for (const name of REQUIRED_ANIMATIONS) {
      expect(keyframes[name], `missing keyframe: ${name}`).toBeTruthy();
    }
  });
});

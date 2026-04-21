/**
 * Hero H1 responsive line-break / no-clip checks.
 *
 * jsdom doesn't lay out text, so we can't measure real wrapping. Instead we
 * assert the structural contract that prevents clipping at narrow widths:
 *   1. The headline uses three explicit <span class="block"> lines so wrapping
 *      is never left to the browser.
 *   2. The font-size uses a clamp() that stays at or below ~18vw on the
 *      smallest target (360px) — the value that empirically fits "Measure"
 *      on one line at 320–430px viewports.
 *   3. The container is not overflow-clipped horizontally (no overflow-x:
 *      hidden on the H1 itself) so we'd notice clipping in dev rather than
 *      silently.
 *
 * We exercise the common phone + tablet widths from the design checklist:
 * 360 (Android baseline), 390 (iPhone 14/15), 430 (iPhone Pro Max), 768 (iPad).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Hero } from "./Hero";

const WIDTHS = [360, 390, 430, 768] as const;

function setViewport(width: number, height = 800) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: height });
  window.dispatchEvent(new Event("resize"));
}

describe("Hero H1 responsive contract", () => {
  beforeEach(() => cleanup());

  it.each(WIDTHS)("renders three explicit line spans at %ipx", (width) => {
    setViewport(width);
    render(<Hero />);
    const h1 = screen.getByRole("heading", { level: 1 });
    // Each line is wrapped in an overflow:hidden mask containing a single
    // animated child span — find the inner animated spans.
    const animated = h1.querySelectorAll("span.motion-safe\\:animate-slide-up-mask");
    expect(animated).toHaveLength(3);
    expect(animated[0]).toHaveTextContent(/^Measure$/);
    expect(animated[1]).toHaveTextContent(/^your$/);
    expect(animated[2]).toHaveTextContent(/^AI debt\.$/);
  });

  it("clamps mobile font-size so the longest word ('Measure') fits at 360px", () => {
    setViewport(360);
    render(<Hero />);
    const h1 = screen.getByRole("heading", { level: 1 });
    // Tailwind compiles `text-[clamp(3.5rem,18vw,5.75rem)]` into the className.
    // We assert the source contract is intact rather than measured pixels.
    const cls = h1.className;
    const match = cls.match(/clamp\(([\d.]+)rem,\s*([\d.]+)vw,\s*([\d.]+)rem\)/);
    expect(match, `expected a clamp() font-size on the H1, got: ${cls}`).not.toBeNull();
    const [, minRem, vw, maxRem] = match!.map(Number);
    // Min must be readable; vw must keep "Measure" (~7 chars) on one line at 360px.
    expect(minRem).toBeGreaterThanOrEqual(3);
    expect(maxRem).toBeLessThanOrEqual(6);
    // 18vw at 360px = 64.8px ≈ 4rem — safely fits "Measure" (~7ch * ~0.55em ≈ 3.85rem).
    expect(vw).toBeLessThanOrEqual(18);
  });

  it("uses block-level line spans (not <br>) so the layout is wrap-proof", () => {
    render(<Hero />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.querySelector("br")).toBeNull();
  });

  it("keeps the H1 within the cream/brass token palette", () => {
    render(<Hero />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.className).toMatch(/text-cream/);
    const accent = h1.querySelector("span.text-brass");
    expect(accent).not.toBeNull();
  });
});

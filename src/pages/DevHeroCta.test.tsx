/**
 * Snapshot test for the hero CTA row at iPhone widths.
 *
 * jsdom can't lay out pixels, but it can prove the structural contract that
 * makes vertical alignment stable across 375 / 390 / 430:
 *   - Button height token is identical at every width (h-14 mobile, h-12 sm+).
 *   - Button content uses inline-flex + leading-none so icon and label share
 *     a single baseline.
 *   - Supporting links use leading-none so their box height equals their
 *     font-size — no descender-induced drift.
 *   - The frame markup snapshots match across renders.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import DevHeroCta from "./DevHeroCta";

const WIDTHS = [375, 390, 430] as const;

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
  window.dispatchEvent(new Event("resize"));
}

describe("DevHeroCta · iPhone alignment harness", () => {
  beforeEach(() => cleanup());

  it("renders one frame per target iPhone width", () => {
    render(<DevHeroCta />);
    for (const w of WIDTHS) {
      expect(screen.getByTestId(`cta-frame-${w}`)).toBeInTheDocument();
    }
  });

  it.each(WIDTHS)("CTA button keeps identical alignment classes at %ipx", (w) => {
    setViewport(w);
    render(<DevHeroCta />);
    const frame = screen.getByTestId(`cta-frame-${w}`);
    const button = frame.querySelector("a[href='/assess']") as HTMLElement;
    expect(button).not.toBeNull();
    // The classes that lock vertical alignment:
    expect(button.className).toMatch(/h-14/);
    expect(button.className).toMatch(/sm:h-12/);
    expect(button.className).toMatch(/inline-flex/);
    expect(button.className).toMatch(/items-center/);
    expect(button.className).toMatch(/leading-none/);
    cleanup();
  });

  it.each(WIDTHS)("supporting links use leading-none at %ipx", (w) => {
    setViewport(w);
    render(<DevHeroCta />);
    const frame = screen.getByTestId(`cta-frame-${w}`);
    const pillarsLink = frame.querySelector("a[href='/pillars']") as HTMLElement;
    expect(pillarsLink.className).toMatch(/leading-none/);
    const meta = frame.querySelector("span.font-mono") as HTMLElement;
    expect(meta.className).toMatch(/leading-none/);
    cleanup();
  });

  it("matches a stable structural snapshot across the three frames", () => {
    render(<DevHeroCta />);
    const snapshots = WIDTHS.map((w) => {
      const frame = screen.getByTestId(`cta-frame-${w}`);
      // Strip the width-specific testid so we can compare frames to each other.
      return frame.innerHTML;
    });
    // All three frames must be identical markup — only the parent width differs.
    expect(snapshots[0]).toBe(snapshots[1]);
    expect(snapshots[1]).toBe(snapshots[2]);
    expect(snapshots[0]).toMatchSnapshot();
  });
});

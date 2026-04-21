import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" },
      screens: { "2xl": "1320px" },
    },
    extend: {
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Times New Roman', 'serif'],
        ui: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        border: "hsl(var(--cream) / 0.12)",
        input: "hsl(var(--cream) / 0.16)",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        green: {
          DEFAULT: "hsl(var(--green))",
          deep: "hsl(var(--green-deep))",
        },
        walnut: {
          DEFAULT: "hsl(var(--walnut))",
          soft: "hsl(var(--walnut-soft))",
        },
        brass: {
          DEFAULT: "hsl(var(--brass))",
          bright: "hsl(var(--brass-bright))",
        },
        cream: {
          DEFAULT: "hsl(var(--cream))",
          dim: "hsl(var(--cream-dim))",
        },
        surface: {
          0: "hsl(var(--surface-0))",
          1: "hsl(var(--surface-1))",
          2: "hsl(var(--surface-2))",
          3: "hsl(var(--surface-3))",
        },
        pillar: {
          1: "hsl(var(--pillar-1))",
          2: "hsl(var(--pillar-2))",
          3: "hsl(var(--pillar-3))",
          4: "hsl(var(--pillar-4))",
          5: "hsl(var(--pillar-5))",
          6: "hsl(var(--pillar-6))",
          7: "hsl(var(--pillar-7))",
          8: "hsl(var(--pillar-8))",
        },

        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-up-soft": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-in-slow": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up-mask": {
          "0%": { opacity: "0", transform: "translateY(115%)", clipPath: "inset(0 0 100% 0)" },
          "60%": { opacity: "1" },
          "100%": { opacity: "1", transform: "translateY(0)", clipPath: "inset(0 0 0 0)" },
        },
        "scroll-bob": {
          "0%, 100%": { transform: "translateY(0)", opacity: "0.55" },
          "50%": { transform: "translateY(6px)", opacity: "1" },
        },
        "gap-draw": {
          "0%": { transform: "translateY(-50%) scaleX(0)", opacity: "0" },
          "60%": { opacity: "1" },
          "100%": { transform: "translateY(-50%) scaleX(1)", opacity: "1" },
        },
        "underline-draw": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-120%) skewX(-12deg)" },
          "100%": { transform: "translateX(220%) skewX(-12deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.7" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        "blur-in": {
          "0%": { opacity: "0", filter: "blur(8px)" },
          "100%": { opacity: "1", filter: "blur(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 600ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-up-soft": "fade-up-soft 700ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 800ms ease-out both",
        "fade-in-slow": "fade-in-slow 1200ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 500ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-up-mask": "slide-up-mask 900ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "scroll-bob": "scroll-bob 2.4s cubic-bezier(0.45, 0, 0.55, 1) infinite",
        "gap-draw": "gap-draw 520ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "underline-draw": "underline-draw 700ms cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1600ms cubic-bezier(0.22, 1, 0.36, 1) 600ms 1 both",
        float: "float 4s ease-in-out infinite",
        "pulse-ring": "pulse-ring 1800ms cubic-bezier(0.22, 1, 0.36, 1) infinite",
        "blur-in": "blur-in 900ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;

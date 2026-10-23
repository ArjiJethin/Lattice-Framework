/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          hover: "#634FDB",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        lattice: {
          bg: "#F5F6F8",
          surface: "#FFFFFF",
          surfaceSubtle: "#F8F9FB",
          navy: "#222938",
          secondaryText: "#647187",
          mutedText: "#8A94A6",
          border: "#D9DEE7",
          borderSubtle: "#E6EAF0",
          purple: "#7562E8",
          purpleLight: "#F2F0FD",
          purpleHover: "#634FDB",
          blue: "#2563EB",
          mint: "#0D8A58",
          amber: "#B45309",
          coral: "#DC2626",
          cardBg: "#FFFFFF",
          cardBorder: "#D9DEE7",
          glassBg: "rgba(255, 255, 255, 0.94)",
          glassBorder: "#D9DEE7",
        },
      },
      borderRadius: {
        sm: "0.25rem",   /* 4px - compact tags & inline badges */
        DEFAULT: "0.375rem", /* 6px */
        md: "0.375rem",   /* 6px - buttons, inputs, selects */
        lg: "0.5rem",     /* 8px - standard cards */
        xl: "0.5rem",     /* 8px - normalized from 16px to 8px */
        "2xl": "0.625rem", /* 10px - major panels */
        "3xl": "0.75rem",  /* 12px - modals & dialogs */
      },
      boxShadow: {
        "2xs": "0 1px 2px 0 rgba(15, 23, 42, 0.03)",
        xs: "0 1px 2px 0 rgba(15, 23, 42, 0.04)",
        sm: "0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.03)",
        glass: "0 4px 16px -2px rgba(15, 23, 42, 0.06), 0 1px 3px 0 rgba(15, 23, 42, 0.04)",
        "glass-sm": "0 1px 3px 0 rgba(15, 23, 42, 0.04)",
        "glass-hover": "0 4px 12px -2px rgba(15, 23, 42, 0.08)",
        card: "0 1px 2px 0 rgba(15, 23, 42, 0.03)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Geist Sans",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Geist Mono",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
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
          bg: "#F1F3F6",
          navy: "#18213B",
          purple: "#8174F5",
          purpleLight: "#EEEBFF",
          purpleHover: "#7162F3",
          blue: "#5598F7",
          mint: "#10B981",
          amber: "#F59E0B",
          coral: "#EF4444",
          cardBg: "rgba(255, 255, 255, 0.92)",
          cardBorder: "rgba(226, 232, 240, 0.8)",
          glassBg: "rgba(255, 255, 255, 0.85)",
          glassBorder: "rgba(241, 243, 246, 0.9)",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(24, 33, 59, 0.06)",
        "glass-sm": "0 2px 12px 0 rgba(24, 33, 59, 0.04)",
        "glass-hover": "0 12px 40px -4px rgba(129, 116, 245, 0.15)",
        card: "0 2px 10px -2px rgba(24, 33, 59, 0.04), 0 1px 3px -1px rgba(24, 33, 59, 0.02)",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dublin Lions (Clondalkin) authentic club identity: electric blue + white
        // on a cinematic near-black navy. The former gold accent is remapped to
        // Lions blue below (see `amber`) so the whole app shares ONE accent hue.
        "deep-navy": "#070C16",
        "electric-blue": "#2E6BFF",
        "accent-gold": "#2E6BFF",
        "soft-white": "#F5F8FF",
        "muted-navy": "#111C30",
        "darker-navy": "#0B1424",
        lions: {
          50: "#EEF4FF",
          100: "#D9E6FF",
          200: "#B6CCFF",
          300: "#8AACFF",
          400: "#5B87FF",
          500: "#2E6BFF",
          600: "#1B52E6",
          700: "#163FB4",
          800: "#16368C",
          900: "#16306E",
        },
        // Semantic warning stays a real amber (the `amber` scale itself is
        // repurposed as the Lions-blue accent, so warnings use `warn-*`).
        warn: {
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
        },
        // Accent remap: every existing `amber-*` utility now renders Lions blue.
        amber: {
          50: "#EEF4FF",
          100: "#D9E6FF",
          200: "#B6CCFF",
          300: "#8AACFF",
          400: "#5B87FF",
          500: "#2E6BFF",
          600: "#1B52E6",
          700: "#163FB4",
          800: "#16368C",
          900: "#16306E",
        },
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
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
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
      fontFamily: {
        // Type system remap for the from-scratch redesign. Class names
        // (`font-oswald`, `font-inter`) are kept stable to avoid churn; the
        // stacks now resolve to the new pairing.
        oswald: ['Space Grotesk', 'system-ui', 'sans-serif'],
        inter: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Manrope', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "hero-gradient": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "ken-burns": {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.03)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(40px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "hero-gradient": "hero-gradient 15s linear infinite",
        "ken-burns": "ken-burns 20s ease-in-out infinite alternate",
        "fade-in-up": "fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#FFF6E8",
          100: "#FEEACB",
          200: "#FDD49A",
          500: "#F7941D",
          600: "#E07F0A",
          700: "#B86500",
          800: "#7A4300",
          900: "#1A1A1A",
        },
        sky: {
          50:  "#FFF6E8",
          400: "#F7941D",
          500: "#F7941D",
          700: "#B86500",
        },
        match: "#10b981",
        pass:  "#ef4444",
        // Dark "match panel" surface (warm near-black, Jobright-style)
        ink: {
          DEFAULT: "#1A1A1A",
          800: "#231a10",
          700: "#3a2a15",
        },
        // Warm off-white app canvas
        canvas: "#F6F4F1",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 8px 32px rgba(0,0,0,0.10)",
        "card-hover": "0 16px 48px rgba(0,0,0,0.16)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-100%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.2s ease-out",
        slideDown: "slideDown 0.3s ease-out",
        slideInRight: "slideInRight 0.3s ease-out",
      },
    },
  },
  plugins: [],
};

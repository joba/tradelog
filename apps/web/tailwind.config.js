/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'Inter'", "monospace"],
        sans: ["'Inter'", "sans-serif"],
      },
      colors: {
        terminal: {
          bg: "#0a0c0f",
          surface: "#0f1217",
          border: "#1c2230",
          muted: "#1e2535",
          text: "#c8d4e8",
          dim: "#5a6a82",
          bright: "#e8f0fc",
        },
        profit: {
          DEFAULT: "#00c896",
          dim: "#00c89620",
          bright: "#00ffb8",
        },
        loss: {
          DEFAULT: "#ff4b6e",
          dim: "#ff4b6e20",
          bright: "#ff6b87",
        },
        accent: {
          DEFAULT: "#4d9fff",
          dim: "#4d9fff20",
          bright: "#7ab8ff",
        },
      },
      backgroundImage: {
        scanline:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.01) 2px, rgba(255,255,255,0.01) 4px)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease forwards",
        "slide-up": "slideUp 0.3s ease forwards",
        blink: "blink 1s step-end infinite",
        ticker: "ticker 20s linear infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: {
          from: { opacity: 0, transform: "translateY(12px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        blink: { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0 } },
        ticker: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

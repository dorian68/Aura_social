import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#060A08",
        panel: "#0B0F0E",
        ink: "#FFF7E8",
      },
      boxShadow: {
        glow: "0 18px 40px -26px rgba(0, 0, 0, 0.95)",
        cyan: "0 0 28px rgba(190, 242, 100, 0.14)",
      },
      animation: {
        "pulse-soft": "pulseSoft 2.4s ease-in-out infinite",
        "float-slow": "floatSlow 6s ease-in-out infinite",
        "spin-slow": "spin 10s linear infinite",
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

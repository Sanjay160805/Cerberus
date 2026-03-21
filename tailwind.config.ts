import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        threat: {
          low: "#22c55e",
          medium: "#f59e0b",
          high: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};

export default config;

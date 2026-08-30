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
        background: "var(--background)",
        foreground: "var(--foreground)",
        razorpay: {
          blue: "#0C2340",
          sky: "#0D6EFD",
          dark: "#081225",
          accent: "#3395FF",
          light: "#F5F8FF",
          border: "#E2E8F0"
        }
      },
    },
  },
  plugins: [],
};
export default config;

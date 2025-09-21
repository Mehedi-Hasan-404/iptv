// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // You can extend Tailwind's default theme here if you wish.
      // For this project, we are primarily using CSS variables defined
      // in globals.css, so extensive theme extension is not necessary.
      // Example:
      // colors: {
      //   'brand-accent': 'var(--accent)',
      //   'brand-primary': 'var(--bg-primary)',
      // },
    },
  },
  plugins: [],
};
export default config;

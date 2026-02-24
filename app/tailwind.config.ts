import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'nea-green': '#00A651',
        'blue-bin': '#0077B6',
        'bg': '#F5F7FA',
        'text-primary': '#0F172A',
        'text-secondary': '#475569',
      },
      borderRadius: {
        'card': '16px',
        'btn': '12px',
      },
      fontSize: {
        'body': ['16px', '1.5'],
        'caption': ['14px', '1.5'],
      },
      minHeight: {
        'btn': '52px',
      },
    },
  },
  plugins: [],
};
export default config;

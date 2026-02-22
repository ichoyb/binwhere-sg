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
      },
      borderRadius: {
        'card': '12px',
        'btn': '8px',
      },
    },
  },
  plugins: [],
};
export default config;

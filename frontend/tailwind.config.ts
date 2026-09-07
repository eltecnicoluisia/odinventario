import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0f172a', 
        surface: '#1e293b',    
        primary: '#3b82f6',    
        accent: '#60a5fa',     
        text: '#f8fafc',       
        muted: '#94a3b8',      
      },
      boxShadow: {
        'glow': '0 0 20px rgba(59, 130, 246, 0.5)',
      }
    },
  },
  plugins: [],
};
export default config;

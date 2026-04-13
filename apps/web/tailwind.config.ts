import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'len-purple':  '#6C5CE7',
        'len-violet':  '#A29BFE',
        'len-dark':    '#1E1B4B',
        'len-mid':     '#2D2B6B',
        'len-light':   '#F5F3FF',
        'len-border':  '#EDE9FE',
        'len-surface': '#FAFAFE',
        // keep mondega aliases for coin colors
        'mondega-green':   '#059669',
        'mondega-surface': '#F5F3FF',
        'mondega-border':  '#EDE9FE',
        'mondega-dark':    '#1E1B4B',
      },
      backgroundImage: {
        'len-gradient': 'linear-gradient(135deg, #1E1B4B 0%, #4C3CCF 50%, #6C5CE7 100%)',
        'len-card':     'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'len': '0 4px 24px rgba(108, 92, 231, 0.18)',
        'len-lg': '0 8px 40px rgba(108, 92, 231, 0.24)',
      },
    },
  },
  plugins: [],
};

export default config;

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
        'len-purple':  '#4338CA',
        'len-violet':  '#818CF8',
        'len-dark':    '#1E1B4B',
        'len-light':   '#EEF2FF',
        'len-border':  '#E0E7FF',
        'len-surface': '#F9FAFB',
      },
      backgroundImage: {
        'len-gradient': 'linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)',
      },
    },
  },
  plugins: [],
};

export default config;

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
        'mondega-green':   '#0D6E3E',
        'mondega-dark':    '#0A2E1A',
        'mondega-gold':    '#C9A84C',
        'mondega-surface': '#F8FAF9',
        'mondega-border':  '#E2EDE8',
      },
    },
  },
  plugins: [],
};

export default config;

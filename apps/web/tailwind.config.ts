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
        'len-purple':  '#4338CA',   // índigo-700 — profundo, no eléctrico
        'len-violet':  '#818CF8',   // índigo-400 — acento suave
        'len-dark':    '#1E1B4B',   // navy — se mantiene
        'len-mid':     '#312E81',   // índigo-900 — para gradientes intermedios
        'len-light':   '#EEF2FF',   // índigo-50 — fondos limpios
        'len-border':  '#E0E7FF',   // índigo-100 — bordes sutiles
        'len-surface': '#F9FAFB',   // blanco neutro — sin tinte
        // mondega aliases
        'mondega-green':   '#059669',
        'mondega-surface': '#EEF2FF',
        'mondega-border':  '#E0E7FF',
        'mondega-dark':    '#1E1B4B',
      },
      backgroundImage: {
        'len-gradient': 'linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)',
        'len-card':     'linear-gradient(135deg, #4338CA 0%, #818CF8 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'len':    '0 4px 24px rgba(67, 56, 202, 0.15)',
        'len-lg': '0 8px 40px rgba(67, 56, 202, 0.20)',
      },
    },
  },
  plugins: [],
};

export default config;

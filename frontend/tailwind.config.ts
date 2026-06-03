import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7f4',
          100: '#dceee6',
          200: '#b8ddd0',
          300: '#8bc4b0',
          400: '#5da68c',
          500: '#3d8a6f',
          600: '#2d6f59',
          700: '#255a49',
          800: '#20483c',
          900: '#1c3c33',
        },
        slate: {
          850: '#1a2332',
        },
      },
    },
  },
  plugins: [],
};

export default config;

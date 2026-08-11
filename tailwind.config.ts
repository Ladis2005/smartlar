import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef2f9',
          100: '#d6dff0',
          200: '#adbfe1',
          300: '#7f99cd',
          400: '#4f6fae',
          500: '#2f4d8c',
          600: '#1f386c',
          700: '#152a55',
          800: '#0e1e3f',
          900: '#0a1730',
        },
        orange: {
          50: '#fff5ed',
          100: '#ffe6d1',
          200: '#ffc79f',
          300: '#ffa367',
          400: '#ff8235',
          500: '#f96a12',
          600: '#e05609',
          700: '#b8410b',
          800: '#933612',
          900: '#762f12',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(10, 23, 48, 0.06), 0 8px 24px -12px rgba(10, 23, 48, 0.18)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;

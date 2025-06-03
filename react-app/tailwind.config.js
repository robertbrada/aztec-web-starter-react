/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--rxst-font-sans)'],
        mono: ['var(--rxst-font-mono)'],
        headline: ['SF Pro Display Bold'],
        headline2: ['Satoshi'],
      },
      colors: {
        primary: '#6C51E1',
        secondary: '#56D8FF',
        'bg-light': '#F6F9FB',
        'bg-medium': '#EBF0F3',
        border: '#D9D9D9',
        'text-primary': '#2D3748',
        'text-secondary': '#606d81',
        'text-tertiary': '#9C9FA3',
        green: '#30cf74',
        red: '#da1466',
      },
    },
  },
  plugins: [],
};

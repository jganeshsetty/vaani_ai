/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'surface-tint': '#28543e',
        'primary': '#28543e',
        'primary-dark': '#1d3f2f',
        'primary-container': '#28543e',
        'on-primary': '#ffffff',
        'on-primary-container': '#bdeed0',
        'secondary': '#58605c',
        'secondary-container': '#e4eee7',
        'on-secondary-container': '#243e31',
        'sage': '#eaf2ec',
        'sage-light': '#f3f7f4',
        'sage-subtle': '#eaf2ec',
        'sage-border': '#d2ded5',
        'warm-card': '#ffffff',
        'background': '#faf9f6',
        'surface': '#faf9f6',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f6f5f2',
        'surface-container': '#efeeeb',
        'surface-container-high': '#e6e3dd',
        'on-surface': '#1a1c1a',
        'on-surface-variant': '#4d5550',
        'outline': '#717973',
        'outline-variant': '#e2e1dd',
        'outline-light': '#eeece8',
        'terracotta': '#c0392b',
        'terracotta-hover': '#a93226',
        'terracotta-light': '#fdf0ee',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      keyframes: {
        'gentle-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.06)', opacity: '0.5' },
        },
        'gentle-wave': {
          '0%, 100%': { height: '16px' },
          '50%': { height: '38px' },
        },
      },
      animation: {
        'gentle-pulse': 'gentle-pulse 3s ease-in-out infinite',
        'gentle-wave': 'gentle-wave 1.4s ease-in-out infinite',
      },
      borderRadius: {
        'DEFAULT': '0.375rem',
        'lg': '0.625rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
        'full': '9999px',
      },
    },
  },
  plugins: [],
};

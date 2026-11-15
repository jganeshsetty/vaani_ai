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
        // Use Tailwind's built-in blue scale for primary (blue-50 through blue-950)
        // primary = blue-600, primary-dark = blue-700, etc.

        // Semantic Colors (using Tailwind's built-in scales with custom names)
        'success': '#059669',        // Emerald-600
        'success-light': '#10B981',  // Emerald-500
        'warning': '#D97706',        // Amber-600
        'warning-light': '#F59E0B',  // Amber-500
        'error': '#DC2626',          // Red-600
        'error-light': '#EF4444',    // Red-500

        // Surface & Glassmorphism Tokens (custom)
        'surface': '#F8FAFC',        // Slate-50 (light default)
        'surface-elevated': '#FFFFFF',
        'surface-dim': '#F1F5F9',    // Slate-100
        'surface-card': '#FFFFFF',
        'surface-border': '#E2E8F0', // Slate-200

        // Dark Mode Surfaces (custom)
        'surface-dark': '#0F172A',   // Slate-900
        'surface-dark-elevated': '#1E293B', // Slate-800
        'surface-dark-dim': '#1E293B',
        'surface-dark-card': '#1E293B',
        'surface-dark-border': '#334155', // Slate-700

        // Text Colors (custom semantic names)
        'text-primary': '#0F172A',   // Slate-900
        'text-secondary': '#475569', // Slate-600
        'text-muted': '#94A3B8',     // Slate-400
        'text-inverse': '#F8FAFC',   // Slate-50
        'text-dark-primary': '#F8FAFC',
        'text-dark-secondary': '#CBD5E1', // Slate-300
        'text-dark-muted': '#64748B', // Slate-500

        // Glassmorphism Tokens (applied via utilities in globals.css)
        'glass-light-bg': 'rgba(255, 255, 255, 0.8)',
        'glass-light-border': 'rgba(226, 232, 240, 0.6)', // slate-200/60
        'glass-dark-bg': 'rgba(30, 41, 59, 0.8)',         // slate-800/80
        'glass-dark-border': 'rgba(51, 65, 85, 0.6)',     // slate-700/60
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        headline: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
      borderRadius: {
        'DEFAULT': '0.5rem',      // 8px - slightly rounder for modern feel
        'sm': '0.375rem',         // 6px
        'md': '0.5rem',           // 8px
        'lg': '0.75rem',          // 12px
        'xl': '1rem',             // 16px
        '2xl': '1.25rem',         // 20px
        '3xl': '1.5rem',          // 24px
        'full': '9999px',
      },
      boxShadow: {
        'glass': '0 2px 8px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)',
        'glass-lg': '0 8px 24px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.05)',
        'glass-xl': '0 16px 48px rgba(15, 23, 42, 0.1), 0 8px 24px rgba(15, 23, 42, 0.06)',
        'glass-dark': '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2)',
        'glass-dark-lg': '0 8px 24px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.25)',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
    },
  },
  plugins: [],
};

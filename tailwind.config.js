/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        paper: '#F7F5EF',
        ink: '#1C2B24',
        sage: {
          DEFAULT: '#274734',
          light: '#3F6B4F',
          lighter: '#5B8C6A',
          pale: '#E8F0E6',
        },
        terracotta: {
          DEFAULT: '#A8432F',
          light: '#C0604A',
          pale: '#F5E6E2',
        },
        amber: {
          DEFAULT: '#C17A2E',
          light: '#D4954A',
          pale: '#F8F0E0',
        },
        border: '#D8D3C4',
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.375rem',
        md: '0.5rem',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Constantia', 'Times New Roman', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        page: '#EDE7D9',
        card: '#FCF9F2',
        ink: '#1C1715',
        muted: '#7A7265',
        gold: '#C89B3C',
        goldlight: '#E8D5A0',
        forest: '#2D4A3E',
        forestlight: '#4A7A5F',
        rust: '#A8432F',
        rustlight: '#F0DCD8',
        navy: '#1A1F2B',
        navyLight: '#2D3445',
        border: '#D4CDBC',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.12)',
        'btn': '0 1px 3px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
}

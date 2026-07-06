/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        profit: {
          DEFAULT: '#166534',
          light: '#dcfce7',
        },
        loss: {
          DEFAULT: '#dc2626',
          light: '#fee2e2',
        },
      },
    },
  },
  plugins: [],
}

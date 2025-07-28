/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4361ee',
          dark: '#3a56d4',
        },
        secondary: '#7209b7',
        accent: '#f72585',
        dark: '#1a1a2e',
        light: '#f8f9fa',
        success: '#4cc9f0',
      },
    },
  },
  plugins: [],
}

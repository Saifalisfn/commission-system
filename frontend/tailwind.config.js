/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0f172a',    // Deep Background
          card: '#1e293b',  // Card Background
          border: '#334155' // Muted Border
        }
      }
    },
  },
  plugins: [],
}
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#3b3486',
          light: '#6b63b5',
          dark: '#2a2462',
        },
        accent: {
          DEFAULT: '#7c6cec',
          glow: 'rgba(124,108,236,0.25)',
        },
        surface: {
          DEFAULT: '#ffffff',
          glass: 'rgba(255,255,255,0.72)',
        },
        bg: {
          DEFAULT: '#f8f7fc',
          deep: '#eae8f5',
        },
        text: {
          DEFAULT: '#1a1a2e',
          secondary: '#5a5880',
          muted: '#8e8bac',
        }
      }
    },
  },
  plugins: [],
}

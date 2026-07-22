/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19', // Deep dark blue-gray
        surface: '#1A1F2C',    // Slightly lighter blue-gray
        surfaceLight: '#2D3748', 
        primary: '#8B5CF6',    // Vibrant Violet
        primaryHover: '#7C3AED',
        secondary: '#06B6D4',  // Cyan accent
        textMain: '#F8FAFC',
        textMuted: '#94A3B8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

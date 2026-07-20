/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#2B2D31', // Sáng hơn slate-900 rất nhiều (tương tự màu Discord chuẩn)
        surface: '#313338',    // Sáng hơn nền một chút để tạo nổi bật
        surfaceLight: '#404249', // Dùng cho viền và hover
        primary: '#5865F2',    // Đổi màu nhấn sang tone xanh tím dịu hơn của Discord
        primaryHover: '#4752C4',
        textMain: '#F2F3F5',   // Trắng dịu
        textMuted: '#B5BAC1',  // Xám nhạt
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

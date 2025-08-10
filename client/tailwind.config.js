export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'Arial'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(0,0,0,0.1)',
      },
      colors: {
        brand: {
          50: '#eef9ff',
          100: '#d9f1ff',
          200: '#b8e6ff',
          300: '#85d6ff',
          400: '#47c1ff',
          500: '#14abff',
          600: '#008fe4',
          700: '#0072b6',
          800: '#065a8f',
          900: '#0a4f77',
        },
      },
      borderRadius: {
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Merlin brand — purple #6E3785
        brand: {
          50: '#f7f2fa',
          100: '#f0e7f5',
          200: '#e0cdea',
          300: '#c9a8d9',
          400: '#a878c0',
          500: '#8a4fa8',
          600: '#6e3785', // primary
          700: '#5d2f70',
          800: '#4c285b',
          900: '#3f2350',
        },
        ink: {
          950: '#171717',
          700: '#3f3f3f',
          600: '#5c5c5c',
          400: '#a3a3a3',
        },
        line: '#ebebeb',
        surface: '#f7f7f7',
        // semantic
        ok: '#1fc16b',
        warn: '#fa7319',
        danger: '#fb3748',
        info: '#6e3785',
        // gantt status
        st: {
          done: '#a3a3a3',
          track: '#22c55e',
          risk: '#eab308',
          blocked: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '11px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.05), 0 1px 3px rgba(16,24,40,0.06)',
        pop: '0 12px 32px rgba(23,23,23,0.12)',
      },
      fontSize: {
        '2xs': '11px',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        // Design system palette
        // slate-50  = Light Blue bg (#F7F9FF)
        // slate-500 = Gray muted text (#6B7280)
        // slate-600 = Accessible gray on light bg (#4B5563, 6.25:1 on #F7F9FF)
        // slate-900 = Black primary text (#111827)
        slate: {
          50: '#F7F9FF',
          500: '#6B7280',
          600: '#4B5563',
          800: '#111827',
          900: '#111827',
        },
        // Green (#166534) and Red (#991B1B) for status text
        emerald: {
          600: '#166534',
          700: '#166534',
        },
        red: {
          600: '#991B1B',
          700: '#991B1B',
        },
      },
    },
  },
  plugins: [],
}

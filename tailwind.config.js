/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: '#0a0f1e',
        surface: '#111827',
        border: '#1f2937',
        gold: '#f59e0b',
        'gold-hover': '#d97706',
        'text-primary': '#f9fafb',
        'text-muted': '#6b7280',
        success: '#10b981',
        error: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

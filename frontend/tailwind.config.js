/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        text: 'var(--text)',
        'text-dim': 'var(--text-dim)',
        'text-mute': 'var(--text-mute)',
        gold: 'var(--gold)',
        green: 'var(--green)',
        blue: 'var(--blue)',
        red: 'var(--red)',
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        cinzel: ['Cinzel', 'serif'],
        mono: ['"Press Start 2P"', 'monospace'],
      }
    },
  },
  plugins: [],
}

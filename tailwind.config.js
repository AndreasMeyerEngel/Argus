/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0d0f14',
        surface: '#13161d',
        surface2: '#1a1e28',
        border: 'rgba(255,255,255,0.07)',
        text: '#e8eaf0',
        muted: '#6b7280',
        accent: '#4f8ef7',
        green: '#34d399',
        red: '#f87171',
        amber: '#fbbf24',
        purple: '#a78bfa',
        cyan: '#22d3ee',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

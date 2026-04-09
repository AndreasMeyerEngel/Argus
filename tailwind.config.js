/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Theme-aware — driven by CSS variables in index.css
        bg:       'var(--color-bg)',
        surface:  'var(--color-surface)',
        surface2: 'var(--color-surface2)',
        text:     'var(--color-text)',
        muted:    'var(--color-muted)',
        // Fixed accent colors (same in both themes)
        accent: '#4f8ef7',
        green:  '#34d399',
        red:    '#f87171',
        amber:  '#fbbf24',
        purple: '#a78bfa',
        cyan:   '#22d3ee',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

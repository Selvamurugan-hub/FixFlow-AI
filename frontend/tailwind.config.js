const c = (name) => `rgb(var(--${name}) / <alpha-value>)`
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: c('bg'), surface: c('surface'), raised: c('raised'), ink: c('ink'), muted: c('muted'),
        line: c('line'), brand: c('brand'), 'brand-ink': c('brand-ink'), signal: c('signal'),
        fault: c('fault'), ok: c('ok'),
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Hanken Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: { lift: '0 1px 0 rgb(var(--line)), 0 8px 24px -12px rgb(var(--ink) / 0.18)' },
    },
  },
  plugins: [],
}

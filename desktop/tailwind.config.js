/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        'surface-elevated': 'var(--surface-elevated)',
        'surface-sunken': 'var(--surface-sunken)',
        border: 'var(--border)',
        'border-subtle': 'var(--border-subtle)',
        'nav-active': 'var(--nav-active)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-inverse': 'var(--text-inverse)',
        'text-link': 'var(--text-link)',
        ring: 'var(--ring)',
        yellow: {
          50: '#FEFCE8',
          100: '#FBF5A0',
          400: '#F5ED30',
          500: '#D4CC0A',
          foreground: 'var(--accent-yellow-fg)'
        },
        orange: {
          50: '#FFF4EC',
          100: '#FFD4B0',
          400: '#FE934E',
          500: '#E07535',
          foreground: 'var(--accent-orange-fg)'
        },
        status: {
          active: 'var(--status-active)',
          'active-bg': 'var(--status-active-bg)',
          idle: 'var(--status-idle)',
          'idle-bg': 'var(--status-idle-bg)',
          offline: 'var(--status-offline)',
          'offline-bg': 'var(--status-offline-bg)',
          error: 'var(--status-error)',
          'error-bg': 'var(--status-error-bg)'
        }
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '10px',
        xl: '14px'
      },
      boxShadow: {
        sm: '0 1px 2px rgba(28,26,23,0.06)',
        md: '0 4px 12px rgba(28,26,23,0.08)',
        lg: '0 8px 24px rgba(28,26,23,0.10)'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
}

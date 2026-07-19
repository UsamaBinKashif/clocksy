/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
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
        sans: ['var(--font-sans)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace']
      },
      fontSize: {
        xs: ['0.6875rem', { lineHeight: '1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.15rem' }],
        base: ['0.875rem', { lineHeight: '1.4rem' }],
        md: ['1rem', { lineHeight: '1.5rem' }]
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '10px',
        xl: '14px'
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
}

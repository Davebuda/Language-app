import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // shadcn/ui CSS variable tokens
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },

        // NorskCoach brand tokens — Ember dark theme
        // Primary: red #DC2626 | Base: warm charcoal #120E0E
        nc: {
          bg:              '#120E0E',
          card:            'rgba(255,255,255,0.06)',
          'card-soft':     'rgba(255,255,255,0.03)',
          'card-hover':    'rgba(255,255,255,0.10)',
          dark:            '#0A0707',
          'dark-2':        '#0D0A0A',

          // Primary brand — red (CTA, active states, progress)
          // --nc-violet* removed; --nc-red* is the single brand system
          red:             '#DC2626',
          'red-tint':      'rgba(220,38,38,0.14)',
          'red-border':    'rgba(220,38,38,0.28)',

          // Success state — brighter for dark bg
          green:           '#4ade80',
          'green-tint':    'rgba(74,222,128,0.12)',
          'green-border':  'rgba(74,222,128,0.25)',
          'green-fg':      '#052e16',

          // Practice phase accent
          coral:           'rgba(255,255,255,0.08)',
          'coral-tint':    'rgba(255,255,255,0.04)',
          'coral-border':  'rgba(255,255,255,0.10)',

          border:          'rgba(255,255,255,0.10)',
          'border-subtle': 'rgba(255,255,255,0.06)',
          'border-strong': 'rgba(255,255,255,0.16)',
          text:            '#EDE8E3',
          'text-muted':    'rgba(237,232,227,0.58)',
          'text-dim':      'rgba(237,232,227,0.36)',
        },
      },

      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans:    ['var(--font-body)', 'sans-serif'],
        mono:    ['ui-monospace', 'monospace'],
      },


      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },

      animation: {
        'fade-up':  'fade-up 0.5s ease-out forwards',
        'fade-in':  'fade-in 0.4s ease-out forwards',
        'scale-in': 'scale-in 0.3s ease-out forwards',
        blink:      'blink 1s step-end infinite',
      },

      borderRadius: {
        hero:    '0.75rem',
        card:    '0.75rem',
        feature: '0.75rem',
        chip:    '9999px',
        pill:    '9999px',
      },
    },
  },
  plugins: [],
}

export default config

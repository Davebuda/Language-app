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

        // NorskCoach brand tokens
        nc: {
          bg:              '#FDF6EE',
          card:            '#FFFFFF',
          'card-hover':    '#FFFCF7',
          dark:            '#181526',

          green:           '#C8FF00',
          'green-tint':    'rgba(200,255,0,0.07)',
          'green-border':  'rgba(200,255,0,0.22)',

          coral:           '#FF7A6A',
          'coral-tint':    'rgba(255,122,106,0.10)',
          'coral-border':  'rgba(255,122,106,0.24)',

          mint:            '#CFE3CB',
          'mint-tint':     'rgba(207,227,203,0.20)',
          'mint-border':   'rgba(207,227,203,0.40)',

          violet:          '#B7A7FF',
          'violet-tint':   'rgba(183,167,255,0.14)',
          'violet-border': 'rgba(183,167,255,0.28)',
          apricot:         '#FFC8A5',
          'apricot-tint':  'rgba(255,200,165,0.18)',
          'apricot-border':'rgba(255,200,165,0.36)',

          border:          'rgba(24,21,38,0.08)',
          'border-subtle': 'rgba(24,21,38,0.05)',
          text:            '#181526',
          'text-muted':    'rgba(24,21,38,0.62)',
          'text-dim':      'rgba(24,21,38,0.38)',

          'repair-bg':     'rgba(255,200,165,0.20)',
          'repair-border': 'rgba(255,200,165,0.38)',
        },
      },

      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
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
        hero:    '18px',
        card:    '14px',
        feature: '14px',
        chip:    '10px',
        pill:    '9999px',
        '2xl':   '0.95rem',
        '3xl':   '1.25rem',
        '4xl':   '1.5rem',
      },
    },
  },
  plugins: [],
}

export default config

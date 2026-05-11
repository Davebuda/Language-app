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
          bg:              '#F5F6FA',
          card:            '#FFFFFF',
          'card-hover':    '#F8F9FC',
          dark:            '#111118',

          // Electric lime — AI/coach moments only
          green:           '#C8FF00',
          'green-tint':    'rgba(200,255,0,0.07)',
          'green-border':  'rgba(200,255,0,0.20)',

          // Coral — repair / error accent
          coral:           '#F4845F',
          'coral-tint':    'rgba(244,132,95,0.08)',
          'coral-border':  'rgba(244,132,95,0.22)',

          // Mint — success / reading
          mint:            '#A8D5BA',
          'mint-tint':     'rgba(168,213,186,0.10)',
          'mint-border':   'rgba(168,213,186,0.25)',

          // Violet — conversation mode
          violet:          '#A78BFA',
          'violet-tint':   'rgba(167,139,250,0.08)',
          'violet-border': 'rgba(167,139,250,0.20)',

          // Neutral borders & text
          border:          'rgba(17,17,24,0.07)',
          'border-subtle': 'rgba(17,17,24,0.04)',
          text:            '#111118',
          'text-muted':    'rgba(17,17,24,0.45)',
          'text-dim':      'rgba(17,17,24,0.28)',

          // Repair state — coral-tinted
          'repair-bg':     'rgba(244,132,95,0.06)',
          'repair-border': 'rgba(244,132,95,0.18)',
        },
      },

      fontFamily: {
        display: ['"Outfit"', 'sans-serif'],
        sans:    ['"Outfit"', 'sans-serif'],
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
        hero:    '20px',
        card:    '16px',
        feature: '16px',
        chip:    '8px',
        pill:    '9999px',
        '2xl':   '1rem',
        '3xl':   '1.5rem',
        '4xl':   '2rem',
      },
    },
  },
  plugins: [],
}

export default config

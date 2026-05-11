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
          bg:             '#0c0d14',
          card:           '#14162a',
          'card-hover':   '#181b2e',

          // Electric lime — primary brand accent
          green:          '#c8ff00',
          'green-tint':   'var(--nc-green-tint)',
          'green-border': 'var(--nc-green-border)',
          'green-glow':   'var(--nc-green-glow)',

          // Coral — repair / error accent
          coral:          '#ff6b5b',
          'coral-tint':   'var(--nc-coral-tint)',
          'coral-border': 'var(--nc-coral-border)',

          // Mint — success / positive accent
          mint:           '#6dffd8',
          'mint-tint':    'var(--nc-mint-tint)',
          'mint-border':  'var(--nc-mint-border)',

          // Neutral
          border:         'var(--nc-border)',
          'border-subtle':'var(--nc-border-subtle)',
          'text-muted':   'var(--nc-text-muted)',
          'text-dim':     'var(--nc-text-dim)',

          // Repair state
          'repair-bg':    'var(--nc-repair-bg)',
          'repair-border':'var(--nc-repair-border)',
        },

        // Surface scale
        surface: {
          DEFAULT:  '#111320',
          elevated: '#161828',
          border:   '#1e2038',
          muted:    '#0c0d14',
        },
        base: '#080910',
      },

      fontFamily: {
        display: ['"Outfit"', 'sans-serif'],
        sans:    ['"Outfit"', 'sans-serif'],
      },

      backgroundImage: {
        // Lime glow replaces the old blue glow
        'brand-glow':    'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(200,255,0,0.10) 0%, transparent 70%)',
        'brand-glow-sm': 'radial-gradient(ellipse 40% 30% at 50% 0%, rgba(200,255,0,0.07) 0%, transparent 60%)',
        'lime-spot':     'radial-gradient(ellipse 50% 35% at 50% 100%, rgba(200,255,0,0.12) 0%, transparent 70%)',
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
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}

export default config

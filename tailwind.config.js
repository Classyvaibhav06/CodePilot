/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'paper-white': 'var(--color-paper-white)',
        'card-white': 'var(--color-card-white)',
        'deep-ink': 'var(--color-deep-ink)',
        carbon: 'var(--color-carbon)',
        slate: 'var(--color-slate)',
        mist: 'var(--color-mist)',
        fog: 'var(--color-fog)',
        graphite: 'var(--color-graphite)',
        'deep-indigo': 'var(--color-deep-indigo)',
        'ember-orange': 'var(--color-ember-orange)',
        'midnight-teal': 'var(--color-midnight-teal)',
        'forest-teal': 'var(--color-forest-teal)',
        'sky-blue': 'var(--color-sky-blue)',
        'pale-cyan': 'var(--color-pale-cyan)',
        mint: 'var(--color-mint)',
        lavender: 'var(--color-lavender)',
      },
      fontFamily: {
        suisse: ['SuisseIntl', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sfmono: ['SFMono', 'JetBrains Mono', 'ui-monospace', 'monospace'],
        suissemono: ['SuisseIntlMono', 'JetBrains Mono', 'ui-monospace', 'monospace'],
        inter: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'subtle': 'rgba(17, 26, 74, 0.1) 0px 1px 3px 0px, rgba(17, 26, 74, 0.05) 0px 1px 0px 0px, inset rgba(255, 255, 255, 0.5) 0px 1px 0px 0px, inset rgba(255, 255, 255, 0.5) 0px 1px 4px 0px',
        'subtle-2': 'rgba(87, 90, 100, 0.12) 0px 0px 0px 1px',
        'subtle-3': 'rgba(0, 0, 0, 0.05) 0px 0px 0px 1px inset',
        'xl': 'rgba(0, 0, 0, 0.02) 0px 40px 32px 0px, rgba(0, 0, 0, 0.03) 0px 22px 18px 0px, rgba(0, 0, 0, 0.03) 0px 12px 10px 0px, rgba(0, 0, 0, 0.04) 0px 7px 5px 0px, rgba(0, 0, 0, 0.07) 0px 3px 2px 0px',
        'sm': 'rgba(0, 0, 0, 0.05) 0px 4px 8px 0px, rgba(0, 0, 0, 0.1) 0px 2px 4px 0px, rgba(0, 0, 0, 0.1) 0px 1px 1px 0px',
      },
      borderRadius: {
        'nav': '8px',
        'cards': '8px',
        'links': '8px',
        'badges': '9999px',
        'inputs': '8px',
        'buttons': '8px',
      },
    },
  },
  plugins: [],
}

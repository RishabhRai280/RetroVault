export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'retro-dark': 'var(--retro-dark)',
        'retro-darker': 'var(--retro-darker)',
        'retro-card': 'var(--retro-card)',
        'retro-neon': 'var(--retro-neon)',
        'retro-neon-dim': 'var(--retro-neon-dim)',
      }
    },
  },
  plugins: [],
}

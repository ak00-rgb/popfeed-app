import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  plugins: [animate],

  theme: {
    extend: {
      colors: {
        'brand-bg': '#0F0C1D',
        'brand-card': '#1F1A2E',
        'accent-orange': '#FF7A58',
      },
    },
  },

  
}

export default config


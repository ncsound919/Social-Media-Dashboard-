/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './ui/**/*.{js,ts,jsx,tsx,mdx}',
    './core/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors from specification
        background: '#050712',
        surface: '#0B1020',
        accent: {
          cyan: '#00F5D4',
          pink: '#FF6F91',
          purple: '#5B5FFF',
        },
        card: {
          background: 'rgba(14, 20, 40, 0.96)',
          border: 'rgba(255, 255, 255, 0.04)',
        },
      },
      borderRadius: {
        'card': '16px',
      },
      backdropBlur: {
        'card': '24px',
      },
    },
  },
  plugins: [],
};

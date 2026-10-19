/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9dffe',
          300: '#7cc3fd',
          400: '#38bdf8',
          500: '#0077fe',
          600: '#0062d6',
          700: '#004eae',
          800: '#04428e',
          900: '#0a3875',
          950: '#07234b',
        },
        accent: {
          purple: '#7c3aed',
          cyan: '#00b4d8',
          indigo: '#4f46e5',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #00b4d8 0%, #2563eb 50%, #7c3aed 100%)',
        'brand-gradient-hover': 'linear-gradient(135deg, #00c4ea 0%, #3b82f6 50%, #8b5cf6 100%)',
        'brand-gradient-subtle': 'linear-gradient(135deg, rgba(0, 180, 216, 0.08) 0%, rgba(37, 99, 235, 0.08) 50%, rgba(124, 58, 237, 0.08) 100%)',
      },
      boxShadow: {
        'glow-sm': '0 0 15px -3px rgba(0, 119, 254, 0.25)',
        'glow-md': '0 0 25px -4px rgba(124, 58, 237, 0.25)',
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card': '0 0 0 1px rgba(0, 0, 0, 0.04), 0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 12px 24px -6px rgba(0, 0, 0, 0.03)',
      },
    },
  },
  plugins: [],
};

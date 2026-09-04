/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sandal: {
          50: '#FDFCF9',
          100: '#FAF7F0', // Primary Sandal White background
          200: '#F4EFE4', // Sandal light card / border
          300: '#EAE2D2', // Sandal divider / muted
          400: '#DECFA4', // Sandal accent
          500: '#C7B183', // Sandal warm tone
          600: '#A38B57',
          700: '#7F6B3E',
          800: '#5C4C2B',
          900: '#3D321A',
        },
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
          800: '#14532d',
          900: '#052e16',
        },
        navy: {
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

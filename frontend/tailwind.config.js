/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        theme: {
          bg: '#0B0D12',
          panel: '#131720',
          panelHeader: '#181D28',
          card: '#161B26',
          hover: '#1C2230',
          active: '#242C3E',
          border: '#282E3A',
          borderLight: '#384254',
          accent: '#FF8A00',
          accentHover: '#FFA12E',
          accentGlow: 'rgba(255, 138, 0, 0.25)',
          cyan: '#00E5FF',
          green: '#10B981',
          red: '#EF4444',
          amber: '#F59E0B'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace']
      }
    },
  },
  plugins: [],
};

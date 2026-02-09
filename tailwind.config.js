/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta customizada Chicago Parks Analysis
        'chi-map': '#1e1e1e',        // Background do mapa (discreto, contexto espacial)
        'chi-sidebar': '#252525',     // Sidebar dominante (ligeiramente mais clara que o mapa)
        'chi-accent': '#DCA498',      // Navegação, contexto urbano (terracota)
        'chi-action': '#0097D1',      // Botões de ação, confirmações (azul Chicago)
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

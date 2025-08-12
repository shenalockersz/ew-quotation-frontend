/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      backgroundImage: {
        bg:"url('/src/assets/bg.jpg')",
        slt:"url('/src/assets/lightbg.jpg')",
        bd:"url('/src/assets/bd.jpg')",
        bdd:"url('/src/assets/bdd.jpg')",
        bddd:"url('/src/assets/bddd.jpg')",
        bdddd:"url('/src/assets/bdddd.jpg')",
        bddddd:"url('/src/assets/bddddd.jpg')",
        gray:"url('/src/assets/grayv.jpg')",
        dark:"url('/src/assets/dark.jpg')",
        logo:"url('/src/assets/LogoNew.png')"




      },
    },
  },
  plugins: [],
};

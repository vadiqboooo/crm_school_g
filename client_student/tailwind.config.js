/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fdf6ee",
          100: "#f9e8d0",
          200: "#f2cfa0",
          300: "#e8ae6a",
          400: "#dc8c3a",
          500: "#c4721f",
          600: "#a05c18",
          700: "#7b3f0f",   // main brown
          800: "#5e2f0b",
          900: "#3d1e07",
        },
        cream: "#F5F0E8",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

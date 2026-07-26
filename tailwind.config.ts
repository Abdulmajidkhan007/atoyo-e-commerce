import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // BREND RANGLARI (logotipdan olingan): chuqur "petrol" ko'k fon,
        // qumli-oltin urg'u va oq. `aqua` nomi eski klasslar buzilmasligi
        // uchun saqlangan, lekin qiymatlari brend oltin rangi.
        navy: {
          DEFAULT: "#072D40",
          50: "#EDF4F8",
          100: "#C9DCE6",
          300: "#5E8CA6",
          500: "#175071",
          700: "#0B3B54",
          900: "#072D40",
          950: "#04202F",
        },
        aqua: {
          DEFAULT: "#C49A6C",
          50: "#FAF4EC",
          100: "#F0E1CC",
          300: "#DCC09A",
          500: "#C49A6C",
          600: "#8A6640",
          700: "#6B4E31",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;

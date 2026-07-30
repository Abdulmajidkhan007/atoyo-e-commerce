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
        // MUHIM: Tailwind faqat shu ro'yxatdagi shade'lar uchun klass
        // yasaydi. Ro'yxatda yo'q shade (masalan `dark:bg-navy-800`) jimgina
        // e'tiborsiz qoladi va element oq fonda qolib ketadi - shuning uchun
        // oraliq shade'lar ham to'liq berilgan.
        navy: {
          DEFAULT: "#072D40",
          50: "#EDF4F8",
          100: "#C9DCE6",
          200: "#A8C6D6",
          300: "#5E8CA6",
          400: "#33698A",
          500: "#175071",
          600: "#104462",
          700: "#0B3B54",
          800: "#093349",
          900: "#072D40",
          950: "#04202F",
        },
        aqua: {
          DEFAULT: "#C49A6C",
          50: "#FAF4EC",
          100: "#F0E1CC",
          200: "#E6D0B3",
          300: "#DCC09A",
          400: "#D0AC81",
          500: "#C49A6C",
          600: "#8A6640",
          700: "#6B4E31",
          800: "#523B25",
          900: "#3A2A1B",
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

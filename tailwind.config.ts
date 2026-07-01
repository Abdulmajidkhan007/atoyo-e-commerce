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
        navy: {
          DEFAULT: "#0B1E33",
          50: "#EAF0F6",
          100: "#CBDBE9",
          300: "#6C93B4",
          500: "#1F3A5F",
          700: "#122844",
          900: "#0B1E33",
          950: "#060F1A",
        },
        aqua: {
          DEFAULT: "#00D2C4",
          50: "#E6FBF9",
          100: "#B3F3EE",
          300: "#4DE3D8",
          500: "#00D2C4",
          600: "#00A89D",
          700: "#007E76",
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

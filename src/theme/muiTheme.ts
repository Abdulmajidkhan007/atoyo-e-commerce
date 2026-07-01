import { createTheme, type PaletteMode } from "@mui/material/styles";

export const getMuiTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: "#00D2C4", // Aqua/Teal - asosiy urg'u
        contrastText: "#0B1E33",
      },
      secondary: {
        main: "#0B1E33", // Deep Navy
      },
      background: {
        default: mode === "dark" ? "#0B1E33" : "#FFFFFF",
        paper: mode === "dark" ? "#122844" : "#F4F7FA",
      },
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: "var(--font-inter), sans-serif",
    },
  });

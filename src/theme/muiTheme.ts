import { createTheme, type PaletteMode } from "@mui/material/styles";

export const getMuiTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: "#C49A6C", // Brend oltini (logotipdagi to'lqinlar)
        contrastText: "#072D40",
      },
      secondary: {
        main: "#072D40", // Brend ko'ki (logotip foni)
      },
      background: {
        default: mode === "dark" ? "#072D40" : "#FFFFFF",
        paper: mode === "dark" ? "#0B3B54" : "#F3F7FA",
      },
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: "var(--font-inter), sans-serif",
    },
  });

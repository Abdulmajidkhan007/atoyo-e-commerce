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
    components: {
      /**
       * SUZUVCHI MUI PANELLARI — shisha ko'rinish (`docs/UI-SHISHA.md`).
       * Bitta umumiy tema ishlatilgani uchun bu admin panelga ham
       * qo'llanadi (ataylab - vazifada shunday so'ralgan).
       *
       * `.glass-strong` klass orqali (styleOverrides EMAS): shunda
       * `globals.css` dagi zaxira yo'llar (@supports, kontrast, sekin
       * qurilma) avtomatik ishlaydi. Menu o'z Popover'ini ICHKI
       * chizadi va paper slotini har doim aniq (bo'lsa ham bo'sh)
       * obyekt bilan uzatadi, shuning uchun `MuiPopover` standartlari
       * yolg'iz Menu'ga yetib bormaydi - ikkalasi ham kerak.
       */
      MuiDialog: {
        defaultProps: { slotProps: { paper: { className: "glass-strong" } } },
      },
      MuiMenu: {
        defaultProps: { slotProps: { paper: { className: "glass-strong" } } },
      },
      MuiPopover: {
        defaultProps: { slotProps: { paper: { className: "glass-strong" } } },
      },
      /* Toast (Snackbar'ning standart xabar qutisi). Xatolik/muvaffaqiyat
         rangli `Alert`lar (admin formalari) ATAYLAB tegilmagan - ularning
         qattiq rangi shoshilinch xabarni ajratib turishi kerak. */
      MuiSnackbarContent: {
        defaultProps: { className: "glass-strong" },
        styleOverrides: {
          root: { color: "var(--color-fg)" },
        },
      },
    },
  });

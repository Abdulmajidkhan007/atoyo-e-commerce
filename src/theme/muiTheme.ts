import { createTheme } from "@mui/material/styles";

const brand = {
  primary: {
    main: "#C49A6C", // Brend oltini (logotipdagi to'lqinlar)
    contrastText: "#072D40",
  },
  secondary: {
    main: "#072D40", // Brend ko'ki (logotip foni)
  },
};

/**
 * BITTA tema, ikkala palitra CSS O'ZGARUVCHILARIDA.
 *
 * Palitra JS holatiga (redux `ui.themeMode`) emas, `<html>` dagi
 * `.dark` klassiga bog'langan (`colorSchemeSelector: "class"`): MUI
 * `:root` ga yorug', `.dark` ga tungi qiymatlarni yozadi, komponentlar
 * esa `var(--mui-palette-...)` ni o'qiydi. `.dark` ni sahifa
 * bo'yalishidan OLDIN `THEME_INIT_SCRIPT` (`app/layout.tsx`) qo'yadi —
 * shuning uchun SOVUQ ochilishda ham MUI birinchi kadrdanoq to'g'ri
 * palitrada. Server va client bir xil HTML chizadi (klass nomlari
 * rejimga bog'liq emas). Sabab: `docs/ARXITEKTURA-TARIXI.md` 40-band.
 */
export const muiTheme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  colorSchemes: {
    light: {
      palette: {
        ...brand,
        background: { default: "#FFFFFF", paper: "#F3F7FA" },
      },
    },
    dark: {
      palette: {
        ...brand,
        background: { default: "#072D40", paper: "#0B3B54" },
      },
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
    /**
     * MATNLI VA RAMKALI TUGMALARNING RANGI (yorug' temada).
     *
     * MUI bu ikki ko'rinishda matnni `palette.primary.main` dan
     * oladi — bizda u brend oltini `#C49A6C`. Oq fonda u atigi
     * **2.57:1** beradi, WCAG AA esa 4.5:1 talab qiladi: "Google",
     * "Telegram", "Qo'llash", "Tozalash" kabi tugmalar yozuvi
     * amalda o'qilmasdi.
     *
     * TO'LDIRILGAN (contained) tugmaga TEGILMAYDI — u yerda oltin
     * FON, ustidagi to'q ko'k matn 5.61:1 beradi va brend ko'rinishi
     * aynan shu tugmalarda saqlanadi. Shuning uchun bu yerda faqat
     * MATN rangi bir pog'ona to'qlashadi (`aqua-600`, 5.18:1) —
     * ohang o'sha oltin oilasida qoladi.
     *
     * TUNGI temada (`.dark`, `applyStyles("dark")`) MUI standart rangi
     * qaytariladi: to'q fonda `#C49A6C` allaqachon 5.61:1 (navy-900) va
     * 4.63:1 (navy-700) beradi. Yorug' qiymat ASOSIY qilib yozilgan —
     * `.light` klassini MUI faqat hydration'dan keyin qo'yadi, `.dark`
     * esa bo'yashdan oldin turadi.
     */
    MuiButton: {
      styleOverrides: {
        textPrimary: ({ theme }) => ({
          color: "#8A6640",
          ...theme.applyStyles("dark", { color: (theme.vars ?? theme).palette.primary.main }),
        }),
        outlinedPrimary: ({ theme }) => ({
          color: "#8A6640",
          // Ramka ham shu rangda: 50% shaffoflikda u oq fonda
          // 3:1 (matn bo'lmagan element talabi) dan past edi.
          borderColor: "#8A6640",
          ...theme.applyStyles("dark", {
            color: (theme.vars ?? theme).palette.primary.main,
            borderColor: `rgba(${theme.vars?.palette.primary.mainChannel} / 0.5)`,
          }),
        }),
      },
    },
  },
});

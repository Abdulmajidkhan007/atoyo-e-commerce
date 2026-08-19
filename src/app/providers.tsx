"use client";

import { useEffect, useMemo } from "react";
import { Provider } from "react-redux";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { store } from "@/redux/store";
import { useAppSelector } from "@/redux/hooks";
import { getMuiTheme } from "@/theme/muiTheme";
import { useAuthListener } from "@/hooks/useAuthListener";
import { UiModeProvider, useUiMode } from "@/lib/ui-mode/UiModeContext";

function MuiThemeBridge({ children }: { children: React.ReactNode }) {
  const themeMode = useAppSelector((s) => s.ui.themeMode);
  const { isModern } = useUiMode();
  /**
   * 3D REJIM HAR DOIM TO'Q ko'rinishda.
   *
   * Sabab: 3D dunyo sahifa ORTIDA turadi va uni ko'rish uchun sahifa
   * foni shaffof bo'ladi. Yorug' (light) tema bilan bu chalkash
   * ko'rinardi - to'q matn to'q sahna ustida o'qilmasdi. Klassik
   * rejimda esa foydalanuvchining tema tanlovi avvalgidek ishlaydi.
   */
  const effectiveMode = isModern ? "dark" : themeMode;
  const theme = useMemo(() => getMuiTheme(effectiveMode), [effectiveMode]);
  useAuthListener();

  // Root layout'dagi blocking script <html> ga .dark klassni erta qo'yadi
  // (flash bo'lmasligi uchun); bu yerda esa tema har o'zgarganda o'sha
  // klass sinxron ushlab turiladi (masalan, foydalanuvchi light'ga qaytsa).
  useEffect(() => {
    function syncHtmlClass() {
      document.documentElement.classList.toggle("dark", effectiveMode === "dark");
    }
    syncHtmlClass();
  }, [effectiveMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className={effectiveMode === "dark" ? "dark" : ""}>{children}</div>
    </ThemeProvider>
  );
}

/**
 * MUHIM: Bu yerda ataylab PersistGate YO'Q. PersistGate server renderda
 * (va client'dagi birinchi renderda) butun UI o'rniga `null` chizardi -
 * natijada HTML bo'sh chiqib, SEO va birinchi ochilish yomonlashardi.
 * redux-persist'ning REHYDRATE'i (store.ts'dagi persistStore) mount'dan
 * keyin baribir ishlaydi: savat va tema localStorage'dan bir lahzada
 * tiklanadi. Server va client'ning birinchi renderi bir xil boshlang'ich
 * holatda bo'lgani uchun hydration mismatch bo'lmaydi.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      {/*
        KO'RINISH REJIMI (klassik / 3D) redux'da EMAS, alohida
        kontekstda: u redux-persist bilan bog'liq emas va sahifa
        bo'yalishidan oldin ishlaydigan skript bilan juftlashadi
        (`lib/ui-mode/config.ts`).
      */}
      <UiModeProvider>
        <MuiThemeBridge>{children}</MuiThemeBridge>
      </UiModeProvider>
    </Provider>
  );
}

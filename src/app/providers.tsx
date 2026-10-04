"use client";

import { useEffect, type ComponentProps } from "react";
import { Provider } from "react-redux";
import { CssBaseline } from "@mui/material";
import { ThemeProvider, useColorScheme } from "@mui/material/styles";
import { store, type RootState } from "@/redux/store";
import { useAppSelector } from "@/redux/hooks";
import { muiTheme } from "@/theme/muiTheme";
import { useAuthListener } from "@/hooks/useAuthListener";
import { UiModeProvider, useUiMode } from "@/lib/ui-mode/UiModeContext";

type PersistedState = RootState & { _persist?: { rehydrated?: boolean } };
type StorageManager = NonNullable<ComponentProps<typeof ThemeProvider>["storageManager"]>;

const MODE_STORAGE_KEY = "atoyo-mui-mode";

/**
 * MUI rejimining BOSHLANG'ICH qiymati `<html>` dagi `.dark` klassidan
 * olinadi (uni bo'yashdan oldin `THEME_INIT_SCRIPT` qo'yadi) — redux
 * bilan BITTA manba. MUI o'zining `mui-mode` localStorage kalitini
 * yuritmaydi (`set` bo'sh): tanlov redux-persist'da saqlanadi.
 * Rang/sxema kalitlari uchun standart qiymat qaytariladi.
 */
const htmlClassStorage: StorageManager = ({ key }) => ({
  get(defaultValue) {
    if (key !== MODE_STORAGE_KEY || typeof document === "undefined") return defaultValue;
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  },
  set() {},
  subscribe() {
    return () => {};
  },
});

/**
 * Redux'dagi tanlovni MUI'ga (va u orqali `<html>` klassiga) uzatadi.
 * REHYDRATE'dan OLDIN tegilmaydi: aks holda boshlang'ich `light`
 * init skript qo'ygan `.dark` ni bir lahzaga olib tashlardi.
 */
function ColorSchemeSync() {
  const themeMode = useAppSelector((s) => s.ui.themeMode);
  const rehydrated = useAppSelector(
    (s) => (s as PersistedState)._persist?.rehydrated === true
  );
  const { isModern } = useUiMode();
  const { setMode } = useColorScheme();
  /**
   * 3D REJIM HAR DOIM TO'Q ko'rinishda.
   *
   * Sabab: 3D dunyo sahifa ORTIDA turadi va uni ko'rish uchun sahifa
   * foni shaffof bo'ladi. Yorug' (light) tema bilan bu chalkash
   * ko'rinardi - to'q matn to'q sahna ustida o'qilmasdi. Klassik
   * rejimda esa foydalanuvchining tema tanlovi avvalgidek ishlaydi.
   */
  const effectiveMode = isModern ? "dark" : themeMode;

  useEffect(() => {
    if (rehydrated) setMode(effectiveMode);
  }, [rehydrated, effectiveMode, setMode]);

  return null;
}

/**
 * MUI TEMASI REDUX HOLATIGA BOG'LANMAGAN (`docs/ARXITEKTURA-TARIXI.md`
 * 40-band). Ilgari tema `getMuiTheme(themeMode)` edi: SOVUQ ochilishda
 * REHYDRATE hydration'dan OLDIN yetib kelib, client to'q, server esa
 * yorug' emotion klasslarini chizardi; React production'da klass
 * farqini TUZATMAYDI — tungi rejimda forma yorliqlari 1.3:1 kontrast
 * bilan qolardi. Endi bitta CSS-o'zgaruvchili tema, palitrani `.dark`
 * klassi tanlaydi, `<html>` klassini esa MUI o'zi yuritadi.
 */
function MuiThemeBridge({ children }: { children: React.ReactNode }) {
  useAuthListener();

  return (
    <ThemeProvider
      theme={muiTheme}
      storageManager={htmlClassStorage}
      modeStorageKey={MODE_STORAGE_KEY}
    >
      <CssBaseline />
      <ColorSchemeSync />
      <div>{children}</div>
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

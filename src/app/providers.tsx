"use client";

import { useMemo } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { store, persistor } from "@/redux/store";
import { useAppSelector } from "@/redux/hooks";
import { getMuiTheme } from "@/theme/muiTheme";
import { useAuthListener } from "@/hooks/useAuthListener";
import { I18nProvider } from "@/i18n/I18nProvider";
import type { Locale } from "@/i18n/config";

function MuiThemeBridge({ children }: { children: React.ReactNode }) {
  const themeMode = useAppSelector((s) => s.ui.themeMode);
  const theme = useMemo(() => getMuiTheme(themeMode), [themeMode]);
  useAuthListener();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className={themeMode === "dark" ? "dark" : ""}>{children}</div>
    </ThemeProvider>
  );
}

export function Providers({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <I18nProvider locale={locale}>
          <MuiThemeBridge>{children}</MuiThemeBridge>
        </I18nProvider>
      </PersistGate>
    </Provider>
  );
}

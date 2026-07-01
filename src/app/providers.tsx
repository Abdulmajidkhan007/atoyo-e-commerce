"use client";

import { useMemo } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { store, persistor } from "@/redux/store";
import { useAppSelector } from "@/redux/hooks";
import { getMuiTheme } from "@/theme/muiTheme";
import { useAuthListener } from "@/hooks/useAuthListener";

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

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <MuiThemeBridge>{children}</MuiThemeBridge>
      </PersistGate>
    </Provider>
  );
}

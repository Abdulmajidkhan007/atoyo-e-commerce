import React from 'react';
import {StatusBar} from 'react-native';
import {NavigationContainer, DarkTheme, DefaultTheme} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {persistor, store} from './store';
import {AuthProvider} from './auth';
import {RootNavigator} from './navigation/RootNavigator';
import {ThemeProvider, useTheme} from './theme';
import {LocaleProvider} from './i18n';
import {ToastProvider} from './components/Toast';
import {UpdateBanner} from './components/UpdateBanner';

/**
 * Navigatsiya temasi ilova temasidan olinadi - shunda ekran orqasi,
 * o'tish animatsiyalari va status bar dark/light rejimga mos bo'ladi.
 */
function ThemedApp() {
  const {palette, isDark} = useTheme();

  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.accent,
      background: palette.bg,
      card: palette.chrome,
      text: palette.text,
      border: palette.border,
    },
  };

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={palette.chrome}
      />
      <NavigationContainer theme={navTheme}>
        <RootNavigator />
        {/* Yangi versiya chiqqan bo'lsa - tepada eslatma. */}
        <UpdateBanner />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthProvider>
          <ThemeProvider>
            <LocaleProvider>
              <SafeAreaProvider>
                <ToastProvider>
                  <ThemedApp />
                </ToastProvider>
              </SafeAreaProvider>
            </LocaleProvider>
          </ThemeProvider>
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}

import React from 'react';
import {StatusBar} from 'react-native';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
  type LinkingOptions,
} from '@react-navigation/native';
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
import {usePushNotifications} from './push';
import {useWidgetSync} from './widgets';
import type {RootStackParamList} from './navigation/types';

/**
 * Bosh ekran widgetlari bosilganda shu yo'llar orqali ochiladi
 * (`MainActivity` `atoyo://` sxemasini qabul qiladi). Widget qanday
 * ma'lumot yozishi haqida - `widgets.ts`.
 */
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['atoyo://'],
  config: {
    screens: {
      Buyurtmalarim: 'buyurtmalar',
      Savat: 'savat',
      AdminBuyurtmalar: 'xodim-buyurtmalar',
      Tabs: {
        screens: {
          Katalog: 'katalog',
        },
      },
    },
  },
};

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
      <NavigationContainer theme={navTheme} linking={linking}>
        {/* Push bildirishnomalar navigatsiya ichida - xabar bosilganda
            kerakli ekranni ocha olishi uchun. */}
        <PushGate />
        <WidgetGate />
        <RootNavigator />
        {/* Yangi versiya chiqqan bo'lsa - tepada eslatma. */}
        <UpdateBanner />
      </NavigationContainer>
    </>
  );
}

/** Push bildirishnomalarni yoqadi (o'zi hech narsa chizmaydi). */
function PushGate() {
  usePushNotifications();
  return null;
}

/** Bosh ekran widgetlarini yangilab turadi (o'zi hech narsa chizmaydi). */
function WidgetGate() {
  useWidgetSync();
  return null;
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

import React from 'react';
import {StatusBar} from 'react-native';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {persistor, store} from './store';
import {AuthProvider} from './auth';
import {RootNavigator} from './navigation/RootNavigator';
import {colors} from './theme';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.gold,
    background: colors.bg,
    card: colors.navy,
    text: colors.navy,
    border: colors.border,
  },
};

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthProvider>
          <SafeAreaProvider>
            <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
            <NavigationContainer theme={navTheme}>
              <RootNavigator />
            </NavigationContainer>
          </SafeAreaProvider>
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}

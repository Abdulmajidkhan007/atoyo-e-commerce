import React from 'react';
import {Platform, StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import {useTheme} from '../theme';

/**
 * SHISHA YUZASI (docs/UI-SHISHA.md 6-bo'lim).
 *
 * RN'da `backdrop-filter` yo'q. Haqiqiy xiralik FAQAT header, pastki
 * navigatsiya va modalda (`BlurView`); qolgan joyda yarim shaffof rang
 * + chegara (`palette.glass`).
 *
 * ANDROID'DA BLUR YO'Q: `BlurView` u yerda ekranni O'ZI USTIDAGI
 * logo va ikonkalar bilan birga xiralashtiradi - 1.5 da header va
 * pastki menyuda ikonkalar atrofida oq "dog'" (xiralik) chiqdi
 * (ARXITEKTURA-TARIXI 46). Android'da to'liq `palette.chrome` fon.
 */
const CAN_BLUR = Platform.OS === 'ios';

/** Absolyut joylashgan fon: ota-ona `overflow` ni o'zi boshqaradi. */
export function GlassBackground({style}: {style?: StyleProp<ViewStyle>}) {
  const {palette, isDark} = useTheme();
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, {backgroundColor: CAN_BLUR ? palette.glassChrome : palette.chrome}, style]}>
      {CAN_BLUR && (
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType={isDark ? 'dark' : 'light'}
          blurAmount={16}
          reducedTransparencyFallbackColor={palette.chrome}
        />
      )}
    </View>
  );
}

/** Kontent tagida shisha fon turadigan panel (modal varag'i uchun). */
export function GlassPanel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{overflow: 'hidden'}, style]}>
      <GlassBackground />
      {children}
    </View>
  );
}

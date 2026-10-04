import React from 'react';
import {Platform, StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import {useTheme} from '../theme';

/**
 * SHISHA YUZASI (docs/UI-SHISHA.md 6-bo'lim).
 *
 * RN'da `backdrop-filter` yo'q. Haqiqiy xiralik FAQAT header, pastki
 * navigatsiya va modalda (`BlurView`); qolgan joyda yarim shaffof rang
 * + chegara (`palette.glass`). Android < 31 da `BlurView` sekin/xira
 * bo'lgani uchun u ham shaffof rangga qaytadi - `palette.glassChrome`
 * (0.9) esa blur'siz ham matn o'qiladigan darajada qoplaydi (WCAG AA).
 */
const CAN_BLUR = Platform.OS === 'ios' || Number(Platform.Version) >= 31;

/** Absolyut joylashgan fon: ota-ona `overflow` ni o'zi boshqaradi. */
export function GlassBackground({style}: {style?: StyleProp<ViewStyle>}) {
  const {palette, isDark} = useTheme();
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, {backgroundColor: palette.glassChrome}, style]}>
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

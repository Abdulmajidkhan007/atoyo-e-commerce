import React from 'react';
import {Image, Pressable, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {makeStyles, radius, spacing, useTheme} from '../theme';
import {useI18n, type Locale} from '../i18n';
import {useAppSelector} from '../store';
import type {RootStackParamList} from '../navigation/types';

/**
 * SAYT HEADER'ining ilova varianti: logotip + brend nomi, o'ng tomonda
 * til va tema tugmalari, sevimlilar va savat (belgi bilan).
 * Sayt (`components/layout/Header.tsx`) bilan bir xil tartib va ranglar.
 */

const LOCALE_ORDER: Locale[] = ['uz', 'en', 'ru'];

export function BrandHeader({title, back}: {title?: string; back?: boolean}) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const {isDark, mode, setMode} = useTheme();
  const {t, locale, setLocale} = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const cartCount = useAppSelector(s => s.cart.items.reduce((sum, i) => sum + i.quantity, 0));
  const favCount = useAppSelector(s => s.favorites.ids.length);

  // Tema tugmasi saytdagi ThemeToggle kabi ishlaydi: "system" holatida
  // birinchi bosishda joriy ko'rinishning teskarisiga o'tadi.
  const toggleTheme = () => setMode(isDark ? 'light' : 'dark');
  const cycleLocale = () =>
    setLocale(LOCALE_ORDER[(LOCALE_ORDER.indexOf(locale) + 1) % LOCALE_ORDER.length]!);

  return (
    <View style={[styles.wrap, {paddingTop: insets.top + spacing.xs}]}>
      {back && (
        <Pressable hitSlop={8} onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Text style={styles.icon}>‹</Text>
        </Pressable>
      )}

      <Pressable
        style={styles.brand}
        onPress={() => navigation.navigate('Tabs', {screen: 'Home'})}>
        <Image source={require('../../assets/logo.jpg')} style={styles.logo} alt="" />
        <Text numberOfLines={1} style={styles.brandText}>
          {title ?? t.appNameShort}
        </Text>
      </Pressable>

      <View style={styles.actions}>
        <Pressable hitSlop={6} onPress={cycleLocale} style={styles.iconBtn}>
          <Text style={styles.localeText}>{locale.toUpperCase()}</Text>
        </Pressable>

        <Pressable hitSlop={6} onPress={toggleTheme} style={styles.iconBtn}>
          <Text style={styles.icon}>{isDark ? '☀' : '☾'}</Text>
          {mode === 'system' && <View style={styles.systemDot} />}
        </Pressable>

        <HeaderBadgeButton
          glyph="♡"
          count={favCount}
          onPress={() => navigation.navigate('Tabs', {screen: 'Sevimlilar'})}
        />
        <HeaderBadgeButton
          glyph="▤"
          count={cartCount}
          onPress={() => navigation.navigate('Tabs', {screen: 'Savat'})}
        />
      </View>
    </View>
  );
}

function HeaderBadgeButton({
  glyph,
  count,
  onPress,
}: {
  glyph: string;
  count: number;
  onPress: () => void;
}) {
  const styles = useStyles();

  return (
    <Pressable hitSlop={6} onPress={onPress} style={styles.iconBtn}>
      <Text style={styles.icon}>{glyph}</Text>
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles(c => ({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: c.chrome,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  brand: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0},
  logo: {width: 32, height: 32, borderRadius: radius.sm},
  brandText: {color: c.text, fontSize: 17, fontWeight: '800', flexShrink: 1},
  actions: {flexDirection: 'row', alignItems: 'center', gap: 2},
  iconBtn: {width: 34, height: 34, alignItems: 'center', justifyContent: 'center'},
  icon: {color: c.text, fontSize: 19},
  localeText: {color: c.muted, fontSize: 12, fontWeight: '700'},
  systemDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.accent,
  },
  badge: {
    position: 'absolute',
    right: 0,
    top: 1,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {fontSize: 10, fontWeight: '700', color: c.onAccent},
}));

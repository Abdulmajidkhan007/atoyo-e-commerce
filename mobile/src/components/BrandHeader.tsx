import React, {useState} from 'react';
import {Image, Modal, Pressable, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {makeStyles, radius, spacing, useTheme, type ThemeMode} from '../theme';
import {useI18n, type Locale} from '../i18n';
import {useAppSelector} from '../store';

/**
 * SAYT HEADER'ining ilova varianti: logotip + brend nomi, o'ng tomonda
 * til va tema tugmalari, sevimlilar va savat (belgi bilan).
 * Sayt (`components/layout/Header.tsx`) bilan bir xil tartib va ranglar.
 */

const LOCALE_LABELS: Record<Locale, string> = {
  uz: "O'zbekcha",
  en: 'English',
  ru: 'Русский',
};

const THEME_LABELS: Record<ThemeMode, string> = {
  light: '☀  Kunduzgi',
  dark: '☾  Tungi',
  system: '⚙  Tizim bo‘yicha',
};

export function BrandHeader({title, back}: {title?: string; back?: boolean}) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const {isDark, mode, setMode} = useTheme();
  const {t, locale, setLocale} = useI18n();
  const navigation = useNavigation();
  /** Til yoki tema ro'yxati ochiqmi. */
  const [menu, setMenu] = useState<'locale' | 'theme' | null>(null);

  /**
   * Tab ekraniga o'tish. `navigate('Tabs', {screen})` YOZILMAYDI - bu
   * header ham tab navigatorining sarlavhasi, ham stack'niki bo'lib
   * ishlaydi va tab ichida bunday chaqiruv jimgina hech narsa qilmaydi
   * (savat/sevimlilar tugmalari shu sabab "bosilmayotgandek" edi).
   * Ekran nomining o'zi berilsa amal navigatorlar bo'ylab ko'tariladi.
   */
  const goTo = (screen: string) => {
    (navigation as unknown as {navigate: (name: string) => void}).navigate(screen);
  };

  const cartCount = useAppSelector(s => s.cart.items.reduce((sum, i) => sum + i.quantity, 0));
  const favCount = useAppSelector(s => s.favorites.ids.length);

  return (
    <View style={[styles.wrap, {paddingTop: insets.top + spacing.xs}]}>
      {back && (
        <Pressable hitSlop={8} onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Text style={styles.icon}>‹</Text>
        </Pressable>
      )}

      <Pressable style={styles.brand} onPress={() => goTo('Home')}>
        <Image source={require('../../assets/logo.jpg')} style={styles.logo} alt="" />
        <Text numberOfLines={1} style={styles.brandText}>
          {title ?? t.appNameShort}
        </Text>
      </Pressable>

      <View style={styles.actions}>
        <Pressable hitSlop={6} onPress={() => setMenu('locale')} style={styles.iconBtn}>
          <Text style={styles.localeText}>{locale.toUpperCase()}</Text>
        </Pressable>

        <Pressable hitSlop={6} onPress={() => setMenu('theme')} style={styles.iconBtn}>
          <Text style={styles.icon}>{isDark ? '☀' : '☾'}</Text>
          {mode === 'system' && <View style={styles.systemDot} />}
        </Pressable>

        <HeaderBadgeButton glyph="♡" count={favCount} onPress={() => goTo('Sevimlilar')} />
        <HeaderBadgeButton glyph="🛒" count={cartCount} onPress={() => goTo('Savat')} />
      </View>

      {/* Til va tema tanlash - tugma ostidan chiqadigan ro'yxat. */}
      <Modal visible={menu !== null} transparent animationType="fade">
        <Pressable style={styles.menuBackdrop} onPress={() => setMenu(null)}>
          <View style={[styles.menu, {top: insets.top + 48}]}>
            {menu === 'locale' &&
              (Object.keys(LOCALE_LABELS) as Locale[]).map(key => (
                <Pressable
                  key={key}
                  style={styles.menuItem}
                  onPress={() => {
                    setLocale(key);
                    setMenu(null);
                  }}>
                  <Text style={[styles.menuText, locale === key && styles.menuTextOn]}>
                    {LOCALE_LABELS[key]}
                  </Text>
                  {locale === key && <Text style={styles.menuCheck}>✓</Text>}
                </Pressable>
              ))}

            {menu === 'theme' &&
              (Object.keys(THEME_LABELS) as ThemeMode[]).map(key => (
                <Pressable
                  key={key}
                  style={styles.menuItem}
                  onPress={() => {
                    setMode(key);
                    setMenu(null);
                  }}>
                  <Text style={[styles.menuText, mode === key && styles.menuTextOn]}>
                    {THEME_LABELS[key]}
                  </Text>
                  {mode === key && <Text style={styles.menuCheck}>✓</Text>}
                </Pressable>
              ))}
          </View>
        </Pressable>
      </Modal>
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
  menuBackdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.25)'},
  menu: {
    position: 'absolute',
    right: spacing.md,
    minWidth: 190,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: spacing.xs,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 6},
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  menuText: {color: c.text, fontSize: 15},
  menuTextOn: {color: c.accent, fontWeight: '700'},
  menuCheck: {color: c.accent, fontSize: 15, fontWeight: '800'},
}));

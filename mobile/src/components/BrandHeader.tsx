import React, {useState} from 'react';
import {Image, Modal, Pressable, ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {
  makeStyles,
  radius,
  spacing,
  useTheme,
  type FontScaleMode,
  type ThemeMode,
} from '../theme';
import {useI18n, type Locale} from '../i18n';
import {useAppSelector} from '../store';
import {Icon, type IconName} from './Icon';

/**
 * ILOVA HEADER'i.
 *
 * O'ng tomonda faqat IKKI tugma qoladi: tema almashtirish va "☰".
 * Qolgani (sevimlilar, savat, buyurtmalar, yordamchi, til, shrift
 * o'lchami) ☰ ostidagi kichik oynada - u ekranni to'sib qo'ymaydi,
 * balandligi ichidagi ro'yxatga qarab o'sadi.
 *
 * Yopish ikki xil: tashqi tomonga bosish yoki ☰ o'rniga chiqqan ✕.
 */

const LOCALE_LABELS: Record<Locale, string> = {
  uz: "O'zbekcha",
  en: 'English',
  ru: 'Русский',
};

const THEME_ORDER: ThemeMode[] = ['light', 'dark', 'system'];

export function BrandHeader({title, back}: {title?: string; back?: boolean}) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const {isDark, mode, setMode, fontScaleMode, setFontScaleMode} = useTheme();
  const {t, locale, setLocale} = useI18n();
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);

  /**
   * Tab ekraniga o'tish. `navigate('Tabs', {screen})` YOZILMAYDI - bu
   * header ham tab navigatorining sarlavhasi, ham stack'niki bo'lib
   * ishlaydi va tab ichida bunday chaqiruv jimgina hech narsa qilmaydi.
   * Ekran nomining o'zi berilsa amal navigatorlar bo'ylab ko'tariladi.
   */
  const goTo = (screen: string) => {
    setOpen(false);
    (navigation as unknown as {navigate: (name: string) => void}).navigate(screen);
  };

  const cartCount = useAppSelector(s => s.cart.items.reduce((sum, i) => sum + i.quantity, 0));
  const favCount = useAppSelector(s => s.favorites.ids.length);
  const menuCount = cartCount + favCount;

  /** Tema tugmasi bosilganda: kunduzgi -> tungi -> tizim -> ... */
  const cycleTheme = () => {
    const index = THEME_ORDER.indexOf(mode);
    setMode(THEME_ORDER[(index + 1) % THEME_ORDER.length] ?? 'system');
  };

  const fontOptions: {value: FontScaleMode; label: string}[] = [
    {value: 'system', label: t.fontSystem},
    {value: 'small', label: t.fontSmall},
    {value: 'normal', label: t.fontNormal},
    {value: 'large', label: t.fontLarge},
    {value: 'xlarge', label: t.fontXLarge},
  ];

  return (
    <View style={[styles.wrap, {paddingTop: insets.top + spacing.xs}]}>
      {back && (
        <Pressable hitSlop={8} onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Icon name="chevronRight" size={22} color={styles.c.text} style={styles.backIcon} />
        </Pressable>
      )}

      <Pressable style={styles.brand} onPress={() => goTo('Home')}>
        <Image source={require('../../assets/logo.jpg')} style={styles.logo} alt="" />
        <Text numberOfLines={1} style={styles.brandText}>
          {title ?? t.appNameShort}
        </Text>
      </Pressable>

      <View style={styles.actions}>
        {/* Tema - eng ko'p ishlatiladigan tugma, shuning uchun tashqarida. */}
        <Pressable hitSlop={6} onPress={cycleTheme} style={styles.iconBtn}>
          <Icon name={isDark ? 'sun' : 'moon'} size={20} color={styles.c.text} />
          {mode === 'system' && <View style={styles.systemDot} />}
        </Pressable>

        <Pressable
          hitSlop={6}
          onPress={() => setOpen(value => !value)}
          style={styles.iconBtn}
          accessibilityLabel={open ? t.close : t.menu}>
          <Icon name={open ? 'close' : 'menu'} size={22} color={styles.c.text} />
          {!open && menuCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{menuCount > 99 ? '99+' : menuCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        {/* Tashqi tomonga bosilsa yopiladi. */}
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* Ichkariga bosilganda yopilmasligi uchun alohida Pressable. */}
          <Pressable style={[styles.sheet, {top: insets.top + 44}]} onPress={() => {}}>
            <ScrollView bounces={false}>
              <MenuRow
                icon="heart"
                label={t.tabFavorites}
                count={favCount}
                onPress={() => goTo('Sevimlilar')}
              />
              <MenuRow icon="cart" label={t.tabCart} count={cartCount} onPress={() => goTo('Savat')} />
              <MenuRow icon="orders" label={t.myOrders} onPress={() => goTo('Buyurtmalarim')} />
              <MenuRow icon="assistant" label={t.titleAssistant} onPress={() => goTo('Yordamchi')} />

              <View style={styles.divider} />

              <Text style={styles.groupTitle}>{t.language}</Text>
              <View style={styles.chips}>
                {(Object.keys(LOCALE_LABELS) as Locale[]).map(code => (
                  <Pressable
                    key={code}
                    onPress={() => setLocale(code)}
                    style={[styles.chip, locale === code && styles.chipOn]}>
                    <Text style={[styles.chipText, locale === code && styles.chipTextOn]}>
                      {LOCALE_LABELS[code]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.groupTitle}>{t.fontSizeTitle}</Text>
              <View style={styles.chips}>
                {fontOptions.map(option => (
                  <Pressable
                    key={option.value}
                    onPress={() => setFontScaleMode(option.value)}
                    style={[styles.chip, fontScaleMode === option.value && styles.chipOn]}>
                    <Text
                      style={[
                        styles.chipText,
                        fontScaleMode === option.value && styles.chipTextOn,
                      ]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  count,
  onPress,
}: {
  icon: IconName;
  label: string;
  count?: number;
  onPress: () => void;
}) {
  const styles = useStyles();

  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuLeft}>
        <Icon name={icon} size={19} color={styles.c.accent} />
        <Text style={styles.menuText}>{label}</Text>
      </View>
      {typeof count === 'number' && count > 0 && (
        <View style={styles.countPill}>
          <Text style={styles.countText}>{count > 99 ? '99+' : count}</Text>
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
  brandText: {color: c.text, fontSize: 16, fontWeight: '800', flexShrink: 1},
  actions: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  iconBtn: {width: 32, height: 34, alignItems: 'center', justifyContent: 'center'},
  /** Orqaga: "chevron" ikonkasi teskari qaratiladi. */
  backIcon: {transform: [{rotate: '180deg'}]},
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
    right: -2,
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
  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.25)'},
  /**
   * Oyna balandligi ichidagi ro'yxatga qarab o'sadi; ekranning yarmidan
   * oshsa ichi aylanadi.
   */
  sheet: {
    position: 'absolute',
    right: spacing.md,
    maxHeight: '70%',
    minWidth: 230,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: spacing.sm,
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
  menuLeft: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  menuText: {color: c.text, fontSize: 15},
  countPill: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: c.accent,
    alignItems: 'center',
  },
  countText: {color: c.onAccent, fontSize: 11, fontWeight: '700'},
  divider: {height: 1, backgroundColor: c.border, marginVertical: spacing.xs},
  groupTitle: {
    color: c.muted,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipOn: {backgroundColor: c.accent, borderColor: c.accent},
  chipText: {color: c.text, fontSize: 13},
  chipTextOn: {color: c.onAccent, fontWeight: '700'},
}));

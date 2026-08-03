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
 * O'ng tomonda faqat IKKI tugma: tema almashtirish va "☰". Qolgani
 * ☰ ostidagi TOR oynada. Til va shrift o'lchami o'sha oynaning
 * ichida alohida kichik ko'rinishga o'tadi (orqaga qaytish tugmasi
 * bilan) - shunda oyna kichik qoladi va ro'yxat cho'zilib ketmaydi.
 *
 * Yopish ikki xil: tashqi tomonga bosish yoki ☰ o'rniga chiqqan ✕.
 */

const LOCALE_LABELS: Record<Locale, string> = {
  uz: "O'zbekcha",
  en: 'English',
  ru: 'Русский',
};

const THEME_ORDER: ThemeMode[] = ['light', 'dark', 'system'];

/** Shrift slayderidagi qadamlar (chapdan o'ngga - kichikdan kattaga). */
const FONT_STEPS: FontScaleMode[] = ['small', 'normal', 'system', 'large', 'xlarge'];

type MenuView = 'main' | 'locale' | 'font';

export function BrandHeader({title, back}: {title?: string; back?: boolean}) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const {isDark, mode, setMode, fontScaleMode, setFontScaleMode} = useTheme();
  const {t, locale, setLocale} = useI18n();
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<MenuView>('main');

  /**
   * Tab ekraniga o'tish. `navigate('Tabs', {screen})` YOZILMAYDI - bu
   * header ham tab navigatorining sarlavhasi, ham stack'niki bo'lib
   * ishlaydi va tab ichida bunday chaqiruv jimgina hech narsa qilmaydi.
   * Ekran nomining o'zi berilsa amal navigatorlar bo'ylab ko'tariladi.
   */
  const goTo = (screen: string) => {
    close();
    (navigation as unknown as {navigate: (name: string) => void}).navigate(screen);
  };

  const close = () => {
    setOpen(false);
    setView('main');
  };

  const cartCount = useAppSelector(s => s.cart.items.reduce((sum, i) => sum + i.quantity, 0));
  const favCount = useAppSelector(s => s.favorites.ids.length);
  const menuCount = cartCount + favCount;

  /** Tema tugmasi bosilganda: kunduzgi -> tungi -> tizim -> ... */
  const cycleTheme = () => {
    const index = THEME_ORDER.indexOf(mode);
    setMode(THEME_ORDER[(index + 1) % THEME_ORDER.length] ?? 'system');
  };

  const fontLabels: Record<FontScaleMode, string> = {
    small: t.fontSmall,
    normal: t.fontNormal,
    system: t.fontSystem,
    large: t.fontLarge,
    xlarge: t.fontXLarge,
  };
  const fontIndex = Math.max(0, FONT_STEPS.indexOf(fontScaleMode));

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
          onPress={() => (open ? close() : setOpen(true))}
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

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        {/* Tashqi tomonga bosilsa yopiladi. */}
        <Pressable style={styles.backdrop} onPress={close}>
          {/* Ichkariga bosilganda yopilmasligi uchun alohida Pressable. */}
          <Pressable style={[styles.sheet, {top: insets.top + 44}]} onPress={() => {}}>
            <ScrollView bounces={false}>
              {view === 'main' && (
                <>
                  <MenuRow
                    icon="heart"
                    label={t.tabFavorites}
                    count={favCount}
                    onPress={() => goTo('Sevimlilar')}
                  />
                  <MenuRow
                    icon="cart"
                    label={t.tabCart}
                    count={cartCount}
                    onPress={() => goTo('Savat')}
                  />
                  <MenuRow icon="orders" label={t.myOrders} onPress={() => goTo('Buyurtmalarim')} />
                  <MenuRow
                    icon="assistant"
                    label={t.titleAssistant}
                    onPress={() => goTo('Yordamchi')}
                  />

                  <View style={styles.divider} />

                  {/* Kichik oynachaga o'tadigan qatorlar. */}
                  <MenuRow
                    icon="language"
                    label={t.language}
                    value={LOCALE_LABELS[locale]}
                    onPress={() => setView('locale')}
                  />
                  <MenuRow
                    icon="settings"
                    label={t.fontSizeTitle}
                    value={fontLabels[fontScaleMode]}
                    onPress={() => setView('font')}
                  />
                </>
              )}

              {view === 'locale' && (
                <>
                  <SubHeader title={t.language} onBack={() => setView('main')} />
                  {(Object.keys(LOCALE_LABELS) as Locale[]).map(code => (
                    <Pressable
                      key={code}
                      style={styles.menuItem}
                      onPress={() => {
                        setLocale(code);
                        setView('main');
                      }}>
                      <Text style={[styles.menuText, locale === code && styles.menuTextOn]}>
                        {LOCALE_LABELS[code]}
                      </Text>
                      {locale === code && <Icon name="check" size={18} color={styles.c.accent} />}
                    </Pressable>
                  ))}
                </>
              )}

              {view === 'font' && (
                <>
                  <SubHeader title={t.fontSizeTitle} onBack={() => setView('main')} />

                  {/* Slayder: chiziq + belgilar, tanlangani ustida dumaloq. */}
                  <View style={styles.slider}>
                    <View style={styles.sliderTrack} />
                    <View style={styles.sliderSteps}>
                      {FONT_STEPS.map((step, index) => (
                        <Pressable
                          key={step}
                          hitSlop={10}
                          style={styles.sliderStep}
                          onPress={() => setFontScaleMode(step)}>
                          {index === fontIndex ? (
                            <View style={styles.sliderKnob} />
                          ) : (
                            <View style={styles.sliderDot} />
                          )}
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={styles.sliderEnds}>
                    <Text style={styles.sliderEndSmall}>A</Text>
                    <Text style={styles.sliderValue}>{fontLabels[fontScaleMode]}</Text>
                    <Text style={styles.sliderEndBig}>A</Text>
                  </View>

                  <Text style={styles.sample}>{t.fontSizeHint}</Text>
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Kichik oynacha sarlavhasi: orqaga qaytish + nom. */
function SubHeader({title, onBack}: {title: string; onBack: () => void}) {
  const styles = useStyles();
  return (
    <Pressable style={styles.subHeader} onPress={onBack}>
      <Icon name="chevronRight" size={18} color={styles.c.muted} style={styles.backIcon} />
      <Text style={styles.subHeaderText}>{title}</Text>
    </Pressable>
  );
}

function MenuRow({
  icon,
  label,
  count,
  value,
  onPress,
}: {
  icon: IconName;
  label: string;
  count?: number;
  /** O'ngda ko'rinadigan joriy qiymat ("O'zbekcha"). */
  value?: string;
  onPress: () => void;
}) {
  const styles = useStyles();

  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuLeft}>
        <Icon name={icon} size={19} color={styles.c.accent} />
        <Text style={styles.menuText} numberOfLines={1}>
          {label}
        </Text>
      </View>

      {typeof count === 'number' && count > 0 && (
        <View style={styles.countPill}>
          <Text style={styles.countText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}

      {value && (
        <View style={styles.menuRight}>
          <Text style={styles.menuValue} numberOfLines={1}>
            {value}
          </Text>
          <Icon name="chevronRight" size={16} color={styles.c.muted} />
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
  /** Tor oyna: kengligi 210, balandligi ichidagi ro'yxatga qarab o'sadi. */
  sheet: {
    position: 'absolute',
    right: spacing.md,
    width: 210,
    maxHeight: '65%',
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
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  menuLeft: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1},
  menuRight: {flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1},
  menuText: {color: c.text, fontSize: 14, flexShrink: 1},
  menuTextOn: {color: c.accent, fontWeight: '700'},
  menuValue: {color: c.muted, fontSize: 12, maxWidth: 74},
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
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  subHeaderText: {color: c.muted, fontSize: 12, fontWeight: '700'},
  /** Shrift slayderi. */
  slider: {height: 34, justifyContent: 'center', paddingHorizontal: spacing.md},
  sliderTrack: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    height: 2,
    borderRadius: 1,
    backgroundColor: c.border,
  },
  sliderSteps: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  sliderStep: {width: 26, height: 30, alignItems: 'center', justifyContent: 'center'},
  sliderDot: {width: 6, height: 6, borderRadius: 3, backgroundColor: c.border},
  sliderKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: c.accent,
    borderWidth: 2,
    borderColor: c.surface,
  },
  sliderEnds: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  sliderEndSmall: {color: c.muted, fontSize: 11, fontWeight: '700'},
  sliderEndBig: {color: c.muted, fontSize: 17, fontWeight: '700'},
  sliderValue: {color: c.text, fontSize: 12, fontWeight: '700'},
  sample: {
    color: c.muted,
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
}));

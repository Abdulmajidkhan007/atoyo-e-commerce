import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {Animated, Pressable, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {makeStyles, radius, spacing} from '../theme';

/**
 * TOAST (xabar chizig'i).
 *
 * Tizimning oddiy `Alert.alert` oynasi o'rniga - saytdagi Snackbar bilan
 * bir xil ko'rinadigan, tepadan sirg'alib chiqadigan xabar. Rangi
 * turiga qarab: muvaffaqiyat (aqua), xato (qizil), oddiy (surface).
 *
 * Ishlatilishi:
 *     const toast = useToast();
 *     toast.success('Savatga qo'shildi');
 *     toast.error('Xatolik yuz berdi');
 */

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  text: string;
  kind: ToastKind;
}

interface ToastApi {
  show: (text: string, kind?: ToastKind) => void;
  success: (text: string) => void;
  error: (text: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const VISIBLE_MS = 2600;

export function ToastProvider({children}: {children: React.ReactNode}) {
  const [item, setItem] = useState<ToastItem | null>(null);
  // Animatsiya qiymati render davomida o'zgarmaydi - useMemo bilan
  // bir marta yaratamiz (ref'ga render ichida murojaat qilmaslik uchun).
  const slide = useMemo(() => new Animated.Value(-120), []);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(slide, {toValue: -120, duration: 180, useNativeDriver: true}).start(() =>
      setItem(null),
    );
  }, [slide]);

  const show = useCallback(
    (text: string, kind: ToastKind = 'info') => {
      if (timer.current) clearTimeout(timer.current);
      setItem({text, kind});
      slide.setValue(-120);
      Animated.spring(slide, {toValue: 0, useNativeDriver: true, damping: 16}).start();
      timer.current = setTimeout(hide, VISIBLE_MS);
    },
    [hide, slide],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const api: ToastApi = {
    show,
    success: (text: string) => show(text, 'success'),
    error: (text: string) => show(text, 'error'),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {item && <ToastBar item={item} slide={slide} onClose={hide} />}
    </ToastContext.Provider>
  );
}

function ToastBar({
  item,
  slide,
  onClose,
}: {
  item: ToastItem;
  slide: Animated.Value;
  onClose: () => void;
}) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  const tone =
    item.kind === 'success'
      ? styles.success
      : item.kind === 'error'
        ? styles.error
        : styles.info;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, {top: insets.top + spacing.sm, transform: [{translateY: slide}]}]}>
      <Pressable onPress={onClose} style={[styles.bar, tone]}>
        <Text style={styles.icon}>
          {item.kind === 'success' ? '✓' : item.kind === 'error' ? '!' : 'i'}
        </Text>
        <Text style={styles.text} numberOfLines={3}>
          {item.text}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Toast provider'siz chaqirilsa ilova yiqilmasin - xabar shunchaki
 * ko'rinmaydi (masalan test muhitida).
 */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  return ctx ?? {show: () => {}, success: () => {}, error: () => {}};
}

const useStyles = makeStyles(c => ({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 100,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    // Android'da soya elevation bilan, iOS'da shadow* bilan.
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
  },
  success: {backgroundColor: c.accent, borderColor: c.accent},
  error: {backgroundColor: c.danger, borderColor: c.danger},
  // Oddiy xabar ham navy fonda - matn ikkala temada ham o'qiladi.
  info: {backgroundColor: c.brand, borderColor: c.brand},
  icon: {
    color: c.white,
    fontWeight: '800',
    fontSize: 14,
    width: 18,
    textAlign: 'center',
  },
  text: {
    flex: 1,
    color: c.white,
    fontSize: 14,
    fontWeight: '600',
  },
}));

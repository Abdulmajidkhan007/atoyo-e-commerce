import React, {useEffect, useState} from 'react';
import {Linking, Pressable, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {makeStyles, radius, spacing} from '../theme';
import {useI18n} from '../i18n';

/**
 * YANGILANISH ESLATMASI.
 *
 * Ilova Play Market orqali tarqatilmagani uchun (APK to'g'ridan-to'g'ri
 * yuklab olinadi) telefon uni O'ZI yangilamaydi. Shuning uchun ilova
 * ochilganda GitHub'dagi eng oxirgi release tekshiriladi: u yerdagi
 * versiya ilovanikidan yangi bo'lsa - tepada eslatma chiqadi va bir
 * bosishda APK yuklab olinadi.
 *
 * Tekshiruv jimgina: internet bo'lmasa yoki so'rov yiqilsa hech narsa
 * ko'rsatilmaydi.
 */

/** Shu build'ning versiyasi (android/app/build.gradle dagi versionName bilan bir xil). */
export const APP_VERSION = '1.0';

const RELEASE_API =
  'https://api.github.com/repos/Abdulmajidkhan007/atoyo-e-commerce/releases/latest';

const APK_URL =
  'https://github.com/Abdulmajidkhan007/atoyo-e-commerce/releases/latest/download/app-release.apk';

/** "1.2.3" ko'rinishidagi versiyalarni raqam bo'yicha solishtiradi. */
function isNewer(remote: string, local: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/i, '')
      .split('.')
      .map(part => Number.parseInt(part, 10) || 0);
  const a = parse(remote);
  const b = parse(local);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

export function UpdateBanner() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const [hasUpdate, setHasUpdate] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;

    fetch(RELEASE_API, {headers: {Accept: 'application/vnd.github+json'}})
      .then(res => (res.ok ? res.json() : null))
      .then((data: {tag_name?: string; name?: string} | null) => {
        if (!active || !data) return;
        // Teg "latest" bo'lsa versiya nomdan olinadi ("Atoyo ilovasi 1.2").
        const candidate = /\d/.test(data.tag_name ?? '')
          ? (data.tag_name as string)
          : (data.name ?? '').match(/\d+(\.\d+)*/)?.[0] ?? '';
        if (candidate && isNewer(candidate, APP_VERSION)) setHasUpdate(true);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  if (!hasUpdate || dismissed) return null;

  return (
    <View style={[styles.wrap, {top: insets.top + spacing.sm}]}>
      <View style={styles.bar}>
        <Text style={styles.text} numberOfLines={2}>
          {t.updateAvailable}
        </Text>
        <Pressable onPress={() => Linking.openURL(APK_URL)} hitSlop={8}>
          <Text style={styles.action}>{t.updateDownload}</Text>
        </Pressable>
        <Pressable onPress={() => setDismissed(true)} hitSlop={8}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles(c => ({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 90,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: c.brand,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
  },
  text: {flex: 1, color: c.onBrand, fontSize: 13, fontWeight: '600'},
  action: {color: c.accent, fontSize: 13, fontWeight: '800'},
  close: {color: c.onBrandMuted, fontSize: 14, paddingHorizontal: spacing.xs},
}));

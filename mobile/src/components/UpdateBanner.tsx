import React from 'react';
import {Linking, Modal, Pressable, ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {makeStyles, radius, spacing} from '../theme';
import {useI18n} from '../i18n';
import {Icon} from './Icon';
import {useAppUpdate} from '../update';

/**
 * YANGILANISH ESLATMASI.
 *
 * Ilova Play Market orqali tarqatilmagani uchun (APK to'g'ridan-to'g'ri
 * yuklab olinadi) telefon uni O'ZI yangilamaydi va foydalanuvchi yangi
 * versiya chiqqanini bilmaydi. Shuning uchun ikki bosqich:
 *
 *   1) ilova ochilganda OYNA chiqadi - versiya va "nima o'zgardi"
 *      ro'yxati bilan; "Yangilash" bosilsa APK brauzerda yuklanadi;
 *   2) "Keyinroq" bosilsa oyna yopiladi va tepada kichik chiziq
 *      qoladi - kerak bo'lganda bir bosishda yangilash mumkin.
 *      Shu versiya 24 soat qayta bezovta qilmaydi.
 *
 * Majburiy yangilanishda (`mandatory`) "Keyinroq" ko'rsatilmaydi.
 */
export function UpdateBanner() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const {update, snoozed, dismiss} = useAppUpdate();

  if (!update) return null;

  const download = () => {
    Linking.openURL(update.apkUrl).catch(() => {});
  };

  // "Keyinroq" bosilgan bo'lsa - faqat kichik chiziq.
  if (snoozed) {
    return (
      <View style={[styles.wrap, {top: insets.top + spacing.sm}]}>
        <View style={styles.bar}>
          <Text style={styles.text} numberOfLines={2}>
            {t.updateAvailable}
          </Text>
          <Pressable onPress={download} hitSlop={8}>
            <Text style={styles.action}>{t.updateDownload}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!update.mandatory) dismiss();
      }}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconRow}>
            <Icon name="download" size={26} color={styles.c.accent} />
            <Text style={styles.title}>
              {t.updateTitle} {update.version}
            </Text>
          </View>

          <Text style={styles.lead}>{t.updateAvailable}</Text>

          {update.notes.length > 0 && (
            <>
              <Text style={styles.notesTitle}>{t.updateWhatsNew}</Text>
              <ScrollView style={styles.notes}>
                {update.notes.map(note => (
                  <Text key={note} style={styles.note}>
                    • {note}
                  </Text>
                ))}
              </ScrollView>
            </>
          )}

          <Pressable style={styles.primary} onPress={download}>
            <Text style={styles.primaryText}>{t.updateDownload}</Text>
          </Pressable>

          {!update.mandatory && (
            <Pressable style={styles.secondary} onPress={dismiss} hitSlop={8}>
              <Text style={styles.secondaryText}>{t.updateLater}</Text>
            </Pressable>
          )}

          <Text style={styles.hint}>{t.updateHint}</Text>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles(c => ({
  wrap: {
    position: 'absolute' as const,
    left: spacing.md,
    right: spacing.md,
    zIndex: 90,
  },
  bar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
  text: {flex: 1, color: c.onBrand, fontSize: 13, fontWeight: '600' as const},
  action: {color: c.accent, fontSize: 13, fontWeight: '800' as const},

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: spacing.lg,
  },
  card: {
    width: '100%' as const,
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  iconRow: {flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.sm},
  title: {flex: 1, color: c.text, fontSize: 18, fontWeight: '800' as const},
  lead: {color: c.muted, fontSize: 13},
  notesTitle: {color: c.text, fontSize: 13, fontWeight: '700' as const, marginTop: spacing.xs},
  /** Ro'yxat uzun bo'lsa oyna cho'zilib ketmasin. */
  notes: {maxHeight: 180},
  note: {color: c.muted, fontSize: 13, lineHeight: 20},
  primary: {
    backgroundColor: c.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center' as const,
    marginTop: spacing.xs,
  },
  primaryText: {color: c.onAccent, fontSize: 15, fontWeight: '800' as const},
  secondary: {alignItems: 'center' as const, paddingVertical: spacing.sm},
  secondaryText: {color: c.muted, fontSize: 14, fontWeight: '600' as const},
  hint: {color: c.muted, fontSize: 11, textAlign: 'center' as const, opacity: 0.8},
}));

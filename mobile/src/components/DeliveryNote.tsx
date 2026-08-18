import React, {useEffect, useState} from 'react';
import {Text, View} from 'react-native';
import {makeStyles, radius, spacing} from '../theme';
import {
  fetchDeliverySettings,
  freeDeliveryText,
  installServiceText,
  type DeliverySettings,
} from '../api';
import {Icon} from './Icon';

/**
 * YETKAZIB BERISH VA'DASI (ilova).
 *
 * Saytdagi `DeliveryNote` bilan bir xil matn: sozlama `/api/delivery`
 * dan olinadi, kelmasa standart matn ko'rsatiladi (shuning uchun
 * internet sekin bo'lsa ham mijoz va'dani ko'radi).
 *
 * `withInstall` - o'rnatib berish xizmati haqidagi qator. Mahsulot
 * ekranida u faqat shu mahsulotda xizmat belgilangan bo'lsa beriladi.
 */
export function DeliveryNote({withInstall = true}: {withInstall?: boolean}) {
  const styles = useStyles();
  const [settings, setSettings] = useState<DeliverySettings | null>(null);

  useEffect(() => {
    let active = true;
    fetchDeliverySettings()
      .then(found => {
        if (active) setSettings(found);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const install = withInstall ? installServiceText(settings) : null;

  return (
    <View style={styles.box}>
      <View style={styles.row}>
        <Icon name="truck" size={18} color={styles.c.accent} />
        <Text style={styles.text}>{freeDeliveryText(settings)}</Text>
      </View>
      {!!install && (
        <View style={styles.row}>
          <Icon name="settings" size={18} color={styles.c.accent} />
          <Text style={styles.text}>{install}</Text>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles(c => ({
  box: {
    borderWidth: 1,
    borderColor: c.accent,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
    marginVertical: spacing.sm,
  },
  row: {flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: spacing.sm},
  text: {flex: 1, color: c.text, fontSize: 13, lineHeight: 19},
}));

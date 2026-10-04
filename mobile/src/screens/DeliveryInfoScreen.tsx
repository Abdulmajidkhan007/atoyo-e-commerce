import React, {useEffect, useState} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {makeStyles, spacing} from '../theme';
import {useI18n} from '../i18n';
import {Button, Card, Loading} from '../components/ui';
import {Icon, type IconName} from '../components/Icon';
import {useNavigation} from '@react-navigation/native';
import {freeDeliveryText, installServiceText} from '../delivery-text';
import {fetchDeliveryInfo, type DeliveryInfo} from '../content-api';
import type {StackScreenProps} from '../navigation/types';

/**
 * YETKAZIB BERISH VA TO'LOV - saytdagi `/yetkazib-berish` bilan bir xil
 * mazmun: shartlar `settings/delivery` dan (matnni `freeDeliveryText`
 * yasaydi), hududlar, o'rnatish va FAQAT yoqilgan to'lov usullari.
 * Hech narsa qattiq yozilmagan.
 */
export function DeliveryInfoScreen() {
  const styles = useStyles();
  const {t, money} = useI18n();
  const navigation = useNavigation<StackScreenProps<'YetkazibBerish'>['navigation']>();
  const [info, setInfo] = useState<DeliveryInfo | null>(null);
  const [failed, setFailed] = useState(false);
  /** Qayta urinish hisoblagichi: o'zgarsa ma'lumot qaytadan olinadi. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchDeliveryInfo()
      .then(data => alive && setInfo(data))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [attempt]);

  const load = () => {
    setFailed(false);
    setInfo(null);
    setAttempt(n => n + 1);
  };

  if (failed) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>{t.loadFailed}</Text>
        <Button title={t.retry} variant="outline" onPress={load} />
      </View>
    );
  }
  if (!info) return <Loading />;

  const {delivery} = info;
  const install = installServiceText(delivery);
  const zones = delivery.enabled ? delivery.zones ?? [] : [];
  const extra = (delivery.pageText ?? '').trim();
  const payments = [t.infoPayCash];
  if (info.transferEnabled) payments.push(t.payTransfer);
  if (info.onlineEnabled) payments.push(t.infoPayOnline);

  const heading = (icon: IconName, title: string) => (
    <View style={styles.headingRow}>
      <Icon name={icon} size={20} color={styles.c.accent} />
      <Text style={styles.heading}>{title}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.text}>{t.deliveryIntro}</Text>

      <Card>
        {heading('truck', t.deliveryTerms)}
        <Text style={styles.text}>{freeDeliveryText(delivery)}</Text>
        {info.minOrderAmount > 0 && (
          <Text style={styles.text}>{t.minOrderInfo.replace('{sum}', money(info.minOrderAmount))}</Text>
        )}
        {extra !== '' && <Text style={styles.text}>{extra}</Text>}
        {zones.length > 0 && (
          <>
            <Text style={styles.subheading}>{t.zonesTitle}</Text>
            {zones.map(zone => {
              // Sayt bilan bir xil: hududda chegara bo'lmasa umumiy `freeFrom`.
              const freeFrom = zone.freeFrom && zone.freeFrom > 0 ? zone.freeFrom : delivery.freeFrom;
              return (
                <View key={zone.id} style={styles.zoneRow}>
                  <Text style={[styles.text, styles.zoneName]}>{zone.name}</Text>
                  <Text style={styles.zonePrice}>
                    {money(zone.fee)}
                    {freeFrom > 0 ? ` · ${t.zoneFreeFrom.replace('{sum}', money(freeFrom))}` : ''}
                  </Text>
                </View>
              );
            })}
          </>
        )}
      </Card>

      {install !== null && (
        <Card>
          {heading('build', t.installTitle)}
          <Text style={styles.text}>{install}</Text>
        </Card>
      )}

      <Card>
        {heading('receipt', t.paymentTitle)}
        {payments.map(line => (
          <Text key={line} style={styles.text}>{`• ${line}`}</Text>
        ))}
      </Card>

      <Pressable accessibilityRole="link" onPress={() => navigation.navigate('SavolJavob')}>
        <Text style={styles.link}>{t.titleFaq}</Text>
      </Pressable>
    </ScrollView>
  );
}

const useStyles = makeStyles(c => ({
  screen: {flex: 1, backgroundColor: c.bg},
  content: {padding: spacing.lg, gap: spacing.md},
  center: {flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md},
  text: {color: c.muted, fontSize: 14, lineHeight: 21},
  headingRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  heading: {color: c.text, fontSize: 16, fontWeight: '700'},
  subheading: {color: c.text, fontSize: 14, fontWeight: '600', marginTop: spacing.sm},
  zoneRow: {flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 4},
  zoneName: {flex: 1},
  zonePrice: {color: c.text, fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right'},
  link: {color: c.accent, fontSize: 15, fontWeight: '600', paddingVertical: spacing.sm},
}));

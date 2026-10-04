import React, {useEffect, useState} from 'react';
// Clipboard RN yadrosida hali bor (eskirgan deb belgilangan). Alohida
// nativ paket qo'shmaslik uchun shu ishlatiladi - yo'qolsa nusxa olish
// jim o'tadi, raqam esa ekranda ko'rinib turadi.
import {Clipboard, Pressable, RefreshControl, ScrollView, Text, View} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {makeStyles, radius, spacing} from '../theme';
import {Button, Loading} from '../components/ui';
import {Icon} from '../components/Icon';
import {BrandHeader} from '../components/BrandHeader';
import {useToast} from '../components/Toast';
import {useAuth} from '../auth';
import {useCheckoutI18n, fill} from '../checkout-i18n';
import {
  fetchOrderPayment,
  fetchTransferCard,
  getOrderAccess,
  MAX_RECEIPT_BYTES,
  receiptErrorMessage,
  uploadReceipt,
  type OrderPaymentState,
  type TransferCard,
} from '../checkout-api';
import type {StackScreenProps} from '../navigation/types';

/** "8600123412341234" -> "8600 1234 1234 1234" (saytdagi `formatCardNumber`). */
function formatCard(value: string): string {
  return value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
}

/**
 * BUYURTMADAN KEYINGI TO'LOV EKRANI (saytdagi `/buyurtma/<id>?t=` +
 * `TransferPanel` ning ilova varianti).
 *
 * Summa va holat SERVERDAN (`/api/orders/<id>/payment`) — ilova narx
 * hisoblamaydi. O'tkazmada: karta raqami (nusxalash), summa, "Chekni
 * yuklash" (multipart, `?t=` kaliti bilan). Kalit faqat shu qurilmada
 * saqlanadi (`saveOrderAccess`); kirgan mijozning o'z buyurtmasi
 * kalitsiz ham ochiladi (server `Authorization` ni tekshiradi).
 *
 * Mijoz bank ilovasiga o'tib qaytadi — shuning uchun ekran pastga
 * tortib yangilanadi va holat har kirishda qayta o'qiladi.
 */
export function OrderPaymentScreen({route, navigation}: StackScreenProps<'Tolov'>) {
  const {orderId} = route.params;
  const styles = useStyles();
  const toast = useToast();
  const {user} = useAuth();
  const {c, money} = useCheckoutI18n();

  const [token, setToken] = useState<string | null>(route.params.accessToken ?? null);
  const [order, setOrder] = useState<OrderPaymentState | null | undefined>();
  const [card, setCard] = useState<TransferCard | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Kalit parametrda bo'lmasa (Buyurtmalarim'dan kirilgan) — qurilmadan.
  useEffect(() => {
    if (token !== null) return;
    getOrderAccess(orderId).then(setToken);
  }, [orderId, token]);

  /** Holatni qayta o'qish uchun hisoblagich (pastga tortish, chek yuklangach). */
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (token === null) return;
    let active = true;
    fetchOrderPayment(orderId, token)
      .then(async state => {
        const transferCard = state.paymentMethod === 'transfer' ? await fetchTransferCard() : null;
        if (!active) return;
        setOrder(state);
        setCard(transferCard);
      })
      .catch(() => {
        if (active) setOrder(null);
      })
      .finally(() => {
        if (active) setRefreshing(false);
      });
    return () => {
      active = false;
    };
  }, [orderId, token, reloadKey]);

  const refresh = () => {
    setRefreshing(true);
    setReloadKey(key => key + 1);
  };

  const copy = (key: string, text: string) => {
    try {
      Clipboard.setString(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Nusxa olib bo'lmasa — matn ekranda ko'rinib turibdi.
    }
  };

  const pickAndUpload = async () => {
    setError(null);
    const picked = await launchImageLibrary({
      mediaType: 'photo',
      // Chek skrinshoti: kichraytirilgani yetarli, 8 MB chegarasidan oshmaydi.
      maxWidth: 2000,
      maxHeight: 2000,
      quality: 0.8,
    }).catch(() => null);
    const asset = picked?.assets?.[0];
    if (!asset?.uri) return;
    if (asset.fileSize && asset.fileSize > MAX_RECEIPT_BYTES) {
      setError(receiptErrorMessage(413));
      return;
    }
    setUploading(true);
    try {
      await uploadReceipt(orderId, token ?? '', {
        uri: asset.uri,
        type: asset.type ?? 'image/jpeg',
        name: asset.fileName ?? 'chek.jpg',
        size: asset.fileSize,
      });
      toast.success(c.receiptSent);
      setReloadKey(key => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : receiptErrorMessage(0));
    } finally {
      setUploading(false);
    }
  };

  if (order === undefined) return <Loading />;

  const footer = (
    <View style={{gap: spacing.sm, marginTop: spacing.md}}>
      {user && (
        <Button title={c.toOrders} variant="outline" onPress={() => navigation.navigate('Buyurtmalarim')} />
      )}
      <Button title={c.toHome} variant="outline" onPress={() => navigation.navigate('Tabs', {screen: 'Home'})} />
    </View>
  );

  if (order === null) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>{fill(c.orderNumber, {id: orderId.slice(0, 8)})}</Text>
        <Text style={styles.muted}>{c.loadFailed}</Text>
        <Button title={c.retry} onPress={refresh} loading={refreshing} />
        {footer}
      </ScrollView>
    );
  }

  const cancelled = order.status === 'cancelled';
  const isTransfer = order.paymentMethod === 'transfer';
  const rawAmount = String(Math.round(order.totalAmount));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <View style={styles.okRow}>
        <Icon name="checkCircle" size={28} color={styles.c.success} />
        <View style={{flex: 1}}>
          <Text style={styles.heading}>{c.orderReceived}</Text>
          <Text style={styles.muted}>{fill(c.orderNumber, {id: order.id.slice(0, 8)})}</Text>
        </View>
      </View>

      {cancelled ? (
        <Notice tone="danger" text={c.cancelled} />
      ) : !isTransfer ? (
        <>
          <AmountRow label={c.amountToPay} value={money(order.totalAmount)} />
          <Notice tone="info" text={order.paymentMethod === 'online' ? c.onlineNote : c.cashNote} />
        </>
      ) : order.paymentStatus === 'paid' ? (
        <Notice tone="success" text={c.paid} />
      ) : (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{c.transferTitle}</Text>
          {[c.step1, c.step2, c.step3].map((step, index) => (
            <Text key={step} style={styles.step}>
              {index + 1}. {step}
            </Text>
          ))}

          {card ? (
            <View style={styles.box}>
              <Text style={styles.small}>
                {c.cardNumber}
                {card.bankName ? ` · ${card.bankName}` : ''}
              </Text>
              <View style={styles.copyRow}>
                <Text style={styles.cardNumber} selectable>
                  {formatCard(card.cardNumber)}
                </Text>
                <CopyButton
                  label={copied === 'card' ? c.copied : c.copy}
                  onPress={() => copy('card', card.cardNumber.replace(/\D/g, ''))}
                  a11y={`${c.cardNumber} — ${c.copy}`}
                />
              </View>
              {!!card.cardHolder && (
                <Text style={styles.muted}>
                  {c.cardHolder}: <Text style={{fontWeight: '700'}}>{card.cardHolder}</Text>
                </Text>
              )}
            </View>
          ) : (
            <Notice tone="danger" text={c.transferOff} />
          )}

          <View style={styles.box}>
            <Text style={styles.small}>{c.amountToPay}</Text>
            <View style={styles.copyRow}>
              <Text style={styles.amount} selectable>
                {money(order.totalAmount)}
              </Text>
              <CopyButton
                label={copied === 'amount' ? c.copied : c.copy}
                onPress={() => copy('amount', rawAmount)}
                a11y={`${c.amountToPay} — ${c.copy}`}
              />
            </View>
          </View>

          {!!card?.note && <Text style={styles.muted}>{card.note}</Text>}

          <View accessibilityLiveRegion="polite" style={{gap: spacing.xs}}>
            {order.paymentStatus === 'failed' && <Notice tone="danger" text={c.failed} />}
            {order.paymentStatus === 'pending' && order.hasReceipt && <Notice tone="info" text={c.receiptUploaded} />}
            {!!error && <Notice tone="danger" text={error} />}
          </View>

          {card && (
            <Button
              title={uploading ? c.uploading : order.hasReceipt ? c.reupload : c.uploadReceipt}
              variant={order.hasReceipt ? 'outline' : 'primary'}
              icon="receipt"
              loading={uploading}
              onPress={pickAndUpload}
            />
          )}
        </View>
      )}

      {footer}
    </ScrollView>
  );
}

/** Sarlavha "To'lov" — matni xarid lug'atida (`checkout-i18n.ts`). */
export function OrderPaymentHeader() {
  const {c} = useCheckoutI18n();
  return <BrandHeader back title={c.paymentScreenTitle} />;
}

function AmountRow({label, value}: {label: string; value: string}) {
  const styles = useStyles();
  return (
    <View style={styles.box}>
      <Text style={styles.small}>{label}</Text>
      <Text style={styles.amount}>{value}</Text>
    </View>
  );
}

function CopyButton({label, onPress, a11y}: {label: string; onPress: () => void; a11y: string}) {
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.copyBtn} accessibilityRole="button" accessibilityLabel={a11y}>
      <Text style={styles.copyText}>{label}</Text>
    </Pressable>
  );
}

function Notice({tone, text}: {tone: 'info' | 'success' | 'danger'; text: string}) {
  const styles = useStyles();
  const color = tone === 'success' ? styles.c.success : tone === 'danger' ? styles.c.danger : styles.c.accent;
  return (
    <View style={[styles.notice, {borderColor: color}]}>
      <Icon name={tone === 'success' ? 'check' : tone === 'danger' ? 'error' : 'info'} size={18} color={color} />
      <Text style={styles.noticeText}>{text}</Text>
    </View>
  );
}

const useStyles = makeStyles(c => ({
  screen: {flex: 1, backgroundColor: c.bg},
  content: {padding: spacing.lg, gap: spacing.md},
  okRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  heading: {fontSize: 18, fontWeight: '800', color: c.text},
  muted: {color: c.muted, fontSize: 13},
  small: {color: c.muted, fontSize: 12},
  panel: {
    borderWidth: 1,
    borderColor: c.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: c.surface,
  },
  panelTitle: {fontSize: 16, fontWeight: '800', color: c.text},
  step: {color: c.text, fontSize: 13, lineHeight: 19},
  box: {
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
    backgroundColor: c.surfaceAlt,
  },
  copyRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
  cardNumber: {flex: 1, fontSize: 18, fontWeight: '800', letterSpacing: 1, color: c.text},
  amount: {flex: 1, fontSize: 18, fontWeight: '800', color: c.text},
  copyBtn: {
    borderWidth: 1,
    borderColor: c.accent,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  copyText: {color: c.text, fontSize: 12, fontWeight: '700'},
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  noticeText: {flex: 1, color: c.text, fontSize: 13, lineHeight: 19},
}));

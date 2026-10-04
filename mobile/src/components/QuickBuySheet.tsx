import React, {useEffect, useState} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {makeStyles, radius, spacing} from '../theme';
import {Button, Field} from './ui';
import {Icon} from './Icon';
import {useAuth} from '../auth';
import {usePricingSettings} from '../pricing';
import {useCheckoutI18n, fill} from '../checkout-i18n';
import {deliveryFeeForZone, freeDeliveryGap} from '../delivery-text';
import {
  fetchCheckoutDelivery,
  fetchTransferCard,
  MAX_GUEST_ITEMS,
  MAX_GUEST_QUANTITY,
  saveOrderAccess,
  submitQuickOrder,
  type CheckoutDelivery,
} from '../checkout-api';

export interface QuickBuyLine {
  productId: string;
  variantId?: string;
  variantLabel?: string;
  name: string;
  /** Mijozga ko'rinadigan narx — server baribir QAYTA hisoblaydi. */
  price: number;
  quantity: number;
  thumbnailUrl: string;
}

/** Saytdagi `normalizePhone` (`lib/validation.ts`) bilan bir xil qoida. */
function normalizePhone(input: string): string | null {
  const cleaned = input.replace(/[\s\-().]/g, '');
  if (!/^\+?\d+$/.test(cleaned)) return null;
  const digits = cleaned.replace(/^\+/, '');
  if (/^998\d{9}$/.test(digits)) return `+${digits}`;
  if (/^\d{9}$/.test(digits)) return `+998${digits}`;
  return null;
}

/**
 * "1 KLIKDA SOTIB OLISH" / "RO'YXATDAN O'TMASDAN BUYURTMA" — pastdan
 * chiquvchi oyna (saytdagi `QuickBuyButton` ning ilova varianti).
 *
 * Ikki rejim:
 *  - `stock` berilgan — mahsulot ekrani: BITTA qator, sonini shu yerda
 *    tanlaydi;
 *  - `stock` yo'q — checkout: BUTUN SAVAT, sonlar savatdagidek.
 *
 * TO'LIQ ma'lumot olinadi (ism, telefon, manzil, hudud, to'lov) —
 * operator hech narsani qayta so'ramaydi. Yetkazish narxi OLDINDAN
 * ko'rsatiladi; yakuniy summa serverda (`createOrder`), shuning uchun
 * to'lov ekrani summani serverdan o'qiydi.
 *
 * Mehmon chegaralari (≤ 20 qator, ≤ 99 dona) serverda ham bor —
 * bu yerda faqat oldindan ANIQ aytiladi.
 */
export function QuickBuySheet({
  visible,
  onClose,
  lines,
  stock,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  lines: QuickBuyLine[];
  /** Mahsulot ekrani rejimi: tanlangan tur/mahsulot zaxirasi. */
  stock?: number;
  /** Buyurtma saqlangach (`null` — server raqamsiz "qabul qilindi" dedi). */
  onDone: (result: {orderId: string; accessToken: string; paymentMethod: 'cash' | 'transfer'} | null) => void;
}) {
  const styles = useStyles();
  const {c, t, money} = useCheckoutI18n();
  const {user} = useAuth();
  const {minOrderAmount} = usePricingSettings();
  const single = stock !== undefined;

  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [address, setAddress] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [payment, setPayment] = useState<'cash' | 'transfer'>('cash');
  const [transferEnabled, setTransferEnabled] = useState(false);
  const [delivery, setDelivery] = useState<CheckoutDelivery>({enabled: false, fee: 0, freeFrom: 0, zones: []});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Oyna ochilganda: o'tkazma yoqilganmi va hududlar (serverdan).
  useEffect(() => {
    if (!visible) return;
    let active = true;
    fetchTransferCard().then(card => {
      if (!active) return;
      setTransferEnabled(card !== null);
      if (!card) setPayment('cash');
    });
    fetchCheckoutDelivery()
      .then(found => {
        if (active) setDelivery(found);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [visible]);

  /** Oyna ochilganda: tozalash va kirgan mijoz ma'lumotini oldindan to'ldirish. */
  const onShow = () => {
    setError(null);
    setQuantity(1);
    if (user) {
      setName(current => current || user.displayName || '');
      setPhone(current => (current.trim() === '+998' && user.phoneNumber ? user.phoneNumber : current));
      setAddress(current => current || user.homeAddress || '');
    }
  };

  const maxQuantity = Math.max(1, Math.min(stock ?? 1, MAX_GUEST_QUANTITY));
  const orderLines = single ? lines.slice(0, 1).map(line => ({...line, quantity})) : lines;
  const subtotal = orderLines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const fee = deliveryFeeForZone(delivery, subtotal, zoneId || null);
  const gap = freeDeliveryGap(delivery, subtotal);
  const belowMinimum = minOrderAmount > 0 && subtotal < minOrderAmount;
  const overLimit =
    orderLines.length > MAX_GUEST_ITEMS || orderLines.some(line => line.quantity > MAX_GUEST_QUANTITY);

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) {
      setError(t.nameTooShort);
      return;
    }
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError(t.phoneInvalid);
      return;
    }
    if (address.trim().length < 5) {
      setError(c.addressRequired);
      return;
    }
    setBusy(true);
    try {
      const result = await submitQuickOrder({
        customerName: name.trim(),
        phoneNumber: normalized,
        deliveryAddress: address.trim(),
        paymentMethod: payment,
        deliveryZoneId: zoneId || null,
        items: orderLines,
      });
      if (result) await saveOrderAccess(result.orderId, result.accessToken);
      onDone(result ? {...result, paymentMethod: payment} : null);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t.orderFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onShow={onShow}
      onRequestClose={() => !busy && onClose()}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.dismiss} onPress={() => !busy && onClose()} accessibilityLabel={t.close} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{flex: 1}}>
              <Text style={styles.title}>{c.quickBuyTitle}</Text>
              <Text style={styles.subtitle}>{c.quickBuySubtitle}</Text>
            </View>
            <Pressable
              hitSlop={10}
              onPress={() => !busy && onClose()}
              accessibilityRole="button"
              accessibilityLabel={t.close}>
              <Icon name="close" size={24} color={styles.c.muted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {single ? (
              <View style={styles.itemBox}>
                <View style={{flex: 1}}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {orderLines[0]?.name}
                    {orderLines[0]?.variantLabel ? ` · ${orderLines[0].variantLabel}` : ''}
                  </Text>
                  <Text style={styles.muted}>{money(orderLines[0]?.price ?? 0)}</Text>
                </View>
                <View style={styles.stepper} accessibilityLabel={c.quantity}>
                  <Pressable
                    style={styles.stepBtn}
                    disabled={quantity <= 1}
                    accessibilityRole="button"
                    onPress={() => setQuantity(value => Math.max(1, value - 1))}>
                    <Icon name="remove" size={16} color={styles.c.text} />
                  </Pressable>
                  <Text style={styles.qty}>{quantity}</Text>
                  <Pressable
                    style={styles.stepBtn}
                    disabled={quantity >= maxQuantity}
                    accessibilityRole="button"
                    onPress={() => setQuantity(value => Math.min(maxQuantity, value + 1))}>
                    <Icon name="add" size={16} color={styles.c.text} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.itemBox}>
                <View style={{flex: 1, gap: 2}}>
                  {orderLines.map(line => (
                    <View key={`${line.productId}:${line.variantId ?? ''}`} style={styles.lineRow}>
                      <Text style={[styles.itemName, {flex: 1}]} numberOfLines={1}>
                        {line.name}
                        {line.variantLabel ? ` · ${line.variantLabel}` : ''}
                        <Text style={styles.muted}> × {line.quantity}</Text>
                      </Text>
                      <Text style={styles.muted}>{money(line.price * line.quantity)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Field label={t.fullName} value={name} onChangeText={setName} autoComplete="name" />
            <Field
              label={t.phone}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <Field
              label={t.deliveryAddress}
              value={address}
              onChangeText={setAddress}
              multiline
              autoComplete="street-address"
            />

            {delivery.zones.length > 0 && (
              <View style={{gap: spacing.xs}}>
                <Text style={styles.label}>{c.zone}</Text>
                <ZonePicker zones={delivery.zones} value={zoneId} onChange={setZoneId} />
              </View>
            )}

            <View style={{gap: spacing.xs}}>
              <Text style={styles.label}>{t.paymentMethod}</Text>
              <Radio label={t.payCash} active={payment === 'cash'} onPress={() => setPayment('cash')} />
              {transferEnabled && (
                <Radio
                  label={c.payTransfer}
                  active={payment === 'transfer'}
                  onPress={() => setPayment('transfer')}
                />
              )}
              {payment === 'transfer' && <Text style={styles.hint}>{c.transferHint}</Text>}
            </View>

            <View style={styles.totals}>
              <View style={styles.lineRow}>
                <Text style={styles.muted}>{c.delivery}</Text>
                <Text style={styles.muted}>{fee > 0 ? money(fee) : c.free}</Text>
              </View>
              {gap && gap.remaining > 0 && (
                <Text style={styles.gap}>{fill(c.freeDeliveryLeft, {amount: money(gap.remaining)})}</Text>
              )}
              <View style={styles.lineRow}>
                <Text style={styles.total}>{c.total}</Text>
                <Text style={styles.total}>{money(subtotal + fee)}</Text>
              </View>
            </View>

            {!!error && (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {error}
              </Text>
            )}
            {belowMinimum && (
              <Text style={styles.warning}>{fill(c.minOrder, {amount: money(minOrderAmount)})}</Text>
            )}
            {overLimit && <Text style={styles.warning}>{fill(c.guestLimit, {lines: MAX_GUEST_ITEMS})}</Text>}

            <Button
              title={busy ? c.sending : c.submitQuick}
              onPress={submit}
              loading={busy}
              disabled={belowMinimum || overLimit || orderLines.length === 0}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Yetkazish hududi tanlovi (checkout'da ham ishlatiladi). */
export function ZonePicker({
  zones,
  value,
  onChange,
}: {
  zones: CheckoutDelivery['zones'];
  value: string;
  onChange: (zoneId: string) => void;
}) {
  const {c, money} = useCheckoutI18n();
  return (
    <View style={{gap: 2}}>
      <Radio label={c.zoneNone} active={value === ''} onPress={() => onChange('')} />
      {zones.map(zone => (
        <Radio
          key={zone.id}
          label={`${zone.name} — ${zone.fee > 0 ? money(zone.fee) : c.free}`}
          active={value === zone.id}
          onPress={() => onChange(zone.id)}
        />
      ))}
    </View>
  );
}

/** Radio qatori — checkout'dagi to'lov tanlovi bilan bir xil ko'rinish. */
export function Radio({label, active, onPress}: {label: string; active: boolean; onPress: () => void}) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      style={styles.radioRow}
      accessibilityRole="radio"
      accessibilityState={{selected: active}}>
      <View style={[styles.radio, active && styles.radioActive]} />
      <Text style={{color: styles.c.text, flex: 1}}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(c => ({
  backdrop: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)'},
  dismiss: {flex: 1},
  sheet: {
    maxHeight: '90%',
    backgroundColor: c.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: c.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {fontSize: 18, fontWeight: '800', color: c.text},
  subtitle: {fontSize: 13, color: c.muted},
  body: {padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md},
  itemBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: c.surfaceAlt,
  },
  itemName: {color: c.text, fontSize: 14},
  muted: {color: c.muted, fontSize: 13},
  label: {color: c.muted, fontSize: 13},
  hint: {color: c.muted, fontSize: 12},
  lineRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm},
  stepper: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: {minWidth: 28, textAlign: 'center', color: c.text, fontWeight: '700'},
  totals: {borderTopWidth: 1, borderTopColor: c.border, paddingTop: spacing.sm, gap: 4},
  gap: {color: c.accent, fontSize: 12},
  total: {color: c.text, fontSize: 16, fontWeight: '800'},
  error: {color: c.danger, fontSize: 13},
  warning: {color: c.danger, fontSize: 13},
  radioRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6},
  radio: {width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: c.border},
  radioActive: {borderColor: c.accent, backgroundColor: c.accent},
}));

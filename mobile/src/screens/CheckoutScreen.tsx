import React, {useEffect, useState} from 'react';
import {ScrollView, Text, View, Pressable} from 'react-native';
import {makeStyles, radius, spacing} from '../theme';
import {useI18n} from '../i18n';
import {useAppDispatch, useAppSelector} from '../store';
import {clearCart} from '../store/cartSlice';
import {Button, Field} from '../components/ui';
import {
  createOrder,
  deliveryFeeFor,
  fetchDeliverySettings,
  validatePromo,
  type DeliverySettings,
} from '../api';
import {useAuth} from '../auth';
import type {StackScreenProps} from '../navigation/types';
import {useToast} from '../components/Toast';

/**
 * Buyurtmani rasmiylashtirish. Hisob faqat ko'rsatish uchun - yakuniy
 * summani server (createOrder) o'zi qayta chiqaradi.
 */
export function CheckoutScreen({navigation}: StackScreenProps<'Buyurtma'>) {
  const styles = useStyles();
  const toast = useToast();
  const {t, money} = useI18n();
  const dispatch = useAppDispatch();
  const items = useAppSelector(s => s.cart.items);
  const {user} = useAuth();

  const [name, setName] = useState(user?.displayName ?? '');
  const [phone, setPhone] = useState(user?.phoneNumber ?? '');
  const [address, setAddress] = useState(user?.homeAddress ?? '');
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<{code: string; discount: number} | null>(null);
  const [delivery, setDelivery] = useState<DeliverySettings>({fee: 0, freeFrom: 0, enabled: false});
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchDeliverySettings()
      .then(setDelivery)
      .catch(() => {});
  }, []);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount = promo?.discount ?? 0;
  const deliveryFee = deliveryFeeFor(delivery, subtotal - discount);
  const total = subtotal - discount + deliveryFee;

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code) return;
    try {
      const result = await validatePromo(code, subtotal);
      setPromo({code: result.code, discount: result.discount});
    } catch (error) {
      setPromo(null);
      toast.error(error instanceof Error ? error.message : t.error);
    }
  };

  const submit = async () => {
    if (!user) {
      toast.error(t.loginToOrder);
      navigation.navigate('Tabs', {screen: 'Profil'});
      return;
    }
    if (name.trim().length < 2) {
      toast.error(t.nameTooShort);
      return;
    }
    if (phone.replace(/\D/g, '').length < 9) {
      toast.error(t.phoneInvalid);
      return;
    }

    setBusy(true);
    try {
      const {orderId} = await createOrder({
        customerName: name.trim(),
        phoneNumber: phone.trim(),
        items,
        deliveryAddress: address.trim() || null,
        location: null,
        paymentMethod,
        promoCode: promo?.code ?? null,
      });
      dispatch(clearCart());
      toast.success(t.orderNumber(orderId.slice(0, 8)));
      navigation.navigate('Buyurtmalarim');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.orderFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{padding: spacing.lg, gap: spacing.md}}>
      <Field label={t.fullName} value={name} onChangeText={setName} />
      <Field
        label={t.phone}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+998901234567"
      />
      <Field label={t.deliveryAddress} value={address} onChangeText={setAddress} multiline />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.paymentMethod}</Text>
        {(['cash', 'online'] as const).map(method => (
          <Pressable key={method} onPress={() => setPaymentMethod(method)} style={styles.radioRow}>
            <View style={[styles.radio, paymentMethod === method && styles.radioActive]} />
            <Text style={{color: styles.c.text}}>
              {method === 'cash' ? t.payCash : t.payOnline}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.promo}</Text>
        {promo ? (
          <View style={{gap: spacing.sm}}>
            <Text style={{color: styles.c.success}}>{t.promoApplied(promo.code)}</Text>
            <Button title={t.cancel} variant="outline" onPress={() => setPromo(null)} />
          </View>
        ) : (
          <View style={{gap: spacing.sm}}>
            <Field
              label={t.promoCode}
              value={promoInput}
              onChangeText={text => setPromoInput(text.toUpperCase())}
              autoCapitalize="characters"
            />
            <Button title={t.apply} variant="outline" onPress={applyPromo} />
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Row label={t.itemsTotal} value={money(subtotal)} />
        {discount > 0 && <Row label={t.discount} value={`−${money(discount)}`} />}
        {delivery.enabled && delivery.fee > 0 && (
          <Row label={t.deliveryFee} value={deliveryFee > 0 ? money(deliveryFee) : t.free} />
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t.total}</Text>
          <Text style={styles.total}>{money(total)}</Text>
        </View>
      </View>

      <Button title={t.confirmOrder} onPress={submit} loading={busy} />
    </ScrollView>
  );
}

function Row({label, value}: {label: string; value: string}) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={{color: styles.c.muted}}>{label}</Text>
      <Text style={{color: styles.c.text}}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles(c => ({
  screen: {flex: 1, backgroundColor: c.bg},
  card: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: c.surface,
  },
  cardTitle: {fontWeight: '700', color: c.text},
  row: {flexDirection: 'row', justifyContent: 'space-between'},
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: spacing.sm,
  },
  totalLabel: {fontWeight: '700', color: c.text},
  total: {fontWeight: '800', fontSize: 18, color: c.text},
  radioRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6},
  radio: {width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: c.border},
  radioActive: {borderColor: c.accent, backgroundColor: c.accent},
}));

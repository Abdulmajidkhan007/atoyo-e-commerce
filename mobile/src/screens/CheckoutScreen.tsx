import React, {useEffect, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, View, Pressable} from 'react-native';
import {colors, formatSom, radius, spacing} from '../theme';
import {useAppDispatch, useAppSelector} from '../store';
import {clearCart} from '../store/cartSlice';
import {Button, Field} from '../components/ui';
import {createOrder, deliveryFeeFor, fetchDeliverySettings, validatePromo, type DeliverySettings} from '../api';
import {useAuth} from '../auth';
import type {StackScreenProps} from '../navigation/types';

/**
 * Buyurtmani rasmiylashtirish. Hisob faqat ko'rsatish uchun - yakuniy
 * summani server (createOrder) o'zi qayta chiqaradi.
 */
export function CheckoutScreen({navigation}: StackScreenProps<'Buyurtma'>) {
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
    fetchDeliverySettings().then(setDelivery).catch(() => {});
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
      Alert.alert('Promokod', error instanceof Error ? error.message : 'Promokod ishlamadi.');
    }
  };

  const submit = async () => {
    if (!user) {
      Alert.alert('Buyurtma', 'Buyurtma berish uchun avval tizimga kiring.');
      navigation.navigate('Tabs', {screen: 'Profil'});
      return;
    }
    if (name.trim().length < 2) {
      Alert.alert('Ism', "To'liq ism-familiyangizni kiriting.");
      return;
    }
    if (phone.replace(/\D/g, '').length < 9) {
      Alert.alert('Telefon', 'Telefon raqamni to‘g‘ri kiriting.');
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
      Alert.alert('Qabul qilindi', `Buyurtma raqami: #${orderId.slice(0, 8)}`);
      navigation.navigate('Buyurtmalarim');
    } catch (error) {
      Alert.alert('Xatolik', error instanceof Error ? error.message : 'Buyurtma yuborilmadi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{padding: spacing.lg, gap: spacing.md}}>
      <Field label="Ism-familiya" value={name} onChangeText={setName} />
      <Field label="Telefon raqami" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+998901234567" />
      <Field label="Yetkazish manzili" value={address} onChangeText={setAddress} multiline />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>To&apos;lov usuli</Text>
        {(['cash', 'online'] as const).map(method => (
          <Pressable
            key={method}
            onPress={() => setPaymentMethod(method)}
            style={styles.radioRow}>
            <View style={[styles.radio, paymentMethod === method && styles.radioActive]} />
            <Text style={{color: colors.navy}}>
              {method === 'cash' ? 'Naqd — yetkazilganda' : 'Onlayn — karta orqali'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Promokod</Text>
        {promo ? (
          <View style={{gap: spacing.sm}}>
            <Text style={{color: colors.success}}>✅ {promo.code} qo&apos;llandi</Text>
            <Button title="Bekor qilish" variant="outline" onPress={() => setPromo(null)} />
          </View>
        ) : (
          <View style={{gap: spacing.sm}}>
            <Field label="Kod" value={promoInput} onChangeText={t => setPromoInput(t.toUpperCase())} autoCapitalize="characters" />
            <Button title="Qo'llash" variant="outline" onPress={applyPromo} />
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Row label="Mahsulotlar" value={formatSom(subtotal)} />
        {discount > 0 && <Row label="Chegirma" value={`−${formatSom(discount)}`} />}
        {delivery.enabled && delivery.fee > 0 && (
          <Row label="Yetkazib berish" value={deliveryFee > 0 ? formatSom(deliveryFee) : 'Bepul'} />
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Jami</Text>
          <Text style={styles.total}>{formatSom(total)}</Text>
        </View>
      </View>

      <Button title="Buyurtmani tasdiqlash" onPress={submit} loading={busy} />
    </ScrollView>
  );
}

function Row({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.row}>
      <Text style={{color: colors.muted}}>{label}</Text>
      <Text style={{color: colors.navy}}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {fontWeight: '700', color: colors.navy},
  row: {flexDirection: 'row', justifyContent: 'space-between'},
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  totalLabel: {fontWeight: '700', color: colors.navy},
  total: {fontWeight: '800', fontSize: 18, color: colors.navy},
  radioRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6},
  radio: {width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border},
  radioActive: {borderColor: colors.gold, backgroundColor: colors.gold},
});

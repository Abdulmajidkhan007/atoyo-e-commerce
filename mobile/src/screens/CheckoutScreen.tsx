import React, {useEffect, useState} from 'react';
import {ScrollView, Text, View} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import {makeStyles, radius, spacing} from '../theme';
import {useI18n} from '../i18n';
import {useAppDispatch, useAppSelector} from '../store';
import {clearCart} from '../store/cartSlice';
import {Button, Field} from '../components/ui';
import {validatePromo} from '../api';
import {
  fetchCheckoutDelivery,
  fetchTransferCard,
  saveOrderAccess,
  submitOrder,
  type CheckoutDelivery,
  type PaymentChoice,
} from '../checkout-api';
import {deliveryFeeForZone} from '../delivery-text';
import {useCheckoutI18n} from '../checkout-i18n';
import {QuickBuySheet, Radio, ZonePicker} from '../components/QuickBuySheet';
import {useAuth} from '../auth';
import type {Order} from '../types';
import type {StackScreenProps} from '../navigation/types';
import {useToast} from '../components/Toast';
import {DeliveryNote} from '../components/DeliveryNote';
import {writeOrderWidget} from '../widgets';

/**
 * Buyurtmani rasmiylashtirish. Hisob faqat ko'rsatish uchun - yakuniy
 * summani server (createOrder) o'zi qayta chiqaradi.
 *
 * To'lov usullari: naqd, onlayn va KARTAGA O'TKAZMA (faqat
 * `/api/payment-info` da yoqilgan bo'lsa). Hududlar bo'lsa — tanlov.
 * Kirmagan mijozga: "Ro'yxatdan o'tmasdan buyurtma berish" (butun savat
 * `/api/orders/quick` ga) yoki hisobga kirish. O'tkazmada buyurtmadan
 * keyin to'lov ekrani (karta + chek) ochiladi.
 */
export function CheckoutScreen({navigation}: StackScreenProps<'Buyurtma'>) {
  const styles = useStyles();
  const toast = useToast();
  const {t, money} = useI18n();
  const {c} = useCheckoutI18n();
  const dispatch = useAppDispatch();
  const items = useAppSelector(s => s.cart.items);
  const {user} = useAuth();

  const [name, setName] = useState(user?.displayName ?? '');
  const [phone, setPhone] = useState(user?.phoneNumber ?? '');
  const [address, setAddress] = useState(user?.homeAddress ?? '');
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<{code: string; discount: number} | null>(null);
  const [delivery, setDelivery] = useState<CheckoutDelivery>({fee: 0, freeFrom: 0, enabled: false, zones: []});
  const [paymentMethod, setPaymentMethod] = useState<PaymentChoice>('cash');
  const [transferEnabled, setTransferEnabled] = useState(false);
  const [zoneId, setZoneId] = useState('');
  const [guestOpen, setGuestOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetchCheckoutDelivery()
      .then(found => {
        if (active) setDelivery(found);
      })
      .catch(() => {});
    // O'tkazma faqat sozlamada yoqilgan bo'lsa ko'rinadi.
    fetchTransferCard().then(card => {
      if (active) setTransferEnabled(card !== null);
    });
    return () => {
      active = false;
    };
  }, []);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount = promo?.discount ?? 0;
  const deliveryFee = deliveryFeeForZone(delivery, subtotal - discount, zoneId || null);
  const methods: PaymentChoice[] = transferEnabled ? ['cash', 'transfer', 'online'] : ['cash', 'online'];
  const methodLabel = (method: PaymentChoice) =>
    method === 'cash' ? t.payCash : method === 'transfer' ? c.payTransfer : t.payOnline;
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
      const method = paymentMethod === 'transfer' && !transferEnabled ? 'cash' : paymentMethod;
      const {orderId, accessToken} = await submitOrder({
        customerName: name.trim(),
        phoneNumber: phone.trim(),
        items,
        deliveryAddress: address.trim() || null,
        paymentMethod: method,
        promoCode: promo?.code ?? null,
        deliveryZoneId: zoneId || null,
      });
      dispatch(clearCart());
      await saveOrderAccess(orderId, accessToken);
      toast.success(t.orderNumber(orderId.slice(0, 8)));
      if (method === 'transfer') {
        // Karta raqami va chek yuklash — summa serverdan o'qiladi.
        navigation.replace('Tolov', {orderId, accessToken});
      } else {
        navigation.navigate('Buyurtmalarim');
      }

      // Widget uchun - narx serverda qayta hisoblangani uchun hujjatning
      // o'zi o'qiladi, mahalliy hisoblangan `total` ishlatilmaydi.
      firestore()
        .collection('orders')
        .doc(orderId)
        .get()
        .then(doc => {
          if (doc.exists) writeOrderWidget({id: doc.id, ...doc.data()} as Order);
        })
        .catch(() => {});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.orderFailed);
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    // KIRMAGAN MIJOZ: butun savat ro'yxatdan o'tmasdan (saytdagi kabi)
    // yoki hisobga kirib odatdagi buyurtma.
    return (
      <ScrollView style={styles.screen} contentContainerStyle={{padding: spacing.lg, gap: spacing.md}}>
        <View style={styles.card}>
          <Row label={t.itemsTotal} value={money(subtotal)} />
          <Text style={{color: styles.c.muted, fontSize: 13}}>{c.guestCheckoutHint}</Text>
        </View>
        <DeliveryNote />
        <Button title={c.guestCheckout} icon="send" onPress={() => setGuestOpen(true)} disabled={items.length === 0} />
        <Button
          title={c.orLogin}
          variant="outline"
          onPress={() => navigation.navigate('Tabs', {screen: 'Profil'})}
        />
        <QuickBuySheet
          visible={guestOpen}
          onClose={() => setGuestOpen(false)}
          lines={items}
          onDone={result => {
            setGuestOpen(false);
            dispatch(clearCart());
            if (!result) {
              toast.success(c.orderReceivedShort);
              navigation.navigate('Tabs', {screen: 'Home'});
              return;
            }
            navigation.replace('Tolov', {orderId: result.orderId, accessToken: result.accessToken});
          }}
        />
      </ScrollView>
    );
  }

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
      {/* Manzil yozilishidan oldin bepul hudud aytiladi. */}
      <DeliveryNote />

      <Field label={t.deliveryAddress} value={address} onChangeText={setAddress} multiline />

      {delivery.zones.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{c.zone}</Text>
          <ZonePicker zones={delivery.zones} value={zoneId} onChange={setZoneId} />
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.paymentMethod}</Text>
        {methods.map(method => (
          <Radio
            key={method}
            label={methodLabel(method)}
            active={paymentMethod === method}
            onPress={() => setPaymentMethod(method)}
          />
        ))}
        {paymentMethod === 'transfer' && (
          <Text style={{color: styles.c.muted, fontSize: 12}}>{c.transferHint}</Text>
        )}
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
        {delivery.enabled && (delivery.fee > 0 || delivery.zones.length > 0) && (
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
}));

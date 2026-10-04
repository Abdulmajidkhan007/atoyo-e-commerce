import React, {useEffect, useState} from 'react';
import {FlatList, Linking, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {makeStyles, radius, spacing} from '../theme';
import {useI18n} from '../i18n';
import type {Order} from '../types';
import {subscribeToMyOrders} from '../firebase';
import {cancelOrder, receiptUrl} from '../api';
import {Button, EmptyState, Loading} from '../components/ui';
import {useAuth} from '../auth';
import {useToast} from '../components/Toast';
import {listSavedOrders} from '../checkout-api';
import {useCheckoutI18n, fill} from '../checkout-i18n';

/** Buyurtmalarim - real vaqtda yangilanadi (status o'zgarishi darhol ko'rinadi). */
export function OrdersScreen() {
  const styles = useStyles();
  const toast = useToast();
  const {t, money, locale} = useI18n();
  const {user} = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const navigation = useNavigation();
  const {c} = useCheckoutI18n();
  /** Kirmagan mijoz: shu qurilmadan berilgan buyurtmalar (to'lov ekraniga). */
  const [saved, setSaved] = useState<{orderId: string; savedAt: number}[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeToMyOrders(user.uid, setOrders);
  }, [user]);

  useEffect(() => {
    if (user) return;
    listSavedOrders().then(setSaved);
  }, [user]);

  if (!user) {
    if (saved.length === 0) return <EmptyState text={t.loginToSeeOrders} />;
    return (
      <FlatList
        style={styles.screen}
        data={saved}
        keyExtractor={item => item.orderId}
        contentContainerStyle={{padding: spacing.md, gap: spacing.sm}}
        ListHeaderComponent={<Text style={styles.date}>{t.loginToSeeOrders}</Text>}
        renderItem={({item}) => (
          <View style={styles.card}>
            <Text style={styles.number}>{fill(c.orderNumber, {id: item.orderId.slice(0, 8)})}</Text>
            <Button
              title={c.payForOrder}
              variant="outline"
              onPress={() => navigation.navigate('Tolov', {orderId: item.orderId})}
            />
          </View>
        )}
      />
    );
  }
  if (!orders) return <Loading />;
  if (orders.length === 0) return <EmptyState text={t.noOrders} />;

  const handleCancel = async (order: Order) => {
    setBusyId(order.id);
    try {
      await cancelOrder(order.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.error);
    } finally {
      setBusyId(null);
    }
  };

  const dateLocale = locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US';

  return (
    <FlatList
      style={styles.screen}
      data={orders}
      keyExtractor={item => item.id}
      contentContainerStyle={{padding: spacing.md, gap: spacing.sm}}
      renderItem={({item}) => (
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.number}>#{item.id.slice(0, 8)}</Text>
            <Text style={styles.status}>{t.statusLabels[item.status]}</Text>
          </View>
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleString(dateLocale)}</Text>

          {item.items.map(line => (
            <Text key={line.productId} style={styles.line}>
              • {line.name} × {line.quantity}
            </Text>
          ))}

          <Text style={styles.total}>{money(item.totalAmount)}</Text>

          {/* O'tkazma hali tasdiqlanmagan — karta va chek yuklash ekrani. */}
          {item.paymentMethod === 'transfer' &&
            item.paymentStatus !== 'paid' &&
            item.status !== 'cancelled' && (
              <Button
                title={c.payForOrder}
                icon="receipt"
                onPress={() => navigation.navigate('Tolov', {orderId: item.id})}
              />
            )}

          <Button
            title={t.openReceipt}
            variant="outline"
            onPress={() => Linking.openURL(receiptUrl(item.id))}
          />

          {(item.status === 'pending' || item.status === 'approved') && (
            <Button
              title={t.cancelOrder}
              variant="outline"
              loading={busyId === item.id}
              onPress={() => handleCancel(item)}
            />
          )}
        </View>
      )}
    />
  );
}

const useStyles = makeStyles(c => ({
  screen: {flex: 1, backgroundColor: c.bg},
  card: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
    backgroundColor: c.surface,
  },
  head: {flexDirection: 'row', justifyContent: 'space-between'},
  number: {fontWeight: '700', color: c.text},
  status: {color: c.accent, fontWeight: '600'},
  date: {color: c.muted, fontSize: 12},
  line: {color: c.text, fontSize: 13},
  total: {fontWeight: '700', color: c.text, marginTop: 4, marginBottom: spacing.xs},
}));

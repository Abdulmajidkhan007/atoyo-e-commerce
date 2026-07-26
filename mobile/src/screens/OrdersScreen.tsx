import React, {useEffect, useState} from 'react';
import {Alert, FlatList, StyleSheet, Text, View} from 'react-native';
import {colors, formatSom, radius, spacing} from '../theme';
import {STATUS_LABELS, type Order} from '../types';
import {subscribeToMyOrders} from '../firebase';
import {cancelOrder} from '../api';
import {Button, EmptyState, Loading} from '../components/ui';
import {useAuth} from '../auth';

/** Buyurtmalarim - real vaqtda yangilanadi (status o'zgarishi darhol ko'rinadi). */
export function OrdersScreen() {
  const {user} = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeToMyOrders(user.uid, setOrders);
  }, [user]);

  if (!user) return <EmptyState text="Buyurtmalarni ko'rish uchun tizimga kiring." />;
  if (!orders) return <Loading />;
  if (orders.length === 0) return <EmptyState text="Hozircha buyurtmalaringiz yo'q." />;

  const handleCancel = async (order: Order) => {
    setBusyId(order.id);
    try {
      await cancelOrder(order.id);
    } catch (error) {
      Alert.alert('Xatolik', error instanceof Error ? error.message : 'Bekor qilinmadi.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <FlatList
      data={orders}
      keyExtractor={item => item.id}
      contentContainerStyle={{padding: spacing.md, gap: spacing.sm}}
      renderItem={({item}) => (
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.number}>#{item.id.slice(0, 8)}</Text>
            <Text style={styles.status}>{STATUS_LABELS[item.status]}</Text>
          </View>
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleString('uz-UZ')}</Text>

          {item.items.map(line => (
            <Text key={line.productId} style={styles.line}>
              • {line.name} × {line.quantity}
            </Text>
          ))}

          <Text style={styles.total}>{formatSom(item.totalAmount)}</Text>

          {(item.status === 'pending' || item.status === 'approved') && (
            <Button
              title="Buyurtmani bekor qilish"
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

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  head: {flexDirection: 'row', justifyContent: 'space-between'},
  number: {fontWeight: '700', color: colors.navy},
  status: {color: colors.goldDark, fontWeight: '600'},
  date: {color: colors.muted, fontSize: 12},
  line: {color: colors.navy, fontSize: 13},
  total: {fontWeight: '700', color: colors.navy, marginTop: 4},
});

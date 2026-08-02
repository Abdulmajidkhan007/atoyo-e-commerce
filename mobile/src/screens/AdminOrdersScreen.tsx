import React, {useEffect, useState} from 'react';
import {FlatList, Pressable, Text, View} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import {makeStyles, radius, spacing} from '../theme';
import {useI18n} from '../i18n';
import {adminSetOrderStatus} from '../api';
import {useToast} from '../components/Toast';
import {EmptyState, Loading} from '../components/ui';
import type {Order, OrderStatus} from '../types';
import type {StackScreenProps} from '../navigation/types';
import {Icon, type IconName} from '../components/Icon';

/**
 * ADMIN: BUYURTMALAR.
 *
 * Ro'yxat to'g'ridan-to'g'ri Firestore'dan real-vaqtda o'qiladi
 * (xavfsizlik qoidalari adminlarga ruxsat beradi), status esa saytning
 * API'si orqali o'zgartiriladi - shunda zaxira qaytarish, mijozga xabar
 * va guruhdagi post yangilanishi bir joyda, sayt bilan bir xil bo'ladi.
 */

const FLOW: {status: OrderStatus; label: string; icon: IconName}[] = [
  {status: 'approved', label: 'Qabul qilish', icon: 'checkCircle'},
  {status: 'delivering', label: 'Yetkazishda', icon: 'truck'},
  {status: 'completed', label: 'Yakunlandi', icon: 'done'},
  {status: 'cancelled', label: 'Bekor qilish', icon: 'cancel'},
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Yangi',
  approved: 'Qabul qilindi',
  delivering: 'Yetkazilmoqda',
  completed: 'Yakunlandi',
  cancelled: 'Bekor qilindi',
};

/** Holat yorlig'i yonidagi ikonka (saytdagi buyurtmalar jadvali kabi). */
const STATUS_ICONS: Record<OrderStatus, IconName> = {
  pending: 'clock',
  approved: 'checkCircle',
  delivering: 'truck',
  completed: 'done',
  cancelled: 'cancel',
};

export function AdminOrdersScreen(_props: StackScreenProps<'AdminBuyurtmalar'>) {
  const styles = useStyles();
  const toast = useToast();
  const {money} = useI18n();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(60)
      .onSnapshot(
        snap => setOrders(snap.docs.map(d => ({id: d.id, ...d.data()}) as Order)),
        () => setOrders([]),
      );
    return unsubscribe;
  }, []);

  const setStatus = async (orderId: string, status: OrderStatus) => {
    setBusyId(orderId);
    try {
      await adminSetOrderStatus(orderId, status);
      toast.success(STATUS_LABELS[status]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Xatolik');
    } finally {
      setBusyId(null);
    }
  };

  if (!orders) return <Loading />;

  const visible =
    filter === 'active'
      ? orders.filter(o => o.status === 'pending' || o.status === 'approved' || o.status === 'delivering')
      : orders;

  return (
    <View style={styles.screen}>
      <View style={styles.tabs}>
        {(['active', 'all'] as const).map(key => (
          <Pressable
            key={key}
            onPress={() => setFilter(key)}
            style={[styles.tab, filter === key && styles.tabOn]}>
            <Text style={[styles.tabText, filter === key && styles.tabTextOn]}>
              {key === 'active' ? 'Jarayonda' : 'Hammasi'}
            </Text>
          </Pressable>
        ))}
      </View>

      {visible.length === 0 ? (
        <EmptyState text="Buyurtma yo'q" />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={item => item.id}
          contentContainerStyle={{padding: spacing.md, gap: spacing.md}}
          renderItem={({item}) => (
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.customer}>{item.customerName}</Text>
                <View style={styles.statusRow}>
                  <Icon name={STATUS_ICONS[item.status]} size={15} color={styles.c.muted} />
                  <Text style={styles.status}>{STATUS_LABELS[item.status]}</Text>
                </View>
              </View>
              <Text style={styles.muted}>{item.phoneNumber}</Text>
              {!!item.deliveryAddress && <Text style={styles.muted}>{item.deliveryAddress}</Text>}

              <View style={styles.items}>
                {item.items.map((line, index) => (
                  <Text key={`${line.productId}-${index}`} style={styles.line}>
                    • {line.name}
                    {line.variantLabel ? ` (${line.variantLabel})` : ''} — {line.quantity} ×{' '}
                    {money(line.price)}
                  </Text>
                ))}
              </View>

              <Text style={styles.total}>{money(item.totalAmount)}</Text>

              <View style={styles.actions}>
                {FLOW.filter(step => step.status !== item.status).map(step => (
                  <Pressable
                    key={step.status}
                    disabled={busyId === item.id}
                    onPress={() => setStatus(item.id, step.status)}
                    style={[styles.action, step.status === 'cancelled' && styles.actionDanger]}>
                    <Icon
                      name={step.icon}
                      size={16}
                      color={step.status === 'cancelled' ? styles.c.danger : styles.c.text}
                    />
                    <Text
                      style={[
                        styles.actionText,
                        step.status === 'cancelled' && styles.actionTextDanger,
                      ]}>
                      {step.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles(c => ({
  screen: {flex: 1, backgroundColor: c.bg},
  tabs: {flexDirection: 'row', gap: spacing.sm, padding: spacing.md},
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
  },
  tabOn: {backgroundColor: c.accent, borderColor: c.accent},
  tabText: {color: c.text, fontWeight: '600', fontSize: 13},
  tabTextOn: {color: c.onAccent},
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
    gap: 4,
  },
  cardHead: {flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm},
  customer: {color: c.text, fontWeight: '700', fontSize: 15, flex: 1},
  status: {color: c.muted, fontSize: 12},
  muted: {color: c.muted, fontSize: 13},
  items: {marginTop: spacing.xs, gap: 2},
  line: {color: c.text, fontSize: 13},
  total: {color: c.text, fontWeight: '800', fontSize: 16, marginTop: spacing.xs},
  actions: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm},
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  actionDanger: {borderColor: c.danger},
  statusRow: {flexDirection: 'row', alignItems: 'center', gap: 5},
  actionText: {color: c.text, fontSize: 12, fontWeight: '600'},
  actionTextDanger: {color: c.danger},
}));

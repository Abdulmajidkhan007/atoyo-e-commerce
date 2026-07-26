import React from 'react';
import {FlatList, Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {colors, formatSom, radius, spacing} from '../theme';
import {useAppDispatch, useAppSelector} from '../store';
import {clearCart, removeItem, setQuantity} from '../store/cartSlice';
import {Button, EmptyState} from '../components/ui';
import type {TabScreenProps} from '../navigation/types';

/** Savat: soni +/−, o'chirish va rasmiylashtirishga o'tish. */
export function CartScreen({navigation}: TabScreenProps<'Savat'>) {
  const dispatch = useAppDispatch();
  const items = useAppSelector(s => s.cart.items);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  if (items.length === 0) {
    return (
      <View style={{flex: 1}}>
        <EmptyState text="Savatingiz hozircha bo'sh." />
        <View style={{padding: spacing.lg}}>
          <Button title="Katalogga o'tish" onPress={() => navigation.navigate('Katalog', {})} />
        </View>
      </View>
    );
  }

  return (
    <View style={{flex: 1}}>
      <FlatList
        data={items}
        keyExtractor={item => item.productId}
        contentContainerStyle={{padding: spacing.md, gap: spacing.sm}}
        renderItem={({item}) => (
          <View style={styles.row}>
            <Pressable onPress={() => navigation.navigate('Mahsulot', {productId: item.productId})}>
              {item.thumbnailUrl ? (
                <Image source={{uri: item.thumbnailUrl}} style={styles.thumb} alt={item.name} />
              ) : (
                <View style={styles.thumb} />
              )}
            </Pressable>

            <View style={{flex: 1, gap: 4}}>
              <Text numberOfLines={2} style={styles.name}>
                {item.name}
              </Text>
              <Text style={styles.price}>{formatSom(item.price * item.quantity)}</Text>

              <View style={styles.qtyRow}>
                <Pressable
                  style={styles.qtyBtn}
                  onPress={() =>
                    dispatch(setQuantity({productId: item.productId, quantity: item.quantity - 1}))
                  }>
                  <Text style={styles.qtyBtnText}>−</Text>
                </Pressable>
                <Text style={styles.qty}>{item.quantity}</Text>
                <Pressable
                  style={styles.qtyBtn}
                  onPress={() =>
                    dispatch(setQuantity({productId: item.productId, quantity: item.quantity + 1}))
                  }>
                  <Text style={styles.qtyBtnText}>+</Text>
                </Pressable>

                <Pressable
                  style={{marginLeft: 'auto'}}
                  onPress={() => dispatch(removeItem({productId: item.productId}))}>
                  <Text style={{fontSize: 18}}>🗑</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Jami</Text>
          <Text style={styles.total}>{formatSom(subtotal)}</Text>
        </View>
        <Button title="Rasmiylashtirish" onPress={() => navigation.navigate('Buyurtma')} />
        <Button title="Savatni tozalash" variant="outline" onPress={() => dispatch(clearCart())} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  thumb: {width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.bgAlt},
  name: {color: colors.navy, fontWeight: '600'},
  price: {color: colors.navy, fontWeight: '700'},
  qtyRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {fontSize: 18, color: colors.navy},
  qty: {minWidth: 24, textAlign: 'center', color: colors.navy, fontWeight: '600'},
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.white,
  },
  totalRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  totalLabel: {color: colors.muted},
  total: {fontSize: 20, fontWeight: '800', color: colors.navy},
});

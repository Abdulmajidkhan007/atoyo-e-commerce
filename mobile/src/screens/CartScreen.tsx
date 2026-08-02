import React from 'react';
import {FlatList, Image, Pressable, Text, View} from 'react-native';
import {makeStyles, radius, spacing} from '../theme';
import {useI18n} from '../i18n';
import {useAppDispatch, useAppSelector} from '../store';
import {clearCart, removeItem, setQuantity} from '../store/cartSlice';
import {Button, EmptyState} from '../components/ui';
import type {TabScreenProps} from '../navigation/types';
import {Icon} from '../components/Icon';

/** Savat: soni +/−, o'chirish va rasmiylashtirishga o'tish. */
export function CartScreen({navigation}: TabScreenProps<'Savat'>) {
  const styles = useStyles();
  const {t, money} = useI18n();
  const dispatch = useAppDispatch();
  const items = useAppSelector(s => s.cart.items);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  if (items.length === 0) {
    return (
      <View style={styles.screen}>
        <EmptyState text={t.cartEmpty} />
        <View style={{padding: spacing.lg}}>
          <Button title={t.goToCatalog} onPress={() => navigation.navigate('Katalog', {})} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={item => `${item.productId}:${item.variantId ?? ''}`}
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
              {/* Tanlangan tur (o'lcham/rang) - saytdagi savat kabi. */}
              {!!item.variantLabel && <Text style={styles.variantLabel}>{item.variantLabel}</Text>}
              <Text style={styles.price}>{money(item.price * item.quantity)}</Text>

              <View style={styles.qtyRow}>
                <Pressable
                  style={styles.qtyBtn}
                  onPress={() =>
                    dispatch(setQuantity({productId: item.productId, variantId: item.variantId, quantity: item.quantity - 1}))
                  }>
                  <Icon name="remove" size={16} color={styles.c.text} />
                </Pressable>
                <Text style={styles.qty}>{item.quantity}</Text>
                <Pressable
                  style={styles.qtyBtn}
                  onPress={() =>
                    dispatch(setQuantity({productId: item.productId, variantId: item.variantId, quantity: item.quantity + 1}))
                  }>
                  <Icon name="add" size={16} color={styles.c.text} />
                </Pressable>

                <Pressable
                  style={{marginLeft: 'auto'}}
                  onPress={() => dispatch(removeItem({productId: item.productId, variantId: item.variantId}))}>
                  <Icon name="trash" size={20} color={styles.c.danger} />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t.total}</Text>
          <Text style={styles.total}>{money(subtotal)}</Text>
        </View>
        <Button title={t.checkout} onPress={() => navigation.navigate('Buyurtma')} />
        <Button title={t.clearCart} variant="outline" onPress={() => dispatch(clearCart())} />
      </View>
    </View>
  );
}

const useStyles = makeStyles(c => ({
  variantLabel: {color: c.accent, fontSize: 12, fontWeight: '600'},
  screen: {flex: 1, backgroundColor: c.bg},
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    backgroundColor: c.surface,
  },
  thumb: {width: 72, height: 72, borderRadius: radius.sm, backgroundColor: c.surfaceAlt},
  name: {color: c.text, fontWeight: '600'},
  price: {color: c.text, fontWeight: '700'},
  qtyRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: {minWidth: 24, textAlign: 'center', color: c.text, fontWeight: '600'},
  footer: {
    borderTopWidth: 1,
    borderTopColor: c.border,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: c.chrome,
  },
  totalRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  totalLabel: {color: c.muted},
  total: {fontSize: 20, fontWeight: '800', color: c.text},
}));

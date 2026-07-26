import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {colors, formatSom, radius, spacing} from '../theme';
import {effectivePrice, type Product} from '../types';
import {useAppDispatch, useAppSelector} from '../store';
import {toggleFavorite} from '../store/favoritesSlice';
import {Stars} from './ui';

/** Katalog va bosh sahifadagi mahsulot kartochkasi. */
export function ProductCard({product, onPress}: {product: Product; onPress: () => void}) {
  const dispatch = useAppDispatch();
  const isFavorite = useAppSelector(s => s.favorites.ids.includes(product.id));
  const price = effectivePrice(product);
  const hasDiscount = price < product.price;

  return (
    <Pressable onPress={onPress} style={({pressed}) => [styles.card, pressed && {opacity: 0.9}]}>
      <View style={styles.imageBox}>
        {product.thumbnailUrl ? (
          <Image
            source={{uri: product.thumbnailUrl}}
            style={styles.image}
            resizeMode="cover"
            alt={product.name}
          />
        ) : null}
        <Pressable
          hitSlop={8}
          onPress={() => dispatch(toggleFavorite(product.id))}
          style={styles.heart}>
          <Text style={{fontSize: 16}}>{isFavorite ? '❤️' : '🤍'}</Text>
        </Pressable>
        {product.stock <= 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Tugagan</Text>
          </View>
        )}
      </View>

      <View style={{padding: spacing.sm, gap: 2}}>
        <Text numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>
        <Text style={styles.brand}>
          {[product.brand, product.manufacturerCountry].filter(Boolean).join(' • ')}
        </Text>
        {(product.ratingCount ?? 0) > 0 && <Stars value={product.ratingAvg ?? 0} />}
        <View style={styles.priceRow}>
          {hasDiscount && <Text style={styles.oldPrice}>{formatSom(product.price)}</Text>}
          <Text style={styles.price}>{formatSom(price)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  imageBox: {height: 130, backgroundColor: colors.bgAlt},
  image: {width: '100%', height: '100%'},
  heart: {
    position: 'absolute',
    right: 6,
    top: 6,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 14,
    padding: 4,
  },
  badge: {
    position: 'absolute',
    left: 6,
    top: 6,
    backgroundColor: colors.navy,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {color: colors.white, fontSize: 11},
  name: {color: colors.navy, fontWeight: '600', fontSize: 14},
  brand: {color: colors.muted, fontSize: 12},
  priceRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2},
  oldPrice: {color: colors.muted, fontSize: 12, textDecorationLine: 'line-through'},
  price: {color: colors.navy, fontWeight: '700', fontSize: 15},
});

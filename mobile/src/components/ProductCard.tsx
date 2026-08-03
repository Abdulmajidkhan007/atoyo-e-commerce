import React from 'react';
import {Image, Pressable, Text, View} from 'react-native';
import {makeStyles, radius, spacing} from '../theme';
import {useI18n} from '../i18n';
import {effectivePrice, localizedName, type Product} from '../types';
import {useAppDispatch, useAppSelector} from '../store';
import {toggleFavorite} from '../store/favoritesSlice';
import {Stars} from './ui';
import {Icon} from './Icon';
import {hasVariants, minVariantPrice} from '../variants';

/** Katalog va bosh sahifadagi mahsulot kartochkasi (sayt bilan bir xil). */
export function ProductCard({product, onPress}: {product: Product; onPress: () => void}) {
  const styles = useStyles();
  const {t, money, locale} = useI18n();
  const name = localizedName(product, locale);
  const dispatch = useAppDispatch();
  const isFavorite = useAppSelector(s => s.favorites.ids.includes(product.id));
  // Turlari bo'lgan mahsulotda narx "eng arzonidan" ko'rinishida
  // chiqadi - tanlash mahsulot sahifasida bo'ladi (saytdagi kabi).
  const withVariants = hasVariants(product);
  const price = withVariants ? (minVariantPrice(product) ?? product.price) : effectivePrice(product);
  const hasDiscount = !withVariants && price < product.price;

  return (
    <Pressable onPress={onPress} style={({pressed}) => [styles.card, pressed && {opacity: 0.9}]}>
      <View style={styles.imageBox}>
        {product.thumbnailUrl ? (
          <Image
            source={{uri: product.thumbnailUrl}}
            style={styles.image}
            resizeMode="cover"
            alt={name}
          />
        ) : null}
        <Pressable
          hitSlop={8}
          onPress={() => dispatch(toggleFavorite(product.id))}
          style={styles.heart}>
          <Icon
            name={isFavorite ? 'heartFilled' : 'heart'}
            size={17}
            color={isFavorite ? styles.c.danger : styles.c.muted}
          />
        </Pressable>
        {product.stock <= 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t.outOfStock}</Text>
          </View>
        )}
      </View>

      <View style={{padding: spacing.sm, gap: 2}}>
        <Text numberOfLines={2} style={styles.name}>
          {name}
        </Text>
        <Text style={styles.brand}>
          {[product.brand, product.manufacturerCountry].filter(Boolean).join(' • ')}
        </Text>
        {(product.ratingCount ?? 0) > 0 && <Stars value={product.ratingAvg ?? 0} />}
        <View style={styles.priceRow}>
          {hasDiscount && <Text style={styles.oldPrice}>{money(product.price)}</Text>}
          <Text style={styles.price}>
            {money(price)}
            {withVariants ? ' dan' : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles(c => ({
  card: {
    flex: 1,
    margin: spacing.xs,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: c.surface,
  },
  imageBox: {height: 130, backgroundColor: c.surfaceAlt},
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
    backgroundColor: c.brand,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {color: c.onBrand, fontSize: 11},
  name: {color: c.text, fontWeight: '600', fontSize: 14},
  brand: {color: c.muted, fontSize: 12},
  priceRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2},
  oldPrice: {color: c.muted, fontSize: 12, textDecorationLine: 'line-through'},
  price: {color: c.text, fontWeight: '700', fontSize: 15},
}));

import React, {useCallback, useEffect, useState} from 'react';
import {Image, Pressable, ScrollView, Text, View} from 'react-native';
import {makeStyles, radius, spacing} from '../theme';
import {useI18n} from '../i18n';
import {effectivePrice, type Product, type Review} from '../types';
import {fetchProduct} from '../firebase';
import {fetchReviews, submitReview} from '../api';
import {useAppDispatch, useAppSelector} from '../store';
import {addItem} from '../store/cartSlice';
import {toggleFavorite} from '../store/favoritesSlice';
import {Button, Field, Loading, Stars} from '../components/ui';
import {useAuth} from '../auth';
import type {StackScreenProps} from '../navigation/types';
import {useToast} from '../components/Toast';
import {
  defaultVariant,
  findVariant,
  hasVariants,
  variantLabel,
  variantPrice,
} from '../variants';

/** Mahsulot sahifasi: rasm, narx, tavsif, sevimlilar, savat va sharhlar. */
export function ProductScreen({route, navigation}: StackScreenProps<'Mahsulot'>) {
  const {productId} = route.params;
  const styles = useStyles();
  const toast = useToast();
  const {t, money} = useI18n();
  const dispatch = useAppDispatch();
  const {user} = useAuth();
  const isFavorite = useAppSelector(s => s.favorites.ids.includes(productId));

  const [product, setProduct] = useState<Product | null | undefined>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  /**
   * Tanlangan tur qiymatlari. Foydalanuvchi hali tanlamagan bo'lsa -
   * mahsulot yuklangach birinchi mavjud tur ishlatiladi (effekt ichida
   * setState qilmaslik uchun holat "picked" bo'lib turadi).
   */
  const [picked, setPicked] = useState<Record<string, string> | null>(null);

  const loadReviews = useCallback(
    () => fetchReviews(productId).catch((): Review[] => []),
    [productId],
  );

  useEffect(() => {
    let active = true;
    fetchProduct(productId)
      .catch((): Product | null => null)
      .then(item => {
        if (active) setProduct(item);
      });
    loadReviews().then(items => {
      if (active) setReviews(items);
    });
    return () => {
      active = false;
    };
  }, [productId, loadReviews]);

  if (product === undefined) return <Loading />;
  if (product === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t.productNotFound}</Text>
      </View>
    );
  }

  // TURLARI bo'lgan mahsulotda narx va zaxira tanlangan turdan olinadi.
  const withVariants = hasVariants(product);
  const selection = picked ?? defaultVariant(product)?.options ?? {};
  const setSelection = (
    updater: (prev: Record<string, string>) => Record<string, string>,
  ) => setPicked(prev => updater(prev ?? selection));
  const variant = withVariants ? findVariant(product, selection) : null;
  const price = withVariants
    ? variant
      ? variantPrice(variant)
      : product.price
    : effectivePrice(product);
  const stock = withVariants ? (variant?.stock ?? 0) : product.stock;

  const handleAddToCart = () => {
    dispatch(
      addItem({
        productId: product.id,
        ...(variant
          ? {variantId: variant.id, variantLabel: variantLabel(product, variant)}
          : {}),
        name: product.name,
        price,
        quantity: 1,
        thumbnailUrl: product.thumbnailUrl,
      }),
    );
    toast.success(t.addedToCart);
  };

  const handleReview = async () => {
    if (!user) {
      toast.error(t.loginToReview);
      navigation.navigate('Tabs', {screen: 'Profil'});
      return;
    }
    if (comment.trim().length < 3) return;

    setSaving(true);
    try {
      await submitReview(product.id, rating, comment.trim());
      setComment('');
      setReviews(await loadReviews());
      toast.success(t.reviewSaved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{paddingBottom: spacing.xl}}>
      {product.thumbnailUrl ? (
        <Image
          source={{uri: product.thumbnailUrl}}
          style={styles.image}
          resizeMode="cover"
          alt={product.name}
        />
      ) : null}

      <View style={{padding: spacing.lg, gap: spacing.sm}}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{product.name}</Text>
          <Pressable hitSlop={10} onPress={() => dispatch(toggleFavorite(product.id))}>
            <Text style={{fontSize: 22}}>{isFavorite ? '❤️' : '🤍'}</Text>
          </Pressable>
        </View>

        <Text style={styles.brand}>
          {[product.brand, product.manufacturerCountry].filter(Boolean).join(' • ')}
        </Text>

        {(product.ratingCount ?? 0) > 0 && (
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <Stars value={product.ratingAvg ?? 0} size={16} />
            <Text style={styles.muted}>
              {product.ratingAvg?.toFixed(1)} ({product.ratingCount})
            </Text>
          </View>
        )}

        {/* Tur tanlash tugmalari (o'lcham/rang/qalinlik) */}
        {withVariants &&
          (product.variantAxes ?? []).map(axis => (
            <View key={axis.key} style={{gap: spacing.xs}}>
              <Text style={styles.muted}>{axis.label}</Text>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs}}>
                {axis.values.map(value => {
                  const selected = selection[axis.key] === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => setSelection(prev => ({...prev, [axis.key]: value}))}
                      style={[styles.variant, selected && styles.variantOn]}>
                      <Text style={[styles.variantText, selected && styles.variantTextOn]}>
                        {value}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

        <View style={{flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm}}>
          {price < (variant?.price ?? product.price) && (
            <Text style={styles.oldPrice}>{money(variant?.price ?? product.price)}</Text>
          )}
          <Text style={styles.price}>{money(price)}</Text>
        </View>

        <Text style={styles.muted}>
          {stock > 0 ? t.inStockCount(stock) : t.notAvailable}
        </Text>

        {!!product.description && <Text style={styles.description}>{product.description}</Text>}

        <Button
          title={stock > 0 ? t.addToCart : t.outOfStock}
          onPress={handleAddToCart}
          disabled={stock <= 0 || (withVariants && !variant)}
        />

        {/* ---- Sharhlar ---- */}
        <Text style={styles.section}>
          {t.reviews} {reviews.length > 0 ? `(${reviews.length})` : ''}
        </Text>
        {reviews.length === 0 ? (
          <Text style={styles.muted}>{t.noReviews}</Text>
        ) : (
          reviews.map(review => (
            <View key={review.id} style={styles.review}>
              <Text style={styles.reviewAuthor}>{review.authorName}</Text>
              <Stars value={review.rating} />
              <Text style={styles.reviewText}>{review.comment}</Text>
            </View>
          ))
        )}

        <View style={{gap: spacing.sm, marginTop: spacing.md}}>
          <Text style={styles.muted}>{t.yourRating}</Text>
          <View style={{flexDirection: 'row', gap: spacing.xs}}>
            {[1, 2, 3, 4, 5].map(star => (
              <Pressable key={star} onPress={() => setRating(star)}>
                <Text
                  style={{fontSize: 26, color: star <= rating ? styles.c.accent : styles.c.border}}>
                  ★
                </Text>
              </Pressable>
            ))}
          </View>
          <Field label={t.yourComment} value={comment} onChangeText={setComment} multiline />
          <Button title={t.send} onPress={handleReview} loading={saving} />
        </View>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles(c => ({
  variant: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: c.surface,
  },
  variantOn: {backgroundColor: c.accent, borderColor: c.accent},
  variantText: {color: c.text, fontSize: 13, fontWeight: '600'},
  variantTextOn: {color: c.onAccent},
  screen: {flex: 1, backgroundColor: c.bg},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg},
  image: {width: '100%', height: 280, backgroundColor: c.surfaceAlt},
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {flex: 1, fontSize: 20, fontWeight: '800', color: c.text},
  brand: {color: c.muted, fontSize: 13},
  price: {fontSize: 24, fontWeight: '800', color: c.text},
  oldPrice: {color: c.muted, textDecorationLine: 'line-through'},
  muted: {color: c.muted, fontSize: 13},
  description: {color: c.text, fontSize: 14, lineHeight: 21},
  section: {fontSize: 17, fontWeight: '700', color: c.text, marginTop: spacing.lg},
  review: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: 2,
    backgroundColor: c.surface,
  },
  reviewAuthor: {fontWeight: '600', color: c.text},
  reviewText: {color: c.text, fontSize: 13},
}));

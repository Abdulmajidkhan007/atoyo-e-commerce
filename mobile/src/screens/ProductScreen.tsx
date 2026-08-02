import React, {useCallback, useEffect, useState} from 'react';
import {Image, Pressable, ScrollView, Text, View, Modal} from 'react-native';
import {makeStyles, radius, spacing} from '../theme';
import {useI18n} from '../i18n';
import {effectivePrice, type Product, type Review} from '../types';
import {fetchProduct, fetchRelatedProducts} from '../firebase';
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
  minVariantPrice,
  findVariant,
  hasVariants,
  variantLabel,
  variantPrice,
} from '../variants';
import {Icon} from '../components/Icon';

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
  /** O'xshash mahsulotlar - sahifaning pastida (saytdagi kabi). */
  const [related, setRelated] = useState<Product[]>([]);
  /** Galereyada ochiq turgan rasm (to'liq ekran uchun). */
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  const loadReviews = useCallback(
    () => fetchReviews(productId).catch((): Review[] => []),
    [productId],
  );

  useEffect(() => {
    let active = true;
    fetchProduct(productId)
      .catch((): Product | null => null)
      .then(item => {
        if (!active) return;
        setProduct(item);
        if (item) {
          fetchRelatedProducts(item)
            .catch((): Product[] => [])
            .then(items => {
              if (active) setRelated(items);
            });
        }
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
  const gallery = (product.images ?? []).filter(Boolean);
  if (gallery.length === 0 && product.thumbnailUrl) gallery.push(product.thumbnailUrl);

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
      {/* GALEREYA: bir nechta rasm bo'lsa yonma-yon suriladi, rasm
          bosilsa to'liq ekranda ochiladi (saytdagi kabi). */}
      {gallery.length > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.gallery}>
          {gallery.map((url, index) => (
            <Pressable key={url} onPress={() => setZoomUrl(url)}>
              <Image
                source={{uri: url}}
                style={styles.image}
                resizeMode="contain"
                alt={`${product.name} — ${index + 1}`}
              />
            </Pressable>
          ))}
        </ScrollView>
      )}
      {gallery.length > 1 && (
        <Text style={styles.galleryHint}>{gallery.length} ta rasm — suring</Text>
      )}

      <View style={{padding: spacing.lg, gap: spacing.sm}}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{product.name}</Text>
          <Pressable hitSlop={10} onPress={() => dispatch(toggleFavorite(product.id))}>
            <Icon
            name={isFavorite ? 'heartFilled' : 'heart'}
            size={22}
            color={isFavorite ? styles.c.danger : styles.c.muted}
          />
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
              <Pressable key={star} hitSlop={4} onPress={() => setRating(star)}>
                <Icon
                  name={star <= rating ? 'star' : 'starBorder'}
                  size={28}
                  color={star <= rating ? styles.c.accent : styles.c.border}
                />
              </Pressable>
            ))}
          </View>
          <Field label={t.yourComment} value={comment} onChangeText={setComment} multiline />
          <Button title={t.send} onPress={handleReview} loading={saving} />
        </View>

        {/* ---- O'xshash mahsulotlar (saytdagi kabi) ---- */}
        {related.length > 0 && (
          <>
            <Text style={styles.section}>{t.similarProducts}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{flexDirection: 'row', gap: spacing.md}}>
                {related.map(item => (
                  <Pressable
                    key={item.id}
                    style={styles.relatedCard}
                    onPress={() => navigation.push('Mahsulot', {productId: item.id})}>
                    <Image
                      source={{uri: item.thumbnailUrl}}
                      style={styles.relatedImage}
                      resizeMode="contain"
                      alt={item.name}
                    />
                    <Text numberOfLines={2} style={styles.relatedName}>
                      {item.name}
                    </Text>
                    <Text style={styles.relatedPrice}>
                      {money(
                        hasVariants(item)
                          ? (minVariantPrice(item) ?? item.price)
                          : effectivePrice(item),
                      )}
                      {hasVariants(item) ? ' dan' : ''}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </>
        )}
      </View>

      {/* To'liq ekranda rasm */}
      <Modal visible={zoomUrl !== null} transparent animationType="fade">
        <Pressable style={styles.zoomBackdrop} onPress={() => setZoomUrl(null)}>
          {zoomUrl && (
            <Image
              source={{uri: zoomUrl}}
              style={styles.zoomImage}
              resizeMode="contain"
              alt={product.name}
            />
          )}
          <Icon name="close" size={24} color={styles.c.white} />
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const useStyles = makeStyles(c => ({
  gallery: {backgroundColor: c.surfaceAlt},
  galleryHint: {
    color: c.muted,
    fontSize: 12,
    textAlign: 'center',
    paddingTop: spacing.xs,
  },
  relatedCard: {width: 130, gap: 4},
  relatedImage: {width: 130, height: 130, borderRadius: radius.sm, backgroundColor: c.surfaceAlt},
  relatedName: {color: c.text, fontSize: 12},
  relatedPrice: {color: c.text, fontSize: 13, fontWeight: '700'},
  zoomBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomImage: {width: '100%', height: '100%'},
  zoomClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
  },
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

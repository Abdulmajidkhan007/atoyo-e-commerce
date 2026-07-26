import React, {useCallback, useEffect, useState} from 'react';
import {Alert, Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {colors, formatSom, radius, spacing} from '../theme';
import {effectivePrice, type Product, type Review} from '../types';
import {fetchProduct} from '../firebase';
import {fetchReviews, submitReview} from '../api';
import {useAppDispatch, useAppSelector} from '../store';
import {addItem} from '../store/cartSlice';
import {toggleFavorite} from '../store/favoritesSlice';
import {Button, Field, Loading, Stars} from '../components/ui';
import {useAuth} from '../auth';
import type {StackScreenProps} from '../navigation/types';

/** Mahsulot sahifasi: rasm, narx, tavsif, sevimlilar, savat va sharhlar. */
export function ProductScreen({route, navigation}: StackScreenProps<'Mahsulot'>) {
  const {productId} = route.params;
  const dispatch = useAppDispatch();
  const {user} = useAuth();
  const isFavorite = useAppSelector(s => s.favorites.ids.includes(productId));

  const [product, setProduct] = useState<Product | null | undefined>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

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
        <Text style={{color: colors.muted}}>Mahsulot topilmadi.</Text>
      </View>
    );
  }

  const price = effectivePrice(product);

  const handleAddToCart = () => {
    dispatch(
      addItem({
        productId: product.id,
        name: product.name,
        price,
        quantity: 1,
        thumbnailUrl: product.thumbnailUrl,
      }),
    );
    Alert.alert('Savat', 'Mahsulot savatga qo‘shildi.');
  };

  const handleReview = async () => {
    if (!user) {
      Alert.alert('Sharh', 'Sharh qoldirish uchun tizimga kiring.');
      navigation.navigate('Tabs', {screen: 'Profil'});
      return;
    }
    if (comment.trim().length < 3) return;

    setSaving(true);
    try {
      await submitReview(product.id, rating, comment.trim());
      setComment('');
      setReviews(await loadReviews());
      Alert.alert('Rahmat!', 'Sharhingiz saqlandi.');
    } catch (error) {
      Alert.alert('Xatolik', error instanceof Error ? error.message : 'Sharh saqlanmadi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{paddingBottom: spacing.xl}}>
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

        <View style={{flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm}}>
          {price < product.price && <Text style={styles.oldPrice}>{formatSom(product.price)}</Text>}
          <Text style={styles.price}>{formatSom(price)}</Text>
        </View>

        <Text style={styles.muted}>
          {product.stock > 0 ? `Zaxirada: ${product.stock} dona` : 'Hozircha mavjud emas'}
        </Text>

        {!!product.description && <Text style={styles.description}>{product.description}</Text>}

        <Button
          title={product.stock > 0 ? 'Savatga qo‘shish' : 'Tugagan'}
          onPress={handleAddToCart}
          disabled={product.stock <= 0}
        />

        {/* ---- Sharhlar ---- */}
        <Text style={styles.section}>Sharhlar {reviews.length > 0 ? `(${reviews.length})` : ''}</Text>
        {reviews.length === 0 ? (
          <Text style={styles.muted}>Hozircha sharhlar yo&apos;q. Birinchi bo&apos;lib fikr bildiring!</Text>
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
          <Text style={styles.muted}>Bahoyingiz</Text>
          <View style={{flexDirection: 'row', gap: spacing.xs}}>
            {[1, 2, 3, 4, 5].map(star => (
              <Pressable key={star} onPress={() => setRating(star)}>
                <Text style={{fontSize: 26, color: star <= rating ? colors.gold : colors.border}}>★</Text>
              </Pressable>
            ))}
          </View>
          <Field label="Fikringiz" value={comment} onChangeText={setComment} multiline />
          <Button title="Yuborish" onPress={handleReview} loading={saving} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  image: {width: '100%', height: 280, backgroundColor: colors.bgAlt},
  titleRow: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm},
  title: {flex: 1, fontSize: 20, fontWeight: '800', color: colors.navy},
  brand: {color: colors.muted, fontSize: 13},
  price: {fontSize: 24, fontWeight: '800', color: colors.navy},
  oldPrice: {color: colors.muted, textDecorationLine: 'line-through'},
  muted: {color: colors.muted, fontSize: 13},
  description: {color: colors.navy, fontSize: 14, lineHeight: 21},
  section: {fontSize: 17, fontWeight: '700', color: colors.navy, marginTop: spacing.lg},
  review: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: 2,
  },
  reviewAuthor: {fontWeight: '600', color: colors.navy},
  reviewText: {color: colors.navy, fontSize: 13},
});

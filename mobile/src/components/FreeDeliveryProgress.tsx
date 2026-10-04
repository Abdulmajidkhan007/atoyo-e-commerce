import React, {useEffect, useMemo, useState} from 'react';
import {Image, Pressable, ScrollView, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {makeStyles, radius, spacing} from '../theme';
import {Icon} from './Icon';
import {useAppDispatch, useAppSelector} from '../store';
import {addItem} from '../store/cartSlice';
import {useCheckoutI18n, fill} from '../checkout-i18n';
import {freeDeliveryGap} from '../delivery-text';
import {fetchCheckoutDelivery, fetchGapFillers, type CheckoutDelivery} from '../checkout-api';
import {effectivePrice, localizedName, type Product} from '../types';
import {hasVariants} from '../variants';

/** Farq o'zgarganda qayta so'rashdan oldin kutish (miqdor tez bosilsa). */
const DEBOUNCE_MS = 400;
/** Nechta tavsiya ko'rsatiladi (spetsifikatsiya: 2-4 ta). */
const MAX_SUGGESTIONS = 4;

/**
 * "BEPUL YETKAZISHGA X SO'M QOLDI" + FARQNI YOPADIGAN MAHSULOTLAR —
 * saytdagi `components/cart/FreeDeliveryProgress.tsx` ning ilova varianti.
 *
 * Chiziq qancha qolganini ko'rsatadi, ostida BITTA qo'shish bilan
 * farqni yopadigan mahsulotlar (`/api/products/gap-fillers` — narx
 * serverda rolga moslangan). Yetkazish bepul yoki chegara yo'q bo'lsa —
 * hech narsa chizilmaydi (`freeDeliveryGap` → `null`).
 *
 * Turlari bo'lgan mahsulot savatga bu yerdan qo'shilmaydi (tur tanlash
 * kerak) — bosilganda mahsulot ekrani ochiladi.
 */
export function FreeDeliveryProgress() {
  const styles = useStyles();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const {c, money, locale} = useCheckoutI18n();
  const items = useAppSelector(s => s.cart.items);
  const [delivery, setDelivery] = useState<CheckoutDelivery | null>(null);
  const [suggestions, setSuggestions] = useState<Product[]>([]);

  useEffect(() => {
    let active = true;
    fetchCheckoutDelivery()
      .then(found => {
        if (active) setDelivery(found);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const gap = freeDeliveryGap(delivery, subtotal);
  const remaining = gap?.remaining ?? 0;
  const excludeKey = useMemo(() => [...new Set(items.map(item => item.productId))].join(','), [items]);

  useEffect(() => {
    if (remaining <= 0) return;
    let active = true;
    const timer = setTimeout(() => {
      fetchGapFillers({
        gap: remaining,
        exclude: excludeKey ? excludeKey.split(',') : [],
        // Ilova savatida kategoriya saqlanmaydi — server buni bo'sh
        // ro'yxat sifatida qabul qiladi (tartib narx bo'yicha).
        categories: [],
      }).then(found => {
        if (active) setSuggestions(found.slice(0, MAX_SUGGESTIONS));
      });
    }, DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [remaining, excludeKey]);

  if (!gap || items.length === 0) return null;
  const reached = gap.remaining <= 0;
  const visible = reached ? [] : suggestions;

  const add = (product: Product) => {
    if (hasVariants(product)) {
      navigation.navigate('Mahsulot', {productId: product.id});
      return;
    }
    dispatch(
      addItem({
        productId: product.id,
        name: localizedName(product, locale),
        // Narx serverdan (rolga mos) — faqat yaxlitlanadi.
        price: Math.round(effectivePrice(product)),
        quantity: 1,
        thumbnailUrl: product.thumbnailUrl,
      }),
    );
  };

  return (
    <View style={styles.box}>
      <View style={styles.row} accessibilityLiveRegion="polite">
        <Icon name="truck" size={18} color={styles.c.accent} />
        <Text style={styles.title}>
          {reached ? c.freeDeliveryReached : fill(c.freeDeliveryLeft, {amount: money(gap.remaining)})}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {width: `${gap.progress}%`},
            reached && {backgroundColor: styles.c.success},
          ]}
        />
      </View>
      {!reached && <Text style={styles.muted}>{fill(c.deliveryNow, {fee: money(gap.fee)})}</Text>}

      {visible.length > 0 && (
        <View style={{gap: spacing.xs, marginTop: spacing.xs}}>
          <Text style={styles.subtitle}>{c.fillGapTitle}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{flexDirection: 'row', gap: spacing.sm}}>
              {visible.map(product => {
                const image = product.images?.[0] ?? product.thumbnailUrl;
                const name = localizedName(product, locale);
                return (
                  <View key={product.id} style={styles.card}>
                    <Pressable onPress={() => navigation.navigate('Mahsulot', {productId: product.id})}>
                      {image ? (
                        <Image source={{uri: image}} style={styles.image} resizeMode="cover" alt={name} />
                      ) : (
                        <View style={styles.image} />
                      )}
                      <Text numberOfLines={2} style={styles.name}>
                        {name}
                      </Text>
                    </Pressable>
                    <View style={styles.cardFoot}>
                      <Text style={styles.price}>{money(Math.round(effectivePrice(product)))}</Text>
                      <Pressable
                        hitSlop={8}
                        onPress={() => add(product)}
                        accessibilityRole="button"
                        accessibilityLabel={`${name} — ${c.addedToCart}`}>
                        <Icon name="cart" size={20} color={styles.c.accent} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles(c => ({
  box: {
    borderWidth: 1,
    borderColor: c.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: c.surface,
  },
  row: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  title: {flex: 1, color: c.text, fontWeight: '700', fontSize: 14},
  subtitle: {color: c.muted, fontSize: 12, fontWeight: '600'},
  muted: {color: c.muted, fontSize: 12},
  track: {height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt, overflow: 'hidden'},
  fill: {height: 8, borderRadius: 4, backgroundColor: c.accent},
  card: {
    width: 128,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bg,
    overflow: 'hidden',
  },
  image: {width: 128, height: 100, backgroundColor: c.surfaceAlt},
  name: {color: c.text, fontSize: 12, paddingHorizontal: 6, paddingTop: 4, minHeight: 36},
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  price: {color: c.text, fontSize: 12, fontWeight: '700'},
}));

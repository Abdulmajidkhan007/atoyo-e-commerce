import React, {useEffect, useState} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {glassShadow, makeStyles, radius, spacing} from '../theme';
import {useI18n} from '../i18n';
import {fetchTestimonials, type Testimonial} from '../home-api';
import {Stars} from './ui';

/**
 * "MIJOZLAR FIKRI" - faqat admin tanlagan HAQIQIY sharhlar (saytdagi
 * bo'lim bilan bir xil manba). Ism "Abdulla K." ko'rinishida keladi,
 * uid yo'q. Bo'sh bo'lsa bo'lim umuman chizilmaydi.
 */
export function Testimonials({onOpenProduct}: {onOpenProduct: (productId: string) => void}) {
  const styles = useStyles();
  const {t} = useI18n();
  const [items, setItems] = useState<Testimonial[]>([]);

  useEffect(() => {
    let alive = true;
    fetchTestimonials().then(list => {
      if (alive) setItems(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <View>
      <Text style={styles.title}>{t.testimonialsTitle}</Text>
      <Text style={styles.subtitle}>{t.testimonialsSubtitle}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {items.map(item => (
          <View key={item.id} style={styles.card}>
            <Stars value={item.rating} />
            <Text numberOfLines={6} style={styles.comment}>
              {item.comment}
            </Text>
            <View style={{marginTop: 'auto'}}>
              <Text style={styles.author}>{item.authorName}</Text>
              <Pressable hitSlop={6} onPress={() => onOpenProduct(item.productId)}>
                <Text numberOfLines={1} style={styles.product}>
                  {item.productName}
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles(c => ({
  title: {
    color: c.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginLeft: spacing.xs,
  },
  subtitle: {color: c.muted, fontSize: 12, marginLeft: spacing.xs, marginBottom: spacing.sm},
  content: {gap: spacing.sm, paddingHorizontal: spacing.xs, paddingBottom: spacing.sm},
  card: {
    width: 260,
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: radius.lg,
    backgroundColor: c.glass,
    ...glassShadow(c.shadow),
  },
  comment: {color: c.text, fontSize: 13, lineHeight: 19},
  author: {color: c.text, fontWeight: '700', fontSize: 13},
  product: {color: c.accent, fontSize: 12},
}));

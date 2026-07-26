import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View} from 'react-native';
import {colors, radius, spacing} from '../theme';
import {CATEGORY_LABELS, type Product, type ProductCategory} from '../types';
import {fetchNewProducts} from '../firebase';
import {ProductCard} from '../components/ProductCard';
import {Loading} from '../components/ui';
import type {TabScreenProps} from '../navigation/types';

const CATEGORY_ICONS: Record<ProductCategory, string> = {
  pipes: '🚿',
  fittings: '🔩',
  faucets: '🚰',
  'shower-systems': '🛁',
  boilers: '🔥',
  radiators: '♨️',
  pumps: '⚙️',
  'sanitary-ware': '🧼',
};

/** Bosh sahifa: brend banneri, kategoriyalar va yangi mahsulotlar. */
export function HomeScreen({navigation}: TabScreenProps<'Home'>) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    () => fetchNewProducts(10).catch((): Product[] => []),
    [],
  );

  useEffect(() => {
    let active = true;
    load().then(items => {
      if (active) setProducts(items);
    });
    return () => {
      active = false;
    };
  }, [load]);

  if (!products) return <Loading />;

  return (
    <FlatList
      data={products}
      keyExtractor={item => item.id}
      numColumns={2}
      contentContainerStyle={{padding: spacing.sm, paddingBottom: spacing.xl}}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            setProducts(await load());
            setRefreshing(false);
          }}
          tintColor={colors.gold}
        />
      }
      ListHeaderComponent={
        <View>
          <View style={styles.hero}>
            <Image source={require('../../assets/logo.jpg')} style={styles.logo} alt="Atoyo Santexnika" />
            <Text style={styles.heroTitle}>Santexnika va Otopleniye uchun ishonchli manzil</Text>
            <Text style={styles.heroText}>
              Quvurlar, muftalar, kranlar, dush tizimlari va isitish qozonlari — barchasi bir joyda.
            </Text>
          </View>

          <Text style={styles.section}>Kategoriyalar</Text>
          <View style={styles.categories}>
            {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map(key => (
              <Pressable
                key={key}
                onPress={() => navigation.navigate('Katalog', {category: key})}
                style={({pressed}) => [styles.category, pressed && {opacity: 0.85}]}>
                <Text style={{fontSize: 22}}>{CATEGORY_ICONS[key]}</Text>
                <Text style={styles.categoryText}>{CATEGORY_LABELS[key]}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.section}>Yangi mahsulotlar</Text>
        </View>
      }
      renderItem={({item}) => (
        <ProductCard
          product={item}
          onPress={() => navigation.navigate('Mahsulot', {productId: item.id})}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    padding: spacing.lg,
    margin: spacing.xs,
    gap: spacing.sm,
  },
  logo: {width: 48, height: 48, borderRadius: radius.md},
  heroTitle: {color: colors.white, fontSize: 20, fontWeight: '800'},
  heroText: {color: '#9FC0D2', fontSize: 13, lineHeight: 19},
  section: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  categories: {flexDirection: 'row', flexWrap: 'wrap'},
  category: {
    width: '48%',
    margin: '1%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  categoryText: {color: colors.navy, fontSize: 13},
});

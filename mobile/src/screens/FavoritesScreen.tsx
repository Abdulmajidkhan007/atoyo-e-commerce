import React, {useEffect, useState} from 'react';
import {FlatList, View} from 'react-native';
import {makeStyles, spacing} from '../theme';
import {useI18n} from '../i18n';
import {useAppSelector} from '../store';
import {fetchProductsByIds} from '../firebase';
import type {Product} from '../types';
import {ProductCard} from '../components/ProductCard';
import {Button, EmptyState, Loading} from '../components/ui';
import type {StackScreenProps} from '../navigation/types';

/** Sevimlilar - ID lar telefonda saqlanadi, ma'lumot Firestore'dan olinadi. */
export function FavoritesScreen({navigation}: StackScreenProps<'Sevimlilar'>) {
  const styles = useStyles();
  const {t} = useI18n();
  const ids = useAppSelector(s => s.favorites.ids);
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchProductsByIds(ids)
      .catch((): Product[] => [])
      .then(items => {
        if (active) setProducts(items);
      });
    return () => {
      active = false;
    };
  }, [ids]);

  if (ids.length === 0) {
    return (
      <View style={styles.screen}>
        <EmptyState text={t.favoritesEmpty} />
        <View style={{padding: spacing.lg}}>
          <Button title={t.goToCatalog} onPress={() => navigation.navigate('Tabs', {screen: 'Katalog'})} />
        </View>
      </View>
    );
  }

  if (!products) return <Loading />;

  return (
    <FlatList
      style={styles.screen}
      data={products}
      keyExtractor={item => item.id}
      numColumns={2}
      contentContainerStyle={{padding: spacing.sm}}
      renderItem={({item}) => (
        <ProductCard
          product={item}
          onPress={() => navigation.navigate('Mahsulot', {productId: item.id})}
        />
      )}
    />
  );
}

const useStyles = makeStyles(c => ({
  screen: {flex: 1, backgroundColor: c.bg},
}));

import React, {useEffect, useState} from 'react';
import {FlatList, View} from 'react-native';
import {spacing} from '../theme';
import {useAppSelector} from '../store';
import {fetchProductsByIds} from '../firebase';
import type {Product} from '../types';
import {ProductCard} from '../components/ProductCard';
import {Button, EmptyState, Loading} from '../components/ui';
import type {TabScreenProps} from '../navigation/types';

/** Sevimlilar - ID lar telefonda saqlanadi, ma'lumot Firestore'dan olinadi. */
export function FavoritesScreen({navigation}: TabScreenProps<'Sevimlilar'>) {
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
      <View style={{flex: 1}}>
        <EmptyState text="Sevimlilar ro'yxati bo'sh. Mahsulot yonidagi ❤️ tugmasini bosing." />
        <View style={{padding: spacing.lg}}>
          <Button title="Katalogga o'tish" onPress={() => navigation.navigate('Katalog', {})} />
        </View>
      </View>
    );
  }

  if (!products) return <Loading />;

  return (
    <FlatList
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

import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {colors, radius, spacing} from '../theme';
import {CATEGORY_LABELS, type Product, type ProductCategory} from '../types';
import {fetchCatalog, searchProducts} from '../firebase';
import {fetchFacets} from '../api';
import {ProductCard} from '../components/ProductCard';
import {Button, EmptyState, Loading} from '../components/ui';
import type {TabScreenProps} from '../navigation/types';

type Sort = 'newest' | 'price-asc' | 'price-desc';

/**
 * Katalog: qidiruv maydoni + filtr tugmasi (saytdagi kabi filtr modal
 * ichida, sahifada doim turmaydi).
 */
export function CatalogScreen({navigation, route}: TabScreenProps<'Katalog'>) {
  const [term, setTerm] = useState('');
  const [category, setCategory] = useState<ProductCategory | undefined>(route.params?.category);
  const [brand, setBrand] = useState<string | undefined>();
  const [sort, setSort] = useState<Sort>('newest');
  const [brands, setBrands] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    fetchFacets()
      .then(f => setBrands(f.brands ?? []))
      .catch(() => setBrands([]));
  }, []);

  const load = useCallback(async () => {
    setProducts(null);
    try {
      const items = term.trim()
        ? await searchProducts(term)
        : await fetchCatalog({category, brand, sort});
      setProducts(items);
    } catch {
      setProducts([]);
    }
  }, [term, category, brand, sort]);

  useEffect(() => {
    const timer = setTimeout(load, term ? 350 : 0);
    return () => clearTimeout(timer);
  }, [load, term]);

  const activeCount = [category, brand].filter(Boolean).length;

  return (
    <View style={{flex: 1}}>
      <View style={styles.searchRow}>
        <TextInput
          value={term}
          onChangeText={setTerm}
          placeholder="Mahsulot qidirish..."
          placeholderTextColor={colors.muted}
          style={styles.search}
        />
        <Pressable onPress={() => setFilterOpen(true)} style={styles.filterBtn}>
          <Text style={{fontSize: 18}}>⚙️</Text>
          {activeCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {!products ? (
        <Loading />
      ) : products.length === 0 ? (
        <EmptyState text="Hech qanday mahsulot topilmadi." />
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={{padding: spacing.sm, paddingBottom: spacing.xl}}
          renderItem={({item}) => (
            <ProductCard
              product={item}
              onPress={() => navigation.navigate('Mahsulot', {productId: item.id})}
            />
          )}
        />
      )}

      <Modal visible={filterOpen} animationType="slide" transparent onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Filtr</Text>
            <ScrollView style={{maxHeight: 380}}>
              <Text style={styles.groupLabel}>Kategoriya</Text>
              <View style={styles.chips}>
                <Chip label="Barchasi" active={!category} onPress={() => setCategory(undefined)} />
                {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map(key => (
                  <Chip
                    key={key}
                    label={CATEGORY_LABELS[key]}
                    active={category === key}
                    onPress={() => setCategory(category === key ? undefined : key)}
                  />
                ))}
              </View>

              {brands.length > 0 && (
                <>
                  <Text style={styles.groupLabel}>Brend</Text>
                  <View style={styles.chips}>
                    <Chip label="Barchasi" active={!brand} onPress={() => setBrand(undefined)} />
                    {brands.map(b => (
                      <Chip
                        key={b}
                        label={b}
                        active={brand === b}
                        onPress={() => setBrand(brand === b ? undefined : b)}
                      />
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.groupLabel}>Saralash</Text>
              <View style={styles.chips}>
                <Chip label="Eng yangi" active={sort === 'newest'} onPress={() => setSort('newest')} />
                <Chip label="Narx ↑" active={sort === 'price-asc'} onPress={() => setSort('price-asc')} />
                <Chip label="Narx ↓" active={sort === 'price-desc'} onPress={() => setSort('price-desc')} />
              </View>
            </ScrollView>

            <View style={{gap: spacing.sm, marginTop: spacing.md}}>
              <Button title="Ko'rsatish" onPress={() => setFilterOpen(false)} />
              <Button
                title="Tozalash"
                variant="outline"
                onPress={() => {
                  setCategory(undefined);
                  setBrand(undefined);
                  setSort('newest');
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Chip({label, active, onPress}: {label: string; active: boolean; onPress: () => void}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && {backgroundColor: colors.goldTint, borderColor: colors.gold}]}>
      <Text style={{color: colors.navy, fontSize: 13}}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchRow: {flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, alignItems: 'center'},
  search: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    height: 44,
    color: colors.navy,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: colors.gold,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {fontSize: 11, color: colors.navy, fontWeight: '700'},
  modalBackdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: {fontSize: 18, fontWeight: '700', color: colors.navy, marginBottom: spacing.md},
  groupLabel: {color: colors.muted, marginTop: spacing.md, marginBottom: spacing.xs},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
});

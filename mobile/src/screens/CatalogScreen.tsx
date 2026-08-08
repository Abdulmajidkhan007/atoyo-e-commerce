import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, Modal, Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import {makeStyles, radius, spacing} from '../theme';
import {useI18n} from '../i18n';
import {type Product, type ProductCategory} from '../types';
import {useCategories} from '../categories';
import {fetchFacets, fetchTaxonomy, fetchCatalog, searchProducts} from '../api';
import {ProductCard} from '../components/ProductCard';
import {Button, Chip, EmptyState, Loading} from '../components/ui';
import type {TabScreenProps} from '../navigation/types';
import {Icon} from '../components/Icon';

type Sort = 'newest' | 'price-asc' | 'price-desc';

/**
 * Katalog: qidiruv maydoni + filtr tugmasi (saytdagi kabi filtr modal
 * ichida, sahifada doim turmaydi).
 */
export function CatalogScreen({navigation, route}: TabScreenProps<'Katalog'>) {
  const styles = useStyles();
  const {t} = useI18n();
  // Kategoriya filtri saytdagi ro'yxatdan (admin qo'shganlari ham).
  const categories = useCategories();
  const [term, setTerm] = useState(route.params?.q ?? '');
  const [category, setCategory] = useState<ProductCategory | undefined>(route.params?.category);
  const [brand, setBrand] = useState<string | undefined>();
  const [sort, setSort] = useState<Sort>('newest');
  const [material, setMaterial] = useState<string | undefined>();
  const [country, setCountry] = useState<string | undefined>();
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [brands, setBrands] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [materials, setMaterials] = useState<{slug: string; label: string}[]>([]);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  // Bosh sahifadan kategoriya/qidiruv bilan kelinganda holatni yangilaymiz.
  const [lastParams, setLastParams] = useState(route.params);
  if (route.params !== lastParams) {
    setLastParams(route.params);
    if (route.params?.category !== undefined) setCategory(route.params.category);
    if (route.params?.q !== undefined) setTerm(route.params.q);
  }

  useEffect(() => {
    fetchFacets()
      .then(f => {
        setBrands(f.brands ?? []);
        setCountries(f.countries ?? []);
      })
      .catch(() => setBrands([]));
    fetchTaxonomy()
      .then(x => setMaterials(x.materials))
      .catch(() => setMaterials([]));
  }, []);

  const load = useCallback(async () => {
    setProducts(null);
    try {
      const items = term.trim()
        ? await searchProducts(term)
        : (
            await fetchCatalog({
              category,
              brand,
              material,
              country,
              minPrice: Number(minPrice) || undefined,
              maxPrice: Number(maxPrice) || undefined,
              sort,
            })
          ).products;
      setProducts(items);
    } catch {
      setProducts([]);
    }
  }, [term, category, brand, material, country, minPrice, maxPrice, sort]);

  useEffect(() => {
    const timer = setTimeout(load, term ? 350 : 0);
    return () => clearTimeout(timer);
  }, [load, term]);

  const activeCount = [category, brand, material, country, minPrice, maxPrice].filter(Boolean)
    .length;

  return (
    <View style={styles.screen}>
      <View style={styles.searchRow}>
        <TextInput
          value={term}
          onChangeText={setTerm}
          placeholder={t.searchPlaceholder}
          placeholderTextColor={styles.c.muted}
          style={styles.search}
        />
        <Pressable onPress={() => setFilterOpen(true)} style={styles.filterBtn}>
          <Icon name="filter" size={20} color={styles.c.text} />
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
        <EmptyState text={t.nothingFound} />
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

      <Modal
        visible={filterOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t.filter}</Text>
            <ScrollView style={{maxHeight: 380}}>
              <Text style={styles.groupLabel}>{t.category}</Text>
              <View style={styles.chips}>
                <Chip label={t.all} active={!category} onPress={() => setCategory(undefined)} />
                {categories.map(item => (
                  <Chip
                    key={item.slug}
                    label={item.label}
                    active={category === item.slug}
                    onPress={() => setCategory(category === item.slug ? undefined : item.slug)}
                  />
                ))}
              </View>

              {brands.length > 0 && (
                <>
                  <Text style={styles.groupLabel}>{t.brand}</Text>
                  <View style={styles.chips}>
                    <Chip label={t.all} active={!brand} onPress={() => setBrand(undefined)} />
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

              {materials.length > 0 && (
                <>
                  <Text style={styles.groupLabel}>{t.material}</Text>
                  <View style={styles.chips}>
                    <Chip label={t.all} active={!material} onPress={() => setMaterial(undefined)} />
                    {materials.map(m => (
                      <Chip
                        key={m.slug}
                        label={m.label}
                        active={material === m.slug}
                        onPress={() => setMaterial(material === m.slug ? undefined : m.slug)}
                      />
                    ))}
                  </View>
                </>
              )}

              {countries.length > 0 && (
                <>
                  <Text style={styles.groupLabel}>{t.country}</Text>
                  <View style={styles.chips}>
                    <Chip label={t.all} active={!country} onPress={() => setCountry(undefined)} />
                    {countries.map(item => (
                      <Chip
                        key={item}
                        label={item}
                        active={country === item}
                        onPress={() => setCountry(country === item ? undefined : item)}
                      />
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.groupLabel}>{t.priceRange}</Text>
              <View style={styles.priceRow}>
                <TextInput
                  value={minPrice}
                  onChangeText={setMinPrice}
                  placeholder={t.priceFrom}
                  placeholderTextColor={styles.c.muted}
                  keyboardType="number-pad"
                  style={styles.priceInput}
                />
                <Text style={styles.groupLabel}>—</Text>
                <TextInput
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  placeholder={t.priceTo}
                  placeholderTextColor={styles.c.muted}
                  keyboardType="number-pad"
                  style={styles.priceInput}
                />
              </View>

              <Text style={styles.groupLabel}>{t.sort}</Text>
              <View style={styles.chips}>
                <Chip
                  label={t.sortNewest}
                  active={sort === 'newest'}
                  onPress={() => setSort('newest')}
                />
                <Chip
                  label={t.sortPriceAsc}
                  active={sort === 'price-asc'}
                  onPress={() => setSort('price-asc')}
                />
                <Chip
                  label={t.sortPriceDesc}
                  active={sort === 'price-desc'}
                  onPress={() => setSort('price-desc')}
                />
              </View>
            </ScrollView>

            <View style={{gap: spacing.sm, marginTop: spacing.md}}>
              <Button title={t.show} onPress={() => setFilterOpen(false)} />
              <Button
                title={t.clear}
                variant="outline"
                onPress={() => {
                  setCategory(undefined);
                  setBrand(undefined);
                  setMaterial(undefined);
                  setCountry(undefined);
                  setMinPrice('');
                  setMaxPrice('');
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

const useStyles = makeStyles(c => ({
  priceRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: c.text,
    backgroundColor: c.surface,
  },
  screen: {flex: 1, backgroundColor: c.bg},
  searchRow: {flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, alignItems: 'center'},
  search: {
    flex: 1,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    height: 44,
    color: c.text,
    backgroundColor: c.surface,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
  },
  filterBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: c.accent,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {fontSize: 11, color: c.onAccent, fontWeight: '700'},
  modalBackdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
  modalCard: {
    backgroundColor: c.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: {fontSize: 18, fontWeight: '700', color: c.text, marginBottom: spacing.md},
  groupLabel: {color: c.muted, marginTop: spacing.md, marginBottom: spacing.xs},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
}));

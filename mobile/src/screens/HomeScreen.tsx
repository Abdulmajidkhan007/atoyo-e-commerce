import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, Image, Pressable, RefreshControl, Text, TextInput, View} from 'react-native';
import {makeStyles, radius, spacing} from '../theme';
import {useI18n} from '../i18n';
import {type Product} from '../types';
import {useCategories} from '../categories';
import {fetchShowcase, fetchNewProducts} from '../api';
import {ProductCard} from '../components/ProductCard';
import {Loading} from '../components/ui';
import {Icon, type IconName} from '../components/Icon';
import type {TabScreenProps} from '../navigation/types';

/**
 * Standart kategoriyalar belgisi - SAYTDAGI bilan bir xil ikonkalar;
 * yangi kategoriyaga umumiy belgi qo'yiladi.
 */
const CATEGORY_ICONS: Record<string, IconName> = {
  pipes: 'pipes',
  fittings: 'fittings',
  faucets: 'faucets',
  'shower-systems': 'shower',
  boilers: 'boilers',
  radiators: 'radiators',
  pumps: 'pumps',
  'sanitary-ware': 'bath',
};

/**
 * Bosh sahifada ko'rinadigan kategoriyalar soni - qolgani katalogda
 * (import bilan kategoriyalar o'nlab bo'lib ketdi).
 */
const HOME_CATEGORIES = 12;

/**
 * Bosh sahifa: qidiruv, brend banneri, kategoriyalar, namuna mahsulotlar
 * va sayt menyusidagi qolgan bo'limlarga havolalar.
 */
export function HomeScreen({navigation}: TabScreenProps<'Home'>) {
  const styles = useStyles();
  const {t} = useI18n();
  // Kategoriyalar saytdagi ro'yxatdan - yangilari ham ko'rinadi.
  const categories = useCategories();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [term, setTerm] = useState('');

  /**
   * Bosh sahifada 6 ta namuna mahsulot - har kategoriyadan bittadan
   * (saytdagi bilan bir xil). Server javob bermasa eng yangilari.
   */
  const load = useCallback(
    () =>
      fetchShowcase()
        .then(items => (items.length > 0 ? items : fetchNewProducts(6)))
        .catch((): Product[] => []),
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
      style={styles.screen}
      contentContainerStyle={{padding: spacing.sm, paddingBottom: spacing.xl}}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            setProducts(await load());
            setRefreshing(false);
          }}
          tintColor={styles.c.accent}
        />
      }
      ListHeaderComponent={
        <View>
          <TextInput
            value={term}
            onChangeText={setTerm}
            placeholder={t.searchPlaceholder}
            placeholderTextColor={styles.c.muted}
            returnKeyType="search"
            onSubmitEditing={() => navigation.navigate('Katalog', {q: term.trim()})}
            style={styles.search}
          />

          {/* Saytdagi hero bilan bir xil tartib: nishon → sarlavha →
              matn → "Katalogni ko'rish" tugmasi. */}
          <View style={styles.hero}>
            <Image source={require('../../assets/logo.jpg')} style={styles.logo} alt="Atoyo" />
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{t.heroBadge}</Text>
            </View>
            <Text style={styles.heroTitle}>{t.heroTitle}</Text>
            <Text style={styles.heroText}>{t.heroText}</Text>
            <Pressable
              onPress={() => navigation.navigate('Katalog', {})}
              style={({pressed}) => [styles.heroBtn, pressed && {opacity: 0.9}]}>
              <Text style={styles.heroBtnText}>{t.viewCatalog}</Text>
            </Pressable>
          </View>

          <View style={styles.quickRow}>
            <QuickLink label={t.titleBlog} icon="blog" onPress={() => navigation.navigate('Blog')} />
            <QuickLink
              label={t.titleContact}
              icon="phone"
              onPress={() => navigation.navigate('Kontakt')}
            />
            <QuickLink
              label={t.titleOrders}
              icon="orders"
              onPress={() => navigation.navigate('Buyurtmalarim')}
            />
            <QuickLink
              label={t.titleSettings}
              icon="settings"
              onPress={() => navigation.navigate('Sozlamalar')}
            />
          </View>

          <Text style={styles.section}>{t.categories}</Text>
          <View style={styles.categories}>
            {categories.slice(0, HOME_CATEGORIES).map(item => (
              <Pressable
                key={item.slug}
                onPress={() => navigation.navigate('Katalog', {category: item.slug})}
                style={({pressed}) => [styles.category, pressed && {opacity: 0.85}]}>
                <Icon
                  name={CATEGORY_ICONS[item.slug] ?? 'category'}
                  size={24}
                  color={styles.c.accent}
                />
                <Text style={styles.categoryText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.section}>{t.newProducts}</Text>
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

function QuickLink({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} style={({pressed}) => [styles.quick, pressed && {opacity: 0.85}]}>
      <Icon name={icon} size={20} color={styles.c.accent} />
      <Text numberOfLines={1} style={styles.quickText}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles(c => ({
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(196,154,108,0.22)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  heroBadgeText: {color: c.accent, fontSize: 12, fontWeight: '700'},
  heroBtn: {
    alignSelf: 'flex-start',
    backgroundColor: c.accent,
    borderRadius: 999,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  heroBtnText: {color: c.onAccent, fontWeight: '800', fontSize: 15},
  screen: {backgroundColor: c.bg},
  search: {
    margin: spacing.xs,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    height: 44,
    color: c.text,
    backgroundColor: c.surface,
  },
  hero: {
    backgroundColor: c.brand,
    borderRadius: radius.lg,
    padding: spacing.lg,
    margin: spacing.xs,
    gap: spacing.sm,
  },
  logo: {width: 48, height: 48, borderRadius: radius.md},
  heroTitle: {color: c.onBrand, fontSize: 20, fontWeight: '800'},
  heroText: {color: c.onBrandMuted, fontSize: 13, lineHeight: 19},
  quickRow: {flexDirection: 'row', gap: spacing.xs, marginHorizontal: spacing.xs, marginTop: spacing.sm},
  quick: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    backgroundColor: c.surface,
  },
  quickText: {color: c.text, fontSize: 11},
  section: {
    color: c.text,
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
    borderColor: c.border,
    borderRadius: radius.md,
    backgroundColor: c.surface,
  },
  categoryText: {color: c.text, fontSize: 13},
}));

import React, {useEffect, useState} from 'react';
import {FlatList, Pressable, Text, TextInput, View} from 'react-native';
import {makeStyles, radius, spacing} from '../theme';
import {useI18n} from '../i18n';
import {adminIntake, adminSearchProducts, adminUpdateProduct} from '../api';
import {useToast} from '../components/Toast';
import {Button, EmptyState} from '../components/ui';
import {hasVariants, variantLabel} from '../variants';
import type {Product} from '../types';
import type {StackScreenProps} from '../navigation/types';

/**
 * ADMIN: MAHSULOTLAR — kirim va tez tahrir.
 *
 * Mahsulot qidiriladi (chernoviklar ham topiladi), keyin:
 *   • KIRIM  — kelgan soni + ixtiyoriy narx/kimdan; chernovik bo'lsa
 *              saqlangach katalogga chiqadi va kanalga e'lon qilinadi;
 *   • TAHRIR — narx va zaxirani darhol o'zgartirish, mahsulotni
 *              yashirish/tiklash.
 *
 * Hammasi saytning API'lari orqali - qoidalar va e'lon mantiqi bir joyda.
 */
export function AdminProductsScreen(_props: StackScreenProps<'AdminMahsulotlar'>) {
  const styles = useStyles();
  const toast = useToast();
  const {money} = useI18n();

  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);

  // Kirim maydonlari
  const [qty, setQty] = useState('1');
  const [variantId, setVariantId] = useState<string | undefined>();
  const [supplier, setSupplier] = useState('');
  // Tez tahrir maydonlari
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const trimmed = term.trim();
    let active = true;

    // Qidiruv debounce bilan: yozish tugagach 350 ms dan keyin so'rov
    // ketadi. Holat faqat shu kechikishdan keyin o'zgaradi, ya'ni
    // effekt ichida to'g'ridan-to'g'ri setState chaqirilmaydi.
    const timer = setTimeout(() => {
      if (!active) return;
      if (trimmed.length < 2) {
        setResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      adminSearchProducts(trimmed)
        .catch((): Product[] => [])
        .then(items => {
          if (!active) return;
          setResults(items);
          setSearching(false);
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [term]);

  const pick = (product: Product) => {
    setSelected(product);
    setResults([]);
    setTerm('');
    setQty('1');
    setSupplier(product.supplier ?? '');
    setPrice(String(product.price));
    setStock(String(product.stock));
    setVariantId(product.variants?.[0]?.id);
  };

  const saveIntake = async () => {
    if (!selected) return;
    const amount = Math.max(1, Math.round(Number(qty) || 1));
    setBusy(true);
    try {
      await adminIntake([
        {
          productId: selected.id,
          ...(variantId ? {variantId} : {}),
          qty: amount,
          ...(supplier.trim() ? {supplier: supplier.trim()} : {}),
        },
      ]);
      toast.success(
        selected.isDraft
          ? 'Kirim saqlandi — mahsulot katalogga chiqdi'
          : `Kirim saqlandi: +${amount}`,
      );
      setSelected(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await adminUpdateProduct(selected.id, {
        price: Number(price) || selected.price,
        stock: Math.max(0, Math.round(Number(stock) || 0)),
      });
      toast.success('Saqlandi');
      setSelected(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await adminUpdateProduct(selected.id, {isActive: !selected.isActive});
      toast.success(selected.isActive ? 'Yashirildi' : 'Katalogga qaytarildi');
      setSelected({...selected, isActive: !selected.isActive});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <TextInput
        value={term}
        onChangeText={setTerm}
        placeholder="Mahsulot nomi yoki raqami..."
        placeholderTextColor={styles.c.muted}
        style={styles.search}
      />

      {selected ? (
        <FlatList
          data={[selected]}
          keyExtractor={item => item.id}
          contentContainerStyle={{padding: spacing.md, gap: spacing.md}}
          renderItem={({item}) => (
            <View style={{gap: spacing.md}}>
              <View style={styles.card}>
                <Text style={styles.name}>
                  {item.code ? `№${item.code} — ` : ''}
                  {item.name}
                </Text>
                <Text style={styles.muted}>
                  {money(item.price)} · zaxira: {item.stock}
                  {item.isDraft ? ' · chernovik' : item.isActive ? '' : ' · yashirin'}
                </Text>
              </View>

              {/* ---- KIRIM ---- */}
              <View style={styles.card}>
                <Text style={styles.section}>Kirim</Text>
                {hasVariants(item) && (
                  <View style={styles.chips}>
                    {(item.variants ?? []).map(v => (
                      <Pressable
                        key={v.id}
                        onPress={() => setVariantId(v.id)}
                        style={[styles.chip, variantId === v.id && styles.chipOn]}>
                        <Text
                          style={[styles.chipText, variantId === v.id && styles.chipTextOn]}>
                          {variantLabel(item, v)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                <TextInput
                  value={qty}
                  onChangeText={setQty}
                  keyboardType="number-pad"
                  placeholder="Kelgan soni"
                  placeholderTextColor={styles.c.muted}
                  style={styles.input}
                />
                <TextInput
                  value={supplier}
                  onChangeText={setSupplier}
                  placeholder="Kimdan kelgan"
                  placeholderTextColor={styles.c.muted}
                  style={styles.input}
                />
                <Button title="Kirimni saqlash" onPress={saveIntake} loading={busy} />
              </View>

              {/* ---- TEZ TAHRIR ---- */}
              <View style={styles.card}>
                <Text style={styles.section}>Tez tahrir</Text>
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="number-pad"
                  placeholder="Narx"
                  placeholderTextColor={styles.c.muted}
                  style={styles.input}
                />
                <TextInput
                  value={stock}
                  onChangeText={setStock}
                  keyboardType="number-pad"
                  placeholder="Zaxira"
                  placeholderTextColor={styles.c.muted}
                  style={styles.input}
                />
                <Button title="Saqlash" onPress={saveEdit} loading={busy} />
                <Button
                  title={item.isActive ? 'Katalogdan yashirish' : 'Katalogga qaytarish'}
                  variant={item.isActive ? 'danger' : 'outline'}
                  onPress={toggleActive}
                />
                <Button title="Boshqa mahsulot" variant="outline" onPress={() => setSelected(null)} />
              </View>
            </View>
          )}
        />
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          contentContainerStyle={{padding: spacing.md, gap: spacing.sm}}
          renderItem={({item}) => (
            <Pressable style={styles.row} onPress={() => pick(item)}>
              <Text style={styles.rowName} numberOfLines={1}>
                {item.code ? `№${item.code} · ` : ''}
                {item.name}
                {item.isDraft ? ' · chernovik' : ''}
              </Text>
              <Text style={styles.muted}>
                {money(item.price)} · {item.stock}
              </Text>
            </Pressable>
          )}
        />
      ) : (
        <EmptyState
          text={
            searching
              ? 'Qidirilmoqda...'
              : term.trim().length >= 2
                ? 'Topilmadi'
                : 'Mahsulot nomini yoki raqamini yozing'
          }
        />
      )}
    </View>
  );
}

const useStyles = makeStyles(c => ({
  screen: {flex: 1, backgroundColor: c.bg},
  search: {
    margin: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    color: c.text,
    backgroundColor: c.surface,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  section: {color: c.text, fontWeight: '700', fontSize: 15},
  name: {color: c.text, fontWeight: '700', fontSize: 15},
  muted: {color: c.muted, fontSize: 13},
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: c.text,
    backgroundColor: c.surfaceAlt,
  },
  row: {
    backgroundColor: c.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
    gap: 2,
  },
  rowName: {color: c.text, fontWeight: '600'},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
  chip: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipOn: {backgroundColor: c.accent, borderColor: c.accent},
  chipText: {color: c.text, fontSize: 12, fontWeight: '600'},
  chipTextOn: {color: c.onAccent},
}));

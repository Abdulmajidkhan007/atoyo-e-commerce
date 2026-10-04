import React, {useEffect, useState} from 'react';
import {Pressable, ScrollView, Text} from 'react-native';
import {makeStyles, spacing} from '../theme';
import {useI18n} from '../i18n';
import {fetchChipCategories, type ChipCategory} from '../home-api';

/**
 * KATEGORIYA CHIPLARI - bosh sahifa va katalog boshida (saytdagi
 * `CategoryChips` kabi): gorizontal aylantiriladi, faqat mahsuloti bor
 * kategoriyalar. `active` bo'lsa shu chip belgilanadi; "Barchasi"
 * filtrni olib tashlaydi (`onSelect(undefined)`).
 */
export function CategoryChips({
  active,
  onSelect,
}: {
  active?: string;
  onSelect: (slug: string | undefined) => void;
}) {
  const styles = useStyles();
  const {t} = useI18n();
  const [items, setItems] = useState<ChipCategory[]>([]);

  useEffect(() => {
    let alive = true;
    fetchChipCategories().then(list => {
      if (alive) setItems(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={styles.content}>
      <Chip label={t.all} on={!active} onPress={() => onSelect(undefined)} />
      {items.map(item => (
        <Chip
          key={item.slug}
          label={item.label}
          on={active === item.slug}
          onPress={() => onSelect(item.slug)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({label, on, onPress}: {label: string; on: boolean; onPress: () => void}) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{selected: on}}
      style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.text, on && styles.textOn]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(c => ({
  row: {flexGrow: 0},
  content: {paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, gap: spacing.sm},
  chip: {
    borderWidth: 1,
    borderColor: c.glassBorder,
    backgroundColor: c.glass,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  chipOn: {backgroundColor: c.accent, borderColor: c.accent},
  text: {color: c.text, fontSize: 13},
  textOn: {color: c.onAccent, fontWeight: '700'},
}));

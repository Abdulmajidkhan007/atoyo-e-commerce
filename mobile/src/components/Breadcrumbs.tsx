import React from 'react';
import {Pressable, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {makeStyles, spacing} from '../theme';
import {Icon} from './Icon';
import type {ProductCategory} from '../types';
import type {RootStackParamList} from '../navigation/types';

/**
 * "QAYERDAMAN" ZANJIRI (ilova tomoni).
 *
 * Saytdagi `Breadcrumbs` bilan bir xil vazifa: bo'lim ichiga kirib
 * ketgach qayerda ekani ko'rinib tursin va istalgan bosqichga bir
 * bosishda qaytish mumkin bo'lsin. Telefondagi "orqaga" faqat BITTA
 * qadam ortga qaytaradi - zanjir esa butun yo'lni ko'rsatadi.
 *
 * Oxirgi bo'g'in - joriy ekran, u bosilmaydi.
 */

export interface Crumb {
  name: string;
  /** Bosilganda katalogga o'tadi (kategoriya bilan yoki usiz). */
  toCatalog?: {category?: ProductCategory};
  /** Bosilganda bosh sahifaga o'tadi. */
  toHome?: boolean;
}

export function Breadcrumbs({items}: {items: Crumb[]}) {
  const styles = useStyles();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const trail: Crumb[] = [{name: 'Bosh', toHome: true}, ...items];
  if (trail.length < 2) return null;

  const go = (crumb: Crumb) => {
    if (crumb.toCatalog) {
      navigation.navigate('Tabs', {screen: 'Katalog', params: crumb.toCatalog});
    } else if (crumb.toHome) {
      navigation.navigate('Tabs', {screen: 'Home'});
    }
  };

  return (
    <View style={styles.row}>
      {trail.map((crumb, index) => {
        const last = index === trail.length - 1;
        const tappable = !last && (crumb.toCatalog || crumb.toHome);
        return (
          <View key={`${crumb.name}-${index}`} style={styles.item}>
            {index > 0 && (
              <Icon
                name="chevronRight"
                size={13}
                color={styles.c.muted}
                style={styles.sep}
              />
            )}
            {tappable ? (
              <Pressable hitSlop={6} onPress={() => go(crumb)}>
                <Text style={styles.link}>{crumb.name}</Text>
              </Pressable>
            ) : (
              <Text numberOfLines={1} style={styles.current}>
                {crumb.name}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(c => ({
  row: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    gap: 2,
    marginBottom: spacing.xs,
  },
  item: {flexDirection: 'row' as const, alignItems: 'center' as const, gap: 2},
  sep: {opacity: 0.6},
  link: {fontSize: 12, color: c.muted},
  current: {fontSize: 12, color: c.text, fontWeight: '600' as const, maxWidth: 190},
}));

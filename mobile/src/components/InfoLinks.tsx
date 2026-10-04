import React from 'react';
import {Linking} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useI18n} from '../i18n';
import {SITE_URL} from '../api';
import {Button, Card, SectionTitle} from './ui';
import type {RootStackParamList} from '../navigation/types';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

/**
 * MA'LUMOT havolalari (profil va sozlamalarda): Yetkazib berish,
 * Savol-javob va Maxfiylik siyosati (brauzerda - matn saytda turadi).
 */
export function InfoLinks() {
  const {t} = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Card>
      <SectionTitle>{t.infoSection}</SectionTitle>
      <Button
        title={t.titleDeliveryInfo}
        icon="truck"
        variant="outline"
        onPress={() => navigation.navigate('YetkazibBerish')}
      />
      <Button
        title={t.titleFaq}
        icon="info"
        variant="outline"
        onPress={() => navigation.navigate('SavolJavob')}
      />
      <Button
        title={t.privacyPolicy}
        icon="language"
        variant="outline"
        onPress={() => Linking.openURL(`${SITE_URL}/maxfiylik`)}
      />
    </Card>
  );
}

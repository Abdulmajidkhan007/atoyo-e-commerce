import React from 'react';
import {ScrollView} from 'react-native';
import {makeStyles, spacing} from '../theme';
import {SettingsSections} from '../components/SettingsSections';

/**
 * SOZLAMALAR ekrani. Barcha bo'limlar `SettingsSections` da - xuddi
 * shu bo'limlar profil sahifasida ham chiziladi (u yerda alohida
 * "Sozlamalar" tugmasi endi yo'q).
 */
export function SettingsScreen() {
  const styles = useStyles();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{padding: spacing.lg, gap: spacing.md}}>
      <SettingsSections />
    </ScrollView>
  );
}

const useStyles = makeStyles(c => ({
  screen: {flex: 1, backgroundColor: c.bg},
}));

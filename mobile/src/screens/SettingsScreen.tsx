import React, {useState} from 'react';
import {ScrollView, Text, View} from 'react-native';
import {makeStyles, spacing, useTheme, type ThemeMode} from '../theme';
import {LOCALE_LABELS, useI18n, type Locale} from '../i18n';
import {Button, Card, Chip, Field} from '../components/ui';
import {subscribeToNewsletter} from '../api';
import {useToast} from '../components/Toast';

/**
 * SOZLAMALAR: ko'rinish (yorug'/qorong'i/tizim), til (uz/en/ru) va
 * yangiliklarga obuna - saytdagi ThemeToggle, LanguageSwitcher va
 * NewsletterForm ning ilova varianti.
 */
export function SettingsScreen() {
  const styles = useStyles();
  const toast = useToast();
  const {mode, setMode} = useTheme();
  const {t, locale, setLocale} = useI18n();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const themeOptions: {value: ThemeMode; label: string}[] = [
    {value: 'light', label: t.themeLight},
    {value: 'dark', label: t.themeDark},
    {value: 'system', label: t.themeSystem},
  ];

  const subscribe = async () => {
    if (!email.trim()) {
      toast.error(t.enterEmailFirst);
      return;
    }
    setBusy(true);
    try {
      await subscribeToNewsletter(email.trim());
      setEmail('');
      toast.success(t.subscribed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{padding: spacing.lg, gap: spacing.md}}>
      <Card>
        <Text style={styles.cardTitle}>{t.theme}</Text>
        <View style={styles.chips}>
          {themeOptions.map(option => (
            <Chip
              key={option.value}
              label={option.label}
              active={mode === option.value}
              onPress={() => setMode(option.value)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>{t.language}</Text>
        <View style={styles.chips}>
          {(Object.keys(LOCALE_LABELS) as Locale[]).map(code => (
            <Chip
              key={code}
              label={LOCALE_LABELS[code]}
              active={locale === code}
              onPress={() => setLocale(code)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>{t.newsletter}</Text>
        <Text style={styles.muted}>{t.newsletterHint}</Text>
        <Field
          label={t.email}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Button title={t.subscribe} onPress={subscribe} loading={busy} />
      </Card>
    </ScrollView>
  );
}

const useStyles = makeStyles(c => ({
  screen: {flex: 1, backgroundColor: c.bg},
  cardTitle: {color: c.text, fontWeight: '700', fontSize: 16},
  muted: {color: c.muted, fontSize: 13},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
}));

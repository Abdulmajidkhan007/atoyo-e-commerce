import React, {useState} from 'react';
import {ScrollView, Text, View} from 'react-native';
import {makeStyles, spacing, useTheme, type FontScaleMode, type ThemeMode} from '../theme';
import {LOCALE_LABELS, useI18n, type Locale} from '../i18n';
import {Button, Card, Chip, Field} from '../components/ui';
import {subscribeToNewsletter} from '../api';
import {useToast} from '../components/Toast';
import {refreshPushRegistration, type PushStatus} from '../push';
import {useAuth} from '../auth';

/**
 * SOZLAMALAR: ko'rinish (yorug'/qorong'i/tizim), til (uz/en/ru) va
 * yangiliklarga obuna - saytdagi ThemeToggle, LanguageSwitcher va
 * NewsletterForm ning ilova varianti.
 */
export function SettingsScreen() {
  const styles = useStyles();
  const toast = useToast();
  const {mode, setMode, fontScaleMode, setFontScaleMode} = useTheme();
  const {t, locale, setLocale} = useI18n();
  const {user} = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  /** Bildirishnoma holati - "kelmayapti" sababini ko'rsatish uchun. */
  const [push, setPush] = useState<PushStatus | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  const checkPush = async () => {
    setPushBusy(true);
    try {
      const status = await refreshPushRegistration(Boolean(user));
      setPush(status);
      if (status.saved) toast.success('Bildirishnomalar yoqilgan.');
      else if (!status.allowed) toast.error('Bildirishnomaga ruxsat berilmagan.');
      else if (!user) toast.error('Avval hisobingizga kiring.');
      else toast.error(status.error ?? 'Tokenni saqlab bo‘lmadi.');
    } finally {
      setPushBusy(false);
    }
  };

  const themeOptions: {value: ThemeMode; label: string}[] = [
    {value: 'light', label: t.themeLight},
    {value: 'dark', label: t.themeDark},
    {value: 'system', label: t.themeSystem},
  ];

  const fontOptions: {value: FontScaleMode; label: string}[] = [
    {value: 'system', label: t.fontSystem},
    {value: 'small', label: t.fontSmall},
    {value: 'normal', label: t.fontNormal},
    {value: 'large', label: t.fontLarge},
    {value: 'xlarge', label: t.fontXLarge},
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
        <Text style={styles.cardTitle}>Bildirishnomalar</Text>
        <Text style={styles.hint}>
          Buyurtma holati o‘zgarganda va yangi mahsulot/chegirma bo‘lganda telefoningizga
          xabar keladi. Kelmayotgan bo‘lsa shu tugmani bosing.
        </Text>
        {push && (
          <Text style={styles.hint}>
            {`Ruxsat: ${push.allowed ? 'bor' : 'yo‘q'} · Qurilma tokeni: ${
              push.hasToken ? 'bor' : 'yo‘q'
            } · Serverda: ${push.saved ? 'saqlangan' : 'saqlanmagan'}`}
            {push.error ? `\n${push.error}` : ''}
          </Text>
        )}
        <Button
          title="Bildirishnomani tekshirish"
          variant="outline"
          loading={pushBusy}
          onPress={checkPush}
        />
      </Card>

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
        <Text style={styles.cardTitle}>{t.fontSizeTitle}</Text>
        <Text style={styles.hint}>{t.fontSizeHint}</Text>
        <View style={styles.chips}>
          {fontOptions.map(option => (
            <Chip
              key={option.value}
              label={option.label}
              active={fontScaleMode === option.value}
              onPress={() => setFontScaleMode(option.value)}
            />
          ))}
        </View>
        <Text style={styles.sample}>{t.heroTitle}</Text>
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
  hint: {color: c.muted, fontSize: 12, lineHeight: 17},
  /** Tanlangan o'lcham qanday ko'rinishini darhol ko'rsatadi. */
  sample: {color: c.text, fontSize: 15, marginTop: spacing.xs},
}));

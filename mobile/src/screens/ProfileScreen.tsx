import React, {useEffect, useRef, useState} from 'react';
import {Alert, Linking, ScrollView, Text, View} from 'react-native';
import {makeStyles, radius, spacing} from '../theme';
import {useI18n} from '../i18n';
import {Button, Field, Loading} from '../components/ui';
import {useAuth} from '../auth';
import {SITE_URL} from '../api';
import {googleSignInAvailable, signInWithGoogle, signInWithTelegram} from '../social-auth';
import type {TabScreenProps} from '../navigation/types';

/**
 * Profil: kirmagan bo'lsa - kirish/ro'yxatdan o'tish (Google va Telegram
 * bilan ham, saytdagi kabi), kirgan bo'lsa - ma'lumotlarni tahrirlash,
 * buyurtmalar, sozlamalar va chiqish.
 */
export function ProfileScreen({navigation}: TabScreenProps<'Profil'>) {
  const styles = useStyles();
  const {t} = useI18n();
  const {user, loading, signIn, register, signOut, resetPassword, saveProfile} = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [social, setSocial] = useState<'google' | 'telegram' | null>(null);
  const [tgWaiting, setTgWaiting] = useState(false);

  // Ekran yopilganda Telegram so'rovi to'xtashi kerak.
  const cancelledRef = useRef(false);
  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  // Foydalanuvchi o'zgarganda forma maydonlarini bir marta to'ldiramiz.
  // React'ning tavsiya qilgan usuli: effekt emas, render paytida moslash.
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  if (user && user.uid !== loadedUid) {
    setLoadedUid(user.uid);
    setName(user.displayName ?? '');
    setPhone(user.phoneNumber ?? '');
    setAddress(user.homeAddress ?? '');
  }

  if (loading) return <Loading />;

  // ---- Tizimga kirmagan holat ----
  if (!user) {
    const submit = async () => {
      setBusy(true);
      try {
        if (mode === 'login') await signIn(email, password);
        else await register(name.trim() || t.customer, email, password);
      } catch (error) {
        Alert.alert(t.error, error instanceof Error ? error.message : t.loginFailed);
      } finally {
        setBusy(false);
      }
    };

    const handleGoogle = async () => {
      setSocial('google');
      try {
        await signInWithGoogle();
      } catch (error) {
        // Foydalanuvchi o'zi bekor qilgan bo'lsa - jim turamiz.
        if (error instanceof Error && error.message !== 'cancelled') {
          Alert.alert(
            t.error,
            error.message === 'google-not-configured' ? t.googleUnavailable : t.loginFailed,
          );
        }
      } finally {
        setSocial(null);
      }
    };

    const handleTelegram = async () => {
      setSocial('telegram');
      try {
        await signInWithTelegram({
          onWaiting: () => setTgWaiting(true),
          isCancelled: () => cancelledRef.current,
        });
      } catch {
        if (!cancelledRef.current) Alert.alert(t.error, t.telegramFailed);
      } finally {
        setSocial(null);
        setTgWaiting(false);
      }
    };

    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{padding: spacing.lg, gap: spacing.md}}>
        <Text style={styles.title}>{mode === 'login' ? t.login : t.register}</Text>

        {/* Ijtimoiy kirish - saytdagi kabi yonma-yon, tor tugmalar. */}
        <View style={styles.socialRow}>
          {googleSignInAvailable && (
            <Button
              title={t.withGoogle}
              icon="G"
              variant="outline"
              compact
              loading={social === 'google'}
              disabled={busy || social !== null}
              onPress={handleGoogle}
            />
          )}
          <Button
            title={t.withTelegram}
            icon="✈"
            variant="outline"
            compact
            loading={social === 'telegram'}
            disabled={busy || social !== null}
            onPress={handleTelegram}
          />
        </View>

        {tgWaiting && <Text style={styles.hint}>{t.telegramWaiting}</Text>}

        <View style={styles.divider}>
          <Text style={styles.dividerText}>{t.email}</Text>
        </View>

        {mode === 'register' && <Field label={t.fullName} value={name} onChangeText={setName} />}
        <Field
          label={t.email}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Field label={t.password} value={password} onChangeText={setPassword} secureTextEntry />

        <Button
          title={mode === 'login' ? t.login : t.register}
          onPress={submit}
          loading={busy}
          disabled={social !== null}
        />
        <Button
          title={mode === 'login' ? t.noAccount : t.haveAccount}
          variant="outline"
          onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
        />
        {mode === 'login' && (
          <Button
            title={t.forgotPassword}
            variant="outline"
            onPress={async () => {
              if (!email.trim()) {
                Alert.alert(t.email, t.enterEmailFirst);
                return;
              }
              await resetPassword(email).catch(() => {});
              Alert.alert(t.saved, t.resetSent);
            }}
          />
        )}

        <Button
          title={t.titleSettings}
          icon="⚙"
          variant="outline"
          onPress={() => navigation.navigate('Sozlamalar')}
        />
      </ScrollView>
    );
  }

  // ---- Kirgan holat ----
  const save = async () => {
    setBusy(true);
    try {
      await saveProfile({
        displayName: name.trim(),
        phoneNumber: phone.trim(),
        homeAddress: address.trim(),
      });
      Alert.alert(t.saved, t.saved);
    } catch {
      Alert.alert(t.error, t.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{padding: spacing.lg, gap: spacing.md}}>
      <View style={styles.card}>
        <Text style={styles.name}>{user.displayName ?? t.customer}</Text>
        <Text style={styles.cardMuted}>{user.email ?? user.phoneNumber ?? ''}</Text>
      </View>

      <Field label={t.fullName} value={name} onChangeText={setName} />
      <Field label={t.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label={t.homeAddress} value={address} onChangeText={setAddress} multiline />
      <Button title={t.save} onPress={save} loading={busy} />

      <Button
        title={t.myOrders}
        icon="📦"
        variant="outline"
        onPress={() => navigation.navigate('Buyurtmalarim')}
      />
      <Button
        title={t.titleBlog}
        icon="📰"
        variant="outline"
        onPress={() => navigation.navigate('Blog')}
      />
      <Button
        title={t.titleContact}
        icon="📞"
        variant="outline"
        onPress={() => navigation.navigate('Kontakt')}
      />
      <Button
        title={t.titleSettings}
        icon="⚙"
        variant="outline"
        onPress={() => navigation.navigate('Sozlamalar')}
      />
      <Button
        title={t.openSite}
        icon="🌐"
        variant="outline"
        onPress={() => Linking.openURL(SITE_URL)}
      />
      <Button title={t.signOut} variant="danger" onPress={() => signOut()} />
    </ScrollView>
  );
}

const useStyles = makeStyles(c => ({
  screen: {flex: 1, backgroundColor: c.bg},
  title: {fontSize: 22, fontWeight: '800', color: c.text},
  socialRow: {flexDirection: 'row', gap: spacing.sm},
  hint: {color: c.muted, fontSize: 13, lineHeight: 19},
  divider: {borderTopWidth: 1, borderTopColor: c.border, marginTop: spacing.xs, paddingTop: spacing.sm},
  dividerText: {color: c.muted, fontSize: 12, textAlign: 'center'},
  card: {
    backgroundColor: c.brand,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 2,
  },
  name: {color: c.onBrand, fontSize: 18, fontWeight: '700'},
  cardMuted: {color: c.onBrandMuted, fontSize: 13},
}));

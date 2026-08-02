import React, {useEffect, useRef, useState} from 'react';
import {Linking, ScrollView, Text, View} from 'react-native';
import {makeStyles, radius, spacing} from '../theme';
import {useI18n} from '../i18n';
import {Button, Field, Loading} from '../components/ui';
import {useAuth, isStaffUser} from '../auth';
import {SITE_URL} from '../api';
import {googleSignInAvailable, signInWithGoogle, signInWithTelegram} from '../social-auth';
import type {TabScreenProps} from '../navigation/types';
import {useToast} from '../components/Toast';
import {Icon} from '../components/Icon';

/**
 * Profil: kirmagan bo'lsa - kirish/ro'yxatdan o'tish (Google va Telegram
 * bilan ham, saytdagi kabi), kirgan bo'lsa - ma'lumotlarni tahrirlash,
 * buyurtmalar, sozlamalar va chiqish.
 */
export function ProfileScreen({navigation}: TabScreenProps<'Profil'>) {
  const styles = useStyles();
  const toast = useToast();
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
        toast.error(error instanceof Error ? error.message : t.loginFailed);
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
          toast.error(error.message === 'google-not-configured' ? t.googleUnavailable : t.loginFailed);
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
      } catch (error) {
        // Server sababni aytadi (masalan huquq yetishmasligi) - shuni
        // ko'rsatamiz, "ishlamadi" deb qo'ya qolmaymiz.
        if (!cancelledRef.current) {
          const message = error instanceof Error ? error.message : '';
          toast.error(message && message !== 'timeout' ? message : t.telegramFailed);
        }
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
              icon="google"
              variant="outline"
              compact
              loading={social === 'google'}
              disabled={busy || social !== null}
              onPress={handleGoogle}
            />
          )}
          <Button
            title={t.withTelegram}
            icon="telegram"
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
                toast.error(t.enterEmailFirst);
                return;
              }
              await resetPassword(email).catch(() => {});
              toast.success(t.resetSent);
            }}
          />
        )}

        <Button
          title={t.titleSettings}
          icon="settings"
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
      toast.success(t.saved);
    } catch {
      toast.error(t.error);
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
        icon="orders"
        variant="outline"
        onPress={() => navigation.navigate('Buyurtmalarim')}
      />
      <Button
        title={t.titleBlog}
        icon="blog"
        variant="outline"
        onPress={() => navigation.navigate('Blog')}
      />
      <Button
        title={t.titleContact}
        icon="phone"
        variant="outline"
        onPress={() => navigation.navigate('Kontakt')}
      />
      <Button
        title={t.titleSettings}
        icon="settings"
        variant="outline"
        onPress={() => navigation.navigate('Sozlamalar')}
      />
      {/* XODIMLAR uchun: boshqaruv paneli. Panel serverdagi sessiya
          cookie'si bilan ishlaydi, shuning uchun brauzerda ochiladi -
          u yerda sayt hisobingiz bilan kirasiz. */}
      {isStaffUser(user) && (
        <>
          <View style={styles.sectionRow}>
            <Icon name="build" size={18} color={styles.c.accent} />
            <Text style={styles.section}>{t.adminPanel}</Text>
          </View>
          <Button
            title="Buyurtmalar"
            icon="receipt"
            onPress={() => navigation.navigate('AdminBuyurtmalar')}
          />
          <Button
            title="Mahsulotlar (kirim va tahrir)"
            icon="orders"
            onPress={() => navigation.navigate('AdminMahsulotlar')}
          />
          <Button
            title="Statistika, blog, promokod, mijozlar"
            icon="stats"
            onPress={() => navigation.navigate('AdminQolgan')}
          />
          <Button
            title="To'liq panel (brauzerda)"
            icon="language"
            variant="outline"
            onPress={() => Linking.openURL(`${SITE_URL}/admin`)}
          />
          <Text style={styles.hint}>{t.adminPanelHint}</Text>
        </>
      )}

      <Button
        title={t.openSite}
        icon="language"
        variant="outline"
        onPress={() => Linking.openURL(SITE_URL)}
      />
      <Button title={t.signOut} variant="danger" onPress={() => signOut()} />
    </ScrollView>
  );
}

const useStyles = makeStyles(c => ({
  sectionRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8},
  section: {color: c.text, fontWeight: '800', fontSize: 16, marginTop: spacing.sm},
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

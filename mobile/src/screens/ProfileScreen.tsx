import React, {useState} from 'react';
import {Alert, Linking, ScrollView, StyleSheet, Text, View} from 'react-native';
import {colors, radius, spacing} from '../theme';
import {Button, Field, Loading} from '../components/ui';
import {useAuth} from '../auth';
import {SITE_URL} from '../api';
import type {TabScreenProps} from '../navigation/types';

/**
 * Profil: kirmagan bo'lsa - kirish/ro'yxatdan o'tish formasi,
 * kirgan bo'lsa - ma'lumotlarni tahrirlash va chiqish.
 */
export function ProfileScreen({navigation}: TabScreenProps<'Profil'>) {
  const {user, loading, signIn, register, signOut, resetPassword, saveProfile} = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);

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
        else await register(name.trim() || 'Mijoz', email, password);
      } catch (error) {
        Alert.alert('Xatolik', error instanceof Error ? error.message : 'Kirish amalga oshmadi.');
      } finally {
        setBusy(false);
      }
    };

    return (
      <ScrollView contentContainerStyle={{padding: spacing.lg, gap: spacing.md}}>
        <Text style={styles.title}>{mode === 'login' ? 'Kirish' : "Ro'yxatdan o'tish"}</Text>

        {mode === 'register' && <Field label="Ism-familiya" value={name} onChangeText={setName} />}
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Field label="Parol" value={password} onChangeText={setPassword} secureTextEntry />

        <Button title={mode === 'login' ? 'Kirish' : "Ro'yxatdan o'tish"} onPress={submit} loading={busy} />
        <Button
          title={mode === 'login' ? "Hisobingiz yo'qmi? Ro'yxatdan o'ting" : 'Hisobingiz bormi? Kiring'}
          variant="outline"
          onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
        />
        {mode === 'login' && (
          <Button
            title="Parolni unutdingizmi?"
            variant="outline"
            onPress={async () => {
              if (!email.trim()) {
                Alert.alert('Email', 'Avval email manzilingizni kiriting.');
                return;
              }
              await resetPassword(email).catch(() => {});
              Alert.alert('Yuborildi', 'Parolni tiklash havolasi emailingizga yuborildi.');
            }}
          />
        )}
      </ScrollView>
    );
  }

  // ---- Kirgan holat ----
  const save = async () => {
    setBusy(true);
    try {
      await saveProfile({displayName: name.trim(), phoneNumber: phone.trim(), homeAddress: address.trim()});
      Alert.alert('Saqlandi', "Ma'lumotlaringiz yangilandi.");
    } catch {
      Alert.alert('Xatolik', 'Saqlab bo‘lmadi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{padding: spacing.lg, gap: spacing.md}}>
      <View style={styles.card}>
        <Text style={styles.name}>{user.displayName ?? 'Mijoz'}</Text>
        <Text style={styles.muted}>{user.email}</Text>
      </View>

      <Field label="Ism-familiya" value={name} onChangeText={setName} />
      <Field label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="Uy manzili" value={address} onChangeText={setAddress} multiline />
      <Button title="Saqlash" onPress={save} loading={busy} />

      <Button title="Buyurtmalarim" variant="outline" onPress={() => navigation.navigate('Buyurtmalarim')} />
      <Button title="Saytga o'tish" variant="outline" onPress={() => Linking.openURL(SITE_URL)} />
      <Button title="Chiqish" variant="danger" onPress={() => signOut()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: {fontSize: 22, fontWeight: '800', color: colors.navy},
  card: {
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 2,
  },
  name: {color: colors.white, fontSize: 18, fontWeight: '700'},
  muted: {color: '#9FC0D2', fontSize: 13},
});

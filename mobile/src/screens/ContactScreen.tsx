import React, {useState} from 'react';
import {Alert, Linking, ScrollView, Text} from 'react-native';
import {makeStyles, spacing} from '../theme';
import {useI18n} from '../i18n';
import {Button, Card, Field} from '../components/ui';
import {sendContactRequest} from '../api';
import {useAuth} from '../auth';

/**
 * Bog'lanish formasi - saytdagi `/kontakt` bilan bir xil route'ga
 * yuboradi, ya'ni ariza xodimlar guruhidagi topikka tushadi.
 */
export function ContactScreen() {
  const styles = useStyles();
  const {t} = useI18n();
  const {user} = useAuth();

  const [name, setName] = useState(user?.displayName ?? '');
  const [phone, setPhone] = useState(user?.phoneNumber ?? '');
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (name.trim().length < 2) {
      Alert.alert(t.fullName, t.nameTooShort);
      return;
    }
    if (phone.replace(/\D/g, '').length < 9) {
      Alert.alert(t.phone, t.phoneInvalid);
      return;
    }
    if (question.trim().length < 3) return;

    setBusy(true);
    try {
      await sendContactRequest({name: name.trim(), phone: phone.trim(), question: question.trim()});
      setQuestion('');
      Alert.alert(t.titleContact, t.contactSent);
    } catch (error) {
      Alert.alert(t.error, error instanceof Error ? error.message : t.contactFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{padding: spacing.lg, gap: spacing.md}}>
      <Text style={styles.intro}>{t.contactIntro}</Text>

      <Card>
        <Field label={t.fullName} value={name} onChangeText={setName} />
        <Field
          label={t.phone}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+998901234567"
        />
        <Field label={t.yourQuestion} value={question} onChangeText={setQuestion} multiline />
        <Button title={t.send} onPress={submit} loading={busy} />
      </Card>

      <Button
        title="Telegram"
        icon="✈"
        variant="outline"
        onPress={() => Linking.openURL('https://t.me/Atoyo_uz_bot')}
      />
    </ScrollView>
  );
}

const useStyles = makeStyles(c => ({
  screen: {flex: 1, backgroundColor: c.bg},
  intro: {color: c.muted, fontSize: 14, lineHeight: 20},
}));

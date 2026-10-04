import React, {useEffect, useState} from 'react';
import {LayoutAnimation, Platform, Pressable, ScrollView, Text, UIManager, View} from 'react-native';
import {makeStyles, spacing} from '../theme';
import {useI18n} from '../i18n';
import {Button, Card, EmptyState, Loading} from '../components/ui';
import {Icon} from '../components/Icon';
import {fetchFaq, type FaqEntry} from '../content-api';

// Android'da LayoutAnimation qo'lda yoqiladi (yangi arxitekturada kerak emas - bo'sh chaqiruv).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * SAVOL-JAVOB. Matn saytdagi `/savol-javob` bilan bir xil (admin
 * panelda tahrirlanadi, serverdan keladi). Akkordeon: BITTASI ochiq -
 * yangisi ochilsa oldingisi yopiladi.
 */
export function FaqScreen() {
  const styles = useStyles();
  const {t, locale} = useI18n();
  const [items, setItems] = useState<FaqEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  /** Qayta urinish hisoblagichi: o'zgarsa ro'yxat qaytadan olinadi. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchFaq(locale)
      .then(data => alive && setItems(data))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [locale, attempt]);

  const load = () => {
    setFailed(false);
    setItems(null);
    setAttempt(n => n + 1);
  };

  const toggle = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(current => (current === index ? null : index));
  };

  if (failed) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>{t.loadFailed}</Text>
        <Button title={t.retry} variant="outline" onPress={load} />
      </View>
    );
  }
  if (!items) return <Loading />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>{t.faqIntro}</Text>
      {items.length === 0 && <EmptyState text={t.faqEmpty} />}
      {items.map((item, index) => {
        const expanded = open === index;
        return (
          <Card key={index} style={styles.item}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{expanded}}
              onPress={() => toggle(index)}
              style={styles.head}>
              <Text style={styles.question}>{item.question}</Text>
              <View style={expanded ? styles.chevronOpen : undefined}>
                <Icon name="chevronRight" size={20} color={styles.c.accent} />
              </View>
            </Pressable>
            {expanded && <Text style={styles.answer}>{item.answer}</Text>}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles(c => ({
  screen: {flex: 1, backgroundColor: c.bg},
  content: {padding: spacing.lg, gap: spacing.md},
  center: {flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md},
  hint: {color: c.muted, fontSize: 14, lineHeight: 20},
  item: {padding: spacing.md},
  head: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md},
  question: {flex: 1, color: c.text, fontSize: 15, fontWeight: '600'},
  chevronOpen: {transform: [{rotate: '90deg'}]},
  answer: {color: c.muted, fontSize: 14, lineHeight: 21, marginTop: spacing.sm},
}));

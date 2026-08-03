import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {makeStyles, spacing} from '../theme';
import {useI18n} from '../i18n';
import {Icon} from '../components/Icon';
import {launchImageLibrary} from 'react-native-image-picker';
import {askAssistant, assistantEnabled, searchByImage, type AssistantProduct} from '../api';
import {useAppDispatch} from '../store';
import {addItem} from '../store/cartSlice';
import type {RootStackParamList} from '../navigation/types';

/**
 * ATOYO YORDAMCHISI (ilovada). Saytdagi bilan bir xil `/api/assistant`
 * ni chaqiradi - ya'ni javob ham, chegaralar ham bir xil. Suhbat faqat
 * shu ekranda saqlanadi (serverda emas).
 */

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  products?: AssistantProduct[];
}

export function AssistantScreen() {
  const styles = useStyles();
  const {t, money} = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([{role: 'assistant', content: t.assistantIntro}]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let active = true;
    assistantEnabled().then(value => {
      if (active) setEnabled(value);
    });
    return () => {
      active = false;
    };
  }, []);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (question.length < 2 || busy) return;

      const history = messages
        .filter(message => message.content !== t.assistantIntro)
        .slice(-8)
        .map(({role, content}) => ({role, content}));

      setMessages(prev => [...prev, {role: 'user', content: question}]);
      setInput('');
      setBusy(true);
      try {
        const reply = await askAssistant({question, history});
        setMessages(prev => [
          ...prev,
          {role: 'assistant', content: reply.answer, products: reply.products.slice(0, 3)},
        ]);

        // Savatga qo'shish/rasmiylashtirish - savat ilovada turadi.
        for (const action of reply.actions) {
          if (action.type === 'add_to_cart' && action.productId) {
            dispatch(
              addItem({
                productId: action.productId,
                name: action.name ?? '',
                price: action.price ?? 0,
                quantity: action.quantity ?? 1,
                thumbnailUrl: action.thumbnailUrl ?? '',
              }),
            );
          }
          if (action.type === 'checkout') navigation.navigate('Buyurtma');
        }
      } catch (error) {
        setMessages(prev => [
          ...prev,
          {role: 'assistant', content: error instanceof Error ? error.message : t.assistantError},
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, dispatch, messages, navigation, t.assistantIntro, t.assistantError],
  );

  /** Galereyadan surat tanlab, katalogdan o'xshashini qidiradi. */
  const pickPhoto = useCallback(async () => {
    if (busy) return;
    const picked = await launchImageLibrary({
      mediaType: 'photo',
      includeBase64: true,
      // Katta suratlar serverda ham, tarmoqda ham og'irlik qiladi.
      maxWidth: 1280,
      maxHeight: 1280,
      quality: 0.8,
    });
    const asset = picked.assets?.[0];
    if (!asset?.base64) return;

    setMessages(prev => [...prev, {role: 'user', content: t.photoSent}]);
    setBusy(true);
    try {
      const result = await searchByImage({
        base64: asset.base64,
        mimeType: asset.type ?? 'image/jpeg',
      });
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content:
            result.products.length > 0
              ? `${result.description}\n\n${t.photoFound}`
              : `${result.description}\n\n${t.photoNoMatch}`,
          products: result.products.slice(0, 3).map(product => ({
            id: product.id,
            name: product.name,
            price: product.price,
            discountPrice: product.effectivePrice < product.price ? product.effectivePrice : null,
            stock: product.stock,
          })),
        },
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {role: 'assistant', content: error instanceof Error ? error.message : t.assistantError},
      ]);
    } finally {
      setBusy(false);
    }
  }, [busy, t.assistantError, t.photoFound, t.photoNoMatch, t.photoSent]);

  if (enabled === false) {
    return (
      <View style={styles.center}>
        <Icon name="assistant" size={40} color={styles.c.muted} />
        <Text style={styles.offText}>{t.assistantOff}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <ScrollView
        ref={scrollRef}
        style={styles.list}
        contentContainerStyle={{padding: spacing.md, gap: spacing.sm}}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({animated: true})}>
        {messages.map((message, index) => (
          <View
            key={index}
            style={[styles.bubble, message.role === 'user' ? styles.mine : styles.theirs]}>
            <Text style={message.role === 'user' ? styles.mineText : styles.theirsText}>
              {message.content}
            </Text>

            {message.products?.map(product => (
              <Pressable
                key={product.id}
                style={styles.productRow}
                onPress={() => navigation.navigate('Mahsulot', {productId: product.id})}>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.productPrice}>
                  {money(product.discountPrice ?? product.price)}
                  {product.stock > 0 ? '' : ` • ${t.outOfStock}`}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}

        {busy && <ActivityIndicator color={styles.c.accent} style={{alignSelf: 'flex-start'}} />}
      </ScrollView>

      <View style={styles.inputRow}>
        <Pressable style={styles.photoBtn} disabled={busy} onPress={pickPhoto}>
          <Icon name="image" size={20} color={styles.c.accent} />
        </Pressable>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={value => setInput(value.slice(0, 600))}
          placeholder={t.assistantPlaceholder}
          placeholderTextColor={styles.c.muted}
          multiline
          editable={!busy}
        />
        <Pressable
          style={[styles.sendBtn, (busy || input.trim().length < 2) && styles.sendDisabled]}
          disabled={busy || input.trim().length < 2}
          onPress={() => send(input)}>
          <Icon name="send" size={20} color={styles.c.onAccent} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(c => ({
  screen: {flex: 1, backgroundColor: c.bg},
  list: {flex: 1},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: c.bg},
  offText: {color: c.muted, textAlign: 'center', paddingHorizontal: spacing.xl},
  bubble: {maxWidth: '88%', borderRadius: 14, padding: spacing.md, gap: spacing.sm},
  mine: {alignSelf: 'flex-end', backgroundColor: c.accent},
  theirs: {alignSelf: 'flex-start', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border},
  mineText: {color: c.onAccent, fontSize: 14},
  theirsText: {color: c.text, fontSize: 14, lineHeight: 20},
  productRow: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    padding: spacing.sm,
    backgroundColor: c.surfaceAlt,
  },
  productName: {color: c.text, fontWeight: '600', fontSize: 13},
  productPrice: {color: c.accent, fontSize: 13, marginTop: 2},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.chrome,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    color: c.text,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accent,
  },
  photoBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  sendDisabled: {opacity: 0.5},
}));

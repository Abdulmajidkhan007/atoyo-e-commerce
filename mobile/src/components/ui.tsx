import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import {colors, radius, spacing} from '../theme';

/** Ilova bo'ylab takrorlanadigan kichik UI bo'laklari - bir joyda. */

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.gold} size="large" />
    </View>
  );
}

export function EmptyState({text}: {text: string}) {
  return (
    <View style={styles.center}>
      <Text style={styles.muted}>{text}</Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({pressed}) => [
        styles.button,
        isPrimary && {backgroundColor: colors.gold},
        isDanger && {backgroundColor: colors.danger},
        variant === 'outline' && {borderWidth: 1, borderColor: colors.border},
        (disabled || loading) && {opacity: 0.5},
        pressed && {opacity: 0.8},
      ]}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.navy : colors.gold} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            {color: isPrimary ? colors.navy : isDanger ? colors.white : colors.navy},
          ]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Field(props: TextInputProps & {label: string}) {
  const {label, ...rest} = props;
  return (
    <View style={{gap: spacing.xs}}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        {...rest}
        style={[styles.input, props.multiline && {height: 90, textAlignVertical: 'top'}]}
      />
    </View>
  );
}

/** Yulduzli reyting (faqat ko'rsatish uchun). */
export function Stars({value, size = 14}: {value: number; size?: number}) {
  const rounded = Math.round(value);
  return (
    <Text style={{fontSize: size, color: colors.gold}}>
      {'★'.repeat(rounded)}
      <Text style={{color: colors.border}}>{'★'.repeat(Math.max(0, 5 - rounded))}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl},
  muted: {color: colors.muted, textAlign: 'center'},
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonText: {fontWeight: '700', fontSize: 15},
  label: {color: colors.muted, fontSize: 13},
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    color: colors.navy,
    backgroundColor: colors.white,
  },
});

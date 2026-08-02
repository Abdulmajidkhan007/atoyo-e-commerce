import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import {makeStyles, radius, spacing} from '../theme';
import {Icon, type IconName} from './Icon';

/** Ilova bo'ylab takrorlanadigan kichik UI bo'laklari - bir joyda. */

export function Loading() {
  const styles = useStyles();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={styles.c.accent} size="large" />
    </View>
  );
}

export function EmptyState({text}: {text: string}) {
  const styles = useStyles();
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
  icon,
  compact,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  /** Matndan oldin turadigan ikonka (saytdagi Material belgilari). */
  icon?: IconName;
  /** Yonma-yon turadigan kichik tugma (Google/Telegram kabi). */
  compact?: boolean;
}) {
  const styles = useStyles();
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const textColor = isPrimary ? styles.c.onAccent : isDanger ? styles.c.white : styles.c.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({pressed}) => [
        styles.button,
        compact && styles.buttonCompact,
        isPrimary && {backgroundColor: styles.c.accent},
        isDanger && {backgroundColor: styles.c.danger},
        variant === 'outline' && styles.buttonOutline,
        (disabled || loading) && {opacity: 0.5},
        pressed && {opacity: 0.8},
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.buttonRow}>
          {icon && <Icon name={icon} size={18} color={textColor} />}
          <Text style={[styles.buttonText, {color: textColor}]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field(props: TextInputProps & {label: string}) {
  const styles = useStyles();
  const {label, style, ...rest} = props;
  return (
    <View style={{gap: spacing.xs}}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={styles.c.muted}
        {...rest}
        style={[styles.input, props.multiline && styles.inputMultiline, style]}
      />
    </View>
  );
}

/** Yulduzli reyting (faqat ko'rsatish uchun) - saytdagi kabi ikonkalar. */
export function Stars({value, size = 14}: {value: number; size?: number}) {
  const styles = useStyles();
  const rounded = Math.round(value);
  return (
    <View style={{flexDirection: 'row'}}>
      {[0, 1, 2, 3, 4].map(i => (
        <Icon
          key={i}
          name={i < rounded ? 'star' : 'starBorder'}
          size={size + 3}
          color={i < rounded ? styles.c.accent : styles.c.border}
        />
      ))}
    </View>
  );
}

/** Saytdagi `rounded-xl2 border` kartochkasining ilova varianti. */
export function Card({children, style}: {children: React.ReactNode; style?: object}) {
  const styles = useStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({children}: {children: React.ReactNode}) {
  const styles = useStyles();
  return <Text style={styles.section}>{children}</Text>;
}

/** Filtr/sozlamalarda ishlatiladigan tanlov "chip"i. */
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && {backgroundColor: styles.c.accentSoft, borderColor: styles.c.accent},
      ]}>
      <Text style={[styles.chipText, active && {fontWeight: '700'}]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(c => ({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl},
  muted: {color: c.muted, textAlign: 'center'},
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonCompact: {flex: 1, minHeight: 44, paddingHorizontal: spacing.md},
  buttonOutline: {borderWidth: 1, borderColor: c.border},
  buttonRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  buttonText: {fontWeight: '700', fontSize: 15},
  label: {color: c.muted, fontSize: 13},
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    color: c.text,
    backgroundColor: c.surface,
  },
  inputMultiline: {height: 90, textAlignVertical: 'top', paddingTop: spacing.sm},
  card: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: c.surface,
  },
  section: {
    color: c.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipText: {color: c.text, fontSize: 13},
}));

import React, {useEffect, useMemo, useState} from 'react';
import {Animated, Easing, PanResponder, Pressable, ScrollView, Text} from 'react-native';
import {makeStyles, spacing} from '../theme';

/**
 * SEGMENT TANLAGICH — surib tanlanadigan "yostiq" (ilova tomoni).
 *
 * Saytdagi `SegmentedPicker` bilan bir xil xatti-harakat: tanlangan
 * variantning orqasidagi rang SAKRAMAYDI, Telegramning pastki paneli
 * kabi SURILIB boradi; yostiqning o'zini barmoq bilan ushlab
 * chapga-o'ngga sudrab ham tanlash mumkin.
 *
 * O'lchamlar `onLayout` bilan olinadi (RN da `offsetLeft` yo'q).
 */

export interface SegmentOption {
  value: string;
  label: string;
  /** Zaxirasi yo'q - xiralashadi, lekin tanlansa bo'ladi. */
  dimmed?: boolean;
}

interface Box {
  x: number;
  width: number;
}

export function SegmentedPicker({
  options,
  value,
  onChange,
}: {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const styles = useStyles();
  const [boxes, setBoxes] = useState<Record<number, Box>>({});
  // Animated qiymat bir marta yaratiladi (initializer - har renderda emas).
  const [translate] = useState(() => new Animated.Value(0));

  const index = Math.max(
    0,
    options.findIndex(option => option.value === value),
  );
  const current = boxes[index];

  // Tanlov o'zgarganda yostiq SURILIB boradi.
  useEffect(() => {
    if (!current) return;
    Animated.timing(translate, {
      toValue: current.x,
      duration: 260,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [current, translate]);

  /**
   * Sudrash. PanResponder joriy o'lchamlar bilan qayta yig'iladi -
   * shuning uchun ichida ref o'qish kerak emas: barmoq tekkanda
   * o'sha paytdagi qiymatlar ishlatiladi.
   */
  const responder = useMemo(() => {
    const list = Object.values(boxes);
    const box = boxes[index];

    const snap = (dx: number) => {
      if (!box) return;
      const center = box.x + dx + box.width / 2;
      let best = index;
      let bestDistance = Infinity;
      Object.entries(boxes).forEach(([key, item]) => {
        const distance = Math.abs(item.x + item.width / 2 - center);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = Number(key);
        }
      });

      const target = options[best];
      if (target && target.value !== value) {
        onChange(target.value);
      } else {
        // O'zgarish bo'lmasa yostiq joyiga qaytadi.
        Animated.timing(translate, {
          toValue: box.x,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 3,
      onPanResponderMove: (_event, gesture) => {
        const last = list[list.length - 1];
        if (!box || !last) return;
        // Yostiq ramkadan chiqib ketmasin.
        const maxX = Math.max(0, last.x + last.width - box.width);
        translate.setValue(Math.min(Math.max(box.x + gesture.dx, 0), maxX));
      },
      onPanResponderRelease: (_event, gesture) => snap(gesture.dx),
      onPanResponderTerminate: (_event, gesture) => snap(gesture.dx),
    });
  }, [boxes, index, options, value, onChange, translate]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.track}
      contentContainerStyle={styles.inner}>
      {current && (
        <Animated.View
          {...responder.panHandlers}
          style={[styles.pill, {width: current.width, transform: [{translateX: translate}]}]}
        />
      )}
      {options.map((option, i) => (
        <Pressable
          key={option.value}
          onLayout={event => {
            const {x, width} = event.nativeEvent.layout;
            setBoxes(prev =>
              prev[i]?.x === x && prev[i]?.width === width ? prev : {...prev, [i]: {x, width}},
            );
          }}
          onPress={() => onChange(option.value)}
          style={styles.item}>
          <Text
            style={[
              styles.text,
              option.value === value && styles.textOn,
              option.dimmed ? styles.dim : null,
            ]}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const useStyles = makeStyles(c => ({
  track: {
    width: '100%' as const,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 999,
  },
  inner: {
    flexGrow: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
    padding: 4,
  },
  /** Suriladigan rangli yostiq - tugmalarning ORQASIDA turadi. */
  pill: {
    position: 'absolute' as const,
    top: 4,
    bottom: 4,
    left: 0,
    borderRadius: 999,
    backgroundColor: c.accent,
  },
  item: {
    flexGrow: 1,
    alignItems: 'center' as const,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  text: {color: c.text, fontSize: 13, fontWeight: '600' as const},
  textOn: {color: c.onAccent},
  dim: {opacity: 0.5},
}));

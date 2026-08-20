import React, {useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import Video from 'react-native-video';
import {colors as c, spacing} from '../theme';

/**
 * VIDEO PLEYER (mahsulot galereyasi va blog maqolasi uchun).
 *
 * Nega alohida komponent: `react-native-video` ilovaga NATIV
 * kutubxona qo'shadi va uni bir joyda ushlab turish qulay — kelajakda
 * boshqasiga almashtirilsa faqat shu fayl o'zgaradi.
 *
 * Xatti-harakati saytdagi bilan bir xil:
 *   • avtomatik O'YNAMAYDI (mobil internet tejaladi) — mijoz bosadi;
 *   • boshqaruv tugmalari (`controls`) tizimnikidan;
 *   • video ochilmasa (buzuq havola, tarmoq yo'q) bo'sh joy emas,
 *     tushunarli xabar qoladi.
 */
export function VideoPlayer({
  url,
  width,
  height,
}: {
  url: string;
  width: number;
  height: number;
}) {
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  // Foydalanuvchi ▶︎ ni bosmaguncha video yuklanmaydi.
  const [started, setStarted] = useState(false);

  if (failed) {
    return (
      <View style={[styles.box, {width, height}]}>
        <Text style={styles.muted}>Video ochilmadi</Text>
      </View>
    );
  }

  if (!started) {
    return (
      <Pressable style={[styles.box, {width, height}]} onPress={() => setStarted(true)}>
        <View style={styles.playCircle}>
          <Text style={styles.playIcon}>▶︎</Text>
        </View>
        <Text style={styles.muted}>Videoni ko&apos;rish</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.box, {width, height}]}>
      <Video
        source={{uri: url}}
        style={{width, height}}
        resizeMode="contain"
        controls
        paused={false}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setFailed(true);
        }}
      />
      {loading && <ActivityIndicator style={styles.spinner} color={c.gold} />}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#000',
  },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  playIcon: {color: '#fff', fontSize: 26},
  muted: {color: 'rgba(255,255,255,0.75)', fontSize: 13},
  spinner: {position: 'absolute'},
});

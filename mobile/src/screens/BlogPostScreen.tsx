import React, {useEffect, useState} from 'react';
import {Image, ScrollView, Text, useWindowDimensions, View} from 'react-native';
import {makeStyles, spacing} from '../theme';
import {useI18n} from '../i18n';
import {fetchBlogPost} from '../firebase';
import type {BlogPost} from '../types';
import {EmptyState, Loading} from '../components/ui';
import type {StackScreenProps} from '../navigation/types';
import {VideoPlayer} from '../components/VideoPlayer';

/** Maqola matni - saytdagi `/blog/[slug]` bilan bir xil mazmun. */
export function BlogPostScreen({route}: StackScreenProps<'Maqola'>) {
  const styles = useStyles();
  const {width: windowWidth} = useWindowDimensions();
  // Video matn bilan bir xil chekkada tursin (ikki tomondan `lg` bo'sh joy).
  const videoWidth = windowWidth - spacing.lg * 2;
  const {t, locale} = useI18n();
  const [post, setPost] = useState<BlogPost | null | undefined>();

  useEffect(() => {
    let active = true;
    fetchBlogPost(route.params.postId)
      .catch((): BlogPost | null => null)
      .then(item => {
        if (active) setPost(item);
      });
    return () => {
      active = false;
    };
  }, [route.params.postId]);

  if (post === undefined) return <Loading />;
  if (post === null) return <EmptyState text={t.blogEmpty} />;

  const dateLocale = locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{paddingBottom: spacing.xl}}>
      {post.coverImageUrl ? (
        <Image
          source={{uri: post.coverImageUrl}}
          style={styles.cover}
          resizeMode="cover"
          alt={post.title}
        />
      ) : null}

      <View style={{padding: spacing.lg, gap: spacing.sm}}>
        <Text style={styles.title}>{post.title}</Text>

        {/* Kontent videosi - endi ILOVANING O'ZIDA o'ynaydi
            (ilgari brauzerda ochilardi va mijoz ilovadan chiqib
            ketardi). Bosilgunicha yuklanmaydi. */}
        {!!post.videoUrl && (
          <VideoPlayer url={post.videoUrl} width={videoWidth} height={200} />
        )}

        <Text style={styles.date}>{new Date(post.createdAt).toLocaleDateString(dateLocale)}</Text>
        {post.content
          .split(/\n{2,}/)
          .filter(Boolean)
          .map((paragraph, index) => (
            <Text key={index} style={styles.paragraph}>
              {paragraph.trim()}
            </Text>
          ))}
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles(c => ({
  screen: {flex: 1, backgroundColor: c.bg},
  cover: {width: '100%', height: 220, backgroundColor: c.surfaceAlt},
  title: {color: c.text, fontWeight: '800', fontSize: 21},
  date: {color: c.muted, fontSize: 12},
  paragraph: {color: c.text, fontSize: 15, lineHeight: 23},
}));

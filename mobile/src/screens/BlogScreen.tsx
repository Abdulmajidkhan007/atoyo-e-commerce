import React, {useEffect, useState} from 'react';
import {FlatList, Image, Pressable, Text, View} from 'react-native';
import {makeStyles, radius, spacing} from '../theme';
import {useI18n} from '../i18n';
import {fetchBlogPosts} from '../firebase';
import type {BlogPost} from '../types';
import {EmptyState, Loading} from '../components/ui';
import type {StackScreenProps} from '../navigation/types';

/** Blog ro'yxati - saytdagi `/blog` sahifasining ilova varianti. */
export function BlogScreen({navigation}: StackScreenProps<'Blog'>) {
  const styles = useStyles();
  const {t} = useI18n();
  const [posts, setPosts] = useState<BlogPost[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchBlogPosts()
      .catch((): BlogPost[] => [])
      .then(items => {
        if (active) setPosts(items);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!posts) return <Loading />;
  if (posts.length === 0) return <EmptyState text={t.blogEmpty} />;

  return (
    <FlatList
      style={styles.screen}
      data={posts}
      keyExtractor={item => item.id}
      contentContainerStyle={{padding: spacing.md, gap: spacing.sm}}
      renderItem={({item}) => (
        <Pressable
          onPress={() => navigation.navigate('Maqola', {postId: item.id})}
          style={({pressed}) => [styles.card, pressed && {opacity: 0.9}]}>
          {item.coverImageUrl ? (
            <Image
              source={{uri: item.coverImageUrl}}
              style={styles.cover}
              resizeMode="cover"
              alt={item.title}
            />
          ) : null}
          <View style={{padding: spacing.md, gap: 4}}>
            <Text style={styles.title}>{item.title}</Text>
            <Text numberOfLines={3} style={styles.excerpt}>
              {item.excerpt}
            </Text>
            <Text style={styles.link}>{t.readMore} →</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const useStyles = makeStyles(c => ({
  screen: {flex: 1, backgroundColor: c.bg},
  card: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: c.surface,
  },
  cover: {width: '100%', height: 160, backgroundColor: c.surfaceAlt},
  title: {color: c.text, fontWeight: '700', fontSize: 16},
  excerpt: {color: c.muted, fontSize: 13, lineHeight: 19},
  link: {color: c.accent, fontSize: 13, fontWeight: '700', marginTop: 2},
}));

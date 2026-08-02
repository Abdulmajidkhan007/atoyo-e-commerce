import React, {useEffect, useState} from 'react';
import {FlatList, Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import {makeStyles, radius, spacing} from '../theme';
import {useI18n} from '../i18n';
import {
  adminBlogPosts,
  adminCreatePromo,
  adminPromoCodes,
  adminSetPostPublished,
  adminStats,
  adminUsers,
  type AdminBlogPost,
  type AdminPromo,
  type AdminUser,
} from '../api';
import {useToast} from '../components/Toast';
import {Button, EmptyState, Loading} from '../components/ui';
import type {StackScreenProps} from '../navigation/types';

/**
 * ADMIN: QOLGAN BO'LIMLAR — statistika, blog, promokodlar va
 * foydalanuvchilar. Hammasi bitta ekranda, tepadagi tugmalar bilan
 * almashtiriladi (ilovada ko'p ekran ochib yurmaslik uchun).
 *
 * Har bir amal saytning API'siga boradi va u yerda huquq qayta
 * tekshiriladi - ruxsati yo'q admin uchun ro'yxat shunchaki bo'sh
 * qoladi yoki xato chiqadi.
 */

type Tab = 'stats' | 'blog' | 'promo' | 'users';

const TABS: {key: Tab; label: string}[] = [
  {key: 'stats', label: '📊 Statistika'},
  {key: 'blog', label: '📰 Blog'},
  {key: 'promo', label: '🎟 Promokod'},
  {key: 'users', label: '👥 Mijozlar'},
];

export function AdminMoreScreen(_props: StackScreenProps<'AdminQolgan'>) {
  const styles = useStyles();
  const [tab, setTab] = useState<Tab>('stats');

  return (
    <View style={styles.screen}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}>
        {TABS.map(item => (
          <Pressable
            key={item.key}
            onPress={() => setTab(item.key)}
            style={[styles.tab, tab === item.key && styles.tabOn]}>
            <Text style={[styles.tabText, tab === item.key && styles.tabTextOn]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab === 'stats' && <StatsTab />}
      {tab === 'blog' && <BlogTab />}
      {tab === 'promo' && <PromoTab />}
      {tab === 'users' && <UsersTab />}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Statistika
// ---------------------------------------------------------------------------

function StatsTab() {
  const styles = useStyles();
  const {money} = useI18n();
  const [data, setData] = useState<Awaited<ReturnType<typeof adminStats>> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    adminStats()
      .then(result => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (failed) return <EmptyState text="Bu bo'lim uchun ruxsat yo'q" />;
  if (!data) return <Loading />;

  return (
    <ScrollView contentContainerStyle={{padding: spacing.md, gap: spacing.md}}>
      <View style={styles.card}>
        <Text style={styles.muted}>Jami buyurtmalar</Text>
        <Text style={styles.big}>{data.stats.totalOrders}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.muted}>Jami tushum</Text>
        <Text style={styles.big}>{money(data.stats.totalRevenue)}</Text>
      </View>

      <Text style={styles.section}>Eng ko&apos;p sotilganlar</Text>
      {data.topProducts.map(product => (
        <View key={product.id} style={styles.card}>
          <Text style={styles.name}>
            {product.code ? `№${product.code} — ` : ''}
            {product.name}
          </Text>
          <Text style={styles.muted}>
            {product.salesCount} marta sotilgan · {money(product.price)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

function BlogTab() {
  const styles = useStyles();
  const toast = useToast();
  const [posts, setPosts] = useState<AdminBlogPost[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    adminBlogPosts()
      .then(setPosts)
      .catch(() => setPosts([]));
  };

  useEffect(() => {
    let active = true;
    adminBlogPosts()
      .then(items => {
        if (active) setPosts(items);
      })
      .catch(() => {
        if (active) setPosts([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const togglePublish = async (post: AdminBlogPost) => {
    setBusyId(post.id);
    try {
      await adminSetPostPublished(post.id, !post.isPublished);
      toast.success(post.isPublished ? 'Chernovikka olindi' : 'Chop etildi');
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Xatolik');
    } finally {
      setBusyId(null);
    }
  };

  if (!posts) return <Loading />;
  if (posts.length === 0) return <EmptyState text="Maqola yo'q" />;

  return (
    <FlatList
      data={posts}
      keyExtractor={item => item.id}
      contentContainerStyle={{padding: spacing.md, gap: spacing.sm}}
      renderItem={({item}) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.title}</Text>
          {!!item.excerpt && (
            <Text numberOfLines={2} style={styles.muted}>
              {item.excerpt}
            </Text>
          )}
          <Text style={styles.muted}>
            {item.isPublished ? '✅ Chop etilgan' : '📝 Chernovik'}
          </Text>
          <Button
            title={item.isPublished ? 'Chernovikka olish' : 'Chop etish'}
            variant="outline"
            loading={busyId === item.id}
            onPress={() => togglePublish(item)}
          />
        </View>
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Promokodlar
// ---------------------------------------------------------------------------

function PromoTab() {
  const styles = useStyles();
  const toast = useToast();
  const [promos, setPromos] = useState<AdminPromo[] | null>(null);
  const [code, setCode] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [busy, setBusy] = useState(false);

  const load = () => {
    adminPromoCodes()
      .then(setPromos)
      .catch(() => setPromos([]));
  };

  useEffect(() => {
    let active = true;
    adminPromoCodes()
      .then(items => {
        if (active) setPromos(items);
      })
      .catch(() => {
        if (active) setPromos([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const create = async () => {
    const amount = Number(value);
    if (code.trim().length < 3 || !amount) {
      toast.error('Kod va chegirma miqdorini kiriting');
      return;
    }
    setBusy(true);
    try {
      await adminCreatePromo({
        code: code.trim().toUpperCase(),
        discountType: type,
        discountValue: amount,
      });
      toast.success('Promokod yaratildi');
      setCode('');
      setValue('');
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  if (!promos) return <Loading />;

  return (
    <ScrollView contentContainerStyle={{padding: spacing.md, gap: spacing.md}}>
      <View style={styles.card}>
        <Text style={styles.section}>Yangi promokod</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          placeholder="Masalan: ATOYO10"
          placeholderTextColor={styles.c.muted}
          style={styles.input}
        />
        <View style={styles.row}>
          {(['percent', 'fixed'] as const).map(item => (
            <Pressable
              key={item}
              onPress={() => setType(item)}
              style={[styles.chip, type === item && styles.chipOn]}>
              <Text style={[styles.chipText, type === item && styles.chipTextOn]}>
                {item === 'percent' ? 'Foiz (%)' : "So'mda"}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={value}
          onChangeText={setValue}
          keyboardType="number-pad"
          placeholder={type === 'percent' ? 'Masalan: 10' : 'Masalan: 20000'}
          placeholderTextColor={styles.c.muted}
          style={styles.input}
        />
        <Button title="Yaratish" onPress={create} loading={busy} />
      </View>

      {promos.map(promo => (
        <View key={promo.code} style={styles.card}>
          <Text style={styles.name}>{promo.code}</Text>
          <Text style={styles.muted}>
            {promo.discountType === 'percent'
              ? `${promo.discountValue}%`
              : `${promo.discountValue.toLocaleString('uz-UZ')} so'm`}
            {promo.usedCount ? ` · ${promo.usedCount} marta ishlatilgan` : ''}
            {promo.isActive ? '' : ' · o‘chirilgan'}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Foydalanuvchilar (faqat ko'rish)
// ---------------------------------------------------------------------------

function UsersTab() {
  const styles = useStyles();
  const {money} = useI18n();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [term, setTerm] = useState('');

  useEffect(() => {
    let active = true;
    adminUsers()
      .then(items => {
        if (active) setUsers(items);
      })
      .catch(() => {
        if (active) setUsers([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!users) return <Loading />;

  const needle = term.trim().toLowerCase();
  const visible = needle
    ? users.filter(user =>
        `${user.displayName ?? ''} ${user.email ?? ''} ${user.phoneNumber ?? ''}`
          .toLowerCase()
          .includes(needle),
      )
    : users;

  return (
    <View style={{flex: 1}}>
      <TextInput
        value={term}
        onChangeText={setTerm}
        placeholder="Ism, email yoki telefon..."
        placeholderTextColor={styles.c.muted}
        style={[styles.input, {margin: spacing.md}]}
      />
      {visible.length === 0 ? (
        <EmptyState text="Topilmadi" />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={item => item.uid}
          contentContainerStyle={{padding: spacing.md, gap: spacing.sm}}
          renderItem={({item}) => (
            <View style={styles.card}>
              <Text style={styles.name}>
                {item.displayName ?? 'Mijoz'}
                {item.role && item.role !== 'user' ? ` · ${item.role}` : ''}
              </Text>
              <Text style={styles.muted}>{item.email ?? item.phoneNumber ?? ''}</Text>
              {(item.ordersCount ?? 0) > 0 && (
                <Text style={styles.muted}>
                  {item.ordersCount} ta buyurtma · {money(item.totalSpent ?? 0)}
                </Text>
              )}
            </View>
          )}
        />
      )}
      <Text style={styles.footNote}>
        Rol va huquqlarni o&apos;zgartirish brauzerdagi to&apos;liq panelda.
      </Text>
    </View>
  );
}

const useStyles = makeStyles(c => ({
  screen: {flex: 1, backgroundColor: c.bg},
  tabs: {gap: spacing.sm, padding: spacing.md},
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
  },
  tabOn: {backgroundColor: c.accent, borderColor: c.accent},
  tabText: {color: c.text, fontWeight: '600', fontSize: 13},
  tabTextOn: {color: c.onAccent},
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  section: {color: c.text, fontWeight: '700', fontSize: 15},
  name: {color: c.text, fontWeight: '700', fontSize: 15},
  big: {color: c.text, fontWeight: '800', fontSize: 26},
  muted: {color: c.muted, fontSize: 13},
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: c.text,
    backgroundColor: c.surfaceAlt,
  },
  row: {flexDirection: 'row', gap: spacing.sm},
  chip: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipOn: {backgroundColor: c.accent, borderColor: c.accent},
  chipText: {color: c.text, fontSize: 12, fontWeight: '600'},
  chipTextOn: {color: c.onAccent},
  footNote: {
    color: c.muted,
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
}));

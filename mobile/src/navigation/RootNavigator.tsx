import React from 'react';
import {Text} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useTheme} from '../theme';
import {useI18n} from '../i18n';
import {useAppSelector} from '../store';
import {BrandHeader} from '../components/BrandHeader';
import {HomeScreen} from '../screens/HomeScreen';
import {CatalogScreen} from '../screens/CatalogScreen';
import {ProductScreen} from '../screens/ProductScreen';
import {CartScreen} from '../screens/CartScreen';
import {CheckoutScreen} from '../screens/CheckoutScreen';
import {FavoritesScreen} from '../screens/FavoritesScreen';
import {OrdersScreen} from '../screens/OrdersScreen';
import {ProfileScreen} from '../screens/ProfileScreen';
import {BlogScreen} from '../screens/BlogScreen';
import {BlogPostScreen} from '../screens/BlogPostScreen';
import {ContactScreen} from '../screens/ContactScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {AdminOrdersScreen} from '../screens/AdminOrdersScreen';
import {AdminProductsScreen} from '../screens/AdminProductsScreen';
import type {RootStackParamList, TabParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

/** Pastki menyu: Bosh, Katalog, Savat, Sevimlilar, Profil (sayt kabi). */
function Tabs() {
  const {palette} = useTheme();
  const {t} = useI18n();
  const cartCount = useAppSelector(s => s.cart.items.reduce((sum, i) => sum + i.quantity, 0));
  const favCount = useAppSelector(s => s.favorites.ids.length);

  return (
    <Tab.Navigator
      screenOptions={{
        header: () => <BrandHeader />,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: {
          height: 58,
          paddingBottom: 6,
          paddingTop: 4,
          backgroundColor: palette.chrome,
          borderTopColor: palette.border,
        },
        tabBarLabelStyle: {fontSize: 11},
        tabBarBadgeStyle: {backgroundColor: palette.accent, color: palette.onAccent, fontSize: 10},
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{tabBarLabel: t.tabHome, tabBarIcon: () => <Text>🏠</Text>}}
      />
      <Tab.Screen
        name="Katalog"
        component={CatalogScreen}
        options={{tabBarLabel: t.tabCatalog, tabBarIcon: () => <Text>🛍</Text>}}
      />
      <Tab.Screen
        name="Savat"
        component={CartScreen}
        options={{
          tabBarLabel: t.tabCart,
          tabBarIcon: () => <Text>🛒</Text>,
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
        }}
      />
      <Tab.Screen
        name="Sevimlilar"
        component={FavoritesScreen}
        options={{
          tabBarLabel: t.tabFavorites,
          tabBarIcon: () => <Text>❤️</Text>,
          tabBarBadge: favCount > 0 ? favCount : undefined,
        }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
        options={{tabBarLabel: t.tabProfile, tabBarIcon: () => <Text>👤</Text>}}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const {t} = useI18n();

  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{headerShown: false}} />
      <Stack.Screen
        name="Mahsulot"
        component={ProductScreen}
        options={{header: () => <BrandHeader back title={t.titleProduct} />}}
      />
      <Stack.Screen
        name="Buyurtma"
        component={CheckoutScreen}
        options={{header: () => <BrandHeader back title={t.titleCheckout} />}}
      />
      <Stack.Screen
        name="Buyurtmalarim"
        component={OrdersScreen}
        options={{header: () => <BrandHeader back title={t.titleOrders} />}}
      />
      <Stack.Screen
        name="Blog"
        component={BlogScreen}
        options={{header: () => <BrandHeader back title={t.titleBlog} />}}
      />
      <Stack.Screen
        name="Maqola"
        component={BlogPostScreen}
        options={{header: () => <BrandHeader back title={t.titleBlog} />}}
      />
      <Stack.Screen
        name="Kontakt"
        component={ContactScreen}
        options={{header: () => <BrandHeader back title={t.titleContact} />}}
      />
      <Stack.Screen
        name="Sozlamalar"
        component={SettingsScreen}
        options={{header: () => <BrandHeader back title={t.titleSettings} />}}
      />
      {/* Xodimlar uchun: buyurtmalar va mahsulotlar boshqaruvi. Ekranlar
          har doim ro'yxatda turadi, lekin ularga faqat profil
          sahifasidagi (xodimga ko'rinadigan) tugmalar orqali o'tiladi -
          server esa har bir amalni huquq bo'yicha qayta tekshiradi. */}
      <Stack.Screen
        name="AdminBuyurtmalar"
        component={AdminOrdersScreen}
        options={{header: () => <BrandHeader back title="Buyurtmalar" />}}
      />
      <Stack.Screen
        name="AdminMahsulotlar"
        component={AdminProductsScreen}
        options={{header: () => <BrandHeader back title="Mahsulotlar" />}}
      />
    </Stack.Navigator>
  );
}

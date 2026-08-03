import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useFontSize, useTheme} from '../theme';
import {useI18n} from '../i18n';
import {useAppSelector} from '../store';
import {BrandHeader} from '../components/BrandHeader';
import {Icon, type IconName} from '../components/Icon';
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
import {AssistantScreen} from '../screens/AssistantScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {AdminOrdersScreen} from '../screens/AdminOrdersScreen';
import {AdminProductsScreen} from '../screens/AdminProductsScreen';
import {AdminMoreScreen} from '../screens/AdminMoreScreen';
import type {RootStackParamList, TabParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

/**
 * Pastki menyu belgisi: aktiv tab urg'u rangida bo'ladi (React Navigation
 * `color` ni o'zi beradi - saytdagi menyu bilan bir xil xatti-harakat).
 */
function tabIcon(name: IconName) {
  return function TabBarIcon({color}: {color: string}) {
    return <Icon name={name} size={23} color={color} />;
  };
}

/** Pastki menyu: Bosh, Katalog, Savat, Sevimlilar, Profil (sayt kabi). */
function Tabs() {
  const {palette} = useTheme();
  // Shrift kattalashtirilganda yozuv qirqilib qolmasligi uchun
  // menyu balandligi ham o'sadi ("Katalog" -> "Kat" bo'lib qolardi).
  const labelSize = useFontSize(11);
  const badgeSize = useFontSize(10);
  const tabHeight = 58 + Math.max(0, labelSize - 11) * 2.2;
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
          height: tabHeight,
          paddingBottom: 6,
          paddingTop: 4,
          backgroundColor: palette.chrome,
          borderTopColor: palette.border,
        },
        // Yozuv bir qatorga sig'masa kichrayadi, lekin qirqilmaydi.
        tabBarLabelStyle: {fontSize: labelSize},
        tabBarBadgeStyle: {
          backgroundColor: palette.accent,
          color: palette.onAccent,
          fontSize: badgeSize,
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{tabBarLabel: t.tabHome, tabBarIcon: tabIcon('home')}}
      />
      <Tab.Screen
        name="Katalog"
        component={CatalogScreen}
        options={{tabBarLabel: t.tabCatalog, tabBarIcon: tabIcon('catalog')}}
      />
      {/* Savat va sevimlilar tepadagi menyuga ko'chdi - pastda esa
          eng ko'p ochiladigan bo'limlar turadi. */}
      <Tab.Screen
        name="Blog"
        component={BlogScreen}
        options={{tabBarLabel: t.titleBlog, tabBarIcon: tabIcon('blog')}}
      />
      <Tab.Screen
        name="Kontakt"
        component={ContactScreen}
        options={{tabBarLabel: t.titleContact, tabBarIcon: tabIcon('phone')}}
      />
      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
        options={{tabBarLabel: t.tabProfile, tabBarIcon: tabIcon('person')}}
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
        name="Maqola"
        component={BlogPostScreen}
        options={{header: () => <BrandHeader back title={t.titleBlog} />}}
      />
      <Stack.Screen
        name="Savat"
        component={CartScreen}
        options={{header: () => <BrandHeader back title={t.tabCart} />}}
      />
      <Stack.Screen
        name="Sevimlilar"
        component={FavoritesScreen}
        options={{header: () => <BrandHeader back title={t.tabFavorites} />}}
      />
      <Stack.Screen
        name="Yordamchi"
        component={AssistantScreen}
        options={{header: () => <BrandHeader back title={t.titleAssistant} />}}
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
      <Stack.Screen
        name="AdminQolgan"
        component={AdminMoreScreen}
        options={{header: () => <BrandHeader back title="Boshqaruv" />}}
      />
    </Stack.Navigator>
  );
}

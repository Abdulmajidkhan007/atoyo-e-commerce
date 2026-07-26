import React from 'react';
import {Text} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {colors} from '../theme';
import {useAppSelector} from '../store';
import {HomeScreen} from '../screens/HomeScreen';
import {CatalogScreen} from '../screens/CatalogScreen';
import {ProductScreen} from '../screens/ProductScreen';
import {CartScreen} from '../screens/CartScreen';
import {CheckoutScreen} from '../screens/CheckoutScreen';
import {FavoritesScreen} from '../screens/FavoritesScreen';
import {OrdersScreen} from '../screens/OrdersScreen';
import {ProfileScreen} from '../screens/ProfileScreen';
import type {RootStackParamList, TabParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const screenOptions = {
  headerStyle: {backgroundColor: colors.navy},
  headerTintColor: colors.white,
  headerTitleStyle: {fontWeight: '700' as const},
};

/** Pastki menyu: Bosh, Katalog, Savat, Sevimlilar, Profil. */
function Tabs() {
  const cartCount = useAppSelector(s => s.cart.items.reduce((sum, i) => sum + i.quantity, 0));
  const favCount = useAppSelector(s => s.favorites.ids.length);

  return (
    <Tab.Navigator
      screenOptions={{
        ...screenOptions,
        tabBarActiveTintColor: colors.goldDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {height: 58, paddingBottom: 6, paddingTop: 4},
        tabBarLabelStyle: {fontSize: 11},
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{title: 'Atoyo Santexnika', tabBarLabel: 'Bosh', tabBarIcon: () => <Text>🏠</Text>}}
      />
      <Tab.Screen
        name="Katalog"
        component={CatalogScreen}
        options={{tabBarLabel: 'Katalog', tabBarIcon: () => <Text>🛍</Text>}}
      />
      <Tab.Screen
        name="Savat"
        component={CartScreen}
        options={{
          tabBarLabel: 'Savat',
          tabBarIcon: () => <Text>🛒</Text>,
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
        }}
      />
      <Tab.Screen
        name="Sevimlilar"
        component={FavoritesScreen}
        options={{
          tabBarLabel: 'Sevimli',
          tabBarIcon: () => <Text>❤️</Text>,
          tabBarBadge: favCount > 0 ? favCount : undefined,
        }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
        options={{tabBarLabel: 'Profil', tabBarIcon: () => <Text>👤</Text>}}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Tabs" component={Tabs} options={{headerShown: false}} />
      <Stack.Screen name="Mahsulot" component={ProductScreen} options={{title: 'Mahsulot'}} />
      <Stack.Screen name="Buyurtma" component={CheckoutScreen} options={{title: 'Rasmiylashtirish'}} />
      <Stack.Screen name="Buyurtmalarim" component={OrdersScreen} options={{title: 'Buyurtmalarim'}} />
    </Stack.Navigator>
  );
}

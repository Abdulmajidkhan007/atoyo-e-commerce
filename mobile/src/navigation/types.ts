import type {NavigatorScreenParams, CompositeScreenProps} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {ProductCategory} from '../types';

/** Pastki menyudagi ekranlar. */
export type TabParamList = {
  Home: undefined;
  Katalog: {category?: ProductCategory; q?: string} | undefined;
  Blog: undefined;
  Kontakt: undefined;
  Profil: undefined;
};

/** Tab ustidagi stack (mahsulot, checkout, blog, kontakt, sozlamalar). */
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Mahsulot: {productId: string};
  Buyurtma: undefined;
  Buyurtmalarim: undefined;
  Maqola: {postId: string};
  Yordamchi: undefined;
  /** Savat va sevimlilar endi pastki menyuda emas - tepadagi menyuda. */
  Savat: undefined;
  Sevimlilar: undefined;
  Sozlamalar: undefined;
  /** Faqat xodimlar uchun (profil sahifasidan ochiladi). */
  AdminBuyurtmalar: undefined;
  AdminMahsulotlar: undefined;
  AdminQolgan: undefined;
};

/** Tab ekranlari stack'ga ham o'ta oladi - shuning uchun composite. */
export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type StackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

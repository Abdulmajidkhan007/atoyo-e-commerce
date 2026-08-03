import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {OrderStatus, ProductCategory} from './types';

/**
 * KO'P TILLIK - sayt (`src/lib/i18n/dictionaries.ts`) va bot bilan bir
 * xil uch til: uz / en / ru. Tanlov telefon xotirasida saqlanadi.
 */

export type Locale = 'uz' | 'en' | 'ru';

export const LOCALE_LABELS: Record<Locale, string> = {
  uz: "O'zbekcha",
  en: 'English',
  ru: 'Русский',
};

export interface Dict {
  appName: string;
  appNameShort: string;
  // Umumiy
  loading: string;
  error: string;
  cancel: string;
  save: string;
  saved: string;
  material: string;
  country: string;
  priceRange: string;
  priceFrom: string;
  priceTo: string;
  similarProducts: string;
  /** Yangi versiya eslatmasi (APK Play Market'siz tarqatilgani uchun). */
  updateAvailable: string;
  updateDownload: string;
  adminPanel: string;
  adminPanelHint: string;
  send: string;
  all: string;
  // Tab / sarlavhalar
  tabHome: string;
  tabCatalog: string;
  tabCart: string;
  tabFavorites: string;
  tabProfile: string;
  titleProduct: string;
  titleCheckout: string;
  titleOrders: string;
  titleBlog: string;
  titleContact: string;
  titleSettings: string;
  titleAssistant: string;
  assistantIntro: string;
  assistantPlaceholder: string;
  assistantOff: string;
  assistantError: string;
  // Bosh sahifa
  heroTitle: string;
  heroBadge: string;
  viewCatalog: string;
  heroText: string;
  categories: string;
  newProducts: string;
  // Katalog
  searchPlaceholder: string;
  filter: string;
  category: string;
  brand: string;
  sort: string;
  sortNewest: string;
  sortPriceAsc: string;
  sortPriceDesc: string;
  show: string;
  clear: string;
  nothingFound: string;
  // Mahsulot
  outOfStock: string;
  addToCart: string;
  addedToCart: string;
  inStockCount: (count: number) => string;
  notAvailable: string;
  productNotFound: string;
  reviews: string;
  noReviews: string;
  yourRating: string;
  yourComment: string;
  reviewSaved: string;
  reviewThanks: string;
  loginToReview: string;
  // Savat
  cartEmpty: string;
  goToCatalog: string;
  total: string;
  checkout: string;
  clearCart: string;
  // Rasmiylashtirish
  fullName: string;
  phone: string;
  deliveryAddress: string;
  paymentMethod: string;
  payCash: string;
  payOnline: string;
  promo: string;
  promoCode: string;
  apply: string;
  promoApplied: (code: string) => string;
  itemsTotal: string;
  discount: string;
  deliveryFee: string;
  free: string;
  confirmOrder: string;
  orderAccepted: string;
  orderNumber: (id: string) => string;
  loginToOrder: string;
  nameTooShort: string;
  phoneInvalid: string;
  orderFailed: string;
  // Buyurtmalar
  loginToSeeOrders: string;
  noOrders: string;
  cancelOrder: string;
  openReceipt: string;
  // Sevimlilar
  favoritesEmpty: string;
  // Profil / kirish
  login: string;
  register: string;
  email: string;
  password: string;
  forgotPassword: string;
  noAccount: string;
  haveAccount: string;
  resetSent: string;
  enterEmailFirst: string;
  loginFailed: string;
  homeAddress: string;
  customer: string;
  myOrders: string;
  openSite: string;
  signOut: string;
  withGoogle: string;
  withTelegram: string;
  telegramWaiting: string;
  telegramFailed: string;
  googleUnavailable: string;
  // Sozlamalar
  settings: string;
  theme: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
  language: string;
  // Blog / kontakt
  blogEmpty: string;
  readMore: string;
  contactIntro: string;
  yourQuestion: string;
  contactSent: string;
  contactFailed: string;
  newsletter: string;
  newsletterHint: string;
  subscribe: string;
  subscribed: string;
  categoryLabels: Record<ProductCategory, string>;
  statusLabels: Record<OrderStatus, string>;
  /** Pul birligi qo'shimchasi */
  currency: string;
}

const uz: Dict = {
  appName: 'Atoyo Santexnika',
  appNameShort: 'Atoyo',
  loading: 'Yuklanmoqda...',
  error: 'Xatolik',
  cancel: 'Bekor qilish',
  save: 'Saqlash',
  saved: 'Saqlandi',
  material: 'Material',
  country: 'Davlat',
  priceRange: 'Narx oralig‘i',
  priceFrom: 'dan',
  priceTo: 'gacha',
  similarProducts: 'O‘xshash mahsulotlar',
  updateAvailable: 'Ilovaning yangi versiyasi chiqdi.',
  updateDownload: 'Yangilash',
  adminPanel: 'Boshqaruv paneli',
  adminPanelHint: 'Admin panel brauzerda ochiladi',
  send: 'Yuborish',
  all: 'Barchasi',
  tabHome: 'Bosh',
  tabCatalog: 'Katalog',
  tabCart: 'Savat',
  tabFavorites: 'Sevimli',
  tabProfile: 'Profil',
  titleProduct: 'Mahsulot',
  titleCheckout: 'Rasmiylashtirish',
  titleOrders: 'Buyurtmalarim',
  titleBlog: 'Blog',
  titleContact: 'Bog‘lanish',
  titleSettings: 'Sozlamalar',
  titleAssistant: 'Yordamchi',
  assistantIntro:
    'Assalomu alaykum! Men Atoyo yordamchisiman. Mahsulot, narx, yetkazib berish yoki buyurtma bo‘yicha savolingizni yozing.',
  assistantPlaceholder: 'Savolingizni yozing...',
  assistantOff: 'Yordamchi hozircha yoqilmagan. Operator bilan bog‘laning.',
  assistantError: 'Yordamchi javob bera olmadi. Keyinroq urinib ko‘ring.',
  heroTitle: 'Santexnika va Otopleniye uchun ishonchli manzil',
  heroBadge: '10 000+ mahsulot',
  viewCatalog: 'Katalogni ko‘rish',
  heroText:
    'Quvurlar, muftalar, kranlar, dush tizimlari va isitish qozonlari — barchasi bir joyda.',
  categories: 'Kategoriyalar',
  newProducts: 'Yangi mahsulotlar',
  searchPlaceholder: 'Mahsulot qidirish...',
  filter: 'Filtr',
  category: 'Kategoriya',
  brand: 'Brend',
  sort: 'Saralash',
  sortNewest: 'Eng yangi',
  sortPriceAsc: 'Narx ↑',
  sortPriceDesc: 'Narx ↓',
  show: "Ko'rsatish",
  clear: 'Tozalash',
  nothingFound: 'Hech qanday mahsulot topilmadi.',
  outOfStock: 'Tugagan',
  addToCart: 'Savatga qo‘shish',
  addedToCart: 'Mahsulot savatga qo‘shildi.',
  inStockCount: count => `Zaxirada: ${count} dona`,
  notAvailable: 'Hozircha mavjud emas',
  productNotFound: 'Mahsulot topilmadi.',
  reviews: 'Sharhlar',
  noReviews: "Hozircha sharhlar yo'q. Birinchi bo'lib fikr bildiring!",
  yourRating: 'Bahoyingiz',
  yourComment: 'Fikringiz',
  reviewSaved: 'Sharhingiz saqlandi.',
  reviewThanks: 'Rahmat!',
  loginToReview: 'Sharh qoldirish uchun tizimga kiring.',
  cartEmpty: "Savatingiz hozircha bo'sh.",
  goToCatalog: "Katalogga o'tish",
  total: 'Jami',
  checkout: 'Rasmiylashtirish',
  clearCart: 'Savatni tozalash',
  fullName: 'Ism-familiya',
  phone: 'Telefon raqami',
  deliveryAddress: 'Yetkazish manzili',
  paymentMethod: "To'lov usuli",
  payCash: 'Naqd — yetkazilganda',
  payOnline: 'Onlayn — karta orqali',
  promo: 'Promokod',
  promoCode: 'Kod',
  apply: "Qo'llash",
  promoApplied: code => `✅ ${code} qo'llandi`,
  itemsTotal: 'Mahsulotlar',
  discount: 'Chegirma',
  deliveryFee: 'Yetkazib berish',
  free: 'Bepul',
  confirmOrder: 'Buyurtmani tasdiqlash',
  orderAccepted: 'Qabul qilindi',
  orderNumber: id => `Buyurtma raqami: #${id}`,
  loginToOrder: 'Buyurtma berish uchun avval tizimga kiring.',
  nameTooShort: "To'liq ism-familiyangizni kiriting.",
  phoneInvalid: 'Telefon raqamni to‘g‘ri kiriting.',
  orderFailed: 'Buyurtma yuborilmadi.',
  loginToSeeOrders: "Buyurtmalarni ko'rish uchun tizimga kiring.",
  noOrders: "Hozircha buyurtmalaringiz yo'q.",
  cancelOrder: 'Buyurtmani bekor qilish',
  openReceipt: 'Chekni ochish',
  favoritesEmpty: "Sevimlilar ro'yxati bo'sh. Mahsulot yonidagi ❤️ tugmasini bosing.",
  login: 'Kirish',
  register: "Ro'yxatdan o'tish",
  email: 'Email',
  password: 'Parol',
  forgotPassword: 'Parolni unutdingizmi?',
  noAccount: "Hisobingiz yo'qmi? Ro'yxatdan o'ting",
  haveAccount: 'Hisobingiz bormi? Kiring',
  resetSent: 'Parolni tiklash havolasi emailingizga yuborildi.',
  enterEmailFirst: 'Avval email manzilingizni kiriting.',
  loginFailed: 'Kirish amalga oshmadi.',
  homeAddress: 'Uy manzili',
  customer: 'Mijoz',
  myOrders: 'Buyurtmalarim',
  openSite: "Saytga o'tish",
  signOut: 'Chiqish',
  withGoogle: 'Google',
  withTelegram: 'Telegram',
  telegramWaiting: 'Telegram ochildi. Botda "Start" tugmasini bosing — keyin ilova o‘zi davom etadi.',
  telegramFailed: 'Telegram orqali kirib bo‘lmadi. Qaytadan urinib ko‘ring.',
  googleUnavailable: 'Google orqali kirish hozircha sozlanmagan.',
  settings: 'Sozlamalar',
  theme: 'Ko‘rinish',
  themeLight: 'Yorug‘',
  themeDark: 'Qorong‘i',
  themeSystem: 'Tizim',
  language: 'Til',
  blogEmpty: "Hozircha maqolalar yo'q.",
  readMore: "To'liq o'qish",
  contactIntro: 'Savolingizni yozib qoldiring — mutaxassislarimiz aloqaga chiqadi.',
  yourQuestion: 'Savolingiz',
  contactSent: "So'rovingiz qabul qilindi. Tez orada aloqaga chiqamiz.",
  contactFailed: 'So‘rov yuborilmadi.',
  newsletter: 'Yangiliklarga obuna',
  newsletterHint: 'Chegirma va yangi mahsulotlar haqida xabar olib turing.',
  subscribe: 'Obuna bo‘lish',
  subscribed: 'Obuna bo‘ldingiz. Rahmat!',
  categoryLabels: {
    pipes: 'Quvurlar',
    fittings: 'Muftalar',
    faucets: 'Kranlar',
    'shower-systems': 'Dush tizimlari',
    boilers: 'Isitish qozonlari',
    radiators: 'Radiatorlar',
    pumps: 'Nasoslar',
    'sanitary-ware': 'Santexnika buyumlari',
  },
  statusLabels: {
    pending: 'Kutilmoqda',
    approved: 'Qabul qilindi',
    delivering: 'Yetkazilmoqda',
    completed: 'Yakunlandi',
    cancelled: 'Bekor qilindi',
  },
  currency: "so'm",
};

const en: Dict = {
  ...uz,
  appName: 'Atoyo Plumbing',
  loading: 'Loading...',
  error: 'Error',
  cancel: 'Cancel',
  save: 'Save',
  saved: 'Saved',
  material: 'Material',
  country: 'Country',
  priceRange: 'Price range',
  priceFrom: 'from',
  priceTo: 'to',
  similarProducts: 'Similar products',
  updateAvailable: 'A new version of the app is available.',
  updateDownload: 'Update',
  adminPanel: 'Admin panel',
  adminPanelHint: 'Opens in the browser',
  send: 'Send',
  all: 'All',
  tabHome: 'Home',
  tabCatalog: 'Catalog',
  tabCart: 'Cart',
  tabFavorites: 'Saved',
  tabProfile: 'Profile',
  titleProduct: 'Product',
  titleCheckout: 'Checkout',
  titleOrders: 'My orders',
  titleBlog: 'Blog',
  titleContact: 'Contact',
  titleSettings: 'Settings',
  titleAssistant: 'Assistant',
  assistantIntro:
    'Hello! I am the Atoyo assistant. Ask me about products, prices, delivery or orders.',
  assistantPlaceholder: 'Type your question...',
  assistantOff: 'The assistant is not enabled yet. Please contact an operator.',
  assistantError: 'The assistant could not answer. Please try again later.',
  heroTitle: 'A reliable source for plumbing and heating',
  heroBadge: '10,000+ products',
  viewCatalog: 'View catalog',
  heroText: 'Pipes, fittings, faucets, shower systems and boilers — all in one place.',
  categories: 'Categories',
  newProducts: 'New products',
  searchPlaceholder: 'Search products...',
  filter: 'Filter',
  category: 'Category',
  brand: 'Brand',
  sort: 'Sort',
  sortNewest: 'Newest',
  sortPriceAsc: 'Price ↑',
  sortPriceDesc: 'Price ↓',
  show: 'Show',
  clear: 'Clear',
  nothingFound: 'No products found.',
  outOfStock: 'Out of stock',
  addToCart: 'Add to cart',
  addedToCart: 'Product added to the cart.',
  inStockCount: count => `In stock: ${count} pcs`,
  notAvailable: 'Currently unavailable',
  productNotFound: 'Product not found.',
  reviews: 'Reviews',
  noReviews: 'No reviews yet. Be the first to share your thoughts!',
  yourRating: 'Your rating',
  yourComment: 'Your review',
  reviewSaved: 'Your review has been saved.',
  reviewThanks: 'Thank you!',
  loginToReview: 'Please sign in to leave a review.',
  cartEmpty: 'Your cart is empty.',
  goToCatalog: 'Go to catalog',
  total: 'Total',
  checkout: 'Checkout',
  clearCart: 'Clear cart',
  fullName: 'Full name',
  phone: 'Phone number',
  deliveryAddress: 'Delivery address',
  paymentMethod: 'Payment method',
  payCash: 'Cash — on delivery',
  payOnline: 'Online — by card',
  promo: 'Promo code',
  promoCode: 'Code',
  apply: 'Apply',
  promoApplied: code => `✅ ${code} applied`,
  itemsTotal: 'Products',
  discount: 'Discount',
  deliveryFee: 'Delivery',
  free: 'Free',
  confirmOrder: 'Confirm order',
  orderAccepted: 'Order received',
  orderNumber: id => `Order number: #${id}`,
  loginToOrder: 'Please sign in before placing an order.',
  nameTooShort: 'Enter your full name.',
  phoneInvalid: 'Enter a valid phone number.',
  orderFailed: 'The order was not sent.',
  loginToSeeOrders: 'Sign in to see your orders.',
  noOrders: 'You have no orders yet.',
  cancelOrder: 'Cancel order',
  openReceipt: 'Open receipt',
  favoritesEmpty: 'Your saved list is empty. Tap the ❤️ next to a product.',
  login: 'Sign in',
  register: 'Sign up',
  email: 'Email',
  password: 'Password',
  forgotPassword: 'Forgot your password?',
  noAccount: 'No account? Sign up',
  haveAccount: 'Already have an account? Sign in',
  resetSent: 'A password reset link has been sent to your email.',
  enterEmailFirst: 'Enter your email address first.',
  loginFailed: 'Sign-in failed.',
  homeAddress: 'Home address',
  customer: 'Customer',
  myOrders: 'My orders',
  openSite: 'Open the website',
  signOut: 'Sign out',
  telegramWaiting: 'Telegram is open. Press "Start" in the bot — the app will continue by itself.',
  telegramFailed: 'Could not sign in with Telegram. Please try again.',
  googleUnavailable: 'Google sign-in is not configured yet.',
  settings: 'Settings',
  theme: 'Appearance',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeSystem: 'System',
  language: 'Language',
  blogEmpty: 'No articles yet.',
  readMore: 'Read more',
  contactIntro: 'Leave your question — our specialists will get in touch.',
  yourQuestion: 'Your question',
  contactSent: 'Your request has been received. We will contact you shortly.',
  contactFailed: 'The request was not sent.',
  newsletter: 'Newsletter',
  newsletterHint: 'Get notified about discounts and new products.',
  subscribe: 'Subscribe',
  subscribed: 'You are subscribed. Thank you!',
  categoryLabels: {
    pipes: 'Pipes',
    fittings: 'Fittings',
    faucets: 'Faucets',
    'shower-systems': 'Shower systems',
    boilers: 'Boilers',
    radiators: 'Radiators',
    pumps: 'Pumps',
    'sanitary-ware': 'Sanitary ware',
  },
  statusLabels: {
    pending: 'Pending',
    approved: 'Approved',
    delivering: 'Delivering',
    completed: 'Completed',
    cancelled: 'Cancelled',
  },
  currency: 'UZS',
};

const ru: Dict = {
  ...uz,
  appName: 'Atoyo Сантехника',
  loading: 'Загрузка...',
  error: 'Ошибка',
  cancel: 'Отмена',
  save: 'Сохранить',
  saved: 'Сохранено',
  material: 'Материал',
  country: 'Страна',
  priceRange: 'Диапазон цен',
  priceFrom: 'от',
  priceTo: 'до',
  similarProducts: 'Похожие товары',
  updateAvailable: 'Вышла новая версия приложения.',
  updateDownload: 'Обновить',
  adminPanel: 'Панель управления',
  adminPanelHint: 'Откроется в браузере',
  send: 'Отправить',
  all: 'Все',
  tabHome: 'Главная',
  tabCatalog: 'Каталог',
  tabCart: 'Корзина',
  tabFavorites: 'Избранное',
  tabProfile: 'Профиль',
  titleProduct: 'Товар',
  titleCheckout: 'Оформление',
  titleOrders: 'Мои заказы',
  titleBlog: 'Блог',
  titleContact: 'Связаться',
  titleSettings: 'Настройки',
  titleAssistant: 'Помощник',
  assistantIntro:
    'Здравствуйте! Я помощник Atoyo. Спросите о товарах, ценах, доставке или заказе.',
  assistantPlaceholder: 'Напишите вопрос...',
  assistantOff: 'Помощник пока не подключён. Свяжитесь с оператором.',
  assistantError: 'Помощник не смог ответить. Попробуйте позже.',
  heroTitle: 'Надёжный выбор сантехники и отопления',
  heroBadge: '10 000+ товаров',
  viewCatalog: 'Смотреть каталог',
  heroText: 'Трубы, фитинги, смесители, душевые системы и котлы — всё в одном месте.',
  categories: 'Категории',
  newProducts: 'Новые товары',
  searchPlaceholder: 'Поиск товаров...',
  filter: 'Фильтр',
  category: 'Категория',
  brand: 'Бренд',
  sort: 'Сортировка',
  sortNewest: 'Новые',
  sortPriceAsc: 'Цена ↑',
  sortPriceDesc: 'Цена ↓',
  show: 'Показать',
  clear: 'Сбросить',
  nothingFound: 'Товары не найдены.',
  outOfStock: 'Нет в наличии',
  addToCart: 'В корзину',
  addedToCart: 'Товар добавлен в корзину.',
  inStockCount: count => `В наличии: ${count} шт`,
  notAvailable: 'Пока недоступно',
  productNotFound: 'Товар не найден.',
  reviews: 'Отзывы',
  noReviews: 'Отзывов пока нет. Будьте первым!',
  yourRating: 'Ваша оценка',
  yourComment: 'Ваш отзыв',
  reviewSaved: 'Ваш отзыв сохранён.',
  reviewThanks: 'Спасибо!',
  loginToReview: 'Войдите, чтобы оставить отзыв.',
  cartEmpty: 'Ваша корзина пуста.',
  goToCatalog: 'В каталог',
  total: 'Итого',
  checkout: 'Оформить',
  clearCart: 'Очистить корзину',
  fullName: 'Имя и фамилия',
  phone: 'Номер телефона',
  deliveryAddress: 'Адрес доставки',
  paymentMethod: 'Способ оплаты',
  payCash: 'Наличные — при доставке',
  payOnline: 'Онлайн — картой',
  promo: 'Промокод',
  promoCode: 'Код',
  apply: 'Применить',
  promoApplied: code => `✅ ${code} применён`,
  itemsTotal: 'Товары',
  discount: 'Скидка',
  deliveryFee: 'Доставка',
  free: 'Бесплатно',
  confirmOrder: 'Подтвердить заказ',
  orderAccepted: 'Заказ принят',
  orderNumber: id => `Номер заказа: #${id}`,
  loginToOrder: 'Войдите, прежде чем оформить заказ.',
  nameTooShort: 'Введите имя и фамилию полностью.',
  phoneInvalid: 'Введите корректный номер телефона.',
  orderFailed: 'Заказ не отправлен.',
  loginToSeeOrders: 'Войдите, чтобы увидеть заказы.',
  noOrders: 'У вас пока нет заказов.',
  cancelOrder: 'Отменить заказ',
  openReceipt: 'Открыть чек',
  favoritesEmpty: 'Список избранного пуст. Нажмите ❤️ рядом с товаром.',
  login: 'Войти',
  register: 'Регистрация',
  email: 'Email',
  password: 'Пароль',
  forgotPassword: 'Забыли пароль?',
  noAccount: 'Нет аккаунта? Зарегистрируйтесь',
  haveAccount: 'Уже есть аккаунт? Войдите',
  resetSent: 'Ссылка для сброса пароля отправлена на почту.',
  enterEmailFirst: 'Сначала введите email.',
  loginFailed: 'Не удалось войти.',
  homeAddress: 'Домашний адрес',
  customer: 'Клиент',
  myOrders: 'Мои заказы',
  openSite: 'Открыть сайт',
  signOut: 'Выйти',
  telegramWaiting: 'Telegram открыт. Нажмите "Start" в боте — приложение продолжит само.',
  telegramFailed: 'Не удалось войти через Telegram. Попробуйте снова.',
  googleUnavailable: 'Вход через Google пока не настроен.',
  settings: 'Настройки',
  theme: 'Оформление',
  themeLight: 'Светлое',
  themeDark: 'Тёмное',
  themeSystem: 'Системное',
  language: 'Язык',
  blogEmpty: 'Статей пока нет.',
  readMore: 'Читать полностью',
  contactIntro: 'Оставьте вопрос — наши специалисты свяжутся с вами.',
  yourQuestion: 'Ваш вопрос',
  contactSent: 'Заявка принята. Мы скоро свяжемся с вами.',
  contactFailed: 'Заявка не отправлена.',
  newsletter: 'Рассылка',
  newsletterHint: 'Узнавайте о скидках и новинках первыми.',
  subscribe: 'Подписаться',
  subscribed: 'Вы подписаны. Спасибо!',
  categoryLabels: {
    pipes: 'Трубы',
    fittings: 'Фитинги',
    faucets: 'Смесители',
    'shower-systems': 'Душевые системы',
    boilers: 'Котлы отопления',
    radiators: 'Радиаторы',
    pumps: 'Насосы',
    'sanitary-ware': 'Сантехника',
  },
  statusLabels: {
    pending: 'В ожидании',
    approved: 'Принят',
    delivering: 'Доставляется',
    completed: 'Завершён',
    cancelled: 'Отменён',
  },
  currency: 'сум',
};

const dictionaries: Record<Locale, Dict> = {uz, en, ru};

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dict;
  /** Narxni tanlangan tilga mos formatlash. */
  money: (amount: number) => string;
}

const I18nContext = createContext<I18nValue | null>(null);
const STORAGE_KEY = 'atoyo:locale';

/** Intl'ga bog'lanmasdan mingliklarni ajratish (Hermes'da ham bir xil). */
function group(amount: number, separator: string): string {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

export function LocaleProvider({children}: {children: React.ReactNode}) {
  const [locale, setLocaleState] = useState<Locale>('uz');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(saved => {
        if (saved === 'uz' || saved === 'en' || saved === 'ru') setLocaleState(saved);
      })
      .catch(() => {});
  }, []);

  const value = useMemo<I18nValue>(() => {
    const t = dictionaries[locale];
    return {
      locale,
      t,
      money: amount => `${group(amount, locale === 'en' ? ',' : ' ')} ${t.currency}`,
      setLocale: next => {
        setLocaleState(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      },
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n LocaleProvider ichida ishlatilishi kerak.');
  return context;
}

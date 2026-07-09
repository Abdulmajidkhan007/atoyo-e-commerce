import type { Locale } from "./config";

/**
 * Sayt "karkasi" (navigatsiya, footer, bosh sahifa) uchun uz/en/ru lug'atlar.
 * Mahsulot/blog kontenti admin kiritgan tilda qoladi — bu lug'at faqat
 * interfeys matnlarini qamrab oladi. Yangi kalit qo'shsangiz, uchala
 * tilga ham qo'shing (Dictionary tipi buni majburlaydi).
 */
export interface Dictionary {
  nav: {
    home: string;
    /** Mobil pastki menyu uchun qisqa variant. */
    homeShort: string;
    catalog: string;
    blog: string;
    about: string;
    /** Mobil pastki menyu uchun qisqa variant. */
    aboutShort: string;
    contact: string;
    login: string;
    cart: string;
    profile: string;
  };
  footer: {
    tagline: string;
    phone: string;
    email: string;
    address: string;
    rights: string;
  };
  home: {
    badge: string;
    heroTitle: string;
    heroText: string;
    viewCatalog: string;
    categories: string;
    newProducts: string;
  };
  categories: {
    pipes: string;
    fittings: string;
    faucets: string;
    "shower-systems": string;
    boilers: string;
    radiators: string;
    pumps: string;
    "sanitary-ware": string;
  };
}

const uz: Dictionary = {
  nav: {
    home: "Bosh sahifa",
    homeShort: "Bosh",
    catalog: "Katalog",
    blog: "Blog",
    about: "Biz haqimizda",
    aboutShort: "Haqida",
    contact: "Kontakt",
    login: "Kirish",
    cart: "Savat",
    profile: "Profil",
  },
  footer: {
    tagline:
      "Quvurlar, muftalar, kranlar, dush tizimlari va isitish qozonlari - sifatli santexnika mahsulotlari yetkazib beruvchi ishonchli hamkoringiz.",
    phone: "Telefon",
    email: "Email",
    address: "Manzil",
    rights: "Barcha huquqlar himoyalangan.",
  },
  home: {
    badge: "10,000+ santexnika mahsuloti",
    heroTitle: "Santexnika va Otopleniye uchun ishonchli manzil",
    heroText:
      "Quvurlar, muftalar, kranlar, dush tizimlari va isitish qozonlari - barchasi bir joyda, tezkor yetkazib berish bilan.",
    viewCatalog: "Katalogni ko'rish",
    categories: "Kategoriyalar",
    newProducts: "Yangi mahsulotlar",
  },
  categories: {
    pipes: "Quvurlar",
    fittings: "Muftalar",
    faucets: "Kranlar",
    "shower-systems": "Dush tizimlari",
    boilers: "Isitish qozonlari",
    radiators: "Radiatorlar",
    pumps: "Nasoslar",
    "sanitary-ware": "Santexnika buyumlari",
  },
};

const en: Dictionary = {
  nav: {
    home: "Home",
    homeShort: "Home",
    catalog: "Catalog",
    blog: "Blog",
    about: "About us",
    aboutShort: "About",
    contact: "Contact",
    login: "Sign in",
    cart: "Cart",
    profile: "Profile",
  },
  footer: {
    tagline:
      "Pipes, fittings, faucets, shower systems and heating boilers - your trusted supplier of quality plumbing products.",
    phone: "Phone",
    email: "Email",
    address: "Address",
    rights: "All rights reserved.",
  },
  home: {
    badge: "10,000+ plumbing products",
    heroTitle: "Your trusted source for plumbing and heating",
    heroText:
      "Pipes, fittings, faucets, shower systems and heating boilers - everything in one place, with fast delivery.",
    viewCatalog: "Browse catalog",
    categories: "Categories",
    newProducts: "New products",
  },
  categories: {
    pipes: "Pipes",
    fittings: "Fittings",
    faucets: "Faucets",
    "shower-systems": "Shower systems",
    boilers: "Heating boilers",
    radiators: "Radiators",
    pumps: "Pumps",
    "sanitary-ware": "Sanitary ware",
  },
};

const ru: Dictionary = {
  nav: {
    home: "Главная",
    homeShort: "Главная",
    catalog: "Каталог",
    blog: "Блог",
    about: "О нас",
    aboutShort: "О нас",
    contact: "Контакты",
    login: "Войти",
    cart: "Корзина",
    profile: "Профиль",
  },
  footer: {
    tagline:
      "Трубы, фитинги, краны, душевые системы и отопительные котлы - ваш надёжный поставщик качественной сантехники.",
    phone: "Телефон",
    email: "Email",
    address: "Адрес",
    rights: "Все права защищены.",
  },
  home: {
    badge: "10,000+ сантехнических товаров",
    heroTitle: "Надёжный адрес для сантехники и отопления",
    heroText:
      "Трубы, фитинги, краны, душевые системы и отопительные котлы - всё в одном месте, с быстрой доставкой.",
    viewCatalog: "Смотреть каталог",
    categories: "Категории",
    newProducts: "Новые товары",
  },
  categories: {
    pipes: "Трубы",
    fittings: "Фитинги",
    faucets: "Краны",
    "shower-systems": "Душевые системы",
    boilers: "Отопительные котлы",
    radiators: "Радиаторы",
    pumps: "Насосы",
    "sanitary-ware": "Сантехника",
  },
};

export const DICTIONARIES: Record<Locale, Dictionary> = { uz, en, ru };

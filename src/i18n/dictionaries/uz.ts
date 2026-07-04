import type { ProductCategory } from "@/types/product";

// Asosiy (etalon) lug'at. Boshqa tillar shu strukturaga mos bo'lishi shart -
// `Dictionary` tipi shu obyektdan olinadi, shuning uchun ru/en fayllarida
// biror kalit tushib qolsa TypeScript xato beradi.
const uz = {
  meta: {
    title: "Atoyo Santexnika | Santexnika va Otopleniye Do'koni",
    description:
      "Quvurlar, muftalar, kranlar, dush tizimlari va isitish qozonlari - eng sifatli santexnika mahsulotlari.",
  },

  common: {
    brand: "Atoyo Santexnika",
    loading: "Yuklanmoqda...",
    retry: "Qayta urinish",
    save: "Saqlash",
    cancel: "Bekor qilish",
    close: "Yopish",
    errorGeneric: "Xatolik yuz berdi, qayta urining.",
    currencyUzs: "so'm",
  },

  nav: {
    home: "Bosh sahifa",
    catalog: "Katalog",
    blog: "Blog",
    about: "Biz haqimizda",
    contact: "Kontakt",
    cart: "Savat",
    profile: "Profil",
    login: "Kirish",
    // Mobil pastki panel uchun qisqartirilgan yorliqlar
    homeShort: "Bosh",
    aboutShort: "Haqida",
  },

  search: {
    placeholder: "Mahsulot qidirish (masalan: kran, quvur...)",
    aria: "Mahsulot qidirish",
    clear: "Qidiruvni tozalash",
  },

  theme: {
    toLight: "Yorug' rejim",
    toDark: "Tungi rejim",
    toggle: "Temani almashtirish",
  },

  language: {
    label: "Til",
    change: "Tilni almashtirish",
  },

  newsletter: {
    heading: "Yangiliklarga obuna bo'ling",
    emailPlaceholder: "Email manzilingiz",
    submit: "Obuna",
    success: "Obuna bo'ldingiz, rahmat!",
    error: "Xatolik yuz berdi, qayta urining.",
  },

  footer: {
    description:
      "Quvurlar, muftalar, kranlar, dush tizimlari va isitish qozonlari - sifatli santexnika mahsulotlari yetkazib beruvchi ishonchli hamkoringiz.",
    contactTitle: "Bog'lanish",
    phone: "Telefon",
    email: "Email",
    address: "Manzil",
    rights: "Barcha huquqlar himoyalangan.",
  },

  home: {
    badge: "10,000+ santexnika mahsuloti",
    heroTitle: "Santexnika va Otopleniye uchun ishonchli manzil",
    heroSubtitle:
      "Quvurlar, muftalar, kranlar, dush tizimlari va isitish qozonlari - barchasi bir joyda, tezkor yetkazib berish bilan.",
    heroCta: "Katalogni ko'rish",
    categoriesTitle: "Kategoriyalar",
    newProductsTitle: "Yangi mahsulotlar",
  },

  // Mahsulot kategoriyalari nomlari (ProductCategory qiymatlari bo'yicha).
  categories: {
    pipes: "Quvurlar",
    fittings: "Muftalar",
    faucets: "Kranlar",
    "shower-systems": "Dush tizimlari",
    boilers: "Isitish qozonlari",
    radiators: "Radiatorlar",
    pumps: "Nasoslar",
    "sanitary-ware": "Santexnika buyumlari",
  } satisfies Record<ProductCategory, string>,
};

export type Dictionary = typeof uz;

export default uz;

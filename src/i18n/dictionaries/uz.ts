import type { ProductCategory, ProductMaterial } from "@/types/product";

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
    all: "Barchasi",
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

  catalog: {
    title: "Katalog",
  },

  filters: {
    title: "Filtrlar",
    clear: "Tozalash",
    category: "Kategoriya",
    material: "Material",
    brand: "Brend",
    country: "Ishlab chiqaruvchi davlat",
    priceRange: "Narx oralig'i",
    priceFrom: "Dan",
    priceTo: "Gacha",
    sort: "Saralash",
    sortNewest: "Eng yangi",
    sortPriceAsc: "Narx: arzondan qimmatga",
    sortPriceDesc: "Narx: qimmatdan arzonga",
  },

  product: {
    grid: {
      loadError: "Mahsulotlarni yuklashda xatolik yuz berdi.",
      loadMoreError: "Ko'proq mahsulot yuklashda xatolik yuz berdi.",
      empty: "Hech qanday mahsulot topilmadi.",
    },
    noImage: "Rasm yo'q",
    outOfStockBadge: "Tugagan",
    outOfStockButton: "Mahsulot tugagan",
    addToCart: "Savatga qo'shish",
    // {name} joriy mahsulot nomi bilan almashtiriladi
    addToCartAria: "{name} savatga qo'shish",
    notFound: "Mahsulot topilmadi",
    diameter: "Diametri",
    length: "Uzunligi",
    weight: "Vazni",
    stock: "Zaxirada",
    stockUnit: "dona",
  },

  cart: {
    empty: "Savatingiz hozircha bo'sh.",
    goToCatalog: "Katalogga o'tish",
    decrease: "Sonini kamaytirish",
    increase: "Sonini oshirish",
    remove: "Savatdan o'chirish",
    products: "Mahsulotlar",
    total: "Jami",
    checkout: "Buyurtma berish",
  },

  checkout: {
    title: "Buyurtmani rasmiylashtirish",
    emptyCart: "Buyurtma berish uchun avval savatga mahsulot qo'shing.",
    fullName: "Ism-familiya",
    phone: "Telefon raqami",
    detectLocation: "Joylashuvni aniqlash (GPS)",
    locationDetected: "Lokatsiya aniqlandi ✓",
    geoUnsupported: "Brauzeringiz lokatsiyani aniqlashni qo'llab-quvvatlamaydi.",
    geoFailed: "Lokatsiyani aniqlab bo'lmadi. Ruxsat berilganini tekshiring.",
    deliveryAddress: "Yetkazish manzili",
    deliveryAddressPlaceholder: "Tuman, mahalla, ko'cha, uy — lokatsiya yuborish qiyin bo'lsa yozing",
    paymentMethod: "To'lov usuli",
    paymentCash: "💵 Naqd — mahsulot yetkazilganda to'lash",
    paymentOnline: "💳 Onlayn — karta orqali (Humo/Uzcard/Visa)",
    onlineNote:
      "Onlayn to'lov to'lov tizimi ulangandan so'ng faollashadi. Hozircha buyurtma qabul qilinadi va operator siz bilan bog'lanadi.",
    totalPayment: "Jami to'lov",
    submitError: "Buyurtmani yuborishda xatolik yuz berdi. Qayta urinib ko'ring.",
    confirm: "Buyurtmani tasdiqlash",
  },

  contact: {
    title: "Bog'lanish",
    subtitle: "Savolingiz bormi yoki qayta qo'ng'iroq qilishimizni istaysizmi? Formani to'ldiring.",
    name: "Ism-familiya",
    phone: "Telefon raqami",
    question: "Savolingiz",
    success: "Xabaringiz yuborildi. Tez orada bog'lanamiz!",
    error: "Xatolik yuz berdi. Qayta urinib ko'ring.",
    submit: "Yuborish",
  },

  login: {
    signIn: "Hisobga kirish",
    register: "Ro'yxatdan o'tish",
    google: "Google orqali kirish",
    or: "yoki",
    email: "Email",
    password: "Parol",
    submitLogin: "Kirish",
    error: "Kirishda xatolik yuz berdi. Ma'lumotlaringizni tekshirib qayta urinib ko'ring.",
    toRegister: "Hisobingiz yo'qmi? Ro'yxatdan o'ting",
    toLogin: "Hisobingiz bormi? Kiring",
  },

  profile: {
    signInPrompt: "Profilni ko'rish uchun tizimga kiring.",
    defaultName: "Foydalanuvchi",
    edit: "Tahrirlash",
    signOut: "Chiqish",
    ordersHistory: "Buyurtmalar tarixi",
    noOrders: "Sizda hali buyurtmalar yo'q.",
    orderLabel: "Buyurtma",
    itemsSuffix: "ta mahsulot",
    payment: "To'lov",
    address: "Manzil",
    viewOnMap: "📍 Xaritada ko'rish",
    status: {
      pending: "Kutilmoqda",
      approved: "Qabul qilindi",
      delivering: "Yetkazilmoqda",
      completed: "Yakunlandi",
      cancelled: "Bekor qilindi",
    },
    paymentCash: "💵 Naqd",
    paymentOnline: "💳 Onlayn",
  },

  profileSettings: {
    signInPrompt: "Tizimga kiring.",
    title: "Profil sozlamalari",
    fullName: "Ism-familiya",
    email: "Email",
    emailHelper: "Email o'zgartirib bo'lmaydi",
    phone: "Telefon raqami",
    homeAddress: "Uy manzili",
    homeAddressPlaceholder: "Tuman, mahalla, ko'cha, uy",
    saved: "Saqlandi!",
    saveError: "Saqlashda xatolik. Qayta urinib ko'ring.",
  },

  about: {
    metaTitle: "Biz haqimizda | Atoyo Santexnika",
    contactTitle: "Bog'lanish",
    features: {
      qualityTitle: "Sifat kafolati",
      qualityText: "Faqat ishonchli ishlab chiqaruvchilardan sifatli mahsulot.",
      deliveryTitle: "Tez yetkazib berish",
      deliveryText: "Buyurtmangizni tez va ishonchli yetkazib beramiz.",
      supportTitle: "Professional maslahat",
      supportText: "Har bir mijozga individual yondashuv va yordam.",
    },
  },

  blog: {
    metaTitle: "Blog | Atoyo Santexnika",
    title: "Blog va yangiliklar",
    empty: "Hozircha maqolalar yo'q.",
    back: "← Blogga qaytish",
    notFound: "Maqola topilmadi",
    postMetaSuffix: "Atoyo Blog",
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

  // Material nomlari (ProductMaterial qiymatlari bo'yicha).
  materials: {
    polypropylene: "Polipropilen",
    "metal-plastic": "Metalplastik",
    steel: "Po'lat",
    copper: "Mis",
    brass: "Latun",
    "cast-iron": "Cho'yan",
    pvc: "PVX",
  } satisfies Record<ProductMaterial, string>,
};

export type Dictionary = typeof uz;

export default uz;

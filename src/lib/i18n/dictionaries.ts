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
  common: {
    save: string;
    cancel: string;
    loading: string;
    edit: string;
    logout: string;
    errorRetry: string;
  };
  cart: {
    title: string;
    empty: string;
    goToCatalog: string;
  };
  checkout: {
    title: string;
    addFirst: string;
    fullName: string;
    phone: string;
    detectLocation: string;
    locationDetected: string;
    locationUnsupported: string;
    locationFailed: string;
    address: string;
    addressPlaceholder: string;
    paymentTitle: string;
    payCash: string;
    payOnline: string;
    onlineNote: string;
    total: string;
    confirm: string;
    submitError: string;
  };
  contact: {
    title: string;
    subtitle: string;
    question: string;
    success: string;
    send: string;
  };
  profile: {
    loginPrompt: string;
    ordersTitle: string;
    noOrders: string;
    order: string;
    itemsCount: string;
    payment: string;
    cash: string;
    online: string;
    addressLabel: string;
    viewOnMap: string;
    status: {
      pending: string;
      approved: string;
      delivering: string;
      completed: string;
      cancelled: string;
    };
    settingsTitle: string;
    emailLocked: string;
    homeAddress: string;
    addressPlaceholder: string;
    saved: string;
    changePhoto: string;
    photoNote: string;
    passwordTitle: string;
    currentPassword: string;
    newPassword: string;
    passwordMin: string;
    changePassword: string;
    passwordChanged: string;
    wrongPassword: string;
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
  common: {
    save: "Saqlash",
    cancel: "Bekor qilish",
    loading: "Yuklanmoqda...",
    edit: "Tahrirlash",
    logout: "Chiqish",
    errorRetry: "Xatolik yuz berdi. Qayta urinib ko'ring.",
  },
  cart: {
    title: "Savat",
    empty: "Savatingiz hozircha bo'sh.",
    goToCatalog: "Katalogga o'tish",
  },
  checkout: {
    title: "Buyurtmani rasmiylashtirish",
    addFirst: "Buyurtma berish uchun avval savatga mahsulot qo'shing.",
    fullName: "Ism-familiya",
    phone: "Telefon raqami",
    detectLocation: "Joylashuvni aniqlash (GPS)",
    locationDetected: "Lokatsiya aniqlandi ✓",
    locationUnsupported: "Brauzeringiz lokatsiyani aniqlashni qo'llab-quvvatlamaydi.",
    locationFailed: "Lokatsiyani aniqlab bo'lmadi. Ruxsat berilganini tekshiring.",
    address: "Yetkazish manzili",
    addressPlaceholder: "Tuman, mahalla, ko'cha, uy — lokatsiya yuborish qiyin bo'lsa yozing",
    paymentTitle: "To'lov usuli",
    payCash: "💵 Naqd — mahsulot yetkazilganda to'lash",
    payOnline: "💳 Onlayn — karta orqali (Humo/Uzcard/Visa)",
    onlineNote:
      "Onlayn to'lov to'lov tizimi ulangandan so'ng faollashadi. Hozircha buyurtma qabul qilinadi va operator siz bilan bog'lanadi.",
    total: "Jami to'lov",
    confirm: "Buyurtmani tasdiqlash",
    submitError: "Buyurtmani yuborishda xatolik yuz berdi. Qayta urinib ko'ring.",
  },
  contact: {
    title: "Bog'lanish",
    subtitle: "Savolingiz bormi yoki qayta qo'ng'iroq qilishimizni istaysizmi? Formani to'ldiring.",
    question: "Savolingiz",
    success: "Xabaringiz yuborildi. Tez orada bog'lanamiz!",
    send: "Yuborish",
  },
  profile: {
    loginPrompt: "Profilni ko'rish uchun tizimga kiring.",
    ordersTitle: "Buyurtmalar tarixi",
    noOrders: "Sizda hali buyurtmalar yo'q.",
    order: "Buyurtma",
    itemsCount: "ta mahsulot",
    payment: "To'lov",
    cash: "💵 Naqd",
    online: "💳 Onlayn",
    addressLabel: "Manzil",
    viewOnMap: "📍 Xaritada ko'rish",
    status: {
      pending: "Kutilmoqda",
      approved: "Qabul qilindi",
      delivering: "Yetkazilmoqda",
      completed: "Yakunlandi",
      cancelled: "Bekor qilindi",
    },
    settingsTitle: "Profil sozlamalari",
    emailLocked: "Email o'zgartirib bo'lmaydi (login sifatida ishlatiladi)",
    homeAddress: "Uy manzili",
    addressPlaceholder: "Tuman, mahalla, ko'cha, uy",
    saved: "Saqlandi!",
    changePhoto: "Rasmni almashtirish",
    photoNote: "JPEG/PNG/WebP, 8MB gacha.",
    passwordTitle: "Parolni o'zgartirish",
    currentPassword: "Joriy parol",
    newPassword: "Yangi parol",
    passwordMin: "Kamida 6 ta belgi",
    changePassword: "Parolni yangilash",
    passwordChanged: "Parol yangilandi!",
    wrongPassword: "Joriy parol noto'g'ri.",
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
  common: {
    save: "Save",
    cancel: "Cancel",
    loading: "Loading...",
    edit: "Edit",
    logout: "Sign out",
    errorRetry: "Something went wrong. Please try again.",
  },
  cart: {
    title: "Cart",
    empty: "Your cart is empty.",
    goToCatalog: "Go to catalog",
  },
  checkout: {
    title: "Checkout",
    addFirst: "Add products to your cart before placing an order.",
    fullName: "Full name",
    phone: "Phone number",
    detectLocation: "Detect location (GPS)",
    locationDetected: "Location detected ✓",
    locationUnsupported: "Your browser does not support geolocation.",
    locationFailed: "Could not detect location. Check that permission is granted.",
    address: "Delivery address",
    addressPlaceholder: "District, street, house — write it if sharing location is difficult",
    paymentTitle: "Payment method",
    payCash: "💵 Cash — pay on delivery",
    payOnline: "💳 Online — by card (Humo/Uzcard/Visa)",
    onlineNote:
      "Online payment will be enabled once the payment system is connected. For now your order is accepted and an operator will contact you.",
    total: "Total",
    confirm: "Confirm order",
    submitError: "Failed to submit the order. Please try again.",
  },
  contact: {
    title: "Contact us",
    subtitle: "Have a question or want us to call you back? Fill in the form.",
    question: "Your question",
    success: "Your message has been sent. We'll get back to you soon!",
    send: "Send",
  },
  profile: {
    loginPrompt: "Sign in to view your profile.",
    ordersTitle: "Order history",
    noOrders: "You have no orders yet.",
    order: "Order",
    itemsCount: "items",
    payment: "Payment",
    cash: "💵 Cash",
    online: "💳 Online",
    addressLabel: "Address",
    viewOnMap: "📍 View on map",
    status: {
      pending: "Pending",
      approved: "Approved",
      delivering: "Delivering",
      completed: "Completed",
      cancelled: "Cancelled",
    },
    settingsTitle: "Profile settings",
    emailLocked: "Email cannot be changed (used as your login)",
    homeAddress: "Home address",
    addressPlaceholder: "District, street, house",
    saved: "Saved!",
    changePhoto: "Change photo",
    photoNote: "JPEG/PNG/WebP, up to 8MB.",
    passwordTitle: "Change password",
    currentPassword: "Current password",
    newPassword: "New password",
    passwordMin: "At least 6 characters",
    changePassword: "Update password",
    passwordChanged: "Password updated!",
    wrongPassword: "Current password is incorrect.",
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
  common: {
    save: "Сохранить",
    cancel: "Отмена",
    loading: "Загрузка...",
    edit: "Редактировать",
    logout: "Выйти",
    errorRetry: "Произошла ошибка. Попробуйте ещё раз.",
  },
  cart: {
    title: "Корзина",
    empty: "Ваша корзина пуста.",
    goToCatalog: "Перейти в каталог",
  },
  checkout: {
    title: "Оформление заказа",
    addFirst: "Сначала добавьте товары в корзину.",
    fullName: "Имя и фамилия",
    phone: "Номер телефона",
    detectLocation: "Определить локацию (GPS)",
    locationDetected: "Локация определена ✓",
    locationUnsupported: "Ваш браузер не поддерживает геолокацию.",
    locationFailed: "Не удалось определить локацию. Проверьте разрешение.",
    address: "Адрес доставки",
    addressPlaceholder: "Район, улица, дом — напишите, если сложно отправить локацию",
    paymentTitle: "Способ оплаты",
    payCash: "💵 Наличные — оплата при доставке",
    payOnline: "💳 Онлайн — картой (Humo/Uzcard/Visa)",
    onlineNote:
      "Онлайн-оплата станет доступна после подключения платёжной системы. Пока заказ принимается, и оператор свяжется с вами.",
    total: "Итого",
    confirm: "Подтвердить заказ",
    submitError: "Не удалось отправить заказ. Попробуйте ещё раз.",
  },
  contact: {
    title: "Связаться с нами",
    subtitle: "Есть вопрос или хотите, чтобы мы перезвонили? Заполните форму.",
    question: "Ваш вопрос",
    success: "Ваше сообщение отправлено. Мы скоро свяжемся с вами!",
    send: "Отправить",
  },
  profile: {
    loginPrompt: "Войдите, чтобы посмотреть профиль.",
    ordersTitle: "История заказов",
    noOrders: "У вас пока нет заказов.",
    order: "Заказ",
    itemsCount: "товаров",
    payment: "Оплата",
    cash: "💵 Наличные",
    online: "💳 Онлайн",
    addressLabel: "Адрес",
    viewOnMap: "📍 Посмотреть на карте",
    status: {
      pending: "В ожидании",
      approved: "Принят",
      delivering: "Доставляется",
      completed: "Завершён",
      cancelled: "Отменён",
    },
    settingsTitle: "Настройки профиля",
    emailLocked: "Email нельзя изменить (используется как логин)",
    homeAddress: "Домашний адрес",
    addressPlaceholder: "Район, улица, дом",
    saved: "Сохранено!",
    changePhoto: "Сменить фото",
    photoNote: "JPEG/PNG/WebP, до 8МБ.",
    passwordTitle: "Смена пароля",
    currentPassword: "Текущий пароль",
    newPassword: "Новый пароль",
    passwordMin: "Не менее 6 символов",
    changePassword: "Обновить пароль",
    passwordChanged: "Пароль обновлён!",
    wrongPassword: "Текущий пароль неверен.",
  },
};

export const DICTIONARIES: Record<Locale, Dictionary> = { uz, en, ru };

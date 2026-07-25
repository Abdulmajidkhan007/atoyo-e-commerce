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
    loginRequired: string;
    invalidName: string;
    invalidPhone: string;
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
    promoCode: string;
    promoApply: string;
    promoRemove: string;
    promoApplied: string;
    subtotal: string;
    discount: string;
    delivery: string;
    deliveryFree: string;
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
    cancelOrder: string;
    receipt: string;
    cancelConfirm: string;
    cancelled: string;
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
    emailTitle: string;
    newEmail: string;
    changeEmail: string;
    emailVerifySent: string;
    deleteTitle: string;
    deleteWarning: string;
    deleteBtn: string;
    deleteConfirmQuestion: string;
  };
  auth: {
    loginTitle: string;
    registerTitle: string;
    google: string;
    or: string;
    password: string;
    register: string;
    noAccount: string;
    haveAccount: string;
    error: string;
    forgot: string;
    resetSent: string;
    enterEmailFirst: string;
    resetTitle: string;
    sendReset: string;
    backToLogin: string;
    actionResetTitle: string;
    actionResetDone: string;
    actionVerified: string;
    actionInvalid: string;
    goLogin: string;
  };
  product: {
    inStock: string;
    unit: string;
    diameter: string;
    length: string;
    weight: string;
    addToCart: string;
    outOfStock: string;
    products: string;
    total: string;
    order: string;
    loadError: string;
    empty: string;
    searchPlaceholder: string;
  };
  filters: {
    title: string;
    clear: string;
    all: string;
    material: string;
    brand: string;
    country: string;
    priceRange: string;
    from: string;
    to: string;
    sort: string;
    newest: string;
    priceAsc: string;
    priceDesc: string;
  };
  favorites: {
    title: string;
    empty: string;
  };
  reviews: {
    title: string;
    none: string;
    write: string;
    yourRating: string;
    comment: string;
    submit: string;
    thanks: string;
    loginToReview: string;
  };
  newsletter: {
    title: string;
    placeholder: string;
    button: string;
    success: string;
    error: string;
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
    loginRequired: "Buyurtma berish uchun avval tizimga kiring yoki ro'yxatdan o'ting.",
    invalidName: "To'liq ism-familiyangizni kiriting (kamida 2 ta harf).",
    invalidPhone: "Telefon raqamni to'g'ri kiriting. Masalan: +998 90 123 45 67",
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
    promoCode: "Promokod",
    promoApply: "Qo'llash",
    promoRemove: "Bekor qilish",
    promoApplied: "Promokod qo'llandi",
    subtotal: "Mahsulotlar",
    discount: "Chegirma",
    delivery: "Yetkazib berish",
    deliveryFree: "Bepul",
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
    cancelOrder: "Buyurtmani bekor qilish",
    receipt: "Chek",
    cancelConfirm: "Buyurtmani bekor qilishni tasdiqlaysizmi?",
    cancelled: "Buyurtma bekor qilindi.",
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
    emailTitle: "Emailni o'zgartirish",
    newEmail: "Yangi email",
    changeEmail: "Tasdiqlash xatini yuborish",
    emailVerifySent: "Yangi emailga tasdiqlash havolasi yuborildi. Havolani bosganingizdan keyin email yangilanadi.",
    deleteTitle: "Hisobni o'chirish",
    deleteWarning:
      "Hisobingiz va profil ma'lumotlaringiz BUTUNLAY o'chiriladi. Bu amalni qaytarib bo'lmaydi.",
    deleteBtn: "Hisobni butunlay o'chirish",
    deleteConfirmQuestion: "Rostdan ham hisobingizni o'chirmoqchimisiz?",
  },
  auth: {
    loginTitle: "Hisobga kirish",
    registerTitle: "Ro'yxatdan o'tish",
    google: "Google orqali kirish",
    or: "yoki",
    password: "Parol",
    register: "Ro'yxatdan o'tish",
    noAccount: "Hisobingiz yo'qmi? Ro'yxatdan o'ting",
    haveAccount: "Hisobingiz bormi? Kiring",
    error: "Kirishda xatolik yuz berdi. Ma'lumotlaringizni tekshirib qayta urinib ko'ring.",
    forgot: "Parolni unutdingizmi?",
    resetSent: "Parolni tiklash havolasi emailingizga yuborildi. Pochtangizni tekshiring.",
    enterEmailFirst: "Avval yuqoriga email manzilingizni kiriting.",
    resetTitle: "Parolni tiklash",
    sendReset: "Tiklash havolasini yuborish",
    backToLogin: "⬅️ Kirishga qaytish",
    actionResetTitle: "Yangi parol o'rnatish",
    actionResetDone: "Parol muvaffaqiyatli yangilandi! Endi yangi parol bilan kiring.",
    actionVerified: "Email muvaffaqiyatli tasdiqlandi!",
    actionInvalid: "Havola eskirgan yoki allaqachon ishlatilgan. Qaytadan so'rov yuboring.",
    goLogin: "Kirish sahifasiga o'tish",
  },
  product: {
    inStock: "Zaxirada",
    unit: "dona",
    diameter: "Diametri",
    length: "Uzunligi",
    weight: "Vazni",
    addToCart: "Savatga qo'shish",
    outOfStock: "Mahsulot tugagan",
    products: "Mahsulotlar",
    total: "Jami",
    order: "Buyurtma berish",
    loadError: "Mahsulotlarni yuklashda xatolik yuz berdi.",
    empty: "Hech qanday mahsulot topilmadi.",
    searchPlaceholder: "Mahsulot qidirish...",
  },
  filters: {
    title: "Filtrlar",
    clear: "Tozalash",
    all: "Barchasi",
    material: "Material",
    brand: "Brend",
    country: "Ishlab chiqaruvchi davlat",
    priceRange: "Narx oralig'i (so'm)",
    from: "Dan",
    to: "Gacha",
    sort: "Saralash",
    newest: "Eng yangi",
    priceAsc: "Narx: arzondan qimmatga",
    priceDesc: "Narx: qimmatdan arzonga",
  },
  favorites: {
    title: "Sevimlilar",
    empty: "Sevimlilar ro'yxati bo'sh. Mahsulot yonidagi ❤️ tugmasini bosing.",
  },
  reviews: {
    title: "Sharhlar",
    none: "Hozircha sharhlar yo'q. Birinchi bo'lib fikr bildiring!",
    write: "Sharh yozish",
    yourRating: "Bahoyingiz",
    comment: "Fikringiz",
    submit: "Yuborish",
    thanks: "Sharhingiz uchun rahmat!",
    loginToReview: "Sharh qoldirish uchun tizimga kiring.",
  },
  newsletter: {
    title: "Yangiliklarga obuna bo'ling",
    placeholder: "Email manzilingiz",
    button: "Obuna",
    success: "Obuna bo'ldingiz, rahmat!",
    error: "Xatolik yuz berdi, qayta urining.",
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
    loginRequired: "Please sign in or create an account to place an order.",
    invalidName: "Enter your full name (at least 2 letters).",
    invalidPhone: "Enter a valid phone number, e.g. +998 90 123 45 67",
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
    promoCode: "Promo code",
    promoApply: "Apply",
    promoRemove: "Remove",
    promoApplied: "Promo code applied",
    subtotal: "Items",
    discount: "Discount",
    delivery: "Delivery",
    deliveryFree: "Free",
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
    cancelOrder: "Cancel order",
    receipt: "Receipt",
    cancelConfirm: "Cancel this order?",
    cancelled: "Order cancelled.",
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
    emailTitle: "Change email",
    newEmail: "New email",
    changeEmail: "Send verification email",
    emailVerifySent: "A verification link was sent to the new email. Your email will update after you click it.",
    deleteTitle: "Delete account",
    deleteWarning: "Your account and profile data will be permanently deleted. This cannot be undone.",
    deleteBtn: "Permanently delete account",
    deleteConfirmQuestion: "Are you sure you want to delete your account?",
  },
  auth: {
    loginTitle: "Sign in",
    registerTitle: "Create account",
    google: "Continue with Google",
    or: "or",
    password: "Password",
    register: "Create account",
    noAccount: "No account? Sign up",
    haveAccount: "Already have an account? Sign in",
    error: "Sign-in failed. Check your details and try again.",
    forgot: "Forgot password?",
    resetSent: "A password reset link was sent to your email. Check your inbox.",
    enterEmailFirst: "Enter your email address above first.",
    resetTitle: "Reset password",
    sendReset: "Send reset link",
    backToLogin: "⬅️ Back to sign in",
    actionResetTitle: "Set a new password",
    actionResetDone: "Password updated successfully! Sign in with your new password.",
    actionVerified: "Email verified successfully!",
    actionInvalid: "This link is expired or already used. Request a new one.",
    goLogin: "Go to sign-in page",
  },
  product: {
    inStock: "In stock",
    unit: "pcs",
    diameter: "Diameter",
    length: "Length",
    weight: "Weight",
    addToCart: "Add to cart",
    outOfStock: "Out of stock",
    products: "Products",
    total: "Total",
    order: "Place order",
    loadError: "Failed to load products.",
    empty: "No products found.",
    searchPlaceholder: "Search products...",
  },
  filters: {
    title: "Filters",
    clear: "Clear",
    all: "All",
    material: "Material",
    brand: "Brand",
    country: "Country of origin",
    priceRange: "Price range (UZS)",
    from: "From",
    to: "To",
    sort: "Sort by",
    newest: "Newest",
    priceAsc: "Price: low to high",
    priceDesc: "Price: high to low",
  },
  favorites: {
    title: "Favorites",
    empty: "Your favorites list is empty. Tap the ❤️ on any product.",
  },
  reviews: {
    title: "Reviews",
    none: "No reviews yet. Be the first to share your opinion!",
    write: "Write a review",
    yourRating: "Your rating",
    comment: "Your comment",
    submit: "Submit",
    thanks: "Thank you for your review!",
    loginToReview: "Sign in to leave a review.",
  },
  newsletter: {
    title: "Subscribe to our newsletter",
    placeholder: "Your email",
    button: "Subscribe",
    success: "Subscribed, thank you!",
    error: "Something went wrong, try again.",
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
    loginRequired: "Чтобы оформить заказ, войдите или зарегистрируйтесь.",
    invalidName: "Введите имя и фамилию (не менее 2 букв).",
    invalidPhone: "Введите корректный номер, например +998 90 123 45 67",
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
    promoCode: "Промокод",
    promoApply: "Применить",
    promoRemove: "Отменить",
    promoApplied: "Промокод применён",
    subtotal: "Товары",
    discount: "Скидка",
    delivery: "Доставка",
    deliveryFree: "Бесплатно",
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
    cancelOrder: "Отменить заказ",
    receipt: "Чек",
    cancelConfirm: "Отменить этот заказ?",
    cancelled: "Заказ отменён.",
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
    emailTitle: "Смена email",
    newEmail: "Новый email",
    changeEmail: "Отправить письмо-подтверждение",
    emailVerifySent: "Ссылка для подтверждения отправлена на новый email. Email обновится после перехода по ней.",
    deleteTitle: "Удаление аккаунта",
    deleteWarning: "Ваш аккаунт и данные профиля будут удалены НАВСЕГДА. Это действие необратимо.",
    deleteBtn: "Удалить аккаунт навсегда",
    deleteConfirmQuestion: "Вы действительно хотите удалить аккаунт?",
  },
  auth: {
    loginTitle: "Вход в аккаунт",
    registerTitle: "Регистрация",
    google: "Войти через Google",
    or: "или",
    password: "Пароль",
    register: "Зарегистрироваться",
    noAccount: "Нет аккаунта? Зарегистрируйтесь",
    haveAccount: "Уже есть аккаунт? Войдите",
    error: "Не удалось войти. Проверьте данные и попробуйте снова.",
    forgot: "Забыли пароль?",
    resetSent: "Ссылка для сброса пароля отправлена на ваш email. Проверьте почту.",
    enterEmailFirst: "Сначала введите email выше.",
    resetTitle: "Сброс пароля",
    sendReset: "Отправить ссылку для сброса",
    backToLogin: "⬅️ Назад ко входу",
    actionResetTitle: "Установка нового пароля",
    actionResetDone: "Пароль успешно обновлён! Войдите с новым паролем.",
    actionVerified: "Email успешно подтверждён!",
    actionInvalid: "Ссылка устарела или уже использована. Запросите новую.",
    goLogin: "Перейти ко входу",
  },
  product: {
    inStock: "В наличии",
    unit: "шт",
    diameter: "Диаметр",
    length: "Длина",
    weight: "Вес",
    addToCart: "В корзину",
    outOfStock: "Нет в наличии",
    products: "Товары",
    total: "Итого",
    order: "Оформить заказ",
    loadError: "Не удалось загрузить товары.",
    empty: "Товары не найдены.",
    searchPlaceholder: "Поиск товаров...",
  },
  filters: {
    title: "Фильтры",
    clear: "Сбросить",
    all: "Все",
    material: "Материал",
    brand: "Бренд",
    country: "Страна производителя",
    priceRange: "Диапазон цен (сум)",
    from: "От",
    to: "До",
    sort: "Сортировка",
    newest: "Сначала новые",
    priceAsc: "Цена: по возрастанию",
    priceDesc: "Цена: по убыванию",
  },
  favorites: {
    title: "Избранное",
    empty: "Список избранного пуст. Нажмите ❤️ у любого товара.",
  },
  reviews: {
    title: "Отзывы",
    none: "Отзывов пока нет. Будьте первым!",
    write: "Написать отзыв",
    yourRating: "Ваша оценка",
    comment: "Ваш комментарий",
    submit: "Отправить",
    thanks: "Спасибо за отзыв!",
    loginToReview: "Войдите, чтобы оставить отзыв.",
  },
  newsletter: {
    title: "Подпишитесь на новости",
    placeholder: "Ваш email",
    button: "Подписаться",
    success: "Вы подписаны, спасибо!",
    error: "Произошла ошибка, попробуйте снова.",
  },
};

export const DICTIONARIES: Record<Locale, Dictionary> = { uz, en, ru };

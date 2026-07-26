import "server-only";
import type { ProductCategory } from "@/types/product";

/**
 * Mijoz-bot uchun uz/en/ru lug'atlar. Til botSessions/{chatId}.lang da
 * saqlanadi (/til buyrug'i yoki tugmalar orqali tanlanadi); standart - uz.
 */
export type BotLang = "uz" | "en" | "ru";

export const BOT_LANGS: BotLang[] = ["uz", "en", "ru"];

export const BOT_LANG_LABELS: Record<BotLang, string> = {
  uz: "🇺🇿 O'zbekcha",
  en: "🇬🇧 English",
  ru: "🇷🇺 Русский",
};

export interface BotDict {
  welcome: string;
  mainMenu: string;
  catalog: string;
  cart: string;
  profile: string;
  search: string;
  myOrders: string;
  language: string;
  chooseLanguage: string;
  languageSet: string;
  chooseCategory: string;
  page: string;
  emptyCategory: string;
  backToCategories: string;
  backToMenu: string;
  back: string;
  addToCart: string;
  added: string;
  outOfStock: string;
  stockLimit: string;
  notFound: string;
  inStock: string;
  unit: string;
  cartTitle: string;
  cartEmpty: string;
  goCatalog: string;
  total: string;
  checkout: string;
  clearCart: string;
  cartCleared: string;
  continueShopping: string;
  confirmName: string;
  current: string;
  fullNameShort: string;
  askAddress: string;
  sendLocationBtn: string;
  skipBtn: string;
  askPayment: string;
  payCash: string;
  payOnline: string;
  orderAccepted: string;
  orderNumber: string;
  orderTotal: string;
  orderFollowUp: string;
  searchPrompt: string;
  searchNoResults: string;
  ordersTitle: string;
  noOrders: string;
  statusLabels: { pending: string; approved: string; delivering: string; completed: string; cancelled: string };
  registered: string;
  registeredAt: string;
  profileSiteHint: string;
  editName: string;
  editAddress: string;
  askNewName: string;
  askNewAddress: string;
  savedOk: string;
  addressLabel: string;
  deleteAccount: string;
  deleteConfirm: string;
  deleteYes: string;
  deleteNo: string;
  deleteDone: string;
  loginApproved: string;
  loginExpired: string;
  // ---- Savat boshqaruvi ----
  qtyPlus: string;
  qtyMinus: string;
  removeItem: string;
  itemRemoved: string;
  // ---- Promokod va hisob ----
  promoBtn: string;
  promoPrompt: string;
  promoApplied: string;
  promoInvalid: string;
  promoRemoveBtn: string;
  promoRemoved: string;
  subtotalLabel: string;
  discountLabel: string;
  deliveryLabel: string;
  // ---- Sevimlilar ----
  favorites: string;
  favAdd: string;
  favRemove: string;
  favAdded: string;
  favRemoved: string;
  favEmpty: string;
  favTitle: string;
  // ---- Sharhlar ----
  reviewsBtn: string;
  reviewsTitle: string;
  noReviews: string;
  writeReview: string;
  ratePrompt: string;
  reviewPrompt: string;
  reviewSaved: string;
  ratingLabel: string;
  // ---- Blog / kontakt / haqida ----
  blog: string;
  blogEmpty: string;
  readOnSite: string;
  contact: string;
  contactTitle: string;
  about: string;
  // ---- Buyurtmani bekor qilish ----
  cancelOrder: string;
  cancelConfirmQ: string;
  cancelYes: string;
  cancelNo: string;
  cancelDone: string;
  cancelNotAllowed: string;
  // ---- Filtr ----
  filter: string;
  filterTitle: string;
  filterBrand: string;
  filterMaterial: string;
  filterSort: string;
  filterClear: string;
  filterAll: string;
  sortNewest: string;
  sortPriceAsc: string;
  sortPriceDesc: string;
  filterApplied: string;
  categories: Record<ProductCategory, string>;
}

const uz: BotDict = {
  welcome: "🏪 <b>Atoyo Santexnika</b> botiga xush kelibsiz!\n\nKatalogdan mahsulot tanlab, shu yerning o'zida buyurtma bering.",
  mainMenu: "🏪 <b>Bosh menyu</b>",
  catalog: "🛍 Katalog",
  cart: "🛒 Savat",
  profile: "👤 Profil",
  search: "🔍 Qidiruv",
  myOrders: "📦 Buyurtmalarim",
  language: "🌐 Til",
  chooseLanguage: "Tilni tanlang:",
  languageSet: "✅ Til o'rnatildi: O'zbekcha",
  chooseCategory: "Kategoriyani tanlang:",
  page: "sahifa",
  emptyCategory: "Bu kategoriyada hozircha mahsulot yo'q.",
  backToCategories: "⬅️ Kategoriyalar",
  backToMenu: "⬅️ Bosh menyu",
  back: "⬅️ Orqaga",
  addToCart: "🛒 Savatga qo'shish",
  added: "✅ Savatga qo'shildi",
  outOfStock: "Bu mahsulot tugagan.",
  stockLimit: "Zaxiradan ortiq qo'shib bo'lmaydi.",
  notFound: "Mahsulot topilmadi.",
  inStock: "Zaxirada",
  unit: "dona",
  cartTitle: "🛒 <b>Savatingiz</b>",
  cartEmpty: "🛒 Savatingiz bo'sh.",
  goCatalog: "🛍 Katalogga o'tish",
  total: "Jami",
  checkout: "✅ Buyurtma berish",
  clearCart: "🗑 Tozalash",
  cartCleared: "Savat tozalandi.",
  continueShopping: "🛍 Davom etish",
  confirmName: "👤 Buyurtma uchun ism-familiyangizni tasdiqlang yoki qaytadan yozing:",
  current: "Joriy",
  fullNameShort: "Tasdiqlash",
  askAddress: "📍 Yetkazish manzilini yozing yoki lokatsiyangizni yuboring (pastdagi tugma):",
  sendLocationBtn: "📍 Lokatsiyani yuborish",
  skipBtn: "⏭ O'tkazish",
  askPayment: "💳 To'lov usulini tanlang:",
  payCash: "💵 Naqd (yetkazilganda)",
  payOnline: "💳 Onlayn (karta)",
  orderAccepted: "🎉 Buyurtmangiz qabul qilindi!",
  orderNumber: "Raqami",
  orderTotal: "Jami",
  orderFollowUp: "Holati o'zgarishi bilan shu chatda xabar beramiz. Rahmat! 🙌",
  searchPrompt: "🔍 Qidirilayotgan mahsulot nomini yozing:",
  searchNoResults: "Hech narsa topilmadi. Boshqa so'z bilan urinib ko'ring.",
  ordersTitle: "📦 <b>So'nggi buyurtmalaringiz</b>",
  noOrders: "Sizda hali buyurtmalar yo'q.",
  statusLabels: {
    pending: "🕓 Kutilmoqda",
    approved: "✅ Qabul qilindi",
    delivering: "🚚 Yetkazilmoqda",
    completed: "🎉 Yakunlandi",
    cancelled: "❌ Bekor qilindi",
  },
  registered: "✅ Ro'yxatdan o'tdingiz!",
  registeredAt: "Ro'yxatdan o'tgan",
  profileSiteHint: "Ko'proq sozlamalar saytda",
  editName: "✏️ Ism",
  editAddress: "🏠 Manzil",
  askNewName: "Yangi ism-familiyangizni yozing:",
  askNewAddress: "Yangi manzilingizni yozing:",
  savedOk: "✅ Saqlandi.",
  addressLabel: "Manzil",
  deleteAccount: "🗑 Hisobni o'chirish",
  deleteConfirm:
    "⚠️ Hisobingiz va bot ma'lumotlaringiz BUTUNLAY o'chiriladi. Bu amalni qaytarib bo'lmaydi. Davom etasizmi?",
  deleteYes: "🗑 Ha, o'chirilsin",
  deleteNo: "⬅️ Yo'q, bekor qilish",
  deleteDone: "Hisobingiz o'chirildi. Qayta ro'yxatdan o'tish uchun /start yuboring.",
  loginApproved:
    "✅ Kirish tasdiqlandi! Saytga (yoki ilovaga) qaytishingiz mumkin - u sizni avtomatik taniydi.",
  loginExpired:
    "⏳ Kirish havolasining muddati tugagan. Saytda \"Telegram orqali kirish\" tugmasini qaytadan bosing.",
  qtyPlus: "➕",
  qtyMinus: "➖",
  removeItem: "🗑",
  itemRemoved: "Savatdan olib tashlandi",
  promoBtn: "🏷 Promokod",
  promoPrompt: "Promokodni yuboring:",
  promoApplied: "✅ Promokod qo'llandi",
  promoInvalid: "❌ Promokod ishlamadi",
  promoRemoveBtn: "❌ Promokodni olib tashlash",
  promoRemoved: "Promokod bekor qilindi",
  subtotalLabel: "Mahsulotlar",
  discountLabel: "Chegirma",
  deliveryLabel: "Yetkazib berish",
  favorites: "❤️ Sevimlilar",
  favAdd: "🤍 Sevimlilarga",
  favRemove: "❤️ Sevimlilardan olish",
  favAdded: "❤️ Sevimlilarga qo'shildi",
  favRemoved: "Sevimlilardan olib tashlandi",
  favEmpty: "Sevimlilar ro'yxati bo'sh.",
  favTitle: "❤️ <b>Sevimlilar</b>",
  reviewsBtn: "⭐️ Sharhlar",
  reviewsTitle: "⭐️ <b>Sharhlar</b>",
  noReviews: "Hozircha sharhlar yo'q. Birinchi bo'lib fikr bildiring!",
  writeReview: "✍️ Sharh yozish",
  ratePrompt: "Nechta yulduz berasiz?",
  reviewPrompt: "Fikringizni yozing:",
  reviewSaved: "✅ Sharhingiz uchun rahmat!",
  ratingLabel: "Reyting",
  blog: "📰 Blog",
  blogEmpty: "Hozircha maqolalar yo'q.",
  readOnSite: "📖 To'liq o'qish",
  contact: "📞 Bog'lanish",
  contactTitle: "📞 <b>Biz bilan bog'laning</b>",
  about: "ℹ️ Biz haqimizda",
  cancelOrder: "❌ Buyurtmani bekor qilish",
  cancelConfirmQ: "Buyurtmani bekor qilasizmi?",
  cancelYes: "✅ Ha, bekor qilinsin",
  cancelNo: "⬅️ Yo'q",
  cancelDone: "Buyurtma bekor qilindi.",
  cancelNotAllowed: "Bu buyurtmani endi bekor qilib bo'lmaydi.",
  filter: "⚙️ Filtr",
  filterTitle: "⚙️ <b>Filtr</b>",
  filterBrand: "™️ Brend",
  filterMaterial: "🧱 Material",
  filterSort: "↕️ Saralash",
  filterClear: "🧹 Tozalash",
  filterAll: "Barchasi",
  sortNewest: "Eng yangi",
  sortPriceAsc: "Narx ↑",
  sortPriceDesc: "Narx ↓",
  filterApplied: "Filtr qo'llandi",
  categories: {
    pipes: "🔧 Quvurlar",
    fittings: "🔩 Muftalar",
    faucets: "🚰 Kranlar",
    "shower-systems": "🚿 Dush tizimlari",
    boilers: "🔥 Isitish qozonlari",
    radiators: "🌡 Radiatorlar",
    pumps: "⚙️ Nasoslar",
    "sanitary-ware": "🚽 Santexnika buyumlari",
  },
};

const en: BotDict = {
  welcome: "🏪 Welcome to the <b>Atoyo Santexnika</b> bot!\n\nPick products from the catalog and order right here.",
  mainMenu: "🏪 <b>Main menu</b>",
  catalog: "🛍 Catalog",
  cart: "🛒 Cart",
  profile: "👤 Profile",
  search: "🔍 Search",
  myOrders: "📦 My orders",
  language: "🌐 Language",
  chooseLanguage: "Choose a language:",
  languageSet: "✅ Language set: English",
  chooseCategory: "Choose a category:",
  page: "page",
  emptyCategory: "No products in this category yet.",
  backToCategories: "⬅️ Categories",
  backToMenu: "⬅️ Main menu",
  back: "⬅️ Back",
  addToCart: "🛒 Add to cart",
  added: "✅ Added to cart",
  outOfStock: "This product is out of stock.",
  stockLimit: "Cannot add more than available stock.",
  notFound: "Product not found.",
  inStock: "In stock",
  unit: "pcs",
  cartTitle: "🛒 <b>Your cart</b>",
  cartEmpty: "🛒 Your cart is empty.",
  goCatalog: "🛍 Go to catalog",
  total: "Total",
  checkout: "✅ Place order",
  clearCart: "🗑 Clear",
  cartCleared: "Cart cleared.",
  continueShopping: "🛍 Continue",
  confirmName: "👤 Confirm your full name for the order or type a new one:",
  current: "Current",
  fullNameShort: "Confirm",
  askAddress: "📍 Type your delivery address or share your location (button below):",
  sendLocationBtn: "📍 Share location",
  skipBtn: "⏭ Skip",
  askPayment: "💳 Choose a payment method:",
  payCash: "💵 Cash (on delivery)",
  payOnline: "💳 Online (card)",
  orderAccepted: "🎉 Your order has been received!",
  orderNumber: "Number",
  orderTotal: "Total",
  orderFollowUp: "We'll notify you here when the status changes. Thank you! 🙌",
  searchPrompt: "🔍 Type the product name to search:",
  searchNoResults: "Nothing found. Try a different word.",
  ordersTitle: "📦 <b>Your recent orders</b>",
  noOrders: "You have no orders yet.",
  statusLabels: {
    pending: "🕓 Pending",
    approved: "✅ Approved",
    delivering: "🚚 Delivering",
    completed: "🎉 Completed",
    cancelled: "❌ Cancelled",
  },
  registered: "✅ You are registered!",
  registeredAt: "Registered",
  profileSiteHint: "More settings on the website",
  editName: "✏️ Name",
  editAddress: "🏠 Address",
  askNewName: "Type your new full name:",
  askNewAddress: "Type your new address:",
  savedOk: "✅ Saved.",
  addressLabel: "Address",
  deleteAccount: "🗑 Delete account",
  deleteConfirm:
    "⚠️ Your account and bot data will be permanently deleted. This cannot be undone. Continue?",
  deleteYes: "🗑 Yes, delete",
  deleteNo: "⬅️ No, cancel",
  deleteDone: "Your account has been deleted. Send /start to register again.",
  loginApproved:
    "✅ Sign-in approved! You can go back to the website (or the app) - it will recognise you automatically.",
  loginExpired: "⏳ This sign-in link has expired. Press \"Sign in with Telegram\" again.",
  qtyPlus: "➕",
  qtyMinus: "➖",
  removeItem: "🗑",
  itemRemoved: "Removed from cart",
  promoBtn: "🏷 Promo code",
  promoPrompt: "Send your promo code:",
  promoApplied: "✅ Promo code applied",
  promoInvalid: "❌ Promo code did not work",
  promoRemoveBtn: "❌ Remove promo code",
  promoRemoved: "Promo code removed",
  subtotalLabel: "Items",
  discountLabel: "Discount",
  deliveryLabel: "Delivery",
  favorites: "❤️ Favorites",
  favAdd: "🤍 Add to favorites",
  favRemove: "❤️ Remove from favorites",
  favAdded: "❤️ Added to favorites",
  favRemoved: "Removed from favorites",
  favEmpty: "Your favorites list is empty.",
  favTitle: "❤️ <b>Favorites</b>",
  reviewsBtn: "⭐️ Reviews",
  reviewsTitle: "⭐️ <b>Reviews</b>",
  noReviews: "No reviews yet. Be the first to share your opinion!",
  writeReview: "✍️ Write a review",
  ratePrompt: "How many stars?",
  reviewPrompt: "Write your comment:",
  reviewSaved: "✅ Thank you for your review!",
  ratingLabel: "Rating",
  blog: "📰 Blog",
  blogEmpty: "No articles yet.",
  readOnSite: "📖 Read more",
  contact: "📞 Contact",
  contactTitle: "📞 <b>Get in touch</b>",
  about: "ℹ️ About us",
  cancelOrder: "❌ Cancel order",
  cancelConfirmQ: "Cancel this order?",
  cancelYes: "✅ Yes, cancel it",
  cancelNo: "⬅️ No",
  cancelDone: "Order cancelled.",
  cancelNotAllowed: "This order can no longer be cancelled.",
  filter: "⚙️ Filter",
  filterTitle: "⚙️ <b>Filter</b>",
  filterBrand: "™️ Brand",
  filterMaterial: "🧱 Material",
  filterSort: "↕️ Sort",
  filterClear: "🧹 Clear",
  filterAll: "All",
  sortNewest: "Newest",
  sortPriceAsc: "Price ↑",
  sortPriceDesc: "Price ↓",
  filterApplied: "Filter applied",
  categories: {
    pipes: "🔧 Pipes",
    fittings: "🔩 Fittings",
    faucets: "🚰 Faucets",
    "shower-systems": "🚿 Shower systems",
    boilers: "🔥 Heating boilers",
    radiators: "🌡 Radiators",
    pumps: "⚙️ Pumps",
    "sanitary-ware": "🚽 Sanitary ware",
  },
};

const ru: BotDict = {
  welcome: "🏪 Добро пожаловать в бот <b>Atoyo Santexnika</b>!\n\nВыбирайте товары из каталога и заказывайте прямо здесь.",
  mainMenu: "🏪 <b>Главное меню</b>",
  catalog: "🛍 Каталог",
  cart: "🛒 Корзина",
  profile: "👤 Профиль",
  search: "🔍 Поиск",
  myOrders: "📦 Мои заказы",
  language: "🌐 Язык",
  chooseLanguage: "Выберите язык:",
  languageSet: "✅ Язык установлен: Русский",
  chooseCategory: "Выберите категорию:",
  page: "страница",
  emptyCategory: "В этой категории пока нет товаров.",
  backToCategories: "⬅️ Категории",
  backToMenu: "⬅️ Главное меню",
  back: "⬅️ Назад",
  addToCart: "🛒 В корзину",
  added: "✅ Добавлено в корзину",
  outOfStock: "Этот товар закончился.",
  stockLimit: "Нельзя добавить больше, чем есть в наличии.",
  notFound: "Товар не найден.",
  inStock: "В наличии",
  unit: "шт",
  cartTitle: "🛒 <b>Ваша корзина</b>",
  cartEmpty: "🛒 Ваша корзина пуста.",
  goCatalog: "🛍 В каталог",
  total: "Итого",
  checkout: "✅ Оформить заказ",
  clearCart: "🗑 Очистить",
  cartCleared: "Корзина очищена.",
  continueShopping: "🛍 Продолжить",
  confirmName: "👤 Подтвердите имя и фамилию для заказа или введите заново:",
  current: "Текущее",
  fullNameShort: "Подтвердить",
  askAddress: "📍 Напишите адрес доставки или отправьте локацию (кнопка ниже):",
  sendLocationBtn: "📍 Отправить локацию",
  skipBtn: "⏭ Пропустить",
  askPayment: "💳 Выберите способ оплаты:",
  payCash: "💵 Наличные (при доставке)",
  payOnline: "💳 Онлайн (картой)",
  orderAccepted: "🎉 Ваш заказ принят!",
  orderNumber: "Номер",
  orderTotal: "Итого",
  orderFollowUp: "Сообщим здесь при изменении статуса. Спасибо! 🙌",
  searchPrompt: "🔍 Введите название товара для поиска:",
  searchNoResults: "Ничего не найдено. Попробуйте другое слово.",
  ordersTitle: "📦 <b>Ваши последние заказы</b>",
  noOrders: "У вас пока нет заказов.",
  statusLabels: {
    pending: "🕓 В ожидании",
    approved: "✅ Принят",
    delivering: "🚚 Доставляется",
    completed: "🎉 Завершён",
    cancelled: "❌ Отменён",
  },
  registered: "✅ Вы зарегистрированы!",
  registeredAt: "Зарегистрирован",
  profileSiteHint: "Больше настроек на сайте",
  editName: "✏️ Имя",
  editAddress: "🏠 Адрес",
  askNewName: "Введите новое имя и фамилию:",
  askNewAddress: "Введите новый адрес:",
  savedOk: "✅ Сохранено.",
  addressLabel: "Адрес",
  deleteAccount: "🗑 Удалить аккаунт",
  deleteConfirm:
    "⚠️ Ваш аккаунт и данные в боте будут удалены НАВСЕГДА. Это действие необратимо. Продолжить?",
  deleteYes: "🗑 Да, удалить",
  deleteNo: "⬅️ Нет, отмена",
  deleteDone: "Ваш аккаунт удалён. Отправьте /start, чтобы зарегистрироваться заново.",
  loginApproved:
    "✅ Вход подтверждён! Можете вернуться на сайт (или в приложение) - он узнает вас автоматически.",
  loginExpired: "⏳ Срок ссылки для входа истёк. Нажмите \"Войти через Telegram\" ещё раз.",
  qtyPlus: "➕",
  qtyMinus: "➖",
  removeItem: "🗑",
  itemRemoved: "Удалено из корзины",
  promoBtn: "🏷 Промокод",
  promoPrompt: "Отправьте промокод:",
  promoApplied: "✅ Промокод применён",
  promoInvalid: "❌ Промокод не сработал",
  promoRemoveBtn: "❌ Убрать промокод",
  promoRemoved: "Промокод отменён",
  subtotalLabel: "Товары",
  discountLabel: "Скидка",
  deliveryLabel: "Доставка",
  favorites: "❤️ Избранное",
  favAdd: "🤍 В избранное",
  favRemove: "❤️ Убрать из избранного",
  favAdded: "❤️ Добавлено в избранное",
  favRemoved: "Убрано из избранного",
  favEmpty: "Список избранного пуст.",
  favTitle: "❤️ <b>Избранное</b>",
  reviewsBtn: "⭐️ Отзывы",
  reviewsTitle: "⭐️ <b>Отзывы</b>",
  noReviews: "Отзывов пока нет. Будьте первым!",
  writeReview: "✍️ Написать отзыв",
  ratePrompt: "Сколько звёзд поставите?",
  reviewPrompt: "Напишите ваш отзыв:",
  reviewSaved: "✅ Спасибо за отзыв!",
  ratingLabel: "Рейтинг",
  blog: "📰 Блог",
  blogEmpty: "Статей пока нет.",
  readOnSite: "📖 Читать полностью",
  contact: "📞 Связаться",
  contactTitle: "📞 <b>Свяжитесь с нами</b>",
  about: "ℹ️ О нас",
  cancelOrder: "❌ Отменить заказ",
  cancelConfirmQ: "Отменить заказ?",
  cancelYes: "✅ Да, отменить",
  cancelNo: "⬅️ Нет",
  cancelDone: "Заказ отменён.",
  cancelNotAllowed: "Этот заказ уже нельзя отменить.",
  filter: "⚙️ Фильтр",
  filterTitle: "⚙️ <b>Фильтр</b>",
  filterBrand: "™️ Бренд",
  filterMaterial: "🧱 Материал",
  filterSort: "↕️ Сортировка",
  filterClear: "🧹 Сбросить",
  filterAll: "Все",
  sortNewest: "Новые",
  sortPriceAsc: "Цена ↑",
  sortPriceDesc: "Цена ↓",
  filterApplied: "Фильтр применён",
  categories: {
    pipes: "🔧 Трубы",
    fittings: "🔩 Фитинги",
    faucets: "🚰 Краны",
    "shower-systems": "🚿 Душевые системы",
    boilers: "🔥 Отопительные котлы",
    radiators: "🌡 Радиаторы",
    pumps: "⚙️ Насосы",
    "sanitary-ware": "🚽 Сантехника",
  },
};

const BOT_DICTS: Record<BotLang, BotDict> = { uz, en, ru };

export function botDict(lang: BotLang | undefined): BotDict {
  return BOT_DICTS[lang ?? "uz"] ?? BOT_DICTS.uz;
}

export function isBotLang(value: string | undefined): value is BotLang {
  return !!value && (BOT_LANGS as string[]).includes(value);
}

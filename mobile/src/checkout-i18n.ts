import {useI18n, type Locale} from './i18n';

/**
 * XARID OQIMI MATNLARI (AUDIT-ISHLARI 15, B oqimi) — 1 klik, o'tkazma,
 * chek, bepul yetkazish chizig'i, xususiyatlar.
 *
 * Alohida faylda: uch oqim bir vaqtda ishlagani uchun umumiy
 * `i18n.tsx` dagi `Dict` ga qo'shilmagan (har qo'shilgan kalit uch
 * lug'atda ziddiyat berardi). Matnlar saytdagi `dict.payment` /
 * `dict.cart` / `dict.product` bilan bir xil. `{amount}` kabi joylar
 * `fill()` bilan to'ldiriladi.
 */
export interface CheckoutDict {
  // Mahsulot ekrani
  specsTitle: string;
  specCategory: string;
  specBrand: string;
  specCountry: string;
  specMaterial: string;
  specSaleUnit: string;
  specDiameter: string;
  specLength: string;
  specWeight: string;
  specCode: string;
  defaultUnit: string;
  quickBuy: string;
  quickBuyTitle: string;
  quickBuySubtitle: string;
  quantity: string;
  // 1 klik / checkout
  guestCheckout: string;
  guestCheckoutHint: string;
  orLogin: string;
  zone: string;
  zoneNone: string;
  payTransfer: string;
  transferHint: string;
  delivery: string;
  free: string;
  total: string;
  submitQuick: string;
  sending: string;
  addressRequired: string;
  orderReceivedShort: string;
  minOrder: string;
  guestLimit: string;
  // Savat
  freeDeliveryLeft: string;
  freeDeliveryReached: string;
  deliveryNow: string;
  fillGapTitle: string;
  addedToCart: string;
  // To'lov ekrani
  paymentScreenTitle: string;
  orderReceived: string;
  orderNumber: string;
  amountToPay: string;
  transferTitle: string;
  step1: string;
  step2: string;
  step3: string;
  cardNumber: string;
  cardHolder: string;
  copy: string;
  copied: string;
  uploadReceipt: string;
  reupload: string;
  uploading: string;
  receiptUploaded: string;
  receiptSent: string;
  paid: string;
  failed: string;
  cancelled: string;
  cashNote: string;
  transferOff: string;
  loadFailed: string;
  retry: string;
  toOrders: string;
  toHome: string;
  payForOrder: string;
}

const uz: CheckoutDict = {
  specsTitle: 'Xususiyatlari',
  specCategory: 'Kategoriya',
  specBrand: 'Brend',
  specCountry: 'Davlat',
  specMaterial: 'Material',
  specSaleUnit: 'Sotish turi',
  specDiameter: 'Diametri',
  specLength: 'Uzunligi',
  specWeight: 'Vazni',
  specCode: 'Kod',
  defaultUnit: 'dona',
  quickBuy: '1 klikda sotib olish',
  quickBuyTitle: 'Tez buyurtma',
  quickBuySubtitle: "Ro'yxatdan o'tish shart emas",
  quantity: 'Soni',
  guestCheckout: "Ro'yxatdan o'tmasdan buyurtma berish",
  guestCheckoutHint: "Butun savat bitta buyurtma bo'lib ketadi — faqat ism, telefon va manzil.",
  orLogin: 'Hisobga kirish',
  zone: 'Yetkazish hududi',
  zoneNone: 'Tanlanmagan',
  payTransfer: "Kartaga o'tkazma (chek bilan)",
  transferHint: "Buyurtmadan keyin karta raqami ko'rsatiladi: pulni o'tkazib, chekni yuklaysiz.",
  delivery: 'Yetkazish',
  free: 'bepul',
  total: 'Jami',
  submitQuick: 'Buyurtma berish',
  sending: 'Yuborilmoqda...',
  addressRequired: 'Yetkazish manzilini yozing.',
  orderReceivedShort: 'Buyurtmangiz qabul qilindi. Operator tez orada qo‘ng‘iroq qiladi.',
  minOrder: "Eng kam buyurtma summasi — {amount}. Sonini oshiring yoki savatga boshqa mahsulot qo'shing.",
  guestLimit:
    "Ro'yxatdan o'tmasdan ko'pi bilan {lines} xil mahsulot va har biridan 99 donagacha buyurtma qilinadi. Kattaroq buyurtma uchun hisobingizga kiring yoki bizga qo'ng'iroq qiling.",
  freeDeliveryLeft: 'Bepul yetkazishga {amount} qoldi',
  freeDeliveryReached: 'Yetkazish bepul!',
  deliveryNow: 'Hozir yetkazish: {fee}',
  fillGapTitle: "Bittasini qo'shsangiz — yetkazish bepul",
  addedToCart: "Savatga qo'shildi",
  paymentScreenTitle: "To'lov",
  orderReceived: 'Buyurtmangiz qabul qilindi',
  orderNumber: 'Buyurtma #{id}',
  amountToPay: "To'lanadigan summa",
  transferTitle: "Kartaga o'tkazma",
  step1: "Bank ilovangizda (Click, Payme, Uzum yoki bank ilovasi) shu kartaga aynan shu summani o'tkazing.",
  step2: "O'tkazma chekining skrinshotini oling.",
  step3: 'Chekni shu yerga yuklang — admin pul tushganini tekshirib, buyurtmani yetkazadi.',
  cardNumber: 'Karta raqami',
  cardHolder: 'Karta egasi',
  copy: 'Nusxa olish',
  copied: 'Nusxa olindi',
  uploadReceipt: 'Chekni yuklash',
  reupload: 'Boshqa chek yuklash',
  uploading: 'Yuklanmoqda...',
  receiptUploaded:
    'Chek yuklandi — admin tekshirmoqda. Pul tushgani tasdiqlangach buyurtma yetkaziladi.',
  receiptSent: 'Chek yuborildi',
  paid: "To'lov tasdiqlandi. Buyurtmangiz tayyorlanmoqda.",
  failed: "To'lov topilmadi. Chekni qayta yuklang yoki bizga qo'ng'iroq qiling.",
  cancelled: 'Buyurtma bekor qilingan.',
  cashNote: "To'lov — yetkazib berilganda naqd. Operator tez orada qo'ng'iroq qiladi.",
  transferOff: "Kartaga o'tkazma hozir o'chirilgan. Bizga qo'ng'iroq qiling.",
  loadFailed: "Buyurtma ma'lumotini olib bo'lmadi.",
  retry: 'Qayta urinish',
  toOrders: 'Buyurtmalarim',
  toHome: 'Bosh sahifaga',
  payForOrder: "To'lash / chek yuklash",
};

const en: CheckoutDict = {
  specsTitle: 'Specifications',
  specCategory: 'Category',
  specBrand: 'Brand',
  specCountry: 'Country',
  specMaterial: 'Material',
  specSaleUnit: 'Sold by',
  specDiameter: 'Diameter',
  specLength: 'Length',
  specWeight: 'Weight',
  specCode: 'Code',
  defaultUnit: 'piece',
  quickBuy: 'Buy in one click',
  quickBuyTitle: 'Quick order',
  quickBuySubtitle: 'No registration needed',
  quantity: 'Quantity',
  guestCheckout: 'Order without signing up',
  guestCheckoutHint: 'The whole cart becomes one order — just your name, phone and address.',
  orLogin: 'Sign in',
  zone: 'Delivery area',
  zoneNone: 'Not selected',
  payTransfer: 'Card transfer (with receipt)',
  transferHint: 'After ordering you will see the card number: transfer the money and upload the receipt.',
  delivery: 'Delivery',
  free: 'free',
  total: 'Total',
  submitQuick: 'Place order',
  sending: 'Sending...',
  addressRequired: 'Please enter the delivery address.',
  orderReceivedShort: 'Your order has been received. Our operator will call you shortly.',
  minOrder: 'The minimum order is {amount}. Increase the quantity or add other items to the cart.',
  guestLimit:
    'Without an account you can order up to {lines} different products, 99 of each. For a larger order, sign in or call us.',
  freeDeliveryLeft: '{amount} more for free delivery',
  freeDeliveryReached: 'Free delivery!',
  deliveryNow: 'Delivery now: {fee}',
  fillGapTitle: 'Add one of these — delivery becomes free',
  addedToCart: 'Added to cart',
  paymentScreenTitle: 'Payment',
  orderReceived: 'Your order has been received',
  orderNumber: 'Order #{id}',
  amountToPay: 'Amount to pay',
  transferTitle: 'Card transfer',
  step1: 'In your banking app (Click, Payme, Uzum or your bank) transfer exactly this amount to this card.',
  step2: 'Take a screenshot of the transfer receipt.',
  step3: 'Upload the receipt here — we check the payment and deliver your order.',
  cardNumber: 'Card number',
  cardHolder: 'Card holder',
  copy: 'Copy',
  copied: 'Copied',
  uploadReceipt: 'Upload receipt',
  reupload: 'Upload another receipt',
  uploading: 'Uploading...',
  receiptUploaded:
    'Receipt uploaded — we are checking it. Your order ships once the payment is confirmed.',
  receiptSent: 'Receipt sent',
  paid: 'Payment confirmed. Your order is being prepared.',
  failed: 'Payment not found. Upload the receipt again or call us.',
  cancelled: 'The order has been cancelled.',
  cashNote: 'Pay in cash on delivery. Our operator will call you shortly.',
  transferOff: 'Card transfer is currently unavailable. Please call us.',
  loadFailed: 'Could not load the order.',
  retry: 'Try again',
  toOrders: 'My orders',
  toHome: 'Home',
  payForOrder: 'Pay / upload receipt',
};

const ru: CheckoutDict = {
  specsTitle: 'Характеристики',
  specCategory: 'Категория',
  specBrand: 'Бренд',
  specCountry: 'Страна',
  specMaterial: 'Материал',
  specSaleUnit: 'Единица продажи',
  specDiameter: 'Диаметр',
  specLength: 'Длина',
  specWeight: 'Вес',
  specCode: 'Код',
  defaultUnit: 'шт.',
  quickBuy: 'Купить в 1 клик',
  quickBuyTitle: 'Быстрый заказ',
  quickBuySubtitle: 'Регистрация не нужна',
  quantity: 'Количество',
  guestCheckout: 'Заказать без регистрации',
  guestCheckoutHint: 'Вся корзина станет одним заказом — только имя, телефон и адрес.',
  orLogin: 'Войти',
  zone: 'Район доставки',
  zoneNone: 'Не выбран',
  payTransfer: 'Перевод на карту (с чеком)',
  transferHint: 'После заказа появится номер карты: переведите деньги и загрузите чек.',
  delivery: 'Доставка',
  free: 'бесплатно',
  total: 'Итого',
  submitQuick: 'Оформить заказ',
  sending: 'Отправка...',
  addressRequired: 'Укажите адрес доставки.',
  orderReceivedShort: 'Заказ принят. Оператор скоро позвонит.',
  minOrder: 'Минимальная сумма заказа — {amount}. Увеличьте количество или добавьте другие товары в корзину.',
  guestLimit:
    'Без регистрации можно заказать до {lines} разных товаров, до 99 штук каждого. Для большего заказа войдите или позвоните нам.',
  freeDeliveryLeft: 'До бесплатной доставки осталось {amount}',
  freeDeliveryReached: 'Доставка бесплатная!',
  deliveryNow: 'Сейчас доставка: {fee}',
  fillGapTitle: 'Добавьте один из них — доставка станет бесплатной',
  addedToCart: 'Добавлено в корзину',
  paymentScreenTitle: 'Оплата',
  orderReceived: 'Ваш заказ принят',
  orderNumber: 'Заказ #{id}',
  amountToPay: 'Сумма к оплате',
  transferTitle: 'Перевод на карту',
  step1: 'В приложении банка (Click, Payme, Uzum или вашего банка) переведите на эту карту ровно эту сумму.',
  step2: 'Сделайте скриншот чека перевода.',
  step3: 'Загрузите чек сюда — мы проверим оплату и доставим заказ.',
  cardNumber: 'Номер карты',
  cardHolder: 'Владелец карты',
  copy: 'Копировать',
  copied: 'Скопировано',
  uploadReceipt: 'Загрузить чек',
  reupload: 'Загрузить другой чек',
  uploading: 'Загрузка...',
  receiptUploaded: 'Чек загружен — мы проверяем. Заказ будет доставлен после подтверждения оплаты.',
  receiptSent: 'Чек отправлен',
  paid: 'Оплата подтверждена. Заказ готовится.',
  failed: 'Оплата не найдена. Загрузите чек ещё раз или позвоните нам.',
  cancelled: 'Заказ отменён.',
  cashNote: 'Оплата наличными при доставке. Оператор скоро позвонит.',
  transferOff: 'Перевод на карту сейчас недоступен. Позвоните нам.',
  loadFailed: 'Не удалось загрузить заказ.',
  retry: 'Повторить',
  toOrders: 'Мои заказы',
  toHome: 'На главную',
  payForOrder: 'Оплатить / загрузить чек',
};

const DICTS: Record<Locale, CheckoutDict> = {uz, en, ru};

/** `"{amount} qoldi"` → `"15 000 so'm qoldi"`. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** Joriy tildagi xarid matnlari + umumiy `t`/`money`. */
export function useCheckoutI18n() {
  const i18n = useI18n();
  return {...i18n, c: DICTS[i18n.locale] ?? uz};
}

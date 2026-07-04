import type { Dictionary } from "./uz";

const ru: Dictionary = {
  meta: {
    title: "Atoyo Santexnika | Магазин сантехники и отопления",
    description:
      "Трубы, фитинги, краны, душевые системы и отопительные котлы — самая качественная сантехника.",
  },

  common: {
    brand: "Atoyo Santexnika",
    loading: "Загрузка...",
    retry: "Повторить",
    save: "Сохранить",
    cancel: "Отмена",
    close: "Закрыть",
    errorGeneric: "Произошла ошибка, попробуйте снова.",
    currencyUzs: "сум",
    all: "Все",
  },

  nav: {
    home: "Главная",
    catalog: "Каталог",
    blog: "Блог",
    about: "О нас",
    contact: "Контакты",
    cart: "Корзина",
    profile: "Профиль",
    login: "Войти",
    homeShort: "Главная",
    aboutShort: "О нас",
  },

  search: {
    placeholder: "Поиск товаров (например: кран, труба...)",
    aria: "Поиск товаров",
    clear: "Очистить поиск",
  },

  theme: {
    toLight: "Светлая тема",
    toDark: "Тёмная тема",
    toggle: "Переключить тему",
  },

  language: {
    label: "Язык",
    change: "Сменить язык",
  },

  newsletter: {
    heading: "Подпишитесь на новости",
    emailPlaceholder: "Ваш email",
    submit: "Подписаться",
    success: "Вы подписались, спасибо!",
    error: "Произошла ошибка, попробуйте снова.",
  },

  footer: {
    description:
      "Трубы, фитинги, краны, душевые системы и отопительные котлы — ваш надёжный партнёр по поставке качественной сантехники.",
    contactTitle: "Связаться",
    phone: "Телефон",
    email: "Email",
    address: "Адрес",
    rights: "Все права защищены.",
  },

  home: {
    badge: "10 000+ сантехнических товаров",
    heroTitle: "Надёжное место для сантехники и отопления",
    heroSubtitle:
      "Трубы, фитинги, краны, душевые системы и отопительные котлы — всё в одном месте, с быстрой доставкой.",
    heroCta: "Смотреть каталог",
    categoriesTitle: "Категории",
    newProductsTitle: "Новинки",
  },

  catalog: {
    title: "Каталог",
  },

  filters: {
    title: "Фильтры",
    clear: "Сбросить",
    category: "Категория",
    material: "Материал",
    brand: "Бренд",
    country: "Страна-производитель",
    priceRange: "Диапазон цен",
    priceFrom: "От",
    priceTo: "До",
    sort: "Сортировка",
    sortNewest: "Сначала новые",
    sortPriceAsc: "Цена: по возрастанию",
    sortPriceDesc: "Цена: по убыванию",
  },

  product: {
    grid: {
      loadError: "Ошибка при загрузке товаров.",
      loadMoreError: "Ошибка при загрузке дополнительных товаров.",
      empty: "Товары не найдены.",
    },
    noImage: "Нет фото",
    outOfStockBadge: "Нет в наличии",
    outOfStockButton: "Нет в наличии",
    addToCart: "В корзину",
    addToCartAria: "Добавить {name} в корзину",
    notFound: "Товар не найден",
    diameter: "Диаметр",
    length: "Длина",
    weight: "Вес",
    stock: "В наличии",
    stockUnit: "шт.",
  },

  cart: {
    empty: "Ваша корзина пока пуста.",
    goToCatalog: "Перейти в каталог",
    decrease: "Уменьшить количество",
    increase: "Увеличить количество",
    remove: "Удалить из корзины",
    products: "Товары",
    total: "Итого",
    checkout: "Оформить заказ",
  },

  checkout: {
    title: "Оформление заказа",
    emptyCart: "Чтобы оформить заказ, сначала добавьте товары в корзину.",
    fullName: "Имя и фамилия",
    phone: "Номер телефона",
    detectLocation: "Определить местоположение (GPS)",
    locationDetected: "Местоположение определено ✓",
    geoUnsupported: "Ваш браузер не поддерживает определение местоположения.",
    geoFailed: "Не удалось определить местоположение. Проверьте разрешение.",
    deliveryAddress: "Адрес доставки",
    deliveryAddressPlaceholder: "Район, махалля, улица, дом — укажите, если сложно отправить локацию",
    paymentMethod: "Способ оплаты",
    paymentCash: "💵 Наличными — оплата при доставке",
    paymentOnline: "💳 Онлайн — картой (Humo/Uzcard/Visa)",
    onlineNote:
      "Онлайн-оплата станет доступна после подключения платёжной системы. Пока заказ принимается, и оператор свяжется с вами.",
    totalPayment: "Итого к оплате",
    submitError: "Ошибка при отправке заказа. Попробуйте снова.",
    confirm: "Подтвердить заказ",
  },

  contact: {
    title: "Связаться",
    subtitle: "Есть вопрос или хотите, чтобы мы перезвонили? Заполните форму.",
    name: "Имя и фамилия",
    phone: "Номер телефона",
    question: "Ваш вопрос",
    success: "Ваше сообщение отправлено. Скоро свяжемся!",
    error: "Произошла ошибка. Попробуйте снова.",
    submit: "Отправить",
  },

  login: {
    signIn: "Вход в аккаунт",
    register: "Регистрация",
    google: "Войти через Google",
    or: "или",
    email: "Email",
    password: "Пароль",
    submitLogin: "Войти",
    error: "Ошибка входа. Проверьте данные и попробуйте снова.",
    toRegister: "Нет аккаунта? Зарегистрируйтесь",
    toLogin: "Уже есть аккаунт? Войдите",
  },

  profile: {
    signInPrompt: "Войдите, чтобы просмотреть профиль.",
    defaultName: "Пользователь",
    edit: "Редактировать",
    signOut: "Выйти",
    ordersHistory: "История заказов",
    noOrders: "У вас пока нет заказов.",
    orderLabel: "Заказ",
    itemsSuffix: "товаров",
    payment: "Оплата",
    address: "Адрес",
    viewOnMap: "📍 Посмотреть на карте",
    status: {
      pending: "Ожидает",
      approved: "Принят",
      delivering: "Доставляется",
      completed: "Завершён",
      cancelled: "Отменён",
    },
    paymentCash: "💵 Наличные",
    paymentOnline: "💳 Онлайн",
  },

  profileSettings: {
    signInPrompt: "Войдите в систему.",
    title: "Настройки профиля",
    fullName: "Имя и фамилия",
    email: "Email",
    emailHelper: "Email изменить нельзя",
    phone: "Номер телефона",
    homeAddress: "Домашний адрес",
    homeAddressPlaceholder: "Район, махалля, улица, дом",
    saved: "Сохранено!",
    saveError: "Ошибка при сохранении. Попробуйте снова.",
  },

  about: {
    metaTitle: "О нас | Atoyo Santexnika",
    contactTitle: "Связаться",
    features: {
      qualityTitle: "Гарантия качества",
      qualityText: "Только качественные товары от надёжных производителей.",
      deliveryTitle: "Быстрая доставка",
      deliveryText: "Доставим ваш заказ быстро и надёжно.",
      supportTitle: "Профессиональная консультация",
      supportText: "Индивидуальный подход и помощь каждому клиенту.",
    },
  },

  blog: {
    metaTitle: "Блог | Atoyo Santexnika",
    title: "Блог и новости",
    empty: "Пока нет статей.",
    back: "← Назад в блог",
    notFound: "Статья не найдена",
    postMetaSuffix: "Atoyo Blog",
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

  materials: {
    polypropylene: "Полипропилен",
    "metal-plastic": "Металлопластик",
    steel: "Сталь",
    copper: "Медь",
    brass: "Латунь",
    "cast-iron": "Чугун",
    pvc: "ПВХ",
  },
};

export default ru;

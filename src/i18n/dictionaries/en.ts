import type { Dictionary } from "./uz";

const en: Dictionary = {
  meta: {
    title: "Atoyo Santexnika | Plumbing & Heating Store",
    description:
      "Pipes, fittings, faucets, shower systems and heating boilers — the highest quality plumbing products.",
  },

  common: {
    brand: "Atoyo Santexnika",
    loading: "Loading...",
    retry: "Retry",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    errorGeneric: "An error occurred, please try again.",
    currencyUzs: "UZS",
    all: "All",
  },

  nav: {
    home: "Home",
    catalog: "Catalog",
    blog: "Blog",
    about: "About us",
    contact: "Contact",
    cart: "Cart",
    profile: "Profile",
    login: "Log in",
    homeShort: "Home",
    aboutShort: "About",
  },

  search: {
    placeholder: "Search products (e.g. faucet, pipe...)",
    aria: "Search products",
    clear: "Clear search",
  },

  theme: {
    toLight: "Light mode",
    toDark: "Dark mode",
    toggle: "Toggle theme",
  },

  language: {
    label: "Language",
    change: "Change language",
  },

  newsletter: {
    heading: "Subscribe to news",
    emailPlaceholder: "Your email address",
    submit: "Subscribe",
    success: "You are subscribed, thank you!",
    error: "An error occurred, please try again.",
  },

  footer: {
    description:
      "Pipes, fittings, faucets, shower systems and heating boilers — your reliable partner supplying quality plumbing products.",
    contactTitle: "Contact",
    phone: "Phone",
    email: "Email",
    address: "Address",
    rights: "All rights reserved.",
  },

  home: {
    badge: "10,000+ plumbing products",
    heroTitle: "A reliable place for plumbing and heating",
    heroSubtitle:
      "Pipes, fittings, faucets, shower systems and heating boilers — all in one place, with fast delivery.",
    heroCta: "View catalog",
    categoriesTitle: "Categories",
    newProductsTitle: "New products",
  },

  catalog: {
    title: "Catalog",
  },

  filters: {
    title: "Filters",
    clear: "Clear",
    category: "Category",
    material: "Material",
    brand: "Brand",
    country: "Country of origin",
    priceRange: "Price range",
    priceFrom: "From",
    priceTo: "To",
    sort: "Sort",
    sortNewest: "Newest",
    sortPriceAsc: "Price: low to high",
    sortPriceDesc: "Price: high to low",
  },

  product: {
    grid: {
      loadError: "Failed to load products.",
      loadMoreError: "Failed to load more products.",
      empty: "No products found.",
    },
    noImage: "No image",
    outOfStockBadge: "Out of stock",
    outOfStockButton: "Out of stock",
    addToCart: "Add to cart",
    addToCartAria: "Add {name} to cart",
    notFound: "Product not found",
    diameter: "Diameter",
    length: "Length",
    weight: "Weight",
    stock: "In stock",
    stockUnit: "pcs",
  },

  cart: {
    empty: "Your cart is empty for now.",
    goToCatalog: "Go to catalog",
    decrease: "Decrease quantity",
    increase: "Increase quantity",
    remove: "Remove from cart",
    products: "Products",
    total: "Total",
    checkout: "Checkout",
  },

  checkout: {
    title: "Checkout",
    emptyCart: "To place an order, add products to your cart first.",
    fullName: "Full name",
    phone: "Phone number",
    detectLocation: "Detect location (GPS)",
    locationDetected: "Location detected ✓",
    geoUnsupported: "Your browser does not support location detection.",
    geoFailed: "Could not detect location. Check that permission is granted.",
    deliveryAddress: "Delivery address",
    deliveryAddressPlaceholder: "District, neighborhood, street, house — write it if sending a location is hard",
    paymentMethod: "Payment method",
    paymentCash: "💵 Cash — pay on delivery",
    paymentOnline: "💳 Online — by card (Humo/Uzcard/Visa)",
    onlineNote:
      "Online payment will be enabled once the payment system is connected. For now the order is accepted and an operator will contact you.",
    totalPayment: "Total to pay",
    submitError: "An error occurred while sending the order. Please try again.",
    confirm: "Confirm order",
  },

  contact: {
    title: "Contact",
    subtitle: "Have a question or want us to call you back? Fill out the form.",
    name: "Full name",
    phone: "Phone number",
    question: "Your question",
    success: "Your message has been sent. We'll be in touch soon!",
    error: "An error occurred. Please try again.",
    submit: "Send",
  },

  login: {
    signIn: "Sign in",
    register: "Sign up",
    google: "Sign in with Google",
    or: "or",
    email: "Email",
    password: "Password",
    submitLogin: "Log in",
    error: "Sign-in failed. Check your details and try again.",
    toRegister: "No account? Sign up",
    toLogin: "Already have an account? Log in",
  },

  profile: {
    signInPrompt: "Sign in to view your profile.",
    defaultName: "User",
    edit: "Edit",
    signOut: "Sign out",
    ordersHistory: "Order history",
    noOrders: "You don't have any orders yet.",
    orderLabel: "Order",
    itemsSuffix: "items",
    payment: "Payment",
    address: "Address",
    viewOnMap: "📍 View on map",
    status: {
      pending: "Pending",
      approved: "Approved",
      delivering: "Delivering",
      completed: "Completed",
      cancelled: "Cancelled",
    },
    paymentCash: "💵 Cash",
    paymentOnline: "💳 Online",
  },

  profileSettings: {
    signInPrompt: "Please sign in.",
    title: "Profile settings",
    fullName: "Full name",
    email: "Email",
    emailHelper: "Email cannot be changed",
    phone: "Phone number",
    homeAddress: "Home address",
    homeAddressPlaceholder: "District, neighborhood, street, house",
    saved: "Saved!",
    saveError: "Failed to save. Please try again.",
  },

  about: {
    metaTitle: "About us | Atoyo Santexnika",
    contactTitle: "Contact",
    features: {
      qualityTitle: "Quality guarantee",
      qualityText: "Only quality products from trusted manufacturers.",
      deliveryTitle: "Fast delivery",
      deliveryText: "We deliver your order quickly and reliably.",
      supportTitle: "Professional advice",
      supportText: "An individual approach and help for every customer.",
    },
  },

  blog: {
    metaTitle: "Blog | Atoyo Santexnika",
    title: "Blog and news",
    empty: "No articles yet.",
    back: "← Back to blog",
    notFound: "Article not found",
    postMetaSuffix: "Atoyo Blog",
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

  materials: {
    polypropylene: "Polypropylene",
    "metal-plastic": "Metal-plastic",
    steel: "Steel",
    copper: "Copper",
    brass: "Brass",
    "cast-iron": "Cast iron",
    pvc: "PVC",
  },
};

export default en;

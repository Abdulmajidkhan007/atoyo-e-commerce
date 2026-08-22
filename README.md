# Atoyo Santexnika — E-Commerce Platformasi

"Santexnika & Otopleniye" onlayn do'koni: 10,000+ mahsulot, Telegram bot integratsiyasi va rolga asoslangan admin panel.

**Jonli sayt:** https://atoyo-uz.web.app

## Texnologiyalar

| Qatlam | Texnologiya |
|---|---|
| Framework | Next.js 16.2.x (App Router, Turbopack) |
| UI | Tailwind CSS + Material UI (MUI), Dark/Light mode, klassik/3D dizayn rejimi |
| 3D va animatsiya | three.js + @react-three/fiber/drei, GSAP ScrollTrigger, framer-motion (faqat 3D rejimda, dinamik yuklanadi) |
| State | Redux Toolkit (+ redux-persist: savat/tema) |
| Backend | Firebase (Auth, Cloud Firestore, Storage) |
| Integratsiya | Telegram Bot API (forum topic'lar, inline tugmalar, webhook) |
| Hosting | Firebase App Hosting (`apphosting.yaml`) + Firebase Hosting (qisqa domen) |

## Asosiy imkoniyatlar

- **Katalog** — cursor-based pagination (`startAfter` + `limit`), Infinite Scroll, kompozit indeksli filtrlar (kategoriya/material/brend/davlat/narx), typo-tolerant qidiruv (Firestore prefiks + Fuse.js)
- **Buyurtma** — savat (localStorage'da saqlanadi), geolokatsiya bilan checkout, buyurtma statusini real-vaqtda kuzatish (`onSnapshot`)
- **Telegram bot** — har bir buyurtma/kontakt/obuna guruhning tegishli forum topic'iga boradi; buyurtma xabari ostidagi [✅ Qabul qilish] [🚚 Yetkazishda] [🎉 Yakunlandi] tugmalari webhook orqali Firestore statusini yangilaydi
- **Auth** — Sign in with Google + Email/Parol; birinchi kirishda Firestore `users`ga `{role:'user'}` yoziladi
- **Admin panel** (`/admin`) — dashboard (tushum/eng ko'p sotilganlar), katalog boshqaruvi (inline narx/zaxira, bulk narx, rasm yuklash), buyurtmalar nazorati, foydalanuvchi rollari, bot Thread ID sozlamalari
- **Xavfsizlik** — ikki qatlamli himoya: `src/proxy.ts` (edge-safe, faqat session cookie borligini tekshiradi) va `admin/layout.tsx`da haqiqiy `role: admin` tekshiruvi (Node); mahsulot narxi mijozga faqat `lib/products/viewer.ts` orqali chiqadi (optom narx va tannarx olib tashlanadi), `products` kolleksiyasi Firestore qoidalarida clientga yopiq
- **Dizayn rejimi** — header'dagi tugma bilan "✨ 3D" va "📄 Klassik" ko'rinish o'rtasida almashish (tanlov saqlanadi). 3D rejimda bosh sahifada interaktiv three.js sahnasi, GSAP scroll animatsiyalari va glassmorphism kartochkalar; zaif qurilma/sekin tarmoq/"reduce motion" da avtomatik yengil variant — `docs/UI-3D.md`
- **Boshqa kanallar** — mijoz-bot (katalog/savat/checkout Telegramda), do'kon televizori uchun `/tv` sahifasi, Android ilova (`mobile/`, React Native), Windows/Linux ilova (`desktop/`, Electron — saytning o'zini ochadi), AI yordamchisi (`src/lib/ai/`, rasmdan qidiruv ham)

## Ishga tushirish

```bash
npm install
cp .env.local.example .env.local   # kalitlarni to'ldiring
npm run dev
```

### Muhit o'zgaruvchilari

`.env.local.example` faylida to'liq ro'yxat va izohlar bor. Qisqacha:

- `NEXT_PUBLIC_FIREBASE_*` — Firebase Console → Project Settings → General
- `FIREBASE_ADMIN_*` — Service Accounts → Generate new private key (server-only, maxfiy)
- `TELEGRAM_*` — @BotFather token, guruh chat ID, topic Thread ID'lar, webhook secret

### Firebase'ni joylashtirish

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage
```

### Foydali skriptlar

```bash
node scripts/seed-products.js     # namunaviy mahsulotlar bilan to'ldirish
node scripts/make-admin.js EMAIL  # foydalanuvchini admin qilish
```

### Telegram webhook'ni ro'yxatdan o'tkazish (bir marta)

Brauzerda oching (qiymatlarni o'zingiznikiga almashtiring):

```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://atoyo-uz.web.app/api/telegram-webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>&allowed_updates=["callback_query"]
```

## Loyiha strukturasi

```
src/
├── app/(main)/        # Do'kon sahifalari (katalog, mahsulot, savat, buyurtma, profil...)
├── app/admin/         # Admin panel (rol bilan himoyalangan)
├── app/api/           # Route handlers (orders, contact, subscribe, telegram-webhook...)
├── components/        # UI komponentlar (layout, product, cart, auth, admin)
├── lib/firebase/      # Client/Admin SDK, session, firestore
├── lib/products/      # Narx (viewer/wholesale), turlar, taxonomy, facets, CSV
├── lib/telegram/      # Bot API, topic routing, xabar shablonlari, inline tugmalar
├── redux/             # Store + slice'lar (cart, user, filters, ui)
└── proxy.ts           # /admin himoyasi (Next.js 16 proxy konvensiyasi)

mobile/                # React Native ilova (mijozlar uchun)
desktop/               # Electron ilova (saytni ochadi)
docs/                  # Deploy, kirim/import, TV, desktop, stikerlar, zaxira...
```

## Hujjatlar

| Fayl | Nima haqida |
|---|---|
| `CLAUDE.md` | Buzilmas qoidalar (narx maxfiyligi, CSP, kanal, Storage) va xarita |
| `docs/ARXITEKTURA-TARIXI.md` | Qoidalarning sababi: qaysi nosozlikdan keyin paydo bo'lgani |
| `docs/REBUILD-PROMPT.md` | Loyihaning to'liq holati (boshqa AI ga topshiriq) |
| `docs/SESSION-PROMPT.md` | Yangi ish sessiyasi uchun tayyor prompt |
| `docs/PROMPTLAR.md` | Rejalashtiruvchi sessiya, kundalik ish va boshqa loyihani tahlil promptlari |
| `docs/PROMPTLAR-UMUMIY.md` | Umumiy promptlar kutubxonasi (istalgan loyihaga mos) |
| `docs/PROMPTLAR-ATOYO.md` | Shu loyihaga xos promptlar va loyiha auditi topshirig'i |
| `docs/AUDIT.md` / `docs/AUDIT-ISHLARI.md` | Audit natijasi va undan chiqqan ishlar navbati |
| `docs/DEPLOY.md` | Hosting, env va secret sozlash tartibi |
| `docs/KIRIM-VA-IMPORT.md` | Kirim, Excel/CSV import, 1C narxnomasi |
| `docs/TV.md` / `docs/DESKTOP.md` / `docs/STICKERS.md` | Do'kon ekrani, Electron, stikerlar |
| `docs/UI-3D.md` | Klassik/3D dizayn rejimi, 3D sahna va tezlik qoidalari |
| `docs/BACKUP.md` / `docs/PLAY-STORE.md` / `docs/TYPESENSE.md` | Zaxira, ilova relizi, qidiruv motori |

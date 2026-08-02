# Loyihani noldan qayta qurish uchun to'liq topshiriq (prompt)

Bu fayl — Atoyo loyihasining HOZIRGI holatining to'liq tavsifi. Uni
boshqa AI yordamchisiga (GPT, Gemini, boshqa Claude sessiyasi) berib,
xuddi shu tizimni noldan qurishni so'rash mumkin. Matnni to'liq nusxa
ko'chirib bering.

---

## TOPSHIRIQ

Menga to'liq ishlaydigan e-commerce tizimi kerak: **sayt + Android
ilova + ikki tomonlama Telegram integratsiyasi**. Do'kon — O'zbekistonda
santexnika va isitish tizimlari sotadi ("Atoyo Santexnika &
Otopleniye"), katalogda 10 000+ mahsulot bo'lishi kutilyapti. Interfeys
tili — **o'zbekcha** (qo'shimcha ravishda ru/en). Pul birligi — so'm.

Kodni bosqichma-bosqich yoz, har bosqichda ishlaydigan holatni ber,
tushuntirishlar o'zbekcha bo'lsin, kod izohlari ham o'zbekcha.

### Texnologiyalar (majburiy)

- **Sayt:** Next.js 16 (App Router, TypeScript, Turbopack), Tailwind CSS
  + MUI, Redux Toolkit (savat, sevimlilar, filtrlar, til/tema —
  redux-persist bilan).
- **Baza va auth:** Firebase — Firestore, Authentication (email/parol,
  Google, Telegram orqali custom token), Storage (rasm), Cloud Messaging
  (push). Serverda **Firebase Admin SDK**, Google Cloud ichida
  Application Default Credentials bilan (maxfiy kalit fayl kerak emas).
- **Mobil ilova:** React Native CLI (bare, RN 0.76), TypeScript,
  React Navigation (tab + stack), Redux Toolkit, react-native-firebase
  (app/auth/firestore/messaging), react-native-svg.
- **Telegram:** oddiy `fetch` bilan Bot API wrapper (kutubxonasiz),
  webhook `POST /api/telegram-webhook`.
- **Hosting:** Firebase App Hosting (Cloud Run), qisqa domen Firebase
  Hosting rewrite orqali. Har push'da avtomatik deploy.
- **CI:** GitHub Actions — typecheck, lint, unit testlar (vitest),
  build, Android APK yig'ish va `latest` release'ga yuklash, Firestore
  qoidalarini deploy qilish.

---

## 1. SAYT (mijoz qismi)

- **Bosh sahifa:** hero banner, kategoriya kafellari (ro'yxat bazadan),
  yangi mahsulotlar.
- **Katalog:** cheksiz skroll (kursorli sahifalash, bir sahifada 24 ta),
  filtr modali — kategoriya, material, brend, ishlab chiqaruvchi davlat,
  narx oralig'i, saralash (yangi / arzon / qimmat).
- **Qidiruv:** Firestore'da ikki so'rov parallel — nom boshidan
  (`nameSearchIndex`) va so'z bo'yicha (`nameTokens`,
  `array-contains-any`), so'ng mijoz tomonda Fuse.js bilan typo'ga
  chidamli saralash. Tokenlar nom + brend + artikuldan yasaladi va
  **ikki ko'rinishda** saqlanadi: asl va "tekislangan" (kirill→lotin,
  apostrofsiz) — "Душ", "dush", "duş" bir xil topiladi.
- **Mahsulot sahifasi:** rasm galereyasi (to'liq ekran, yaqinlashtirish),
  turlar tanlagichi, narx/zaxira tanlangan turga qarab, savatga qo'shish,
  sharh va reyting, o'xshash mahsulotlar, ulashish tugmasi, schema.org
  JSON-LD (narx, mavjudlik, reyting) va OG rasm (`next/og` bilan
  dinamik).
- **Savat va buyurtma:** promokod, yetkazib berish narxi (chegaradan
  yuqori bepul), to'lov turi (naqd / onlayn), manzil va joylashuv,
  buyurtma chek sahifasi (chop etish).
- **Profil:** buyurtmalar tarixi real-vaqtda (onSnapshot), sevimlilar,
  sozlamalar, hisobni o'chirish.
- **Blog:** maqolalar ro'yxati va sahifasi (Article JSON-LD).
- **Boshqa:** "Biz haqimizda", kontakt formasi (xodimlar guruhiga
  tushadi), yangiliklarga obuna, sitemap va robots, uch til (uz/ru/en),
  yorug'/qorong'i tema, mobil pastki menyu.

## 2. ADMIN PANEL (saytda)

Faqat xodimlarga. Kirish — session cookie; **rol tekshiruvi Node
qatlamida** (`/admin` layout), edge middleware faqat cookie borligini
tekshiradi.

- **Mahsulotlar:** ro'yxat, qidiruv, qo'shish/tahrirlash (nom, tavsif,
  artikul, kategoriya, material, sotish turi, brend, davlat,
  yetkazuvchi, narx, chegirma va muddati, zaxira, o'lchamlar, 10 tagacha
  rasm), chernovik rejimi, ko'p rasm yuklash, ommaviy narx o'zgartirish,
  CSV import/eksport (10 000 ta nomni bir yo'la yaratish uchun),
  indeks/raqamlarni yangilash.
- **Turlar (variantlar):** bitta mahsulotda o'lcham/rang/qalinlik
  qatorlari; qatorlarning dekart ko'paytmasi bo'yicha har bir turga
  alohida narx va zaxira; mahsulot narxi — eng arzon tur, zaxirasi —
  yig'indi. "Hammasiga birdek" tugmasi.
- **Buyurtmalar:** holat o'zgartirish (yangi → qabul → yetkazishda →
  yakunlandi / bekor), bekor qilinganda zaxira qaytadi.
- **Statistika, blog CRUD, promokodlar, foydalanuvchilar va rollar**
  (huquqlar: mahsulot, blog, buyurtma, promokod, tahlil, xabar
  yuborish, sozlamalar, foydalanuvchilar, rollar).
- **Sozlamalar:** sayt ma'lumotlari (kontakt, ijtimoiy tarmoq), kanal
  posti footeri, bot topic ID lari, majburiy obuna kanallari, maxfiy
  kalitlar (Firestore'da, env'dan ustun), **tizim tekshiruvi** (Firestore,
  custom token, FCM, bot tokeni + sinov bildirishnomasi).
- **Muhim qoida:** admin yozuvlari **faqat server API route'lari
  orqali** (Admin SDK bilan) — client Firestore yozuvlari cookie
  rejimida ishlamaydi.

## 3. TELEGRAM (ikki tomonlama)

### Mijoz boti (shaxsiy chat)

Ro'yxatdan o'tish (telefon raqami) + majburiy kanalga obuna tekshiruvi,
so'ng butun do'kon tugmalar orqali: katalog va kategoriyalar, filtr,
qidiruv, mahsulot kartochkasi (rasm + narx), savat, promokod, checkout
(ism, manzil, to'lov), buyurtmalarim va bekor qilish, sevimlilar,
sharh qoldirish, blog, do'kon haqida ma'lumot, profil (ism/manzil
tahrirlash, hisobni o'chirish), til almashtirish. `/start` da
salomlashuv rasmi.

### Xodimlar guruhi (yopiq, forum-topiclar bilan)

- Yangi buyurtma "Buyurtmalar" topic'iga tushadi, xabar ostida holat
  tugmalari — bosilganda saytdagi bilan bir xil funksiya ishlaydi.
- Buyruqlar: `/yangi` (interaktiv, tugmalar bilan mahsulot yaratish),
  `/tahrir`, `/narx`, `/zaxira`, `/top`, `/uchir`, `/tikla`,
  `/buyurtmalar`, `/stat`, `/elon` (mijozlarga xabar), `/help`.
- **"Kirim" topic'i:** xodim rasm(lar) + izoh tashlaydi
  ("nom / narx / soni / kimdan / material") — bot mahsulotni yaratadi,
  albom (media_group) holatini vaqtincha saqlaydi, keyin ixtiyoriy
  maydonlarni tugmalar bilan so'raydi.

### E'lon kanali

Mahsulot yaratilganda/narxi o'zgarganda kanalga post: rasm albomi,
nom, kod, brend, narx (turlari bo'lsa har bir o'lcham o'z narxi bilan
ro'yxat), zaxira, material, tavsif va sozlanadigan footer (telefonlar →
shior → manzil → havolalar). Keyingi tahrirlarda **eski post joyida
yangilanadi**, yangi post tashlanmaydi.

## 4. MOBIL ILOVA (Android; iOS keyin)

Sayt bilan bir xil Firebase loyihasi va bir xil API. Katalogni
to'g'ridan-to'g'ri Firestore'dan o'qiydi, buyurtma/sharhni saytning
API'si orqali yuboradi (`Authorization: Bearer <Firebase ID token>`).

- Mijoz uchun: bosh sahifa, katalog + filtr, mahsulot (galereya, turlar,
  o'xshash mahsulotlar, ulashish), savat, checkout, buyurtmalar,
  sevimlilar, blog, kontakt, profil, sozlamalar.
- **Admin uchun ham:** buyurtmalar (real-vaqtda, holat tugmalari),
  mahsulot qidirish/kirim/tez tahrir, statistika, blog, promokod,
  mijozlar.
- Dizayn saytdagidek (Deep Navy + oltin urg'u), ikonkalar Material
  (SVG), uch til, yorug'/qorong'i tema.
- **Push bildirishnomalar:** buyurtma holati — shaxsan mijozga (qurilma
  tokeni `users/{uid}.pushTokens` da), yangi mahsulot/chegirma — hammaga
  `products` mavzusi orqali. Ilova ochiq turganda toast bo'lib chiqadi,
  bosilganda kerakli ekran ochiladi.
- Yangi versiya chiqqanda ilovada yangilanish banneri (GitHub
  release'dagi `latest` teg bilan solishtiradi).
- APK GitHub Actions'da yig'iladi va `latest` release'ga yuklanadi;
  saytdagi footerdagi tugma o'sha faylga qaraydi.

## 5. MA'LUMOTLAR MODELI (Firestore)

- `products` — nom, `nameSearchIndex`, `nameTokens[]`, tavsif, artikul,
  `code` (odam uchun tartib raqami), kategoriya/material/sotish turi
  (slug), brend, davlat, yetkazuvchi, narx, chegirma va muddati, zaxira,
  o'lchamlar, rasm(lar), `variantAxes[]` va `variants[]`, `isActive`,
  `isDraft`, `salesCount`, reyting, kanal posti ma'lumotlari, sanalar.
- `orders` — mijoz, telefon, manzil, joylashuv, `items[]` (mahsulot,
  tur, narx, soni), summa, promokod, yetkazish narxi, to'lov turi va
  holati, status, Telegram xabar ID si, sanalar.
- `users` — rol va huquqlar, telefon, manzil, Telegram ID, `pushTokens[]`.
- `botUsers` — Telegram foydalanuvchilari (telefon, holat, savat, til).
- `metadata/taxonomy` — admin qo'shgan kategoriya/material/sotish turi
  (standartlari kodda, birlashtiriladi); `metadata/facets` — brend va
  davlat ro'yxati.
- `settings/*` — sayt, yetkazish, telegram topic; `secrets/telegram` —
  bot tokeni va h.k. (env'dan ustun).
- `promoCodes`, `blogPosts`, `reviews`, `stats/summary`, `tgLogins`,
  `intakeAlbums`, `subscribers`.
- Firestore qoidalari: mahsulot/blog — hammaga o'qish, yozish faqat
  serverdan; buyurtma — faqat egasi va admin; kompozit indekslar
  (`isActive` + `category`/`brand`/`price`/`nameTokens`...).

## 6. TALABLAR VA CHEKLOVLAR

1. **Barcha yozuv amallari serverda** tekshirilsin: narx, zaxira,
   promokod hech qachon mijoz yuborgan qiymatga ishonib olinmasin.
2. Buyurtma yaratish — Firestore tranzaksiyasi: zaxira kamayadi,
   `salesCount` va statistika oshadi; bekor qilinganda faqat bir marta
   qaytariladi (`stockReturned` bayrog'i).
3. Ochiq API'larda **rate limit** (obuna, promokod, kontakt, Telegram
   kirish).
4. Edge (middleware) qatlamida `firebase-admin` ishlatilmasin.
5. Dinamik kontentli sahifalar `export const dynamic = "force-dynamic"`.
6. Rasm yuklash serverda: Admin SDK Storage + download token metadata.
7. Kod izohlari o'zbekcha, "nima uchun" tushuntirilsin.
8. Tekshiruv: `tsc --noEmit`, `eslint`, `vitest`, `next build`; ilova
   uchun alohida typecheck/lint va RN codegen tekshiruvi.

## 7. HOZIRCHA QILINMAGANI (siz ham keyin qilasiz)

- Payme/Click to'lovi: kod yozilgan, merchant kalitlari kutilyapti.
- iOS build (Mac + Xcode kerak).
- To'liq offline rejim, Algolia/Typesense darajasidagi qidiruv.

---

## Kutilayotgan natija

Repozitoriya: sayt (`src/`), ilova (`mobile/`), CI (`.github/workflows`),
Firestore qoidalari va indekslari, hosting konfiguratsiyasi, README va
deploy hujjati. Har bir bosqichdan keyin: nima qilinganini qisqacha
o'zbekcha tushuntirish + qanday tekshirishni ko'rsatish.

Hozirgi ishlab turgan tizim hajmi (mo'ljal uchun): sayt ~24 000 qator
TypeScript/TSX (213 fayl, 48 ta API route), ilova ~6 500 qator
(39 fayl), qo'shimcha Telegram mantiqi ~2 500 qator.

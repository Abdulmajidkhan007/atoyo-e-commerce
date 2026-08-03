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

## 1a. HISOBOT, OMBOR VA QAYTARISH

- **Tannarx (`costPrice`)** — mahsulotda va har bir turda; kirimda
  oxirgi partiya narxi bilan yangilanadi. Buyurtma qatoriga sotilgan
  paytdagi tannarx NUSXASI tushadi (keyin narx o'zgarsa hisobot
  buzilmasin).
- **Hisobot** (`/admin/hisobot`): davr tanlanadi (bugun / 7 / 30 / 90
  kun yoki sana oralig'i) → tushum, foyda (sotuv − tannarx),
  buyurtmalar soni, o'rtacha chek, kunlik ustunlar, eng ko'p daromad
  keltirgan 20 mahsulot. Bekor qilinganlar hisobga olinmaydi,
  qaytarilgan summa tushumdan chiqariladi; tannarxi yozilgan qatorlar
  ulushi ham ko'rsatiladi.
- **Ombor** (`/admin/ombor`): `stockMoves` jurnali — kirim, sotuv,
  qaytish, chiqim, sanoq. Har yozuvda oldingi/keyingi qoldiq, izoh,
  kim qilgani. Qo'lda: chiqim (singan/yo'qolgan) va inventarizatsiya
  (haqiqiy qoldiqqa tenglashtirish).
- **Qaytarish** (`POST /api/admin/orders/<id>/return`): yetkazilgan
  buyurtmadan mahsulot qaytganda zaxira qaytadi, sotuv soni va tushum
  kamayadi, ombor jurnaliga yoziladi, mijozga push va SMS boradi.
  Qisman qaytarish ham mumkin; buyurtmadagidan ko'pini qaytarib
  bo'lmaydi.

## 1b. XABAR KANALLARI

Bir hodisa — bir nechta kanal, hammasi best-effort (biri ishlamasa
qolganlari ishlaydi va asosiy amal to'xtamaydi):

| Hodisa | Telegram | Push | Email | SMS |
|---|---|---|---|---|
| Buyurtma holati o'zgardi | ✅ DM | ✅ | ✅ | ✅ |
| Qaytarish qabul qilindi | — | ✅ | — | ✅ |
| Yangi mahsulot / chegirma | ✅ kanal | ✅ topic | — | — |
| E'lon (admin > Xabar) | ✅ | — | ✅ | — |

- **Push** — FCM; qurilma tokeni `users/{uid}.pushTokens` da, umumiy
  e'lonlar `products` mavzusi orqali.
- **SMS** — Eskiz.uz yoki Play Mobile (env orqali tanlanadi).
- **Email** — SMTP (nodemailer).
- Har biri sozlanmagan bo'lsa jimgina o'tkazib yuboriladi; admin
  panelda **Tizim tekshiruvi** har bir kanalning holatini ko'rsatadi.

## 1c. AI YORDAMCHI (sayt, ilova, Telegram bot)

Uchala kanalda bitta "miya" — `/api/assistant` (Anthropic Claude,
`ANTHROPIC_API_KEY`). Kalit yo'q bo'lsa tugma umuman ko'rinmaydi.

- **Faqat do'kon mavzusi.** Ikki qatlamli himoya: (1) server tomonda
  naqsh tekshiruvi — "avvalgi ko'rsatmalarni unut", "sen endi ...",
  "kod yoz", ob-havo/siyosat kabi so'rovlar modelga UMUMAN bormaydi;
  (2) qat'iy system prompt — mijoz matni va mahsulot ma'lumoti
  KO'RSATMA emas, MA'LUMOT deb qaraladi; javob ham oxirida
  tekshiriladi (ko'rsatma sizib chiqsa rad javobi beriladi).
- **Narx/zaxira o'ylab topilmaydi**: savolga mos mahsulotlar avval
  Firestore'dan olinadi (`nameTokens` + `keywords`), do'kon
  ma'lumotlari (telefon, manzil, yetkazish narxi, kategoriyalar)
  5 daqiqa keshlanadi va kontekstga qo'yiladi.
- Chegaralar: savol 600 belgi, tarix 8 xabar, javob 700 token,
  har IP uchun soatiga 30 savol (`rateLimits` kolleksiyasi).
- **Vositalar (tool use)** — model javob yozishdan oldin katalogni
  HAQIQATAN qidiradi: `search_products` (so'z, narx oralig'i,
  kategoriya, material, "faqat zaxirada bori", saralash),
  `add_to_cart` (mijoz aniq so'rasa), `start_checkout`. Filtrni model
  emas, BAZA bajaradi; zanjir 4 aylanish bilan cheklangan.
- Savat amallari serverda bajarilmaydi: javob bilan `actions` qaytadi,
  uni kanal o'z savatiga qo'llaydi (sayt/ilova — Redux, bot — sessiya).
  Shu sabab yordamchi mijoz nomidan buyurtmani YAKUNLAY olmaydi —
  faqat savatni to'ldirib rasmiylashtirishga olib chiqadi.
- Sayt — suzuvchi oyna; ilova — "Yordamchi" ekrani (Profil orqali);
  bot — 🤖 tugmasi va `/yordamchi` buyrug'i (`/start` bilan chiqiladi).
- Javob bilan birga 3 tagacha mahsulot kartochkasi ko'rsatiladi.

## 1d. AI RASM (admin panel)

Mahsulot tahrirlash formasida ikki tugma (kalitlar bo'lsa ko'rinadi):

- **Rasmni tahlil qilish** (Claude vision) — rasmga qarab nom, tavsif,
  kalit so'z va brend taklif qiladi; taklif formaga tushadi, admin
  tekshirib saqlaydi (avtomatik saqlanmaydi).
- **Rasm generatsiya qilish** (Gemini "Nano Banana",
  `GEMINI_API_KEY`) — bitta rasmdan 5 tagacha savdo rasmi: oq fon,
  interyer, yaqin plan, boshqa rakurs, qadoq bilan. Prompt har doim
  "mahsulotning shakli/rangi/yozuvi o'zgarmasin" cheklovi bilan
  ketadi — mijoz suratdagi narsani oladi. Rasmlar Storage'ga yozilib
  mahsulot galereyasiga qo'shiladi.

## 1e. LOYIHA TO'LOVLARI VA MIJOZ KARTALARI

**Admin > To'lovlar** (`/admin/tolovlar`) — loyihani ushlab turish
xarajatlari: Firebase, AI kalitlari, domen, SMS, Play Store.

- Har bir xarajat: nomi, kimga to'lanadi, summa (USD yoki so'm),
  davriylik (bir martalik/oylik/choraklik/yillik), keyingi to'lov
  sanasi, to'lov sahifasi havolasi.
- Ko'rsatkichlar: oylik o'rtacha, yillik, 30 kun ichida to'lanadigan,
  shu oyda to'langan. USD kursi admin tomonidan kiritiladi
  (`settings/finance`).
- «To'landi» bosilganda tarixga yozuv tushadi va keyingi sana
  davriylikka qarab siljiydi.
- Muddati o'tgan yoki 7 kun ichida keladigan to'lovlar xodimlar
  guruhiga (actions topic) eslatma bo'lib tushadi — kuniga bir marta.
- MUHIM: Google/Anthropic hisobini API orqali to'lab bo'lmaydi (bunday
  API yo'q) — sahifa muddat va tarixni yuritadi, to'lovning o'zi
  xizmat sahifasida bajariladi.

**Mijoz kartalari** (Payme Subscribe API, `PAYME_SUBSCRIBE_KEY`):
`cards.create` → `cards.get_verify_code` → `cards.verify`, keyin
`receipts.create` + `receipts.pay`. Karta RAQAMI saqlanmaydi —
Firestore'da faqat token va niqoblangan raqam (`users/{uid}/cards`,
qoidalarda mijozga ham yopiq). Kalitlar yo'q bo'lsa profildagi
"Kartalarim" bo'limi umuman ko'rinmaydi.

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
  kalitlar (Firestore'da, env'dan ustun), **tizim tekshiruvi**
  (Firestore, custom token, FCM, bot tokeni, SMTP, SMS + sinov
  bildirishnomasi).
- **Yetkazib berish:** standart narx va "shu summadan bepul", hamda
  **hududlar** ro'yxati (tuman → o'z narxi). Mijoz checkout'da hududni
  tanlaydi, narx shunga qarab hisoblanadi.
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
- `stockMoves` — ombor harakatlari (kirim/sotuv/qaytish/chiqim/sanoq).
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

## 6a. IXTIYORIY TASHQI XIZMATLAR

Hammasi env orqali yoqiladi; sozlanmasa tizim avvalgidek ishlayveradi:

- **Typesense** — 10 000+ mahsulot uchun tezkor, typo'ga chidamli
  qidiruv. Mahsulot yozilganda indeks o'zi yangilanadi; `/api/search`
  motor bo'lsa undan, bo'lmasa Firestore'dan qidiradi.
- **SMS** (Eskiz/Play Mobile), **SMTP** (email), **GA4** (analitika),
  **Payme/Click** (to'lov).
- **Anthropic Claude** (`ANTHROPIC_API_KEY`) — AI yordamchi va rasm
  tahlili; **Gemini image** (`GEMINI_API_KEY`) — mahsulot rasmlari
  generatsiyasi.
- **Kirish yo'llari** — `NEXT_PUBLIC_AUTH_PROVIDERS` ro'yxati:
  `google,telegram,apple,microsoft,facebook,phone`. Firebase
  konsolida yoqilmagan provayder ro'yxatga qo'shilmaydi (tugma
  ko'rinmaydi). WhatsApp/WeChat Firebase Auth'da yo'q — o'rniga
  telefon (SMS kod) yoki Telegram.

## 6b. CI VA ZAXIRA NUSXA

- Har push'da: typecheck, lint, unit testlar (vitest), sayt build,
  ilova typecheck/lint/codegen, Android APK yig'ilib `latest`
  release'ga yuklanadi.
- Asosiy branchga push'da Firestore qoidalari va indekslari deploy
  qilinadi (service account secret'i bo'lsa).
- Har kuni Firestore Cloud Storage'ga eksport qilinadi, 30 kundan
  eski nusxalar tozalanadi.

## 7. HOZIRCHA QILINMAGANI (siz ham keyin qilasiz)

- Payme/Click to'lovi va karta saqlash: kod yozilgan, merchant
  kalitlari kutilyapti (kalit kelgach test kabinetida sinaladi).
- iOS build (Mac + Xcode kerak).
- Play Store uchun o'z keystore va AAB.
- To'liq offline rejim.

---

## Kutilayotgan natija

Repozitoriya: sayt (`src/`), ilova (`mobile/`), CI (`.github/workflows`),
Firestore qoidalari va indekslari, hosting konfiguratsiyasi, README va
deploy hujjati. Har bir bosqichdan keyin: nima qilinganini qisqacha
o'zbekcha tushuntirish + qanday tekshirishni ko'rsatish.

Hozirgi ishlab turgan tizim hajmi (mo'ljal uchun): sayt ~24 000 qator
TypeScript/TSX (213 fayl, 48 ta API route), ilova ~6 500 qator
(39 fayl), qo'shimcha Telegram mantiqi ~2 500 qator.

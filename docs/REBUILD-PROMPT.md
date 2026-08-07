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

- **Bosh sahifa:** hero banner, kategoriya kafellari (ro'yxat bazadan,
  11 tasi + "yana N ta" havolasi) va **6 ta namuna mahsulot — har
  kategoriyadan bittadan** (`/api/products/showcase`: zaxirasi bori
  ustun, keyin eng yangisi; 5 daqiqa keshlanadi), pastida "Katalogni
  ko'rish" tugmasi. Katalog 3 000+ mahsulotga yetganda bosh sahifada
  uzun ro'yxat ko'rsatilmaydi.
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
- **Yordamchi oynasi:** suzuvchi oyna burchagidan sudrab kattalashtiriladi
  va "to'liq ekran" tugmasi bilan butun ekranga yoyiladi (sarlavhaga ikki
  marta bosish ham, Esc bilan qaytish ham ishlaydi); o'lcham brauzerda
  saqlanadi.
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
- **Ro'yxat bo'yicha sanoq** (Ombor sahifasida): kategoriya yoki brend
  tanlanadi, javondagi mahsulotlar ro'yxati chiqadi va har biriga
  HAQIQIY soni yoziladi (yoki "sahifadagilarga 0"); saqlanganda zaxira
  shu songa tenglashadi va har biri ombor tarixiga "sanoq" bo'lib
  tushadi. Shu bo'lim "chiqim" rejimida ham ishlaydi (zaxiradan
  ayiriladi). Server: `PUT /api/admin/inventory` (200 tadan).
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
- **Email** — SMTP (nodemailer). Kalitlar `secrets/email` hujjatida
  (Sozlamalar → "Email (SMTP)", faqat loyiha egasi ko'radi; host, port,
  foydalanuvchi, App password, "Kimdan" va **sinov xati** tugmasi),
  `SMTP_*` env zaxira sifatida qoladi. `isEmailConfigured()` asinxron;
  sozlanmagan bo'lsa email jimgina o'tkazib yuboriladi va e'lon
  natijasida sababi yoziladi ("SMTP sozlanmagan", "manzili bor
  foydalanuvchi yo'q", "SMTP xato berdi").
- Har biri sozlanmagan bo'lsa jimgina o'tkazib yuboriladi; admin
  panelda **Tizim tekshiruvi** har bir kanalning holatini ko'rsatadi.

## 1b-2. KO'P TILLIK VA SEO

- Sayt interfeysi uz/en/ru (`lib/i18n`), bot ham uch tilda.
- **Mahsulot nomi va tavsifi** ixtiyoriy ruscha/inglizcha variantga ega
  (`nameRu`, `nameEn`, `descriptionRu`, `descriptionEn`). Tarjima
  kiritilmagan bo'lsa o'zbekchasi ko'rsatiladi — eski mahsulotlar
  o'zgarishsiz ishlayveradi. Tarjima nomlari qidiruv tokenlariga ham
  tushadi: "смеситель" deb qidirilsa ham topiladi. Sayt, ilova va bot
  bir xil qoidada ishlaydi.
- **Ichki ma'lumot mijozga chiqmaydi:** narxnomadan import qilinganda
  tavsifga xizmat qatori tushadi ("1C kodi: 5967. Qadoqda: 6 dona").
  Mijozga ko'rinadigan hamma joy (kanal posti, Instagram/Facebook,
  sayt, ilova, bot) `publicDescription()` dan o'tadi va ichki kod
  kesib tashlanadi; admin panelda tavsif to'liq ko'rinadi.
- **Meta ma'lumotlar**: sarlavha shabloni (`%s | Atoyo Santexnika`),
  uch alifbodagi kalit so'zlar, Open Graph + Twitter kartochka
  (Telegram/WhatsApp havolasi rasm bilan ochiladi), canonical, robots
  va tema rangi. Katalog/kontakt client komponent bo'lgani uchun
  ularning meta ma'lumoti alohida `layout.tsx` da.

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

## 1c-2. RASM BO'YICHA QIDIRUV (mijoz uchun)

Mijoz mahsulot nomini bilmasa — suratini yuboradi:

- sayt/ilovada yordamchi oynasidagi 📷 tugmasi, botda esa shaxsiy
  chatga tashlangan HAR QANDAY surat shu oqimga ketadi;
- Claude vision rasmga qarab qidiruv so'zlarini beradi (uz+ru+en) va
  kategoriyani taxmin qiladi, so'ng `searchCatalog` haqiqiy katalogdan
  o'xshash mahsulotlarni topadi — narx/zaxira doim bazadan;
- chegara: har IP uchun soatiga 10 ta rasm, rasm 4 MB gacha.

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

## 1f. OPTOM (ULGURJI) MIJOZLAR VA IKKI XIL NARX

Do'kon ham do'konlarga (optom), ham oddiy xaridorga (dona) sotadi va
**ikki narx bir-biriga ko'rinmaydi**.

- **Bazadagi narx — OPTOM narx.** Admin faqat shuni kiritadi. Dona
  (chakana) narx undan ustama foizi bilan hisoblanadi:
  `dona = optom × (1 + ustama%)`, natija 100 so'mgacha yaxlitlanadi.
  Ustama sozlamalarda (`settings/pricing`, standart **5%**), kerak
  bo'lsa alohida mahsulotga `retailMarkupPercent` qo'yiladi. Narx
  ko'tarilganda 10 000 ta mahsulotni qayta yozish shart emas — bitta
  foiz o'zgartiriladi. Qoida bitta joyda: `lib/products/wholesale.ts`
  (client ham, server ham ishlatadi).
- **Kim qaysi narxni ko'radi:** `role === "client"` (optom mijoz) —
  optom narx; qolganlar — dona narx. Bu **hamma kanalda** bir xil:
  sayt, mobil ilova (`mobile/src/pricing.ts`), Telegram bot
  (`priceContext(chatId)`), AI yordamchi va rasm bo'yicha qidiruv
  (`searchCatalog`/`findRelevantProducts` narxni rolga moslaydi, mijoz
  aytgan narx chegarasi ham u ko'radigan narx ustida ishlaydi).
  Buyurtma narxi ham serverda rolga qarab qayta hisoblanadi — mijoz
  yuborgan narxga ishonilmaydi.
- **Eng kam buyurtma summasi** (standart 100 000 so'm): savatda
  ogohlantirish chiqadi va rasmiylashtirish tugmasi bloklanadi,
  server esa buyurtmani baribir tekshiradi.
- **Optom mijozlar bo'limi** (`/admin/optom`): 1C dan olingan ro'yxatni
  Excel/CSV bilan yuklash (ustunlar `№, Ismi, Telefon, Do'kon nomi,
  Manzil, Telegram`), har biriga **maxfiy kalit** (`ATY-XXXX-XXXX`)
  yaratish, kalitni Telegram/SMS/email orqali yuborish, kalitni
  yangilash va mijozni o'chirish (roli qaytariladi). Yozuvlar
  `wholesaleClients` da, Firestore qoidalarida **hamma clientga yopiq**.
- **`/optom` sahifasi:** mijoz telefon raqami va kalitni kiritadi
  (havoladagi `?kalit=` avtomatik to'ldiriladi) → tekshiruvdan o'tsa
  `users/{uid}.role = "client"` bo'ladi va shu ondan optom narxlarni
  ko'radi. So'rovlar soatiga 10 tadan ko'p bo'lmaydi.
- Yangi optom mijoz faollashganda xodimlar guruhining **optom topic'iga
  (441)** xabar tushadi.

## 1g. IJTIMOIY TARMOQLAR (Instagram, Facebook, YouTube)

Telegram kanali bilan bir qatorda ishlaydi, lekin kunlik chegaralar
sababli NAVBAT orqali:

- **Sozlamalar → Ijtimoiy tarmoqlar**: har tarmoq alohida yoqiladi,
  post matni shabloni (`{nomi} {kodi} {narx} {kategoriya} {brend}
  {tavsif} {havola}`), heshteglar, kunlik chegara (standart 20,
  Instagram ruxsati 50). Kalitlar `secrets/social` da (faqat loyiha
  egasi kiritadi), "Tekshirish" tugmasi sahifa/akkaunt/kanal nomini
  o'qib ko'radi.
- **Instagram**: rasm, karusel (2-10 rasm) yoki Reels. Ikki qadam -
  konteyner yaratiladi, keyin nashr qilinadi; video tayyor bo'lishini
  kutadi. **Facebook**: sahifaga rasm yoki video posti.
  **YouTube**: faqat videosi bor mahsulot (Shorts) - rasm post qilib
  bo'lmaydi (Community postlarining API si yo'q), kvota kuniga ~6 ta.
- **Navbat** (`socialQueue`): kanalga chiqqan mahsulot navbatga
  tushadi, "Navbatni yuborish" tugmasi yoki tashqi cron uni
  bo'shatadi; xato bo'lsa 3 martagacha qayta uriniladi. Ommaviy
  kirimda navbatga umuman qo'yilmaydi.
- **Tanlab joylash**: katalogni tartibga solish sahifasida
  belgilangan mahsulotlarni "Instagram/Facebook" tugmasi bilan
  darhol joylash mumkin.
- Ijtimoiy tarmoqda **dona (chakana) narx** ko'rsatiladi - optom narx
  hech qachon chiqmaydi.
- **Facebook/Instagram ulanishi**: `/api/admin/social/meta/connect` →
  Facebook roziligi → `/callback` uzoq muddatli foydalanuvchi tokenini
  oladi, `me/accounts` dan sahifa tokenini va bog'langan Instagram
  akkaunt ID sini topib `secrets/social` ga yozadi (Meta App ID/Secret
  panelda kiritiladi, redirect URI `<sayt>/api/admin/social/meta/callback`).
- **YouTube ulanishi**: Google "oob" usulini bekor qilgani uchun
  refresh tokenni sayt o'zi oladi — `/api/admin/social/youtube/connect`
  Google roziligiga yuboradi, `/callback` kodni tokenga almashtirib
  `secrets/social` ga yozadi (CSRF `state` cookie bilan). Google
  Cloud'dagi OAuth mijozi "Web application" bo'lishi va redirect URI
  `<sayt>/api/admin/social/youtube/callback` bo'lishi shart.
- Kalit/token olish qadamlari: `docs/DEPLOY.md`.

## 2. ADMIN PANEL (saytda)

Faqat xodimlarga. Kirish — session cookie; **rol tekshiruvi Node
qatlamida** (`/admin` layout), edge middleware faqat cookie borligini
tekshiradi.

- **Mahsulotlar:** ro'yxat, qidiruv, qo'shish/tahrirlash (nom, tavsif,
  artikul, kategoriya, material, sotish turi, brend, davlat,
  yetkazuvchi, narx, chegirma va muddati, zaxira, o'lchamlar, 10 tagacha
  rasm va 3 tagacha video), chernovik rejimi, ko'p rasm yuklash
  (fayl tanlash, **buferdan Ctrl+V / "Buferdan qo'yish" tugmasi** —
  `lib/files/clipboard.ts`, va sudrab tashlash), ommaviy narx o'zgartirish,
  CSV/Excel import/eksport (10 000 ta nomni bir yo'la yaratish uchun),
  indeks/raqamlarni yangilash.
- **Import formati:** ustun nomlari inglizcha (`name`, `price`,
  `stock`...) yoki o'zbekcha (`Nomi`, `Narxi`, `Zaxira`, `Turi`,
  `Razmer`) bo'lishi mumkin. **Turlari bor mahsulot — har bir tur
  alohida qator:** nomi bir xil qatorlar bitta mahsulotga yig'iladi,
  `variantGroup` (qator nomi), `variantValue` (qiymati), `variantSku`
  (turning kodi), narx/zaxira esa o'sha qatorning o'zida. Ikki
  o'lchovli tur "|" bilan: `O'lcham|Rang` va `50x60|Oq`. Eksport ham
  shu ko'rinishda chiqadi (fayl qaytib import qilinsa turlar tiklanadi).
  Namunalar: `/namuna/atoyo-mahsulotlar.xlsx` (ikkinchi varaqda
  yo'riqnoma) va `.csv`; fayl `scripts/make-sample-xlsx.js` bilan
  yasaladi.
- **Import qo'shimchalari:** `retailMarkupPercent` ustuni - shu
  mahsulotning dona ustamasi (foizda), bo'sh bo'lsa umumiy sozlama
  ishlatiladi; faylda uchragan YANGI kategoriya/material avtomatik
  ochiladi (`metadata/taxonomy` ga qo'shiladi va javobda ko'rsatiladi);
  material ixtiyoriy (katta narxnomalarda u ko'rsatilmaydi).
- **1C narxnomasini o'girish:** `node scripts/convert-price-list.js
  <narxnoma.xlsx> [chiqish.xlsx] [--kurs=12600]` - har brend alohida
  varaqda turgan dollarli ro'yxatni bitta import fayliga aylantiradi:
  nomdan brend/tur (kategoriya)/turi/rangi/kod ajratiladi, optom narx
  so'mga o'giriladi, fayldagi dona narx esa har mahsulotning o'z
  ustama foiziga aylanadi.
- **Turlar (variantlar):** bitta mahsulotda o'lcham/rang/qalinlik
  qatorlari; qatorlarning dekart ko'paytmasi bo'yicha har bir turga
  alohida narx va zaxira; mahsulot narxi — eng arzon tur, zaxirasi —
  yig'indi. "Hammasiga birdek" tugmasi.
- **Katalogni tartibga solish** (`/admin/katalog/tartib`): katta
  importdan keyin xatolarni tozalash uchun. Brend yoki kategoriya
  bo'yicha ro'yxat olinadi (sahifalab), ustiga qidiruv / "rasmi
  yo'qlar" / "kanalga chiqmaganlar" filtri qo'yiladi; belgilanganlarni
  o'chirish, boshqa kategoriyaga ko'chirish, brendini yozish, sotuvdan
  olish/qaytarish, har biriga shu yerda rasm yuklash va TANLAB kanalga
  post qilish mumkin (belgilanganlarni Instagram/Facebook'ga joylash
  tugmasi ham shu yerda; videosi bori YouTube Shorts'ga ham). Har bir
  qatorda alohida o'chirish, rasm yuklash va tahrirlash tugmalari
  turadi. E'lon Telegram chegarasi sababli 10 tadan, orasida ~1.2 s
  tanaffus bilan ketadi; rasmi yo'qlari o'tkazib yuboriladi.
  **Kanalda ALLAQACHON turgan mahsulotga yangi post tashlanmaydi** —
  eski post joyida tahrirlanadi (kanal takrorlar bilan to'lmasin), va
  natija ajratib ko'rsatiladi: nechtasi yangi post bo'ldi, nechtasi
  yangilandi, nechtasida o'zgarish yo'q edi. Haqiqatan yangi post
  kerak bo'lsa **"Qayta post qilish"** belgisi qo'yiladi — eski post
  o'chirilib, yangisi tashlanadi (`announceProduct(..., "repost")`). Har bir ommaviy amal "actions"
  topikka yoziladi.
- **Zaxirasiz mahsulotlar ro'yxati** (kirim sahifasida): `stock == 0`
  bo'lgan mahsulotlar ro'yxat bo'lib chiqadi (sahifalab yuklanadi),
  har biriga son yoziladi yoki "hammasiga bir xil son" qo'yiladi va
  bitta bosishda kirim qilinadi (serverga 100 tadan bo'lib ketadi).
  20 tadan ko'p bo'lsa kanalga e'lon qilinmaydi - kanal to'lib
  ketmasligi uchun (`announce: false`).
- **Buyurtmalar:** holat o'zgartirish (yangi → qabul → yetkazishda →
  yakunlandi / bekor), bekor qilinganda zaxira qaytadi.
- **Statistika, blog CRUD, promokodlar, foydalanuvchilar va rollar**
  (huquqlar: mahsulot, blog, buyurtma, promokod, tahlil, xabar
  yuborish, sozlamalar, foydalanuvchilar, rollar).
- **Sozlamalar:** sayt ma'lumotlari (kontakt, ijtimoiy tarmoq havolalari),
  **narx** (dona ustamasi va eng kam buyurtma), **Email (SMTP)** —
  faqat loyiha egasiga, sinov xati bilan, **Ijtimoiy tarmoqlar** —
  tarmoqlarni yoqish, post shabloni, navbat va "ulanish" tugmalari,
  kanal posti footeri, bot topic ID lari, majburiy obuna kanallari,
  maxfiy kalitlar (Firestore'da, env'dan ustun), **tizim tekshiruvi**
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
- **Kirimda turlar:** izohga `Tur nomi: O'lcham` va `Turlar:` yozilib,
  keyingi har bir qator bitta tur bo'ladi —
  `50x60 - 850000 - 4 - BS-5060` (qiymat - narx - soni - kod). Ikki
  qatorli tur `Balandlik|Rang` / `500mm|Oq` ko'rinishida. Turlar bo'lsa
  umumiy "Narxi"/"Soni" yozilishi shart emas: narx eng arzon turdan,
  zaxira turlar yig'indisidan olinadi.

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
- **Navigatsiya:** pastki menyu — Bosh, Katalog, Blog, Kontakt, Profil.
  Header'da faqat tema tugmasi va "☰": savat, sevimlilar,
  buyurtmalarim, yordamchi, til va shrift o'lchami shu oynada
  (tashqariga bosilsa yoki ✕ bosilsa yopiladi, balandligi ichidagi
  ro'yxatga qarab o'sadi). Profil sahifasida alohida tugmalar yo'q —
  sozlamalar bo'limlari o'sha yerda chiziladi.
- **Mahsulot turlari** (o'lcham/qalinlik) segment tanlagich ko'rinishida:
  variantlar bitta ramka ichida, tanlangani ramka ichida rang bilan
  ajraladi (sayt va ilovada bir xil).
- **Shrift o'lchami sozlamada** (Sozlamalar > Shrift o'lchami):
  tizim bo'yicha / kichik / standart / katta / juda katta. Telefon
  sozlamasidagi katta shrift menyu yozuvlarini qirqib qo'yardi
  ("Katalog" -> "Kat"), shuning uchun ilova o'lchamni o'zi boshqaradi:
  `makeStyles` dagi barcha `fontSize` koeffitsiyentga ko'paytiriladi va
  tizim kattalashtirishi neytrallanadi (ikki marta kattalashmaydi).
  "Tizim bo'yicha" rejimida telefon sozlamasi hurmat qilinadi, lekin
  1.3 dan oshmaydi; pastki menyu balandligi ham shunga qarab o'sadi.
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

## 3a. BOT STIKERLARI

Bot muhim daqiqalarda stiker yuboradi — do'kon jonli ko'rinadi:
salomlashuv (`/start`), buyurtma qabul qilinishi, holat o'zgarishi
(qabul qilindi / yo'lda / yetkazildi / bekor), yordamchi javob
tayyorlayotgan payt ("kutish" stikeri javob kelgach O'CHIRILADI),
xatolik. Har "daqiqa" — bitta SLOT, slotga stiker `file_id` si
biriktiriladi. Slot bo'sh bo'lsa bot avvalgidek faqat matn yuboradi.

- **Biriktirish (telefon):** xodimlar guruhiga stiker tashlanadi →
  bot uning kodini aytadi va to'plamni eslab qoladi; o'sha stikerga
  reply qilib `/stiker start` yoziladi. `/stiker` — ro'yxat va holat,
  `/stiker olib <slot>` — bo'shatish, `/stiker egasi` — to'plam
  egasini belgilash.
- **Biriktirish (sayt):** `/admin/stikerlar` — slotlar ro'yxati va
  to'plamlar; stikerni bosish uni tanlangan slotga biriktiradi.
  Stiker rasmlari server orqali ko'rsatiladi (fayl manzilida bot
  tokeni bo'lgani uchun).
- **Yangi stiker yasash:** shablon (doira / nishon / lenta) + yozuv →
  sayt 512x512 shaffof PNG chizadi (`next/og`, tashqi xizmatsiz) va
  Telegram to'plamiga qo'shadi. Bot faqat O'ZI yaratgan to'plamga
  yoza oladi (`atoyo_by_<bot>`), @Stickers orqali yasalgan eski
  to'plam faqat o'qiladi.
- **Animatsiyali stiker:** `.tgs` (Lottie, 64KB) yoki `.webm`
  (VP9+alfa, 256KB) — bularni sayt yasay olmaydi, tayyor fayl
  yuklanadi va to'plamga qo'shiladi.
- Tartib: `docs/STICKERS.md`.

## 4a. DO'KONDAGI TELEVIZOR (`/tv`)

Do'konga osilgan televizor uchun reklama ekrani. **Televizorga ILOVA
O'RNATILMAYDI** — bu saytdagi oddiy sahifa, uni Android TV box yoki
Smart TV brauzeri kiosk rejimida ochib turadi. Shuning uchun Samsung
(Tizen), LG (webOS), Android TV — hammasida ishlaydi va do'kon
moderatsiyasini kutish shart emas.

- Ekranda: katta rasm (sekin yaqinlashadi), brend, nom, KATTA narx,
  chegirma belgisi, "Sotuvda bor", QR kod (telefonda o'sha mahsulot
  sahifasi ochiladi), soat, pastda yuguruvchi qator va telefon raqami.
- Sahifa o'zini o'zi boshqaradi: slaydni almashtiradi, har 3 daqiqada
  ma'lumotni yangilaydi, internet uzilsa oxirgi holatni ko'rsatib
  turadi ("aloqa yo'q" belgisi bilan) va 30 soniyada qayta urinadi,
  `wakeLock` bilan ekran o'chishini oldini oladi.
- **Narx har doim DONA narx** — televizorni hamma ko'radi.
  Rasmsiz mahsulot ekranga chiqmaydi.
- Boshqaruv: **Admin panel → "Do'kon ekrani"** (`/admin/tv`,
  `settings/tv`): yoqish/o'chirish, manba (yangi / eng ko'p sotilgan /
  chegirmadagi / tanlangan kategoriyalar / qo'lda tanlangan
  mahsulotlar), nechta mahsulot (5-40), slayd davomiyligi (4-60 s),
  narx/QR/faqat-zaxiradagilar bayroqlari, sarlavha, yuguruvchi qator,
  telefon. Sahifa pastida "Hozir ekranda" ko'rinishi bor.
- QR kod tashqi xizmatsiz chiziladi (`qrcode-generator` → SVG).
- Tartib: `docs/TV.md`.

## 4b. DESKTOP ILOVA (Electron, `desktop/`)

Do'kon kompyuteri uchun. Ichida **saytning o'zi** ochiladi — UI
qaytadan yozilmaydi, sayt yangilansa ilova ham yangilangan bo'ladi.
React Native Windows/macOS ATAYLAB tanlanmagan: u RN dan orqada
yuradi, Linux yo'q va mobil UI ni katta ekranga qayta moslash kerak
bo'lardi.

- Qo'shimchalari: chek chop etish (Ctrl+P), USB shtrix-kod skaneri,
  `Do'kon → Do'kon ekrani` (`/tv` ni to'liq ekranli alohida oynada),
  offline sahifa + "Qayta urinish", bitta nusxa, oyna o'lchami eslab
  qolinadi, o'zbekcha menyu.
- Xavfsizlik: `contextIsolation`, `sandbox`, `nodeIntegration: false`,
  preload hech narsa ochmaydi, navigatsiya faqat sayt domenida
  (qolgani tashqi brauzerda), kamera/mikrofon rad etiladi.
- Ikonka koddan chiziladi (`desktop/build/make-icon.js`, PNG + zlib) —
  tashqi grafik vosita kerak emas.
- Yig'ish: GitHub Actions (`.github/workflows/desktop.yml`), Windows
  (`.exe`, NSIS) va Linux (`.AppImage`); natija **`desktop-latest`**
  relizga chiqadi (Android APK relizi `latest` alohida qoladi).
  Secret kerak emas. macOS `.dmg` tayyor, lekin Apple imzosi
  bo'lmagani uchun workflow'da yoqilmagan.
- Tartib: `docs/DESKTOP.md`.

## 5. MA'LUMOTLAR MODELI (Firestore)

- `products` — nom, `nameSearchIndex`, `nameTokens[]`, tavsif, artikul,
  `code` (odam uchun tartib raqami), kategoriya/material/sotish turi
  (slug), brend, davlat, yetkazuvchi, narx, chegirma va muddati, zaxira,
  o'lchamlar, rasm(lar) va `videos[]` (3 tagacha), `variantAxes[]` va
  `variants[]`, `retailMarkupPercent` (shu mahsulotning dona ustamasi),
  `costPrice`, `isActive`, `isDraft`, `salesCount`, reyting, kanal
  posti ma'lumotlari, sanalar. **`price` — OPTOM narx** (dona narx
  ustama bilan hisoblanadi).
- `orders` — mijoz, telefon, manzil, joylashuv, `items[]` (mahsulot,
  tur, narx, soni), summa, promokod, yetkazish narxi, to'lov turi va
  holati, status, Telegram xabar ID si, sanalar.
- `users` — rol va huquqlar, telefon, manzil, Telegram ID,
  `pushTokens[]`. Rol `client` — OPTOM mijoz (optom narxni ko'radi),
  `user` — oddiy (dona) mijoz; optom faollashganda
  `wholesaleClientId` ham yoziladi.
- `botUsers` — Telegram foydalanuvchilari (telefon, holat, savat, til).
- `metadata/taxonomy` — admin qo'shgan kategoriya/material/sotish turi
  (standartlari kodda, birlashtiriladi); `metadata/facets` — brend va
  davlat ro'yxati.
- `stockMoves` — ombor harakatlari (kirim/sotuv/qaytish/chiqim/sanoq).
- `settings/*` — sayt, yetkazish, telegram topic, `settings/pricing`
  (dona ustamasi va eng kam buyurtma), `settings/social` (qaysi
  ijtimoiy tarmoq yoqilgan, post shabloni, kunlik chegara).
- `secrets/*` (clientga butunlay yopiq, env'dan ustun): `telegram` —
  bot tokeni/guruh/webhook siri; `email` — SMTP; `social` — Meta App
  ID/Secret, sahifa tokeni, IG User ID, YouTube client va refresh
  token.
- `socialQueue` — Instagram/Facebook/YouTube post navbati (mahsulot,
  tarmoq, holat, urinishlar soni, xato, post ID si).
- `wholesaleClients` — optom mijozlar (raqam, ism, telefon, do'kon,
  manzil, Telegram, maxfiy kalit, holat, faollashgan `uid`);
  `metadata/wholesaleCounter` — tartib raqami. Qoidalarda hamma
  clientga yopiq (kalit sizib chiqmasin).
- `settings/pricing` — dona ustamasi (%) va eng kam buyurtma summasi.
- `promoCodes`, `blogPosts`, `reviews`, `stats/summary`, `tgLogins`,
  `intakeAlbums`, `subscribers`.
- Firestore qoidalari: mahsulot/blog — hammaga o'qish, yozish faqat
  serverdan; buyurtma — faqat egasi va admin; kompozit indekslar
  (`isActive` + `category`/`brand`/`price`/`nameTokens`...).

## 5a. API YO'LLARI (asosiylari)

Ochiq (mijoz): `/api/products/showcase` (bosh sahifa namunasi),
`/api/tv/slides` (do'kondagi televizor ekrani),
`/api/products/[id]/reviews`, `/api/search`, `/api/search/image`,
`/api/assistant`, `/api/taxonomy`, `/api/facets`, `/api/pricing`
(dona ustamasi), `/api/delivery`, `/api/promo/validate`, `/api/orders`,
`/api/orders/[id]/cancel`, `/api/contact`, `/api/subscribe`,
`/api/profile*`, `/api/auth/*` (session, telegram, reset-password),
`/api/payments/*` (payme, click, pay-with-card),
`/api/wholesale/activate` (optom kalitini faollashtirish),
`/api/telegram-webhook`.

Admin (`requirePermission` bilan):
- mahsulot: `products`, `products/[id]`, `products/import`,
  `products/export`, `products/list` (filtrli ro'yxat),
  `products/bulk` (delete/update/announce), `products/bulk-price`,
  `products/zero-stock`, `products/intake` (kirim, `announce` bayrog'i
  bilan), `products/reindex`, `products/search`, `products/search-index`,
  `products/[id]/ai-images`;
- ombor: `inventory` (GET tarix, POST bitta chiqim/sanoq, **PUT
  ommaviy sanoq/chiqim**);
- sozlama: `site-settings`, `delivery`, `pricing`, `taxonomy`,
  `telegram-settings`, `secrets`, `email` (SMTP), `diagnostics`;
- ijtimoiy tarmoq: `social` (sozlama + navbat holati + redirect URI
  lar), `social/secrets`, `social/post`, `social/queue`,
  `social/meta/connect|callback`, `social/youtube/connect|callback`;
- do'kon ekrani: `tv` (GET sozlama + tayyor slaydlar, PUT saqlash);
- stikerlar: `stickers` (slotlar + to'plamlar), `stickers/create`
  (yasash yoki tayyor faylni qo'shish), `stickers/preview` (512x512
  ko'rinish), `stickers/file` (Telegram rasmini uzatish);
- boshqa: `orders/[id]/status`, `orders/[id]/return`, `users`,
  `promo`, `blog`, `expenses`, `reports`, `stats`, `broadcast`,
  `upload` (rasm va `kind=video`), `wholesale`, `wholesale/import`.

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
- **Desktop ilova** — `desktop.yml`: `desktop/**` o'zgarganda (yoki
  qo'lda) Windows `.exe` (NSIS) va Linux `.AppImage` yig'iladi va
  **`desktop-latest`** relizga yuklanadi. Secret kerak emas; Android
  relizi (`latest`) bilan aralashmaydi.
- **Play Store AAB** — qo'lda ishga tushiriladigan workflow
  (`release-aab.yml`): imzo kaliti GitHub secret'laridan olinadi
  (`ANDROID_KEYSTORE_BASE64` va h.k.), `bundleRelease` yig'iladi va
  artifakt sifatida yuklanadi. Kalit bo'lmasa oddiy APK avvalgidek
  debug kaliti bilan yig'ilaveradi. Tartib `docs/PLAY-STORE.md` da.
- Saytda `/maxfiylik` sahifasi bor — Play Store talab qiladigan
  maxfiylik siyosati havolasi (footerdan ham ochiladi).
- Asosiy branchga push'da Firestore qoidalari va indekslari deploy
  qilinadi (service account secret'i bo'lsa).
- Har kuni Firestore Cloud Storage'ga eksport qilinadi, 30 kundan
  eski nusxalar tozalanadi.

## 7. HOZIRCHA QILINMAGANI (siz ham keyin qilasiz)

- Payme/Click to'lovi va karta saqlash: kod yozilgan, merchant
  kalitlari kutilyapti (kalit kelgach test kabinetida sinaladi).
- Ijtimoiy tarmoqlar kodda tayyor, lekin Meta App Review (boshqa
  akkauntlarga post uchun) va YouTube consent screen'ni "Publish"
  qilish foydalanuvchi zimmasida; navbatni avtomatik bo'shatadigan
  cron ham qo'yilmagan (hozir "Navbatni yuborish" tugmasi bilan).
- Optom narx himoyasi: interfeysning hamma joyida rol bo'yicha
  to'g'ri narx ko'rsatiladi, lekin `products` hujjati ochiq
  o'qilgani uchun optom narx bazada texnik jihatdan ko'rinadi -
  uni alohida yopiq kolleksiyaga chiqarish qoldi.
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

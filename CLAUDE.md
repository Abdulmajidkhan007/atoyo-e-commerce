# Atoyo Santexnika & Otopleniye — loyiha yo'riqnomasi

Katta hajmli (10 000+ mahsulot) santexnika/isitish e-commerce sayti.
**Stack:** Next.js 16.2 (App Router, Turbopack) · TypeScript · Firebase
(Client + Admin SDK) · Redux Toolkit · Tailwind + MUI · ikki tomonlama
Telegram bot · React Native ilova (`mobile/`) · Electron (`desktop/`).
UI tili — o'zbekcha. Dizayn: Deep Navy/Slate + Aqua `#00D2C4`.

> **Bu fayl — QOIDALAR.** Har bir qoidaning "nega shunday" degan uzun
> tarixi (qaysi nosozlikdan keyin paydo bo'lgani) —
> **`docs/ARXITEKTURA-TARIXI.md`** da. Qoida tushunarsiz tuyulsa yoki
> uni o'zgartirmoqchi bo'lsangiz — avval o'sha faylni o'qing.

## Ish tartibi

- Ish branch'i: **`claude/plumbing-ecommerce-nextjs-jxpmh5`**. Boshqa
  branch'ga push QILINMAYDI. PR faqat foydalanuvchi so'raganda.
- **Deploy = git push.** Sayt **Firebase App Hosting** da (backend
  `atoyo-e-commerce`, loyiha `atoyo-uz`, region `us-east4`), har
  push'da avtomatik rollout. Domen: **https://atoyo-uz.web.app**.
  Sozlama `apphosting.yaml`; `NEXT_PUBLIC_FIREBASE_*` kerak emas —
  App Hosting `FIREBASE_WEBAPP_CONFIG` ni o'zi beradi.
  Sandbox'dan hech qaysi hostingga to'g'ridan-to'g'ri deploy
  qilinmaydi (tarmoq siyosati bloklaydi). `netlify.toml` — eski
  zaxira, ishlatilmaydi.
- **Konteyner recycle'dan keyin** HEAD eski commit'ga qaytadi va
  `node_modules` o'chadi; `.claude/hooks/session-start.sh` tiklaydi.
  Untracked fayllar yo'qoladi — tez-tez commit + push qiling.

### Tekshiruv (commit oldidan MAJBURIY)

```bash
pkill -f "next[-]server" 2>/dev/null   # build OOM bo'lmasligi uchun
npx tsc --noEmit && npx eslint . && npm test && npm run build
```

Ilova tegilsa qo'shimcha: `cd mobile && npx tsc --noEmit` va
`npx eslint 'src/**/*.tsx' --no-ignore` (+ `npm run check-codegen`
yangi nativ paket qo'shilganda). Sayt vitest'i ilovaning sof
modulini ham sinaydi, shuning uchun `mobile/node_modules` kerak.

### Commit

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_...
```

### Hujjatlarni yangilash (MAJBURIY)

Yangi imkoniyat qo'shilsa yoki mavjudi sezilarli o'zgarsa — **o'sha
commitning o'zida**: `docs/REBUILD-PROMPT.md` (loyihaning to'liq
holati), `CLAUDE.md` (qoida o'zgarsa), `docs/DEPLOY.md` (env/sozlash
qadami), `README.md`, bo'limga xos hujjat va sezilarli nosozlik
tuzatilsa — `docs/ARXITEKTURA-TARIXI.md`.

---

# BUZILMAS QOIDALAR

## 1. Narx maxfiyligi (eng muhim)

Bazadagi `price` — **OPTOM**, `costPrice` — **TANNARX**. Dona narx
`priceForRole()` bilan hisoblanadi (`lib/products/wholesale.ts`,
ustama `settings/pricing`, standart 5%).

- **Mahsulot mijozga chiqishdan oldin `lib/products/viewer.ts` dagi
  `toViewerProduct()` / `toViewerProducts()` dan O'TISHI SHART.** U
  narxni rolga moslaydi va `costPrice`, `retailMarkupPercent`,
  `supplier` ni olib tashlaydi.
- **`products` kolleksiyasi `firestore.rules` da YOPIQ.** Mijoz —
  sayt ham, ilova ham — Firestore'dan mahsulot o'qimaydi; hammasi
  `/api/products/*` orqali (`lib/products/catalog-server.ts`).
- **Ustama foizi mijozga BERILMAYDI** (`/api/pricing` faqat
  `minOrderAmount`) — bilinsa optom narx teskari hisoblanadi.
- Mahsulot qaytaradigan YANGI route: `toViewerProducts()` +
  `no-store` (`lib/http/cache.ts`). Rolga bog'liq javob keshlanmaydi.
- Mijoz tomonidagi hook'lar (`usePricing.ts`, `mobile/src/pricing.ts`)
  HISOB QILMAYDI — serverdan kelgan narxni faqat yaxlitlaydi.
- **Vitrina hamma uchun MIJOZ oynasi** (`storefrontRole()`): xodim
  ham saytda/botda DONA narxni ko'radi. Optom narx faqat optom
  mijozga va admin panelga (`/api/products/list?raw=1`).
- **Kanal va push — har doim DONA narx** (`forChannel()`).
- Server tomoni (bot, AI, `/tv`, buyurtma) XOM hujjat bilan ishlaydi
  va `priceForRole()` ni o'zi qo'llaydi. Buyurtmada narx serverda
  qayta hisoblanadi (`lib/orders/create-order.ts`).
- **`orders` hujjatida `costPrice` YO'Q** — mijoz o'z buyurtmasini
  profilida client SDK bilan o'qiydi, tannarx u yerda bo'lsa
  raqobatchi o'zi buyurtma berib o'lchab oladi. Tannarx alohida
  yopiq `orderCosts/{orderId}` hujjatiga yoziladi (bir xil
  tranzaksiyada, `lib/orders/create-order.ts`), hisobot esa
  o'shandan `db.getAll()` bilan o'qiydi (`api/admin/reports/route.ts`).
  Eski buyurtmalar bir martalik `/api/admin/maintenance/order-costs`
  (faqat owner) bilan ko'chiriladi.
- Admin formada maydon **"Optom narx"**, ostida hisoblangan dona narx.
- Yopiq kolleksiyalar: `products`, `deletedProducts`, `secrets/**`,
  `wholesaleClients`, `socialQueue`, `channelQueue`, `channelClicks`,
  `oauthStates`, `aiUsage`, `orderCosts`.

## 2. Server tomoni

- **`src/proxy.ts` edge-safe** — firebase-admin import QILINMAYDI.
  U faqat session-cookie borligini tekshiradi; haqiqiy `role: admin`
  tekshiruvi `src/app/admin/layout.tsx` da (Node).
- **Barcha admin yozuvlari server route'lari orqali** (`/api/admin/*`,
  Admin SDK). Client Firestore yozuvi admin panelda osilib qoladi.
- Rasm/video yuklash: Admin SDK Storage +
  `firebaseStorageDownloadTokens` → ochiq URL. Papkalar:
  `products/<id>`, `blog`, `site`.
- Dinamik kontentli sahifalarga `export const dynamic = "force-dynamic"`.
- **Server komponentga FUNKSIYA prop berilmaydi** (`component={Link}`
  kabi) — sahifa 500 bo'ladi. MUI tugmasi kerak bo'lsa alohida
  `"use client"` komponent.
- OG rasmlar `next/og` bilan, `runtime="nodejs"`, tashqi API'siz.
  **Emoji renderlanmaydi** — matn/harf ishlating.
- Admin API xatosi **qaysi maydon va nima uchun** rad etilganini
  aytadi: `lib/http/validation.ts` → `validationMessage`. Yangi admin
  route shundan foydalanadi.

## 3. CSP va cookie

- Sayt CSP yuboradi (`lib/http/csp.ts`, testi `csp.test.ts`).
  **CSP'da ko'rsatilmagan tur jimgina bloklanadi.** Yangi tashqi
  manba qo'shilsa — ro'yxatga qo'shing va testga yozing. Rasm/video
  uchun `https:` ochiq.
- Firebase Hosting rewrite backendga **faqat `__session` cookie**
  ni o'tkazadi. Shuning uchun OAuth `state`, bir martalik kodlar
  cookie'da EMAS, Firestore'da (`lib/social/oauth-state.ts`).

## 4. Telegram kanal

- **POSTNI ALMASHTIRISH TARTIBI: avval YANGISI yuboriladi, eskisi
  FAQAT shundan keyin o'chiriladi.** Media soni o'zgarsa albomni
  tahrirlab bo'lmaydi va post qayta tashlanadi. Yiqilsa
  `announceProduct` `"failed"` qaytaradi, eski post joyida qoladi,
  sabab "Actions" topikiga yoziladi. Videoli albom o'tmasa —
  ikkinchi urinish faqat rasmlar bilan (`degraded: "no-video"`).
  Testi: `channel-announce.test.ts`.
- **UZUN MATN `truncateHtml()` BILAN KESILADI** (`html-truncate.ts`),
  oddiy `slice()` bilan EMAS: post matni HTML, teg o'rtasidan
  kesilsa Telegram butun postni rad etadi (`Can't find end tag
  corresponding to start tag "b"`). Cheklov: rasm/video izohi 1024,
  matnli xabar 4096 belgi. Testi: `html-truncate.test.ts`.
- **VIDEO HAVOLA BILAN YUBORILMAYDI.** Telegram video havolasini
  rad etadi (`Wrong file identifier/HTTP URL specified`), shuning
  uchun `sendMediaGroup`/`sendVideo` videoni o'zi yuklab olib
  multipart (`attach://mediaN`) bilan yuboradi; rasmlar havola
  bilan ketaveradi. Testi: `bot-media.test.ts`.
- `channelMessageId` bo'lsa YANGI post tashlanmaydi — eskisi
  tahrirlanadi. Natija: `posted` / `edited` / `unchanged` /
  `queued` / `failed` / `skipped` — UI va bot buni ochiq yozadi.
- **Post tezligi**: standart 10 daqiqada 5 ta YANGI post
  (`settings/telegram`). Oshgani `channelQueue` ga tushadi va
  avtomatik chiqadi (`lib/telegram/channel-queue.ts`,
  `/api/cron/channel` + har e'lon oldidan 2 tadan). Tahrir
  (`refresh`) chegaraga tushmaydi.
- Telegram bitta kanalga daqiqasiga ~20 ta tahrirga ruxsat beradi:
  `refresh-channel` 15 tadan oladi, orasida 3 s kutadi;
  `callTelegramApi` 429 dagi `retry_after` ni o'qib qayta uriniladi.
- **Tahrir tugamaguncha kanalga post ketmaydi**: har o'zgarish
  `session.pendingAnnounce` ni belgilaydi, e'lon "✅ Tugatish" da
  BIR MARTA ketadi (`pendingAnnounceMode` — narx o'zgarsa sarlavha
  "♻️ Mahsulot yangilandi").
- Kanal postidagi tur qatori: **QIYMAT → NARX → KOD**
  (`Satin Gold — 91 400 so'm · kod: SJ-03`). Post tartibi: nomi →
  brend/davlat → kategoriya → narx → turlar → material
  (`buildProductText`, testi `channel.test.ts`).
- **Statistika**: Telegram postni kim ko'rganini bermaydi. O'lchanadigan
  narsa — tugma bosilishi: tugma `/k/<id>` ga qaraydi va
  `channelClicks/{productId}` ga yoziladi (`click-days.ts`, 90 kundan
  eski kunlar tozalanadi). Postni guruhga **forward** qilsangiz bot
  hisobini beradi (`channel-report.ts`); **`/kanal`** — obunachilar,
  bot foydalanuvchilari, 7 kunda faollar.

## 5. Storage

- Mahsulotdan olib tashlangan rasm/video Storage'da **ATAYLAB
  qoladi** (savatdan tiklanganda kerak) — faqat bog'lanish uziladi.
- Joy bo'shatish: **Sozlamalar → "Storage tozalash"**
  (`lib/storage/cleanup.ts`). Faqat `products/`, `blog/`, `site/`;
  **30 kundan yosh fayllarga tegilmaydi**; o'chirish ro'yxati
  serverda qayta hisoblanadi; tasdiq so'zi `TOZALASH`. Havolalar
  kolleksiyalardan kursor bilan (500 tadan) yig'iladi; biror
  kolleksiya o'qilmasa funksiya THROW qiladi (to'liqsiz ro'yxat
  bilan o'chirish YO'Q). **QALQON**: yetimlar skanerlangan
  fayllarning 40% dan oshsa — havolalar noto'liq yig'ilgan bo'lishi
  mumkinligi belgisi — o'chirish bloklanadi va sabab panelda
  ko'rsatiladi.

## 6. Mahsulot ma'lumotlari

- **Majburiy maydonlar**: Nomi, Kodi/artikul, Tannarx, Optom narx,
  Soni, Kategoriya. **Material MAJBURIY EMAS** (1C narxnomasida
  ko'pincha yo'q). Tekshiruv formada; server bag'rikeng qoladi —
  bot kirimi va import ham shu route'lardan o'tadi.
- **Brend va davlat qo'lda yozilmaydi** — `metadata/facets` dan
  tanlanadi (`lib/products/facets.ts`, `/admin/katalog/turlar`).
  Mahsulotda MATNNING O'ZI saqlanadi, shuning uchun qayta nomlash
  mahsulotlarni ham yangilaydi (`renameFacetValue`).
- **Ichki ma'lumot mijozga chiqmaydi**: mijozga ko'rinadigan har
  qanday joy `publicDescription()` dan o'tadi (1C kodi kabi xizmat
  matnlari olib tashlanadi). Mobil nusxasi `mobile/src/types.ts` da.
- **Mahsulot raqami** `metadata/counters.productCode` dan:
  `bumpProductCodeCounter()` faqat KO'TARADI,
  `setProductCodeCounter()` ANIQ qiymatga qo'yadi (qayta
  raqamlashda shu ishlatiladi — aks holda hisoblagich eski qiymatda
  qolib ketadi). `reindex` route hamma mahsulotni kursor bilan
  aylanadi, yozuvlar 400 tadan.
- **O'chirilganlar savati**: mahsulot `deletedProducts/{id}` ga
  ko'chadi va 30 kun turadi (`lib/products/trash.ts`), muddati
  o'tgani ro'yxat ochilganda tozalanadi. Tiklangan mahsulot
  **`isActive: false`** bilan qaytadi.
- **Import qilingan mahsulot saytda darhol ko'rinmaydi** —
  `isActive: false`; ochish `/admin/katalog/tartib` dan. `isActive`
  — yagona ko'rinish filtri, yangi "yashirin" maydon qo'shilmaydi.
- **Katalog indeksi**: `where isActive == true` + filtr + `orderBy`
  uchun kompozit indeks kerak (`firestore.indexes.json`, 35 ta).
  Indeks yo'q bo'lsa `queryProductsPage` zaxira so'rovga o'tadi
  (tenglik + `__name__`, saralash xotirada) — katalog ishlaydi,
  lekin tartib to'liq to'g'ri emas. Yechim:
  `firebase deploy --only firestore:indexes`.
  **Zaxira yo'lda zaxira/narx filtri XOTIRADA qo'llanadi**, shuning
  uchun bazadan `pageSize` ning 4 barobari o'qiladi va sahifa
  filtrdan KEYIN to'ldiriladi; `hasMore` va kursor ham filtrdan
  keyingi holatga qarab beriladi (ilgari mijozga 24 ta o'rniga 3 ta
  mahsulot chiqib qolardi). Testi: `catalog-server.test.ts`.

## 7. Turlar (variantlar)

- Excel/CSV importda **har bir tur alohida qator** (`variantGroup`,
  `variantValue`, `variantSku` + o'sha qatordagi narx/zaxira);
  mantiq `lib/products/csv.ts`, testi `csv.test.ts`.
- Telegram kirimida `Tur nomi:` + `Turlar:` bloki
  (`intake-parser.ts`), **3 qatordan ko'p emas**, qiymatlar soni mos
  kelmasa qator tashlanadi va bot sababini aytadi.
- **Mavjud bo'lmagan kombinatsiya** `Product.variantsExcluded` ga
  tushadi va `normalizeVariants()` uni QAYTA YASAMAYDI.
- **Tur tanlagich** (`SegmentedPicker`, sayt va ilovada bir xil):
  yostiq surilib boradi, sudrab tanlash mumkin, ko'p bo'lsa keyingi
  qatorga o'tadi. **Track'da `touch-pan-y` bo'lishi SHART** — busiz
  telefonda sudrash ishlamaydi. O'chirilgan tur qiymati chizilmaydi.

## 8. Kategoriya nomini tanish (`matchTaxonomy`)

Solishtirish oldidan ikkala tomon `foldForMatch()` dan o'tadi:
kichik harf, apostrofsiz, **kirill egizak harflari lotinga
o'girilgan** (`е→e`, `а→a`, `о→o`). Keyin: ichida uchrashi → 1-2
harf xatosi (Levenshtein). Topilmasa `suggestTaxonomy()` eng yaqin
5 ta nomni xato xabarida ko'rsatadi.

## 9. Yetkazib berish va o'rnatish va'dasi

Matn kodda QATTIQ YOZILMAYDI: `settings/delivery` da saqlanadi,
matnni `lib/delivery/text.ts` yasaydi (`freeDeliveryText`,
`freeDeliveryShort`, `installServiceText`; testi `text.test.ts`).
Boshqaruvi: Sozlamalar → Promokod va yetkazib berish.
Chiqadigan joylar: bosh sahifa/about "Bizning ustunligimiz", savat,
checkout, kontakt, footer, mahsulot sahifasi, ilova
(`mobile/src/api.ts` da TAKRORLANGAN — ikkalasi birga o'zgaradi),
bot va kanal posti. `O'rnatib berish` mahsulotga bog'liq
(`Product.installService`) VA sozlamada yoqilgan bo'lishi kerak.

## 10. Dizayn rejimi: klassik / 3D

- **3D MIJOZGA STANDART HOLDA KO'RINMAYDI.** `SiteSettings.show3dMode`
  (standart `false`, Sozlamalar → "Sayt ko'rinishi"). O'chiq bo'lsa
  almashtirgich ham, `WorldCanvas` ham chizilmaydi — `three`/`gsap`
  mijozga umuman yuborilmaydi; ilgari 3D tanlagan mijozni `Ui3dGate`
  klassikka qaytaradi. Admin `/admin/3d` da sinaydi.
- **Shart bitta joyda** — `useImmersive()`. Komponentda qayta
  yozilmaydi. Qurilma pog'onasi: `low` / `mid` (telefon, yengil) /
  `high`. **Telefonni chiqarib tashlamang**; 3D o'chirilsa sababi
  ekranda yoziladi va "Baribir yoqish" tugmasi bo'ladi.
- **`three` / `gsap` / `framer-motion` statik import QILINMAYDI** —
  faqat dinamik.
- **3D uchun tashqi fayl yo'q** (`.glb`, `.hdr`) — shakllar koddan,
  yorug'lik `Lightformer` bilan. CSP tashqi hostni bloklaydi va bu
  ataylab yumshatilmaydi.
- 3D rejimda tema HAR DOIM to'q; kontent HTML'da qoladi (SEO).
  Yangi 3D bezakka `data-immersive-only` atributini bering.
  Batafsil: `docs/UI-3D.md`.

## 11. Blog va ijtimoiy tarmoqlar

- **Maqola qayerga yuboriladi — har maqolada tanlanadi**
  (`BlogPost.destinations`: telegram/youtube/instagram/facebook).
  Eski hujjatlarda maydon yo'q — `DEFAULT_BLOG_DESTINATIONS`.
  Tarmoq Sozlamalarda ham yoqilgan bo'lishi shart; YouTube uchun
  video, Instagram/Facebook uchun rasm kerak (`blogNetworks()`).
- Navbat `socialQueue` (kunlik chegara, 3 martalik qayta urinish),
  bo'shatish `/api/cron/social` (`CRON_SECRET`). Ijtimoiy tarmoqda
  faqat DONA narx. Kalitlar `secrets/social`.
- Blog **kontent videosi** (`BlogPost.videoUrl`) kanalga video posti
  bo'lib chiqadi va YouTube navbatiga tushadi; natija
  `youtubeVideoId` ga yoziladi (faqat YouTube uchun cheklov).

## 12. AI qatlami (`src/lib/ai/`)

- `config.ts` — Anthropic klienti (`ANTHROPIC_API_KEY`, standart
  model `claude-opus-5`). Kalit yo'q bo'lsa yordamchi o'chiq (503).
- `guard.ts` — mavzu chegarasi va jailbreak naqshlari (testi bor).
- `context.ts` — **narx/zaxira faqat shu yerdan** keladi, modeldan
  emas. `assistant.ts` — uchala kanal (sayt/ilova/bot) shu funksiyani
  chaqiradi. `tools.ts` — savatni SERVER o'zgartirmaydi, `actions`
  qaytaradi.
- `images.ts` + `usage.ts` — Gemini rasm PULLIK (~0.04 $): har rasm
  `aiUsage/<YYYY-MM>` da sanaladi, `settings/ai.monthlyImageLimit`
  to'lganda to'xtaydi. **Anthropic tokenlari ham shu hujjatda**
  (`requests/inputTokens/outputTokens/costUsd`): har `messages.create`
  dan keyin `recordTokenUse()` chaqiriladi, narx `MODEL_PRICES` dan
  (notanish model — eng qimmat narx). Anthropic "qolgan balans" ni
  API orqali BERMAYDI (Usage & Cost API faqat sarfni beradi va
  tashkilot hisobini talab qiladi) — panelda shuning uchun O'ZIMIZ
  sanagan taxminiy summa ko'rsatiladi. **Oylik $ chegarasi**
  (`settings/ai.monthlyCostLimitUsd`, standart 25 $, 0 — cheksiz):
  `assertTokenQuota()` yordamchi, rasm tahlili va rasm qidiruvining
  BOSHIDA chaqiriladi, to'lgan bo'lsa `QuotaError` va route 429 bilan
  SABABINI aytadi ("band" degan chalg'ituvchi xabar emas). Hisob
  o'qilmasa ish TO'XTAMAYDI.

## 13. Mobil ilova (`mobile/`)

React Native CLI (bare, RN 0.76) — faqat mijozlar uchun; sayt bilan
bir xil API. Root tooling'dan chiqarilgan (`tsconfig` exclude,
`eslint.config.mjs` ignores). APK sandbox'da yig'ilmaydi — CI
(`.github/workflows/ci.yml`) yig'ib `latest` relizga qo'yadi.
`google-services.json` repoda YO'Q.

- **Versiya ikki joyda bir xil bo'lishi shart**: `mobile/src/update.ts`
  dagi `APP_VERSION` va `android/app/build.gradle` dagi `versionName`
  (testi `version.test.ts`). Yangilanish oynasi `/api/app/version`
  dan o'qiladi, boshqaruvi Sozlamalar → "Ilova yangilanishi".
- Video pleyer: `mobile/src/components/VideoPlayer.tsx`
  (`react-native-video`) — mahsulot galereyasida va blog maqolasida.
  Yangi nativ paket qo'shilsa `scripts/check-codegen.mjs` ro'yxatiga
  ham qo'shing.

---

# XARITA (qayerda nima turadi)

## Telegram bot (`src/lib/telegram/`)

- `bot.ts` — Bot API wrapper (xabar, albom, video, tugma, 429 retry).
- `customer-bot.ts` — mijoz chati: ro'yxatdan o'tish + kanal gate →
  katalog/savat/checkout, `/profil`.
- `admin-commands.ts` + `admin-session.ts` — yopiq guruh: interaktiv
  `/yangi`, `/tahrir` (rasm va video menyusi bilan), `/narx /zaxira
  /top /uchir /tikla /buyurtmalar /stat /kanal /namuna`.
- `product-intake.ts` + `intake-parser.ts` — "Kirim" topic'i: rasm +
  izoh → mahsulot. Izohda HAMMA maydon bo'lishi mumkin (tannarx,
  kalit so'zlar, o'rnatish, chegirma, tarjimalar); namunani bot
  `/namuna` bilan ko'rsatadi (`INTAKE_SAMPLE` `FIELD_ALIASES` bilan
  MOS bo'lishi shart). Albom holati `intakeAlbums/{mediaGroupId}`.
- `channel.ts`, `channel-queue.ts`, `channel-stats.ts`,
  `channel-report.ts` — kanal posti, navbat va statistika.
- Sirlar: `secrets/telegram` (`lib/telegram/secrets.ts`) env'dan
  ustun; sozlamani saqlash "jumboq" bilan himoyalangan. **Bot useri**
  ham shu yerda (`botUsername`) — bot almashtirilganda `t.me/<bot>`
  havolalari (sayt kirishi, ilovadagi tugma) deploy'siz yangilanadi.
  Botni almashtirish tartibi: `docs/DEPLOY.md` oxirida.
- Stikerlar: `settings/stickers`, yuborish hech qachon asosiy oqimni
  to'xtatmaydi. Sayt stikerni o'zi chizadi (`lib/stickers/`, `next/og`)
  va `.tgs` ni ham o'zi yasaydi (`node:zlib`, ffmpeg kerak emas;
  `.tgs` da matn qatlami TAQIQLANGAN). Tartib: `docs/STICKERS.md`.

## Boshqa

- **`/tv`** — do'kon televizori uchun sahifa (narx doim DONA,
  rasmsiz mahsulot chiqmaydi, slaydlar 2 daq. kesh). `docs/TV.md`.
- **`desktop/`** — Electron: saytning O'ZINI ochadi, UI
  takrorlanmaydi. `docs/DESKTOP.md`.
- Pochta: `secrets/email` (env `SMTP_*` zaxira),
  `isEmailConfigured()` — ASINXRON, sozlanmagan bo'lsa email jim
  o'tkaziladi.

## Hujjatlar

| Fayl | Nima haqida |
|---|---|
| `docs/ARXITEKTURA-TARIXI.md` | Qoidalarning sababi: qaysi nosozlikdan keyin paydo bo'lgani |
| `docs/REBUILD-PROMPT.md` | Loyihaning to'liq holati (boshqa AI ga topshiriq) |
| `docs/DEPLOY.md` | Deploy, env, sirlar, cron, ijtimoiy tarmoq ulash |
| `docs/QADAMLAR.md` | Egasi QO'LDA bajaradigan qadamlar (GitHub secret, migratsiya, domen, ilova relizi, cron) |
| `docs/HISOBOT.md` | Bajarilgan / kutilayotgan ish va kod sifati bahosi |
| `docs/AUDIT.md` + `docs/AUDIT-ISHLARI.md` | Mustaqil audit va undan chiqqan ishlar navbati (tayyor topshiriqlar) |
| `docs/KIRIM-VA-IMPORT.md` | Kirim va Excel import tartibi |
| `docs/UI-SHISHA.md` | Shisha (glass) ko'rinish qoidalari — sayt va ilova |
| `docs/UI-3D.md`, `docs/TV.md`, `docs/DESKTOP.md`, `docs/STICKERS.md` | Bo'limga xos |
| `docs/TYPESENSE.md` | Tezkor qidiruvni yoqish |
| `docs/BACKUP.md`, `docs/PLAY-STORE.md` | Zaxira, Play Store |
| `mobile/README.md` | Ilova: yig'ish va yangilanish chiqarish |
| `docs/SESSION-PROMPT.md` | Yangi sessiyaga beriladigan tayyor prompt |
| `docs/PROMPTLAR.md` | Rejalashtiruvchi sessiya + boshqa loyihani tahlil qilish prompti |
| `docs/PROMPTLAR-UMUMIY.md` | Umumiy (istalgan loyihaga mos) promptlar kutubxonasi |
| `docs/PROMPTLAR-ATOYO.md` | Shu loyihaga xos promptlar + **loyiha auditi** topshirig'i |
| `docs/YANGI-LOYIHA-NAMUNASI.md` + `docs/PROMPT-ORGANICK-PLATFORMA.md` | Ish tartibini boshqa loyihaga ko'chirish; organick uchun bosh prompt |

# MA'LUM BLOKLAR VA KUTILAYOTGAN ISHLAR

- **Firebase Storage yoqilmagan bo'lsa** rasm yuklash ishlamaydi
  (Firebase konsolida "Get Started").
- **Firestore qoidalari/indekslari sandbox'dan deploy qilinmaydi**;
  ular default branch'ga push bo'lganda CI orqali qo'llanadi
  (`FIREBASE_SERVICE_ACCOUNT` secret'i kerak). `firestore.rules` va
  `firestore.indexes.json` ni yangilab, commit qilib qo'ying.
- Payme/Click: kod tayyor, merchant kalitlari kutilmoqda.
- Ko'p tillik: interfeys uz/en/ru tayyor; mahsulot uchun ixtiyoriy
  `nameRu/nameEn/descriptionRu/descriptionEn` (`lib/products/i18n.ts`).
- Keyingi bosqichlar: rasmsiz mahsulotlar ish navbati → Typesense →
  PWA → to'lov testlari → `customer-bot.ts` ni bo'lish → Uzum Pay.

# Atoyo Santexnika & Otopleniye — loyiha yo'riqnomasi

Katta hajmli (10 000+ mahsulot) santexnika/isitish e-commerce sayti.
**Stack:** Next.js 16.2.x (App Router, Turbopack) · TypeScript · Firebase
(Client + Admin SDK) · Redux Toolkit · Tailwind + MUI · ikki tomonlama
Telegram bot. UI tili — o'zbekcha. Dizayn: Deep Navy/Slate + Aqua `#00D2C4`.

## Branch va deploy

- Ish branch'i: **`claude/plumbing-ecommerce-nextjs-jxpmh5`**. Boshqa branch'ga
  push qilinmaydi (ruxsatsiz).
- **Deploy = git push.** Sayt endi **Firebase App Hosting** da:
  backend `atoyo-e-commerce` (loyiha `atoyo-uz`, region `us-east4`),
  har push'da avtomatik rollout. Asosiy domen — **https://atoyo-uz.web.app**
  (Firebase Hosting `firebase.json` dagi rewrite orqali Cloud Run
  xizmatiga yo'naltiradi; uzun `…hosted.app` manzili ham ishlaydi).
  Sozlama `apphosting.yaml` da; `NEXT_PUBLIC_FIREBASE_*` kalitlari
  kerak emas — App Hosting `FIREBASE_WEBAPP_CONFIG` ni o'zi beradi,
  `next.config.ts` uni o'qiydi.
- Netlify konfiguratsiyasi (`netlify.toml`) zaxira sifatida qoldi.
  Sandbox'dan **hech qaysi hostingga to'g'ridan-to'g'ri deploy
  QILINMAYDI** — tarmoq siyosati `*.netlify.app`, `*.hosted.app` va
  Google API hostlarini 403 bilan bloklaydi.
- Muqobil hosting — **Firebase App Hosting** (`apphosting.yaml` tayyor,
  tartib `docs/DEPLOY.md` da). U yerda Admin SDK kaliti kerak emas:
  `lib/firebase/admin.ts` Google Cloud ichida ADC'ga o'zi tushadi.
  GitHub Pages TO'G'RI KELMAYDI — u faqat statik, SSR/API yo'q.
- Netlify env'lari **non-secret** bo'lishi shart — `is_secret` belgilangan
  o'zgaruvchilar function runtime'ga yetib bormaydi (500/401 sabab bo'ladi).

## Sessiya boshlanishi (konteyner recycle)

Konteyner qayta ishga tushganda lokal HEAD eski commit'ga qaytadi va
`node_modules` o'chadi. `.claude/hooks/session-start.sh` buni avtomatik
tiklaydi. Qo'lda kerak bo'lsa:
```bash
git fetch origin claude/plumbing-ecommerce-nextjs-jxpmh5
git merge --ff-only origin/claude/plumbing-ecommerce-nextjs-jxpmh5
[ -d node_modules/next ] || npm install
```
Untracked fayllar recycle'da yo'qoladi — ishni tez-tez commit + push qiling.

## Buzilmasligi kerak bo'lgan arxitektura qoidalari

- **`src/proxy.ts` edge-safe** bo'lishi shart — firebase-admin import
  QILINMAYDI. Netlify uni Deno edge function sifatida ishlatadi; admin SDK
  u yerda yuklanmaydi. Proxy faqat session-cookie mavjudligini tekshiradi;
  haqiqiy `role: admin` tekshiruvi `src/app/admin/layout.tsx` da (Node).
- **Barcha admin yozuvlari server API route'lari orqali** (`/api/admin/*`,
  Admin SDK bilan). Client Firestore yozuvlari admin panelda osilib qoladi
  (client auth server-cookie rejimida tiklanmaydi). Shu sabab mahsulot/blog/
  sozlama CRUD hammasi server-side.
- Serverda rasm yuklash: Admin SDK Storage + `firebaseStorageDownloadTokens`
  metadata → ochiq URL. Papka: `products/<id>`, `blog`, `site`.
- Dinamik kontentli sahifalar `export const dynamic = "force-dynamic"`
  (`/admin/*`, `(main)/layout.tsx`, blog/about, OG route'lar).
- Bot generatsiya rasmlar `next/og` (`ImageResponse`) bilan, `runtime="nodejs"`,
  tashqi API'siz. Emoji renderlanmaydi — matn/harf ishlating.

## Narx qoidasi (buzilmasin)

Bazadagi `price` — **OPTOM** narx, `costPrice` — **TANNARX**. Dona narx
`lib/products/wholesale.ts` dagi `priceForRole()` orqali hisoblanadi
(`settings/pricing` dagi ustama, standart 5%). Optom mijoz dona narxni,
dona mijoz optom narxni ko'rmasligi kerak. Buyurtmada narx serverda
rolga qarab qayta hisoblanadi (`lib/orders/create-order.ts`).

### Narx hisobi FAQAT SERVERDA (buzilmasin)

Mahsulot hujjati mijozga chiqishdan oldin **`lib/products/viewer.ts`
dagi `toViewerProduct()` / `toViewerProducts()` dan o'tishi SHART**. U:

- `price` / `discountPrice` ni rolga mos qiymatga almashtiradi
  (turlarning narxi ham);
- `costPrice`, `retailMarkupPercent`, `supplier` ni **olib tashlaydi**.

Ustama foizi mijozga BERILMAYDI (`/api/pricing` faqat `minOrderAmount`
qaytaradi): u ma'lum bo'lsa dona narxdan optom narx teskari
hisoblanardi (`optom = dona / (1 + ustama/100)`).

Shu sababli:

- **`products` kolleksiyasi `firestore.rules` da YOPIQ**
  (`allow read, write: if false`). Mijoz — sayt ham, ilova ham —
  Firestore'dan mahsulot o'qimaydi.
- Katalog/qidiruv server orqali: `lib/products/catalog-server.ts` +
  `/api/products/list`, `/api/products/search`, `/api/products/[id]`,
  `/api/products/by-ids`, `/api/products/showcase`, `/api/search`.
  Filtr va saralash avvalgidek BAZA tomonida qoladi; kursor —
  oxirgi hujjatning ID si (snapshot JSON'da uzatilmaydi).
- Mijoz tomonidagi hook'lar (`lib/products/usePricing.ts`,
  `mobile/src/pricing.ts`) **hisob qilmaydi** — serverdan kelgan
  narxni faqat yaxlitlaydi. Imzo (signature) o'zgarmagan, shuning
  uchun chaqiruv joylari avvalgidek.
- Mahsulot qaytaradigan YANGI route yozilsa — javobni albatta
  `toViewerProducts()` dan o'tkazing va `no-store` qo'ying
  (`lib/http/cache.ts`). Rolga bog'liq javob CDN'da keshlanmaydi.
- Server tomoni (bot, AI, `/tv`, kanal posti, buyurtma) XOM hujjat
  bilan ishlaydi va `priceForRole()` ni o'zi qo'llaydi.
- **Vitrina hamma uchun MIJOZ oynasi** — `storefrontRole()`. Xodim
  saytda/botda ham DONA narxni ko'radi, optom narx faqat optom
  mijozga va ADMIN PANELGA (`/api/products/list?raw=1`) beriladi.
  Aks holda "saytda 70 000, botda 78 700" degan chalkashlik chiqadi.
- **Ochiq kanal va push — har doim DONA narx** (`forChannel()`
  `lib/telegram/channel.ts` da). Kanalda optom narx turishi ham
  xato, ham maxfiylikning buzilishi.
- Botda ro'yxat ham, kartochka ham `shownPrice()` dan o'tadi —
  ikkalasida bir xil raqam turishi shart.
- Admin formada maydon **"Optom narx"** deb ataladi va ostida
  hisoblangan dona narx ko'rsatiladi (ustama `/api/admin/pricing`
  dan olinadi — mijozga beriladigan `/api/pricing` da yo'q).

## Admin API xatolari

Tekshiruv (Zod) yiqilganda javob **qaysi maydon va nima uchun** rad
etilganini aytadi (`lib/http/validation.ts` → `validationMessage`,
testi `validation.test.ts`). Ilgari hamma joyda quruq "Ma'lumotlar
noto'g'ri." turardi va 30 dan ortiq maydonli formada sababni topib
bo'lmasdi (bir marta "kalit so'zlar 10 tadan ko'p" degan sabab
yashirinib qolgan). Yangi admin route yozilsa shu funksiyadan
foydalaning.

## Import/kirimda turlar

- Excel/CSV importda **har bir tur alohida qator**: `variantGroup`,
  `variantValue`, `variantSku` + o'sha qatordagi `price`/`stock`;
  nomi bir xil qatorlar bitta mahsulotga yig'iladi. Mantiq
  `lib/products/csv.ts` (`variantsFromRows`, `normalizeHeader`) da,
  testlari `csv.test.ts`. Namuna fayl: `scripts/make-sample-xlsx.js`.
- Telegram kirim izohida `Tur nomi:` + `Turlar:` bloki
  (`lib/telegram/intake-parser.ts`, testlari `intake-parser.test.ts`).
- Importda `retailMarkupPercent` (dona ustamasi, foizda) ustuni bor;
  notanish kategoriya/material avtomatik ochiladi, material esa
  ixtiyoriy.
- 1C narxnomasi (brendlar alohida varaqda, narx dollarda) →
  `node scripts/convert-price-list.js <fayl.xlsx> [chiqish.xlsx]
  [--kurs=12600]`. Excel o'qish/yozish - `scripts/lib/xlsx.js`
  (tashqi kutubxonasiz).

## Katta katalog bilan ishlash

- Bosh sahifada faqat **6 ta namuna mahsulot** (har kategoriyadan
  bittadan, `/api/products/showcase`, 5 daq. kesh) va cheklangan
  kategoriyalar qatori - qolgani katalogda.
- **Ichki ma'lumot mijozga chiqmaydi:** 1C narxnomasidan kelgan
  tavsifda "1C kodi: 5967" bo'lishi mumkin. Mijozga ko'rinadigan
  HAR QANDAY joy `lib/products/description.ts` dagi
  `publicDescription()` dan o'tadi (kanal posti, ijtimoiy tarmoq,
  sayt/ilova/bot - `localizedDescription` ichida). Admin panelda
  tavsifning o'zi to'liq ko'rinadi. Mobil nusxasi -
  `mobile/src/types.ts`.
- Kanalga e'lon: mahsulotda `channelMessageId` bo'lsa YANGI post
  tashlanmaydi - eski post tahrirlanadi. Sozlamalardagi "Kanal
  postlarini yangilash" postni mahsulotning HOZIRGI holatidan qayta
  quradi (narx/nom/tavsif/zaxira) va kursor bilan OXIRIGACHA aylanib
  chiqadi - 40 tadan. `announceProduct` natija
  qaytaradi (`posted` / `edited` / `unchanged` / `skipped`), UI shuni
  ochiq yozadi. Haqiqatan yangi post kerak bo'lsa `"repost"` rejimi
  (eski post o'chiriladi).
- **Import qilingan mahsulot saytda darhol ko'rinmaydi**:
  `/api/admin/products/import` `publish` bayrog'ini oladi (standart
  `false`) va mahsulotlarni `isActive: false` bilan yaratadi. Ochish -
  `/admin/katalog/tartib` dagi "Saytda ochish". `isActive` yagona
  ko'rinish filtri (katalog, qidiruv, bot, ilova hammasi shunga
  tayanadi) - yangi "yashirin" maydon QO'SHILMAYDI.
- Ommaviy tozalash: `/admin/katalog/tartib` + `/api/admin/products/list`
  (bitta tenglik filtri + `__name__` tartibi - kompozit indekssiz) va
  `/api/admin/products/bulk` (delete / update / announce). Kanalga
  ommaviy e'lon 10 tadan, orasida tanaffus bilan.
- Kirimda 20 tadan ko'p mahsulot bo'lsa kanalga e'lon qilinmaydi
  (`announce: false`).

## CSP qoidasi (buzilmasin)

Sayt `Content-Security-Policy` yuboradi (`lib/http/csp.ts`, testi
`csp.test.ts`). **CSP'da ko'rsatilmagan tur `default-src 'self'` ga
tushadi va jimgina bloklanadi** - brauzer konsolisiz sezilmaydi.
Shu sabab bir marta mahsulot VIDEOSI yo'qolgan edi (`media-src`
yozilmagan edi, video esa Firebase Storage'da).

Tashqi manba qo'shilsa (yangi rasm/video/skript/iframe hosti):
`lib/http/csp.ts` dagi ro'yxatga qo'shing va `csp.test.ts` ga
tekshiruv yozing. Rasm va video uchun `https:` ochiq qoldirilgan -
Storage manzillari o'zgarib turadi.

## Cookie qoidasi (Firebase Hosting)

Sayt Firebase Hosting rewrite orqali ochilgani uchun backendga **faqat
`__session` cookie yetib boradi** — boshqa nomdagi cookie'lar yo'lda
tashlab ketiladi. Shu sababli OAuth `state`, bir martalik kodlar va
shunga o'xshash qisqa muddatli qiymatlar cookie'da EMAS, serverda
(Firestore) saqlanadi: `lib/social/oauth-state.ts` (`oauthStates`,
qoidalarda yopiq). Yangi oqim yozayotganda shuni yodda tuting.

## Ijtimoiy tarmoqlar

`src/lib/social/`: `meta.ts` (Instagram + Facebook, bitta sahifa
tokeni), `youtube.ts` (faqat video, Shorts), `publish.ts` (matn
shabloni, navbat `socialQueue`, kunlik chegara, 3 martalik qayta
urinish). Kalitlar `secrets/social`, sozlama `settings/social`.
Kanalga e'lon qilingan mahsulot navbatga tushadi (`announceProduct`
ichida, `refresh` rejimida emas). Ijtimoiy tarmoqda faqat DONA narx.

## Server komponentda MUI (buzilmasin)

Server komponentga `component={Link}` kabi FUNKSIYA prop berilmaydi —
"Functions cannot be passed directly to Client Components" xatosi
chiqadi va sahifa 500 bo'ladi (`/admin/katalog` shundan yiqilgan edi).
Server sahifada oddiy `<Link>` + Tailwind sinflari ishlatiladi, MUI
tugmasi kerak bo'lsa alohida `"use client"` komponentga chiqariladi.

## Pochta (SMTP)

Kalitlar `secrets/email` hujjatida (Sozlamalar → "Email (SMTP)", faqat
loyiha egasi), env (`SMTP_*`) zaxira sifatida qoladi.
`isEmailConfigured()` — ASINXRON. Sozlanmagan bo'lsa email jim
o'tkazib yuboriladi, e'lon natijasida sababi yoziladi.

## Ma'lum bloklar (foydalanuvchi hal qiladi)

- **Firebase Storage yoqilmagan** — rasm yuklash Storage yoqilmaguncha
  ishlamaydi (Firebase konsolida "Get Started"). Matn-only CRUD ishlaydi.
- **Firestore rules/indexes sandbox'dan deploy qilinmaydi**: gRPC bloklangan;
  REST + SA-signed JWT kerak, lekin lokal `.env.local` da admin kalitlar
  BO'SH (ular faqat Netlify runtime env'da). Qoidalar/indekslar keyingi
  Netlify build'da qo'llanadi. `firestore.rules` va `firestore.indexes.json`
  ni yangilab, commit qilib qo'ying.

## Tekshiruv (commit oldidan)

```bash
pkill -f next-server 2>/dev/null   # build OOM bo'lmasligi uchun
npx tsc --noEmit && npx eslint <o'zgargan fayllar> && npm run build
```
Test framework yo'q — tekshiruv = typecheck + lint + build (+ kerak bo'lsa
`npm run start` bilan runtime tekshiruv).

## Hujjatlarni yangilab turish (MAJBURIY)

Loyihaga yangi imkoniyat qo'shilsa yoki mavjudi sezilarli o'zgarsa,
**o'sha commitning o'zida** quyidagilar yangilanadi:

- `docs/REBUILD-PROMPT.md` — loyihaning to'liq holati (boshqa AI ga
  beriladigan topshiriq). Foydalanuvchi buni doim yangi holatda
  bo'lishini so'ragan;
- `docs/DEPLOY.md` — yangi env/secret yoki sozlash qadami paydo bo'lsa;
- `CLAUDE.md` — arxitektura qoidasi yoki ish tartibi o'zgarsa.

## Commit konvensiyasi

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_...
```
`git push -u origin claude/plumbing-ecommerce-nextjs-jxpmh5`. PR faqat
foydalanuvchi so'raganda.

## Telegram bot xaritasi

- `src/lib/telegram/bot.ts` — Bot API wrapper (sendChatMessage, sendPhoto,
  inline/reply keyboard, callback, webhook).
- `customer-bot.ts` — shaxsiy chat: ro'yxatdan o'tish (telefon) + majburiy
  kanal gate → katalog/savat/checkout, `/start` salomlashuv rasmi, `/profil`.
- `admin-commands.ts` + `admin-session.ts` — yopiq guruh: interaktiv `/yangi`
  va `/tahrir` (tugmali), `/narx /zaxira /top /uchir /tikla /buyurtmalar /stat`.
- `product-intake.ts` + `intake-parser.ts` — "Kirim" topic'i (thread 151):
  rasm(lar) + izoh (nom/narx/soni/kimdan/material) → mahsulot yaratiladi,
  keyin ixtiyoriy maydonlar tugmalari. Albom (media_group) holati
  `intakeAlbums/{mediaGroupId}` da.
- Webhook: `src/app/api/telegram-webhook/route.ts`. Topic Thread ID'lar
  Firestore `settings/telegram` da (buyurtmalar topic = 2, kirim = 151).
- Bot tokeni/guruh ID/webhook siri: `secrets/telegram` (server-only,
  `lib/telegram/secrets.ts`) → env'dan ustun. Sozlamalarni saqlash
  serverda tekshiriladigan "jumboq" bilan himoyalangan
  (`lib/security/challenge.ts`).
- Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (xodimlar guruhi),
  `TELEGRAM_WEBHOOK_SECRET`, `NEXT_PUBLIC_SITE_URL` (OG rasm URL'lari uchun).

## Bot stikerlari

Bot muhim daqiqalarda stiker yuboradi (salomlashuv, buyurtma holati,
"kutish"). Sozlama `settings/stickers`, slot → `file_id`. Yuborish
HECH QACHON asosiy oqimni to'xtatmaydi (`sendSlotSticker` xatoni
yutadi). Biriktirish: xodimlar guruhida stikerga reply qilib
`/stiker <slot>`, yoki `/admin/stikerlar`. Yangi stiker saytda
chiziladi (`lib/stickers/render.tsx`, `next/og`, 512x512 PNG) va
BOT YARATGAN to'plamga qo'shiladi — @Stickers orqali yasalgan eski
to'plamni Bot API tahrirlay olmaydi (faqat o'qiydi).
Statik stikerni AI ham yasaydi (`lib/stickers/ai.ts` - Gemini rasm,
`image.ts` - `sharp` bilan fon olib tashlash + oq chegara + WEBP).
Logotip va 15 ta ikonka koddan vektor sifatida chiziladi
(`lib/stickers/art.ts`) - rasm fayli yo'q. Tartib: `docs/STICKERS.md`.

**Animatsiyali `.tgs` ni ham sayt o'zi yasaydi** (`lib/stickers/`
`animate.ts` + `animations.ts`): `.tgs` = gzip qilingan Lottie JSON,
shuning uchun `ffmpeg`/tashqi kutubxona KERAK EMAS - `node:zlib`
yetadi. Bitta "sahna" tavsifidan ikki natija chiqadi: Telegram uchun
`.tgs` (`tgsFromScene`) va admin panelda ko'rinadigan jonli SVG
(`svgFromScene`, SMIL) - ikkalasi bir manbadan, shuning uchun
ko'rinish bilan stiker farq qilmaydi. `.tgs` da MATN QATLAMI,
rasm, effekt va maska TAQIQLANGAN - animatsiyali stikerda yozuv
bo'lmaydi, faqat ikonka/logotip harakati. Video `.webm` (VP9+alfa)
hamon yasalmaydi, faqat yuklab qo'shiladi.

## AI qatlami (`src/lib/ai/`)

- `config.ts` — Anthropic klienti (`ANTHROPIC_API_KEY`, model
  `AI_MODEL`, standart `claude-opus-5`). Kalit yo'q bo'lsa yordamchi
  o'chiq: `/api/assistant` 503 qaytaradi, tugmalar chizilmaydi.
- `guard.ts` — mavzu chegarasi va jailbreak naqshlari (client ham
  ishlatishi mumkin, "server-only" YO'Q). Yangi himoya qo'shilsa
  `guard.test.ts` ga test yoziladi.
- `context.ts` — do'kon ma'lumotlari (5 daq. kesh) + savolga mos
  mahsulotlar. **Narx/zaxira faqat shu yerdan** keladi — modeldan
  emas.
- `assistant.ts` — system prompt + Anthropic chaqiruvi + vosita
  zanjiri (4 aylanishgacha). Uchala kanal (sayt/ilova/bot) shu
  funksiyani chaqiradi; mantiq takrorlanmaydi.
- `tools.ts` — `search_products` (narx/kategoriya/zaxira filtri baza
  tomonda), `add_to_cart`, `start_checkout`. Savatni SERVER
  o'zgartirmaydi: `actions` qaytadi, kanal o'zi qo'llaydi.
- `image-search.ts` — mijoz suratidan qidiruv so'zlari (Claude vision)
  → `searchCatalog`. Sayt/ilovadagi 📷 tugmasi va botdagi har qanday
  surat shu oqimga tushadi.
- `images.ts` — Claude vision bilan rasm tahlili va Gemini
  ("Nano Banana", `GEMINI_API_KEY`) bilan rasm generatsiyasi. Prompt
  har doim "mahsulot o'zgarmasin" cheklovi bilan ketadi.

Kirish yo'llari (`NEXT_PUBLIC_AUTH_PROVIDERS`) — Firebase konsolida
yoqilgan provayderlargina ro'yxatga qo'shiladi.

## Do'kon ekrani (`/tv`) va desktop ilova (`desktop/`)

- **`/tv`** — do'konga osilgan televizor uchun sahifa (ilova EMAS,
  brauzer kiosk rejimida ochadi). Sozlamasi `settings/tv`, boshqaruvi
  `/admin/tv`. Narx u yerda **har doim DONA narx** (`priceForRole`
  orqali `undefined` rol bilan) — televizorni hamma ko'radi.
  Rasmsiz mahsulot ekranga chiqmaydi. Slaydlar 2 daqiqa keshlanadi
  (`lib/tv/slides.ts`), so'rovlar mavjud indekslarga tayanadi.
  QR kod tashqi xizmatsiz — `qrcode-generator` → SVG. Tartib:
  `docs/TV.md`.
- **`desktop/`** — Electron ilovasi: saytning O'ZINI ochadi, UI
  takrorlanmaydi. Root tooling'dan chiqarilgan (`tsconfig` exclude,
  `eslint.config.mjs` ignores) — `mobile/` kabi. Sandbox'da
  yig'ilmaydi; `.github/workflows/desktop.yml` Windows `.exe` va
  Linux `.AppImage` yasab **`desktop-latest`** relizga qo'yadi
  (Android APK relizi `latest` alohida). Ikonka koddan chiziladi:
  `node desktop/build/make-icon.js`. Tartib: `docs/DESKTOP.md`.

## Mobil ilova (`mobile/`)

React Native CLI (bare, RN 0.76) — **faqat mijozlar uchun**. Sayt bilan
bir xil Firebase loyihasi va bir xil API'dan foydalanadi:
katalog/qidiruvni to'g'ridan-to'g'ri Firestore'dan o'qiydi, buyurtma va
sharhni esa saytning API'si orqali yuboradi (`Authorization: Bearer
<Firebase ID token>` — server tomonda `getAppUserFromRequest`).

- `mobile/` root tooling'dan chiqarilgan: `tsconfig.json` exclude va
  `eslint.config.mjs` ignores ichida. Tekshiruv alohida:
  `cd mobile && npx tsc --noEmit` va `npx eslint 'src/**/*.tsx' --no-ignore`.
- APK/IPA bu sandbox'da yig'ilmaydi (Android SDK/Xcode yo'q) — kod
  tayyor, yig'ish lokal kompyuterda. Tartib `mobile/README.md` da.
- `google-services.json` / `GoogleService-Info.plist` repoda YO'Q —
  ularni Firebase konsolidan olib qo'yish kerak.

## Qolgan/kutilayotgan ishlar

- Ko'p tillik: interfeys uz/en/ru tayyor; mahsulot nomi/tavsifi uchun
  ixtiyoriy `nameRu/nameEn/descriptionRu/descriptionEn` maydonlari bor
  (`lib/products/i18n.ts`), tarjima yo'q bo'lsa o'zbekchasi ko'rinadi.
- Payme/Click to'lovi va karta saqlash: kod tayyor, merchant kalitlari
  kelgach test kabinetida sinaladi.
- To'liq "hamma narsa Telegramda" pariteti; profil rasm/email/parol tahrirlash.

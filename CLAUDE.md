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
- **Kanal postida tur qatori**: avval QIYMAT, keyin NARX, oxirida
  KOD (`Satin Gold — 91 400 so'm · kod: SJ-03`). Ilgari kod oldida
  turardi va qaysi narx qaysi kodga tegishli ekani bilinmasdi.
  Tartib: nomi → brend/davlat → kategoriya → narx → turlar → material
  (`buildProductText`, testi `channel.test.ts`).
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
  Bir nechta qator `|` bilan: `Tur nomi: O'lcham|Rangi|Qalinlik` va
  `50x60|Oq|0.8mm - 96000 - 3 - BS7677`. **3 qatordan ko'p bo'lmaydi**
  (mahsulot sxemasi ham `max(3)`), qiymatlar soni mos kelmasa o'sha
  qator tashlanadi va bot sababini aytadi. Telegram kirimida ham
  MATERIAL majburiy emas.
- Importda `retailMarkupPercent` (dona ustamasi, foizda) ustuni bor;
  notanish kategoriya/material avtomatik ochiladi, material esa
  ixtiyoriy.
- 1C narxnomasi (brendlar alohida varaqda, narx dollarda) →
  `node scripts/convert-price-list.js <fayl.xlsx> [chiqish.xlsx]
  [--kurs=12600]`. Excel o'qish/yozish - `scripts/lib/xlsx.js`
  (tashqi kutubxonasiz).
- **Mavjud bo'lmagan kombinatsiya**: qatorlardan hamma kombinatsiya
  yasaladi, lekin ba'zisi ishlab chiqarilmaydi. Jadvaldagi 🗑 bilan
  o'chirilgan qator kaliti `Product.variantsExcluded` ga tushadi va
  `normalizeVariants(axes, variants, excluded)` uni QAYTA YASAMAYDI
  (aks holda har tahrirda tiklanib turardi). Qatorlar o'zgarsa
  eskirgan kalitlar tozalanadi; testlari `variants.test.ts` da.

## Kategoriya/material nomini tanish (`matchTaxonomy`)

Bot va import kategoriyani NOMI bo'yicha topadi. Solishtirish oldidan
ikkala tomon `foldForMatch()` dan o'tadi: kichik harf, apostrofsiz,
harf/raqamdan boshqasi olib tashlangan va **kirill egizak harflari
lotinga o'girilgan** (`е→e`, `а→a`, `о→o` ...). 1C narxnomasidan
kelgan nomlarda lotin so'z ichida kirill harfi bo'ladi — ekranda
bilinmaydi, lekin bot ro'yxatda TURGAN kategoriyani "tanilmadi" deb
rad etardi. Keyin: ichida uchrashi → 1-2 harf xatosi (Levenshtein,
5-7 harfda 1 ta, undan uzunida 2 ta). Topilmasa `suggestTaxonomy()`
bilan eng yaqin 5 ta nom xato xabarida ko'rsatiladi.

## Mahsulot formasidagi majburiy maydonlar

Majburiy: **Nomi, Kodi/artikul, Tannarx, Optom narx, Soni (zaxira),
Kategoriya** (+ sotish turi - u "dona" bilan to'la keladi). **Material
MAJBURIY EMAS** - 1C narxnomasidan kelgan mahsulotlarning ko'pchiligida
u yozilmagan, talab qilinsa kirim to'xtardi (`material: z.string()
.max(60).default("")`). Tekshiruv formada (`ProductForm.handleSave`);
server bag'rikeng qoladi - bot kirimi va import ham shu route'lardan
o'tadi.

**Brend va ishlab chiqarilgan davlat qo'lda yozilmaydi** - ro'yxatdan
tanlanadi. Ro'yxat `metadata/facets` da (`lib/products/facets.ts`),
boshqaruvi `/admin/katalog/turlar` + `/api/admin/facets`. Mahsulotda
slug emas, MATNNING O'ZI saqlanadi, shuning uchun qayta nomlash
mahsulotlarni ham yangilaydi (`renameFacetValue`, 400 tadan bo'lib);
o'chirish faqat ishlatilmayotgan bo'lsa.

## Tahrirdan qayerga qaytish (`?qayt=`)

Mahsulot tahrir sahifasi saqlagach doim `/admin/katalog` ga otardi va
"Katalogni tartibga solish" da ishlayotgan xodim filtr/qidiruv/sahifani
qaytadan tiklashga majbur bo'lardi. Endi havola
`?qayt=<manzil>` bilan keladi (`EditProductClient` uni `/admin/` bilan
boshlanishiga tekshiradi - ochiq redirect bo'lmasin). Tartiblash
sahifasi holatini manzilga yozadi (`?q=`, `?kategoriya=`, `?brend=`,
`?sahifa=`) va server `searchParams` orqali `CatalogCleanup` ga
`initial` bo'lib uzatiladi. Kirim sahifasidagi ✏️ ham shu bilan
qaytadi.

## O'chirilganlar savati (30 kun)

Mahsulot **butunlay o'chirilmaydi**: `deletedProducts/{id}` ga
ko'chiriladi (`lib/products/trash.ts`) va 30 kun turadi —
`/admin/katalog/chiqindi` dan tiklanadi yoki butunlay o'chiriladi;
muddati o'tganlari ro'yxat ochilganda avtomatik tozalanadi (alohida
cron kerak emas). Tiklangan mahsulot **saytda YOPIQ** holda qaytadi
(`isActive: false`) — tasodifan o'chirilgan minglab mahsulot birdan
katalogga qaytib, kanalga e'lon bo'lib ketmasin. Storage'dagi rasm
fayllari o'chirilmaydi, shuning uchun tiklangach rasmlar joyida.
`deletedProducts` qoidalarda YOPIQ (ichida optom narx/tannarx bor).

## Katalog indekslari (buzilmasin)

Katalog so'rovi `where isActive == true` + `orderBy` (createdAt/price/
salesCount) — bunga **kompozit indeks kerak** (`firestore.indexes.json`).
Indeks deploy qilinmagan bo'lsa Firestore `FAILED_PRECONDITION` beradi
va katalog BO'SH ko'rinadi (bosh sahifa esa ishlayveradi — u boshqa
indeksdan foydalanadi). Shu sabab `queryProductsPage` endi indeks
yo'qligini tanib, **zaxira so'rovga** o'tadi: faqat tenglik filtrlari
+ `__name__` tartibi (indekssiz ishlaydi), saralash sahifa ichida
xotirada. Katalog ishlaydi, lekin tartib to'liq to'g'ri emas —
haqiqiy yechim: `firebase deploy --only firestore:indexes`.
Tekshirish: Sozlamalar → Tizim tekshiruvi → "Katalog so'rovi"
(indeks yo'q bo'lsa Firestore havolasini ko'rsatadi).

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
- **Telegram limiti**: bitta kanalga daqiqasiga ~20 ta tahrir.
  Shuning uchun `refresh-channel` bir so'rovda 15 tadan oladi va har
  tahrir orasida 3 s kutadi; `callTelegramApi` esa 429 javobidagi
  `retry_after` ni o'qib o'zi kutib qayta uriniladi (3 martagacha).
  Ilgari 120 ms oraliq edi va 65 postdan 45 tasi yiqilardi.
- **Yangilash SABABINI aytadi.** `refreshChannelPost` endi
  `{status, reason}` qaytaradi (`updated` / `unchanged` / `missing` /
  `skipped` / `failed`): Telegram xatosi `classify()` bilan tanib
  olinadi - "post o'chirilgan" bo'lsa `channelMessageId` uzatiladi
  (mahsulotni qayta e'lon qilsa bo'ladi), "matn yo'q / izoh yo'q"
  bo'lsa teskari usul bilan qayta uriniladi. Sabablar route'da
  guruhlanib UI'da o'zbekcha yoziladi - ilgari hammasi "Telegram
  ruxsat bermadi" bo'lib chiqardi va nima bo'lganini bilib bo'lmasdi.
- **Import qilingan mahsulot saytda darhol ko'rinmaydi**:
  `/api/admin/products/import` `publish` bayrog'ini oladi (standart
  `false`) va mahsulotlarni `isActive: false` bilan yaratadi. Ochish -
  `/admin/katalog/tartib` dagi "Saytda ochish". `isActive` yagona
  ko'rinish filtri (katalog, qidiruv, bot, ilova hammasi shunga
  tayanadi) - yangi "yashirin" maydon QO'SHILMAYDI.
- Ommaviy tozalash: `/admin/katalog/tartib` + `/api/admin/products/list`
  (bitta tenglik filtri + `__name__` tartibi - kompozit indekssiz) va
  `/api/admin/products/bulk` (delete / update / announce). Ro'yxatni
  KATEGORIYA, BREND yoki QIDIRUV (`?q=` - nom/kod/artikul, butun
  katalog bo'ylab) bilan olish mumkin; uchalasi ham bir xil shaklda
  qaytadi, shuning uchun topilganlarga ommaviy amallar o'zgarishsiz
  ishlaydi. Kanalga
  ommaviy e'lon 10 tadan, orasida tanaffus bilan.
- Kirimda 20 tadan ko'p mahsulot bo'lsa kanalga e'lon qilinmaydi
  (`announce: false`).

## Yetkazib berish va o'rnatish va'dasi (bitta manba)

Mijozga aytiladigan matn — "Qo'qon ichida va atrofdagi 15 km gacha
yetkazib berish bepul" va "o'rnatib berish xizmati bor" — **kodda
qattiq yozilmaydi**. U `settings/delivery` da (`DeliverySettings`:
`city`, `freeRadiusKm`, `note`, `installEnabled`, `installNote`),
matnni esa `lib/delivery/text.ts` yasaydi (`freeDeliveryText`,
`freeDeliveryShort`, `installServiceText`; testi `text.test.ts`).
Boshqaruvi: **Sozlamalar → Promokod va yetkazib berish → "Mijozga
ko'rinadigan va'da"**.

Shu matn chiqadigan joylar: bosh sahifa va "Biz haqimizda" dagi
**"Bizning ustunligimiz"** bo'limi (`components/home/Advantages.tsx`),
savat, checkout, kontakt, footer, mahsulot sahifasi, mobil ilova
(`mobile/src/components/DeliveryNote.tsx` — sayt kodini import qila
olmagani uchun matn mantiqi `mobile/src/api.ts` da TAKRORLANGAN,
o'zgartirilsa ikkalasi ham), bot kartochkasi va manzil so'ralgan payt,
kanal posti (footer tepasida, 60 s kesh).

`lib/delivery/text.ts` da "server-only" YO'Q va hisob ham yo'q — u
faqat matn. Yetkazish NARXI avvalgidek `fee`/`freeFrom`/`zones`
bo'yicha (`lib/orders/promo.ts`).

**O'rnatib berish xizmati mahsulotga bog'liq**: `Product.installService`
(admin formada "O'rnatib berish xizmati bor" tugmachasi). Sahifada,
ilovada va kanal postida u faqat mahsulotda belgilangan VA sozlamada
xizmat yoqilgan bo'lsa chiqadi.

## Dizayn rejimi: klassik / 3D (buzilmasin)

Sayt ikki ko'rinishda: **`3d-modern`** (standart) va **`classic`**.
Tanlash tugmasi header'da, tanlov `localStorage` (`atoyo.ui-mode`) +
cookie'da. Batafsil: `docs/UI-3D.md`.

Uchta qoida:

1. **Shart bitta joyda.** Og'ir effekt chizilishini `useImmersive()`
   hal qiladi (`lib/ui-mode/useImmersive.ts`): foydalanuvchi 3D ni
   tanlagan VA qurilma ko'taradi (ekran ≥768px, ≥4 yadro/4GB, WebGL
   bor, `prefers-reduced-motion` va `saveData` yo'q). Komponentda bu
   shartni QAYTA yozmang.
2. **`three` / `gsap` / `framer-motion` statik import QILINMAYDI.**
   Faqat dinamik: `HeroCanvas` (`next/dynamic`, `ssr:false`),
   `Reveal` (`await import("gsap")`), `GlassCard` (`LazyMotion`).
   Klassik rejimdagi mijoz bu paketlarni umuman yuklamaydi.
3. **3D uchun tashqi fayl yo'q** — `.glb` ham, `.hdr` ham. Shakllar
   koddan (`HeroScene.tsx`), yorug'lik `Lightformer` bilan xotirada.
   CSP tashqi hostni bloklaydi va bu ATAYLAB yumshatilmaydi.

Sahna ko'rinmasa yoki varaq orqada bo'lsa render to'xtaydi
(`frameloop="never"`). Yangi 3D bezakka `data-immersive-only`
atributini bering — klassik rejimda CSS uni React'dan oldin yashiradi.
Server rejimni O'QIMAYDI (Hosting faqat `__session` cookie'ni
o'tkazadi), shuning uchun `layout.tsx` dagi erta skript `<html
data-ui-mode>` ni qo'yadi — tema bilan bir xil naqsh.

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

**Blog maqolasidagi KONTENT VIDEOSI** (mahsulot videosi emas -
maslahat/ko'rsatma lavhasi): `BlogPost.videoUrl`, admin formada
"Kontent videosi" (20MB gacha, papka `blog`). Maqola chop etilganda
kanalga rasm emas VIDEO posti chiqadi (`announceBlogPost` -
`sendVideo`) va YouTube navbatiga tushadi (`enqueueBlogVideo`,
`SocialJob.kind === "blog"`, `blogId`). Ikkinchi marta yuklanmasligi
uchun natija `BlogPost.youtubeVideoId` ga yoziladi; kanal posti esa
`channelChatId`/`channelMessageId` bilan TAHRIRLANADI - maqola
yangilanganda yangi post tashlanmaydi. Navbatni cron bo'shatadi
(`/api/cron/social`).

## Tur tanlagich (segment) — sayt va ilova bir xil

Mahsulot sahifasidagi "Rangi / O'lcham" tanlagichi
`components/product/SegmentedPicker.tsx` (sayt) va
`mobile/src/components/SegmentedPicker.tsx` (ilova) da. Tanlangan
variantning orqasidagi rangli "yostiq" SAKRAMAYDI — surilib boradi
(260 ms) va uni ushlab chapga-o'ngga SUDRAB ham tanlash mumkin.

Turlar ko'p bo'lsa ular ekrandan chiqib ketmaydi — **keyingi qatorga
o'tadi** (`flex-wrap`), yostiq esa qator bo'ylab ham, qatordan qatorga
ham ko'chadi. **O'chirilgan tur qiymati qatorda qolmaydi**:
`normalizeVariants` uni `axes[].values` dan ham olib tashlaydi, sayt
va ilova esa qo'shimcha himoya sifatida turi yo'q qiymatni umuman
chizmaydi (aks holda tugma bosilganda mahsulot "tugagan" bo'lib
ko'rinardi).

Nozik joylar: yostiq tugmalarning ORQASIDA turadi (matn ustiga
chiqmasligi uchun), shuning uchun sudrash track ustida ushlanadi va
bosish yostiq chegarasida ekani tekshiriladi; sudrashdan keyingi
"click" o'tkazib yuboriladi (aks holda barmoq ostidagi tugma
tanlanib qolardi). Klaviaturada ← → ishlaydi. **Track'da
`touch-pan-y` bo'lishi SHART** — busiz telefonda brauzer barmoqni
o'zi oladi va sudrash umuman ishlamaydi (bir marta shunday bo'lgan);
u bilan vertikal varaqlash ham saqlanadi.

Tanlangan turning KODI mahsulot sahifasida ko'rsatiladi (kanal
postidagi kod bilan bir xil) — mijoz shu kod bilan buyurtma beradi.

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
npx tsc --noEmit && npx eslint <o'zgargan fayllar> && npm test && npm run build
```

**Diqqat:** sayt vitest'i ilovaning sof modulini ham sinaydi
(`mobile/src/version.test.ts`), shuning uchun `mobile/node_modules`
o'rnatilgan bo'lishi kerak — aks holda vite `mobile/tsconfig.json`
dagi `extends` ni yechа olmay yiqiladi (CI'da ham shu sabab
"Ilova paketlari" qadami sayt testlaridan OLDIN turadi).
Test framework yo'q — tekshiruv = typecheck + lint + build (+ kerak bo'lsa
`npm run start` bilan runtime tekshiruv).

## Hujjatlarni yangilab turish (MAJBURIY)

Loyihaga yangi imkoniyat qo'shilsa yoki mavjudi sezilarli o'zgarsa,
**o'sha commitning o'zida** quyidagilar yangilanadi:

- `docs/REBUILD-PROMPT.md` — loyihaning to'liq holati (boshqa AI ga
  beriladigan topshiriq). Foydalanuvchi buni doim yangi holatda
  bo'lishini so'ragan;
- `docs/DEPLOY.md` — yangi env/secret yoki sozlash qadami paydo bo'lsa;
- `CLAUDE.md` — arxitektura qoidasi yoki ish tartibi o'zgarsa;
- `README.md` — imkoniyatlar/stack/ishga tushirish o'zgarsa;
- bo'limga xos hujjat (`docs/KIRIM-VA-IMPORT.md`, `docs/TV.md`,
  `docs/DESKTOP.md`, `docs/STICKERS.md`, `mobile/README.md` ...);
- `docs/SESSION-PROMPT.md` — yangi sessiyaga beriladigan tayyor
  prompt (ish tartibi o'zgarsa u ham yangilanadi).

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

- `usage.ts` — **AI rasm sarfi va oylik chegara**. Rasm PULLIK
  (~0.04 $), shuning uchun har chizilgan rasm `aiUsage/<YYYY-MM>`
  hujjatida sanaladi va `settings/ai.monthlyImageLimit` (standart
  200, 0 — cheksiz) to'lganda `generateImage()` TO'XTAYDI.
  Boshqaruvi: Sozlamalar → "AI rasm sarfi" (`/api/admin/ai/usage`).
  Hisoblagich o'zi yiqilsa ish to'xtamaydi (u yordamchi vosita).

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

## Ilova yangilanishi (Play Market'siz)

APK to'g'ridan-to'g'ri tarqatilgani uchun telefon ilovani O'ZI
yangilamaydi. Shuning uchun:

- versiya + "nima o'zgardi" `settings/appUpdate` da (`lib/app/version.ts`),
  boshqaruvi **Sozlamalar → "Ilova yangilanishi"** (`/api/admin/app-update`);
- ilova har ochilganda `/api/app/version` (ochiq, 10 daq. kesh) dan
  o'qiydi va o'zinikidan yangi bo'lsa **oyna** ko'rsatadi: versiya,
  bandlar ro'yxati, "Yangilash" (APK brauzerda ochiladi) va
  "Keyinroq" (o'sha versiya 24 soat bezovta qilmaydi, tepada kichik
  chiziq qoladi). `mandatory` bo'lsa "Keyinroq" chiqmaydi;
- "Bildirishnoma yuborilsin" belgilansa `app-updates` mavzusiga push
  ketadi — ilova shu mavzuga obuna (`mobile/src/push.ts`);
- ilovadagi versiya `mobile/src/update.ts` dagi `APP_VERSION` — u
  `android/app/build.gradle` dagi `versionName` bilan BIR XIL bo'lishi
  shart, aks holda eslatma noto'g'ri chiqadi. Solishtirish
  `mobile/src/version.ts` da (testi `version.test.ts`, sayt
  vitest'ida ishlaydi).

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

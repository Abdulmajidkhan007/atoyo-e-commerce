# Loyiha auditi (2026-08-22)

Bu hujjat — **tashqi ko'z bilan** o'tkazilgan tekshiruv natijasi.
`CLAUDE.md`, `docs/ARXITEKTURA-TARIXI.md` va `docs/HISOBOT.md` da
allaqachon yozilgan narsalar QAYTA sanab o'tilmagan; bu yerda faqat
**yangi topilgan** narsalar bor.

Har topilma: **Fakt** (fayl:qator yoki buyruq chiqishi) → **Nega
muhim** → **Yechim** → **Mehnat** → **Xavf**.

## Tekshiruv qanday o'tkazildi

| Buyruq | Natija |
|---|---|
| `npx tsc --noEmit` | ✅ xatosiz |
| `npx eslint .` | ✅ xatosiz |
| `npm test` | ⚠️ `Test Files 1 failed \| 28 passed (29)`, `Tests 212 passed` — yiqilgani `mobile/src/version.test.ts` (2.4-bandga qarang) |
| `npm run build` | ✅ `Compiled successfully in 20.1s`, exit 0 |
| Statik tahlil | 439 fayl / 56 488 qator `src/` da; eksport qilingan, lekin hech qayerda ishlatilmagan 128 ta nom; 100 ta `console.*`; 0 ta `: any`; 0 ta `TODO/FIXME` |

**Nima yaxshi (tasdiqlangan):** `@mui/icons-material` hamma joyda
to'liq yo'l bilan import qilingan (barrel import YO'Q) — 53 fayl
tekshirildi; `three` va `gsap` haqiqatan ham faqat dinamik
(`HeroCanvas.tsx:28`, `WorldCanvas.tsx:25`, `Reveal.tsx:64`);
`publicCacheHeaders`/`NO_STORE_HEADERS` to'g'ri taqsimlangan; cron
sirlari `timingSafeEqual` bilan solishtiriladi
(`api/cron/social/route.ts:28`).

---

# 1. OLIB TASHLASH

## 1.1. `@emotion/server` — ishlatilmaydigan paket

**Fakt.** `package.json:8` da `@emotion/server` bor. `src/`,
`desktop/`, `scripts/`, `mobile/src/` bo'ylab qidiruv 0 ta natija
beradi. U `@mui/material-nextjs` ning peer'i, lekin
`node_modules/@mui/material-nextjs/package.json` da
`peerDependenciesMeta` da `"@emotion/server": {"optional": true}`, va
uni faqat `v13-pagesRouter/pagesRouterV13Document.js` ishlatadi —
loyiha esa `v16-appRouter` ni oladi (`src/app/layout.tsx:3`).

**Nega muhim.** Har `npm ci` da ortiqcha paket, xavfsizlik
audit maydoni kengroq (hozir `npm audit` 17 ta ogohlantirish beradi).

**Yechim.** `package.json` dan `@emotion/server` ni olib tashlash.
`@emotion/react`, `@emotion/styled` (MUI peer'i) va `@emotion/cache`
(`v13-appRouter/appRouterV13.js:11` ishlatadi) — QOLADI.

**Mehnat:** kichik · **Xavf:** past

## 1.2. Hech qayerda ishlatilmaydigan 14 ta eksport

**Fakt.** Quyidagi nomlar butun `src/` da FAQAT o'z ta'rifi
qatorida uchraydi (testlarda ham yo'q):

| Fayl:qator | Nom |
|---|---|
| `src/lib/firebase/auth.ts:123` | `signInWithGoogle` |
| `src/lib/firebase/auth-providers.ts:35` | `isAuthMethodEnabled` |
| `src/lib/firebase/firestore.ts:111` | `listenToOrderStatus` |
| `src/lib/payments/cards.ts:127` | `checkCard` |
| `src/lib/products/trash.ts:83` | `countTrash` |
| `src/lib/products/usePricing.ts:97` | `useProductPrices` |
| `src/lib/products/wholesale.ts:89` | `variantPriceForRole` |
| `src/lib/social/publish.ts:399` | `networkLabel` |
| `src/lib/stickers/image.ts:192` | `overlay` |
| `src/lib/stickers/art.ts:29` | `LOGO_VIEWBOX` |
| `src/lib/seo/metadata.ts:59` | `SITE_DESCRIPTION` |
| `src/lib/delivery/text.ts:70` | `INSTALL_BADGE` |
| `src/types/social.ts:12` | `SOCIAL_NETWORKS` |
| `src/redux/store.ts:49` | `persistor` |

**Nega muhim.** `signInWithGoogle` — eng chalg'ituvchisi: u
`ensureUserDocument` + `syncSessionCookie` ni chaqiradi, ya'ni
"ishlaydigan" kirish yo'liga o'xshaydi, lekin hech kim chaqirmaydi
(kirish umumiy `signInWithSocial` orqali ketadi). Yangi dasturchi
xatoni shu funksiyada qidiradi.

**Yechim.** Ro'yxatdagilarni o'chirish. `persistor` — ISTISNO:
`persistStore(store)` chaqiruvining O'ZI kerak (redux-persist shu
yerda ulanadi), faqat `export` so'zini olib tashlang.

**Mehnat:** kichik · **Xavf:** past

## 1.3. `escapeHtml` beshta faylda takrorlangan

**Fakt.** Bir xil funksiya beshta joyda:
`src/lib/telegram/templates.ts:5`, `src/lib/telegram/channel.ts:47`,
`src/lib/telegram/product-intake.ts:87`, `src/lib/broadcast.ts:114`,
`src/lib/wholesale/clients.ts:323`.

**Nega muhim.** Nusxa ko'p bo'lgani uchun "escape kerak" degan qoida
ko'rinmay qolgan: eng katta uchta bot faylida u UMUMAN yo'q
(2.2-bandga qarang) — `grep -c escapeHtml customer-bot.ts
admin-session.ts admin-commands.ts` → `0 0 0`.

**Yechim.** `src/lib/telegram/html.ts` yaratib, `escapeHtml` ni
o'sha yerdan eksport qilish; beshta nusxani import bilan almashtirish.

**Mehnat:** kichik · **Xavf:** past

## 1.4. `money()` to'rtta faylda — va u `format.ts` qoidasini buzadi

**Fakt.** `src/lib/format.ts:11-14` da qoida yozilgan:
*"`toLocaleString` ISHLATILMAYDI. U ICU ma'lumotiga bog'liq:
serverdagi Node va brauzerdagi natija farq qilsa React 'hydration
mismatch' beradi."* Shunga qaramay to'rtta faylda AYNAN
`toLocaleString("ru-RU")` bilan yozilgan nusxa bor:

- `src/lib/ai/context.ts:37`
- `src/lib/ai/tools.ts:239`
- `src/app/api/admin/expenses/route.ts:47`
- `src/components/admin/ExpensesPanel.tsx:61` (**`"use client"`**)

**Nega muhim.** Ikki oqibat. Birinchisi — format farqi:
`formatSom()` uzilmas bo'sh joy (U+00A0) bilan guruhlaydi, `money()`
esa uni oddiy bo'sh joyga almashtiradi (`.replace(/ /g, " ")`),
ya'ni AI yordamchisi va xarajatlar paneli saytdagidan boshqacha narx
yozadi. Ikkinchisi — `ExpensesPanel.tsx` client komponent, ya'ni
`format.ts` ogohlantirgan hydration xavfi aynan shu yerda tirik.

**Yechim.** To'rtala nusxani o'chirib, `formatSom` ni
`@/lib/format` dan import qilish.

**Mehnat:** kichik · **Xavf:** o'rta

## 1.5. Excel importi ikkita route'da takrorlangan

**Fakt.** `parseXlsx` + `cellToText`:
`src/app/api/admin/products/import/route.ts:31,42` va
`src/app/api/admin/wholesale/import/route.ts:43,48`. Bundan
tashqari `normalizeHeader` `src/lib/products/csv.ts:114` da
EKSPORT qilingan, lekin `wholesale/import/route.ts:35` uni qaytadan
yozgan.

**Nega muhim.** Bir xil Excel fayl ikki route'da boshqacha
o'qilishi mumkin (1C narxnomasidagi bo'sh katakcha, sana formati,
son ajratgichi). Xato topilganda ikkala joyni ham tuzatish esdan
chiqadi.

**Yechim.** `src/lib/products/xlsx.ts` yaratib, `parseXlsx` +
`cellToText` ni o'sha yerga ko'chirish; `normalizeHeader` ni
`csv.ts` dan import qilish.

**Mehnat:** kichik · **Xavf:** past

## 1.6. `storage.rules` — o'lik va qoidaga zid

**Fakt.** `storage.rules` faqat `products/{productId}/{fileName}`
yo'lini biladi; `isAdmin()` esa faqat `role == 'admin'` ni tekshiradi
(`firestore.rules` dagi `isAdmin()` esa `['admin','owner']`).
`CLAUDE.md` bo'yicha papkalar uchta: `products/<id>`, `blog`, `site`
va **hamma yozuv Admin SDK orqali** ketadi
(`src/lib/firebase/admin-storage.ts:1` — `import "server-only"`),
ya'ni bu qoidalar amalda hech qachon qo'llanmaydi.

**Nega muhim.** O'lik qoida chalg'itadi: `blog/` va `site/`
papkalari "himoyalanmagan" ko'rinadi (aslida ular `allow` yo'qligi
uchun client'ga umuman yopiq), `owner` esa "admin emas" bo'lib
turibdi. Kimdir Storage'ni client SDK'ga ochmoqchi bo'lsa shu
qoidadan boshlaydi va yanglishadi.

**Yechim.** `storage.rules` ni bitta ochiq qoidaga qisqartirish:
`match /{allPaths=**} { allow read: if false; allow write: if false; }`
va yuqorisiga "hamma yozuv Admin SDK orqali, fayllar download-token
URL bilan ochiladi" izohi.

**Mehnat:** kichik · **Xavf:** past

---

# 2. QO'SHISH

## 2.1. 🔴 TANNARX mijozning brauzeriga yetib boradi

**Fakt.** Uch qadam:

1. `src/lib/orders/create-order.ts:137` va `:154` — buyurtma
   qatoriga `costPrice` yoziladi; `:237` — `items: verifiedItems`
   buyurtma hujjatiga saqlanadi (`src/types/order.ts:15`).
2. `firestore.rules` — `match /orders/{orderId}`:
   `allow read: if isAdmin() || (isSignedIn() && resource.data.userId
   == request.auth.uid)`.
3. `src/app/(main)/profil/page.tsx:95` →
   `src/lib/firebase/firestore.ts:126 subscribeToUserOrders()` →
   `onSnapshot(...)` → `{ id, ...d.data() }` — **butun hujjat**
   client Firebase SDK bilan o'qiladi.

Ya'ni buyurtma bergan har qanday mijoz brauzer konsolida o'zi sotib
olgan mahsulotlarning TANNARXini ko'radi.

**Nega muhim.** Bu `CLAUDE.md` 1-qoidasining ("costPrice mijozga
UMUMAN ketmaydi") va `docs/ARXITEKTURA-TARIXI.md` §1 dagi butun
qayta qurishning to'g'ridan-to'g'ri buzilishi. `products`
kolleksiyasi yopilgan, `toViewerProduct()` yozilgan — lekin
tannarxning ikkinchi nusxasi buyurtma ichida ochiq qolib ketgan.
Raqobatchi bitta arzon buyurtma berib, o'zi tanlagan mahsulotning
tannarxini o'lchay oladi.

**Yechim.** Tannarxni buyurtma hujjatidan ajratish — hisobot uchun u
baribir kerak (`src/app/api/admin/reports/route.ts:82`):

- `create-order.ts` da `costPrice` ni `orders/{id}` ga emas,
  `orderCosts/{orderId}` hujjatiga yozish (`{ items: [{productId,
  variantId, costPrice}] }`), `firestore.rules` da
  `orderCosts` — `allow read, write: if false`;
- `api/admin/reports/route.ts` da narx bo'yicha
  `db.getAll(...)` bilan qo'shib o'qish;
- `types/order.ts:15` dan `costPrice` ni olib tashlash (tsc qolgan
  joylarni o'zi ko'rsatadi).

Muqobil (kichikroq, lekin real-vaqt statusi yo'qoladi): profil
buyurtmalarini `onSnapshot` o'rniga `/api/profile/orders` server
route'i orqali, tozalangan proyeksiya bilan berish.

**Mehnat:** o'rta · **Xavf:** yuqori

## 2.2. 🔴 Telegram botda HTML escape yo'q — sharh orqali inyeksiya

**Fakt.** `src/lib/telegram/bot.ts:118,122` — har bir xabar
`parse_mode: "HTML"` bilan ketadi. Uchta eng katta bot faylida esa
escape UMUMAN chaqirilmaydi:
`grep -c "escapeHtml" customer-bot.ts admin-session.ts
admin-commands.ts` → **`0 0 0`**.

Aniq yo'l: mijoz `/api/products/[id]/reviews` ga sharh yuboradi;
tekshiruv faqat uzunlik — `route.ts:11` `comment: z.string().min(3)
.max(1000)`, `src/lib/reviews/save-review.ts:32` esa
`comment.trim()` ni XOM saqlaydi. Keyin botda o'sha mahsulotning
sharhlari ochilganda:

```
src/lib/telegram/customer-bot.ts:1164
.map((r) => `${"⭐️".repeat(r.rating)}\n<b>${r.authorName}</b>: ${r.comment}`)
```

**Nega muhim.** Ikki oqibat:

1. **Post yiqiladi.** `<b>x` kabi yopilmagan teg Telegram'da
   `Can't find end tag corresponding to start tag "b"` beradi,
   `callTelegramApi` (`bot.ts:80`) xato tashlaydi — o'sha mahsulot
   sharhlari bot'da BOSHQA hech kimga ochilmaydi. Bu aynan
   `docs/ARXITEKTURA-TARIXI.md` §6.2a dagi nosozlik: kanalga
   `truncateHtml()` qo'yilgan, botga esa qo'yilmagan.
2. **Fishing havolasi.** `<a href="http://...">Rasmiy sayt</a>`
   yozilgan sharh do'konning O'Z botida bosiladigan havola bo'lib
   chiqadi.

`authorName` ham xavfsiz emas: u `user.displayName` dan keladi,
`isValidName` (`src/lib/validation.ts:26`) esa faqat "kamida 2 ta
harf" ni talab qiladi — `<` va `>` o'tadi.

Boshqa escape qilinmagan joylar: `customer-bot.ts:279`
(`<b>${user.name}</b>`), `:462` (mahsulot nomi), `:1225` (blog
sarlavhasi va matni).

**Yechim.** 1.3-banddagi umumiy `escapeHtml` ni yaratib,
`customer-bot.ts`, `admin-session.ts`, `admin-commands.ts` dagi
HAMMA `${...}` ni o'ragan holda qo'llash. Qo'shimcha qalqon:
`bot.ts` ichida `sendChatMessage` xatosini tanib olib
(`can't parse entities`), matnni `parse_mode`siz qayta yuborish —
shunda inyeksiya bo'lsa ham ekran ishlayveradi. Testi:
`customer-bot` sharhlar matnini yasovchi funksiyani ajratib,
`<b>` li sharh bilan snapshot test.

**Mehnat:** o'rta · **Xavf:** yuqori

## 2.3. 🟠 Rate limit `X-Forwarded-For` bilan chetlab o'tiladi

**Fakt.** `src/lib/rate-limit.ts:60`:

```ts
const forwarded = request.headers.get("x-forwarded-for");
return forwarded?.split(",")[0]?.trim() || "unknown";
```

Ro'yxatning BIRINCHI qiymati olinadi — uni mijozning o'zi yozadi
(Google LB haqiqiy IP ni oxiriga qo'shadi, boshiga emas). Shu IP 12
ta endpoint kaliti bo'lib turadi, jumladan:

- `src/app/api/search/image/route.ts:37` — har so'rov Claude vision
  chaqiruvi (pul);
- `src/app/api/assistant/route.ts:40` — har so'rov Anthropic
  chaqiruvi (pul);
- `src/app/api/auth/reset-password/route.ts:50` — email seli;
- `src/app/api/contact/route.ts:25`, `subscribe/route.ts:15`,
  `products/[id]/reviews/route.ts:30`.

`curl -H "X-Forwarded-For: 1.2.3.$RANDOM"` bilan hamma chegara
cheksiz bo'ladi.

**Nega muhim.** AI chegarasi (`soatiga 10 ta`) faqat halol
foydalanuvchini to'xtatadi. Anthropic hisobini bir kechada
bo'shatish uchun oddiy skript yetarli.

**Yechim.** `getClientIp` da OXIRGIDAN oldingi qiymatni olish
(Google Cloud LB formati: `<client>, <lb>`), ya'ni
`parts.at(-2) ?? parts.at(-1)`; ishonchli variant — Firebase
Hosting/Cloud Run beradigan `x-forwarded-for` ning oxirgi ikki
bo'g'inini olish va IP formatini `/^[0-9a-f:.]+$/i` bilan
tekshirish. Pulli endpointlarga (`assistant`, `search/image`)
qo'shimcha ravishda kirgan foydalanuvchi `uid` si bo'yicha ikkinchi
chegara qo'yish (kirmaganlarga umuman yopish yoki kunlik global
chegara). Testi: `rate-limit.test.ts` — `getClientIp` uchun bir
necha header ko'rinishi.

**Mehnat:** kichik · **Xavf:** yuqori

## 2.4. 🟠 `npm test` konteyner tiklangandan keyin YIQILADI

**Fakt.** Shu sessiyada:

```
Test Files  1 failed | 28 passed (29)
FAIL  mobile/src/version.test.ts
TSConfckParseError: failed to resolve "extends":
"@react-native/typescript-config/tsconfig.json" in mobile/tsconfig.json
```

`vitest.config.ts:25` ilova testini ham qo'shadi, `mobile/tsconfig.json`
esa `@react-native/typescript-config` ga tayanadi.
`.github/workflows/ci.yml:39-41` buni bilib, `mobile` da alohida
`npm ci` qiladi. `.claude/hooks/session-start.sh:28-30` esa FAQAT
root `node_modules` ni tiklaydi — `mobile/` ga tegmaydi.

**Nega muhim.** `CLAUDE.md` → "Tekshiruv (commit oldidan MAJBURIY)"
zanjiri `npm test` da uziladi. Har konteyner recycle'dan keyin
majburiy tekshiruv qizil, va bu "loyihaning o'z nosozligi emas" deb
o'rganib qolinsa — HAQIQIY yiqilgan test ham shu shovqin ichida
ko'rinmay ketadi.

**Yechim.** `.claude/hooks/session-start.sh` oxiriga:

```bash
if [ ! -d mobile/node_modules/@react-native/typescript-config ]; then
  (cd mobile && npm install --no-audit --no-fund) || true
fi
```

**Mehnat:** kichik · **Xavf:** o'rta

## 2.5. 🟠 Katalog filtrlarining yarmi indekssiz — va zaxira so'rov sahifani kesib tashlaydi

**Fakt (a) — indeks yo'q.** `src/lib/products/catalog-server.ts:55-79`
quyidagi so'rovlarni yasashi mumkin: `isActive` + {category, brand,
material, manufacturerCountry} + {`stock > 0`, `price >=`, `price <=`}
+ orderBy {createdAt↓, price↑, price↓, salesCount↓}.
`firestore.indexes.json` da esa `stock` maydoni **umuman yo'q**, va
quyidagilar ham yo'q: `brand`/`material`/`manufacturerCountry` +
`price`, har qanday filtr + `salesCount`, `category` +
`manufacturerCountry`. Filtrlarning hammasi UI'da ochiq —
`src/components/product/FilterPanel.tsx:107,122,137,150,161`.

**Fakt (b) — zaxira so'rovda sahifa "yeb ketiladi".**
`catalog-server.ts:141` bazadan `pageSize` (24) ta hujjat oladi,
`:143-148` esa `inStockOnly`/`minPrice`/`maxPrice` ni **xotirada**
filtrlaydi. Natijada mijozga 24 emas, masalan 3 ta mahsulot
ko'rinadi, `hasMore` esa `:167` da FILTRLANMAGAN 24 taga qarab
hisoblanadi.

**Nega muhim.** `docs/ARXITEKTURA-TARIXI.md` §5 "katalog bo'sh
ko'ringan kun" ni hikoya qiladi va zaxira so'rovni yechim deb yozadi.
Amalda zaxira so'rov narx filtri bilan birga ishlaganda katalog
YANA deyarli bo'sh ko'rinadi — faqat endi sababi boshqa. Va
`firebase deploy --only firestore:indexes` qilinganda ham "faqat
mavjudlar" filtri baribir zaxira yo'lda qoladi: unga indeks yozilmagan.

**Yechim.**
1. `firestore.indexes.json` ga yetishmayotgan kombinatsiyalarni
   qo'shish — eng avvalo `isActive + stock + createdAt`,
   `isActive + brand + price` (↑ va ↓), `isActive + category +
   salesCount`.
2. `fallbackPage` da filtrni oldindan hisobga olish: kerakli sondan
   ko'proq (masalan `pageSize * 4`) o'qib, filtrdan keyin `pageSize`
   tagacha kesish; `hasMore` ni FILTRLANGANdan keyin hisoblash.
3. `catalog-server.test.ts` ga zaxira yo'l uchun test: 24 ta
   hujjatdan 3 tasi narx filtridan o'tsa, javobda 3 ta mahsulot va
   to'g'ri `hasMore` bo'lishi.

**Mehnat:** o'rta · **Xavf:** o'rta

## 2.6. 🟠 To'lov bekor qilinganda buyurtma "kutilmoqda" bo'lib qoladi

**Fakt.** `src/app/api/payments/payme/route.ts:150-162`
(`CancelTransaction`) faqat `paymeState`, `paymeCancelTime` va
`paymentStatus: "failed"` ni yozadi. `order.status` tegilmaydi,
zaxira qaytarilmaydi. Xuddi shunday
`src/app/api/payments/click/route.ts:108-111`: Click xato yuborsa
`paymentStatus: "failed"` qo'yiladi, xolos. Zaxira qaytarish mantig'i
esa faqat `src/lib/orders/update-status.ts` ichida
(`stockReturned` bayrog'i bilan) va u chaqirilmaydi.

**Nega muhim.** Buyurtma yaratilganda zaxira DARHOL kamayadi
(`create-order.ts:216`). To'lov bekor bo'lgan buyurtma esa
"pending" bo'lib turaveradi va mahsulot **sotilmagan holda
band** qoladi. Bir necha o'nlab tashlab ketilgan onlayn to'lov
katalogni "tugagan" qilib qo'yishi mumkin.

**Fakt (b).** `click/route.ts:39` — ichki xato bo'lganda javob
`{ error: -1 }` (imzo xatosi). Click uchun bu "bu so'rov bilan
gaplashmayman" degani va u qayta urinmaydi; agar xato
`PerformTransaction` bosqichida bo'lsa, pul mijozdan yechilgan,
buyurtma esa "to'lanmagan" bo'lib qoladi.

**Fakt (c).** Payme/Click imzosi oddiy `===` / `!==` bilan
solishtiriladi (`payme/route.ts:61`, `click/route.ts:72`), holbuki
`cron/social/route.ts:28` da bir xil vazifa uchun `timingSafeEqual`
ishlatilgan.

**Yechim.**
- Payme `CancelTransaction` va Click `error != 0` yo'llarida
  `applyOrderStatusUpdate(orderId, "cancelled")` chaqirish (u
  zaxirani `stockReturned` bilan bir marta qaytaradi va guruhga
  xabar beradi).
- `click/route.ts` catch'ida `-1` o'rniga HTTP 500 qaytarish —
  Click qayta uriladi va tranzaksiya yo'qolmaydi.
- Imzo solishtirishni `timingSafeEqual` ga o'tkazish (cron'dagi
  `secretMatches` ni umumiy modulga chiqarib).
- Testlar (hozir umuman yo'q): Payme uchun `CheckPerform →
  Create → Perform → Cancel` zanjiri, Click uchun to'g'ri va
  noto'g'ri MD5, summa mos kelmasligi, takroriy `Perform`.

**Mehnat:** o'rta · **Xavf:** yuqori

## 2.7. 🟡 Narx sozlamasi jimgina 5% ga tushib ketishi mumkin

**Fakt.** `src/lib/products/pricing-settings.ts:29-32`:

```ts
} catch {
  // Sozlama o'qilmasa standart qiymat bilan ishlayveramiz.
  return DEFAULT_PRICING_SETTINGS;
}
```

`DEFAULT_PRICING_SETTINGS.retailMarkupPercent` =
`DEFAULT_RETAIL_MARKUP` (`src/lib/products/wholesale.ts:34`, standart
5%). Xuddi shunday `src/lib/orders/pricing.ts:16` —
`DEFAULT_DELIVERY_SETTINGS`.

**Nega muhim.** Do'kon ustamani, masalan, 30% qilib qo'ygan bo'lsa,
Firestore'ning bir daqiqalik uzilishida sayt, bot va kanal 5%
ustama bilan narx ko'rsata boshlaydi va **buyurtma o'sha narxda
qabul qilinadi** (`create-order.ts` narxni serverda qayta
hisoblaydi — o'sha buzilgan sozlama bilan). Hech kim xabar
topmaydi: `catch` bo'sh.

**Yechim.** Ikkala `catch` ga `reportError("Narx sozlamasi",
error)` qo'shish (`src/lib/ops/report-error.ts` allaqachon bor va
takrorlanishni o'zi bostiradi). Kuchliroq variant: oxirgi
MUVAFFAQIYATLI qiymatni keshda saqlab, xato bo'lganda standart
emas, **eski** qiymatni qaytarish (`cache` allaqachon bor, faqat
`TTL` tekshiruvini xato yo'lida o'tkazib yuborish kerak).

**Mehnat:** kichik · **Xavf:** o'rta

## 2.8. 🟡 Bot yiqilsa hech kim bilmaydi

**Fakt.** `src/app/api/telegram-webhook/route.ts:301`:

```ts
} catch (error) {
  console.error("Webhook update'ini qayta ishlashda xato:", error);
}
```

`reportError()` butun loyihada atigi 6 joyda chaqiriladi
(`api/orders`, ikkita cron, `client-error`, Payme, Click), `console.*`
esa 100 joyda. Bot — do'konning asosiy sotuv kanali — ro'yxatda yo'q.

**Nega muhim.** 2.2-banddagi kabi nosozlik yuz berganda mijoz
botdan hech qanday javob olmaydi, xodimlar esa buni faqat mijoz
qo'ng'iroq qilganda biladi. Cloud Run loglarini hech kim ochmaydi —
`report-error.ts:7-9` izohining o'zi shuni yozadi.

**Yechim.** Shu `catch` ni `await reportError("Telegram webhook",
error, { updateType: ... })` ga o'tkazish. Xuddi shu `api/admin/
telegram/webhook/route.ts` va `api/contact/route.ts` uchun ham.

**Mehnat:** kichik · **Xavf:** o'rta

## 2.9. 🟡 `/api/admin/upload` — huquq emas, faqat "xodimmi" tekshiriladi

**Fakt.** `src/app/api/admin/upload/route.ts:17` —
`requireAdminUser()`, ya'ni `isStaff()`. Boshqa hamma mahsulot
route'i `requirePermission("products")` ishlatadi
(`api/admin/products/route.ts`, `.../[id]/route.ts`, `.../bulk`...).

**Nega muhim.** `permissions.ts:52-62` bo'yicha faqat `orders`
huquqi berilgan admin ham Storage'ga ixtiyoriy `folder` ga fayl
yuklay oladi va u ochiq download-token URL oladi
(`admin-storage.ts:56`). Yo'l traversal xavfi yo'q (`:39`
`folder.replace(/[^a-zA-Z0-9/_-]/g, "_")`), lekin huquqlar modeli
teshik.

**Yechim.** `folder` ga qarab huquq tanlash: `blog` bo'lsa
`requirePermission("blog", request)`, qolganida
`requirePermission("products", request)`. Ruxsat etilgan prefikslar
ro'yxatini ham qattiq belgilash (`products/`, `blog`, `site`).

**Mehnat:** kichik · **Xavf:** o'rta

## 2.10. 🟡 `/k/<id>` cheksiz yozuv yaratadi

**Fakt.** `src/app/k/[id]/route.ts:24` — ochiq route, rate limit
yo'q; `src/lib/telegram/channel-stats.ts:59 trackChannelClick(id)`
mahsulot mavjudligini tekshirmasdan `channelClicks/{id}` hujjatiga
`set(..., { merge: true })` qiladi.

**Nega muhim.** Skript `/k/<tasodifiy>` ni chaqirib `channelClicks`
ni cheksiz hujjat bilan to'ldira oladi — Firestore yozuv puli va
`/kanal` statistikasi axlati.

**Fakt (b).** Shu faylning izohi "Sanash mijozni kutdirmaydi"
deydi, kod esa `await trackChannelClick(id)` ni redirect'dan OLDIN
bajaradi — ya'ni kutdiradi.

**Yechim.** Yozishdan oldin `products/{id}` mavjudligini tekshirish
(yoki `channelClicks` ni faqat `channelMessageId` bor mahsulotlarga
yozish) + `checkRateLimit` qo'shish. Izohni kodga moslashtirish
(yoki `void trackChannelClick(id)` qilib haqiqatan kutdirmaslik).

**Mehnat:** kichik · **Xavf:** past

## 2.11. Test yo'q qolgan MUHIM mantiq

**Fakt.** 28 ta test fayli bor (`src/**/*.test.ts`), quyidagilar
ro'yxatda yo'q:

| Fayl | Nega muhim |
|---|---|
| `src/lib/orders/create-order.ts` | Buyurtma summasi, promokod, zaxira, eng kam summa — 300+ qator, PUL |
| `src/app/api/payments/payme/route.ts` | JSON-RPC holatlari, tiyin hisobi |
| `src/app/api/payments/click/route.ts` | MD5 imzo, prepare/complete |
| `src/lib/orders/update-status.ts` | Zaxirani QAYTA qaytarmaslik (`stockReturned`) |
| `src/lib/permissions.ts` | `isOwner`/`hasPermission` — butun avtorizatsiya shu yerda |
| `src/lib/rate-limit.ts` | 2.3-band |
| `src/lib/storage/cleanup.ts` | 3.3-band (fayl o'chirish) |
| `src/lib/reviews/save-review.ts` | Reyting tranzaksiyasi |

`docs/HISOBOT.md` "To'lov yo'llari testsiz" ni allaqachon aytadi;
yangisi shuki — `create-order.ts`, `update-status.ts`,
`permissions.ts` va `cleanup.ts` ham testsiz, ular esa merchant
kalitisiz ham to'liq sinaladi (hammasi sof mantiq + Firestore
mock).

**Yechim.** Avval `permissions.test.ts` va `create-order.test.ts`
(Firestore'ni `channel-announce.test.ts` dagi uslubda mock qilib) —
ikkalasi ham merchant kalitini kutmaydi.

**Mehnat:** o'rta · **Xavf:** o'rta

---

# 3. OPTIMIZATSIYA

## 3.1. 🔴 CSV eksport butun katalogni bir so'rovda o'qiydi

**Fakt.** `src/app/api/admin/products/export/route.ts:15`:

```ts
const snap = await getAdminDb().collection("products").get();
```

Cheklov ham, kursor ham, `maxDuration` ham yo'q (taqqoslash uchun:
`bulk-price`, `search-index`, `broadcast` da `maxDuration` bor).
Loyiha `CLAUDE.md` sarlavhasiga ko'ra **10 000+ mahsulot** uchun.

**Nega muhim.** Bitta bosishda 10 000+ hujjat o'qish (pul), hammasi
bir vaqtda xotirada + `productsToCsv` yasagan bitta katta satr.
Konteyner 1024 MiB (`apphosting.yaml:13`) va `concurrency: 40` —
ya'ni eksport paytida shu nusxadagi boshqa mijozlar ham
ta'sirlanadi. Cloud Run standart so'rov muddati ham oshib ketishi
mumkin.

**Yechim.** Kursor bilan sahifalab o'qish (500 tadan,
`reindex/route.ts:57` dagi naqsh) va CSV ni `ReadableStream` bilan
oqim ko'rinishida qaytarish; `export const maxDuration = 300`
qo'shish.

**Mehnat:** o'rta · **Xavf:** o'rta

## 3.2. 🟠 Qidiruv indeksi 5000-mahsulotdan keyin jimgina to'xtaydi

**Fakt.** `src/app/api/admin/products/search-index/route.ts:29`:
`.limit(5000).get()`. Fayl izohi esa (`:11`) **"BUTUN KATALOGNI
qidiruv motoriga yuborish"** deydi, javob esa
`{ ok: true, indexed: count }` — ya'ni admin "5000 ta indekslandi"
ni muvaffaqiyat deb ko'radi.

**Nega muhim.** 10 000+ mahsulotli katalogda yarmi Typesense'ga
umuman tushmaydi va **hech qanday ogohlantirish chiqmaydi**.
`docs/TYPESENSE.md` ni o'qib motorni yoqqan odam "qidiruv nega
ba'zi mahsulotni topmayapti" degan savolga javob topa olmaydi.

**Yechim.** Kursor bilan hammasini aylanish (`reindex/route.ts:57`
naqshi, 500 tadan), yoki eng kamida: chegaraga urilganda javobda
`{ truncated: true, total }` qaytarib, UI'da ochiq ogohlantirish.

**Mehnat:** kichik · **Xavf:** o'rta

## 3.3. 🔴 "Storage tozalash" — rasmlarni ommaviy o'chirib yuborishi mumkin

**Fakt.** `src/lib/storage/cleanup.ts:74-80`:

```ts
for (const name of COLLECTIONS) {
  const snap = await db.collection(name).get().catch(() => null);
  if (!snap) continue;
  ...
```

`COLLECTIONS` (`:37-49`) ichida `products`, `deletedProducts`,
`orders`, `reviews` bor — **hammasi cheklovsiz to'liq o'qiladi** va
har hujjat `JSON.stringify` qilinadi. `:141` da
`deleteOrphanFiles()` aynan shu `scanOrphanFiles()` ni QAYTA
chaqiradi va natijani o'chirishga ishlatadi.

**Nega muhim.** Ikki muammo bitta joyda:

1. **Narx.** Bir bosishda 10 000+ mahsulot + hamma buyurtma +
   hamma sharh o'qiladi va JSON'ga o'giriladi — 1024 MiB
   konteynerda bu xotira cho'qqisi va katta o'qish hisobi.
2. **MA'LUMOT YO'QOLISHI.** `.catch(() => null); continue` —
   `products` o'qishi yiqilsa (aynan yuqoridagi xotira/vaqt
   sababidan!) funksiya mahsulot rasmlari HAVOLASIZ to'plam
   qaytaradi. Shundan keyin `scanOrphanFiles` **hamma mahsulot
   rasmini "yetim"** deb belgilaydi va `deleteOrphanFiles` ularni
   (30 kundan eskisini) O'CHIRADI. `docs/ARXITEKTURA-TARIXI.md` §20
   "o'chirish ro'yxati serverda qayta hisoblanadi" ni himoya deb
   yozadi — bu yerda esa aynan o'sha qayta hisoblash xavf manbai.

**Yechim.**
1. `.catch(() => null); continue` ni olib tashlash — kolleksiya
   o'qilmasa butun tozalash TO'XTASIN (`throw`), chunki to'liq
   bo'lmagan ro'yxat bilan o'chirish xavfli.
2. Kolleksiyalarni kursor bilan (500 tadan) aylanish — xotira
   chegaralangan bo'lsin.
3. Qo'shimcha qalqon: yetimlar soni umumiy fayllarning, masalan,
   40% dan oshsa o'chirmasdan to'xtash va sababni ekranga chiqarish
   ("shubhali natija — qayta ishga tushiring").
4. `cleanup.test.ts`: bitta kolleksiya yiqilganda `scanOrphanFiles`
   xato tashlashi.

**Mehnat:** o'rta · **Xavf:** yuqori

## 3.4. 🟠 Foydalanuvchilar ro'yxati — N+1, va izoh haqiqatga zid

**Fakt.** `src/app/api/admin/users/route.ts:45-56`: `PAGE_SIZE = 20`
(`:10`) foydalanuvchining HAR BIRI uchun alohida so'rov —
`.where("userId","==",uid).select("totalAmount","createdAt")
.limit(200).get()`. Ya'ni bitta sahifa uchun 1 + 20 so'rov va
**20 × 200 = 4000 tagacha hujjat o'qish**.

Izoh esa (`:42-44`) shunday deydi: *"Sanash **aggregation so'rovi**
bilan (butun hujjatlarni o'qimaydi)"* — kodda `.count()` YO'Q,
`.select()` esa hujjatni baribir o'qilgan deb hisoblaydi.

**Nega muhim.** Admin "Foydalanuvchilar" sahifasini ochgan har
safar to'rt mingtagacha o'qish; izoh esa keyingi dasturchini
"bu arzon" deb ishontiradi.

**Yechim.** Foydalanuvchi hujjatida `ordersCount`, `totalSpent`,
`lastOrderAt` ni `create-order.ts` tranzaksiyasida
`FieldValue.increment` bilan yuritish (buyurtma yaratilganda
allaqachon `stats/summary` yangilanadi — o'sha yerga qo'shish),
ro'yxatda esa tayyor qiymatni o'qish. Vaqtinchalik yechim: `.get()`
o'rniga `.count().get()` + oxirgi buyurtma uchun `.limit(1)`.
Izohni ham to'g'rilash.

**Mehnat:** o'rta · **Xavf:** past

## 3.5. 🟡 `three.js` ikki marta yuklanadi

**Fakt.** `npm run build` dan keyin:

```
946 KB  .next/static/chunks/3ez_0k64tchxs.js
946 KB  .next/static/chunks/125b2ivp6nmng.js
```

Ikkalasida ham `WebGLRenderer`/`BufferGeometry` bor (`grep -c` → 8),
`md5sum` esa har xil. Sabab: ikkita mustaqil dinamik kirish nuqtasi —
`HeroCanvas.tsx:28` (`HeroScene`) va `WorldCanvas.tsx:25`
(`WorldScene`) — Turbopack umumiy `three` ni alohida chunk'ga
chiqarmagan.

**Nega muhim.** 3D yoqilgan mijoz bosh sahifadan katalogga
o'tganda `three` ni IKKINCHI marta (~946 KB) yuklaydi. Klassik
rejimdagi mijozga bu tegmaydi (gating to'g'ri ishlaydi — tekshirildi),
lekin `.next/static/chunks` 5.7 MB dan 1.9 MB'i shu ikki nusxa.

**Yechim.** `HeroScene` va `WorldScene` uchun umumiy modul yaratish
(`src/components/three/runtime.ts` — `three`, `@react-three/fiber`,
`@react-three/drei` ni bir joydan re-eksport qilish) va ikkalasi
ham faqat o'sha modulni dinamik import qilishi. So'ng
`ls -S .next/static/chunks | head` bilan bitta 946 KB qolganini
tekshirish.

**Mehnat:** o'rta · **Xavf:** past

## 3.6. 🟡 Ochiq javoblarda keshsiz qolgan ikkita yo'l

**Fakt.** `src/lib/http/cache.ts:22 publicCacheHeaders()` 5 ta
route'da to'g'ri ishlatilgan (`app/version`, `delivery`, `facets`,
`pricing`, `taxonomy`), lekin quyidagi ikkitasi hech qanday kesh
sarlavhasi yubormaydi:

- `src/app/api/tv/slides/route.ts:18` — do'kon televizori har
  necha daqiqada so'raydi, javob hammaga BIR XIL (`CLAUDE.md`:
  "slaydlar 2 daq. kesh" — kesh faqat konteyner xotirasida,
  `minInstances: 1 … maxInstances: 3` bo'lgani uchun har nusxada
  alohida);
- `src/app/api/stickers/route.ts:16` — ochiq to'plam havolasi,
  deyarli o'zgarmaydi.

**Nega muhim.** Backend `us-east4` da (`CLAUDE.md`), Toshkentdan
har so'rov okean ortiga boradi — aynan shu sabab
`publicCacheHeaders` yozilgan edi.

**Yechim.** `tv/slides` ga `publicCacheHeaders(120)`,
`stickers` ga `publicCacheHeaders(600)`.

**Mehnat:** kichik · **Xavf:** past

## 3.7. 800 qatordan katta 7 ta fayl (bo'lish rejasi)

**Fakt.** `wc -l`:

| Qator | Fayl | `HISOBOT.md` da |
|---|---|---|
| 1779 | `src/lib/telegram/customer-bot.ts` | bor (1779 ✅) |
| 1613 | `src/lib/telegram/admin-session.ts` | bor, lekin **1424 deb yozilgan** |
| 1106 | `src/components/admin/ProductForm.tsx` | bor (1106 ✅) |
| 967 | `src/components/admin/CatalogCleanup.tsx` | yo'q |
| 949 | `src/lib/i18n/dictionaries.ts` | yo'q |
| 949 | `src/components/admin/StickerManager.tsx` | yo'q |
| 873 | `src/lib/telegram/channel.ts` | yo'q |

**Nega muhim.** `HISOBOT.md` "uchta katta fayl" deydi — aslida
yettita, va `admin-session.ts` ro'yxatga kirgandan beri 189 qatorga
o'sgan. 2.2-banddagi escape nosozligi aynan shu ikki katta faylda
yashiringan: fayl kattaligi tekshirishni qiyinlashtiradi.

**Yechim (tavsiya etilgan tartib).**

1. `customer-bot.ts` → `customer/catalog.ts`, `customer/cart.ts`,
   `customer/checkout.ts`, `customer/profile.ts`, `customer/router.ts`
   (bu allaqachon `HISOBOT.md` rejasida).
2. `admin-session.ts` → `admin-session/state.ts` (sessiya o'qish/
   yozish), `admin-session/new-product.ts`, `admin-session/edit.ts`,
   `admin-session/media.ts`.
3. `channel.ts` → `channel/text.ts` (`buildProductText` va
   yordamchilar, testi bor), `channel/publish.ts`,
   `channel/refresh.ts`.
4. `dictionaries.ts` → til bo'yicha uchta fayl (`uz.ts`, `ru.ts`,
   `en.ts`) — hozir uchalasi bitta faylda va diff'i o'qib
   bo'lmaydigan darajada uzun.
5. `CatalogCleanup.tsx` va `StickerManager.tsx` → `hooks/` +
   taqdimot komponentlariga ajratish.

Har qadamdan keyin: `npx tsc --noEmit && npx eslint . && npm test`.

**Mehnat:** katta · **Xavf:** o'rta (bo'lish paytida xatti-harakat
o'zgarib ketmasligi kerak — shuning uchun har fayl uchun alohida
commit)

---

# 4. Hujjat HAQIQATGA ZID bo'lgan joylar

| Qayerda | Nima yozilgan | Aslida |
|---|---|---|
| `docs/HISOBOT.md` §4 | "432 fayl, ~55 000 qator" | 439 fayl, 56 488 qator |
| `docs/HISOBOT.md` §4 | "Testlar: 26 fayl, 204 test" | 29 fayl, 212 test (1 tasi muhitda yiqiladi — 2.4) |
| `docs/HISOBOT.md` §4 | "98 ta `console.*`" | 100 ta |
| `docs/HISOBOT.md` §4 | "`admin-session.ts` 1424" | 1613 |
| `docs/HISOBOT.md` §4 | "Uchta katta fayl" | Yettita (3.7) |
| `src/app/api/admin/users/route.ts:42` | "Sanash aggregation so'rovi bilan (butun hujjatlarni o'qimaydi)" | `.select().get()` — hujjatlar o'qiladi va hisoblanadi (3.4) |
| `src/app/api/admin/products/search-index/route.ts:11` | "BUTUN KATALOGNI" | `.limit(5000)` (3.2) |
| `src/app/k/[id]/route.ts:27` | "Sanash mijozni kutdirmaydi" | `await trackChannelClick(id)` redirect'dan oldin (2.10) |
| `src/lib/format.ts:11` | "`toLocaleString` ISHLATILMAYDI" | To'rt faylda ishlatilgan (1.4) |
| `CLAUDE.md` → Tekshiruv | `npm test` majburiy | Konteyner tiklangandan keyin doim yiqiladi (2.4) |
| `storage.rules` | `products/` + `role == 'admin'` | Amalda hech qachon qo'llanmaydi; `blog`/`site` yo'q; `owner` yo'q (1.6) |

Bularning hammasi bitta commitda tuzatilishi mumkin (`HISOBOT.md`
raqamlari + to'rtta noto'g'ri izoh).

---

# 5. BIRINCHI NAVBATDA — 5 ta ish

Tartib **ta'sir / mehnat** nisbati bo'yicha. Har biri uchun yangi
sessiyaga tayyor topshiriq matni. Har birining oxirida majburiy
tekshiruv: `npx tsc --noEmit && npx eslint . && npm test && npm run build`.

## 1) Tannarxni buyurtma hujjatidan chiqarish (2.1)

```
Buyurtmada items[].costPrice saqlanadi (lib/orders/create-order.ts:137,154
-> :237) va mijoz uni client SDK bilan o'qiy oladi
(app/(main)/profil/page.tsx:95 -> lib/firebase/firestore.ts:126, butun
hujjat qaytadi). CLAUDE.md 1-qoidasi buziladi. Batafsil: docs/AUDIT.md 2.1.

Vazifa: tannarxni buyurtmadan ajratish.
1. create-order.ts: costPrice ni o'sha tranzaksiyada orderCosts/{orderId}
   hujjatiga yozing ({ items: [{ productId, variantId, costPrice }] }).
2. firestore.rules: match /orderCosts/{id} -> allow read, write: if false
   (izohda sababi).
3. api/admin/reports/route.ts:82 — tannarxni orderCosts dan db.getAll()
   bilan buyurtmalar bilan bir partiyada o'qing.
4. types/order.ts:15 dan costPrice ni olib tashlang; tsc qolganini aytadi.
5. Test: buyurtma hujjatida costPrice YO'Qligini tekshirsin.
6. CLAUDE.md 1-bo'limi, ARXITEKTURA-TARIXI.md (sabab), REBUILD-PROMPT.md.
```

## 2) Telegram botda HTML escape (2.2)

```
bot.ts har xabarni parse_mode:"HTML" bilan yuboradi, lekin customer-bot.ts,
admin-session.ts, admin-commands.ts da escapeHtml chaqirilmaydi (grep -c
-> 0 0 0). Mijoz sharhi xom holda customer-bot.ts:1164 da HTML ichiga
tushadi. Bu ARXITEKTURA-TARIXI.md §6.2a ning bot tomondagi nusxasi.
Batafsil: docs/AUDIT.md 2.2.

Vazifa:
1. src/lib/telegram/html.ts: escapeHtml — beshta nusxa (templates.ts:5,
   channel.ts:47, product-intake.ts:87, broadcast.ts:114,
   wholesale/clients.ts:323) shundan import qilsin.
2. Uchala bot faylida HTML matnga tushayotgan HAR BIR ${...} ni o'rang
   (ayniqsa :279 user.name, :462 nom, :1164 sharh, :1225 blog).
3. bot.ts: "can't parse entities" xatosini tanib, xabarni parse_mode'siz
   qayta yuboring (qalqon).
4. Sharh matnini yasovchi funksiyani ajratib, "<b>x" va "<a href=...>"
   bilan test yozing.
```

## 3) Rate limit'ni haqiqiy IP ga bog'lash (2.3)

```
lib/rate-limit.ts:60 x-forwarded-for ning BIRINCHI qiymatini oladi — uni
mijozning o'zi yozadi. 12 ta endpointdagi chegara (jumladan pulli
api/assistant va api/search/image) bitta header bilan chetlab o'tiladi.
Batafsil: docs/AUDIT.md 2.3.

Vazifa:
1. getClientIp: Google Cloud LB da haqiqiy IP oxirdan ikkinchi bo'g'inda —
   parts.at(-2) ?? parts.at(-1); qiymatni /^[0-9a-f:.]+$/i bilan
   tekshiring, mos kelmasa "unknown".
2. api/assistant va api/search/image ga IKKINCHI chegara: kirgan
   foydalanuvchi uid si bo'yicha; kirmaganlarga kunlik global chegara.
3. src/lib/rate-limit.test.ts: bitta IP, ikkita IP, soxta birinchi qiymat,
   bo'sh header.
4. docs/DEPLOY.md ga bir qator: chegara nimaga bog'langani.
```

## 4) "Storage tozalash" ni xavfsiz qilish (3.3)

```
lib/storage/cleanup.ts:75 hamma kolleksiyani cheklovsiz to'liq o'qiydi va
`.catch(() => null); continue` bilan xatoni yutadi. products o'qishi
yiqilsa referencedPaths() rasmlarsiz to'plam qaytaradi va
deleteOrphanFiles() (:141) 30 kundan eski HAMMA mahsulot rasmini o'chiradi.
Batafsil: docs/AUDIT.md 3.3.

Vazifa:
1. referencedPaths(): `.catch(() => null); continue` ni olib tashlang —
   kolleksiya o'qilmasa throw (to'liqsiz ro'yxat bilan o'chirish yo'q).
2. Kolleksiyalarni kursor bilan 500 tadan aylaning (xotira chegarali).
3. Qalqon: yetimlar soni scanned ning 40% dan oshsa o'chirmang, sababni
   qaytaring ("shubhali natija — qayta ishga tushiring").
4. src/lib/storage/cleanup.test.ts: kolleksiya yiqilganda xato tashlashi;
   qalqonning ishlashi.
5. CLAUDE.md 5-bo'limiga qalqon haqida bir qator.
```

## 5) `npm test` ni tiklash + hujjat raqamlarini to'g'rilash (2.4 + 4-bo'lim)

```
npm test yiqiladi: "TSConfckParseError: failed to resolve extends
@react-native/typescript-config". vitest.config.ts:25 mobile testini ham
oladi, .claude/hooks/session-start.sh esa faqat root node_modules ni
tiklaydi (CI ci.yml:39 mobile da alohida npm ci qiladi).

Vazifa:
1. session-start.sh oxiriga: mobile/node_modules/@react-native/
   typescript-config yo'q bo'lsa (cd mobile && npm install) || true.
2. docs/HISOBOT.md §4 raqamlari: 439 fayl / 56 488 qator, 29 test fayli /
   212 test, 100 ta console.*, admin-session.ts 1613, "uchta katta fayl"
   -> yettita (docs/AUDIT.md 3.7 jadvali).
3. Noto'g'ri izohlar: api/admin/users/route.ts:42 ("aggregation so'rovi"),
   api/admin/products/search-index/route.ts:11 ("BUTUN KATALOGNI"),
   app/k/[id]/route.ts:27 ("kutdirmaydi").

Natija: npm test 29/29 yashil.
```

# Audit ishlari — navbat bo'yicha topshiriqlar

Manba: `docs/AUDIT.md`. Tartib **ta'sir/mehnat** bo'yicha va
tekshiruvdan keyin to'g'rilangan (auditdagi ikkita yechim chala/
xavfli edi — 3 va 5-ishga qarang).

**Ishlatish:** har bir blokni ALOHIDA yangi sessiyada yuboring.
Tugagach sessiyani yoping. `CLAUDE.md` avtomatik o'qiladi.

> ⚠️ **1-ish tugamaguncha Sozlamalardagi "Storage tozalash"
> tugmasini BOSMANG** — hozirgi holatda u 30 kundan eski hamma
> mahsulot rasmini o'chirib yuborishi mumkin.

---

## 1) Storage tozalashni xavfsiz qilish (AUDIT 3.3) 🔴

```text
lib/storage/cleanup.ts:81 `.catch(() => null); continue` bilan xatoni
yutadi: `products` o'qishi yiqilsa referencedPaths() rasmlarsiz to'plam
qaytaradi va deleteOrphanFiles() 30 kundan eski HAMMA mahsulot rasmini
o'chiradi. Kolleksiyalar cheklovsiz to'liq o'qiladi (10 000+ hujjat).
Batafsil: docs/AUDIT.md 3.3.

Vazifa:
1. referencedPaths(): `.catch(() => null); continue` ni olib tashla —
   kolleksiya o'qilmasa throw (to'liqsiz ro'yxat bilan o'chirish YO'Q).
2. Kolleksiyalarni kursor bilan 500 tadan ayla (xotira chegarali).
3. QALQON: yetimlar soni skanerlangan fayllarning 40% dan oshsa
   o'chirma, sababni qaytar ("shubhali natija — qayta ishga tushiring").
   Panelda ham shu xabar ko'rinsin.
4. src/lib/storage/cleanup.test.ts: (a) kolleksiya yiqilganda xato
   tashlashi, (b) 40% qalqonining ishlashi.
5. CLAUDE.md 5-bo'limiga qalqon haqida bir qator.
Tugagach: tsc + eslint + test + build, commit va push.
```

## 2) Telegram botda HTML escape (AUDIT 2.2) 🔴

```text
bot.ts har xabarni parse_mode:"HTML" bilan yuboradi, lekin
customer-bot.ts, admin-session.ts, admin-commands.ts da escapeHtml
umuman chaqirilmaydi (grep -c -> 0 0 0). Mijoz sharhi xom holda
customer-bot.ts:1164 da HTML ichiga tushadi: yopilmagan <b> butun
javobni yiqitadi, <a href> esa botda bosiladigan fishing havolasi
bo'ladi. Bu ARXITEKTURA-TARIXI.md §6.2a ning bot tomondagi nusxasi.
Batafsil: docs/AUDIT.md 2.2.

Vazifa:
1. src/lib/telegram/html.ts yarat: escapeHtml. Beshta nusxa
   (templates.ts:5, channel.ts:47, product-intake.ts:87,
   broadcast.ts:114, wholesale/clients.ts:323) shundan import qilsin.
2. Uchala bot faylida HTML matnga tushayotgan HAR BIR ${...} ni o'ra —
   ayniqsa customer-bot.ts:279 (ism), :462 (mahsulot nomi), :1164
   (sharh), :1225 (blog sarlavhasi/matni).
3. bot.ts: "can't parse entities" xatosini tanib, xabarni
   parse_mode'siz QAYTA yubor (qalqon — ekran baribir ishlasin).
4. Sharh matnini yasovchi funksiyani ajratib test yoz: "<b>x" va
   "<a href=...>" li sharh xavfsiz chiqishi.
Tugagach: tsc + eslint + test + build, commit va push.
```

## 3) Tannarxni buyurtmadan chiqarish (AUDIT 2.1) 🔴 ✅ BAJARILDI

```text
Buyurtma hujjatida items[].costPrice saqlanadi
(lib/orders/create-order.ts:137,154 -> :237) va mijoz uni client SDK
bilan o'qiy oladi (profil sahifasi -> lib/firebase/firestore.ts:126
subscribeToUserOrders, butun hujjat qaytadi). CLAUDE.md 1-qoidasi
buzilgan. Batafsil: docs/AUDIT.md 2.1.

Vazifa:
1. create-order.ts: costPrice ni o'sha tranzaksiyada
   orderCosts/{orderId} ga yoz ({items:[{productId,variantId,costPrice}]}).
2. firestore.rules: match /orderCosts/{id} -> allow read, write: if false
   (izohda sababi). CLAUDE.md dagi yopiq kolleksiyalar ro'yxatiga qo'sh.
3. api/admin/reports/route.ts:82 — tannarxni orderCosts dan
   db.getAll() bilan bir partiyada o'qi.
4. types/order.ts:15 dan costPrice ni olib tashla (tsc qolganini aytadi).
5. MIGRATSIYA (auditda yo'q, lekin SHART): mavjud buyurtmalarda
   costPrice qolib ketmasin — /api/admin/maintenance/order-costs
   (faqat owner, kursor bilan 400 tadan): eskilarini orderCosts ga
   ko'chirib, orders dagi maydonni FieldValue.delete() bilan o'chir.
   Panelga tugma shart emas, bir marta chaqiriladi.
6. Test: buyurtma hujjatida costPrice YO'Qligi.
7. CLAUDE.md 1-bo'lim, ARXITEKTURA-TARIXI.md (sabab), REBUILD-PROMPT.md.
Tugagach: tsc + eslint + test + build, commit va push.
```

## 4) `npm test` ni tiklash + hujjat raqamlari (AUDIT 2.4 + §4) 🟠

```text
npm test konteyner tiklangandan keyin yiqiladi: "TSConfckParseError:
failed to resolve extends @react-native/typescript-config".
vitest.config.ts:25 ilova testini ham oladi, .claude/hooks/
session-start.sh esa faqat root node_modules ni tiklaydi.
Batafsil: docs/AUDIT.md 2.4 va 4-bo'lim.

Vazifa:
1. session-start.sh oxiriga: mobile/node_modules/@react-native/
   typescript-config yo'q bo'lsa (cd mobile && npm install
   --no-audit --no-fund) || true.
2. docs/HISOBOT.md §4 raqamlarini o'lchab to'g'rila (fayl/qator soni,
   test soni, console.* soni, admin-session.ts qatori, "uchta katta
   fayl" -> yettita, docs/AUDIT.md 3.7 jadvali).
3. Noto'g'ri izohlarni to'g'rila: api/admin/users/route.ts:42
   ("aggregation so'rovi" — aslida .select().get()),
   api/admin/products/search-index/route.ts:11 ("BUTUN KATALOGNI" —
   aslida limit(5000)), app/k/[id]/route.ts:27 ("kutdirmaydi" —
   aslida await).
Natija: npm test hammasi yashil. Tugagach commit va push.
```

## 5) Rate limit'ni haqiqiy IP ga bog'lash (AUDIT 2.3) 🟠

```text
lib/rate-limit.ts:60 x-forwarded-for ning BIRINCHI qiymatini oladi —
uni mijozning o'zi yozadi, ya'ni 12 ta endpointdagi chegara (jumladan
PULLI api/assistant va api/search/image) bitta header bilan chetlab
o'tiladi. Batafsil: docs/AUDIT.md 2.3.

DIQQAT: auditdagi "parts.at(-2)" yechimini KO'R-KO'RONA qo'llama —
bizda zanjir Firebase Hosting -> Cloud Run, bo'g'in soni boshqacha
bo'lishi mumkin. Noto'g'ri element olinsa HAMMA foydalanuvchi bitta
"IP" ga tushadi va chegara hammani bloklaydi.

Vazifa:
1. Avval o'lchov: getClientIp da (vaqtincha) XFF ning to'liq qiymatini
   reportError/logAction bilan bir marta yozdirib, haqiqiy zanjir
   shaklini aniqla. Aniqlab bo'lgach o'lchovni olib tashla.
2. getClientIp: zanjirdan haqiqiy mijoz IP sini olish;
   /^[0-9a-f:.]+$/i bilan tekshir, mos kelmasa "unknown".
3. api/assistant va api/search/image ga IKKINCHI chegara: kirgan
   foydalanuvchi uid si bo'yicha; kirmaganlarga kunlik global chegara.
4. src/lib/rate-limit.test.ts: bitta IP, ikkita IP, soxta birinchi
   qiymat, bo'sh header.
5. docs/DEPLOY.md ga bir qator: chegara nimaga bog'langani.
Tugagach: tsc + eslint + test + build, commit va push.
```

## 6) Arzon g'alabalar to'plami (AUDIT 1.1-1.6, 3.2, 3.6) 🟡

```text
docs/AUDIT.md dagi kichik va xavfsiz tozalashlar — bitta sessiyada,
lekin ALOHIDA commitlar bilan:

1. package.json dan @emotion/server ni olib tashla (1.1). @emotion/react,
   @emotion/styled, @emotion/cache QOLADI.
2. Ishlatilmaydigan eksportlarni o'chir (1.2 jadvali). DIQQAT:
   src/lib/firebase/auth.ts:123 signInWithGoogle o'chadi, lekin
   mobile/src/social-auth.ts dagi BIR XIL NOMLI funksiya ISHLATILADI —
   unga tegma. persistor: faqat `export` so'zi olinadi, chaqiruv qoladi.
3. money() ning to'rtta nusxasini @/lib/format dagi formatSom ga
   o'tkaz (1.4) — ExpensesPanel.tsx client komponent, hydration xavfi.
4. escapeHtml uchun umumiy modul (1.3) — 2-ish qilingan bo'lsa allaqachon
   bor, faqat qolgan nusxalarni import qil.
5. parseXlsx + cellToText ni src/lib/products/xlsx.ts ga chiqar,
   normalizeHeader ni csv.ts dan import qil (1.5).
6. storage.rules ni bitta yopiq qoidaga qisqartir + izoh (1.6).
7. search-index/route.ts: limit(5000) o'rniga kursor bilan hammasi,
   yoki javobda {truncated:true,total} va panelda ogohlantirish (3.2).
8. api/tv/slides ga publicCacheHeaders(120), api/stickers ga
   publicCacheHeaders(600) (3.6).
Har commitdan keyin: tsc + eslint + test + build. Oxirida push.
```

---

# HOLAT (2026-08-23)

Yetti ish yetti alohida sessiyada bajarilib, yettita alohida branchga
push qilingan edi — hech biri deploy branchida emasdi. Hammasi
`claude/plumbing-ecommerce-nextjs-jxpmh5` ga birlashtirildi
(konfliktlar: `escapeHtml` moduli ikki marta yaratilgan, `search-index`
ikki xil versiya, `create-order.test.ts` ikki xil soxta baza).

| Ish | Holat |
|---|---|
| 1) Storage tozalash qalqoni | ✅ birlashtirildi |
| 2) Botda HTML escape | ✅ birlashtirildi |
| 3) Tannarx → `orderCosts` | ✅ birlashtirildi (migratsiya route'i bilan) |
| 4) `npm test` + hujjat raqamlari | ✅ birlashtirildi |
| 5) Rate limit (XFF) | ✅ birlashtirildi ⚠️ production'da XFF zanjirini bir marta tekshirish kerak |
| 6) Arzon g'alabalar (8 ta band) | ✅ birlashtirildi |
| 7) To'lov yo'llari | ✅ birlashtirildi (merchant kalitlari kelgach test kabinetida sinaladi) |

Tekshiruv birlashtirilgandan keyin: `tsc`, `eslint`, `npm test`
(262/262, 38 fayl), `npm run build` — hammasi yashil.

## Qolgan ishlar (auditdan, hali qilinmagan)

| # | Ish | Nega qoldi |
|---|---|---|
| ~~2.5~~ | ~~Katalog indekslari + zaxira so'rov~~ | ✅ bajarildi: 15 ta yangi indeks (jumladan `stock`), zaxira yo'lda 4 barobar ortiqcha o'qish + filtrdan keyingi `hasMore`/kursor |
| 3.1 | CSV eksport butun katalogni bir so'rovda o'qiydi | Kursor + `maxDuration` kerak |
| 3.4 | Foydalanuvchilar ro'yxati N+1 (20 × 200 hujjat) | Izohi to'g'rilandi, kodi emas |
| 2.7 | Narx/yetkazish sozlamasi jimgina standartga tushishi | `reportError` qo'shilmagan |
| 2.8 | Telegram webhook xatosi faqat konsolga yozilishi | `reportError` qo'shilmagan |
| 2.9 | `/api/admin/upload` — huquq emas, faqat "xodimmi" tekshiriladi | Tegilmagan |
| 2.10 | `/k/<id>` cheksiz yozuv (rate limit + mahsulot borligini tekshirish) | Faqat izoh to'g'rilandi |
| 3.5 | `three.js` ikki chunk (946 KB × 2) | 3D o'chiq bo'lgani uchun mijozga tegmaydi |
| 3.7 | 800 qatordan katta 7 ta faylni bo'lish | Katta ish, alohida rejalashtiriladi |

---

# Keyingi topshiriqlar (auditdan qolganlari)

Har birini ALOHIDA yangi sessiyada yuboring. Bular aniq belgilangan
ish — **Sonnet 5 yetadi** (arzonroq); Opus faqat noaniq/arxitektura
qarorlari va chigal nosozliklar uchun kerak.

**Har bir topshiriqning oxirida shu qator turishi SHART:**
`Ishni claude/plumbing-ecommerce-nextjs-jxpmh5 branchiga push qil
(yangi branch OCHMA).`

## 8) CSV eksportni kursorga o'tkazish (AUDIT 3.1)

```text
api/admin/products/export/route.ts:15 butun katalogni bitta so'rovda
o'qiydi (`collection("products").get()`), cheklov ham, maxDuration ham
yo'q. 10 000+ mahsulotda bu xotira cho'qqisi va katta o'qish hisobi.
Batafsil: docs/AUDIT.md 3.1.

Vazifa:
1. Kursor bilan sahifalab o'qi (500 tadan, reindex/route.ts naqshi).
2. CSV ni ReadableStream bilan oqim qilib qaytar (butun satr xotirada
   yig'ilmasin); sarlavha qatori bir marta yozilsin.
3. export const maxDuration = 300 qo'sh.
4. Mavjud CSV ustunlari va tartibi O'ZGARMASIN (import shu shaklni
   kutadi) - csv.test.ts yashil qolsin.
Tugagach: tsc + eslint + test + build.
Ishni claude/plumbing-ecommerce-nextjs-jxpmh5 branchiga push qil (yangi branch OCHMA).
```

## 9) Foydalanuvchilar ro'yxati N+1 (AUDIT 3.4)

```text
api/admin/users/route.ts:45-56 har bir foydalanuvchi uchun alohida
so'rov qiladi: bitta sahifa = 1 + 20 so'rov va 4000 tagacha hujjat
o'qish. Batafsil: docs/AUDIT.md 3.4.

Vazifa:
1. Foydalanuvchi hujjatida ordersCount, totalSpent, lastOrderAt ni
   yurit: lib/orders/create-order.ts tranzaksiyasida
   FieldValue.increment bilan (u yerda stats/summary allaqachon
   yangilanadi - o'sha joyga qo'sh).
2. api/admin/users/route.ts shu tayyor qiymatlarni o'qisin (N+1 yo'q).
3. Eski foydalanuvchilar uchun bir martalik to'ldirish:
   /api/admin/maintenance/user-stats (faqat owner, kursor bilan),
   Sozlamalarga tugma - OrderCostsMigrationPanel.tsx naqshi bilan.
4. create-order testiga: yangi maydonlar yangilanishi.
Tugagach: tsc + eslint + test + build.
Ishni claude/plumbing-ecommerce-nextjs-jxpmh5 branchiga push qil (yangi branch OCHMA).
```

## 10) Jimgina yutilgan xatolar (AUDIT 2.7 + 2.8)

```text
Ikki joyda xato hech kimga ko'rinmaydi:
- lib/products/pricing-settings.ts:29 va lib/orders/pricing.ts:16 -
  Firestore uzilsa sozlama jimgina STANDART qiymatga tushadi (ustama
  30% o'rniga 5% bo'lib qoladi va buyurtma o'sha narxda qabul
  qilinadi);
- api/telegram-webhook/route.ts:301 - bot xatosi faqat console.error.
Batafsil: docs/AUDIT.md 2.7, 2.8.

Vazifa:
1. Ikkala sozlama catch'ida reportError(...) chaqir (lib/ops/report-error.ts).
2. Sozlama xato bo'lganda STANDART emas, oxirgi MUVAFFAQIYATLI
   keshlangan qiymatni qaytar (TTL tekshiruvini xato yo'lida
   o'tkazib yubor); kesh bo'sh bo'lsagina standart.
3. telegram-webhook catch'ini reportError("Telegram webhook", error)
   ga o'tkaz; api/contact ham shunday.
4. Test: sozlama o'qishi yiqilganda eski qiymat qaytishi.
Tugagach: tsc + eslint + test + build.
Ishni claude/plumbing-ecommerce-nextjs-jxpmh5 branchiga push qil (yangi branch OCHMA).
```

## 11) Upload huquqi va `/k/<id>` himoyasi (AUDIT 2.9 + 2.10)

```text
- api/admin/upload/route.ts:17 faqat requireAdminUser() (xodimmi)
  tekshiradi: masalan faqat "orders" huquqi bor admin ham Storage'ga
  fayl yuklab, ochiq URL ola oladi.
- app/k/[id]/route.ts ochiq va rate limit yo'q: skript
  /k/<tasodifiy> ni chaqirib channelClicks ni cheksiz hujjat bilan
  to'ldira oladi.
Batafsil: docs/AUDIT.md 2.9, 2.10.

Vazifa:
1. upload route: folder ga qarab huquq - "blog" bo'lsa
   requirePermission("blog", request), qolganida
   requirePermission("products", request). Ruxsat etilgan prefikslar
   ro'yxatini qattiq belgila (products/, blog, site) - boshqasi 400.
2. /k/[id]: checkRateLimit qo'sh va yozishdan oldin mahsulot
   mavjudligini tekshir (yoki channelMessageId bor mahsulotlarga
   yoz). Yo'naltirishni kutdirmaslik uchun trackChannelClick ni
   redirect'dan keyin/parallel qil.
3. Test: notanish ID ga yozilmasligi.
Tugagach: tsc + eslint + test + build.
Ishni claude/plumbing-ecommerce-nextjs-jxpmh5 branchiga push qil (yangi branch OCHMA).
```

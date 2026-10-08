# Audit ishlari — navbat bo'yicha topshiriqlar

Manba: `docs/AUDIT.md`. Tartib **ta'sir/mehnat** bo'yicha va
tekshiruvdan keyin to'g'rilangan (auditdagi ikkita yechim chala/
xavfli edi — 3 va 5-ishga qarang).

**Ishlatish:** har bir blokni ALOHIDA yangi sessiyada yuboring.
Tugagach sessiyani yoping. `CLAUDE.md` avtomatik o'qiladi.

> ✅ 1-ish (Storage tozalash qalqoni) bajarilgan — Sozlamalardagi
> "Storage tozalash" tugmasi endi xavfsiz.

## UMUMIY HOLAT (2026-10-08)

Kod bo'yicha 1-15 bandlarning **hammasi bajarilgan** (har biri kodda
tekshirildi: `reportErrorThrottled`, `/k` rate limit, `permissionForFolder`,
CSV kursor, ilova `versionName 1.5.2`).

**Kodda qolgan ishlar:**
| # | Ish | Holat |
|---|---|---|
| 16 | Haqiqiy mahsulotning 3D modeli | Egasi image→3D xizmatida hisob ochib API kalit berishi kerak; avval `ai/specs/` |
| 3.7 | 800+ qatorli fayllarni bo'lish (`customer-bot.ts` 1783, `admin-session.ts` 1676, `ProductForm.tsx` 1106 ...) | Alohida rejalashtiriladi |
| 3.5 | `three.js` ikki chunk | 3D mijozga yoqilganda (16-band bilan) |
| 14-nit 1 | GA yoqilishidan OLDIN `page_location` dan `t` ni olib tashlash | Faqat GA yoqilsa |

**Egasi qiladigan ishlar (konsolda, kod emas):**
- Ilova 1.5.2 ni Admin → Sozlamalar → «Ilova yangilanishi» da e'lon qilish (`QADAMLAR.md` 3-bo'lim).
- Production'da XFF zanjirini bir marta tekshirish (5-band).
- Payme/Click merchant kalitlari kelgach test kabinetida sinash (7-band).

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
| ~~3.1~~ | ~~CSV eksport butun katalogni bir so'rovda o'qiydi~~ | ✅ bajarildi (8-band, 2026-10-04) |
| ~~3.4~~ | ~~Foydalanuvchilar ro'yxati N+1 (20 × 200 hujjat)~~ | ✅ bajarildi: `users/{uid}` da `ordersCount/totalSpent/lastOrderAt` (buyurtma tranzaksiyasida), eski hisob Sozlamalardagi tugma bilan |
| 2.7 | Narx/yetkazish sozlamasi jimgina standartga tushishi | BAJARILDI (ARXITEKTURA-TARIXI 42) |
| 2.8 | Telegram webhook xatosi faqat konsolga yozilishi | BAJARILDI (ARXITEKTURA-TARIXI 42) |
| ~~2.9~~ | ~~`/api/admin/upload` — huquq emas, faqat "xodimmi" tekshiriladi~~ | ✅ bajarildi (`permissionForFolder`, c0b40e3) |
| ~~2.10~~ | ~~`/k/<id>` cheksiz yozuv~~ | ✅ bajarildi (11-band: IP rate limit, notanish ID ga yozmaslik) |
| 3.5 | `three.js` ikki chunk (946 KB × 2) | 3D o'chiq bo'lgani uchun mijozga tegmaydi |
| 3.7 | 800 qatordan katta 7 ta faylni bo'lish | Katta ish, alohida rejalashtiriladi |

---

# Keyingi topshiriqlar (auditdan qolganlari)

## Tartib va kim qiladi (2026-10-04)

Har biri ALOHIDA yangi sessiya. Sessiyaga quyidagi bandning ```text
blokini AYNAN nusxalab bering (oldiga hech narsa qo'shish shart emas —
sessiya CLAUDE.md ni o'zi o'qiydi).

| Navbat | Band | Model | Nega shu model |
|---|---|---|---|
| 1-to'lqin (bir vaqtda) | ~~8) CSV eksport~~ ✅ | Sonnet | Aniq, bitta fayl |
| 1-to'lqin | ~~11) `/k` himoyasi~~ ✅ | Sonnet | Kichik, aniq |
| 1-to'lqin | ~~13) Tungi rejim~~ ✅ | **Opus** | Hydration/MUI — noaniq, ishlab turgan kodga tegadi |
| 2-to'lqin (1-dan keyin) | ~~9) Foydalanuvchilar N+1~~ ✅ | **Opus** | Buyurtma tranzaksiyasi + migratsiya |
| 2-to'lqin | ~~10) Jim xatolar~~ ✅ | Sonnet | Aniq; `lib/orders/pricing.ts` ga tegadi |
| 2-to'lqin | ~~14) Mehmon yo'li testlari~~ ✅ | Sonnet | Test + kichik tranzaksiya |
| 3-to'lqin (oxirida) | ~~12) Xato xabarlari~~ ✅ | Sonnet | ~28 route'ga tegadi — boshqalar bilan to'qnashmasin deb OXIRIDA |

To'lqin ichidagilar turli fayllarga tegadi — parallel yuborish mumkin.
9 va 14 ikkalasi `create-order` atrofida: bir vaqtda yuborsangiz,
ikkinchisi push'dan oldin `git pull` qilsin. Har sessiya tugagach
diffni asosiy sessiyada tekshirtiring (tekshiruvchi).

Har birini ALOHIDA yangi sessiyada yuboring. Bular aniq belgilangan
ish — **Sonnet 5 yetadi** (arzonroq); Opus faqat noaniq/arxitektura
qarorlari va chigal nosozliklar uchun kerak.

**Har bir topshiriqning oxirida shu qator turishi SHART:**

```
Ishni main branchiga push qil.
Agar push BLOKLANSA - o'z branchingga push qilib, branch nomini
menga ayt (men birlashtiraman).
```

> Nega ikkinchi jumla kerak: bir necha sessiyada ishchi branchga
> push qilishga ruxsat berilmadi (muhitning o'z tekshiruvi) va ish
> boshqa branchda qolib ketdi. Shunda hech bo'lmasa branch nomi
> ma'lum bo'ladi.

## 8) CSV eksportni kursorga o'tkazish (AUDIT 3.1) ✅ BAJARILDI (2026-10-04)

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
Ishni main branchiga push qil (yangi branch OCHMA).
```

## 9) Foydalanuvchilar ro'yxati N+1 (AUDIT 3.4) ✅ BAJARILDI (2026-10-04)

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
Ishni main branchiga push qil (yangi branch OCHMA).
```

## 10) Jimgina yutilgan xatolar (AUDIT 2.7 + 2.8) ✅ BAJARILDI (2026-10-04)

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
Ishni main branchiga push qil (yangi branch OCHMA).
```

## 11) `/k/<id>` himoyasi (AUDIT 2.10) ✅ BAJARILDI (2026-10-04)

> Upload huquqi (2.9) allaqachon BAJARILGAN (`permissionForFolder`,
> c0b40e3) — topshiriqda faqat `/k` qoldi.

```text
app/k/[id]/route.ts ochiq va rate limit yo'q: skript /k/<tasodifiy>
ni chaqirib channelClicks ni cheksiz hujjat bilan to'ldira oladi.
Batafsil: docs/AUDIT.md 2.10.

Vazifa:
1. /k/[id]: checkRateLimit qo'sh (IP bo'yicha, getClientIp) va
   yozishdan oldin mahsulot mavjudligini tekshir (notanish ID ga
   YOZILMAYDI, lekin yo'naltirish baribir ishlaydi - bosh sahifaga).
2. Yo'naltirishni kutdirma: trackChannelClick redirect bilan
   parallel yoki keyin (after() / waitUntil).
3. Test: notanish ID ga yozilmasligi, limitdan oshganda yozilmasligi.
Tugagach: tsc + eslint + test + build.
Ishni main branchiga push qil (yangi branch OCHMA).
```

## 12) Xato xabarlari: qolgan route va formalar ✅ BAJARILDI

> 2026-10-04: 15 ta admin route `validationMessage()` ga o'tdi; mijoz
> route'lari `customerValidationMessage()` (lib/http/validation.ts) —
> faqat ro'yxatdagi maydonlar, ichki nom chiqmaydi. Kontakt, obuna va
> profil sozlamalari formalari serverdan kelgan matnni ko'rsatadi.

```text
docs/AUDIT.md dagi "Admin API xatolari" qoidasi hamma joyda
qo'llanmagan: ~28 ta admin route hali `validationMessage()` siz
(quruq "Ma'lumotlar noto'g'ri."), 7 ta mijoz formasi esa serverdan
kelgan xato MATNINI tashlab, o'zining qattiq yozilgan xabarini
ko'rsatadi.

Vazifa:
1. `grep -rn "Ma'lumotlar noto'g'ri" src/app/api` bilan ro'yxatni ol
   va hammasini `validationMessage(parsed.error)` ga o'tkaz
   (lib/http/validation.ts).
2. Mijoz formalarida (savat, checkout, sharh, kontakt, obuna,
   profil) `res.json().error` bo'lsa - O'SHA matn ko'rsatilsin;
   bo'lmasa hozirgi zaxira matn qolsin.
3. Bittasiga test: noto'g'ri maydon nomi javobda ko'rinishi.
Tugagach: tsc + eslint + test + build.
Ishni main branchiga push qil.
Agar push BLOKLANSA - o'z branchingga push qilib, branch nomini
menga ayt.
```

## 13) Tungi rejim MUI temasiga yetib bormaydi (kontrast 1.3:1) 🔴 ✅ BAJARILDI

> 2026-10-04: MUI temasi CSS o'zgaruvchilariga o'tdi, palitrani
> `.dark` klassi tanlaydi. Asl sabab "kech REHYDRATE" emas, hydration
> klass farqi edi — `docs/ARXITEKTURA-TARIXI.md` 40-band.

```text
QULAYLIK auditida (2026-09-20) topildi. SOVUQ ochilishda (brauzer
keshi bo'sh, sahifa to'g'ridan-to'g'ri yuklanadi) tungi rejim
TANLAGAN mijozda:

  • <html> ga `.dark` klassi qo'yiladi (layout.tsx dagi
    THEME_INIT_SCRIPT localStorage ni bo'yashdan OLDIN o'qiydi),
    shuning uchun Tailwind `dark:` klasslari va sahifa foni TO'Q;
  • lekin `MuiThemeBridge` (src/app/providers.tsx) temani
    redux'dagi `ui.themeMode` dan oladi va u hali `light` —
    redux-persist REHYDRATE'i kech keladi yoki o'sha renderga
    ulgurmaydi. Natijada MUI komponentlari YORUG' palitrada
    chiziladi.

O'LCHOV (Playwright, har safar yangi brauzer konteksti, 2.5 s kutish,
6 tadan urinish — 6/6 da takrorlandi):

  /kontakt  MuiInputLabel  rgba(0,0,0,.6) / rgb(7,45,64)   = 1.32:1
  /kirish   MuiInputLabel  rgba(0,0,0,.6) / rgb(11,59,84)  = 1.53:1

WCAG AA 4.5:1 talab qiladi — ya'ni tungi rejimda forma maydonlarining
NOMLARI amalda ko'rinmaydi. Tema haqiqatan qo'llanganda o'sha
qiymatlar rgba(255,255,255,.7) bo'ladi va muammo yo'qoladi.

MUHIM: bu QULAYLIK ishidan OLDIN ham shunday edi (o'sha commitni
stash qilib, asl kod bilan qayta yig'ib tekshirildi — natija bir xil).
Shuning uchun u ATAYLAB tuzatilmadi: yechim redux-persist va
hydration bilan bog'liq va ishlab turgan kodga tegadi.

Vazifa:
1. Muammoni takrorlang: tungi rejimni yoqing, brauzer keshini
   tozalab /kontakt ni to'g'ridan-to'g'ri oching, <label> rangini
   qarang (yoki `body div.dark` bormi — u MuiThemeBridge niki).
2. Yechim tanlang. `providers.tsx` dagi izoh PersistGate NEGA
   olib tashlanganini aytadi (SEO: butun UI o'rniga null) — uni
   QAYTARMANG. Mumkin yo'llar:
   a) tema redux'dan EMAS, `<html>` dagi `data-theme`/`.dark`
      atributidan o'qilsin (THEME_INIT_SCRIPT bilan bitta manba) —
      `useSyncExternalStore` + MutationObserver;
   b) yoki MUI `ThemeProvider` ga `colorSchemeSelector` bilan CSS
      o'zgaruvchili tema (MUI v6 `cssVariables`), shunda palitra
      JS holatiga emas, `.dark` klassiga bog'lanadi.
   (b) afzal: server va client bir xil HTML chizadi, hydration
   mismatch bo'lmaydi.
3. Tekshirish: yangi brauzer kontekstida /kontakt, /kirish,
   /savat, /buyurtma — label va Paper ranglari to'q palitrada
   bo'lsin; `src/lib/a11y/contrast.test.ts` uslubida o'lchov qo'shing.
4. docs/ARXITEKTURA-TARIXI.md ga sabab bilan bir bo'lim.
Tugagach: tsc + eslint + test + build.
Ishni main branchiga push qil.
Agar push BLOKLANSA - o'z branchingga push qilib, branch nomini
menga ayt.
```

---

## 14) 1-klik va o'tkazma: qolgan kichik ishlar 🟢 ✅ BAJARILDI (2026-10-04; nit 1, 4, 5 — kelishuv/ogohlantirish sifatida qoladi)

```text
Mehmon buyurtma yo'li (CLAUDE.md 15-band, ARXITEKTURA-TARIXI 33, 34,
38) uchun QOLGAN ikki ish - quyidagi ro'yxatning 2- va 3-bandlari:
1. /api/orders/quick uchun ROUTE darajasidagi test: bot tuzog'i
   ({received:true}, saqlanmaydi), telefon/IP/umumiy limitlar (faqat
   muvaffaqiyatli buyurtma sanaladi), takror qator rad, mehmon DONA
   narx oladi. Admin chek route'i sarlavhalari (CSP sandbox,
   no-store) uchun test.
2. reviewTransferPayment (lib/orders/payment-transfer.ts) ni
   tranzaksiyaga o'tkaz: holat qayta o'qiladi, allaqachon to'langan
   bo'lsa ikkinchi marta yozilmaydi.
GA (1-band) va umumiy limit (4-band) ga TEGMA.
Tugagach: tsc + eslint + test + build.
Ishni main branchiga push qil (yangi branch OCHMA).
```

Tekshiruvchi (reviewer, 2026-09-26) topgan, asosiy tuzatishlardan
keyin QOLGAN nitlar. Hech biri hozir xavf emas.

1. **Google Analytics va buyurtma kaliti.** `NEXT_PUBLIC_GA_ID`
   qo'yilsa, GA4 sahifa manzilini `?t=<kalit>` bilan yozib oladi
   (`page_location`). Hozir GA productionda YO'Q (`apphosting.yaml`).
   GA yoqilishidan OLDIN: `Analytics.tsx` da `gtag('config', …,
   { page_location: <t olib tashlangan URL> })` va SPA o'tishlari
   uchun ham shu. Manzildan `t` ni o'chirish yo'li EMAS — mijoz
   sahifani saqlab/yangilab qaytib kira olmay qoladi.
2. **Testlar — BAJARILDI (2026-10).** `/api/orders/quick/route.test.ts` va admin chek `route.test.ts` qo'shildi. Eski izoh: `/api/orders/quick` (bot tuzog'i, limitlar, mehmon
   dona narx oladi) va admin chek route sarlavhalari uchun route
   darajasidagi test yo'q — sof qismlari (`order-schema`,
   `order-access`, `receipt`, `ipLimitKey`) qoplangan.
3. **Chek tasdig'i — BAJARILDI (2026-10):** `reviewTransferPayment` tranzaksiyada (`payment-transfer.test.ts`). Eski izoh: tranzaksiyasiz edi. `reviewTransferPayment` o'qib,
   keyin yozadi; `attachReceipt` tranzaksiyada va "to'langan"ni
   qayta tekshiradi, shuning uchun amalda poyga yo'q. Baribir
   tranzaksiyaga o'tkazish toza bo'lardi.
4. **Umumiy 1-klik chegarasi — ataylab qilingan kelishuv.** Soatiga
   30 ta muvaffaqiyatli mehmon buyurtmasi: 2-3 ta IP bilan hujum
   qilgan odam uni to'ldirib, 1-klikni bir soatga HAMMA uchun o'chirib
   qo'yishi mumkin (tizimga kirib buyurtma berish ishlayveradi).
   Evaziga zaxira va guruh spamdan himoyalangan. To'lsa "Actions" ga
   ogohlantirish keladi. Haqiqiy trafik 30 dan oshsa — `GLOBAL_LIMIT`
   ni oshiring (`src/app/api/orders/quick/route.ts`).
5. **Limitlar atomik emas.** `peekRateLimit` → buyurtma →
   `checkRateLimit`: parallel so'rovlar limitdan bir nechtaga oshib
   ketishi mumkin; IP limiti buni chegaralaydi.


## 15) Android ilovani sayt bilan tenglashtirish (8-14 tugagach) 🟢 ✅ BAJARILDI (ilova 1.5 → 1.5.2, 2026-10-04)

Egasining qarori: saytdagi qolgan ishlar (8-14) tugagandan KEYIN.
Ilova sayt bilan BIR XIL bo'lishi kerak — ko'rinish (shisha UI,
`docs/UI-SHISHA.md`) va imkoniyatlar: kategoriya chiplari,
"Xususiyatlari", 1 klikda buyurtma, kartaga o'tkazma + chek yuklash,
"Bepul yetkazishga X so'm qoldi", Savol-javob va Yetkazib berish
sahifalari, mijozlar fikri. Spetsifikatsiya: `ai/specs/2026-10-04-ilova-sayt-bilan-tenglashtirish.md`
— 3 ta parallel oqim (A ko'rinish+bosh sahifa+katalog — Sonnet,
B xarid oqimi — Opus, C ma'lumot sahifalari — Sonnet), keyin
integratsiya (versiya 1.5) asosiy sessiyada. Katalog bo'sh chiqishi
allaqachon tuzatilgan (1.4, `ARXITEKTURA-TARIXI.md` 36).

> **C oqimi bajarildi (2026-10-04):** `/api/content/faq`, `FaqScreen`,
> `DeliveryInfoScreen`, profil/sozlamalar havolalari.
> **A oqimi bajarildi (2026-10-04):** shisha UI, kategoriya chiplari,
> mijozlar fikri, `/api/products/chip-categories` va
> `/api/content/testimonials`.
> **B oqimi bajarildi (2026-10-04):** Xususiyatlari, 1 klikda, bepul
> yetkazish chizig'i + tavsiyalar, checkout (hudud, o'tkazma, mehmon
> buyurtmasi), `OrderPaymentScreen` + chek yuklash; saytga
> `GET /api/orders/[id]/payment` (testi bor).
> **Integratsiya bajarildi:** ilova 1.5 (6ea1d05), keyin 1.5.1 va 1.5.2 tuzatishlari.

## 16) Haqiqiy mahsulotning 3D modeli (15-banddan keyin) 🟢

Egasining qarori (2026-10-04). Hozirgi 3D sahna (`/admin/3d`,
`show3dMode`) — koddan chizilgan UMUMIY shakllar, haqiqiy mahsulot
emas; mijozga ko'rsatilsa ishonch tushadi, shuning uchun mijozlarga
YOQILMAYDI. O'rniga:

1. Admin mahsulotga 5-6 ta rasm (har tomondan) yuklaydi.
2. Rasmlar pullik image→3D xizmatiga (Meshy / Tripo kabi, ~0.2-0.5 $
   bitta modelga) yuboriladi; egasi xizmatda hisob ochib API kalit
   beradi (`secrets/**`, jumboq bilan).
3. Natija (`.glb`) bizning Storage'da; admin KO'RIB TASDIQLAGACH
   mahsulot sahifasida "3D ko'rish" (aylantirish + Android'da AR).
4. Faqat tanlangan 10-20 ta asosiy mahsulot.

CLAUDE.md 10-banddagi "3D uchun tashqi fayl yo'q" qoidasi shu ish
uchun o'zgaradi (fayl bizning Storage'da, CSP'ga faqat o'sha manba).
Avval spetsifikatsiya (`ai/specs/`, planner), keyin ishlab chiqish.

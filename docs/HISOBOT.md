# Loyiha holati: hisobot (2026-08-19)

Bu hujjat uchta savolga javob beradi:

1. nima **bajarildi**;
2. **sizdan** nima kutilmoqda (kodda emas, konsollarda qilinadigan ish);
3. nima **chala** qolgan va nega.

Oxirida — kod sifati haqidagi halol baho.

---

## 1. Bajarilgan ish (oxirgi bosqich)

| Ish | Holat | Qayerda |
|---|---|---|
| Yetkazib berish va o'rnatish va'dasi bitta manbadan (sayt, ilova, bot, kanal) | ✅ | `lib/delivery/text.ts`, Sozlamalar → Promokod va yetkazib berish |
| Blog maqolasidagi kontent videosi → Telegram kanal + YouTube | ✅ | `announceBlogPost`, `enqueueBlogPost` |
| Klassik / 3D dizayn rejimi (switcher, qurilma sinovi, "Baribir yoqish") | ✅ | `lib/ui-mode/*`, `docs/UI-3D.md` |
| Kinematik 3D hero, 3D dunyo, mahsulot konfiguratori (xrom/tillarang/mat) | ✅ | `components/three/*`, `components/3d/*` |
| **3D endi mijozga standart holda ko'rinmaydi** — admin tugmasi ortida | ✅ | Sozlamalar → Sayt ko'rinishi; `/admin/3d` sinov sahifasi |
| Kanal post tezligi: 10 daqiqada 5 ta, oshgani navbatga va avtomatik chiqadi | ✅ | `lib/telegram/channel-queue.ts`, Sozlamalar → Bot sozlamalari |
| Telegram'da mahsulot rasmini **o'chirish** (ilgari faqat qo'shish bor edi) | ✅ | `/tahrir` → 🖼 Rasm |
| Tahrir tugamaguncha kanalga post ketmaydi ("✅ Tugatish" da bir marta) | ✅ | `admin-session.ts` (`pendingAnnounce`) |
| Raqamlarni qayta tartiblashda hisoblagich ham tushadi (3945 → 87 muammosi) | ✅ | `setProductCodeCounter` |
| Telegram kirimida **hamma maydon** + `/namuna` buyrug'i | ✅ | `intake-parser.ts`, `INTAKE_SAMPLE` |
| **Kanal statistikasi**: tugma bosilishlari, forward qilingan postning hisobi, `/kanal` | ✅ | `channel-stats.ts`, `channel-report.ts`, `/k/<id>` |
| **Blog posti qayerga yuborilishi tanlanadi** (Telegram/YouTube/Instagram/Facebook) | ✅ | `BlogPost.destinations` |
| YouTube ulanishida **hisob/kanal tanlash** (noto'g'ri kanalga ulanish muammosi) | ✅ | `prompt=consent select_account` |

---

## 2. Sizdan kutilayotgan ish (kod tayyor, kalit/sozlama kerak)

Quyidagilarning **hammasining kodi yozilgan** — faqat tashqi
xizmatlarda sozlash qoldi. Har biri uchun aniq yo'riqnoma bor.

| Ish | Nega kerak | Yo'riqnoma |
|---|---|---|
| **Firestore indekslari deploy** (`firebase deploy --only firestore:indexes --project atoyo-uz`) | Indekssiz katalog zaxira so'rovda ishlaydi — tartib to'liq to'g'ri emas | `CLAUDE.md` → "Katalog indekslari" |
| **Firebase Storage yoqish** | Yoqilmaguncha rasm yuklash ishlamaydi | Firebase konsoli → Storage → Get Started |
| **`CRON_SECRET`** va Cloud Scheduler | Ijtimoiy tarmoq va kanal navbatini avtomatik bo'shatish | `docs/DEPLOY.md` → "Ijtimoiy navbatni avtomatik bo'shatish" |
| **Gemini krediti** (prepay, 5–10 $) | AI rasm generatsiyasi shusiz `429` beradi | `docs/DEPLOY.md` → "AI rasm generatsiyasi: to'lov va chegara" |
| **Instagram/Facebook ulash** | Blogda va mahsulotlarda avtomatik post | `docs/DEPLOY.md` → "Ijtimoiy tarmoqlar", 1-bo'lim |
| **YouTube'ni to'g'ri kanalga ulash** | Hozir boshqa hisobga ulangan | `docs/DEPLOY.md` → 2a bo'limi |
| **Typesense** (ixtiyoriy, 0 $ variant bor) | 3800+ mahsulotda xato yozilgan so'z topilmayapti | `docs/TYPESENSE.md` |
| **Payme/Click merchant kalitlari** | To'lov kodi tayyor, kalit kutilmoqda | `docs/DEPLOY.md` → To'lovlar |
| **Haqiqiy domen** (`atoyo.uz`) | Do'kon uchun ishonch; hozir `atoyo-uz.web.app` | DNS + Firebase Hosting |

### `CRON_SECRET` haqida qisqa javob

- **Qayerdan olinadi:** hech qayerdan — **o'zingiz yaratasiz**. Bu
  shunchaki uzun tasodifiy parol: `openssl rand -hex 32`.
- **Bitta buyruqmi:** yo'q, **uchta alohida buyruq** (yaratish →
  qiymat qo'yish → backendga ruxsat), keyin `apphosting.yaml` ga
  ikki qator. Hammasi `docs/DEPLOY.md` da ketma-ket yozilgan.
- **Almashtirish kerakmi:** yo'q. Uni faqat siz va Cloud Scheduler
  biladi; sir chiqib ketgan deb o'ylasangizgina yangisini
  `gcloud secrets versions add` bilan qo'shasiz.

---

## 3. Chala qolgan / keyingi bosqich

| Ish | Nega hozir emas |
|---|---|
| **3D ni "butun sayt 3D/4D"** darajasiga chiqarish | Siz hozirgi modellarni ma'qullamadingiz. 3D o'chirilgan holda turibdi, modellar `/admin/3d` da baholanadi. Keyingi qadam — modellarni yaxshilash, so'ng qaror |
| **Eski APK'lardagi narx** | `products` kolleksiyasi qoidalarda YOPIQ va narx faqat serverda hisoblanadi (bu bajarilgan). Lekin **eski o'rnatilgan APK'lar** hali Firestore'dan o'qishga urinishi mumkin — foydalanuvchilar ilovani yangilagach bu ham yopiladi |
| **Server regioni `us-east4`** (AQSh) | Yangi backend ochish + DNS — sizning konsolingizda bajariladi |
| **To'lov yo'llarida test yo'q** (`payme`, `click`, `create-order`) | Merchant kalitlari kelgach test kabinetida sinaladi |
| **PWA** (telefonga o'rnatiladigan sayt) | APK va Electron bor; PWA — iPhone uchun foydali, lekin shoshilinch emas |
| **`customer-bot.ts` 1779 qator** | Ishlayapti; bo'lish rejada (`catalog/cart/checkout/orders`) |
| **Rasmsiz 3800 mahsulot** | Bu kod muammosi emas — kontent muammosi. Panelda "rasmsizlarni yashirish" bor, keyingi qadam: "rasm kerak" ish navbati |
| **Uzum Pay** | Payme/Click ishga tushgandan keyin mantiqiy |

---

## 4. Kod sifati — halol baho

**Nima yaxshi:**

- **TypeScript qat'iy**: butun `src/` da bitta ham `: any` yo'q
  (432 fayl, ~55 000 qator).
- **Har commit oldidan** `tsc --noEmit` + `eslint .` + testlar +
  `npm run build` — hammasi yashil. Testlar: **26 fayl, 204 test**
  (narx, variantlar, kanal matni, navbat, CSV import, taksonomiya,
  yetkazib berish matni, i18n, SEO, jumboq, validatsiya).
- **Qoidalar bitta joyda**: narx faqat serverda (`toViewerProduct`),
  rejim qarori faqat `useImmersive()`, matn faqat `lib/delivery/text.ts`,
  format faqat `lib/format.ts`. Komponentlar shartni qayta yozmaydi.
- **Izohlar "nima" emas, "NEGA" ni tushuntiradi** va ko'pchiligi
  haqiqiy nosozlik tarixini saqlaydi ("ilgari shunday edi, shu sabab
  buzilgandi"). Bu yangi dasturchi uchun eng qimmatli qism.
- **Hujjatlar kod bilan bir commitda** yangilanadi: `CLAUDE.md`,
  `docs/REBUILD-PROMPT.md` (loyihaning to'liq tavsifi), `DEPLOY.md`,
  bo'limga xos 10 ta hujjat.
- Kodbazada bitta ham `TODO`/`FIXME` yo'q.

**Nima yaxshi emas:**

- **To'lov yo'llari testsiz** — eng katta bo'shliq. Pul bilan
  bog'liq kod (Payme Basic-auth, Click MD5 imzosi) faqat qo'lda
  tekshirilgan.
- **Uchta katta fayl** (`customer-bot.ts` 1779, `admin-session.ts`
  1424, `ProductForm.tsx` 1106) — ishlaydi, lekin bo'linishi kerak.
- **98 ta `console.*`** — endi ular yonida `reportError()` bor,
  lekin hammasi o'tkazilmagan.
- **UI testlari yo'q** — komponentlar brauzerda (Playwright bilan)
  qo'lda tekshirilgan, avtomatik emas.

**"Boshqa dasturchi AI'siz tushunadimi?"** — ha, quyidagi sabablarga
ko'ra: papka tuzilishi vazifa bo'yicha (`lib/products`, `lib/telegram`,
`lib/orders`, `lib/social`), fayl nomlari ish nomi bilan, har
modulning boshida u nima qilishi va **nega shunday** ekani yozilgan,
`docs/REBUILD-PROMPT.md` esa butun loyihani noldan tiklash uchun
yetarli darajada to'liq. Yangi odam birinchi kuni `CLAUDE.md` ni
o'qisa, arxitektura qoidalarini (narx maxfiyligi, server-only
yozuvlar, CSP, cookie cheklovi) bilib oladi — bular aynan buzilishi
oson bo'lgan joylar.

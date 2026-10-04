# Android ilovani sayt bilan tenglashtirish (AUDIT-ISHLARI 15)

> R10 spetsifikatsiyasi. Egasining qarori (2026-10-04): ilova sayt bilan
> BIR XIL bo'lsin — ko'rinish ham, imkoniyatlar ham. Ish 3 ta PARALLEL
> oqimga bo'lingan (A, B, C) — har biri alohida sessiyada, fayllari
> deyarli kesishmaydi. Oxirida integratsiya (versiya, reliz) — asosiy
> sessiyada.

## 1. Muammo

Sayt so'nggi oylarda ko'p yangilandi, ilova (`mobile/`, RN 0.76) esa
eski holida: ko'rinish eski (shisha UI yo'q), yangi imkoniyatlar yo'q —
1 klikda buyurtma, kartaga o'tkazma + chek, kategoriya chiplari,
"Xususiyatlari", "Bepul yetkazishga X so'm qoldi", Savol-javob va
Yetkazib berish sahifalari, mijozlar fikri. Mijoz sayt va ilovada ikki
xil do'kon ko'radi.

## 2. Qamrov

**Qilinadi (3 oqim):**

- **A — Ko'rinish + Bosh sahifa + Katalog.** Shisha dizayn
  (`docs/UI-SHISHA.md` 6-bo'lim), kategoriya chiplari (bosh sahifa va
  katalog boshida), bosh sahifada "Mijozlar fikri", mahsulot
  kartochkasi saytdagidek.
- **B — Xarid oqimi.** Mahsulot sahifasida "Xususiyatlari" ro'yxati va
  "1 klikda sotib olish"; savatda "Bepul yetkazishga X so'm qoldi" +
  farqni yopadigan mahsulotlar; checkout'da kartaga o'tkazma, hudud
  tanlovi, kirmagan mijozga "Ro'yxatdan o'tmasdan buyurtma berish";
  buyurtmadan keyin to'lov ekrani (karta raqami, summa, CHEK YUKLASH).
- **C — Ma'lumot sahifalari + server API.** Savol-javob va Yetkazib
  berish ekranlari, menyu/profildan havolalar; ular uchun saytda ochiq
  API'lar.

**QILINMAYDI:**

- Admin ekranlari (`Admin*Screen.tsx`) — tegilmaydi.
- 3D (16-band), iOS, Play Store relizi.
- Narx mantiqi — ilova HISOB QILMAYDI (CLAUDE.md 1-band): narx,
  yetkazish narxi va jami SERVERDAN; ekrandagi oldindan hisob faqat
  ko'rsatish uchun (`deliveryFeeFor` nusxasi kerak bo'lsa —
  `mobile/src/delivery-text.ts` kabi SOF modul + sayt bilan parity
  testi).
- Versiyani ko'tarish (`APP_VERSION`, `versionName`) — FAQAT
  integratsiya bosqichida, oqimlar TEGMAYDI.

## 3. Tegiladigan fayllar (oqim bo'yicha — kesishmaslik uchun)

| Oqim | Fayllar |
|---|---|
| A | `mobile/src/theme.tsx`, `mobile/src/components/ui.tsx`, `ProductCard.tsx`, `BrandHeader.tsx`, `HomeScreen.tsx`, `CatalogScreen.tsx`, YANGI `components/CategoryChips.tsx`, `components/Testimonials.tsx`, `navigation/RootNavigator.tsx` (faqat pastki tab ko'rinishi); sayt: YANGI `src/app/api/products/chip-categories/route.ts` (→ `loadChipCategories`), `src/app/api/content/testimonials/route.ts` (→ `loadTestimonials`) |
| B | `ProductScreen.tsx`, `CartScreen.tsx`, `CheckoutScreen.tsx`, YANGI `screens/OrderPaymentScreen.tsx`, YANGI `components/FreeDeliveryProgress.tsx`, `components/QuickBuySheet.tsx`, YANGI `mobile/src/checkout-api.ts`, `mobile/src/specs.ts` (sayt `lib/products/specs.ts` nusxasi + parity testi) |
| C | YANGI `screens/FaqScreen.tsx`, `screens/DeliveryInfoScreen.tsx`, YANGI `mobile/src/content-api.ts`, `ProfileScreen.tsx`/`SettingsScreen.tsx` (havolalar); sayt: YANGI `src/app/api/content/faq/route.ts` (→ `getPublicFaq`, `localizeFaq`) |

**Umumiy fayllar** (`mobile/src/navigation/types.ts`,
`RootNavigator.tsx` ekran ro'yxati, `mobile/src/i18n.tsx`) ga hamma
qo'shadi: faqat O'Z qatorlarini QO'SHING, mavjudini qayta tartiblamang;
push oldidan `git pull --rebase origin main`, ziddiyat bo'lsa ikkala
tomonni saqlab birlashtiring. `mobile/src/api.ts` ga TEGMANG — yangi
funksiyalar oqimning o'z faylida (`checkout-api.ts`, `content-api.ts`).

## 4. Yechim

### A — Ko'rinish

1. `theme.tsx`: shisha tokenlari (karta 0.65, header/nav 0.9 shaffof,
   chegara, soya) — yorug' va to'q tema; `docs/UI-SHISHA.md` 6-bo'lim:
   haqiqiy blur faqat header, pastki nav va modal'da
   (`@react-native-community/blur`, yangi nativ paket →
   `scripts/check-codegen.mjs` ro'yxatiga), boshqa joyda rgba + chegara.
   Android < 31 da blur o'rniga shaffof rang.
2. `ui.tsx` dagi umumiy komponentlar (karta, tugma, input) yangi
   tokenlarga o'tadi — boshqa ekranlar avtomatik yangilanadi.
3. Kategoriya chiplari: `GET /api/products/chip-categories` (faqat
   mahsuloti bor, 5 daq. kesh, javobda narx YO'Q). Bosh sahifada va
   katalog tepasida gorizontal aylantiriladigan qator; katalogda
   bosilganda filtr qo'llanadi (server so'rovi `buildQuery` bilan —
   `URLSearchParams` TAQIQ, CLAUDE.md 13).
4. Mijozlar fikri: `GET /api/content/testimonials` (`pickTestimonials`
   ko'rinishi — uid/familiya YO'Q). Bo'sh bo'lsa bo'lim chizilmaydi.
5. Katalog birinchi ekrani saytdagidek aralash bo'lsin: agar
   `/api/products/list` filtrsiz so'rovda allaqachon aralash bersa —
   o'zgartirish yo'q; bermasa SAYT route'ini o'zgartirmang, faqat
   ilovada `fetchShowcase` dan foydalaning.

### B — Xarid oqimi

1. Mahsulot ekrani: "Xususiyatlari" (sayt `productSpecs` bilan bir xil
   natija — sof nusxa `mobile/src/specs.ts` + parity testi
   `src/lib/products/specs-mobile-parity.test.ts`) va "1 klikda sotib
   olish" (pastdan chiquvchi oyna: ism, telefon, manzil, hudud, to'lov
   naqd/o'tkazma, jami) → `POST /api/orders/quick`.
2. Savat: "Bepul yetkazishga X so'm qoldi" chizig'i
   (`freeDeliveryGap` — `delivery-text.ts` ga qo'shiladi, parity testi
   yangilanadi) + `GET /api/products/gap-fillers` dan 2-4 ta tavsiya.
3. Checkout: to'lov usullari `GET /api/payment-info` bo'yicha (naqd,
   o'tkazma faqat yoqilgan bo'lsa, onlayn — mavjud kod); hudud
   tanlovi `delivery.zones` dan; kirmagan mijozga "Ro'yxatdan
   o'tmasdan buyurtma berish" → `/api/orders/quick` (butun savat,
   ≤ 20 qator, ≤ 99 dona — chegaradan oshsa aniq xabar).
4. To'lov ekrani (`OrderPaymentScreen`): buyurtmadan keyin, o'tkazmada
   — karta raqami (nusxalash), summa, "Chekni yuklash"
   (`react-native-image-picker` allaqachon bor) →
   `POST /api/orders/<id>/receipt?t=<accessToken>` multipart, faylda
   `Content-Length` bo'lishi SHART (route 411 qaytaradi). `accessToken`
   faqat qurilmada saqlanadi (AsyncStorage, buyurtma bo'yicha), serverga
   faqat shu yo'lda yuboriladi. Profil → Buyurtmalarim'dan ham shu
   ekranga kirish.

### C — Ma'lumot sahifalari

1. Sayt: `GET /api/content/faq?locale=uz|ru` → `{ items: [{question,
   answer}] }` (`getPublicFaq` + `localizeFaq`, 5 daq. `publicCacheHeaders`).
2. Ilova: `FaqScreen` (akkordeon — BITTASI ochiq, boshqasi yopiladi,
   silliq animatsiya `LayoutAnimation`), `DeliveryInfoScreen`
   (`/api/delivery` + `/api/payment-info` → `freeDeliveryText`,
   hududlar, o'rnatish, faqat yoqilgan to'lov usullari — sayt
   `/yetkazib-berish` bilan bir xil mazmun).
3. Profil/Sozlamalar menyusiga: Yetkazib berish, Savol-javob,
   Maxfiylik siyosati (`https://atoyo.uz/maxfiylik` brauzerda).

## 5. Qabul mezoni

- [ ] Har oqimda: sayt `npx tsc --noEmit && npx eslint . && npm test &&
      npm run build`; ilova `cd mobile && npx tsc --noEmit && npx eslint
      'src/**/*.tsx' --no-ignore` (+ yangi nativ paket bo'lsa
      `npm run check-codegen`) — yashil.
- [ ] Yangi sayt route'lari narx/tannarx/uid qaytarmaydi (test bilan).
- [ ] Ilovada `URLSearchParams` yo'q (`grep` toza).
- [ ] B: chek yuklash `Content-Length` bilan; 411/413/404 xatolari
      mijozga o'zbekcha.
- [ ] Hech bir oqim versiyani ko'tarmagan.
- [ ] Hujjatlar: `docs/REBUILD-PROMPT.md` (ilova bo'limi), kerak bo'lsa
      `CLAUDE.md` 13-band, `docs/AUDIT-ISHLARI.md` 15-band holati.

## 6. Xavflar

- CLAUDE.md 1: ilova narx hisoblamaydi; yangi API'lar
  `toViewerProducts()` + `no-store` (mahsulot qaytarsa).
- CLAUDE.md 13: `URLSearchParams` taqiqlangan; yangi nativ paket →
  codegen ro'yxati; APK faqat CI'da yig'iladi (sandbox'da tekshirib
  bo'lmaydi — shuning uchun tsc/eslint qat'iy).
- CLAUDE.md 15: mehmon yo'li chegaralari serverda; chek tokeni loglarga
  yozilmaydi.
- Uch oqim bir vaqtda `main` ga yozadi — `i18n.tsx`, navigatsiya
  fayllarida ziddiyat bo'lishi mumkin (rebase bilan hal qilinadi).

## 7. Testlar

- Sayt: `api/products/chip-categories`, `api/content/testimonials`,
  `api/content/faq` — javob shakli, maxfiy maydon yo'qligi.
- Parity: `specs` (B), `freeDeliveryGap` (B, mavjud
  `mobile-parity.test.ts` ga).
- `mobile/src/*` sof modullari — `vitest.config.ts` `include` ga qo'shish
  kerak bo'lsa qo'shing.

## Integratsiya (asosiy sessiya, oqimlardan KEYIN)

1. Uch oqim diffini tekshiruvchi bilan ko'rish.
2. Versiya 1.5 (`APP_VERSION` + `versionName` + `versionCode`).
3. CI APK yig'adi → egasi admin → "Ilova yangilanishi" ga 1.5.

## Keyinroq (bu ishga KIRMAYDI)

- 3D ko'rish (16-band), iOS, Play Store.

# Atoyo Santexnika & Otopleniye — loyiha yo'riqnomasi

10 000+ mahsulotli santexnika/isitish do'koni. **Stack:** Next.js 16.2 (App Router,
Turbopack) · TypeScript · Firebase (Client + Admin SDK) · Redux Toolkit · Tailwind + MUI ·
Telegram bot · React Native ilova (`mobile/`) · Electron (`desktop/`). UI o'zbekcha.

> Bu fayl qisqa. **Har bo'limning to'liq qoidasi — `docs/QOIDALAR.md` (raqamlar bir xil).**
> Bo'limga tegishli kodni o'zgartirishdan oldin o'sha bo'limni o'qing.
> "Nega shunday" tarixi — `docs/ARXITEKTURA-TARIXI.md`. Ziddiyatda CLAUDE.md + QOIDALAR.md ustun.

## Ish tartibi

- Branch: **`main`** (default; App Hosting shundan deploy qiladi). Boshqa branch'ga push yo'q,
  PR faqat so'ralganda. **Deploy = git push** (Firebase App Hosting, loyiha `atoyo-uz`,
  https://atoyo.uz). Sandbox'dan to'g'ridan-to'g'ri deploy qilinmaydi.
- Konteyner recycle'dan keyin `.claude/hooks/session-start.sh` tiklaydi; tez-tez commit + push.
- Marshrut (o'zim / reja + rozilik / alohida sessiya): `docs/ISH-ARXITEKTURASI.md`,
  rollar `.claude/agents/`, spetsifikatsiyalar `ai/specs/`.

**Tekshiruv (commit oldidan MAJBURIY):**
```bash
pkill -f "next[-]server" 2>/dev/null
npx tsc --noEmit && npx eslint . && npm test && npm run build
```
Ilova tegilsa: `cd mobile && npx tsc --noEmit` va `npx eslint 'src/**/*.tsx' --no-ignore`
(+ yangi nativ paketda `npm run check-codegen`).

**Hujjat (o'sha commitda):** `docs/REBUILD-PROMPT.md`, qoida o'zgarsa CLAUDE.md/QOIDALAR.md,
env bo'lsa `docs/DEPLOY.md`, `README.md`, sezilarli nosozlik — `ARXITEKTURA-TARIXI.md`.

# BUZILMAS QOIDALAR (qisqa)

1. **Narx maxfiyligi (eng muhim).** `price` = OPTOM, `costPrice` = TANNARX. Mijozga chiqadigan
   har mahsulot `toViewerProduct(s)()` dan o'tadi; `products` Firestore'da yopiq, hammasi
   `/api/products/*` orqali, `no-store`. Ustama foizi mijozga berilmaydi. Kanal/push/vitrina —
   DONA narx. `orders` da `costPrice` yo'q (`orderCosts/{id}`). Server birinchi sahifasi faqat
   filtr mos kelsa; kategoriya o'tishi `?category=` bilan.
2. **Server.** `src/proxy.ts` edge-safe (firebase-admin import yo'q); haqiqiy rol —
   `admin/layout.tsx`. Admin yozuvlari faqat `/api/admin/*`. Server komponentga funksiya prop
   berilmaydi. OG rasmda emoji yo'q. MUI temasi redux'dan tanlanmaydi (`.dark` klass).
   Admin xatosi `validationMessage` bilan.
3. **CSP** `src/proxy.ts` da (nonce bilan); yangi tashqi manba → ro'yxat + test; yangi inline
   `<script>` ga `nonce` SHART. Hosting faqat `__session` cookie o'tkazadi.
4. **Telegram kanal.** Avval yangi post, keyin eskisi o'chiriladi. Uzun matn `truncateHtml()`.
   Video havola bilan emas, multipart. Post tezligi navbat bilan (`channelQueue`), tartib xilma-xil.
5. **Storage.** Olib tashlangan rasm ataylab qoladi; tozalash faqat "Storage tozalash" orqali
   (30 kun, 40% qalqon).
6. **Mahsulot.** Majburiy: nomi, kod, tannarx, optom narx, soni, kategoriya. Brend/davlat —
   `metadata/facets` dan. Mijozga `publicDescription()`. O'chirilgan → savat 30 kun. `isActive`
   — yagona ko'rinish filtri; `isDraft` — nashr qilinmagan.
7. **Turlar.** Import: har tur alohida qator. Kirim qatori faqat `parseVariantLine()` bilan.
   Tanlagich track'ida `touch-pan-y`.
8. **Kategoriya tanish** — `foldForMatch()` + Levenshtein (`matchTaxonomy`).
9. **Yetkazish matni** kodda qattiq yozilmaydi (`settings/delivery`, `lib/delivery/text.ts`);
   ilova nusxasi `mobile/src/delivery-text.ts` — parity testi bilan qulflangan.
10. **3D** mijozga standart holda ko'rinmaydi (`show3dMode`); shart faqat `useImmersive()`;
    `three`/`gsap`/`framer-motion` faqat dinamik import; tashqi 3D fayl yo'q.
11. **Blog/ijtimoiy** — har maqolada `destinations`; navbat `socialQueue`; faqat DONA narx.
12. **AI** (`src/lib/ai/`) — narx/zaxira faqat `context.ts` dan; har `messages.create` dan keyin
    `recordTokenUse()`; oylik $ chegarasi `assertTokenQuota()`.
13. **Mobil** — `APP_VERSION` = `versionName` (test bor); `URLSearchParams` ishlatilmaydi
    (`buildQuery()`); Android'da blur va yarim shaffof fonga `elevation` yo'q; xarid API
    `checkout-api.ts`, ilova summa hisoblamaydi.
14. **i18n** — tilni URL beradi (`/ru` prefiksi, proxy rewrite); ichki havola mantiqiy yo'l bilan
    (`LocaleLink` / `localeHref`), qo'lda `/ru${...}` taqiqlangan; har sahifa `localeAlternates()`.
15. **To'lov** — mijoz kartasi saqlanmaydi; o'tkazma + chek (`receipts/`, ochiq URL yo'q);
    1 klik `/api/orders/quick` limitlari; `orders` ni client yaratolmaydi; buyurtma sxemasi
    bitta joyda.
16. **FAQ/yetkazish sahifalari** — qattiq va'da yo'q; "Mijozlar fikri" faqat haqiqiy sharhdan.

Xarita (bot fayllari, `/tv`, desktop, pochta), hujjatlar jadvali va ma'lum bloklar —
`docs/QOIDALAR.md` oxirida.

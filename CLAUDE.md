# Atoyo Santexnika & Otopleniye — loyiha yo'riqnomasi

Katta hajmli (10 000+ mahsulot) santexnika/isitish e-commerce sayti.
**Stack:** Next.js 16.2.x (App Router, Turbopack) · TypeScript · Firebase
(Client + Admin SDK) · Redux Toolkit · Tailwind + MUI · ikki tomonlama
Telegram bot. UI tili — o'zbekcha. Dizayn: Deep Navy/Slate + Aqua `#00D2C4`.

## Branch va deploy

- Ish branch'i: **`claude/plumbing-ecommerce-nextjs-jxpmh5`**. Boshqa branch'ga
  push qilinmaydi (ruxsatsiz).
- **Deploy = git push.** Netlify GitHub'dan avtomatik build qiladi. Bu
  sandbox'dan **to'g'ridan-to'g'ri (zip) deploy QILINMAYDI** — tarmoq siyosati
  `*.netlify.app` upload hostlarini 403 bilan bloklaydi.
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

- Ko'p tillik uz/en/ru (boshlanmagan).
- Payme/Click to'lov integratsiyasi (foydalanuvchi merchant kalitlari kerak).
- To'liq "hamma narsa Telegramda" pariteti; profil rasm/email/parol tahrirlash.

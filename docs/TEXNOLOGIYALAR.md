# Loyiha nimadan qurilgan

Har bir qism qaysi texnologiyada yozilgani va **nega aynan shunday**.
Raqamlar haqiqiy o'lchovdan (`wc -l`, `package.json`).

---

## Asosiy tamoyil: bitta kod bazasi, bitta API

Alohida backend server **yo'q**. Next.js'ning API route'lari
(`src/app/api/*`) backend vazifasini bajaradi va **hamma kanal**
shundan oziqlanadi:

```
                    ┌─────────────────────┐
   Sayt ────────────┤                     │
   Telegram bot ────┤   /api/*  (Next.js) ├──── Firestore
   Mobil ilova ─────┤   Admin SDK         │     Storage
   Desktop ─────────┤                     │     Auth
   Televizor /tv ───┤                     │
                    └─────────────────────┘
```

Shuning uchun narx qoidasi, yetkazib berish matni yoki mahsulot
tavsifi **bir joyda** o'zgaradi — hamma joyda o'zgaradi. Bu loyihaning
eng muhim arxitektura qarori.

---

## 1. Sayt — `src/` (≈59 200 qator TS/TSX)

| Vazifa | Texnologiya |
|---|---|
| Asos | **Next.js 16.2** (App Router, Turbopack) · **React 19** · **TypeScript 5.7** |
| Uslub | **Tailwind CSS 3** + **MUI 6** (emotion bilan) |
| Ikonkalar | lucide-react, MUI Icons |
| Holat (savat, filtrlar) | **Redux Toolkit** + redux-persist — savat brauzerda saqlanadi |
| Kirish ma'lumotini tekshirish | **Zod** — har bir API kirishida |
| Rasm optimizatsiyasi | **sharp** (serverda siqiladi va o'lchami kichraytiriladi) |
| Excel import | read-excel-file |
| Qidiruv | **Fuse.js** — xato yozilsa ham topadi (`lib/search/fuzzy.ts`) |
| Karusel | Swiper |
| QR kod | qrcode-generator |
| 3D rejim | **three.js** + @react-three/fiber + drei; animatsiya **gsap**, **framer-motion** |

**3D uchun eslatma:** bu paketlar FAQAT dinamik import bilan
yuklanadi. 3D o'chiq bo'lsa (standart holat) mijozga umuman
yuborilmaydi — `CLAUDE.md` 10-bo'lim.

## 2. Telegram bot — `src/lib/telegram/`

**Kutubxona ishlatilmagan.** Telegraf ham, grammY ham yo'q — Telegram
Bot API ga to'g'ridan-to'g'ri `fetch` bilan murojaat qilinadi
(`bot.ts`).

*Nega:* bizga kerak bo'lgan narsa oz (xabar, albom, video, tugma,
429 qayta urinish). Kutubxona esa qo'shimcha bog'liqlik, o'z
abstraksiyasi va o'z cheklovlarini olib keladi — masalan videoni
multipart yuborish yoki `retry_after` ni o'qish kabi joylarda
ular xalaqit berardi.

**Ishlash usuli — webhook:** bot alohida serverda emas, saytning
ichida yashaydi. Telegram `/api/telegram-webhook` ga xabar yuboradi.

## 3. Ma'lumotlar bazasi va saqlash — Firebase

| Xizmat | Nima uchun |
|---|---|
| **Firestore** | Butun baza: mahsulot, buyurtma, foydalanuvchi, sozlama |
| **Storage** | Rasm va videolar |
| **Authentication** | Kirish: email, Google, Telegram, telefon |
| **Cloud Messaging** | Ilovaga push xabarnoma |
| **App Hosting** | Sayt shu yerda ishlaydi |

Serverda `firebase-admin`, brauzerda `firebase` SDK.
**Rate-limit ham Firestore'da** (`rateLimits` kolleksiyasi) — Redis
kabi qo'shimcha xizmat kerak emas.

## 4. Mobil ilova — `mobile/` (≈8 500 qator)

**React Native 0.76.5**, "bare CLI" — **Expo EMAS**.

*Nega Expo emas:* bosh ekran widgetlari (Kotlin) va
`react-native-video` nativ modul talab qiladi; Expo'ning boshqariladigan
oqimida ular uchun chiqib ketish (`prebuild`) baribir kerak bo'lardi.

| Vazifa | Texnologiya |
|---|---|
| Navigatsiya | React Navigation 7 (bottom-tabs + native-stack) |
| Firebase | `@react-native-firebase` — app, auth, firestore, messaging |
| Google kirish | `@react-native-google-signin` |
| Video | `react-native-video` |
| Rasm tanlash | `react-native-image-picker` |
| Holat | Redux Toolkit + redux-persist |

## 5. Bosh ekran widgetlari — `mobile/android/.../widget/` (≈510 qator)

**Kotlin** + **Jetpack Glance 1.1.1** (Compose asosidagi widget
tizimi). Uchta widget: buyurtmalar, savat, xodim.

Ma'lumot RN tomonidan SharedPreferences'ga yoziladi, widget esa
o'shandan o'qiydi — widget tarmoqqa chiqmaydi.

## 6. Kompyuter ilovasi — `desktop/` (≈550 qator)

**Electron 33** + electron-builder 25 (Windows/Linux/macOS).

**UI ataylab yozilmagan** — ilova saytning O'ZINI ochadi. Aks holda
interfeysning uchinchi nusxasi paydo bo'lardi va har o'zgarish uch
joyda takrorlanardi.

## 7. Sun'iy intellekt — `src/lib/ai/`

| Nima | Model |
|---|---|
| Matn yordamchisi, rasm tahlili, rasmdan qidirish | **Anthropic SDK** (Claude) |
| Mahsulot rasmini generatsiya qilish | **Gemini** — to'g'ridan-to'g'ri REST, SDK'siz |

Ikkalasining sarfi `aiUsage/<YYYY-MM>` da sanaladi va oylik chegara
bilan cheklanadi (`CLAUDE.md` 12-bo'lim).

## 8. Qolgan qismlar

| Nima | Texnologiya |
|---|---|
| Pochta | **nodemailer** (SMTP) |
| To'lov (Payme, Click) | **O'z kodimiz** — tayyor kutubxona yo'q: imzo tekshiruvi, JSON-RPC |
| Testlar | **Vitest** — 42 fayl, 291 test |
| CI | **GitHub Actions** — 3 ta ish: sifat tekshiruvi, Android APK, Firestore qoidalari/indekslari |
| Deploy | `git push` = deploy (Firebase App Hosting o'zi yig'adi) |

---

## Ataylab ISHLATILMAGANI

Bu ham qaror — "nega yo'q" degan savol tez-tez chiqadi:

| Nima | Nega yo'q |
|---|---|
| Alohida backend (Express/Nest) | Next.js API route'lari yetarli; ikkinchi server = ikkinchi deploy, ikkinchi monitoring |
| ORM (Prisma kabi) | Firestore hujjatli baza — ORM mos kelmaydi |
| Docker | App Hosting o'zi konteynerlaydi |
| Redis | Rate-limit Firestore'da; alohida xizmat uchun sabab yo'q |
| **Sentry** | Xatolar Telegram guruhiga tushadi — bepul, telefonga darhol keladi va mavjud infratuzilmadan foydalanadi |
| Expo | Nativ widget va video pleyer uchun cheklov bo'lardi |
| Telegram bot kutubxonasi | Yuqoriga qarang |

## Hali yo'q (rejada)

- **PWA** — `public/manifest.json` yo'q; sayt telefonga "o'rnatilmaydi"
- **Typesense** — kod tayyor, server va kalit kerak (`docs/TYPESENSE.md`)
- **Uzum Pay** — Payme/Click ishga tushgandan keyin

---

## Hajm (haqiqiy o'lchov)

| Qism | Qator |
|---|---|
| `src/` (sayt + bot + API) | 59 190 |
| `mobile/src/` (ilova) | 8 541 |
| `scripts/` | 1 219 |
| `desktop/` | 546 |
| Kotlin (widgetlar) | 514 |
| **Testlar** | 42 fayl / 291 test |

# Atoyo Santexnika — mobil ilova (React Native CLI)

Saytning (`atoyo-uz.web.app`) mijozlar uchun mo'ljallangan mobil
versiyasi. Bir xil Firebase loyihasi va bir xil API bilan ishlaydi:
saytda ochilgan hisob ilovada ham amal qiladi, savat/buyurtmalar bitta
bazada.

## Nimalar bor

| Bo'lim | Imkoniyat |
|---|---|
| Bosh sahifa | brend banneri, kategoriyalar, yangi mahsulotlar |
| Katalog | qidiruv, filtr (kategoriya/brend/saralash) modal ichida |
| Mahsulot | rasm, narx va chegirma, zaxira, reyting, sharhlar, sharh yozish |
| Savat | soni +/−, o'chirish, jami hisob |
| Rasmiylashtirish | ism/telefon/manzil, to'lov usuli, **promokod**, yetkazish narxi |
| Buyurtmalarim | real-vaqt status, buyurtmani bekor qilish |
| Sevimlilar | telefon xotirasida saqlanadi |
| Profil | Google/Telegram/email bilan kirish, parolni tiklash, ma'lumotlarni tahrirlash |
| Blog | maqolalar ro'yxati va to'liq matn |
| Bog'lanish | ariza formasi (xodimlar guruhiga tushadi) |
| Sozlamalar | **dark/light/tizim** temasi, **til uz/en/ru**, yangiliklarga obuna |

Tema va til tanlovi telefon xotirasida saqlanadi; header'da (saytdagi kabi)
til va tema tugmalari, savat/sevimlilar belgilari turadi.

Narx, zaxira va promokod tekshiruvi **serverda** (`/api/orders`) — ilova
faqat ko'rsatadi. Ilova Firebase ID tokenini `Authorization: Bearer`
sarlavhasida yuboradi.

## Ishga tushirish

### 1. Talablar
- Node.js 18+
- Android Studio (Android SDK 35) yoki Xcode 15+ (iOS)
- JDK 17

### 2. Paketlarni o'rnatish
```bash
cd mobile
npm install
# iOS uchun qo'shimcha:
cd ios && pod install && cd ..
```

### 3. Firebase sozlash (majburiy)
Firebase konsolida `atoyo-uz` loyihasiga ilova qo'shing:

**Android:** Project settings → Add app → Android
- Package name: `com.atoyo`
- `google-services.json` ni yuklab olib **`android/app/`** ichiga qo'ying

**iOS:** Add app → iOS
- Bundle ID: `org.reactjs.native.example.AtoyoApp` (yoki o'zingiznikiga
  o'zgartiring — Xcode'da ham yangilang)
- `GoogleService-Info.plist` ni **`ios/AtoyoApp/`** ichiga qo'ying

Gradle plagini allaqachon yoqilgan (`android/build.gradle` va
`android/app/build.gradle`) — sizga faqat `google-services.json` ni
qo'yish qoladi.

### 4. Ishga tushirish
```bash
npm start          # Metro
npm run android    # yoki: npm run ios
```

### 5. Release APK yig'ish
```bash
cd android
./gradlew assembleRelease
# natija: android/app/build/outputs/apk/release/app-release.apk
```

Play Store uchun `bundleRelease` va imzo kaliti kerak — Android
hujjatlaridagi "Generating signed APK" bo'limiga qarang.

## Tuzilma

```
src/
  App.tsx            — provayderlar (redux, auth, navigatsiya)
  theme.tsx          — palitra (light/dark) + ThemeProvider
  i18n.tsx           — uz/en/ru lug'at + LocaleProvider
  types.ts           — Product/Order/Review turlari (sayt bilan bir xil)
  firebase.ts        — Firestore o'qishlari (katalog, qidiruv, buyurtmalar)
  api.ts             — saytning API'si (buyurtma, promokod, sharh)
  auth.tsx           — Firebase Auth + users hujjati
  social-auth.ts     — Google va Telegram orqali kirish
  google-config.ts   — Google web client ID (CI to'ldiradi)
  store/             — redux (savat, sevimlilar) + AsyncStorage
  navigation/        — tab va stack
  screens/           — ekranlar
  components/        — umumiy UI
```

## Eslatmalar

- **Push-bildirishnoma** hozircha yo'q. Qo'shish uchun
  `@react-native-firebase/messaging` va serverda FCM token saqlash kerak.
- **Google bilan kirish** ishlashi uchun Firebase konsolida ikki narsa
  kerak:
  1. Authentication → Sign-in method → **Google** yoqilgan bo'lishi
     (shunda `google-services.json` ichida `client_type: 3` yozuvi paydo
     bo'ladi — ilova web client ID'ni shu yerdan oladi, CI avtomatik
     qo'yadi);
  2. Android ilova sozlamalarida **SHA-1** barmoq izi qo'shilgan bo'lishi.
     CI debug kaliti bilan imzolaydi, uning SHA-1 i:
     `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
     (Project settings → Android app → Add fingerprint). O'z keystore'ingiz
     bilan yig'ilganda uning SHA-1 i ham qo'shilishi kerak:
     `keytool -list -v -keystore <fayl> -alias <alias>`.

  Bu sozlanmagan bo'lsa tugma ilovada ko'rinmaydi — qolgan kirish
  usullari ishlashda davom etadi.
- **Telegram bilan kirish** uchun qo'shimcha token/sozlash KERAK EMAS.
  Ilova saytning `/api/auth/telegram/start` route'idan bir martalik kod
  oladi, `t.me/<bot>?start=login_<kod>` ni ochadi va foydalanuvchi botda
  "Start" bosgach Firebase custom token'iga almashtiradi. Widget ham,
  BotFather'dagi `/setdomain` ham ishtirok etmaydi.
- Onlayn to'lov saytdagi `/tolov/<id>` sahifasiga yo'naltiradi (Payme/Click
  kalitlari ulangach ishlaydi).

## Widgetlar (Android bosh ekrani)

Uchta bosh ekran widget'i bor, hammasi `androidx.glance` (Jetpack
Glance) bilan Kotlin'da yozilgan — `android/app/src/main/java/com/atoyoapp/widget/`:

1. **Mening buyurtmam** (2x2) — oxirgi buyurtma raqami, holati
   (🕓/✅/🚚/🎉/❌) va summasi; buyurtma yo'q bo'lsa "Buyurtma yo'q" va
   katalogga havola.
2. **Savat** (2x1) — savatdagi mahsulot soni va umumiy summa.
3. **Xodim uchun: bugungi buyurtmalar** (2x2) — FAQAT admin/xodim
   hisobida ma'lumot bor (rol tekshiruvi RN tomonida — xodim
   bo'lmasa yozilmaydi va widget "Ma'lumot yo'q" deydi).

**Arxitektura — widget tarmoqqa O'ZI CHIQMAYDI.** React Native
tomoni (`src/widgets.ts`) ma'lumotni tayyorlaydi (narxni
`formatSom()` bilan formatlaydi, xodim uchun rolni tekshiradi) va
nativ modul (`AtoyoWidgetsModule.kt`, `NativeModules.AtoyoWidgets`)
orqali oddiy JSON qilib **SharedPreferences**'ga yozadi. Glance
widget shu yozuvni FAQAT O'QIYDI va chizadi — token boshqarish yoki
Firestore/HTTP so'rovi widget kodida yo'q, bu xavfsizroq va tezroq
(widget alohida process'da ham ishga tushishi mumkin).

Yozish (`writeOrderWidget`/`writeCartWidget`/`writeStaffWidget`)
quyidagi paytlarda bo'ladi:

- **Ilova ochilganda** — `useWidgetSync()` (`App.tsx`) oxirgi
  buyurtmani va (xodim bo'lsa) bugungi statistikani Firestore'dan
  o'qib yozadi.
- **Buyurtma yaratilganda** — `CheckoutScreen` hujjatni o'qib
  (narx serverda qayta hisoblangani uchun) widget'ni yangilaydi.
- **Buyurtma statusi push orqali kelganda** — `push.ts` va
  `index.js` (ilova fonda/yopiq bo'lganda ham) `orderId`ni o'qib
  hujjatni Firestore'dan qayta oladi.
- **Savat o'zgarganda** — `useWidgetSync()` har Redux o'zgarishida
  yozadi (bu to'liq lokal, tarmoq kerak emas).

Widget bosilganda ilova `atoyo://` sxemasi bilan tegishli ekranda
ochiladi (`atoyo://buyurtmalar`, `atoyo://savat`,
`atoyo://xodim-buyurtmalar`, `atoyo://katalog`) — `MainActivity`
buni qabul qiladi, `App.tsx` dagi React Navigation `linking`
konfiguratsiyasi ekranga yo'naltiradi.

Ranglar `theme.tsx` dagi Deep Navy/Aqua-Gold palitrasi bilan bir xil
(`widget/WidgetTheme.kt`) va tungi/kunduzgi rejimga qarab tanlanadi.

## APK'ni GitHub'da yig'ish (kompyuterda Android Studio kerak emas)

Repoda `.github/workflows/ci.yml` bor: har push'da avval tekshiruv
(typecheck + lint + sayt build), keyin **release APK** yig'iladi va
`atoyo-apk` artifakti sifatida 14 kun saqlanadi.

Ishlashi uchun bitta secret kerak:

1. Firebase konsolida Android ilova qo'shing — **package name ANIQ
   `com.atoyo`** bo'lishi shart (bu ilovaning `applicationId` si).
   Boshqa nom bilan ro'yxatdan o'tkazilsa Gradle
   `No matching client found for package name 'com.atoyo'` xatosini
   beradi. Bitta Firebase loyihasida bir nechta Android ilova bo'lishi
   mumkin, shuning uchun mavjudini o'chirish shart emas — yangisini
   qo'shsangiz bo'ladi. Keyin `google-services.json` ni yuklab oling
2. Faylni ochib **butun mazmunini nusxalang** (base64 qilish shart emas)
3. GitHub → repo → **Settings → Secrets and variables → Actions →
   New repository secret**
   - Name: `GOOGLE_SERVICES_JSON`
   - Secret: nusxalangan JSON matni (base64 ko'rinishi ham qabul qilinadi)

> Fayl repoda saqlanmaydi — repo ochiq bo'lgani uchun uni secret'da
> ushlab turish to'g'ri bo'ladi.

Keyingi push'da APK tayyor bo'ladi: **Actions → oxirgi run → Artifacts →
atoyo-apk**. Uni telefonga o'rnatib sinab ko'rsangiz bo'ladi
("Noma'lum manbalardan o'rnatish" ruxsati kerak).

### Doimiy yuklab olish havolasi

Artifakt 14 kunda o'chadi va uni olish uchun GitHub akkaunti kerak.
Shuning uchun default branch'ga har push'da APK **ochiq Release**'ga ham
joylanadi (`latest` tegi har build'da shu commit'ga ko'chadi):

```
https://github.com/Abdulmajidkhan007/atoyo-e-commerce/releases/latest/download/app-release.apk
```

Bu havola doim oxirgi build'ga olib boradi va akkauntsiz ochiladi —
portfolio saytidagi "Ilovani yuklab olish" tugmasiga shuni qo'ying.
Release izohida commit SHA va build sanasi turadi. Fayl nomini
(`app-release.apk`) o'zgartirmang — havola aynan shu nomga bog'liq.

> Bu APK **debug kaliti** bilan imzolanadi — sinash uchun yetarli, lekin
> Play Store'ga yaramaydi. Play uchun o'z keystore'ingiz va `bundleRelease`
> (AAB) kerak; kalitni bergach CI'ga qo'shib beraman.

## Nega native paketlar aniq versiyada qotirilgan

`react-native-screens`, `react-native-safe-area-context`,
`@react-native-firebase/*` va `async-storage` `package.json` da **`^` siz**
yozilgan. Sababi: bu paketlarning yangi versiyalari React Native'ning
codegen'idan ilgarilab ketadi. Masalan `react-native-screens@4.20+` da
propType `CT.WithDefault<...>` ko'rinishida yozilgan va RN 0.76 codegen'i
uni tushunmaydi:

```
Error: Unknown prop type for "accessibilityContainerViewIsModal": "undefined"
> Task :react-native-screens:generateCodegenSchemaFromJavaScript FAILED
```

Shuning uchun versiyalar sinovdan o'tgan holatda qotirilgan va CI'da
`npm run check-codegen` qadami bor — u Android SDK'siz, bir necha
soniyada shu turdagi nomuvofiqlikni topadi.

React Native'ni yangilaganda: `npm run check-codegen` ni ishga tushirib,
keyin native paketlarni bittalab yangilash mumkin.


## Yangilanish chiqarish (Play Market'siz)

APK to'g'ridan-to'g'ri tarqatiladi, ya'ni telefon ilovani o'zi
yangilamaydi. Yangi versiya chiqarish tartibi:

1. `mobile/android/app/build.gradle` da `versionCode` ni +1 qiling va
   `versionName` ni oshiring (hozirgi: `versionCode 4`, `1.3`).
2. **`mobile/src/update.ts` dagi `APP_VERSION` ni ham o'sha raqamga
   moslang** — ilova o'zini shu bilan solishtiradi.
3. Commit + push. CI APK yig'adi; `main` ga tushganda
   `releases/latest/download/app-release.apk` havolasi yangilanadi
   (boshqa branchda APK — Actions ishining "Artifacts" bo'limida).
4. Saytda **Sozlamalar → "Ilova yangilanishi"**: versiya raqami va
   "nima o'zgardi" bandlarini yozing, kerak bo'lsa "Majburiy
   yangilanish" va "Bildirishnoma yuborilsin" ni belgilab **Saqlash**.

Shundan keyin foydalanuvchi ilovani ochganda oyna chiqadi va
"Yangilash" tugmasi APK ni brauzerda yuklab beradi; bildirishnoma
belgilangan bo'lsa ilovani ochmaganlar ham xabar oladi.

### 1.3 versiyasida nima o'zgardi

- **Bosh ekran widgetlari** (Android) — pastga qarang, "Widgetlar"
  bo'limi.

### 1.2 versiyasida nima o'zgardi

- **Mahsulot videosi** — galereyada rasmlardan keyin ko'rinadi va
  ilovaning O'ZIDA o'ynaydi (`react-native-video`). Bosilgunicha
  yuklanmaydi — mobil internet tejaladi.
- **Blog maqolasidagi video** ham ilovada o'ynaydi (ilgari brauzerda
  ochilardi va mijoz ilovadan chiqib ketardi).

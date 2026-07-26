# Atoyo Santexnika — mobil ilova (React Native CLI)

Saytning (`atoyo-uz.netlify.app`) mijozlar uchun mo'ljallangan mobil
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
| Profil | kirish/ro'yxatdan o'tish, parolni tiklash, ma'lumotlarni tahrirlash |

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
- Package name: `com.atoyoapp`
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
  theme.ts           — brend ranglari (sayt bilan bir xil)
  types.ts           — Product/Order/Review turlari (sayt bilan bir xil)
  firebase.ts        — Firestore o'qishlari (katalog, qidiruv, buyurtmalar)
  api.ts             — saytning API'si (buyurtma, promokod, sharh)
  auth.tsx           — Firebase Auth + users hujjati
  store/             — redux (savat, sevimlilar) + AsyncStorage
  navigation/        — tab va stack
  screens/           — ekranlar
  components/        — umumiy UI
```

## Eslatmalar

- **Push-bildirishnoma** hozircha yo'q. Qo'shish uchun
  `@react-native-firebase/messaging` va serverda FCM token saqlash kerak.
- **Google bilan kirish** ham yo'q (native sozlash talab qiladi) —
  hozircha email/parol.
- Onlayn to'lov saytdagi `/tolov/<id>` sahifasiga yo'naltiradi (Payme/Click
  kalitlari ulangach ishlaydi).

## APK'ni GitHub'da yig'ish (kompyuterda Android Studio kerak emas)

Repoda `.github/workflows/ci.yml` bor: har push'da avval tekshiruv
(typecheck + lint + sayt build), keyin **release APK** yig'iladi va
`atoyo-apk` artifakti sifatida 14 kun saqlanadi.

Ishlashi uchun bitta secret kerak:

1. Firebase konsolida Android ilova qo'shing (package: `com.atoyoapp`),
   `google-services.json` ni yuklab oling
2. Uni base64 ga o'giring:
   ```bash
   base64 -w0 google-services.json    # macOS: base64 -i google-services.json
   ```
3. GitHub → repo → **Settings → Secrets and variables → Actions →
   New repository secret**
   - Name: `GOOGLE_SERVICES_JSON`
   - Secret: yuqoridagi uzun matn

Keyingi push'da APK tayyor bo'ladi: **Actions → oxirgi run → Artifacts →
atoyo-apk**. Uni telefonga o'rnatib sinab ko'rsangiz bo'ladi
("Noma'lum manbalardan o'rnatish" ruxsati kerak).

> Bu APK **debug kaliti** bilan imzolanadi — sinash uchun yetarli, lekin
> Play Store'ga yaramaydi. Play uchun o'z keystore'ingiz va `bundleRelease`
> (AAB) kerak; kalitni bergach CI'ga qo'shib beraman.

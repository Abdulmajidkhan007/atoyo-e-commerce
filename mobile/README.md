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

Keyin Android uchun gradle plaginini yoqing:

`android/build.gradle` → `dependencies` ichiga:
```gradle
classpath 'com.google.gms:google-services:4.4.2'
```

`android/app/build.gradle` → fayl oxiriga:
```gradle
apply plugin: 'com.google.gms.google-services'
```

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

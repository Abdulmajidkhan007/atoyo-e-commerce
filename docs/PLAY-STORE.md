# Ilovani Play Store'ga chiqarish

Akkaunt (25 $) allaqachon ochilgan. Qolgan hamma narsa **bepul** va
AAB fayli **GitHub CI da yig'iladi** — kompyuteringizda Android SDK
kerak emas.

Tartib: kalit yaratish → secret'larga qo'yish → workflow'ni ishga
tushirish → AAB'ni yuklab olish → Play Console'ga yuklash.

---

## 1. Imzo kaliti (upload keystore)

Play Store ilovani kalit bilan imzolangan holda talab qiladi. Kalit
**bir marta** yaratiladi va **yo'qotib qo'yilmasligi kerak** — yo'qolsa
ilovaning keyingi versiyalarini yuklab bo'lmaydi.

Google Cloud Shell'da (https://console.cloud.google.com → `>_`):

```bash
keytool -genkeypair -v \
  -keystore upload-keystore.jks \
  -alias atoyo \
  -keyalg RSA -keysize 2048 -validity 10000
```

So'raydi:
- **parol** (ikki marta) — eslab qoling, pastda kerak bo'ladi;
- ism, tashkilot, shahar, davlat kodi (`UZ`) — ixtiyoriy, Enter bilan
  o'tsa ham bo'ladi;
- oxirida "Is CN=... correct?" — **yes** deb yozing.

Keyin faylni base64 ga o'giring va nusxalang:

```bash
base64 -w0 upload-keystore.jks > keystore.b64
cat keystore.b64
```

Chiqqan uzun matnni to'liq nusxalang.

⚠️ **Kalit faylining o'zini ham saqlang.** Cloud Shell fayllari
uzoq ishlatilmasa o'chib ketishi mumkin:

```bash
cloudshell download upload-keystore.jks
```
(yoki Cloud Shell Editor → fayl ustida o'ng tugma → Download)

Uni parol bilan birga xavfsiz joyda (masalan parol menejerida) saqlang.

---

## 2. GitHub secret'lari

GitHub → repo → **Settings → Secrets and variables → Actions →
New repository secret**. To'rttasi:

| Nomi | Qiymati |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | yuqorida nusxalangan uzun base64 matn |
| `ANDROID_KEYSTORE_PASSWORD` | keystore paroli |
| `ANDROID_KEY_ALIAS` | `atoyo` |
| `ANDROID_KEY_PASSWORD` | kalit paroli (odatda keystore paroli bilan bir xil) |

`GOOGLE_SERVICES_JSON` allaqachon qo'yilgan (APK shu bilan yig'ilyapti).

---

## 3. AAB yig'ish

GitHub → **Actions → "Play Store AAB" → Run workflow**.

- "Ilova versiyasi" maydoniga `1.0.0` deb yozing (bo'sh qoldirsangiz
  hozirgi versiya qoladi). Versiya yozilsa `versionCode` avtomatik
  bittaga oshadi — Play Store bir xil raqamli paketni ikkinchi marta
  qabul qilmaydi.
- 10-15 daqiqadan keyin sahifaning pastida **atoyo-aab** artifakti
  paydo bo'ladi — yuklab oling (ichida `app-release.aab`).

---

## 4. Play Console'ga yuklash

https://play.google.com/console → **Create app**:

- Nomi: **Atoyo Santexnika**
- Til: o'zbek (yoki rus), turi: **App**, **Free**
- Deklaratsiyalar: bolalar uchun emas, reklama yo'q.

Keyin chap menyuda to'ldiriladigan bo'limlar:

| Bo'lim | Nima kerak |
|---|---|
| **App content** | Maxfiylik siyosati URL: `https://atoyo-uz.web.app/maxfiylik` |
| | Data safety — anketa: ism, telefon, manzil, email yig'iladi (buyurtma uchun), uchinchi tomonga sotilmaydi |
| | Ads: yo'q. Content rating: anketa (savdo ilovasi — 3+) |
| **Store listing** | Qisqa tavsif (80 belgi), to'liq tavsif (4000 gacha) |
| | Ikonka 512×512 PNG, feature grafika 1024×500 |
| | Kamida 2 ta telefon skrinshoti (ilovadan olasiz) |
| **Production → Create release** | `app-release.aab` ni yuklaysiz, release notes yozasiz |

Tayyor matnlar (nusxalab qo'ying):

**Qisqa tavsif:**
> Santexnika va isitish tizimlari: 10 000+ mahsulot, tez yetkazib berish.

**To'liq tavsif:**
> Atoyo Santexnika & Otopleniye — quvurlar, muftalar, kranlar, dush
> tizimlari, radiatorlar, isitish qozonlari va nasoslar uchun onlayn
> do'kon. Katalogdan tanlang, narx va zaxirani darhol ko'ring,
> buyurtmani bir necha bosishda rasmiylashtiring.
>
> • 10 000+ mahsulot, kategoriya va filtrlar bo'yicha qidiruv
> • Mahsulot turlari (o'lcham, qalinlik, rang) va aniq narx
> • Savat, sevimlilar, buyurtmalar tarixi
> • Buyurtma holati o'zgarganda bildirishnoma
> • Uch til: o'zbek, rus, ingliz
> • Yorug' va tungi ko'rinish

---

## 5. Ko'p uchraydigan savollar

**Ilova birinchi marta qancha vaqtda ko'rinadi?** Google tekshiruvi
odatda 1-7 kun.

**Keyingi versiyani qanday chiqaraman?** Yana "Run workflow" — versiyani
oshirib yozasiz (`1.0.1`), yangi AAB'ni Play Console'ga yuklaysiz.

**Kalitni yo'qotsam?** Play Console'da "App signing" yoqilgan bo'lsa
(standart) Google'ga murojaat qilib upload kalitini almashtirish
mumkin. Shunda ham kalitni saqlagan ma'qul.

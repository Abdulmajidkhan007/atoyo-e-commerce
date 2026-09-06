# Qo'lda bajariladigan qadamlar (kod emas)

Kodda hammasi tayyor, lekin quyidagilarni **faqat siz** qila olasiz —
kalit, to'lov va konsol huquqlari sizda. Har band: **nega kerak →
qadamlar → qanday tekshiriladi**.

> Kalit va tokenlarni chatga tashlamang. Ular faqat GitHub/Google
> konsolidagi maydonga yopishtiriladi.

---

## 1. `FIREBASE_SERVICE_ACCOUNT` — GitHub secret 🔴

**Nega.** `firestore.rules` va `firestore.indexes.json` (35 ta indeks)
**hech qachon deploy bo'lmagan**: CI dagi `firestore-rules` qadami bu
secret bo'lmasa jimgina o'tkazib yuboriladi. Natijada katalog zaxira
so'rovda ishlayapti (sekinroq, saralash to'liq to'g'ri emas).

**Qadamlar.**
1. https://console.firebase.google.com → loyiha **atoyo-uz** →
   ⚙️ **Project settings** → **Service accounts** yorlig'i.
2. **Generate new private key** → **Generate key** → JSON fayl
   kompyuterga tushadi. (Bu faylni hech kimga bermang.)
3. Faylni bloknotda oching va **hammasini** nusxa oling
   (`{` dan `}` gacha, birorta belgi qoldirmasdan).
4. https://github.com/Abdulmajidkhan007/atoyo-e-commerce → **Settings**
   → chapda **Secrets and variables** → **Actions** →
   **New repository secret**.
5. **Name:** `FIREBASE_SERVICE_ACCOUNT` · **Secret:** nusxa olgan JSON
   → **Add secret**.
6. **Actions** yorlig'iga o'ting → oxirgi ishga tushgan workflow →
   o'ng yuqorida **Re-run all jobs**. (Yoki keyingi push'ni kuting.)

**Tekshiruv.** Actions'da `firestore-rules` qadami endi **skipped**
emas, yashil bo'lishi kerak. Keyin Firebase Console → **Firestore
Database** → **Indexes** — indekslar "Building" holatida paydo bo'ladi
(to'liq qurilishi 10-30 daqiqa).

**Agar qadam qizil bo'lsa** — xizmat akkauntiga huquq yetmagan:
Google Cloud Console → **IAM** → o'sha service account (`firebase-
adminsdk-...@atoyo-uz.iam.gserviceaccount.com`) ga
**Firebase Rules Admin** va **Cloud Datastore Index Admin** rollarini
qo'shing.

---

## 2. Eski buyurtmalardagi tannarx (migratsiya) 🟠

**Nega.** Tannarx endi buyurtma hujjatida emas, yopiq
`orderCosts/{orderId}` da saqlanadi (mijoz o'z buyurtmasini o'qiy
oladi — tannarx u yerda turmasligi kerak). Eski buyurtmalarda u
ko'chirilmagan, shuning uchun hisobotda foyda to'liq chiqmaydi.

**Qadamlar.**
1. Saytga **egasi (owner)** sifatida kiring.
2. **Admin → Sozlamalar** → pastga tushing → **«Eski buyurtmalardagi
   tannarx»** bo'limi.
3. Tugmani bosing va tugashini kuting. Nechta buyurtma ko'chirilgani
   yoziladi.

**Tekshiruv.** Admin → **Hisobotlar** → eski oylarda ham foyda
ko'rsatiladi (avval 0 edi). Tugmani ikkinchi marta bossangiz zarar
yo'q — allaqachon ko'chirilgani qayta yozilmaydi.

---

## 3. Ilova 1.3 (widgetlar) relizini e'lon qilish 🟡

**Nega yangilanish oynasi chiqmadi.** Oyna faqat **serverdagi versiya
telefondagisidan YANGI** bo'lganda chiqadi. Siz o'zingizga 1.3 ni
o'rnatgansiz — sizga oyna chiqmasligi to'g'ri. Odamlarda 1.2 turibdi,
lekin **serverda versiya hali e'lon qilinmagan**, shuning uchun
ularga ham chiqmayapti.

**Qadamlar.**
1. APK tayyorligini tekshiring:
   https://github.com/Abdulmajidkhan007/atoyo-e-commerce/releases/latest
   — `app-release.apk` turgan bo'lishi kerak (CI o'zi qo'yadi).
2. **Admin → Sozlamalar → «Ilova yangilanishi (Android)»**.
3. **Versiya:** `1.3` (aynan `mobile/android/app/build.gradle` dagi
   `versionName` bilan bir xil).
4. **Nima o'zgardi** (har qatori alohida band), masalan:
   - Bosh ekranga widgetlar qo'shildi (buyurtmalar, savat)
   - Video pleyer
   - Tezlik va mayda tuzatishlar
5. «Majburiy yangilanish» — **yoqmang** (odamni majburlamang).
6. **Saqlash** → shu payt obunachilarga **push** ham ketadi.

**Tekshiruv.** 1.2 turgan telefonda ilovani yoping va qayta oching —
yangilanish oynasi chiqadi. O'zingizda 1.3 bo'lgani uchun sizda
chiqmaydi (bu xato emas).

---

## 4. `atoyo.uz` domenini olish va ulash 🟢

**Bo'shligini tekshirish.** Sandbox'dan tashqi tarmoq bloklangan,
shuning uchun men ayta olmayman. O'zingiz tekshiring: **cctld.uz**
(yoki istalgan `.uz` registratori — ahost.uz, uzhost.uz, billur.uz)
saytida `atoyo.uz` ni qidiring. Bo'sh bo'lsa "свободен / available"
deb chiqadi.

**Qadamlar.**
1. Registratordan domenni sotib oling (`.uz` uchun hujjat talab
   qilinishi mumkin — registrator aytadi).
2. Firebase Console → **Hosting** → **Add custom domain** →
   `atoyo.uz` (va `www.atoyo.uz`) → Continue.
3. Firebase ko'rsatgan **TXT** (tasdiqlash) va **A** yozuvlarini
   registratorning DNS panelida qo'shing.
4. Tasdiq va SSL sertifikati chiqishini kuting (odatda 1-24 soat).
5. Domen ishlagach kodda ikkita joy yangilanadi (buni menga ayting,
   men qilaman): `apphosting.yaml` dagi `NEXT_PUBLIC_SITE_URL` va
   `ALLOWED_ORIGINS`.
6. So'ng **Sozlamalar → Maxfiy kalitlar** da «webhook'ni qayta
   o'rnatish» tugmachasini yoqib saqlang — Telegram yangi domenga
   yozadigan bo'ladi.

**Tekshiruv.** `https://atoyo.uz` ochiladi, qulf belgisi bor, botga
xabar yozganda javob keladi.

---

## 5. Gemini krediti (AI rasm) 🟡

**Nega.** Hozir Google loyihani to'lov sababli bloklagan
(`Lightning dunning decision is deny`) — bu qarz yoki kartadan pul
o'tmagani.

**Qadamlar.**
1. https://console.cloud.google.com/billing → to'lov hisobi →
   **Payment overview** → qarzni to'lang ($6.04). Kartada pul
   yetarli bo'lsin (xalqaro to'lovga ochiq Visa/Mastercard).
2. Blok bir necha soat ichida ochiladi.
3. Kredit qo'shish: https://ai.studio/projects → loyiha →
   **Billing / Plan** → 5-10 $ (bir necha yuz rasmga yetadi).
   «Auto-recharge» ni yoqsangiz o'zi to'ldirib turadi.

**Tekshiruv.** Admin → mahsulot → **«Rasm generatsiya qilish»** —
xatosiz chiqadi. Sarf: **Sozlamalar → AI sarfi**.

---

## 6. CRON_SECRET + Cloud Scheduler (ijtimoiy navbat) 🟡

**Nega.** Instagram/Facebook/YouTube postlari va kanal navbati
navbatda yotadi; ularni vaqti-vaqti bilan chaqirib turadigan
jadval yo'q.

**Qadamlar (batafsili `docs/DEPLOY.md` → «Ijtimoiy navbatni
avtomatik bo'shatish (cron)»):**
1. Uzun tasodifiy matn o'ylab toping (sir).
2. Google Cloud Console → **Secret Manager** → `CRON_SECRET` nomli
   sir yarating va qiymatni qo'ying; App Hosting backendiga o'qish
   huquqini bering.
3. **Cloud Scheduler** → ikkita ish yarating:
   - `POST https://atoyo-uz.web.app/api/cron/social` — har soatda
   - `POST https://atoyo-uz.web.app/api/cron/channel` — har 10 daqiqada
   - ikkalasiga ham sarlavha: `x-cron-secret: <siringiz>`
4. **Run now** bilan sinab ko'ring.

**Tekshiruv.** Scheduler'da natija **200 OK**. Sirsiz chaqirilsa
**401** qaytishi kerak.

---

## 7. Meta (Instagram + Facebook) ulash 🟡

**Qadamlar.** Admin → **Sozlamalar → Ijtimoiy tarmoqlar** →
**«Facebook orqali ulash»** tugmasi → Facebook oynasida do'kon
sahifasi va unga bog'langan Instagram akkauntini tanlang → ruxsat
bering. Kalitlar avtomatik `secrets/social` ga tushadi.

To'liq tartib va qo'lda ulash yo'li: `docs/DEPLOY.md` →
«Ijtimoiy tarmoqlar (Instagram, Facebook, YouTube)».

**Tekshiruv.** O'sha bo'limda ulangan sahifa nomi ko'rinadi; blogda
Instagram belgilangan maqolani chiqarib ko'ring.

---

## 8. YouTube'ni TO'G'RI kanalga qayta ulash 🟡

**Nega.** Hozir shaxsiy kanalga ulangan bo'lishi mumkin.

**Qadamlar.** `docs/DEPLOY.md` → «Noto'g'ri YouTube kanalga ulanib
qolgan bo'lsangiz» bo'limi: brauzerda **avval do'kon Google
hisobiga** kiring (yoki inkognito oynada), keyin paneldagi
«YouTube'ni ulash» tugmasini bosing — endi hisob tanlash oynasi
majburan chiqadi (`select_account`), do'kon kanalini tanlang.

**Tekshiruv.** Panelda kanal nomi to'g'ri ko'rinadi; videoli blog
maqolasini chiqarib, YouTube'da paydo bo'lishini kuting.

---

## 9. Typesense — xato yozilgan qidiruv (ixtiyoriy) 🟢

**Nega.** Hozirgi qidiruv so'zma-so'z: mijoz «smesitl» yoki
«радиатр» deb yozsa **hech narsa topilmaydi** — bu to'g'ridan-to'g'ri
yo'qotilgan sotuv. Kod tayyor, faqat manzil va kalit kerak.

**Qadamlar.** `docs/TYPESENSE.md` va `docs/DEPLOY.md` → «Tezkor
qidiruv (Typesense)»: Oracle Cloud Always Free (0 $/oy) yoki
Typesense Cloud'da server ko'taring → `TYPESENSE_HOST` va
`TYPESENSE_API_KEY` ni Secret Manager'ga qo'ying → paneldagi
indekslash tugmasini bosing.

**Tekshiruv.** Saytda ataylab xato yozing («smesitl») — mahsulot
chiqishi kerak.

---

# Sessiya promptlari qayerda

| Nima | Fayl |
|---|---|
| Qolgan kod ishlari (8-12: CSV kursor, N+1, `reportError`, upload huquqi + `/k/<id>`, forma xatolari) | `docs/AUDIT-ISHLARI.md` |
| Ilovani shisha (glass) ko'rinishga o'tkazish | `docs/PROMPTLAR-ATOYO.md` |
| Umumiy promptlar (audit, tezlik, xato kuzatuvi va h.k.) | `docs/PROMPTLAR-UMUMIY.md` |
| Boshqa loyihaga ish tartibini ko'chirish | `docs/YANGI-LOYIHA-NAMUNASI.md` |
| Organick loyihasini platformaga aylantirish | `docs/PROMPT-ORGANICK-PLATFORMA.md` |

Har bir promptni **alohida yangi sessiyaga** tashlang (Sonnet yetadi —
arzonroq). Tugagach sessiyani yoping.

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

## 4. `atoyo.uz` domeni — qisqa manzilni ASOSIY qilish 🟠

Domen **ahost** dan olindi, ikkala nom ham Firebase'da **Connected**.
Lekin hozir `atoyo.uz` → `www.atoyo.uz` ga **yo'naltiryapti**, ya'ni
saytni haqiqatda `www` beryapti. Siz qisqasini asosiy qilishni
tanladingiz, kodda ham shunday qilindi (`NEXT_PUBLIC_SITE_URL =
https://atoyo.uz`). Endi Firebase tomonida yo'naltirishni **teskari**
qilish kerak.

> Firebase yo'naltirish yo'nalishini joyida o'zgartirishga ruxsat
> bermaydi — domenni olib tashlab, qayta qo'shish kerak. Shuning
> uchun tartib MUHIM: avval `atoyo.uz` ni to'g'rilang, keyin `www` ni.
> Kechqurun yoki mijoz kam paytda qiling.

**Qadamlar.** Firebase Console → **Hosting** → **Manage site** →
**Domains**:

1. `atoyo.uz` qatoridagi ⋮ menyudan **Delete / Remove** (hozir u
   shunchaki yo'naltiruvchi, sayt `www` da ishlab turaveradi).
2. **Add custom domain** → `atoyo.uz` → **"Redirect to another
   domain" belgisini QO'YMANG** → Continue. DNS allaqachon to'g'ri
   (`@ A 199.36.158.100`), shuning uchun tasdiq tez o'tadi.
3. `atoyo.uz` **Connected** bo'lishini kuting va brauzerda ochib
   ko'ring — sayt endi `www` ga sakramasligi kerak.
4. Endi `www.atoyo.uz` qatorini **Delete / Remove**.
5. **Add custom domain** → `www.atoyo.uz` → bu safar **"Redirect to
   another domain"** ni belgilang → `atoyo.uz` ni tanlang.
6. Sertifikat qayta chiqarilishini kuting (bir necha soatgacha).

**Tekshiruv.** `www.atoyo.uz` yozganda manzil satri `atoyo.uz` ga
o'zgarishi kerak; teskarisi emas.

**Shundan keyin (majburiy):**
- **Sozlamalar → Maxfiy kalitlar** → «webhook'ni qayta o'rnatish»
  tugmachasini yoqib saqlang.
- Firebase Console → **Authentication → Settings → Authorized
  domains** ga `atoyo.uz` va `www.atoyo.uz` ni qo'shing — **busiz
  saytdan kirish ishlamaydi**.
- Google Cloud → **APIs & Services → Credentials** → "Browser key
  (auto created by Firebase)" → agar "Website restrictions" bo'lsa,
  `https://atoyo.uz/*` va `https://www.atoyo.uz/*` ni qo'shing.
- Google Cloud → **APIs & Services → Credentials → OAuth 2.0 Client
  IDs** (YouTube ulash uchun) → **Authorized redirect URIs** ga
  `https://atoyo.uz/api/admin/social/youtube/callback` qo'shing.
- Meta for Developers → ilova sozlamalarida **Valid OAuth Redirect
  URIs** ga `https://atoyo.uz/api/admin/social/meta/callback`.
- **Google Search Console** (search.google.com/search-console):
  `atoyo.uz` ni **Domain** turi bilan qo'shing (DNS TXT orqali
  tasdiqlanadi — ahost DNS panelida), so'ng
  `https://atoyo.uz/sitemap.xml` ni yuboring.
- **Yandex Webmaster** (webmaster.yandex.uz) — xuddi shunday.
  O'zbekistonda Yandex ulushi katta.
- Ilova va Electron yangi manzilga o'tkazildi, lekin bu **yangi
  build** bilan yetadi: hozirgi APK eski manzilda ishlayveradi
  (u yopilmaydi).

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
   - `POST https://atoyo.uz/api/cron/social` — har soatda
   - `POST https://atoyo.uz/api/cron/channel` — har 10 daqiqada
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

## 10. `info@atoyo.uz` pochtasi va SMTP 🔴

### Avval: nega xat kelmay qoldi

Gmail hisobining **paroli almashtirilganda Google o'sha hisobning
BARCHA "App password" larini bekor qiladi**. Saytdagi SMTP ham
o'shanday parol bilan ishlaydi, shuning uchun u kun kelib
`535 Username and Password not accepted` bilan to'xtagan.

**Bu Gmail'ning xatti-harakati — kod bilan aylanib o'tib
bo'lmaydi.** App password har doim hisob paroliga bog'liq.

Ikki narsa qilindi:

1. Endi xato **jim qolmaydi**: har muvaffaqiyatsiz yuborish
   xodimlar guruhining "Actions" topic'iga tushadi va nima
   qilish kerakligi ham yoziladi (`lib/email/mailer.ts`).
2. Yechim — **parolga bog'liq bo'lmagan SMTP ga o'tish** (pastda).

### Tezkor tuzatish (5 daqiqa, hozirgi holatni tiklash)

1. Google akkaunt → **Xavfsizlik** → *2 bosqichli tasdiqlash* →
   **Ilova parollari** → yangi parol yarating (16 belgi).
2. Admin → Sozlamalar → **Email (SMTP)** → *Parol* maydoniga o'sha
   16 belgini qo'ying (probelsiz) → **Saqlash**.
3. **"Sinov xati yuborish"** tugmasini bosing.

Bu ishlaydi, lekin parol yana almashtirilsa yana to'xtaydi.

### To'g'ri yechim: yuborish uchun alohida xizmat 🔴

Transaksion pochta xizmatining kaliti **Google parolidan mustaqil** —
parolni o'zgartirsangiz ham xat ketaveradi. Ikkalasi ham bepul
boshlanadi:

| Xizmat | Bepul chegara | SMTP host |
|---|---|---|
| **Brevo** (tavsiya) | kuniga 300 xat | `smtp-relay.brevo.com`, port 587 |
| **Resend** | oyiga 3 000 xat | `smtp.resend.com`, port 587 |

Qadamlar (Brevo misolida):

1. brevo.com da ro'yxatdan o'ting.
2. **Senders, Domains & Dedicated IPs → Domains → Add domain** →
   `atoyo.uz`.
3. Brevo bergan **DKIM va SPF** yozuvlarini **ahost DNS** ga
   qo'shing (TXT). Tasdiqlashni kuting (odatda 10-30 daqiqa).
4. **SMTP & API → SMTP** bo'limidan login va **SMTP key** ni oling.
5. Admin → Sozlamalar → **Email (SMTP)**:
   - host `smtp-relay.brevo.com`, port `587`
   - foydalanuvchi — Brevo bergan login
   - parol — **SMTP key**
   - Kimdan: `Atoyo Santexnika <info@atoyo.uz>`
6. **Sinov xati yuborish**.

> **DIQQAT:** kalitni menga yubormang va chatga tashlamang — faqat
> admin panelga kiriting. U `secrets/email` da saqlanadi.

### `info@atoyo.uz` — qabul qilish (kiruvchi xat)

Yuqoridagi xizmat faqat **yuboradi**. Mijoz `info@atoyo.uz` ga xat
yozsa, uni birov o'qishi kerak. Uch yo'l bor:

**A) Eng arzoni — yo'naltirish (bepul).** ahost panelida
*Email forwarding* / *Pochta yo'naltirish* bo'limidan
`info@atoyo.uz → santexnika.atoyo@gmail.com` qilib qo'ying. Kiruvchi
xatlar Gmail'ga tushadi. Javob yozishda Gmail → *Sozlamalar →
Hisoblar → Send mail as* ga `info@atoyo.uz` ni Brevo SMTP kaliti
bilan qo'shsangiz, javob ham `info@atoyo.uz` nomidan ketadi.
**Narxi: 0.**

**B) ahost pochtasi.** Ko'pchilik o'zbek hostinglari domen bilan
birga pochta quticha beradi (ko'pincha bepul yoki yiliga bir necha
o'n ming so'm). ahost qo'llab-quvvatlash xizmatidan
*"domen uchun pochta xizmati bormi"* deb so'rang — bo'lsa eng
qulayi shu.

**C) Google Workspace.** To'liq quticha, Drive, Meet — lekin pullik.

### Google Workspace haqida — muhim aniqlik

**Google One Pro (yoki AI Premium) obunasi Workspace'ni bepul
qilmaydi.** Bu ikki BOSHQA mahsulot:

| | Google One / AI Premium | Google Workspace |
|---|---|---|
| Kimga | shaxsiy `@gmail.com` hisobi | biznes, o'z domeni bilan |
| Nima beradi | Drive joyi, Gemini imkoniyatlari | `info@atoyo.uz` quticha, admin panel, Drive, Meet |
| To'lov | obunangiz | **har foydalanuvchi uchun alohida**, oyiga ~$7 (Business Starter) |

Ya'ni siz to'lab turgan Pro plan Workspace narxiga **chegirma
bermaydi**. Workspace'da **14 kunlik bepul sinov** bor, shundan
keyin har oy to'lanadi.

Agar baribir Workspace olmoqchi bo'lsangiz:

1. `workspace.google.com` → **Get started** → biznes nomi, xodimlar
   soni (1), davlat — O'zbekiston.
2. *"Do you have a domain?"* → **Yes** → `atoyo.uz`.
3. Foydalanuvchi yarating: `info@atoyo.uz`.
4. Google beradigan **MX yozuvlarini ahost DNS** ga qo'ying.
   **DIQQAT:** hozir DNS'da `MX @ → atoyo.uz` va `mail` CNAME
   yozuvlari bor — ularni **o'chirib**, Google'nikini qo'ying,
   aks holda xatlar yo'qoladi.
5. Google panelida domen tasdiqlanishini kuting.
6. Admin → Sozlamalar → **Email (SMTP)**: host `smtp.gmail.com`,
   port 587, foydalanuvchi `info@atoyo.uz`, parol — o'sha hisob
   uchun **App password**.

> Workspace'da ham App password parol almashtirilganda bekor
> bo'ladi. Shuning uchun **yuborishni baribir Brevo/Resend ga
> qoldirish tavsiya etiladi**, Workspace esa faqat quticha bo'lib
> qolsin.

### Tavsiya (eng arzon va eng barqaror)

```
Yuborish   → Brevo (bepul, DKIM+SPF bilan, kaliti mustaqil)
Qabul qilish → ahost forwarding: info@atoyo.uz → santexnika.atoyo@gmail.com
Javob yozish → Gmail "Send mail as" (Brevo SMTP bilan)
Narxi       → 0 so'm
```

Keyinroq xodimlar ko'paysa Workspace'ga o'tish har doim mumkin.

---

## 11. Yetkazish: 50 000 dan bepul, undan kamiga 15 000 🟠

Kod tayyor — faqat uchta sozlamani qo'yish kerak (Admin →
Sozlamalar):

1. **Promokod va yetkazib berish** → *Yoqilgan* ✅ →
   *Narx (so'm)*: `15000` → *Shu summadan bepul*: `50000` → Saqlash.
2. **Narx va buyurtma** → *Eng kam buyurtma (so'm)*: `0` → Saqlash.
   ⚠️ Buni unutmang: 50 000 turgan bo'lsa undan kam buyurtma
   UMUMAN qabul qilinmaydi (bu bepul yetkazish chegarasi emas).
3. Saytda savatga 4 000 so'mlik narsa soling — "Bepul yetkazishga
   46 000 so'm qoldi" chizig'i va tavsiya mahsulotlar chiqishi kerak.

Matn o'zi yangilanadi: "Qo'qon ichida va atrofdagi 15 km gacha:
50 000 so'mdan boshlab yetkazib berish bepul, undan kam buyurtmaga —
15 000 so'm." (sayt, ilova, bot, kanal).

---

## 12. Kartaga o'tkazma — karta raqamini qo'yish 🟠

Kod tayyor, lekin **standart holda O'CHIQ** — karta kiritilmaguncha
mijoz bu variantni ko'rmaydi.

1. Admin → Sozlamalar → **Kartaga o'tkazma**.
2. *Karta raqami* (16 raqam), *Karta egasi* (mijoz o'tkazishda bank
   ilovasida shu ismni ko'radi — to'g'ri yozing), ixtiyoriy *Bank* va
   *Izoh* (masalan "Izohga buyurtma raqamini yozing").
3. *Kartaga o'tkazma yoqilgan* ✅ → **Saqlash** → jumboqni yeching.
4. "Actions" topigiga "Kartaga o'tkazma sozlamasi yangilandi" keladi.
   ⚠️ Agar kelajakda **siz qilmagan** holda "O'TKAZMA KARTASI
   ALMASHTIRILDI" xabari kelsa — darhol parolni almashtiring va
   kartani qaytaring.

> **Firestore qoidalari** (karta faqat server orqali, `orders` ni
> client yarata olmaydi) push'dan keyin CI orqali qo'llanadi
> (`firestore-rules` job, `FIREBASE_SERVICE_ACCOUNT` kerak). GitHub →
> Actions da job yashil bo'lganini ko'ring — shundan keyin karta
> qo'ying.

**Sinov:** boshqa brauzerda (tizimga kirmasdan) mahsulot sahifasida
**1 klikda sotib olish** → "Kartaga o'tkazma" → buyurtma sahifasida
karta va summa chiqadi → istalgan rasmni chek sifatida yuklang →
"Buyurtmalar" topigiga rasm + "✅ To'lov keldi / ❌ Pul tushmadi"
keladi. Sinov buyurtmasini keyin bekor qiling.

**Kundalik ish:** chek kelganda bank ilovangizda pul tushganini
ko'ring → Telegram'da (yoki Admin → Buyurtmalar) "✅ To'lov keldi".
SMS sozlangan bo'lsa mijozga xabar ketadi.

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

# Saytni qayerga joylash mumkin

Sayt — **Next.js (SSR)**: server tomonda ishlaydigan sahifalar, API
route'lar (Telegram webhook, buyurtma, admin API), Firebase Admin SDK va
`next/og` bilan rasm generatsiyasi bor. Shuning uchun hosting **Node.js
serverini** ko'tara olishi shart.

| Variant | Ishlaydimi | Izoh |
|---|---|---|
| **Firebase App Hosting** | ✅ | **Hozirgi joy.** Bir xil Firebase loyihasi; Admin SDK uchun kalit ham kerak emas. Blaze (karta) rejimi kerak, lekin bepul limiti bor |
| Netlify | ✅ | Avvalgi joy. `netlify.toml` olib tashlandi — qaytish kerak bo'lsa git tarixidan tiklanadi |
| Vercel | ✅ | Eng tez ko'chadi; bepul (Hobby) tarifi **notijorat** loyihalar uchun — do'kon uchun Pro (20 $/oy) talab qilinadi |
| **GitHub Pages** | ❌ | Faqat statik fayllar. API route, admin panel, Telegram webhook, buyurtma — hech biri ishlamaydi |
| Firebase Hosting (eskisi, "static") | ⚠️ | O'zi statik; SSR uchun baribir Cloud Functions/App Hosting kerak |

Ya'ni **GitHub Pages bu loyiha uchun to'g'ri kelmaydi** — u serverni
umuman ishlatmaydi. Eng mos variant — **Firebase App Hosting**.

---

## Firebase App Hosting'ga ko'chirish

Repozitoriyda `apphosting.yaml` tayyor turibdi.

### 1. Blaze rejimini yoqing

Firebase konsoli → ⚙️ → **Usage and billing** → **Modify plan** →
*Blaze (pay as you go)*. Karta biriktiriladi, lekin App Hosting'ning
bepul limiti bor (kichik do'kon odatda undan chiqmaydi); xohlasangiz
byudjet ogohlantirishini qo'yib qo'ying.

> Blaze — Storage (rasm yuklash) uchun ham kerak edi, ya'ni baribir
> yoqilishi kutilayotgan qadam.

### 2. Backend yarating

Firebase konsoli → **Build → App Hosting → Get started**:

- GitHub akkauntini ulang, `Abdulmajidkhan007/atoyo-e-commerce`
  repozitoriysini va **`claude/plumbing-ecommerce-nextjs-jxpmh5`**
  branchini tanlang;
- region: `europe-west4` (yoki yaqinrog'i);
- backend nomi: `atoyo`.

Yoki terminaldan:

```bash
npm i -g firebase-tools
firebase login
firebase apphosting:backends:create --project <PROJECT_ID>
```

### 2a. `apphosting.yaml` ni to'ldirish tartibi

Fayl **soddaligicha** turishi kerak — App Hosting uni qat'iy tekshiradi:

- har bir `env` yozuvida **yo `value:`, yo `secret:`** bo'ladi (ikkalasi
  ham emas), qiymat esa **bo'sh bo'lmasligi** kerak. Bo'sh `value: ""`
  yozilsa rollout *"Invalid apphosting.yaml"* bilan yiqiladi;
- `secret:` faqat Secret Manager'da **allaqachon yaratilgan** kalitga
  havola qila oladi — avval `firebase apphosting:secrets:set ...`,
  keyin faylga qator qo'shiladi;
- `availability` ro'yxati faqat `BUILD` va `RUNTIME` dan iborat.

Client SDK qiymatlarini (`NEXT_PUBLIC_FIREBASE_*`) **qo'lda yozish
shart emas**: App Hosting build muhitiga `FIREBASE_WEBAPP_CONFIG`
o'zgaruvchisini o'zi qo'shadi (ichida `apiKey`, `authDomain`,
`projectId`, `storageBucket`, `messagingSenderId`, `appId` bor).
`next.config.ts` uni build vaqtida o'qib, shu qiymatlarni kodga
joylaydi. Netlify/lokal muhitda esa avvalgidek `.env` dagi
`NEXT_PUBLIC_FIREBASE_*` ishlatiladi (ular ustunroq).

### 3. Maxfiy kalitlarni qo'ying

```bash
firebase apphosting:secrets:set TELEGRAM_BOT_TOKEN
firebase apphosting:secrets:set TELEGRAM_CHAT_ID
firebase apphosting:secrets:set TELEGRAM_WEBHOOK_SECRET
firebase apphosting:secrets:set TELEGRAM_CHANNEL_ID
```

Kalit yaratilgandan keyin `apphosting.yaml` ga qo'shiladi:

```yaml
  - variable: TELEGRAM_BOT_TOKEN
    secret: TELEGRAM_BOT_TOKEN
    availability:
      - RUNTIME
```

SMTP yoki Payme/Click ishlatilsa — o'shalar ham xuddi shunday.

> Telegram tokeni/guruh ID si Firestore'dagi `secrets/telegram`
> hujjatida ham turadi va u **env'dan ustunroq**, shuning uchun bot
> secret'larsiz ham ishlashi mumkin.

### Qaysi qiymat qayerdan olinadi

| O'zgaruvchi | Qayerda | Qayerdan olinadi |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` (6 ta) | ❌ kerak emas | App Hosting `FIREBASE_WEBAPP_CONFIG` ni o'zi beradi, `next.config.ts` o'qib oladi |
| `NEXT_PUBLIC_SITE_URL`, `ALLOWED_ORIGINS` | `apphosting.yaml` | Deploy tugagach chiqadigan domen |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | `apphosting.yaml` | Bot useri (`Atoyo_uz_bot`) |
| `TELEGRAM_BOT_TOKEN` | Secret Manager | @BotFather → bot → API Token |
| `TELEGRAM_CHAT_ID` | Secret Manager | Xodimlar guruhi ID si (`-100...`) |
| `TELEGRAM_CHANNEL_ID` | Secret Manager | E'lon kanali (`@username` yoki `-100...`) |
| `TELEGRAM_WEBHOOK_SECRET` | Secret Manager | O'zingiz o'ylab topasiz (uzun tasodifiy matn) |
| `FIREBASE_ADMIN_*` | ❌ kerak emas | App Hosting'da xizmat akkaunti muhitning o'zida |

Hozirgi qiymatlarni **Netlify'dan ko'chirib olish** eng oson yo'l:
Netlify → Site configuration → Environment variables → har birining
yonidagi "Show" tugmasi.

**Firebase Admin kalitlari (`FIREBASE_ADMIN_*`) kerak emas**: App Hosting
Google Cloud ichida ishlaydi va xizmat akkaunti muhitning o'zida bo'ladi
(`src/lib/firebase/admin.ts` shuni avtomatik ishlatadi).

### 4. Domen va sozlamalarni yangilang

Deploy tugagach sayt `https://<backend>--<project>.web.app` da ochiladi.
Keyin:

1. `apphosting.yaml` dagi `NEXT_PUBLIC_SITE_URL` va `ALLOWED_ORIGINS` ni
   shu manzilga moslang (o'z domeningiz bo'lsa — o'shanga);
2. Firebase konsoli → Authentication → Settings → **Authorized domains**
   ro'yxatiga yangi domenni qo'shing (aks holda Google bilan kirish
   ishlamaydi);
3. Telegram webhook'ini yangi manzilga o'tkazing — admin panel →
   Sozlamalar → «Webhook'ni qayta o'rnatish», yoki:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<yangi-domen>/api/telegram-webhook&secret_token=<SECRET>"
```

### 4a. Qisqa domen (`atoyo-uz.web.app`)

App Hosting bergan manzil uzun:
`atoyo-e-commerce--atoyo-uz.us-east4.hosted.app`. Qisqartirishning
bepul yo'li — Firebase Hosting'ning `web.app` subdomenini shu backendga
yo'naltirish. `firebase.json` da rewrite tayyor:

```json
"hosting": {
  "public": "public",
  "rewrites": [
    { "source": "**", "run": { "serviceId": "atoyo-e-commerce", "region": "us-east4" } }
  ]
}
```

Buni **telefondan ham** qilish mumkin — Google Cloud Shell orqali
(`console.cloud.google.com` → yuqoridagi `>_` tugmasi). Repozitoriyni
klonlash ham shart emas, hosting deploy uchun bor-yo'g'i `firebase.json`
kerak:

```bash
mkdir -p ~/atoyo-hosting/public && cd ~/atoyo-hosting
cat > firebase.json <<'JSON'
{
  "hosting": {
    "public": "public",
    "rewrites": [
      { "source": "**", "run": { "serviceId": "atoyo-e-commerce", "region": "us-east4" } }
    ]
  }
}
JSON
npx -y firebase-tools deploy --only hosting --project atoyo-uz
```

### 4b. TEZLIK: backendni O'zbekistonga yaqinlashtirish

Hozirgi backend **`us-east4`** (AQSh, Virjiniya) da. Toshkentdan har
bir so'rov okean ortiga borib qaytadi — server hech narsa qilmasdan
oldin **~250-300 ms** yo'qoladi. Sahifalar dinamik (locale cookie
o'qiladi), shuning uchun Hosting CDN ularni keshlay olmaydi: har
bosishda AQShga boriladi.

Eng yaqin Google regionlari: **`europe-west4`** (Niderlandiya) yoki
**`europe-west1`** (Belgiya) — Toshkentdan ~100-140 ms, ya'ni ikki
baravar tezroq.

> **App Hosting'da mavjud backend regioni O'ZGARMAYDI.** Yangi
> backend ochib, `firebase.json` rewrite'ini unga qaratish kerak.
> Kod o'zgarmaydi — bu faqat konsol ishi.

**Tartib:**

1. Yangi backend yaratish (bir marta, ~5 daqiqa):

   ```bash
   firebase apphosting:backends:create \
     --project atoyo-uz \
     --location europe-west4
   ```

   Repozitoriya va branch avvalgidek: `Abdulmajidkhan007/atoyo-e-commerce`,
   `claude/plumbing-ecommerce-nextjs-jxpmh5`. Nomi masalan `atoyo-eu`.

2. Sirlarni yangi backendga ochish (aks holda AI va rasm ishlamaydi):

   ```bash
   firebase apphosting:secrets:grantaccess ANTHROPIC_API_KEY \
     --backend atoyo-eu --project atoyo-uz
   firebase apphosting:secrets:grantaccess GEMINI_API_KEY \
     --backend atoyo-eu --project atoyo-uz
   ```

3. Birinchi rollout tugab, uzun manzil (`…europe-west4.hosted.app`)
   ochilishini tekshiring.

4. `apphosting.yaml` dagi `ALLOWED_ORIGINS` ga yangi hostni qo'shing
   (Server Actions shu ro'yxatga qaraydi) va push qiling.

5. `firebase.json` dagi rewrite'ni yangi xizmatga qaratib deploy
   qiling — shundan keyin `atoyo-uz.web.app` yangi backendga boradi:

   ```json
   { "source": "**", "run": { "serviceId": "atoyo-eu", "region": "europe-west4" } }
   ```

   ```bash
   firebase deploy --only hosting --project atoyo-uz
   ```

6. Telegram webhook'ini qayta ro'yxatdan o'tkazish **shart emas** —
   u qisqa domen (`atoyo-uz.web.app`) orqali ishlaydi.

7. Hammasi ishlaganiga ishonch hosil qilgach, eski backendni
   o'chirib qo'ying (ikkitasi turib pul yemasin):

   ```bash
   firebase apphosting:backends:delete atoyo-e-commerce \
     --project atoyo-uz --location us-east4
   ```

**Firestore regioni haqida.** Ma'lumotlar bazasi ham qayerda
turgani muhim: agar Firestore `nam5`/AQShda bo'lsa, server Yevropaga
ko'chganda **server↔Firestore** yo'li uzayadi. Tekshirish:

```bash
gcloud firestore databases describe --project=atoyo-uz --format='value(locationId)'
```

Firestore regioni **umuman o'zgarmaydi** (yangi baza ochib
ko'chirish kerak). Shuning uchun:

- Firestore AQShda bo'lsa → backendni ham AQShda qoldirish
  ma'qulroq (`minInstances: 1` va CDN keshi baribir yordam beradi);
- Firestore Yevropada (`eur3`) bo'lsa → backendni Yevropaga
  ko'chirish **ikki tomondan** foyda beradi.

Ya'ni 1-qadamdan oldin shu buyruqni ishga tushirib ko'ring.

### 4c. Nima keshlanadi, nima keshlanmaydi

Sahifalar keshlanmaydi: `(main)/layout.tsx` cookie'dan tilni o'qiydi
va `Footer` admin sozlamalarini ko'rsatadi. Buning o'rniga:

- **Sozlamalar serverda 60 soniya keshlanadi** (`settings/site`,
  `settings/pricing`) — har sahifa ko'rishida Firestore'ga
  bormaydi, admin saqlaganda kesh bekor qilinadi.
- **Ochiq GET API javoblari Hosting CDN'ida keshlanadi**
  (`lib/http/cache.ts` → `publicCacheHeaders`): `/api/facets` va
  `/api/taxonomy` 10 daqiqa, `/api/pricing` va `/api/delivery`
  5 daqiqa, `/api/products/showcase` 5 daqiqa. Bu javoblar
  hammaga bir xil, shuning uchun keshlash xavfsiz.
- **Rolga bog'liq narsalar HECH QACHON `public` keshlanmaydi**
  (`/api/products/prices`, savat, profil, buyurtma) — CDN cookie
  bo'yicha ajratmaydi, bir mijozning javobi boshqasiga ketib
  qolardi.

Lokal kompyuterda repozitoriya bo'lsa, o'sha papkadan:

```bash
firebase deploy --only hosting --project atoyo-uz
```

Shundan keyin sayt `https://atoyo-uz.web.app` da ochiladi (uzun manzil
ham ishlayveradi). Keyin `apphosting.yaml` dagi `NEXT_PUBLIC_SITE_URL`
ni qisqasiga o'zgartiramiz va Telegram webhook'ini ham o'shanga
o'tkazasiz.

**"Error: Forbidden — your client does not have permission to get URL /"**
degani: Cloud Run xizmati Firebase Hosting'dan kelgan so'rovni rad
etyapti (App Hosting uni yopiq holda yaratadi). Cloud Shell'da ikkita
buyruq bilan ochiladi:

```bash
gcloud run services update atoyo-e-commerce \
  --region=us-east4 --project=atoyo-uz --ingress=all

gcloud run services add-iam-policy-binding atoyo-e-commerce \
  --region=us-east4 --project=atoyo-uz \
  --member=allUsers --role=roles/run.invoker
```

Birinchisi tashqaridan so'rov qabul qilishga, ikkinchisi esa
autentifikatsiyasiz chaqirishga ruxsat beradi. Bu xavfsizlikni
pasaytirmaydi: sayt allaqachon `…hosted.app` orqali ochiq turibdi.

Sozlama xizmat darajasida saqlanadi, ya'ni keyingi rollout'lar uni
o'chirmaydi. Agar biror payt yana 403 chiqsa - shu ikki buyruqni
qaytadan bajaring.

O'z domeningiz (masalan `atoyo.uz`) bo'lsa — App Hosting → Domains →
**Add custom domain** orqali ulanadi (DNS yozuvlari ko'rsatiladi).

### 5. Firestore qoidalari va indekslari

**Avtomatik (tavsiya).** GitHub Actions har push'da (asosiy branch)
qoidalar va indekslarni o'zi qo'llaydi. Buning uchun bir marta secret
qo'shiladi:

1. Firebase konsoli → ⚙️ **Project settings** → **Service accounts** →
   **Generate new private key** → JSON fayl yuklab olinadi.
2. GitHub → repozitoriya → **Settings** → **Secrets and variables** →
   **Actions** → **New repository secret**:
   - nomi: `FIREBASE_SERVICE_ACCOUNT`
   - qiymati: yuklab olingan JSON faylning butun mazmuni.

Secret qo'yilmagan bo'lsa CI shu qadamni jimgina o'tkazib yuboradi.

**Qo'lda** (lokal kompyuter yoki Cloud Shell):

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage --project <PROJECT_ID>
```

(Bu buyruq sandboxdan ishlamaydi — gRPC bloklangan.)

> ⚠️ **DIQQAT — optom narx himoyasi qoidalar deploy qilinmaguncha
> ISHLAMAYDI.** CI'dagi avtomatik qadam faqat **asosiy branch**
> (`main`) push'ida ishlaydi, ish branch'ida esa yo'q. Sayt kodi har
> push'da yangilanadi, `firestore.rules` esa yo'q — ya'ni:
>
> - kod tomoni tayyor: sayt/ilova mahsulotni server orqali o'qiydi;
> - lekin `products` kolleksiyasi qoidada **hali ochiq turadi**, ya'ni
>   optom narx va tannarxni Firebase SDK bilan o'qib olish mumkin.
>
> Himoyani yoqish uchun yuqoridagi buyruqni **bir marta** ishga
> tushiring (telefondan ham bo'ladi — Google Cloud Shell'da,
> `console.cloud.google.com` → `>_`):
>
> ```bash
> git clone -b claude/plumbing-ecommerce-nextjs-jxpmh5 \
>   https://github.com/Abdulmajidkhan007/atoyo-e-commerce.git
> cd atoyo-e-commerce
> npx -y firebase-tools deploy --only firestore:rules --project atoyo-uz
> ```
>
> Tartib MUHIM: avval kod (git push), keyin qoidalar. Aks holda
> qoidalar yopilib, hali eski kod ishlab turgan mijozlarda katalog
> ochilmay qolardi.

### 5a. Xizmat akkaunti huquqlari (push va Telegram kirish)

App Hosting saytni Cloud Run'da, **xizmat akkaunti** nomidan ishlatadi.
Standart holatda o'sha akkauntda ikki narsaga huquq yetmaydi:

| Nima ishlamaydi | Sabab | Kerakli rol |
|---|---|---|
| «Telegram orqali kirib bo'lmadi» | Firebase custom token IAM `signBlob` orqali imzolanadi | `roles/iam.serviceAccountTokenCreator` (o'ziga) |
| Push bildirishnoma kelmaydi | FCM xabar yuborish taqiqlangan | `roles/firebase.sdkAdminServiceAgent` yoki `roles/firebasecloudmessaging.admin` |

Tekshirish: admin panel → **Sozlamalar → Tizim tekshiruvi → «Tekshirish»**.
Qatorlarda ❌ chiqsa, Google Cloud Shell'da (`console.cloud.google.com`,
yuqoridagi `>_` tugmasi) quyidagini bajaring:

```bash
PROJECT=atoyo-uz
SA="$(gcloud run services describe atoyo-e-commerce --region=us-east4 \
      --project=$PROJECT --format='value(spec.template.spec.serviceAccountName)')"
echo "Xizmat akkaunti: $SA"

# 1) Telegram orqali kirish (custom token imzolash)
gcloud iam service-accounts add-iam-policy-binding "$SA" \
  --project=$PROJECT --member="serviceAccount:$SA" \
  --role=roles/iam.serviceAccountTokenCreator

# 2) Push bildirishnomalar (FCM)
gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:$SA" \
  --role=roles/firebase.sdkAdminServiceAgent
```

Huquq bir-ikki daqiqada kuchga kiradi (yangi konteynerda). Keyin yana
«Tekshirish» tugmasini bosing — hamma qator ✅ bo'lishi kerak, so'ng
«Sinov bildirishnomasi» bilan telefonga xabar kelishini ko'ring.

### 5b. SMS xabarnomalar (ixtiyoriy, tavsiya etiladi)

Mijozda ilova ham, Telegram ham bo'lmasligi mumkin — SMS eng ishonchli
kanal. Ikki provayder qo'llab-quvvatlanadi; **Eskiz.uz** tavsiya
etiladi (arzon, hujjatlari sodda, O'zbekistonda keng qo'llanadi).

| O'zgaruvchi | Qiymat |
|---|---|
| `SMS_PROVIDER` | `eskiz` |
| `ESKIZ_EMAIL` | Eskiz kabinetidagi email |
| `ESKIZ_PASSWORD` | Eskiz paroli |
| `SMS_SENDER` | `4546` (standart) yoki tasdiqlangan nomingiz |

Play Mobile ishlatilsa: `SMS_PROVIDER=playmobile`, `PLAYMOBILE_LOGIN`,
`PLAYMOBILE_PASSWORD`, kerak bo'lsa `PLAYMOBILE_URL`.

Parol maxfiy — Secret Manager orqali qo'shiladi:

```bash
firebase apphosting:secrets:set ESKIZ_PASSWORD
```

> Reklama SMS matnlari operatorda tasdiqlanishi kerak; buyurtma holati
> haqidagi (tranzaksion) xabarlar odatda tez tasdiqlanadi.

### 5c. Email (SMTP)

Hozir yangiliklar faqat Telegramga ketyapti — chunki SMTP sozlanmagan.
Gmail bilan: hisobingizda 2FA yoqilgan bo'lishi kerak, so'ng
**App password** yaratiladi va:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=santexnika.atoyo@gmail.com
SMTP_PASS=<app password>
SMTP_FROM=Atoyo Santexnika <santexnika.atoyo@gmail.com>
```

Shundan keyin: buyurtma holati xatlari, e'lonlar (admin > Xabar
yuborish) va blog yangiliklari email orqali ham boradi. Kunlik Gmail
limiti ~500 xat; undan ko'p kerak bo'lsa Brevo/SendGrid (bepul tarif
kuniga 100-300 xat) yoki Resend tavsiya etiladi.

### 5d. Tezkor qidiruv (Typesense, ixtiyoriy)

10 000+ mahsulotda Firestore qidiruvi sekinlashadi va xato yozilgan
so'zni topmaydi. Typesense aynan shu ish uchun: bir necha millisekund,
typo'ga chidamli, ahamiyatlilik bo'yicha saralaydi.

Ikki yo'l:

- **Typesense Cloud** — eng kichik tarif ~20-25 $/oy, sozlash 5 daqiqa;
- **O'zi hostlangan** (Docker, bepul) — 1 GB RAM li VPS yetadi.

Env (kalit maxfiy — Secret Manager orqali):

```
TYPESENSE_HOST=xxx.a1.typesense.net
TYPESENSE_API_KEY=<admin kalit>
TYPESENSE_COLLECTION=products     # ixtiyoriy
```

Sozlangandan keyin: admin panel → Katalog → **«Qidiruv indeksini
to'ldirish»** (yoki `POST /api/admin/products/search-index`). Keyin
mahsulot yaratilganda/tahrirlanganda indeks o'zi yangilanadi.
Sozlanmasa sayt avvalgi Firestore qidiruvida ishlayveradi.

### 5e. AI yordamchi va AI rasm (ixtiyoriy)

Ikkita mustaqil imkoniyat, ikkita alohida kalit. Kalit qo'yilmasa
tegishli tugma umuman ko'rinmaydi — sayt/ilova/bot avvalgidek ishlaydi.

**1) Yordamchi (sayt, ilova, bot).** Anthropic (Claude) kaliti:

1. https://console.anthropic.com → **API Keys** → *Create Key*;
2. Hisobga balans qo'ying (Billing → *Add credits*, minimal 5 $);
3. Kalitni Secret Manager'ga qo'ying va `apphosting.yaml` ga ulang:

```bash
gcloud secrets create ANTHROPIC_API_KEY --replication-policy=automatic --project=atoyo-uz
printf 'sk-ant-...' | gcloud secrets versions add ANTHROPIC_API_KEY --data-file=- --project=atoyo-uz
```

```yaml
  - variable: ANTHROPIC_API_KEY
    secret: ANTHROPIC_API_KEY
    availability:
      - RUNTIME
  # Ixtiyoriy: arzonroq model (standart - claude-opus-5)
  - variable: AI_MODEL
    value: claude-haiku-4-5
    availability:
      - RUNTIME
```

Taxminiy xarajat: bitta savol-javob ~2 000 kirish + ~300 chiqish token.
Opus 5 da ~0,017 $ (~210 so'm), Haiku 4.5 da ~0,003 $ (~40 so'm).
Kuniga 100 savol = oyiga ~50 $ (Opus) yoki ~9 $ (Haiku). Himoya:
har IP uchun soatiga 30 savol + mavzudan tashqari savollar modelga
umuman bormaydi.

**2) AI rasm (Nano Banana / Gemini image).** Rasm generatsiyasi uchun:

1. https://aistudio.google.com/apikey → *Create API key* (atoyo-uz loyihasida);
2. Billing yoqilgan bo'lishi kerak (bepul tarif limitlari kichik);

```bash
gcloud secrets create GEMINI_API_KEY --replication-policy=automatic --project=atoyo-uz
printf 'AIza...' | gcloud secrets versions add GEMINI_API_KEY --data-file=- --project=atoyo-uz
```

```yaml
  - variable: GEMINI_API_KEY
    secret: GEMINI_API_KEY
    availability:
      - RUNTIME
  # Ixtiyoriy: sifatlisi (qimmatroq) - gemini-3-pro-image-preview
  - variable: GEMINI_IMAGE_MODEL
    value: gemini-2.5-flash-image
    availability:
      - RUNTIME
```

Narx: bitta rasm ~0,039 $ (~480 so'm). 5 ta rasm ≈ 0,2 $ (~2 400 so'm).

### 5f. Qo'shimcha kirish yo'llari (Apple/Microsoft/Facebook/telefon)

Har bir provayder avval **Firebase konsolida** yoqiladi
(Authentication → Sign-in method), keyin `apphosting.yaml` dagi
ro'yxatga qo'shiladi:

```yaml
  - variable: NEXT_PUBLIC_AUTH_PROVIDERS
    value: "google,telegram,apple,microsoft,facebook,phone"
    availability:
      - BUILD
      - RUNTIME
```

Ro'yxatda yo'q usul tugmasi saytda chizilmaydi. Nima kerak bo'ladi:

| Usul | Talab |
|---|---|
| `apple` | Apple Developer Program (99 $/yil), Services ID + kalit |
| `microsoft` | Azure Portal → App registration (bepul), Client ID + Secret |
| `facebook` | Facebook for Developers → App (bepul), App ID + Secret |
| `phone` | Firebase'da Phone yoqiladi + domen ruxsati (SMS ~0,01-0,06 $) |

WhatsApp va WeChat Firebase Auth'da **yo'q** — ular uchun `phone`
(SMS kod) yoki mavjud Telegram kirishi ishlatiladi.

### 5g. To'lov va karta saqlash (merchant kalitlari kelganda)

```yaml
  - variable: PAYME_MERCHANT_ID     # kassa ID
    value: "..."
    availability: [BUILD, RUNTIME]
  - variable: PAYME_KEY             # Merchant API paroli (webhook)
    secret: PAYME_KEY
    availability: [RUNTIME]
  - variable: PAYME_SUBSCRIBE_KEY   # Subscribe API kaliti (karta saqlash)
    secret: PAYME_SUBSCRIBE_KEY
    availability: [RUNTIME]
```

`PAYME_SUBSCRIBE_KEY` qo'yilgach profil sahifasida "Kartalarim"
bo'limi paydo bo'ladi: karta raqami + amal muddati → SMS kod →
saqlangan token. Karta raqami bizda saqlanmaydi.

**Birinchi ish:** Payme test kabinetida (test.paycom.uz) bitta kartani
qo'shib, kod bilan tasdiqlab, bitta buyurtmani to'lab ko'ring — bu
integratsiya kalitlar yo'qligi sababli hali jonli sinovdan o'tmagan.

### 6. Google Analytics (ixtiyoriy)

Statistika kerak bo'lsa `apphosting.yaml` ga bitta o'zgaruvchi qo'shiladi:

```yaml
  - variable: NEXT_PUBLIC_GA_ID
    value: G-XXXXXXXXXX
    availability:
      - BUILD
      - RUNTIME
```

Qo'yilmagan bo'lsa sayt hech qanday tashqi kuzatuv skriptini yuklamaydi.

---

## Ijtimoiy navbatni avtomatik bo'shatish (cron)

Ijtimoiy tarmoq postlari darhol ketmaydi — avval `socialQueue`
kolleksiyasiga tushadi (kunlik chegara va qayta urinish shu yerda
boshqariladi). Navbatni **kimdir bo'shatishi** kerak.

Avval buni faqat admin panelidagi tugma qilardi: admin o'sha ekranga
kirmasa, postlar cheksiz yotib qolardi. Endi `/api/cron/social`
manzili bor.

### 1. Sir yarating

```bash
# Uzun tasodifiy satr
openssl rand -hex 32

gcloud secrets create CRON_SECRET --replication-policy=automatic --project=atoyo-uz
printf '<yuqoridagi satr>' | gcloud secrets versions add CRON_SECRET --data-file=- --project=atoyo-uz
firebase apphosting:secrets:grantaccess CRON_SECRET --backend atoyo-e-commerce --project atoyo-uz
```

`apphosting.yaml` ga qo'shing:

```yaml
  - variable: CRON_SECRET
    secret: CRON_SECRET
    availability:
      - RUNTIME
```

> `CRON_SECRET` qo'yilmaguncha endpoint **503** qaytaradi — tasodifan
> ochiq qolib ketmaydi.

### 2. Cloud Scheduler

```bash
gcloud scheduler jobs create http atoyo-social-queue \
  --project=atoyo-uz \
  --location=us-east4 \
  --schedule="0 * * * *" \
  --time-zone="Asia/Tashkent" \
  --uri="https://atoyo-uz.web.app/api/cron/social" \
  --http-method=POST \
  --headers="Authorization=Bearer <yuqoridagi satr>"
```

Tekshirish:

```bash
# Sirsiz - 401
curl -i -X POST https://atoyo-uz.web.app/api/cron/social
# Sir bilan - 200 va navbat holati
curl -X POST https://atoyo-uz.web.app/api/cron/social \
  -H "Authorization: Bearer <satr>"
```

## Sog'liq tekshiruvi va xatolar

- **`/api/health`** — sayt tirikligini bildiradi (`{"ok":true}`).
  Bazaga tegmaydi, shuning uchun monitoring so'rovlari Firestore
  o'qishini sarflamaydi. UptimeRobot kabi xizmatga shu manzilni bering.
- **Xatolar Telegramga tushadi.** Sentry kabi alohida xizmat
  qo'shilmagan: `src/lib/ops/report-error.ts` xato haqida xodimlar
  guruhining "Actions" topic'iga yozadi. Bir xil xato 10 daqiqada
  bir marta yuboriladi (guruh to'lib ketmasin). Ulangan joylar:
  Payme/Click webhook'lari, buyurtma yaratish, ijtimoiy navbat cron'i
  va brauzerda sahifa yiqilganda (`global-error.tsx` →
  `/api/client-error`).

## Ijtimoiy tarmoqlar (Instagram, Facebook, YouTube)

Kalitlar admin panelda **Sozlamalar → Ijtimoiy tarmoqlar** bo'limiga
kiritiladi (faqat loyiha egasiga ko'rinadi) va Firestore'ning
`secrets/social` hujjatiga yoziladi. Env orqali ham berish mumkin:
`FB_PAGE_ID`, `FB_PAGE_ACCESS_TOKEN`, `IG_USER_ID`,
`YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`.

### 1. Instagram va Facebook (panel orqali ulanish - TAVSIYA)

1. Instagram akkaunti **Professional (Business)** bo'lsin va Facebook
   **sahifasiga** bog'lansin.
2. developers.facebook.com → **Create App** (Business turi).
3. Ilovaga **Facebook Login** mahsulotini qo'shing va uning
   sozlamalarida **"Valid OAuth Redirect URIs"** ga panelda ko'rsatilgan
   manzilni yozing:
   `https://atoyo-uz.web.app/api/admin/social/meta/callback`
4. App Dashboard → Settings → Basic dan **App ID** va **App Secret** ni
   olib, panelga (Sozlamalar → Ijtimoiy tarmoqlar → Kalitlar) kiriting
   va **saqlang**.
5. **"Facebook/Instagram'ga ulanish"** tugmasini bosing → Facebook
   roziligini bering → sahifa tokeni va Instagram ID avtomatik
   yoziladi. "Tekshirish" tugmasi sahifa nomi va IG username ni
   ko'rsatadi.

Eslatma: boshqa (o'zingizniki bo'lmagan) akkauntlarga post qilish uchun
`instagram_content_publish` va `pages_manage_posts` ruxsatlari
**App Review** dan o'tishi kerak; o'z sahifangizga esa dastur
"Development" holatida ham ishlaydi (siz dastur admini bo'lganingiz uchun).

### 1a. Instagram va Facebook (qo'lda, Graph API Explorer)

1. Instagram akkauntini **Professional (Business)** ga o'tkazing va
   Facebook **sahifasiga** bog'lang (Instagram → Sozlamalar → Akkaunt
   turi va vositalar).
2. developers.facebook.com da **Create App** → "Business" turi.
3. Ilovaga **Instagram Graph API** va **Facebook Login for Business**
   mahsulotlarini qo'shing.
4. **Graph API Explorer** da ilovani tanlab, quyidagi ruxsatlar bilan
   token oling: `pages_show_list`, `pages_read_engagement`,
   `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`,
   `business_management`.
5. `GET /me/accounts` — sahifa ro'yxati chiqadi: `id` (sahifa ID si) va
   `access_token` (sahifa tokeni) yozib oling.
6. Sahifa tokenini **uzoq muddatli** qiling:
   `GET /oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID
   &client_secret=APP_SECRET&fb_exchange_token=SAHIFA_TOKENI`
7. Instagram ID si: `GET /{page-id}?fields=instagram_business_account`.
8. Ishlab chiqarishda (o'z akkauntingizdan tashqari) post qilish uchun
   `instagram_content_publish` va `pages_manage_posts` ruxsatlari
   **App Review** dan o'tishi kerak.

Chegara: Instagram 24 soatda **50 ta** post qabul qiladi. Panelda
"Kunlik chegara" shuning uchun bor.

### 2. YouTube (faqat video, Shorts)

**MUHIM:** Google `urn:ietf:wg:oauth:2.0:oob` (kodni qo'lda ko'chirish)
usulini bekor qilgan — u endi "Error 400: invalid_request" beradi.
Shuning uchun refresh tokenni saytning o'zi oladi: panelda
"YouTube'ga ulanish" tugmasi bor.

Tartib:
1. Google Cloud → **YouTube Data API v3** yoqilsin.
2. **OAuth consent screen**: External; "Test users" ga kanal egasining
   Gmail'i qo'shilsin (dastur "Testing" holatida bo'lsa refresh token
   7 kunda eskiradi — "Publish app" bilan uni doimiy qilish mumkin).
3. **Credentials → Create credentials → OAuth client ID → Web
   application** (Desktop EMAS!). Ikkita maydon bor, ularni
   ADASHTIRMANG:
   - **Authorized JavaScript origins** → faqat domen:
     `https://atoyo-uz.web.app`
   - **Authorized redirect URIs** → to'liq yo'l bilan:
     `https://atoyo-uz.web.app/api/admin/social/youtube/callback`
4. Client ID va Secret panelga (Sozlamalar → Ijtimoiy tarmoqlar)
   kiritilib **saqlanadi**.
5. **"YouTube'ga ulanish"** tugmasi bosiladi → kanal egasining Google
   hisobi bilan kirib ruxsat beriladi → refresh token avtomatik
   yoziladi. "Tekshirish" tugmasi kanal nomini ko'rsatadi.

> **"So'rov tasdiqlanmadi (state)"** xatosi haqida: OAuth ning CSRF
> `state` qiymati avval cookie'da saqlanardi, lekin **Firebase Hosting
> backendga `__session` dan boshqa HECH QANDAY cookie'ni uzatmaydi** —
> shu sababli Google'dan qaytganda tekshiruv yiqilardi. Endi `state`
> Firestore'da (`oauthStates`, faqat server o'qiydi) saqlanadi va
> ulanishni boshlagan foydalanuvchiga bog'lanadi. Meta (Facebook/
> Instagram) ulanishi ham xuddi shunday ishlaydi.

Eski (qo'lda) tartib:

1. Google Cloud konsolida (`atoyo-uz` loyihasi) **YouTube Data API v3**
   ni yoqing.
2. **OAuth consent screen** ni to'ldiring (External, test rejimida
   kanal egasining email'ini "Test users" ga qo'shing).
3. **Credentials → Create credentials → OAuth client ID → Desktop app**
   → Client ID va Client Secret.
4. Kanal egasi brauzerda quyidagi manzilga kiradi (bitta qatorda):
   `https://accounts.google.com/o/oauth2/v2/auth?client_id=CLIENT_ID
   &redirect_uri=urn:ietf:wg:oauth:2.0:oob&response_type=code
   &scope=https://www.googleapis.com/auth/youtube.upload
   &access_type=offline&prompt=consent`
   Ruxsat bergach `code=...` chiqadi.
5. Kodni refresh tokenga almashtiring:
   `curl -d client_id=... -d client_secret=... -d code=... \
    -d grant_type=authorization_code \
    -d redirect_uri=urn:ietf:wg:oauth:2.0:oob \
    https://oauth2.googleapis.com/token`
   Javobdagi `refresh_token` ni panelga kiriting.

Chegara: bitta yuklash 1600 birlik, kunlik kvota 10 000 — ya'ni kuniga
~6 ta video. Shu sabab YouTube avtomatik emas, admin tanlaganda ishlaydi.

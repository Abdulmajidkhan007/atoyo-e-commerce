# Saytni qayerga joylash mumkin

Sayt — **Next.js (SSR)**: server tomonda ishlaydigan sahifalar, API
route'lar (Telegram webhook, buyurtma, admin API), Firebase Admin SDK va
`next/og` bilan rasm generatsiyasi bor. Shuning uchun hosting **Node.js
serverini** ko'tara olishi shart.

| Variant | Ishlaydimi | Izoh |
|---|---|---|
| **Firebase App Hosting** | ✅ | Bir xil Firebase loyihasi; Admin SDK uchun kalit ham kerak emas. Blaze (karta) rejimi kerak, lekin bepul limiti bor |
| Netlify | ✅ | Hozirgi joy |
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

Lokal kompyuterdan bir marta:

```bash
firebase deploy --only hosting --project atoyo-uz
```

Shundan keyin sayt `https://atoyo-uz.web.app` da ochiladi (uzun manzil
ham ishlayveradi). Keyin `apphosting.yaml` dagi `NEXT_PUBLIC_SITE_URL`
ni qisqasiga o'zgartiramiz va Telegram webhook'ini ham o'shanga
o'tkazasiz.

> Agar rewrite 403 bersa — Cloud Run xizmati (`atoyo-e-commerce`)
> ochiq chaqirilishga ruxsat bermayotgan bo'ladi: Google Cloud konsoli →
> Cloud Run → xizmat → Security → "Allow unauthenticated invocations".

O'z domeningiz (masalan `atoyo.uz`) bo'lsa — App Hosting → Domains →
**Add custom domain** orqali ulanadi (DNS yozuvlari ko'rsatiladi).

### 5. Firestore qoidalari va indekslari

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage --project <PROJECT_ID>
```

(Bu buyruq sandboxdan ishlamaydi — lokal kompyuteringizdan bajaring.)

---

## Netlify'da qolish

Netlify'ning bepul tarifi (100 GB trafik, 300 build-daqiqa/oy) kichik
do'kon uchun yetadi. Agar hisob "to'lov kerak" deb tursa, avval
tekshiring:

- **Billing → Usage** — qaysi limitdan oshgani (odatda build-daqiqalar);
- keraksiz avtomatik build'larni kamaytiring: har push'da build bo'lmasin
  desangiz Netlify → Site settings → Build & deploy → **Stop builds**
  yoki faqat bitta branchni kuzatishga qo'ying;
- limit oyning boshida yangilanadi — shoshilinch bo'lmasa kutish ham
  variant.

Ikkala joyda parallel turishi ham mumkin: kod bir xil, `netlify.toml`
ham, `apphosting.yaml` ham repozitoriyda qoladi.

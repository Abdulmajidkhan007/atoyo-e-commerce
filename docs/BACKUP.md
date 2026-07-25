# Zaxira nusxa (backup) strategiyasi

Bu hujjat Atoyo Santexnika loyihasining ma'lumotlarini yo'qotmaslik uchun
qanday zaxiralash kerakligini tushuntiradi. Barcha amallar Firebase
konsolida yoki `gcloud` CLI orqali bajariladi — sayt kodiga tegmaydi.

## Nima zaxiralanadi

| Manba | Nima saqlanadi | Yo'qolsa oqibati |
|---|---|---|
| **Firestore** | mahsulotlar, buyurtmalar, foydalanuvchilar, blog, sharhlar, promokodlar, kirim tarixi, sozlamalar | Eng og'ir — butun katalog va buyurtmalar tarixi |
| **Firebase Storage** | mahsulot/blog/sayt rasmlari | Rasmlar yo'qoladi, mahsulotlar rasmsiz qoladi |
| **Firebase Auth** | foydalanuvchi hisoblari (email/parol) | Mijozlar tizimga kira olmaydi |
| **Netlify env** | API kalitlar (`FIREBASE_ADMIN_*`, `TELEGRAM_*`, SMTP) | Sayt ishlamay qoladi |
| **GitHub** | kodning o'zi | Kod allaqachon `claude/plumbing-ecommerce-nextjs-jxpmh5` branch'ida |

## 1. Firestore — avtomatik kunlik eksport (tavsiya etiladi)

Firestore'ning o'z "Scheduled backups" imkoniyati bor (Blaze rejasi kerak).

**Firebase konsolida:**
1. Firestore Database → **Backups** bo'limi
2. **Create backup schedule**
3. Chastota: `Daily`, saqlash muddati: `7 kun` (yoki `14`)
4. Saqlash

Bu bilan har kuni avtomatik nusxa olinadi va konsoldan bir tugma bilan
tiklash mumkin.

**Yoki `gcloud` bilan qo'lda eksport (istalgan paytda):**

```bash
gcloud firestore export gs://<PROJECT_ID>.appspot.com/backups/$(date +%F) \
  --project=<PROJECT_ID>
```

Tiklash:

```bash
gcloud firestore import gs://<PROJECT_ID>.appspot.com/backups/2026-07-25 \
  --project=<PROJECT_ID>
```

> ⚠️ `import` mavjud hujjatlarni **ustiga yozadi**. Avval test loyihada
> sinab ko'rish tavsiya etiladi.

## 2. Katalogni CSV sifatida saqlash (tez va oddiy)

Admin panel → **Katalog** → **CSV yuklab olish** tugmasi butun katalogni
Excel'da ochiladigan faylga chiqaradi. Buni **haftada bir marta** qilib,
faylni Google Drive'ga qo'yish tavsiya etiladi.

Xato bo'lsa, o'sha CSV'ni **CSV dan yuklash** tugmasi orqali qaytarib
yuklash mumkin (`id` ustuni bo'yicha mavjud mahsulotlar yangilanadi).

## 3. Storage (rasmlar)

```bash
gsutil -m cp -r gs://<PROJECT_ID>.appspot.com/products ./backup-rasmlar/
gsutil -m cp -r gs://<PROJECT_ID>.appspot.com/blog     ./backup-rasmlar/
gsutil -m cp -r gs://<PROJECT_ID>.appspot.com/site     ./backup-rasmlar/
```

Oyiga bir marta yetarli — rasmlar kamdan-kam o'zgaradi.

## 4. Firebase Auth foydalanuvchilari

```bash
firebase auth:export foydalanuvchilar.json --project <PROJECT_ID>
```

Tiklash: `firebase auth:import foydalanuvchilar.json --project <PROJECT_ID>`

## 5. Netlify environment o'zgaruvchilari

Netlify → Site settings → Environment variables → har birini nusxalab,
**parol menejerida** (yoki shifrlangan faylda) saqlang. Bu qiymatlar
hech qachon Git'ga qo'yilmaydi.

Eslatma: bu loyihada env'lar **non-secret** bo'lishi shart —
`is_secret` belgilangan o'zgaruvchilar function runtime'ga yetib bormaydi.

## Tavsiya etilgan jadval

| Qanchalik tez-tez | Nima |
|---|---|
| Har kuni (avtomatik) | Firestore scheduled backup |
| Har hafta | Katalog CSV eksporti |
| Har oy | Storage rasmlari + Auth eksporti |
| O'zgarganda | Netlify env ro'yxati |

## Falokat holatida tartib

1. Firestore'ni oxirgi backup'dan tiklang (konsol yoki `gcloud import`).
2. Rasmlar yo'qolgan bo'lsa — `gsutil cp` bilan qaytaring.
3. Auth foydalanuvchilarini `auth:import` bilan tiklang.
4. Netlify'da env'lar joyida ekanini tekshirib, **Clear cache and deploy**
   qiling.
5. Telegram webhook'ni qayta ro'yxatdan o'tkazing (admin panel →
   Sozlamalar → Bot).

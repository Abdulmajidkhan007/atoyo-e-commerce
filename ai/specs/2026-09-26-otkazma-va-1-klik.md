# Kartaga o'tkazma + chek, 1 klikda sotib olish — spetsifikatsiya

Marshrut: **6-holat** (katta imkoniyat). Egasi qarorlari (AskUserQuestion,
2026-09-26): 50 000 dan kam buyurtma **qabul qilinadi, yetkazish pullik**;
mehmon to'lovi — **naqd YOKI o'tkazma + chek**.

## 1. Muammo

- Buyurtma faqat tizimga kirgan mijozdan qabul qilinadi (`/api/orders`
  401). evde.uz'dagi kabi "ism + telefon + manzil — tamom" yo'li yo'q.
- Onlayn to'lov (Payme/Click) kalitlari hali yo'q. Egasi vaqtincha
  "kartaga o'tkazma + chek skrinshoti, admin tekshiradi" yo'lini
  xohlaydi.

## 2. Qamrov

**Qilinadi:**
- `settings/payment`: o'tkazma yoqilganmi, karta raqami, egasi, bank,
  izoh. Admin: Sozlamalar → "Kartaga o'tkazma". Ochiq API faqat
  yoqilgan bo'lsa ma'lumot beradi.
- `Order.paymentMethod += "transfer"`; `Order.receipt` (Storage yo'li,
  turi, vaqti); `Order.guest`; `Order.accessTokenHash`.
- `POST /api/orders/quick` — mehmon buyurtmasi (manzil majburiy,
  IP bo'yicha rate limit, honeypot). Kirgan bo'lsa — uid/rol biriktiriladi.
- `/api/orders` (kirgan mijoz) ham `transfer` ni qabul qiladi.
- `/buyurtma/<id>?t=<token>` — buyurtma holati sahifasi: o'tkazma
  bo'lsa karta + summa + nusxa tugmalari + chek yuklash.
- `POST /api/orders/<id>/receipt` — chek (jpeg/png/webp/pdf, ≤ 8 MB,
  sehrli baytlar tekshiriladi). Storage `receipts/<id>/...` — OCHIQ
  TOKENSIZ. Guruhga fayl + "✅ To'lov keldi / ❌ Pul tushmadi".
- Admin: chekni ko'rish (`/api/admin/orders/<id>/receipt`, stream) va
  tasdiqlash (`/api/admin/orders/<id>/payment`).
- Mahsulot sahifasida "1 klikda sotib olish" oynasi.

**QILINMAYDI:**
- Karta raqamini mijozdan olish yoki saqlash (CLAUDE.md: karta raqami
  hech qachon saqlanmaydi). Avtomatik yechish — Payme Subscribe API,
  `lib/payments/cards.ts` (kalit kutilmoqda).
- Chekni avtomatik tekshirish (OCR/bank API) — admin ko'z bilan.
- Ilovaga 1-klik — keyinroq.

## 5. Qabul mezoni

- [ ] Tizimga kirmagan mijoz mahsulot sahifasidan ism, telefon, manzil
      bilan buyurtma bera oladi.
- [ ] O'tkazma tanlansa — karta raqami, summa ko'rinadi, chek yuklanadi,
      guruhga fayl bilan xabar keladi.
- [ ] Chek fayli ochiq URL bilan olinmaydi; admin paneldan ko'riladi.
- [ ] Token noto'g'ri bo'lsa buyurtma sahifasi 404 (borligi ham bilinmaydi).
- [ ] Narx serverda qayta hisoblanadi (client narxiga ishonilmaydi).

## 6. Xavflar

- Ochiq (mehmon) yozuv yo'li: spam buyurtma va fayl yuklash →
  rate limit, hajm/tur chegarasi, token.
- Narx maxfiyligi: mehmon roli yo'q → dona narx (`createOrder` o'zi).
- Chekda shaxsiy bank ma'lumoti → ochiq URL YO'Q.

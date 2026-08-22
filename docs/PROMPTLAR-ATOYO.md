# Atoyo loyihasiga xos promptlar

Umumiy (istalgan loyihaga mos) promptlar — `docs/PROMPTLAR-UMUMIY.md`.
Bu yerda esa **shu loyihaning o'zi** uchun tayyor matnlar: fayl
yo'llari va qoidalar bilan, ya'ni model qidirib yurmaydi (token
tejaladi).

Ishlatish: yangi sessiya ochib, kerakli matnni nusxalab yuboring.
`CLAUDE.md` avtomatik o'qiladi — qoidalarni takrorlash shart emas.

---

## Telegram bot va kanal

**Yangi bot buyrug'i qo'shish**
```text
Vazifa: adminlar guruhiga `/<buyruq>` qo'shilsin — <nima qiladi>.
Fayl: src/lib/telegram/admin-commands.ts (HELP_TEXT ga ham qo'sh).
Eslatma: javob HTML, narx `formatSom()` bilan; mahsulot xom hujjat
bilan ishlaydi (viewer emas).
Tugagach: tsc + eslint + test + build, commit va push.
```

**Kanal posti matnini o'zgartirish**
```text
Vazifa: kanal postida <nima o'zgarsin>.
Fayl: src/lib/telegram/channel.ts → buildProductText().
Eslatma: post tartibi (nomi → brend/davlat → kategoriya → narx →
turlar → material) va tur qatori (QIYMAT — NARX · kod) buzilmasin;
matn `truncateHtml()` bilan kesiladi, `slice()` ishlatilmaydi;
kanalda DOIM dona narx (`forChannel`).
Testni yangila: src/lib/telegram/channel.test.ts.
Tugagach: tsc + eslint + test + build, commit va push.
```

**Kanal/bot nosozligini tekshirish**
```text
Adminlar guruhidagi "Actions" topikida shu xato chiqdi:
<xato matni>
Sababini top va tuzat. Kanal posti yo'qolib qolmasin — avval yangisi
yuboriladi, eskisi keyin o'chiriladi (channel-announce.test.ts).
```

## Mahsulot va narx

**Mahsulotga yangi maydon qo'shish**
```text
Vazifa: mahsulotga `<maydon>` qo'shilsin (<nima uchun>).
Fayllar: src/types/product.ts, src/components/admin/ProductForm.tsx,
src/app/api/admin/products/route.ts (+ [id]), kerak bo'lsa
mobile/src/types.ts.
Eslatma: mijozga chiqadigan joy `toViewerProduct()` dan o'tadi;
maydon maxfiy bo'lsa viewer'da olib tashlansin. Import (csv.ts) va
Telegram kirimi (intake-parser.ts) ham shu maydonni bilishi kerakmi
— o'zing qaror qil va aytib qo'y.
Tugagach: tsc + eslint + test + build, commit va push.
```

**Narxga tegadigan har qanday ish**
```text
Vazifa: <narx bilan bog'liq o'zgarish>.
Eslatma (buzilmasin): `price` — OPTOM, `costPrice` — TANNARX; dona
narx faqat `priceForRole()` bilan; mijozga chiqadigan hamma joy
`toViewerProduct()/toViewerProducts()` dan o'tadi; ustama foizi
mijozga berilmaydi; kanal/push/ijtimoiy tarmoq — doim dona narx.
Testni yangila: src/lib/products/pricing.test.ts yoki wholesale.test.ts.
Tugagach: tsc + eslint + test + build, commit va push.
```

## Sayt (Next.js)

**Yangi sahifa / route**
```text
Vazifa: <manzil> sahifasi qo'shilsin — <nima ko'rsatadi>.
Eslatma: dinamik kontent bo'lsa `export const dynamic = "force-dynamic"`;
mahsulot qaytarsa `toViewerProducts()` + `no-store` (lib/http/cache.ts);
server komponentga funksiya prop berilmaydi (MUI tugmasi kerak bo'lsa
alohida "use client" komponent); yangi tashqi manba bo'lsa
lib/http/csp.ts ga qo'sh va csp.test.ts ga test yoz.
Tugagach: tsc + eslint + test + build, commit va push.
```

**Admin panelga yangi sozlama**
```text
Vazifa: Sozlamalarga "<nomi>" qo'shilsin.
Fayllar: src/types/content.ts (yoki tegishli tur),
src/app/api/admin/<...>/route.ts (Zod + validationMessage),
src/components/admin/<...>Form.tsx, src/app/admin/sozlamalar/page.tsx.
Eslatma: yozuv faqat server route orqali (Admin SDK); xato javobi
qaysi maydon rad etilganini aytsin.
Tugagach: tsc + eslint + test + build, commit va push.
```

## Mobil ilova

```text
Vazifa: ilovada <nima>.
Fayllar: mobile/src/<...>.
Eslatma: ilova sayt kodini import qila olmaydi — takrorlangan
mantiq (masalan yetkazib berish matni mobile/src/api.ts da) ikkala
tomonda birga o'zgaradi. Yangi NATIV paket qo'shilsa
mobile/scripts/check-codegen.mjs ro'yxatiga ham qo'sh va versiyani
ikki joyda oshir (mobile/src/update.ts + android/app/build.gradle).
Tugagach: cd mobile && npx tsc --noEmit && npx eslint 'src/**/*.tsx'
--no-ignore, keyin saytning tekshiruvi, commit va push.
```

## Xatolarni tekshirish (tez-tez kerak bo'ladi)

```text
Saytda/botda shunday bo'lyapti: <nima bo'lyapti>.
Kutgan natijam: <nima bo'lishi kerak edi>.
Xato matni (bo'lsa): <matn>.
Avval SABABINI top (taxmin qilma, kodni o'qi va kerak bo'lsa test
bilan takrorla), keyin tuzat va regression testi yoz.
```

---

# LOYIHA AUDITI — Opus uchun tayyor topshiriq

Quyidagi matnni **yangi sessiyada** (kuchli model bilan) yuboring.
U kod yozmaydi — faqat o'rganadi va hisobot yozadi.

````text
Sen bu sessiyada AUDITORSAN: loyihani boshdan-oxir o'rganib, hisobot
yozasan. Mahsulot kodini O'ZGARTIRMAYSAN — faqat `docs/AUDIT.md`
faylini yaratasan va menga xulosa berasan.

Avval o'qi: CLAUDE.md (qoidalar), docs/ARXITEKTURA-TARIXI.md
(qoidalarning sababi), docs/HISOBOT.md (oxirgi holat). Ularda
yozilganini QAYTA kashf qilma — sen yangi narsa qidirasan.

Tekshiruv rejasi (har birida FAKT keltir: fayl:qator yoki buyruq
chiqishi; taxmin bilan yozma):

1. O'LIK VA ORTIQCHA KOD
   - eksport qilingan, lekin hech qayerda import qilinmagan fayl/
     funksiyalar; ishlatilmagan npm paketlar; erishib bo'lmaydigan
     route'lar; takrorlangan mantiq (bir xil funksiya bir necha
     faylda).
2. XAVFSIZLIK VA MAXFIYLIK
   - firestore.rules: qaysi kolleksiya ochiq va shunday bo'lishi
     kerakmi; mijozga chiqadigan javoblarda `costPrice`,
     `supplier`, `retailMarkupPercent` qolib ketgan joy bormi
     (`toViewerProduct` chetlab o'tilganmi);
   - admin route'larida ruxsat tekshiruvi (`requirePermission` /
     `requireOwner`) yetishmaydigan joy;
   - foydalanuvchi kiritgan matn HTML/Telegram/SQL'ga qanday
     tushyapti (escape).
3. TO'G'RILIK VA PUL
   - to'lov yo'llari (src/app/api/payments/**), buyurtma summasi
     (lib/orders/create-order.ts): imzo tekshiruvi, tiyin/so'm
     hisobi, takroriy so'rov (idempotentlik);
   - testsiz qolgan MUHIM mantiq ro'yxati.
4. TEZLIK VA XARAJAT
   - Firestore: indekssiz so'rovlar, `.get()` bilan butun
     kolleksiyani o'qish, N+1 naqshlar, keshlanmaydigan og'ir
     sahifalar;
   - mijozga ketadigan JS hajmi: og'ir paket statik import
     qilinganmi (`three`, `gsap`, `framer-motion`, MUI ikonkalari);
   - `npm run build` chiqishidagi eng katta sahifalar.
5. ISHONCHLILIK
   - `catch {}` bilan JIMGINA yutilgan xatolar (foydalanuvchi ham,
     admin ham bilmay qoladigan joylar);
   - tashqi xizmat (Telegram, Firebase, Anthropic, Gemini) yiqilsa
     nima bo'ladi — asosiy oqim to'xtaydimi.
6. HUJJAT VA KOD SIFATI
   - CLAUDE.md/docs dagi qaysi gap endi HAQIQATGA ZID;
   - 800 qatordan katta fayllar va ularni bo'lish rejasi.

Natija — `docs/AUDIT.md`:
- har topilma: **Fakt** (fayl:qator) → **Nega muhim** → **Yechim** →
  **Mehnat** (kichik/o'rta/katta) → **Xavf** (past/o'rta/yuqori);
- topilmalar uch bo'limga ajratilsin: **OLIB TASHLASH**,
  **QO'SHISH**, **OPTIMIZATSIYA**;
- oxirida "birinchi navbatda" 5 ta ish (ta'sir/mehnat nisbati
  bo'yicha) va har biri uchun yangi sessiyaga tayyor topshiriq matni
  (20 qatordan qisqa).

Qoidalar:
- Har bir da'voni tekshirib ko'r (grep/rg, `npm run build`,
  `npx tsc --noEmit`) — xayoliy fayl yo'li yozma.
- "Yaxshi bo'lardi" degan umumiy maslahat yozma; faqat shu kodda
  ko'rgan narsang.
- CLAUDE.md dagi qoidani "kamchilik" deb yozishdan oldin
  docs/ARXITEKTURA-TARIXI.md dan sababini o'qi.
- Hisobot o'zbekcha. Oxirida `docs/AUDIT.md` ni commit qilib push
  qil (branch: claude/plumbing-ecommerce-nextjs-jxpmh5).
````

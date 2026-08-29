# Boshqa loyihada shu tartibda ishlash — namuna

Atoyo loyihasida ishlagan usulni (qoidalar → kichik topshiriqlar →
majburiy tekshiruv → hujjat) **istalgan boshqa repozitoriyaga**
ko'chirish uchun namuna. Ikki qism: (A) ish tartibi qoidalari,
(B) tayyor promptlar.

---

# A. Ish tartibi (har qanday loyiha uchun)

## 1. Bitta sessiya = bitta ish

Uzun suhbat har xabarda qaytadan yuboriladi — ya'ni qimmat.
Reja bitta uzoq suhbatda, ijro esa har safar **toza sessiyada**.

## 2. Har loyihada ikkita hujjat bo'lsin

| Fayl | Nima uchun |
|---|---|
| `CLAUDE.md` | Har sessiyada AVTOMATIK o'qiladi. Faqat QOIDALAR va xarita. **15–20 KB dan oshmasin** — kattaligi har sessiyaga qimmatga tushadi |
| `docs/ARXITEKTURA-TARIXI.md` | Qoidaning SABABI: qaysi nosozlikdan keyin paydo bo'lgani. Model uni faqat kerak bo'lganda o'qiydi |

`CLAUDE.md` ning skeleti:

```markdown
# <Loyiha nomi> — yo'riqnoma
Stack, til, dizayn tizimi (3-5 qator).

## Ish tartibi
- Branch: `<branch>`; boshqa branchga push YO'Q; PR faqat so'ralganda.
- Deploy qanday bo'ladi (push? qo'lda? CI?).
- Tekshiruv (commit oldidan MAJBURIY): <buyruqlar>
- Commit konvensiyasi.
- Hujjat yangilash majburiyati.

# BUZILMAS QOIDALAR
1. <maxfiylik / xavfsizlik qoidasi>
2. <server/client chegarasi>
3. <tashqi xizmat cheklovlari>
...har biri: qoida + BIR QATOR sabab.

# XARITA
Qayerda nima turadi (papka → vazifa).

# MA'LUM BLOKLAR
Foydalanuvchi hal qiladigan narsalar (kalitlar, konsol sozlamalari).
```

## 3. Majburiy tekshiruv zanjiri

Har commitdan oldin **to'rttasi ham** yashil bo'lishi shart. Misol
(Next.js/TS):

```bash
npx tsc --noEmit && npx eslint . && npm test && npm run build
```

Boshqa stackda ekvivalenti: tur tekshiruvi + linter + testlar +
qurish. **"Ishladi" deb aytishdan oldin ishga tushirib ko'rish.**

## 4. Test qoidasi

- Sof mantiqqa (narx, format, parser, validatsiya, huquq) — **test
  shart**. UI ko'rinishiga test yozilmaydi.
- Nosozlik tuzatilganda — **o'sha nosozlikni qaytaruvchi test**
  yoziladi ("regression"), aks holda u qaytib keladi.
- Test tashqi xizmatga (baza, API) chiqmasin: mock bilan.

## 5. Topshiriq shakli (har safar)

```
Vazifa: <bir gapda>
Kutilgan natija: <foydalanuvchi nimani ko'radi>
Tegishli fayllar: <yo'llar>
Eslatma: <buzilmasligi kerak bo'lgan qoida>
Tugagach: <tekshiruv zanjiri>, commit va push <branch> ga.
Agar push bloklansa - o'z branchingga push qilib, nomini menga ayt.
```

**Fayl nomini aytish** — eng katta tejamkorlik: model qidirib
yurmaydi.

## 6. Model tanlash

| Ish | Model |
|---|---|
| Reja, audit, chigal nosozlik, arxitektura | Kuchli (Opus) |
| Aniq belgilangan ijro (fayl nomi ma'lum) | Arzonroq (Sonnet) |

## 7. Ikkita oltin qoida

1. **Taxmin qilma — o'lchab ko'r.** "Sekin", "ishlamayapti", "buzuq"
   degan gap raqam bilan tasdiqlansin (build chiqishi, tarmoq
   paneli, `getComputedStyle`, log).
2. **Xato jimgina yutilmasin.** `catch {}` — eng qimmat xato turi:
   nosozlik bor, lekin hech kim bilmaydi.

---

# B. Tayyor promptlar

## B1. Umumiy: yangi loyihani tartibga solish

Notanish repozitoriyada BIRINCHI xabar sifatida yuboriladi.

````text
Sen tajribali Senior Software Architect'san. Bu loyiha sen uchun
NOTANISH. Vazifang - uni tushunib, keyingi ishlar arzon va xavfsiz
bo'lishi uchun poydevor tayyorlash. Bu bosqichda MAHSULOT KODINI
O'ZGARTIRMA (faqat quyidagi hujjatlarni yoz).

1) TANISHUV (faqat o'qish):
   - paket/build fayllari: stack, skriptlar, qanday ishga tushadi,
     qaysi buyruqlar bilan tekshiriladi (test/lint/build);
   - papka tuzilishi va eng katta 10 ta fayl (`wc -l`);
   - README va hujjatlar: qaysi biri eskirgan;
   - muhit: env o'zgaruvchilari, sirlar qayerdan olinadi, deploy
     qanday bo'ladi.

2) TAHLIL (menga qisqa hisobot):
   - loyiha nima qiladi (3-5 gap), arxitektura, ma'lumot oqimi;
   - XAVFLI joylar: maxfiy ma'lumot qayerda ochiq qolishi mumkin,
     qaytarib bo'lmaydigan amallar;
   - sifat: testlar nimani qoplaydi, takrorlangan kod, o'lik fayl,
     ishlatilmagan paket;
   - har topilma: FAKT (fayl:qator yoki buyruq chiqishi) -> nega
     muhim -> mehnat (kichik/o'rta/katta).

3) `CLAUDE.md` YOZ (yoki mavjudini qayta yoz):
   - FAQAT qoidalar va xarita, 15-20 KB dan oshmasin (u har
     sessiyada o'qiladi);
   - ichida: ish tartibi (branch, commit, TEKSHIRUV BUYRUQLARI),
     buzilmas qoidalar ("... QILINMAYDI" shaklida), qayerda nima
     turishi, hujjatlar ro'yxati;
   - "nega shunday" degan uzun tarixlar `docs/ARXITEKTURA-TARIXI.md`
     ga chiqsin (yo'q bo'lsa yarat).

4) TEKSHIR: yozgan hujjatingdagi HAR BIR fayl yo'li va buyruq
   haqiqatan mavjudligini ishga tushirib tasdiqla. Xayoliy yo'l
   yozma.

5) Oxirida ber:
   - 5 tadan oshmaydigan "birinchi navbatda tuzatiladigan" ro'yxat
     (ta'sir/mehnat nisbati bo'yicha);
   - keyingi ishlar uchun 3-5 ta tayyor topshiriq matni (har biri
     20 qatordan qisqa, fayl yo'llari bilan).

Til: menga javob va hujjatlar o'zbekcha.
````

## B2. Sayt sekin ochilyapti — sabab va rasmlar qayerda saqlanadi

````text
Vazifa: sayt SEKIN ochilyapti. Sababini TOPIB, o'lchab ber va
tuzatish rejasini chiqar. Bu sessiyada faqat XAVFSIZ va kichik
tuzatishlarni qo'lla; kattalarini alohida topshiriq qilib ber.

TAXMIN QILMA - O'LCHA. Har da'vo raqam yoki buyruq chiqishi bilan
tasdiqlansin.

1) O'LCHOV (avval shu, keyin kod):
   - `npm run build` (yoki loyihaning build buyrug'i) chiqishini
     to'liq ber: qaysi sahifa qancha JS oladi, eng katta bundle
     qaysi;
   - mijozga ketadigan eng og'ir 10 ta paketni top (bundle
     tahlili yoki `du -sh node_modules/*` emas - HAQIQIY bundle);
   - sahifa turi: statik / server / to'liq dinamik? Kesh
     sarlavhalari (`Cache-Control`) bormi;
   - server qayerda joylashgan (region) va ma'lumotlar bazasi
     qayerda - masofa katta bo'lsa har so'rov shunga ketadi.

2) RASMLAR - ALOHIDA BO'LIM (aniq javob ber):
   - rasmlar HOZIR qayerda saqlanadi? (`public/` papkasi,
     Cloudinary, S3, Firebase Storage, baza ichida base64...) -
     fayl yo'llari va namuna URL bilan ko'rsat;
   - hajmi: eng katta 10 ta rasm (`find . -name "*.jpg" -o -name
     "*.png" | xargs du -h | sort -rh | head`);
   - format: WebP/AVIF ishlatilyaptimi yoki hammasi JPG/PNG mi;
   - o'lchami: original o'lcham qanday, ekranda qancha ko'rinadi
     (masalan 3000px rasm 300px joyda chiqyaptimi);
   - lazy-loading va o'lcham berish (`width`/`height` yoki
     `next/image`) qo'llanganmi;
   - CDN orqali beriladimi yoki to'g'ridan-to'g'ri serverdanmi.

3) SABABLARNI TARTIBLA: har biri uchun FAKT -> ta'sir (taxminan
   necha ms yoki necha KB) -> yechim -> mehnat -> xavf.

4) SHU SESSIYADA QO'LLA (faqat xavfsizlari):
   - rasmga `width`/`height`, `loading="lazy"`, zamonaviy format;
   - o'chirilgan/ishlatilmagan katta paketlar;
   - statik javoblarga kesh sarlavhasi;
   - og'ir komponentni dinamik importga o'tkazish.
   Har o'zgarishdan keyin build qayta ishga tushirilsin va
   natija (KB/ms) SOLISHTIRILSIN - "yaxshilandi" degan gap
   raqamsiz yozilmasin.

5) Qolganini (rasmlarni CDN'ga ko'chirish, region almashtirish,
   arxitektura o'zgarishi) alohida topshiriq matni qilib ber.

Tugagach: loyihaning tekshiruv zanjiri (tur tekshiruvi + linter +
testlar + build) yashil bo'lsin, keyin commit va push.
Til: javob o'zbekcha.
````

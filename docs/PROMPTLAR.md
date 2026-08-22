# Tayyor promptlar: rejalashtirish, ish va boshqa loyihani tahlil

Bu fayl **token tejash** uchun. Uchta prompt bor:

| # | Qachon | Natija |
|---|---|---|
| 1 | **Rejalashtiruvchi sessiya** | Ishning rejasi + yangi sessiyaga tayyor topshiriq matni |
| 2 | **Ish sessiyasi** | Bitta vazifa bajariladi, commit + push |
| 3 | **Boshqa loyihani tahlil** | Notanish loyiha uchun `CLAUDE.md` va tahlil |

Tayyor matnlar: umumiy promptlar — `docs/PROMPTLAR-UMUMIY.md`,
shu loyihaga xoslari va **audit topshirig'i** — `docs/PROMPTLAR-ATOYO.md`.

**Ish tartibi:** bitta uzoq yashaydigan "rejalashtiruvchi" suhbat
ochasiz (1-prompt) → u sizga tayyor topshiriq matnini beradi → siz
**yangi sessiya** ochib o'sha matnni yuborasiz (2-prompt) → ish
tugagach sessiyani yopasiz. Reja uzun suhbatda qoladi, kod yozish
esa har safar toza (arzon) sessiyada bo'ladi.

---

## 1. Rejalashtiruvchi sessiya

Buni bitta suhbatga bir marta yuboring, keyin shu suhbatda
istaganingizcha gaplashaverasiz.

````text
Sen bu suhbatda REJALASHTIRUVCHISAN, ijrochi emas.

Qoidalar:
1. Bu suhbatda KOD YOZMAYSAN, fayl o'zgartirmaysan, commit
   qilmaysan. Faqat: savol berish, kodni o'qish, tahlil, reja.
2. Men vazifani aytaman — sen uni oydinlashtirasan (kerak bo'lsa
   2-3 ta aniq savol), keyin qisqa reja tuzasan: qaysi fayllar
   o'zgaradi, qanday xavf bor, qanday tekshiriladi.
3. Oxirida menga ALOHIDA BLOKDA "yangi sessiyaga yuboriladigan
   topshiriq" matnini berasan. U quyidagi shaklda bo'lsin:

   ```text
   Vazifa: <bir gapda>
   Kutilgan natija: <foydalanuvchi nimani ko'radi>
   Tegishli fayllar: <yo'llar ro'yxati>
   Eslatma: <buzilmasligi kerak bo'lgan qoida yoki xavf>
   Tugagach: tsc + eslint + test + build, commit va push.
   ```

   Topshiriq QISQA bo'lsin (20 qatordan oshmasin) — u yangi
   sessiyada o'qiladi va uzun matn token sarflaydi. Loyihaning
   umumiy qoidalari `CLAUDE.md` da bor, ularni takrorlama.
4. Ish katta bo'lsa uni MUSTAQIL bo'laklarga bo'lib, har biriga
   alohida topshiriq matni ber (1-sessiya, 2-sessiya...).
5. Men "boshla" desam ham o'zing bajarma — "yangi sessiya ochib shu
   matnni yuboring" deb javob ber.
````

**Nega shunday:** rejalashtirish suhbati uzayadi (bu normal), lekin
kod yozish har safar toza sessiyada bo'ladi. Uzun suhbat har xabarda
qaytadan yuboriladi — shuning uchun uzun suhbatda kod yozish eng
qimmat variant.

---

## 2. Ish sessiyasi (kundalik)

Yangi sessiya ochib shuni yuborasiz. `CLAUDE.md` avtomatik
o'qiladi — qoidalarni takrorlash shart emas.

````text
Vazifa: <nima kerak>
Kutilgan natija: <foydalanuvchi nimani ko'radi>
Tegishli fayllar: <bilsangiz - src/lib/telegram/admin-session.ts kabi>
Eslatma: <agar bor bo'lsa - masalan "kanal postiga tegilmasin">
Tugagach: tsc + eslint + test + build, commit va push, menga qisqa
hisobot ber (nima o'zgardi, men nima qilishim kerak).
````

Fayl nomini aytish — eng katta tejamkorlik: model qidirib yurmaydi.

---

## 3. Boshqa loyihani tahlil qilish (universal)

Bu promptni **istalgan boshqa loyihada** birinchi xabar sifatida
yuboring. U loyihani shu loyihadagidek tartibga soladi.

````text
Sen tajribali Senior Software Architect'san. Bu loyiha sen uchun
NOTANISH. Vazifang — uni tushunib, keyingi ishlar arzon va xavfsiz
bo'lishi uchun poydevor tayyorlash.

MUHIM: bu bosqichda mahsulot kodini o'zgartirma (faqat quyida
aytilgan hujjatlarni yoz). Taxmin qilma — kodni o'qi.

Tartib:

1. TANISHUV (avval faqat o'qish):
   - `package.json` / `pyproject.toml` / `go.mod` va build/CI
     fayllari: stack, skriptlar, qanday ishga tushadi, qanday
     tekshiriladi (test/lint/build buyruqlari aynan qaysilari).
   - Papka tuzilishi va eng katta 10 ta fayl (`wc -l`) — mantiq
     qayerda to'planganini ko'rsatadi.
   - README va mavjud hujjatlar: qaysi biri eskirgan.
   - Muhit: env o'zgaruvchilari, sirlar qayerdan olinadi, deploy
     qanday bo'ladi.

2. TAHLIL (menga qisqa hisobot):
   - Loyiha nima qiladi (3-5 gap).
   - Arxitektura: qatlamlar, ma'lumot oqimi, tashqi xizmatlar.
   - XAVFLI joylar: maxfiy ma'lumot (narx, shaxsiy ma'lumot, token)
     qayerda ochiq qolishi mumkin; qaytarib bo'lmaydigan amallar
     (o'chirish, migratsiya, tashqi API ga yuborish).
   - Sifat: testlar bormi va nimani qoplaydi; takrorlangan kod;
     o'lik fayllar va ishlatilmagan paketlar; TODO/FIXME.
   - Har bir topilma uchun: FAKT (fayl:qator) → nega muhim →
     mehnat hajmi (kichik/o'rta/katta).

3. `CLAUDE.md` YOZ (yoki mavjudini qayta yoz):
   - FAQAT qoidalar va xarita bo'lsin, 15-20 KB dan oshmasin — u
     har sessiyada o'qiladi va kattaligi har safar token yeydi.
   - Ichida bo'lsin: ish tartibi (branch, commit, tekshiruv
     buyruqlari), buzilmas qoidalar ("... QILINMAYDI" shaklida),
     qayerda nima turishi (xarita), hujjatlar ro'yxati.
   - "Nega shunday" degan uzun tarixlar `docs/ARXITEKTURA-TARIXI.md`
     ga chiqsin (yo'q bo'lsa yarat) — model uni faqat kerak bo'lganda
     o'qiydi.
   - Har bir qoida QISQA: qoida + bir qator sabab.

4. Tekshir: yozgan hujjatingdagi har bir fayl yo'li va buyruq
   haqiqatan mavjudligini tasdiqla (buyruqlarni ishga tushirib
   ko'r). Xayoliy yo'l yozma.

5. Oxirida menga ber:
   - 5 tadan oshmaydigan "birinchi navbatda tuzatiladigan" ro'yxat
     (ta'sir/mehnat nisbati bo'yicha tartiblangan);
   - keyingi ishlar uchun 3-5 ta tayyor topshiriq matni (har biri
     yangi sessiyada yuboriladigan, 20 qatordan qisqa).

Til: menga javob va hujjatlar — <o'zbekcha / ingliz tilida> yozilsin.
````

---

## Token tejashning qisqa qoidalari

1. **Ishlatilmaydigan MCP ulanishlarini o'chiring.** Har bir
   ulangan xizmatning HAMMA vositasi har so'rovda modelga
   yuboriladi — foydalanmasangiz ham.
2. **Bir sessiya = bir ish.** Tugagach yangi sessiya (`/clear`).
3. **Fayl nomini ayting** — model qidirib yurmaydi.
4. **Uzun log tashlamang** — xatoning o'sha qatorini tashlang.
5. **Oddiy ishga kichik model** (`/model` bilan almashtiriladi),
   murakkab ish va arxitekturaga kuchli model.
6. **`CLAUDE.md` ni kichik tuting** — u har sessiyada o'qiladi.
7. Katta hisobot/hujjatni qayta yozishni kamdan-kam so'rang — ular
   eng "og'ir" javoblar.

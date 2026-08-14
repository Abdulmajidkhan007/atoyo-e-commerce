# Mahsulot kiritishning uch yo'li

| Yo'l | Qachon qulay | Rasm |
|---|---|---|
| **Telegram "Kirim" topic'i** | Do'konda turib, telefondan tez qo'shish | ✅ 1–10 ta rasm + video, postning o'zidan |
| **Excel / CSV import** | Bir vaqtda o'nlab-yuzlab mahsulot | ⚠️ faqat havola orqali |
| **Admin panel** (`/admin/katalog/yangi`) | Bitta mahsulotni to'liq to'ldirish | ✅ yuklab qo'yiladi |

---

## 1. Telegram "Kirim" topic'i

Xodimlar guruhidagi **Kirim** topic'iga (thread ID **151**, admin panelda
o'zgartiriladi) rasm(lar) tashlanadi va rasm **izohiga** ma'lumot yoziladi.

### Majburiy 7 ta narsa

1. kamida **1 ta rasm** (10 tagacha — albom qilib tashlang; **video** ham
   qo'shsa bo'ladi, u ham albomga tushadi)
2. **nomi**
3. **kategoriyasi**
4. **narxi**
5. **soni**
6. **sotish turi** (dona / metr / kg / litr ...)
7. **kimdan kelgani**

**Material MAJBURIY EMAS** — bilinsa yozing (`Material: po'lat`),
bilinmasa bo'sh qoldiring. Narxnomalardan kelgan mahsulotlarning
ko'pchiligida u ko'rsatilmaydi, talab qilinsa kirim to'xtab qolardi.

### Izoh namunasi

```
PPR quvur 25mm
Kategoriya: quvurlar
Narxi: 45000
Soni: 120
Sotish turi: metr
Kimdan: Akmal aka
Material: polipropilen
```

Birinchi qator — mahsulot nomi (xohlasangiz `Nomi:` deb ham yozsa bo'ladi).
Kalit so'zlar erkin yoziladi, katta-kichik harf farq qilmaydi:

| Maydon | Qabul qilinadigan kalitlar |
|---|---|
| Nomi | `nom`, `nomi`, `mahsulot`, `name`, `название` |
| Narxi | `narx`, `narxi`, `summa`, `price`, `цена` |
| Soni | `son`, `soni`, `dona`, `miqdor`, `zaxira`, `qoldiq`, `количество` |
| Kimdan | `kimdan`, `kimdan kelgan`, `ta'minotchi`, `yetkazib beruvchi`, `поставщик` |
| Materiali | `material`, `materiali`, `xomashyo`, `материал` |
| Kategoriyasi | `kategoriya`, `turkum`, `bo'lim`, `category`, `категория` |
| Sotish turi | `sotish turi`, `o'lchov`, `birlik`, `unit`, `turi` |
| Kodi (artikul) | `kod`, `kodi`, `artikul`, `sku`, `code` — ixtiyoriy, kod bo'yicha qidirish ishlaydi |

Material nomlari: `polipropilen (ppr)`, `metalloplastik`, `po'lat`, `mis`,
`latun`, `cho'yan`, `pvx`. Ruscha/inglizcha yozilsa ham tanidi.
Kategoriya va sotish turi ham nomi bilan yoziladi (`Kategoriya: kranlar`,
`Sotish turi: metr`) — **admin panelda o'zingiz qo'shgan turlar** ham
shu yerda ishlaydi.

Majburiy maydon yozilmasa bot mahsulotni yaratmaydi va javobida
mavjud kategoriyalar/sotish turlari ro'yxatini ham yozib beradi.

### Turlari bor mahsulotni Telegramdan kirim qilish

Bitta qator (faqat o'lcham):

```
Basu moyka
Kategoriya: santexnika
Sotish turi: dona
Kimdan: Akmal aka
Tur nomi: O'lcham
Turlar:
50x60 - 850000 - 4 - BS-5060
60x80 - 990000 - 2
```

Har bir tur qatori: **`qiymat - narx - soni - kod`** (kod ixtiyoriy).

**O'lcham + rang + qalinlik** kabi bir nechta qator bo'lsa — `Tur nomi:`
da qatorlar `|` bilan sanaladi va har bir tur qatorida qiymatlar
**shu tartibda** `|` bilan yoziladi:

```
Basu moyka
Kategoriya: santexnika
Sotish turi: dona
Kimdan: Akmal aka
Tur nomi: O'lcham|Rangi|Qalinlik
Turlar:
50x60|Oq|0.8mm - 96000 - 3 - BS7677
50x60|Qora|0.8mm - 96000 - 2 - BS7678
60x80|Oq|1.0mm - 128000 - 4 - BS7690
```

Muhim qoidalar:

- **3 tagacha qator** bo'ladi (sayt formasi ham shunday). To'rttasi
  yozilsa bot qabul qilmaydi va sababini aytadi — ikkitasini
  birlashtiring (`Rangi: Oq matt`).
- Har bir tur qatoridagi qiymatlar soni `Tur nomi:` dagi qatorlar
  soniga **teng** bo'lishi shart; mos kelmagan qator tashlab
  yuboriladi va bot ogohlantiradi.
- Chiziqchaning **atrofida bo'shliq** qoldiring — shunda kod
  ichidagi chiziqcha (`BS-5060`) buzilmaydi.
- Turlar yozilsa umumiy `Narxi:` va `Soni:` **kerak emas**: narx eng
  arzon turdan, zaxira esa turlar yig'indisidan olinadi.
- Hamma kombinatsiyani yozish shart emas — faqat **haqiqatda bor**
  turlarini yozing.

Ixtiyoriy qatorlar ham darhol yozilsa bo'ladi: `Brend:`, `Davlat:`,
`Kategoriya:`, `Tavsif:`, `Chegirma:`, `Chegirma muddati: 31.12.2026`,
`Diametr:`, `Uzunlik:`, `Og'irlik:`.

### Keyin nima bo'ladi

1. Mahsulot **chernovik** bo'lib saqlanadi: saytda ham, kanalda ham hali
   ko'rinmaydi. **"✅ Yetarli, tayyor"** bosilgandagina katalogga chiqadi
   va kanalga e'lon qilinadi (albomdagi hamma rasm bilan birga).
2. Bot javob beradi: chernovik tayyorligi, ID si va **"Qolgan ma'lumotlarni ham
   to'ldirasizmi?"** degan savol — ostida tugmalar:
   🏷 Kategoriya · ™️ Brend · 🌍 Davlat · 📝 Tavsif · 🔻 Chegirma ·
   ⏳ Chegirma muddati · 🖼 Yana rasm · ✏️ Nomni tuzatish · ✅ Yetarli.
   Bularning hammasi ixtiyoriy — to'ldirmasangiz ham bo'ladi.
   **"✅ Yetarli, tayyor"** bosilganda mahsulot nashr qilinadi: katalogga
   chiqadi va kanalga **"🆕 Yangi mahsulot!"** bo'lib e'lon qilinadi.
   Keyingi tahrirlarda yangi post tashlanmaydi — o'sha postning matni
   tahrirlanadi (faqat yangi rasm qo'shilsa post qaytadan tashlanadi,
   chunki yuborilgan albomga rasm qo'shib bo'lmaydi).
3. **Video** yuborilsa u mahsulot sahifasida ham, kanal albomida ham
   ko'rinadi (20 MB gacha, 3 tagacha).
4. Kirim **tarixga** yoziladi: `/admin/katalog/kirim` sahifasining pastida
   so'nggi kirimlar, to'liq ro'yxat esa `/admin/katalog/kirim/tarix` da —
   har birida **qayerdan** (✈️ Telegram yoki 🖥 admin panel), **kim**,
   **qachon**, nechta va kimdan kelgani ko'rinadi.

Majburiy maydon yetishmasa mahsulot **yaratilmaydi**: bot nima
yetishmayotganini va namunani yozib beradi, rasmni izohi bilan qayta
tashlaysiz.

### Kanalga qachon "yangilandi" deb yoziladi

- **🆕 Yangi mahsulot!** — mahsulot birinchi marta e'lon qilinganda.
- **♻️ Mahsulot yangilandi** — faqat uchta holatda: **narx o'zgardi**,
  **chegirma** berildi (yoki olib tashlandi), yoki **tugab qolgan
  mahsulot qayta keldi** (zaxira 0 dan ko'paydi).
- Qolgan tahrirlar (tavsif, brend, kategoriya, rasm...) postni **jimgina**
  yangilaydi — sarlavha o'zgarmaydi, obunachilarga takror xabar bo'lmaydi.

---

## 1a. Saytdan "Yangi mahsulot ochish"

`/admin/katalog/kirim` sahifasining tepasida **«Yangi mahsulot ochish»**
tugmasi doim turadi. U mahsulotni faqat **ta'riflaydi**: rasm/video,
nomi, narxi, kategoriyasi, materiali, sotish turi, brendi, ishlab
chiqaruvchi davlati. Zaxira so'ralmaydi.

Ochilgan mahsulot **chernovik** bo'ladi:

- saytda va kanalda **ko'rinmaydi**;
- kirim sahifasining qidiruvida **«chernovik»** belgisi bilan chiqadi
  (ochilgandan keyin darhol kirim ro'yxatiga tushib turadi);
- kelgan soni kiritilib **kirim saqlanganda** katalogga chiqadi va
  kanalga "🆕 Yangi mahsulot!" bo'lib e'lon qilinadi.

Ya'ni mahsulot avval "ochiladi", keyin unga tovar keladi — huddi
Telegramdagi chernovik → "✅ Yetarli, tayyor" tartibi kabi.

---

## 2. Excel (.xlsx) yoki CSV bilan bittada yuklash

**Admin panel → Katalog → «CSV yoki Excel yuklash»**. Yonida namuna
fayllar turadi:

- [`/namuna/atoyo-mahsulotlar.xlsx`](../public/namuna/atoyo-mahsulotlar.xlsx)
- [`/namuna/atoyo-mahsulotlar.csv`](../public/namuna/atoyo-mahsulotlar.csv)

Excel faylning **birinchi varag'i** o'qiladi, **birinchi qator —
sarlavha** (ustun nomlari). Ikkinchi varaqda ustunlar izohi bor.

### Ustunlar

| Ustun | Majburiy | Izoh |
|---|---|---|
| `sku` | ❌ | Do'kon kodi / artikul (`HS897`). Kod bo'yicha qidirishda ishlaydi |
| `id` | ❌ | Bo'sh — yangi mahsulot. To'ldirilgan — o'sha ID li mahsulot **yangilanadi** (ID larni CSV eksportidan oling). |
| `name` | ✅ | Nomi |
| `description` | ❌ | Tavsif |
| `category` | ✅ | Standart: `pipes`, `fittings`, `faucets`, `shower-systems`, `boilers`, `radiators`, `pumps`, `sanitary-ware` (+ o'zingiz qo'shganlari) |
| `material` | ✅ | Standart: `polypropylene`, `metal-plastic`, `steel`, `copper`, `brass`, `cast-iron`, `pvc` (+ o'zingiz qo'shganlari) |
| `unit` | ❌ | Sotish turi: `dona`, `metr`, `kg`, `litr`, `m2`, `quti`, `rulon`, `komplekt` (+ o'zingiz qo'shganlari). Bo'sh — `dona` |
| `brand` | ❌ | Brend |
| `manufacturerCountry` | ❌ | Ishlab chiqarilgan davlat |
| `supplier` | ❌ | Kimdan kelgan (bulk narx yangilashda ishlatiladi) |
| `price` | ✅ | Faqat son: `45000` |
| `discountPrice` | ❌ | Chegirma narxi |
| `stock` | ❌ | Zaxira soni (bo'sh — 0) |
| `diameterMm`, `lengthMm`, `weightKg` | ❌ | O'lchamlar |
| `images` | ❌ | Rasm **havolalari**, bir nechtasi ` \| ` bilan ajratiladi |
| `draft` | ❌ | `1` — **chernovik**: faqat nom yetarli, katalogga chiqmaydi, kirimda turadi |
| `isActive` | ❌ | `1` — saytda ko'rinadi, `0` — yashirin |

### Faqat NOMLARNI bittada yaratish (10 000 tagacha)

Narx, kategoriya va materialni keyin to'ldirmoqchi bo'lsangiz —
`draft` ustuniga `1` yozing va faqat `name` ni to'ldiring:

```csv
name,draft
Moyka Basu 50x60,1
Hammom pardasi 180x200,1
PPR quvur 32mm,1
```

Bunday qatorlar **chernovik** mahsulot ochadi:

- saytda ko'rinmaydi, kanalga e'lon qilinmaydi;
- `/admin/katalog/kirim` qidiruvida «chernovik» belgisi bilan chiqadi;
- kelgan soni kiritilib kirim saqlanganda katalogga chiqadi.

Narx/kategoriya/material chernovik qatorlarda **bo'sh qolishi mumkin** —
ularni keyin admin panelda yoki qayta import bilan (`id` ustunini
to'ldirib) to'ldirasiz. Oddiy (chernovik bo'lmagan) qatorlarda esa
`name`, `category`, `material`, `price` majburiyligicha qoladi.

### Excel'da rasm bo'ladimi?

**Faylning ichiga qo'yilgan rasm o'qilmaydi.** Ikki yo'l bor:

1. `images` ustuniga rasm **havolasini** yozasiz (`https://...`) — o'sha
   rasm mahsulotga ilinadi;
2. yoki avval Excel bilan matnli ma'lumotni yuklaysiz, keyin rasmni
   Telegram "Kirim" topic'idan yoki admin paneldan qo'shasiz.

Xato qator butun importni to'xtatmaydi — hisobotda nechta qator
o'tkazib yuborilgani va sababi ko'rsatiladi. Bir martada 5000 qatorgacha.

---

## 3. Yangi kategoriya / material / sotish turi qo'shish

**Admin panel → Turlar** (`/admin/katalog/turlar`). Uch ro'yxat bor:
kategoriyalar, materiallar va sotish turlari. Nomni yozib "Qo'shish"
bosasiz — yangi tur **darhol hamma joyda** ishlaydi: mahsulot formasi,
saytdagi filtr, Telegram "Kirim" izohi va bot menyusi.

- Standart turlar (kulrang) o'chirilmaydi.
- O'zingiz qo'shgan turni o'chirish mumkin, lekin u biror mahsulotda
  ishlatilayotgan bo'lsa server ruxsat bermaydi — avval o'sha
  mahsulotlarni boshqa turga o'tkazing.

**Sotish turi** narx va zaxira nimada o'lchanishini bildiradi: masalan
`45 000 so'm / metr`, `Mavjud: 120 metr`. U saytda, botda, kanal
e'lonida va admin panelda shu ko'rinishda chiqadi.

---

## 4. Sozlamalar va "jumboq" himoyasi

**Admin panel → Sozlamalar**:

- **Forum topic Thread ID lari** — jumladan `#Kirim` (hozir 151). `0`
  qo'yilsa kirim oqimi o'chadi.
- **E'lon kanali** va **majburiy obuna kanallari**.
- **Kanal posti footeri** — pastda alohida bo'lim.

Bot sozlamalari formasida **saqlashdan oldin jumboq** chiqadi (masalan
`37 + 48 = ?`). Savolni server beradi, javob ham **serverda** tekshiriladi
va bir marta ishlaydi — ya'ni bu oynani chetlab o'tib to'g'ridan-to'g'ri
API'ga so'rov yuborib bo'lmaydi. Maqsad: panelga kirgan (yoki ochiq
qolgan kompyuterda o'tirgan) kishi bir bosishda botni ishdan chiqarib
qo'ymasin.

---

## 5. Kanal posti footeri

**Admin panel → Sozlamalar → «Kanal posti footeri»**. Kanalga chiqadigan
har bir mahsulot e'loni shu tartibda tuziladi:

```
🆕 Yangi mahsulot!

PPR quvur 25mm
#️⃣ Kod: HS897
🏷 Tebo • Turkiya
💰 45 000 so'm / metr
📦 Mavjud: 120 metr
🧱 Polipropilen

<tavsif>

📞 +998 90 123 45 67
📞 +998 91 234 56 78

Sifat narxdan ustun

📍 Toshkent, Chilonzor 12

Telegram | Instagram | YouTube | Operator | Sayt
```

Footerdagi hamma narsa admin paneldan yoziladi:

- **Telefon raqamlar** (5 tagacha) — har biri alohida qatorda;
- **Shior** — yonida tayyor variantlardan tanlash tugmalari bor;
- **Manzil** (ixtiyoriy);
- **Havolalar** (8 tagacha) — har birining *nomi* va *havolasi*: Telegram
  kanal, Instagram, YouTube, operator (`https://t.me/...`), sayt. Ular
  postning eng oxirida bitta qatorda chiqadi.

Bo'sh qoldirilgan qism postda umuman ko'rinmaydi. Footer blog
e'lonlariga ham qo'shiladi.

---

## 6. Mahsulot raqami (№)

Firestore hujjat ID si tasodifiy harflardan iborat (`Xk3mQ2vL...`) — uni
telefonda o'qish ham, botga yozish ham qiyin. Shuning uchun har bir
mahsulotga qo'shimcha **tartib raqami** beriladi: 1, 2, 3, ...

- Guruhga keladigan xabarlarda: `📦 Yangi mahsulot: №12 — PPR quvur 25mm`.
- Bot buyruqlarida shu raqam yoziladi: `/narx 12 50000`, `/zaxira 12 25`,
  `/tahrir 12`, `/uchir 12`. Eski uzun ID ham ishlayveradi.
- Admin panelda katalog jadvalining birinchi ustuni — **№**.
- `sku` (do'kon kodi / artikul) bu bilan aralashmaydi: u sizning ichki
  kodingiz, № esa saytning tartib raqami.

**Raqamlarni qayta tartiblash:** mahsulot o'chirilsa uning raqami bo'sh
qoladi (masalan 16 o'chsa 15 dan keyin 17 keladi) — bu normal, chunki
raqam mahsulotning doimiy nishoni. Bo'shliqlar bezovta qilsa Katalog
sahifasidagi **«Raqamlarni qayta tartiblash»** tugmasi hammasini
qaytadan 1, 2, 3... qilib beradi. Diqqat: bunda mavjud mahsulotlarning
raqami o'zgaradi, ya'ni guruhda avval yozilgan "№12" endi boshqa
mahsulotni ko'rsatishi mumkin.

**Eski mahsulotlarga raqam berish:** admin panel → Katalog → «Raqam va
qidiruv indeksini yangilash». Eng eski mahsulotdan boshlab 1, 2, 3...
beriladi, keyingi yangi mahsulotlar shu yerdan davom etadi. Tugma qayta
bosilsa faqat raqami yo'qlariga beriladi (mavjud raqamlar o'zgarmaydi).

> Hujjat ID sining o'zi o'zgartirilmaydi — unga buyurtmalar, kirim
> tarixi va rasm papkalari bog'langan. Raqam uning yonida turadi va
> hamma ko'rinadigan joyda ID o'rniga ishlatiladi.

---

## 7. Turlar (o'lcham, rang, qalinlik) — bitta mahsulot, ko'p ko'rinish

Bir xil mahsulotning o'lchami yoki qalinligi har xil bo'lsa (moyka
50x60 / 60x80, qalinligi 0.2mm / 0.3mm; hammom pardasi turli
o'lchamlarda) — **20 ta alohida mahsulot ochish shart emas**. Bitta
mahsulot ochiladi, rasm bitta bo'ladi, ichida esa turlari turadi.

**Admin panel → mahsulot formasi → «Turlari bormi?»**:

1. Tanlov qatorini yozasiz: nomi (`O'lcham`) va qiymatlari
   (`50x60, 60x80, 80x100`) — vergul bilan.
2. Kerak bo'lsa ikkinchi qator (`Qalinlik: 0.2mm, 0.3mm`), uchinchisi
   (`Rang: qora, kulrang`). 3 tagacha qator.
3. Pastda hamma kombinatsiya jadval bo'lib chiqadi — har biriga **narx**
   va **zaxira** yoziladi.

Natijada:

- **Saytda** mahsulot sahifasida tugmalar chiqadi (pitsa ilovalaridagi
  kabi): o'lchamni bosasiz — narx va "mavjud" soni darhol o'zgaradi.
  Savatga aynan tanlangan tur tushadi.
- **Katalogda** narx "eng arzonidan" ko'rinishida chiqadi
  (`300 000 so'm dan`), tugma esa "Turini tanlash" bo'ladi.
- **Kanal postida** turlar ro'yxati va "… dan" narx ko'rsatiladi.
- **Botda** turli mahsulotni to'g'ridan-to'g'ri savatga qo'shib
  bo'lmaydi — "Turini tanlash (saytda)" tugmasi chiqadi.
- **Kirimda** (sayt: `/admin/katalog/kirim`) qaysi turga tovar kelgani
  tanlanadi — o'sha turning zaxirasi ko'payadi. **Telegramdagi
  `/zaxira` buyrug'i turlarni bilmaydi** — u faqat umumiy sonni
  yozadi, shuning uchun turlari bor mahsulotga zaxira SAYTDAN
  qo'shiladi.
- **Mavjud bo'lmagan kombinatsiya** (masalan 80x100 o'lcham 0.2mm
  qalinlikda ishlab chiqarilmaydi) formadagi 🗑 tugmasi bilan
  jadvaldan olib tashlanadi va qayta yasalmaydi.
- **Buyurtmada** narx va zaxira serverda aynan o'sha tur bo'yicha
  tekshiriladi (mijoz yuborgan narxga ishonilmaydi).

Mahsulotning umumiy `narx`i eng arzon turdan, `zaxira`si esa hamma
turlarning yig'indisidan olinadi — katalogdagi filtr va saralash shu
maydonlar bilan ishlaydi.

---

## 8. Bir kishidan ko'p tovar: ro'yxat bilan kirim

`/admin/katalog/kirim` sahifasida:

- **«Kimdan kelgan (butun kirim uchun)»** — bir marta yoziladi, hamma
  qatorga tushadi.
- **«Ro'yxat bilan qo'shish»** tugmasi — har bir qator bitta mahsulot:

```
PPR quvur 25mm | 120 | 45000
12 | 30
Boou dush 8276 | 5
```

  Ya'ni `nomi yoki № | soni | narxi`. Narx ixtiyoriy (yozilmasa eski
  narx qoladi). Excel/Google Sheets dan ustunlarni ko'chirib qo'ysangiz
  ham bo'ladi — bitta kirimda 1000 tagacha qator.

  Mahsulot **nomi bo'yicha ham, raqami (№) bo'yicha ham** topiladi.
  Topilmagan qatorlar hisobotda ko'rsatiladi — ularni «Yangi mahsulot
  ochish» bilan ochib, keyin qayta qo'shasiz.

Ro'yxat qo'shilgandan keyin ham har bir qatorni tahrirlash mumkin
(soni, narxi, turi, kimdan kelgani) — "Kirimni saqlash" bosilgunicha
hammasi chernovik holatida turadi.

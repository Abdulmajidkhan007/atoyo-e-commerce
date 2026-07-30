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

### Majburiy 8 ta narsa

1. kamida **1 ta rasm** (10 tagacha — albom qilib tashlang; **video** ham
   qo'shsa bo'ladi, u ham albomga tushadi)
2. **nomi**
3. **kategoriyasi**
4. **narxi**
5. **soni**
6. **sotish turi** (dona / metr / kg / litr ...)
7. **kimdan kelgani**
8. **materiali**

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

Ixtiyoriy qatorlar ham darhol yozilsa bo'ladi: `Brend:`, `Davlat:`,
`Kategoriya:`, `Tavsif:`, `Chegirma:`, `Chegirma muddati: 31.12.2026`,
`Diametr:`, `Uzunlik:`, `Og'irlik:`.

### Keyin nima bo'ladi

1. Mahsulot **darhol katalogga tushadi**. Kanalga e'lon esa albomdagi
   **hamma rasm kelib bo'lgach** chiqadi (Telegram albom rasmlarini
   alohida-alohida yuboradi — bot ~2.5 soniya kutib, keyin bittagina
   albom-post tashlaydi).
2. Bot javob beradi: qo'shilgani, ID si va **"Qolgan ma'lumotlarni ham
   to'ldirasizmi?"** degan savol — ostida tugmalar:
   🏷 Kategoriya · ™️ Brend · 🌍 Davlat · 📝 Tavsif · 🔻 Chegirma ·
   ⏳ Chegirma muddati · 🖼 Yana rasm · ✏️ Nomni tuzatish · ✅ Yetarli.
   Bularning hammasi ixtiyoriy — bosmasangiz ham mahsulot ishlayveradi.
   Har bir to'ldirishdan keyin **kanaldagi e'lon ham yangilanadi**: yangi
   post tashlanmaydi, avvalgi postning matni tahrirlanadi. Faqat yangi
   rasm qo'shilsa post qaytadan tashlanadi (yuborilgan albomga rasm
   qo'shib bo'lmaydi). "✅ Yetarli, tayyor" tugmasi ham e'lonni oxirgi
   holat bilan tekshirib chiqadi.
3. **Video** yuborilsa u mahsulot sahifasida ham, kanal albomida ham
   ko'rinadi (20 MB gacha, 3 tagacha).
4. Kirim **tarixga** yoziladi: `/admin/katalog/kirim` sahifasining pastida
   so'nggi kirimlar, to'liq ro'yxat esa `/admin/katalog/kirim/tarix` da —
   har birida **qayerdan** (✈️ Telegram yoki 🖥 admin panel), **kim**,
   **qachon**, nechta va kimdan kelgani ko'rinadi.

Majburiy maydon yetishmasa mahsulot **yaratilmaydi**: bot nima
yetishmayotganini va namunani yozib beradi, rasmni izohi bilan qayta
tashlaysiz.

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
| `isActive` | ❌ | `1` — saytda ko'rinadi, `0` — yashirin |

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
- **Maxfiy kalitlar** (faqat loyiha egasi ko'radi): bot tokeni, xodimlar
  guruhi ID si, webhook siri. Bu yerdagi qiymat Netlify'dagi
  o'zgaruvchidan **ustun turadi** — kalitni almashtirish uchun qayta
  deploy qilish shart emas. Qiymatlar hech qachon to'liq ko'rsatilmaydi
  (`1234…WXYZ`), `-` yozilsa panel qiymati o'chadi va yana Netlify'niki
  ishlaydi. "Webhook'ni qayta o'rnatish" tugmasi yangi sir bilan
  Telegram'dagi webhook'ni yangilaydi.

Har ikkala formada ham **saqlashdan oldin jumboq** chiqadi (masalan
`37 + 48 = ?`). Savolni server beradi, javob ham **serverda** tekshiriladi
va bir marta ishlaydi — ya'ni bu oynani chetlab o'tib to'g'ridan-to'g'ri
API'ga so'rov yuborib bo'lmaydi. Maqsad: panelga kirgan (yoki ochiq
qolgan kompyuterda o'tirgan) kishi bir bosishda botni ishdan chiqarib
qo'ymasin.

# Bot stikerlari

Bot muhim daqiqalarda stiker yuboradi: salomlashuv, buyurtma qabul
qilinishi, holat o'zgarishi, yordamchi javob tayyorlayotgan payt.
Stiker biriktirilmagan bo'lsa bot avvalgidek faqat matn yuboradi —
hech narsa buzilmaydi.

Boshqaruv ikki joyda: **Admin → Stikerlar** (`/admin/stikerlar`) va
xodimlar guruhida `/stiker` buyrug'i.

---

## 1. Slotlar (qaysi daqiqada qaysi stiker)

| Slot | Qachon yuboriladi |
|---|---|
| `start` | Mijoz botda `/start` bosganda |
| `loading` | Yordamchi javob tayyorlayotganda — **javob kelgach o'chiriladi** |
| `order_created` | Mijoz buyurtmani rasmiylashtirganda |
| `order_accepted` | Holat "qabul qilindi" (`approved`) ga o'tganda |
| `order_delivering` | Holat "yetkazishda" (`delivering`) ga o'tganda |
| `order_completed` | Buyurtma yakunlanganda |
| `order_cancelled` | Buyurtma bekor qilinganda |
| `cart_added` | Savatga qo'shilganda |
| `empty` | Qidiruvda hech narsa topilmaganda |
| `thanks` | Suhbat oxirida |
| `error` | Kutilmagan xato yuz berganda |

Sozlama `settings/stikerlar` emas, **`settings/stickers`** hujjatida
(`file_id` lar), 60 soniya keshlanadi.

## 2. Telefondan biriktirish (eng tez yo'l)

Xodimlar guruhida:

1. Stikerni guruhga tashlang → bot uning kodini (`file_id`) aytadi va
   **to'plamni eslab qoladi** (keyin saytda ham ko'rinadi);
2. O'sha stikerga **reply** qilib yozing:
   ```
   /stiker start
   ```
3. Tayyor. Ro'yxatni ko'rish: `/stiker`. Olib tashlash:
   `/stiker olib start`.

`/stiker egasi` — o'zingizni to'plam egasi qilib belgilaysiz
(saytda yangi stiker yasash uchun shu kerak, pastga qarang).

## 3. Saytdan boshqarish

**Admin → Stikerlar**:

- yuqorida **slotlar** ro'yxati (bosib tanlanadi);
- pastida **to'plamlar** — har bir stikerni bosish uni tanlangan
  slotga biriktiradi;
- to'plam qo'shish: nomini yoki `t.me/addstickers/...` havolasini
  yozib "Qo'shish".

Stiker rasmlari Telegram'dan **server orqali** ko'rsatiladi
(`/api/admin/stickers/file`) — fayl manzilida bot tokeni bo'lgani
uchun uni brauzerga to'g'ridan-to'g'ri berib bo'lmaydi.

## 4. AI STUDIYASI (sun'iy intellekt yasaydi)

**Admin → Stikerlar → "AI bilan stiker yasash"** (faqat
`GEMINI_API_KEY` sozlangan bo'lsa ko'rinadi).

To'rt xil manba:

| Rejim | Nima qiladi |
|---|---|
| **Do'kon uslubida** | Ko'k/oltin brend palitrasida santexnika mavzusidagi belgi |
| **Matndan** | "Kulayotgan santexnik bosh barmoq ko'tarib turibdi" — erkin tasvir |
| **Mahsulot suratidan** | Suratni yuklaysiz → u stiker illyustratsiyasiga aylanadi |
| **Mavjud stiker uslubida** | To'plamdan namuna tanlaysiz → AI o'sha uslubda yangisini chizadi |

Keyin sayt rasmni **haqiqiy stikerga** aylantiradi (`lib/stickers/image.ts`,
`sharp` bilan):

1. 512×512 ga keltiradi;
2. **fonini olib tashlaydi** — chekkadan "to'kib chiqish" (flood fill)
   usuli bilan, shuning uchun mahsulot ichidagi oq joylar saqlanadi;
3. atrofiga **oq chegara** chizadi (alfa kanalni yoyib, oq siluet
   yasaydi va ostiga qo'yadi) — stiker har qanday chat foniga
   tushganda ajralib turadi;
4. WEBP ga siqadi (512KB chegarasiga sig'guncha sifat pasayadi).

Natija **darhol to'plamga tushmaydi** — avval ko'rasiz, keyin:

- **"To'plamga qo'shish"** — rasmning o'zi stiker bo'ladi;
- **"Shablon ichiga qo'yish"** — eng chiroylisi: AI rasmi do'kon
  ramkasiga (oq halqa + yozuv + ATOYO linzasi) tushadi.

> Model **yozuv chizmaydi** — bu ataylab: rasm modellari harflarni,
> ayniqsa o'zbekchani, xato yozadi. Yozuv har doim shablon orqali
> aniq qo'yiladi.

## 4a. Yangi stiker yasash

Sayt stikerni do'konning HAQIQIY uslubida chizadi (`next/og`,
tashqi xizmatsiz):

- oq halqa ichida to'q ko'k doira (gradient bilan);
- yuqorida **oltin chiziqli ikonka** — 15 ta tayyor: yulduz, sovg'a,
  savol, tasdiq, quti, telefon, yetkazish, mashina, masjid, yurak,
  soat, kalit, tomchi, chegirma, e'lon (`lib/stickers/art.ts`,
  vektor SVG);
- o'rtada oq qalin yozuv, ostida kichik oltin izoh;
- pastda oq linza va **ATOYO logotipi** (Λ harfi + ikkita oltin
  to'lqin) — u ham koddan chiziladi, rasm fayli kerak emas.

Natija 512×512 shaffof stiker.

**Muhim cheklov:** Bot faqat **o'zi yaratgan** to'plamga stiker
qo'sha oladi. @Stickers bot orqali yasalgan eski to'plam
(masalan "Atoyo stickers") Bot API orqali tahrirlanmaydi — uni
faqat **o'qish** mumkin. Shuning uchun sayt yangi to'plam ochadi:
`atoyo_by_<bot_username>`.

Tartib:
1. Xodimlar guruhida `/stiker egasi` (yoki saytda Telegram ID ni
   kiritib "Saqlash") — Telegram to'plam egasini so'raydi;
2. Admin → Stikerlar → yozuvni kiriting → **"To'plamga qo'shish"**;
3. Birinchi stikerda to'plam avtomatik yaratiladi va havola
   ko'rsatiladi: `t.me/addstickers/atoyo_by_<bot>`.

### To'plam qachon paydo bo'ladi

**Bot to'plami OLDINDAN mavjud emas.** `t.me/addstickers/atoyo_by_<bot>`
havolasi birinchi stiker qo'shilgunicha **"Stickers not found"** deydi —
bu xato emas, to'plam hali yaratilmagan. U birinchi
"To'plamga qo'shish" bosilganda Telegram tomonida yaratiladi.

Agar qo'shish paytida xato chiqsa, eng ko'p uchraydigan sabab:
**to'plam egasi bot bilan hech qachon suhbat boshlamagan.** Botni
shaxsiy chatda oching, `/start` bosing va qaytadan urinib ko'ring
(sayt bu xatoni shu matn bilan tushuntiradi).

### Mijozlarga tarqatish

To'plam tayyor bo'lgach havola ikki joyda o'zi paydo bo'ladi:

- **Botda** — Kontakt ekranida "🎨 Stikerlarimiz" tugmasi va
  `/stikerlar` buyrug'i (uch tilda);
- **Saytda** — `/kontakt` sahifasining pastida "Telegram
  stikerlarimiz" bo'limi.

Ikkalasi ham `/api/stickers` dan o'qiydi va to'plam **haqiqatan
mavjud bo'lsagina** ko'rinadi — ishlamaydigan havola berilmaydi.

Eng kuchli tarqalish yo'li esa botning o'zi: mijoz `/start` bosganda
yoki buyurtma holati o'zgarganda stiker keladi, mijoz uni bosib
to'plamni qo'shib oladi.

### Animatsiyali stiker

Telegram animatsiya uchun ikki format qabul qiladi:

| Format | Talab | Kim yasaydi |
|---|---|---|
| `.tgs` | Lottie animatsiyasi, **64KB gacha**, 512×512, 3 soniyagacha, 30/60 fps, matn qatlami/rasm/effekt BO'LMAYDI | **Saytning o'zi** |
| `.webm` | VP9 + alfa kanal, **256KB gacha**, 512×512, 3 soniyagacha | Dizayner (yuklab qo'shiladi) |

**`.tgs` ni sayt o'zi yasaydi.** `.tgs` — bu sirli format emas: u
oddiy **Lottie JSON** ning gzip bilan siqilgani. Shuning uchun
`ffmpeg`, After Effects yoki tashqi kutubxona kerak emas — JSON
yasab, Node'ning `zlib` i bilan siqiladi (`lib/stickers/animate.ts`).
Chiqadigan fayl **~1 KB** (chegara 64 KB).

**Admin → Stikerlar → "Animatsiyali stiker"** bo'limida harakat turi
va ikonka tanlanadi, yonida **jonli ko'rinish** turadi. Ko'rinish
Telegramga ketadigan `.tgs` bilan **bir sahnadan** chiziladi
(`svgFromScene`), faqat formati boshqa (SVG + SMIL) — shu sababli
admin nimani ko'rsa, mijoz ham shuni oladi va brauzerga Lottie
o'quvchi kutubxona kerak bo'lmaydi.

Tayyor harakatlar: **puls** (nafas olish), **aylanuvchi halqa**
(kutish), **chizilib borish** (tasdiq), **sakrash** (savatga
qo'shildi), **tebranish** (xatolik), **tomchi va to'lqin**
(santexnikaga xos). Birinchi beshtasida 15 ta ikonkadan istalgani
qo'yiladi.

> **Yozuv nega yo'q?** `.tgs` da matn qatlami taqiqlangan (harflar
> vektor shaklga aylantirilishi kerak edi), shuning uchun
> animatsiyali stiker do'kon ikonkasi va logotipi ustiga quriladi.
> Yozuvli stiker kerak bo'lsa — statik shablon ishlatiladi.

`.webm` (video stiker) esa brauzerda yasalmaydi: VP9 + alfa
kodlash kerak. Uni dizayner tayyorlaydi, sayt
**"Animatsiyali fayl yuklash"** orqali to'plamga qo'shadi.

## 5. Fayllar

| Fayl | Vazifasi |
|---|---|
| `src/types/sticker.ts` | Slotlar, shablonlar, animatsiya turlari |
| `src/lib/telegram/stickers.ts` | Sozlama, yuborish, to'plamga qo'shish |
| `src/lib/telegram/sticker-commands.ts` | Guruhdagi `/stiker` buyruqlari |
| `src/lib/stickers/render.tsx` | Statik stiker rasmi (512×512 PNG) |
| `src/lib/stickers/art.ts` | Logotip va 15 ta ikonka (vektor) |
| `src/lib/stickers/animate.ts` | Sahna → Lottie/`.tgs` va jonli SVG |
| `src/lib/stickers/animations.ts` | Tayyor harakat shablonlari |
| `src/app/api/admin/stickers/*` | Sozlama, ko'rinish, yasash |
| `src/components/admin/StickerManager.tsx` | Admin paneldagi boshqaruv |

Bot API qo'shimchalari (`src/lib/telegram/bot.ts`): `sendSticker`,
`getStickerSet`, `uploadStickerFile`, `createNewStickerSet`,
`addStickerToSet`, `deleteStickerFromSet`, `getBotUsername`.

> Shrift haqida: `next/og` ichida faqat oddiy qalinlikdagi shrift
> bor, shuning uchun "qalin" ko'rinish kontur (`text-stroke`) bilan
> beriladi. Emoji rasmda chizilmaydi — u stikerning "kayfiyati"
> sifatida alohida saqlanadi.

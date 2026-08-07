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

## 4. Yangi stiker yasash

Sayt stikerni o'zi chizadi (`next/og`, tashqi xizmatsiz):
shablon (doira / nishon / lenta), yozuv, ikkinchi qator, "ATOYO"
lentasi. Natija 512×512 shaffof PNG.

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

### Animatsiyali stiker

Telegram animatsiya uchun ikki format qabul qiladi:

| Format | Talab |
|---|---|
| `.tgs` | Lottie animatsiyasi, **64KB gacha**, 512×512, 3 soniyagacha, 30/60 fps, matn qatlamlari bo'lmasligi kerak (harflar shakl bo'lishi shart) |
| `.webm` | VP9 + alfa kanal, **256KB gacha**, 512×512, 3 soniyagacha |

Bu formatlarni brauzer ham, sayt ham yasay olmaydi — ular
maxsus dastur (Adobe After Effects + Bodymovin, yoki
`@art_focus` kabi dizayner) bilan tayyorlanadi. Tayyor faylni
**Admin → Stikerlar → "Animatsiyali fayl yuklash"** orqali
to'plamga qo'shasiz; sayt hajmini tekshiradi va Telegram'ga
yuboradi.

## 5. Fayllar

| Fayl | Vazifasi |
|---|---|
| `src/types/sticker.ts` | Slotlar, shablonlar, turlar |
| `src/lib/telegram/stickers.ts` | Sozlama, yuborish, to'plamga qo'shish |
| `src/lib/telegram/sticker-commands.ts` | Guruhdagi `/stiker` buyruqlari |
| `src/lib/stickers/render.tsx` | Stiker rasmini chizish (512×512 PNG) |
| `src/app/api/admin/stickers/*` | Sozlama, rasm ko'rsatish, yasash |
| `src/components/admin/StickerManager.tsx` | Admin paneldagi boshqaruv |

Bot API qo'shimchalari (`src/lib/telegram/bot.ts`): `sendSticker`,
`getStickerSet`, `uploadStickerFile`, `createNewStickerSet`,
`addStickerToSet`, `deleteStickerFromSet`, `getBotUsername`.

> Shrift haqida: `next/og` ichida faqat oddiy qalinlikdagi shrift
> bor, shuning uchun "qalin" ko'rinish kontur (`text-stroke`) bilan
> beriladi. Emoji rasmda chizilmaydi — u stikerning "kayfiyati"
> sifatida alohida saqlanadi.

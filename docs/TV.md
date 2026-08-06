# Do'kondagi televizor (reklama ekrani)

Do'konga osilgan televizorda mahsulotlar avtomatik aylanib turadi:
katta rasm, katta narx, brend, "Sotuvda bor" belgisi va QR kod —
mijoz telefon kamerasini QR ga tutsa, o'sha mahsulot sahifasi ochiladi.

**Televizorga ILOVA o'rnatilmaydi.** Ekran — bu shunchaki saytdagi
sahifa: `https://atoyo-uz.web.app/tv`. Shuning uchun Samsung, LG,
Xiaomi, Android TV — brauzeri bor har qanday televizorda ishlaydi va
Play Store moderatsiyasini kutish shart emas.

---

## 1. Nima kerak

Uch xil yo'ldan biri (arzonidan boshlab):

| Yo'l | Narxi | Izoh |
|---|---|---|
| **Android TV box** (yoki eski Android telefon) HDMI orqali | ~200-400 ming so'm | Eng ishonchli: to'liq Chrome, kiosk rejimi, avtomatik ishga tushish |
| **Smart TV ning o'z brauzeri** (Samsung/LG) | 0 | Ishlaydi, lekin brauzer ba'zan o'zi yopiladi; har kuni qo'lda ochish kerak bo'lishi mumkin |
| **Kompyuter / noutbuk** HDMI orqali | 0 (bori bo'lsa) | Desktop ilovada menyudan "Do'kon → Do'kon ekrani" — to'liq ekranda ochadi |

Televizor doim internetga ulangan bo'lishi kerak (Wi-Fi yetarli —
sahifa 3 daqiqada bir marta kichik so'rov yuboradi).

## 2. Sozlash (5 daqiqa)

1. Televizor brauzerini oching va manzilni yozing:

   ```
   https://atoyo-uz.web.app/tv
   ```

2. Brauzerni **to'liq ekran** (kiosk) rejimiga o'tkazing.
   Android TV da Chrome uchun eng qulayi — "Fully Kiosk Browser"
   yoki "WebView Kiosk" kabi bepul ilova: unga manzilni yozib qo'ysangiz,
   televizor yoqilishi bilan sahifani o'zi ochadi.
3. Televizor sozlamalarida **ekran o'chishini (screen timeout)**
   o'chirib qo'ying. Sahifa buni o'zi ham so'raydi (`wakeLock`), lekin
   hamma televizor buni qo'llab-quvvatlamaydi.
4. Tayyor. Sahifa endi o'zini o'zi boshqaradi: slaydlarni aylantiradi,
   har 3 daqiqada yangi ma'lumot oladi, internet uzilsa oxirgi holatni
   ko'rsatib turadi va aloqa tiklanishi bilan o'zi tuzaladi.

## 3. Boshqarish — admin panel

**Admin panel → "Do'kon ekrani"** (`/admin/tv`). Televizorga bormasdan
hammasini shu yerdan o'zgartirasiz, o'zgarish 1-3 daqiqada ekranga
chiqadi.

| Sozlama | Nima qiladi |
|---|---|
| **Ekran yoqilgan** | O'chirilsa ekranda faqat do'kon nomi qoladi |
| **Nima ko'rsatilsin** | Yangi kelganlar · Eng ko'p sotilganlar · Chegirmadagilar · Tanlangan kategoriyalar · Qo'lda tanlangan mahsulotlar |
| **Nechta mahsulot** | 5-40 ta |
| **Bitta slayd necha soniya** | 4-60 soniya (tavsiya: 8-12) |
| **Narx ko'rsatilsin** | O'chirsa faqat rasm va nom qoladi |
| **QR kod** | Mijoz telefonida mahsulot sahifasi ochiladi |
| **Faqat zaxirada boricha** | Tugagan mahsulot reklama qilinmaydi |
| **Yuqoridagi sarlavha** | Do'kon nomi |
| **Yuguruvchi qator** | Pastda chapga yurib turadigan matn (aksiya, ish vaqti, manzil) |
| **Telefon raqami** | Pastda, yuguruvchi qatorning chap tomonida |

Sahifaning pastida **"Hozir ekranda"** bo'limi bor — saqlashdan oldin
nima chiqishini shu yerda ko'rasiz.

## 4. Muhim qoidalar

- **Narx har doim DONA (chakana) narxda ko'rsatiladi.** Televizor
  ommaviy ekran, optom narx unga hech qachon chiqmaydi (server
  `productPricesForRole(..., undefined, ...)` orqali yuboradi).
- **Rasmsiz mahsulot ekranga chiqmaydi** — katta ekranda bo'sh joy
  bo'lib qoladi. Rasm qo'shish: Admin → Katalog → Tartib (yoki
  mahsulot formasida buferdan Ctrl+V).
- Sahifa qidiruv tizimlariga yopiq (`robots.txt` da `/tv` taqiqlangan).

## 5. Texnik tomoni (dasturchi uchun)

| Fayl | Vazifasi |
|---|---|
| `src/app/tv/page.tsx` | Sahifa (header/footer'siz, `force-dynamic`) |
| `src/components/tv/TvScreen.tsx` | Slayder, soat, offline holati, `wakeLock` |
| `src/components/tv/QrCode.tsx` | QR kod (SVG, `qrcode-generator`, tashqi xizmatsiz) |
| `src/app/api/tv/slides/route.ts` | Ochiq API - sozlama + slaydlar |
| `src/lib/tv/slides.ts` | Slaydlarni yig'ish + 2 daqiqalik kesh |
| `src/lib/tv/settings.ts` | `settings/tv` (60 s kesh) |
| `src/app/api/admin/tv/route.ts` | Admin GET/PUT (huquq: `settings`) |
| `src/components/admin/TvSettingsForm.tsx` | Boshqaruv formasi |
| `.tv-*` sinflari | `src/app/globals.css` oxirida |

So'rovlar mavjud indekslarga tayanadi (`isActive + createdAt`,
`isActive + salesCount`, `isActive + category + createdAt`) — yangi
kompozit indeks kerak emas. Chegirmadagilar indekssiz topiladi:
oxirgi 300 ta mahsulot olinib, xotirada filtrlanadi.

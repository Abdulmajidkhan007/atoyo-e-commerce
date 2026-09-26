# Arxitektura tarixi: qoida qayerdan chiqqan

`CLAUDE.md` — qisqa QOIDALAR ro'yxati (u har sessiyada o'qiladi,
shuning uchun qisqa turishi kerak). Bu fayl esa **sabablarni**
saqlaydi: har bir qoida qaysi nosozlikdan keyin paydo bo'lgan.

Qoidani o'zgartirmoqchi bo'lsangiz — avval shu yerdagi tegishli
bandni o'qing. Ko'pchiligi bir marta ishlab chiqarishda "kuygan"
joylar.

---

## 1. Narx maxfiyligi

**Ustama foizi mijozga berilmaydi.** Ilgari `/api/pricing` ustama
foizini ham qaytarardi. Dona narx ochiq bo'lgani uchun optom narxni
teskari hisoblab olish mumkin edi: `optom = dona / (1 + ustama/100)`.
Endi u faqat `minOrderAmount` qaytaradi, ustama esa admin
route'ida (`/api/admin/pricing`).

**`products` kolleksiyasi nega yopildi.** Avval sayt va ilova
katalogni to'g'ridan-to'g'ri Firestore'dan o'qirdi, ya'ni hujjat
ichidagi `price` (optom) va `costPrice` (tannarx) oddiy Firebase SDK
bilan istalgan odamga ochiq edi — UI'dagi `priceForRole()` faqat
ko'rinishni to'g'rilardi, ma'lumotni yashirmasdi. Endi o'qish server
orqali (`/api/products/*`) va hujjat mijozga `toViewerProduct()` dan
o'tib chiqadi.

**"Saytda 70 000, botda 78 700".** Xodim (rol: admin/staff) saytda
optom narxni ko'rardi, mijoz esa dona narxni — bir mahsulotga ikki
xil raqam. Endi vitrina hamma uchun MIJOZ oynasi (`storefrontRole()`),
optom narx faqat optom mijozga va admin panelga.

**Kanal postidagi tur qatori.** Ilgari tartib "kod · qiymat — narx"
edi va qaysi narx qaysi kodga tegishli ekani bilinmasdi. Endi:
QIYMAT → NARX → KOD (`Satin Gold — 91 400 so'm · kod: SJ-03`).

**Tannarx buyurtma hujjatida ham sizib chiqqan edi.** `products`
yopilgani va `toViewerProduct()` yozilgani mijozni Firestore'dan
mahsulot o'qishdan to'xtatdi, lekin `createOrder()` sotilgan qatorga
`costPrice` nusxasini (foyda hisoboti uchun) to'g'ridan-to'g'ri
`orders/{id}.items[]` ga yozardi — `orders` esa `firestore.rules`da
`allow read: if ... resource.data.userId == request.auth.uid`, ya'ni
mijoz O'Z buyurtmasini profilida client SDK bilan (`subscribeToUserOrders`,
`onSnapshot`) butunligicha o'qirdi. Har qanday mijoz o'zi sotib olgan
mahsulotning tannarxini brauzer konsolida ko'ra olardi. Endi tannarx
`orders` bilan bir tranzaksiyada, lekin alohida yopiq
`orderCosts/{orderId}` hujjatiga yoziladi (`allow read, write: if
false`); hisobot (`api/admin/reports/route.ts`) tannarxni o'sha
yerdan `db.getAll()` bilan o'qiydi. Eski buyurtmalar uchun bir
martalik `/api/admin/maintenance/order-costs` migratsiyasi bor —
Firestore massiv ICHIDAGI maydonni nuqta yo'li bilan o'chirib
bo'lmagani uchun (`FieldValue.delete()` faqat xarita maydoniga
ishlaydi) `items` massivi tannarxsiz holda butunlay qayta yoziladi.

---

## 2. Admin API xatolari

Ilgari Zod tekshiruvi yiqilganda hamma joyda quruq **"Ma'lumotlar
noto'g'ri."** chiqardi. 30 dan ortiq maydonli mahsulot formasida
sababni topib bo'lmasdi — bir marta "kalit so'zlar 10 tadan ko'p"
degan sabab shu tarzda yashirinib qolgan va xodim nima
qilishini bilmay qolgan. Endi `validationMessage()` qaysi maydon va
nima uchun rad etilganini aytadi (testi `validation.test.ts`).

---

## 3. Mahsulot raqami: "87, 3946"

3 900 ta mahsulot o'chirilib, qolgan 87 tasi 1..87 ga qayta
raqamlangan edi. Lekin "Raqamlarni qayta tartiblash" ichida
`bumpProductCodeCounter()` chaqirilardi — u hisoblagichni faqat
KO'TARADI. Natijada hisoblagich 3945 da qolib ketdi va keyingi yangi
mahsulot 3946-raqamni oldi: ro'yxat "87, 3946" bo'lib chiqdi.

Shu sabab ikkinchi funksiya bor: `setProductCodeCounter()` — aniq
qiymatga qo'yadi, kamaytirishi ham mumkin.

Shu yerda ikkinchi nosozlik ham bor edi: `reindex` route'ida
`limit(500)` turardi va 500 tadan keyingi mahsulotlar jimgina
tashlab ketilardi. Endi kursor bilan (`__name__` tartibida)
hammasi aylanib chiqiladi.

---

## 4. O'chirilganlar savati: nega `isActive: false` bilan tiklanadi

Bir marta minglab mahsulot tasodifan o'chirilgan edi. Agar ular
savatdan tiklanganda darhol saytda ochilib ketsa, kanalga ham
ommaviy e'lon ketardi (har biri post!). Shuning uchun tiklangan
mahsulot **saytda yopiq** holda qaytadi — xodim ko'rib chiqib,
"Saytda ochish" bilan ochadi.

Storage'dagi fayllar o'chirilmaydi, shuning uchun tiklangach rasmlar
joyida turadi. `deletedProducts` qoidalarda yopiq — ichida optom narx
va tannarx bor.

---

## 5. Katalog bo'sh ko'ringan kun

Katalog so'rovi `where isActive == true` + `orderBy` bo'lgani uchun
kompozit indeks talab qiladi. Indeks deploy qilinmagan edi va
Firestore `FAILED_PRECONDITION` qaytardi — **katalog butunlay bo'sh
ko'rindi**, bosh sahifa esa ishlayverdi (u boshqa indeksdan
foydalanadi), shuning uchun muammo darrov sezilmadi.

Endi `queryProductsPage` indeks yo'qligini tanib, zaxira so'rovga
o'tadi: faqat tenglik filtrlari + `__name__` tartibi (indekssiz
ishlaydi), saralash sahifa ichida xotirada. Katalog ishlaydi, lekin
tartib to'liq to'g'ri emas — haqiqiy yechim baribir indeksni deploy
qilish. Tekshirish: Sozlamalar → Tizim tekshiruvi → "Katalog so'rovi".

---

## 6. Kanal posti

### 6.1. Post yo'qolib qolgan kun (eng jiddiy)

Mahsulotga video qo'shilgach media soni o'zgardi. Yuborilgan albomga
fayl qo'shib bo'lmaydi (Telegram cheklovi), shuning uchun post qayta
tashlanishi kerak edi. Tartib esa teskari edi:

1. eski post **o'chirildi**;
2. yangisi yuborildi va Telegram uni **qabul qilmadi**;
3. `publish()` xatoni yutib `null` qaytardi.

Natija: kanalda mahsulot umuman qolmadi va sababi hech qayerda
ko'rinmadi. Endi: avval yangisi yuboriladi, eskisi faqat shundan
keyin o'chiriladi; yiqilsa `"failed"` qaytadi va sabab "Actions"
topikiga yoziladi. Testi: `channel-announce.test.ts`.

### 6.2. Video havola bilan yuborilmaydi

Yuqoridagi holatda Telegram aytgan sabab:
`Bad Request: failed to send message #1 with the error message
"Wrong file identifier/HTTP URL specified"`.

Ya'ni Telegram rasmni havoladan oladi, VIDEO'ni esa rad etadi.
Endi `sendMediaGroup`/`sendVideo` videoni o'zi yuklab olib multipart
(`attach://mediaN`) bilan yuboradi; rasmlar avvalgidek havola bilan
(tez va arzon). 45 MB dan katta bo'lsa yoki yuklab bo'lmasa — eski
usul sinab ko'riladi. Testi: `bot-media.test.ts`.

Zaxira yo'l ham qoldi: albom baribir o'tmasa, ikkinchi urinish
FAQAT RASMLAR bilan bo'ladi (`degraded: "no-video"`) — post chiqadi,
video esa saytda va ilovada ko'rinaveradi.

### 6.2a. Kesilgan HTML butun postni yiqitgan kun

Albom izohi 1024 belgi bilan cheklangan, shuning uchun uzun matn
kesilardi — oddiy `slice()` bilan. Matn esa HTML, ya'ni kesish
`<b>` bilan `</b>` orasiga tushishi mumkin edi:

```
Bad Request: can't parse InputMedia: Can't parse entities:
Can't find end tag corresponding to start tag "b"
```

Telegram bunday matnni butunlay rad etadi — mahsulot kanalga
umuman chiqmadi. Endi `truncateHtml()` (`lib/telegram/html-truncate.ts`)
ishlatiladi: u teg ichida ham, HTML entity (`&amp;`) ichida ham
kesmaydi, ochiq qolgan teglarni o'zi yopadi va yopuvchi teglar
uchun ham joy hisoblaydi. Yuborishdan oldin oxirgi qalqon ham bor:
izoh 1024 (rasm/video bo'lsa) yoki 4096 belgiga qisqartiriladi.
Testi: `html-truncate.test.ts`.

### 6.3. 65 postdan 45 tasi yiqilgan kun

"Kanal postlarini yangilash" bir so'rovda hammasini ketma-ket
tahrirlardi, oraliq 120 ms edi. Telegram bitta kanalga daqiqasiga
~20 ta tahrirga ruxsat beradi — 65 postdan 45 tasi 429 bilan
yiqildi. Endi: bir so'rovda 15 tadan, orasida 3 s, va
`callTelegramApi` 429 javobidagi `retry_after` ni o'qib o'zi kutadi
(3 martagacha).

### 6.4. Yangilash sababi

Ilgari har qanday xato UI'da "Telegram ruxsat bermadi" bo'lib
chiqardi. Endi `refreshChannelPost` `{status, reason}` qaytaradi va
`classify()` xatoni tanib oladi: "post o'chirilgan" bo'lsa
`channelMessageId` tozalanadi (mahsulotni qayta e'lon qilsa
bo'ladi), "matnsiz/izohsiz" bo'lsa teskari usul bilan qayta
uriniladi. Sabablar route'da guruhlanib o'zbekcha yoziladi.

### 6.5. Tahrir paytida kanalga post ketishi

Ilgari har bir o'zgarish (nom, narx, rasm qo'shish/o'chirish)
kanaldagi postni shu zahoti yangilardi. Xodim ketma-ket bir necha
maydonni tahrirlasa kanalga bir necha marta post ketardi va
yarim tahrirlangan holat chiqib qolardi. Endi o'zgarish faqat
belgilanadi (`session.pendingAnnounce`), e'lon "✅ Tugatish" da bir
marta ketadi.

### 6.6. Post tezligi (navbat)

Bir vaqtda ko'p mahsulot kirim qilinganda kanal spam bo'lib
ketardi. Endi oyna bo'yicha chegara (standart: 10 daqiqada 5 ta
YANGI post). Chegaradan oshgani **tashlanmaydi** — `channelQueue` ga
tushadi va oyna bo'shashi bilan chiqadi. Hisob "surilib boruvchi
oyna" bilan bitta hujjatda (`channelRecent`), alohida
kolleksiya/indeks kerak emas. Navbatni `/api/cron/channel` va har
yangi e'lon oldidan `drainChannelQueue(2)` bo'shatadi — cron
sozlanmagan bo'lsa ham navbat qotib qolmaydi.

### 6.7. Statistika: nega "kim ko'rdi" yo'q

Telegram Bot API postni KIM ko'rganini (hatto necha marta
ko'rilganini ham) bermaydi — bunday ma'lumot botlarga ochilmagan.
Shuning uchun o'lchanadigan narsa — post ostidagi tugma bosilishi:
tugma `/k/<id>` ga qaraydi, u `channelClicks/{productId}` ga
`increment` yozib mahsulot sahifasiga yo'naltiradi.

---

## 7. Telegram bot: rasm va video

- **Rasmni o'chirish yo'q edi.** "🖼 Rasm" tugmasi faqat QO'SHARDI;
  xunuk yoki noto'g'ri rasmni botdan olib tashlab bo'lmasdi (faqat
  saytdan). Endi u menyu ochadi: qo'shish ham, o'chirish ham.
- **Video qo'shish yo'q edi.** Kirimda video qabul qilinardi, lekin
  `/tahrir` da video menyusi yo'q edi. Endi "🎬 Video" bor.
- Fayl Storage'da QOLADI (savatdan tiklashda kerak), faqat
  bog'lanish uziladi. Rasm/video soni o'zgargani uchun kanal posti
  qayta tashlanadi (albomdan rasm olib tashlab bo'lmaydi).
- Video 20 MB gacha — bu Bot API'ning `getFile` chegarasi, biz
  qo'ygan cheklov emas.

---

## 8. Kategoriya nomini tanish (`matchTaxonomy`)

1C narxnomasidan kelgan nomlarda lotin so'z ichida **kirill egizak
harflari** uchraydi (`е`, `а`, `о`, `с`...). Ekranda ular
bilinmaydi, lekin satr solishtiruvi ularni boshqa harf deb biladi —
natijada bot ro'yxatda TURGAN kategoriyani "tanilmadi" deb rad
etardi va kirim to'xtardi.

Endi solishtirish oldidan ikkala tomon `foldForMatch()` dan o'tadi
(kichik harf, apostrofsiz, kirill → lotin), keyin: ichida uchrashi →
1-2 harf xatosi (Levenshtein: 5-7 harfda 1 ta, undan uzunida 2 ta).
Topilmasa `suggestTaxonomy()` eng yaqin 5 ta nomni ko'rsatadi.

---

## 9. Material nega majburiy emas

1C narxnomasidan kelgan mahsulotlarning ko'pchiligida material
yozilmagan. Majburiy qilinganda kirim to'xtab qolardi, shuning uchun
`material: z.string().max(60).default("")`. Tekshiruv formada
(`ProductForm.handleSave`), server esa bag'rikeng qoladi — bot kirimi
va Excel import ham shu route'lardan o'tadi.

---

## 10. Brend/davlat: slug emas, matnning o'zi

Mahsulotda brend va davlat **matn** sifatida saqlanadi (slug emas).
Shuning uchun `metadata/facets` da qiymat qayta nomlansa,
`renameFacetValue()` mahsulotlarni ham 400 tadan bo'lib yangilaydi.
O'chirish faqat qiymat hech qayerda ishlatilmayotgan bo'lsa mumkin.

---

## 11. Tahrirdan qayerga qaytish (`?qayt=`)

Mahsulot tahrir sahifasi saqlagach doim `/admin/katalog` ga otardi.
"Katalogni tartibga solish" da ishlayotgan xodim filtr/qidiruv/
sahifani qaytadan tiklashga majbur bo'lardi (3 800 mahsulotda bu
og'ir).

Endi havola `?qayt=<manzil>` bilan keladi; `EditProductClient` uni
`/admin/` bilan boshlanishiga tekshiradi (ochiq redirect bo'lmasin).
Tartiblash sahifasi holatini manzilga yozadi (`?q=`, `?kategoriya=`,
`?brend=`, `?sahifa=`) va server `searchParams` orqali
`CatalogCleanup` ga `initial` bo'lib uzatiladi. Kirim sahifasidagi
✏️ ham shu bilan qaytadi.

---

## 12. Turlar: o'chirilgan kombinatsiya qaytib kelardi

Qatorlardan hamma kombinatsiya yasaladi, lekin ba'zi kombinatsiya
ishlab chiqarilmaydi. Xodim uni jadvalda 🗑 bilan o'chirsa, keyingi
tahrirda `normalizeVariants()` uni QAYTA YASAB qo'yardi. Endi
o'chirilgan kalit `Product.variantsExcluded` ga tushadi va qayta
yasalmaydi; qatorlar o'zgarsa eskirgan kalitlar tozalanadi
(testlari `variants.test.ts`).

---

## 13. Tur tanlagichdagi nozik joylar

- Rangli "yostiq" tugmalarning ORQASIDA turadi (matn ustiga
  chiqmasligi uchun), shuning uchun sudrash track ustida ushlanadi
  va bosish yostiq chegarasida ekani tekshiriladi.
- Sudrashdan keyingi "click" o'tkazib yuboriladi — aks holda barmoq
  ostidagi tugma tanlanib qolardi.
- **Track'da `touch-pan-y` bo'lishi SHART.** Busiz telefonda brauzer
  barmoq harakatini o'zi oladi va sudrash umuman ishlamaydi (bir
  marta shunday bo'lgan); u bilan vertikal varaqlash saqlanadi.
- O'chirilgan tur qiymati qatorda qolmasligi kerak: aks holda tugma
  bosilganda mahsulot "tugagan" bo'lib ko'rinardi.

---

## 14. CSP: video yo'qolgan kun

Sayt `Content-Security-Policy` yuboradi. **CSP'da ko'rsatilmagan tur
`default-src 'self'` ga tushadi va jimgina bloklanadi** — brauzer
konsolisiz sezilmaydi. Bir marta aynan shu sabab mahsulot VIDEOSI
saytda ko'rinmay qoldi: `media-src` yozilmagan edi, video esa
Firebase Storage'da. Endi rasm/video uchun `https:` ochiq, testi
`csp.test.ts` da.

---

## 15. Cookie: faqat `__session`

Sayt Firebase Hosting rewrite orqali ochilgani uchun backendga
**faqat `__session` cookie** yetib boradi — boshqa nomdagi cookie'lar
yo'lda tashlab ketiladi. Shu sabab OAuth `state` cookie'da
saqlanganda Google/Facebook'dan qaytgach tekshiruv doim yiqilardi
("So'rov tasdiqlanmadi (state)"). Endi bunday qisqa muddatli
qiymatlar Firestore'da (`oauthStates`, qoidalarda yopiq).

Xuddi shu sabab server UI rejimini (klassik/3D) ham o'qiy olmaydi —
`layout.tsx` dagi erta skript `<html data-ui-mode>` ni qo'yadi.

---

## 16. Server komponentda MUI

Server komponentga `component={Link}` kabi FUNKSIYA prop berilsa,
"Functions cannot be passed directly to Client Components" xatosi
chiqadi va sahifa 500 bo'ladi — `/admin/katalog` shundan yiqilgan
edi. Server sahifada oddiy `<Link>` + Tailwind, MUI tugmasi kerak
bo'lsa alohida `"use client"` komponent.

---

## 17. 3D: telefonda IKKI marta ko'rinmagan

3D sahna telefonlarda umuman chizilmasdi va sababi ekranda
ko'rinmasdi:

1. birinchi marta — ekran kengligi shart qilib qo'yilgani uchun
   (`width < 768` → `low`), ya'ni telefon "yaroqsiz" deb chiqarib
   tashlangan edi;
2. ikkinchi marta — `deviceMemory` chegarasi 3 GB qilib qo'yilgani
   uchun: Chrome 3 GB telefonni **2** deb ko'rsatadi.

Mijozlarning ko'pchiligi telefonda. Endi telefon `mid` pog'onada
(yengil sifat), 3D o'chirilsa SABABI ekranda yoziladi va
foydalanuvchi **"Baribir yoqish"** bilan qarorni bekor qila oladi.

Uchinchi nosozlik: "Baribir yoqish" tugmasi ishlamasdi — `forced`
holati `useImmersive` ichidagi oddiy `useState` edi va har komponent
o'z nusxasini ko'rardi (tugma o'zida yoqilardi, sahna bexabar
qolardi). Endi u `UiModeContext` da.

To'rtinchisi (mahsulot emas, qaror): foydalanuvchiga 3D modellar
ma'qul kelmadi, shuning uchun 3D butunlay admin sozlamasi ortiga
olindi (`SiteSettings.show3dMode`, standart `false`).

---

## 18. Ijtimoiy navbatni hech kim bo'shatmasdi

`processQueue()` butun kodbazada bitta joydan — admin panelidagi
tugmadan chaqirilardi. Admin o'sha ekranga kirmasa, Instagram/
Facebook/YouTube postlari `socialQueue` da cheksiz yotardi. Endi
`/api/cron/social` (CRON_SECRET bilan) bor va Cloud Scheduler uni
soatiga bir marta chaqiradi.

**Blog maqolasining yo'nalishi** ham qat'iy edi: har maqola Telegram
kanaliga ketardi, videosi bo'lsa YouTube'ga tushardi, Instagram/
Facebook esa umuman yo'q edi. Endi har maqolada tanlanadi
(`BlogPost.destinations`).

**YouTube noto'g'ri kanalga ulanardi**: brauzerda boshqa Google
hisobi ochiq bo'lsa Google jimgina o'shanga ulab yuborardi. Endi
so'rov `prompt=consent select_account` bilan ketadi — hisob va kanal
har safar tanlanadi.

---

## 19. Yetkazib berish matni ikki joyda

Mijozga aytiladigan va'da ("Qo'qon ichida 15 km gacha bepul") kodda
qattiq yozilgan edi va joyi o'zgarsa 10 dan ortiq faylni qidirish
kerak bo'lardi. Endi manba bitta: `settings/delivery` +
`lib/delivery/text.ts`.

Bitta istisno bor: **mobil ilova sayt kodini import qila olmaydi**,
shuning uchun matn mantiqi `mobile/src/api.ts` da TAKRORLANGAN.
Sayt tomonidagi matn o'zgarsa — ilovanikini ham o'zgartiring.

---

## 20. Storage: yetim fayllar

Mahsulotdan olib tashlangan rasm/video ataylab o'chirilmaydi (savat
30 kun, fayl boshqa hujjatda ham ishlatilgan bo'lishi mumkin). Lekin
ular joy egallaydi va hisobga tushadi.

`lib/storage/cleanup.ts` bazadagi hamma havolani hujjat JSON'idan
regex bilan yig'adi — shuning uchun keyinchalik yangi maydon
qo'shilsa ham (masalan `posterUrl`) fayl "yetim" deb sanalmaydi.
Faqat 30 kundan eski fayllar o'chadi: yarim yo'lda uzilgan kirimning
rasmi tasodifan o'chib ketmasin.

---

## 21. Import qilingan mahsulot darhol ko'rinmaydi

Excel importdan keyin minglab mahsulot bir zumda saytga chiqib
ketardi (va kanalga e'lon bo'lishi mumkin edi). Endi import
`isActive: false` bilan yaratadi, ochish esa alohida qadam
("Saytda ochish"). `isActive` — yagona ko'rinish filtri; yangi
"yashirin" maydon qo'shilmaydi, aks holda qaysi biri haqiqiy filtr
ekani chalkashadi.

---

## 22. Ilova versiyasi ikki joyda

`mobile/src/update.ts` dagi `APP_VERSION` va
`android/app/build.gradle` dagi `versionName` bir xil bo'lishi shart:
ilova o'zini shu raqam bilan solishtiradi va nomuvofiqlikda
yangilanish eslatmasi noto'g'ri chiqadi (yoki umuman chiqmaydi).
Solishtirish mantiqi `mobile/src/version.ts` da, testi sayt
vitest'ida ishlaydi.

Yangi NATIV paket qo'shilganda `mobile/scripts/check-codegen.mjs`
ro'yxatiga ham qo'shing — u Android SDK'siz, bir necha soniyada
RN codegen nomuvofiqligini topadi (aks holda Gradle build 3
daqiqadan keyin yiqiladi).

---

## 23. To'lov bekor qilinganda buyurtma "kutilmoqda" bo'lib qolardi

Payme `CancelTransaction` va Click'ning `action=1` xato yo'li faqat
`paymentStatus: "failed"` yozardi — `order.status` "pending"da qolib
ketardi va `create-order.ts` buyurtma yaratilganda darhol kamaytirgan
zaxira hech qachon qaytmasdi. Bir necha o'nlab tashlab ketilgan
onlayn to'lov mahsulotni sotilmagan holda "band" qilib qo'yishi
mumkin edi. Endi ikkala yo'l ham `applyOrderStatusUpdate(orderId,
"cancelled")` ni chaqiradi — u zaxirani `stockReturned` bayrog'i
bilan BIR MARTA qaytaradi, shuning uchun Payme/Click'ning takroriy
so'rovi (retry) uni ikki marta qaytarib yubormaydi.

Click ichki xatosida javob endi `{error: -1}` (imzo xatosi) emas,
HTTP 500: `-1` Click uchun "bu so'rov bilan gaplashmayman" degani va
u qayta urinmaydi — agar xato aynan `PerformTransaction` bosqichida
bo'lsa, pul mijozdan yechilib, buyurtma "to'lanmagan" bo'lib qolishi
mumkin edi.

Imzo/sir solishtirish `timingSafeEqual`ga o'tkazildi: oddiy `===` bilan
solishtirish maxfiy kalitning necha belgisi to'g'ri kelganini javob
vaqtidan bilib olish imkonini beradi. `cron/social` va `cron/channel`
o'zida takrorlangan `secretMatches` endi `lib/http/secret-match.ts`
umumiy modulida — ikkala cron route ham, Payme (`isAuthorized`) ham,
Click (imzo) ham shundan foydalanadi.

---

## Yangi domenga o'tish (atoyo.uz) — ikkita tuzoq

**1. `deletedProducts` indeksi CI ni yiqitdi.** `FIREBASE_SERVICE_ACCOUNT`
qo'yilgach `firestore-rules` qadami nihoyat ishga tushdi va darhol
yiqildi:

```
Request to .../collectionGroups/deletedProducts/indexes had HTTP Error: 400,
this index is not necessary, configure using single field index controls
```

Sababi: `firestore.indexes.json` da `deletedProducts` uchun BITTA
maydonli (`deletedAt DESC`) indeks yozilgan edi. Firestore bitta
maydonli indekslarni O'ZI yaratadi va ularni kompozit sifatida
e'lon qilishni rad etadi. Indeks olib tashlandi (35 → 34).

**Qoida:** `firestore.indexes.json` ga faqat IKKI va undan ortiq
maydonli indeks yoziladi.

**2. Kirish ishlamay qoldi, sabab esa ko'rinmadi.** `atoyo.uz` ga
o'tilgach kirish "Kirishda xatolik yuz berdi" deb turaverdi.
`LoginForm` HAR QANDAY xatoni shu bitta xabarga aylantirardi
(`catch { setError(dict.auth.error) }`), shuning uchun haqiqiy sabab —
parol xatosimi, tarmoqmi, yoki yangi domen Firebase'da ruxsat
etilmaganmi — na mijozga, na adminga ko'rinmadi.

Endi `lib/firebase/auth-errors.ts` xatoni turlarga ajratadi
(`wrongCredentials` / `tooMany` / `network` / `emailInUse` /
`weakPassword` / `domain` / `generic`) va uchala tilda aniq xabar
chiqadi; tanilmagani konsolga to'liq yoziladi. Domen turi ikkita
chegarani qamrab oladi: Authentication → Authorized domains va API
kalitidagi "Website restrictions" (`requests-from-referer ... blocked`).

**Qoida:** tashqi xizmat xatosi foydalanuvchiga chiqayotgan bo'lsa,
u KAMIDA turkumlanadi — "xatolik yuz berdi" bilan muammoni topib
bo'lmaydi.

## Google orqali kirish hisob so'ramasdan kirib ketardi

Saytdagi "Google" tugmasi bosilganda hisob tanlash oynasi CHIQMASDAN
brauzerdagi oxirgi hisobga kirib ketardi. Bitta telefonda ikki hisob
bo'lsa (shaxsiy va do'kon) — mijoz noto'g'risiga kirib qolardi va
buni tushunmasdi.

Sabab: `new GoogleAuthProvider()` standart holatda `prompt`
bermaydi, Google esa `prompt` bo'lmasa mavjud seansdan foydalanadi.

Yechim: `googleProvider.setCustomParameters({ prompt: "select_account" })`
(Microsoft provayderiga ham qo'shildi).

Bu — YouTube kanalini ulashda uchragan nosozlikning AYNAN o'zi:
o'shanda ham noto'g'ri (shaxsiy) kanalga ulanib qolgan edi va yechim
ham shu parametr bo'lgan. Ya'ni qoida umumiy: **OAuth oqimida hisob
tanlash imkoni bo'lishi kerak.**

## Xavfsizlik auditi (2026-09): uchta o'zgarish

**1. `/admin` rad etilganda bosh sahifaga tashlanardi.** Proxy ham,
admin layout ham `redirect("/")` qilardi. Foydalanuvchi nima
bo'lganini bilmasdi — "havola ishlamadi" deb o'ylardi va qayta-qayta
bosardi. Endi `/kirish?redirect=<yo'l>&reason=<sabab>` ga boradi,
kirish sahifasi sababni yozadi, kirgach o'zi so'ragan bo'limga
tushadi.

Bu yerda YANGI zaiflik paydo bo'lishi mumkin edi: `?redirect=` ga
tashqi manzil yozib yuborilsa (`?redirect=https://saxta.uz`), kirgan
mijoz begona saytga olib chiqilardi — fishing uchun tayyor qurol.
Shuning uchun `loginUrl()` ham, `LoginForm` ham faqat `/` bilan
boshlanadigan va `//` bo'lmagan yo'lni qabul qiladi. Testi:
`src/proxy.test.ts`.

**2. CSP `'unsafe-inline'` — endi nonce bilan.** Ilgari CSP
`next.config.ts` dagi statik sarlavhada edi, ya'ni har so'rovga
o'zgaradigan qiymat qo'yib bo'lmasdi. Endi u `src/proxy.ts` da
yasaladi va har so'rovga bir martalik `nonce` oladi.

Nonce ikki joyga qo'yiladi: `x-nonce` sarlavhasiga (bizning layout
o'qiydi) va SO'ROV `content-security-policy` sarlavhasiga — Next.js
uni o'zi o'qib O'ZINING inline skriptlariga qo'yadi. O'lchov bilan
tasdiqlangan: `npm start` da `/kirish` sahifasida 18 ta inline
skriptdan 17 tasida nonce bor, qolgani `application/ld+json`
(bajarilmaydigan ma'lumot bloki, CSP unga tegmaydi).

`'unsafe-inline'` ro'yxatda ATAYLAB qoldirildi: nonce bor bo'lsa
zamonaviy brauzer uni e'tiborsiz qoldiradi, eski brauzerda esa sayt
ishlashda davom etadi (CSP3 migratsiya naqshi).

JSON-LD blokiga ham nonce qo'yib ko'rilgan va QAYTARILGAN: `JsonLd`
komponenti client komponentlardan ham chaqiriladi, `next/headers` ni
o'qisa build yiqiladi ("You're importing a module that depends on
next/headers").

**3. `/api/admin/upload` faqat "xodimmi?" deb qarardi.** Katalogga
ruxsati yo'q xodim ham blog va sayt rasmlarini almashtira olardi.
Endi huquq PAPKAGA qarab tekshiriladi (`products/` → `products`,
`blog/` → `blog`, qolgani → `settings`) va papka nomida `..` bo'lsa
rad etiladi.

Shu bilan birga `/api/auth/session` va `/api/auth/telegram/exchange`
ga rate-limit qo'shildi — ikkalasi ham autentifikatsiyasiz ochiq
edi va har chaqiruvda Firebase'ga so'rov yuborardi.

---

## 24. Ruscha marshrutlar: nega `/ru` prefiks, sahifa kodi qanday takrorlanmagan

Til ilgari faqat cookie bilan almashardi (`NEXT_LOCALE`), URL doim
bir xil qolardi. Google'ning nuqtai nazaridan bu degani — ruscha
sahifa UMUMAN YO'Q: robot cookie yubormaydi, shuning uchun
`/katalog` ni har doim o'zbekcha ko'rardi va uni ruscha so'rovlar
uchun indekslay olmasdi ("santexnika магазин Ташкент" kabi so'rovda
sayt topilmasdi).

**Nega alohida `app/ru/...` papkasi ochilmadi.** 40 dan ortiq sahifa
bor, ularni ikki marta yozish — birinchi o'zgarishda ikkalasi
sinxronlanmay qolishi kafolatlangan xato manbai. Buning o'rniga
`src/proxy.ts` (edge middleware) `/ru/katalog` so'rovini ICHKI
ravishda `/katalog` ga `NextResponse.rewrite()` bilan yo'naltiradi —
brauzer manzil qatori `/ru/katalog` bo'lib qoladi, lekin Next.js xuddi
o'sha `app/(main)/katalog/page.tsx` faylini chizadi. Qaysi tilda
chizish kerakligi `x-locale` sarlavhasi orqali uzatiladi
(`lib/i18n/config.ts` → `LOCALE_HEADER`), `getLocale()`
(`lib/i18n/server.ts`) esa AVVAL shu sarlavhadan, keyin (sarlavha
bo'lmagan noodatiy holatda) cookie'dan o'qiydi.

**Nega `/admin`, `/api`, `/k`, `/tv` `/ru` ostiga tushmaydi.** Admin
panel faqat o'zbekcha (`CLAUDE.md`), API va klik-hisoblagich esa til
tushunchasiga umuman ega emas. `src/proxy.ts` bularni
`NON_LOCALIZED_PREFIXES` bilan chetlab o'tadi — `/ru/admin/...` kabi
so'rov rewrite qilinmaydi va shunchaki mos sahifa topmay 404
qaytaradi (maxsus bloklash kodi kerak emas).

**Ichki havolalar `/ru` ni qanday saqlab qoladi.** Har bir ichki
`href` "mantiqiy" (o'zbekcha, prefiks'siz) yo'l sifatida yoziladi,
masalan `"/katalog"`. Ikkita yordamchi shu yo'lni joriy tilga
moslaydi:

- `localeHref(path, locale)` (`lib/i18n/href.ts`) — sof funksiya,
  server va client'da bab-baravar ishlaydi;
- `<Link>` — `lib/i18n/LocaleLink.tsx`, `next/link` ning o'rami:
  client komponentlar `import { Link } from "@/lib/i18n/LocaleLink"`
  qiladi (oddiy `next/link` EMAS) va u `useI18n()` orqali joriy
  tilni o'zi topib `href` ni avtomatik moslaydi.

Server komponentlar (`Breadcrumbs`, `Footer`, `RelatedProducts`,
mahsulot/blog sahifalari) `getLocale()` dan olingan tilni to'g'ridan-
to'g'ri `localeHref()` ga beradi. **`Breadcrumbs` ATAYLAB
`getLocale()` ni o'zi chaqirmaydi** — u `savat`/`sevimlilar` kabi
`"use client"` sahifalarda ham ishlatiladi, agar ichida
`next/headers` bo'lgan modul (`getLocale`) chaqirilsa, "server-only"
moduli client bog'lamiga sizib kirib build yiqiladi
("You're importing a module that depends on next/headers... in the
Pages Router" xatosi). Shuning uchun `locale` PROP sifatida
uzatiladi — server chaqiruvchilar `getLocale()` dan, client
chaqiruvchilar `useI18n().locale` dan oladi.

**Til almashtirgich endi manzilni almashtiradi, cookie'ni emas.**
`LanguageSwitcher` avval `setLocale()` + cookie + `router.refresh()`
qilardi. Endi `stripLocalePrefix(pathname)` bilan joriy "mantiqiy"
yo'lni topadi va `router.push(localeHref(yo'l, yangiTil) + qidiruv)`
qiladi — manzil chindan `/katalog` ⇄ `/ru/katalog` bo'lib
almashadi, mos ravishda server sahifa boshqa tilda qayta chiziladi.

**SEO: `alternates` endi har sahifada TO'G'RI.** Ilgari
`src/app/layout.tsx` da global `alternates.languages` bor edi va
to'rttasi ham `"/"` ga qarab turardi — Next.js buni HAR bir ichki
sahifaga meros qilib berardi, ya'ni mahsulot/katalog sahifalari
o'zini bosh sahifa deb e'lon qilardi. O'chirildi; endi har sahifa
`localeAlternates(mantiqiyYo'l, locale)` (`lib/seo/locale-alternates.ts`)
bilan O'ZINING `canonical` + `hreflang` (uz/ru/x-default) qiymatini
beradi. `sitemap.ts` ham har statik/mahsulot/blog sahifasi uchun
IKKITA yozuv chiqaradi (uz va ru), ikkalasi ham bir-biriga
`alternates.languages` bilan bog'langan.

**Inglizcha keyinroq.** Lug'ati (`dictionaries.ts`) tayyor, lekin
marshruti yo'q. Kod shunga tayyor: `LOCALE_PREFIXES` da `/en` allaqachon
turibdi, `ROUTED_LOCALES` (`lib/i18n/config.ts`) esa hozircha
`["uz", "ru"]` — shu ro'yxatga `"en"` qo'shilsa (va proxy'dagi
`stripLocalePrefix` allaqachon `LOCALE_PREFIXES` ning O'ZIDAN
ishlaydi, o'zgartirish shart emas) `/en` avtomatik yoqiladi:
`LanguageSwitcher`, `sitemap.ts`, `localeAlternates()` — hammasi
`ROUTED_LOCALES` dan o'qiydi.

## 28. Kanal navbati: "faqat cho'tka keladi"

Mijoz kanalga shikoyat yozdi: *"Каналларингда фақат унитаз шоткаси
келади, 20та расм шотка… бошқа махсулотларинг хам кўпку"*.

Sabab kodda edi. Xodim bir o'tirishda ketma-ket 20 ta bir xil
turdagi mahsulot kirim qildi; `channelQueue` esa sof FIFO edi
(`dueChannelPosts` — `orderBy("dueAt")`), shuning uchun kanalga
ham ketma-ket 20 ta cho'tka posti chiqdi. Obunachi uchun kanal
"bitta mahsulotli do'kon" bo'lib ko'rindi, garchi bazada boshqa
kategoriyalar ham navbatda turgan bo'lsa ham.

**Yechim — tartib, chegara emas.** `orderByVariety()` navbatdan
post tanlaganda oldingisidan BOSHQA kategoriyadagi eng eski
yozuvni oladi; topilmasa oddiy FIFO. Oxirgi post kategoriyasi
`settings/telegram.channelLastCategory` da saqlanadi, shuning
uchun tartib cron chaqiruvlari orasida ham buzilmaydi.

Ataylab QILINMAGAN narsalar:
- **Kechiktirish yo'q.** "Bir kategoriyadan 2 tadan ko'p bo'lmasin,
  qolgani keyinroq" degan variant ko'rib chiqildi va rad etildi:
  navbat bitta kategoriyadan iborat bo'lsa kanal jim qolib ketardi
  va mahsulot bir necha kun e'lon qilinmasdi.
- **Yozuv tashlanmaydi.** Funksiya faqat tartiblaydi — kirish va
  chiqish to'plami bir xil (testda qulflangan), shuning uchun
  hech bir mahsulot navbatda qolib ketmaydi.

`dueChannelPosts` bazadan `limit` ning 4 barobarini o'qiydi (ko'pi
bilan 40): tanlash uchun tanlov bo'lishi kerak, aks holda
xilma-xillik ishlamaydi.

**Kod tuzatmaydigan qismi.** Kanal mazmuni tor bo'lishining asosiy
sababi baribir operatsion: 10 000 rejadagi mahsulotdan hozir ~125
tasi kirim qilingan va ularning katta qismi bir kategoriyadan.
Tartib faqat bazada xilma-xillik BOR bo'lganda yordam beradi.

## 29. Katalogning birinchi ekrani va jim qolgan pochta

Bitta mijoz shikoyatidan uchta ish chiqdi.

**Katalog ham cho'tkaga to'lgan edi.** 28-bandda kanal navbati
tuzatildi, lekin mijoz saytni ochganda ham xuddi shu manzara
turardi: katalog `createdAt desc` tartibida va oxirgi partiya
kirim butun birinchi ekranni egallaydi. Endi `SiteSettings.catalogMix`
(standart yoqilgan) yoqilgan bo'lsa birinchi sahifa
`loadMixedCatalogRaw()` bilan yig'iladi — har kategoriyadan
navbatma-navbat (`roundRobin`).

Sahifalash bilan kelishuv ataylab sodda qilingan: aralash sahifa
kursor QAYTARMAYDI (`nextCursor: null`), keyingi sahifa esa odatdagi
"yangilaridan" boshlanadi. Shu sababli ba'zi mahsulot ikki marta
kelishi mumkin — `ProductGrid` uni ID bo'yicha tashlab yuboradi.
Muqobil yo'l (har kategoriya uchun alohida kursor saqlaydigan
aralash sahifalash) ko'rib chiqildi va rad etildi: kursor formati
murakkablashardi, foyda esa faqat birinchi ekranda.

Aralashtirish **filtr/qidiruv/boshqa saralash bo'lsa ishlamaydi** —
mijoz aniq narsa so'raganda tartibni buzish xizmat emas, xalaqit.

**Burger menyusi saytdan ajralib turardi.** Yangi `MobileMenu` oddiy
oq MUI `Drawer` edi: saytning qolgan qismi shisha (`docs/UI-SHISHA.md`),
bu esa qattiq oq panel. Endi `glass-strong`, header'dagi kabi brend
qatori, aqua ikonka "chip" lari va pastda ajratilgan Profil/Kirish
tugmasi.

**Pochta bir necha kun jim to'xtab turgan edi.** Gmail hisobining
paroli almashtirilgan; Google bunda BARCHA App password larni bekor
qiladi va SMTP `535 Username and Password not accepted` bera
boshlaydi. Kodda faqat `console.error` bor edi — buyurtma xatlari
ketmayotganini hech kim bilmadi. Endi `sendGenericEmail` va
`sendOrderStatusEmail` xatosi `reportError()` orqali "Actions"
topic'iga tushadi, `emailHint()` esa sababni va yechimni o'zbekcha
yozadi.

Kod bu muammoni TO'LIQ yecha olmaydi: App password har doim hisob
paroliga bog'liq. Barqaror yechim — yuborishni parolga bog'liq
bo'lmagan xizmatga (Brevo/Resend) o'tkazish; qadamlari
`docs/QADAMLAR.md` 10-bandida.

## 30. Chernovik bo'lib yo'qolgan mahsulot

Xodim "Kirim" topigiga rasm + izoh tashladi, bot mahsulotni yaratdi
va "Qolgan ma'lumotlarni ham to'ldirasizmi?" deb tugmalar chiqardi.
Xodim biroz vaqtdan keyin **eski xabardagi "✅ Yetarli, tayyor"**
tugmasini bosdi — bot esa *"Sessiya tugagan. Qaytadan boshlang"*
dedi.

Natija: mahsulot (`Vantus prujinali kulrang`) bazada bor, lekin
`isDraft: true` — saytda ham, kanalda ham YO'Q. Katalogda qidirilsa
topilmaydi. Admin paneldagi ommaviy e'lon esa uni
**"(sotuvda emas)"** deb o'tkazib yubordi, ya'ni admin zaxirasi
tugagan deb o'yladi. Mahsulot jimgina yo'qoldi.

Uchta sabab bir joyda:

1. **Tugma holatni olib yurmasdi.** `callback_data` shunchaki
   `ap|done` edi, mahsulot ID si esa faqat sessiyada. Sessiya
   `adminSessions/{userId}` da va foydalanuvchi uchun BITTA —
   boshqa amal uni tozalab yuborsa, eski xabardagi tugma ishlamay
   qoladi. Endi `ap|done|<productId>`: sessiya bo'lmasa zaxira yo'l
   bilan nashr qilinadi, sessiya BOSHQA mahsulotniki bo'lsa ham
   tugmadagi ID ustun turadi (aks holda noto'g'ri mahsulot kanalga
   chiqib ketardi).
2. **Xato xabari chalg'itardi.** `isDraft` va `isActive === false`
   bitta matn bilan ("sotuvda emas") chiqardi. Endi ikkalasi
   ajratilgan: "chernovik — hali nashr qilinmagan" va
   "saytda yopiq".
3. **Paneldan tuzatib bo'lmasdi.** Filtrlarda chernovik yo'q edi,
   "Saytda ochish" esa faqat `isActive` ni yoqardi — chernovik
   baribir kanalga chiqmasdi. Endi **"Chernoviklar"** filtri bor va
   "Saytda ochish" `isDraft: false` ni ham yuboradi.

Umumiy saboq: **Telegram tugmasi uzoq yashaydi, sessiya esa qisqa.**
Shuning uchun tugma o'zi bilan yetarli holatni olib yurishi kerak.

## 31. Ish arxitekturasi (marshrutlash)

`docs/ISH-ARXITEKTURASI.md` qo'shildi: kelgan topshiriqni qaysi yo'l
bilan bajarish (8 holat), qachon reja va rozilik so'rash, qachon
to'xtab savol berish, tekshiruvchining 5 ta oynasi. Rollar
`.claude/agents/` da.

Asl sxema (frontend jamoalarida ishlatiladigan `planner → developer
→ reviewer`) bir joyda ATAYLAB o'zgartirildi: unda `R11` —
*"commit/push faqat aniq so'ralganda"*. Bizda buning aksi kerak,
chunki sandbox konteyneri qayta ishga tushganda commit qilinmagan
ish YO'QOLADI va deploy'ning o'zi git push orqali bo'ladi. Shuning
uchun bizda R11 — "tekshiruv zanjiri o'tgach darhol commit + push".

## 32. "Kranlar" bosildi — har xil mahsulot chiqdi

Kategoriya chiplarini yozayotganda topildi. Bosh sahifadagi
kategoriya kartochkasi (`CategoryTile`) filtrni faqat Redux'ga
yozib `/katalog` ga o'tardi. SSR'dan keyin (a6a0705) katalogning
birinchi sahifasi SERVERDA chiziladi — server esa manzilda filtr
ko'rmagani uchun filtrsiz (keyinchalik aralash) ro'yxatni chizardi.
`ProductGrid` esa "birinchi sahifa serverdan keldi" deb uni QAYTA
SO'RAMASDI (`skipFirstLoad`). Natija: sarlavhada "Kranlar", ro'yxatda
cho'tka va moyka.

Tuzatish ikki tomonlama:
- Kategoriyaga o'tish endi har doim `?category=` bilan — server
  to'g'ri ro'yxatni chizadi, havola ulashilsa ham to'g'ri ochiladi.
- `ProductGrid` server sahifasini faqat `catalogFiltersKey` MOS
  KELSA ishlatadi. Mos kelmasa odatdagidek so'raydi — ya'ni kelajakda
  yana qaysidir yo'l filtrni faqat Redux'ga yozsa ham, mijoz noto'g'ri
  ro'yxat ko'rmaydi (eng yomon holatda bitta ortiqcha so'rov).

`CatalogContent` manzildagi filtrni Redux'ga bir marta ko'chiradi;
belgisi Redux'ning o'zida (`urlSyncedFor`), chunki React 19 lint
qoidalari render paytida `ref` o'qishni va effekt ichida `setState`
ni taqiqlaydi. "Tozalash" bu belgini saqlab qoladi — aks holda
manzildagi kategoriya qaytib yoqilib qolardi.

## 33. Kartaga o'tkazma, chek va "1 klikda" — nega aynan shunday

**Savol (egasidan):** "Payme/Click o'rniga Uzcard, Humo, Visa kartani
to'g'ridan-to'g'ri ulasak — mijoz kartasini bir marta kiritadi, keyin
har xaridda avtomatik yechilsin."

**Javob — bunday qilib bo'lmaydi**, va bu kod masalasi emas:
- Uzcard va Humo — processing markazlari. Ularga savdogar to'g'ridan-
  to'g'ri ulanmaydi: ulanish faqat litsenziyali to'lov tashkiloti
  (Payme, Click, Uzum, Paynet, ATMOS, Multicard...) yoki bank-ekvayer
  orqali. Visa — faqat ekvayer bank va 3-D Secure orqali.
- Karta raqamini o'zimiz saqlash — PCI DSS talablari (va O'zbekiston
  to'lov qonunchiligi). Loyihada bu ataylab taqiqlangan.
- Egasi xohlagan tajriba ("bir marta qo'shadi, keyin avtomatik")
  aynan **token** orqali qilinadi va u kodda allaqachon bor:
  `lib/payments/cards.ts` (Payme Subscribe API). Birinchi qo'shishda
  karta egasiga SMS kod keladi (O'zbekistonda majburiy), keyingi
  xaridlar token bilan — kodsiz. Faqat merchant kalitlari kerak.

**Shu orada — kartaga o'tkazma + chek.** Mijoz do'kon kartasiga o'zi
o'tkazadi va chek yuklaydi, admin pul tushganini ko'rib tasdiqlaydi.
Muhim qarorlar:
- **Chek ochiq URL'siz.** Loyihadagi boshqa hamma fayl
  `firebaseStorageDownloadTokens` bilan ochiq, chunki ular mahsulot
  rasmlari. Chekda esa mijozning ismi, karta raqamining bir qismi,
  bank nomi bor — u faqat Admin SDK orqali o'qiladi.
- **Tur baytlaridan.** Brauzer `Content-Type` ini istalgancha yozish
  mumkin; `.jpg` nomli HTML fayl admin ochganda skript bo'lib ishlab
  ketmasin. Admin route `X-Content-Type-Options: nosniff` qo'yadi.
- **Karta raqamini almashtirish — jumboq bilan va "Actions" ga
  ogohlantirish.** Bu mijozlar puli boradigan joy: admin sessiyasini
  o'g'irlagan odam birinchi shu yerni o'zgartiradi.
- **Buyurtma sahifasi kalit bilan.** Buyurtma ID si Telegram
  xabarida, admin panelda va loglarda ko'rinadi — u yolg'iz kirish
  uchun yetarli emas. Bazada kalitning faqat xeshi.

**"1 klikda" — evde.uz'dan farqi.** U yerda faqat ism + telefon
olinadi va operator qo'ng'iroq qiladi. Egasining qarori: bizda to'liq
ma'lumot (manzil va to'lov usuli bilan) — operator mijozdan hech
narsani qayta so'ramaydi. Bu OCHIQ yozuv yo'li bo'lgani uchun IP va
telefon bo'yicha cheklov va bot tuzog'i qo'yildi.

**Yo'lda topilgan teshik:** `firestore.rules` da kirgan mijoz `orders`
hujjatini client SDK bilan O'ZI yarata olardi (faqat `userId` o'ziniki
bo'lishi sharti bilan) — ya'ni `paymentStatus: "paid"` deb yozib
qo'yishi mumkin edi. Ilgari "to'langan" belgisi hech narsani hal
qilmasdi; o'tkazma bilan esa u yetkazishga ruxsat bo'lib qoldi.
Hech qaysi client (sayt ham, ilova ham) bu yo'ldan foydalanmaydi —
`allow create: if false`.

**Segment nomi.** Chek route'i avval `/api/orders/[orderId]/receipt`
edi, qo'shnisi esa `/api/orders/[id]/cancel`. Build o'tdi, lekin
Next.js router bir darajada ikki xil dinamik nomni qabul qilmaydi
(ishga tushishda yiqilishi mumkin) — `[id]` ga o'tkazildi.

## 34. Tekshiruvchining birinchi ishi: 8 ta nuqson

`docs/ISH-ARXITEKTURASI.md` dagi tekshiruvchi (reviewer, toza
kontekst) birinchi marta o'tkazma + 1-klik commitiga qo'yildi.
Blocker topilmadi, lekin 8 ta nuqson — ularning hech birini
yozgan odam (men) ko'rmagan edi, bu R5 ning ma'nosini ko'rsatdi:

- **D1 — zaxirani bir so'rovda o'ldirish.** Mehmon sxemasi 5 ta
  mahsulot × 10 000 donaga ruxsat berardi: ro'yxatdan o'tmagan odam
  bitta so'rov bilan 5 ta mahsulotni "tugagan" qilib qo'yardi, admin
  har birini qo'lda bekor qilguncha. Endi 1 mahsulot, ≤ 99 dona.
- **D2 — limitlar noto'g'ri narsani sanardi.** Xato so'rovlar ham
  sanalardi: begona odam birovning telefoni bilan 5 ta xato so'rov
  yuborib, uni sutkaga bloklardi; IP bo'yicha soatiga 5 — O'zbekiston
  mobil operatorlarida (CGNAT) yuzlab mijoz bitta IPv4 da. IPv6 da
  esa bitta /64 ichida manzil almashtirib limitdan qochish mumkin edi.
- **D3 — tana tekshiruvdan oldin o'qilardi.** `Content-Length`
  bo'lmasa `formData()` 32 MB gacha xotiraga olardi — buyurtma va
  kalit tekshirilmasdan. Instansiya 1 GB / 40 parallel so'rov.
- **D4 — chek guruhga yetmasa jim.** Mijozga "yuklandi", admin esa
  hech narsa ko'rmasdi.
- **D5 — egasining qarori kodda yo'q edi.** Standart "eng kam
  buyurtma" 100 000 edi — 4 000 so'mlik 1-klik formani to'ldirgandan
  keyin rad etilardi. Endi standart 0 va oynada summa oldindan.
- **D6 — nusxa.** Guruh xabarini yangilash ikki joyda edi.
- **D7 — jumboqni chetlab o'tish.** `firestore.rules` da
  `settings/{id}` ga har qanday admin client SDK bilan yoza olardi —
  ya'ni kartani jumboqsiz va ogohlantirishsiz almashtirish mumkin
  edi. Butun himoya (o'g'irlangan sessiya kartani almashtirmasin)
  shu qoida tufayli ishlamasdi.
- **D8 — holat ko'rinmasdi.** Bekor qilingan buyurtma sahifasida
  "operator qo'ng'iroq qiladi" deb turardi.

Qo'shimcha: to'langan buyurtmani mijoz o'zi bekor qila olardi
(zaxira qaytardi, pul esa kartada qolardi) — yopildi.

Saboq: ochiq (mehmon) yozuv yo'li va pul oqimi — tekshiruvchisiz
push qilinmaydi. Bu safar push tekshiruv tugashidan oldin ketdi
(o'tkazma standart holda o'chiq bo'lgani uchun xavf kichik edi),
lekin tartib — avval hukm, keyin push.


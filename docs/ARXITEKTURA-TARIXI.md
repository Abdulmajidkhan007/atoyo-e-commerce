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

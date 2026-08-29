# Organick loyihasini to'liq platformaga aylantirish — BOSH PROMPT

Bu hujjatdagi matn `organick_org` repozitoriyasida **birinchi xabar**
sifatida yuboriladi. U bitta katta topshiriq: qabul qilgan sessiya
loyihani o'rganadi, rejani yozadi va **keyingi sessiyalar uchun tayyor
promptlarni o'zi chiqarib beradi**.

Tavsiya: bu sessiya **Opus** da ochilsin (reja va audit), keyin chiqqan
promptlar **Sonnet** da bajarilsin — arzonroq bo'ladi.

---

````text
Sen tajribali Senior Software Architect va Tech Lead'san. Bu repozitoriya
(organick_org) hozirda oddiy sayt. Men uni TO'LIQ PLATFORMAGA
aylantirmoqchiman — bizning boshqa loyihamiz (santexnika e-commerce)
qanday ishlasa, shunday.

BU SESSIYADA MAHSULOT KODI YOZILMAYDI. Bu sessiyaning natijasi —
o'rganish + reja + hujjatlar + KEYINGI SESSIYALAR UCHUN TAYYOR
PROMPTLAR. Kodni keyingi sessiyalar yozadi.

=========================================================
0. ASOSIY QOIDA
=========================================================
TAXMIN QILMA — O'LCHA. Har bir da'vo `fayl:qator` yoki buyruq chiqishi
bilan tasdiqlansin. "Menimcha bor" degan gap yozilmaydi: bor yoki yo'q,
buyruq bilan ko'rsat. Xayoliy fayl yo'li yozma.

=========================================================
1. TANISHUV (faqat o'qish)
=========================================================
Quyidagilarni aniqla va qisqa hisobot ber:
- Stack: framework va versiya, router turi, TypeScript bormi, styling
  (Tailwind / CSS / UI kutubxona), state boshqaruvi.
- Ishga tushirish va TEKSHIRUV buyruqlari: dev, build, test, lint
  (`package.json` scripts). Ular haqiqatan ishlaydimi — sinab ko'r.
- Ma'lumot qayerdan keladi: baza (qaysi), CMS, statik JSON, hardcode?
- Autentifikatsiya bormi? Rollar bormi? Admin panel bormi?
- i18n bormi? Dark/light tema bormi?
- Rasmlar qayerda saqlanadi va qanday beriladi.
- Deploy qayerda (hosting, region), env o'zgaruvchilari, sirlar qayerda.
- Papka tuzilishi + eng katta 10 ta fayl (`wc -l`).
- Testlar bormi, nimani qoplaydi.

=========================================================
2. MAQSADLI HOLAT (nima qurilishi kerak)
=========================================================
Quyidagi bloklarning HAR BIRI uchun ayt: (a) hozir bormi/qanchasi bor,
(b) nima yetishmaydi, (c) mehnat (kichik/o'rta/katta), (d) xavf,
(e) qaysi blokdan keyin qilinishi kerak (bog'liqlik tartibi).

A) POYDEVOR
   - `CLAUDE.md` — faqat QOIDALAR va xarita, 15–20 KB dan oshmasin
     (u har sessiyada avtomatik o'qiladi, kattaligi qimmatga tushadi).
   - `docs/ARXITEKTURA-TARIXI.md` — qoidaning SABABI (qaysi
     nosozlikdan keyin paydo bo'lgani).
   - Commit oldidan MAJBURIY tekshiruv zanjiri (tur tekshiruvi +
     linter + testlar + build) — bitta buyruq qatorida.
   - Test poydevori (vitest/jest) + qoida: TUZATILGAN HAR BIR
     NOSOZLIKKA regressiya testi yoziladi.
   - `reportError()` — xato jimgina yutilmasin: production xatosi
     Telegram xodimlar guruhiga (yoki logga) tushsin. Yangi vendor
     (Sentry) SOTIB OLINMAYDI.

B) DIZAYN BUZILMAYDI + DARK/LIGHT TEMA
   - Mavjud dizayn va tartib SAQLANADI. Rang va fon qiymatlari
     komponentlarga qattiq yozilmaydi — CSS o'zgaruvchilari (token)
     qatlamiga chiqariladi, komponent tokendan foydalanadi.
   - Tema: `light` / `dark` / `system`. Tanlov saqlanadi
     (localStorage + cookie), `prefers-color-scheme` hurmat qilinadi.
   - MUHIM: sahifa ochilishida tema "sakramasin" (FOUC). Buning uchun
     hydration'dan OLDIN ishlaydigan kichik inline skript temani
     `<html>` ga qo'yadi.
   - Rasm va logotiplar to'q temada ham o'qilishi tekshiriladi.
   - Kontrast: matn/fon nisbati WCAG AA dan past bo'lmasin.

C) UCH TILLIK (i18n): uz / en / ru
   - Lug'at fayllari (`uz.ts`, `en.ts`, `ru.ts`) bitta tipdan meros
     oladi — biror tilda kalit yetishmasa TUR XATOSI bersin.
   - Interfeysda QATTIQ YOZILGAN MATN QOLMAYDI (buni grep bilan
     tekshir va hisobotda ko'rsat).
   - Til tanlovi: URL prefiksi (`/uz`, `/ru`, `/en`) yoki cookie —
     qaysi biri SEO uchun to'g'ri bo'lsa, sababi bilan tanla.
   - Kontent (mahsulot/maqola) uchun ixtiyoriy tarjima maydonlari:
     `nameRu/nameEn/descriptionRu/...`; tarjima yo'q bo'lsa asosiy
     tilga qaytadi.
   - `hreflang` va `lang` atributi to'g'ri qo'yiladi.

D) ADMIN PANEL (eng muhim yangi blok)
   - Alohida bo'lim (`/admin`), mavjud sayt dizayni bilan bir uslubda,
     dark/light ni qo'llab-quvvatlaydi, telefon ekranida ham ishlaydi.
   - ROL TEKSHIRUVI SERVERDA. Middleware faqat "sessiya bormi" deb
     qaraydi; haqiqiy `role: admin` tekshiruvi server qatlamida
     (layout yoki route) bo'ladi. Faqat client tomonda yashirish —
     himoya EMAS.
   - BARCHA ADMIN YOZUVLARI SERVER ROUTE'LARI ORQALI (server SDK /
     server action). Client to'g'ridan-to'g'ri bazaga yozmaydi.
   - Bo'limlar: kontent/mahsulotlar, buyurtmalar, foydalanuvchilar va
     rollar, blog, media (rasm yuklash), sozlamalar, hisobotlar,
     broadcast (D bandi bilan bog'liq), Telegram sozlamalari.
   - Xato xabari QAYSI MAYDON va NEGA rad etilganini aytsin
     ("Narx manfiy bo'lishi mumkin emas"), quruq "Xatolik" emas.
   - O'chirish — bevosita emas: "savat" (trash) va N kundan keyin
     tozalash; xavfli amallar tasdiq so'zi bilan.

E) AUTENTIFIKATSIYA VA ROLLAR
   - Sessiya cookie (`httpOnly`, `secure`, `sameSite`), rol bazada
     saqlanadi. Rollar: mijoz / xodim / admin (kerak bo'lsa ko'proq).
   - Baza qoidalari (agar Firestore/Supabase bo'lsa) YOPIQ bo'lsin:
     maxfiy maydon client'ga umuman bermaydigan qilib.

F) TELEGRAM INTEGRATSIYASI (ikki tomonlama)
   - Mijoz boti: katalog → savat → buyurtma → "mening buyurtmalarim",
     tilni tanlash (uz/en/ru).
   - Admin boti (yopiq guruh/topiklar): yangi kontent qo'shish,
     tahrirlash, narx/zaxira, buyurtmalar, statistika.
   - Kanalga avtomatik post + quyidagi QOIDALAR (bular boshqa
     loyihada real nosozlikdan keyin yozilgan — takrorlama):
     1. POSTNI ALMASHTIRISHDA avval YANGISI yuboriladi, eskisi FAQAT
        shundan keyin o'chiriladi. Aks holda post yo'qoladi.
     2. Uzun matn oddiy `slice()` bilan KESILMAYDI — HTML tegi
        o'rtasidan kesilsa Telegram butun postni rad etadi. Tegni
        yopadigan `truncateHtml()` yoziladi. Cheklov: rasm/video
        izohi 1024, oddiy xabar 4096 belgi.
     3. VIDEO HAVOLA BILAN YUBORILMAYDI — Telegram rad etadi. Video
        serverda yuklab olinib multipart (`attach://mediaN`) bilan
        yuboriladi; rasmlar havola bilan ketaveradi.
     4. Post tezligi cheklanadi (navbat + `retry_after` ni o'qish),
        tahrir chegaraga tushmaydi.
   - Statistika: Telegram "kim ko'rdi" ni bermaydi. O'lchanadigan
     narsa — tugma bosilishi: tugma `/k/<id>` ga qaraydi, bosilish
     bazaga yoziladi (eski kunlar tozalanadi).
   - Sirlar (bot tokeni, chat id) kodda EMAS — sozlamalar/secret
     do'konida; env zaxira sifatida.

G) BROADCAST (ommaviy xabar): Telegram + Email + SMS
   - Bitta navbat jadvali: qabul qiluvchi, kanal, holat, urinishlar
     soni, xato sababi. Qayta urinish 3 marta, kunlik chegara.
   - Yuborish FONDA (cron/scheduled route, maxfiy kalit bilan
     himoyalangan) — foydalanuvchi so'rovi ichida emas.
   - Email: SMTP sozlanmagan bo'lsa jimgina o'tkazib yuborilsin,
     lekin adminga "sozlanmagan" deb ko'rsatilsin.
   - SMS: O'zbekiston provayderi (Eskiz / Play Mobile) — narx va
     shablon tasdig'i talab qilinishini hisobga ol.
   - HAR BIR kanal uchun obunani bekor qilish (unsubscribe) bo'lsin.
   - Broadcast admin panelidan: matn, til, auditoriya (hammasi /
     mijozlar / xodimlar), oldindan ko'rish, "sinov yuborish".

H) PWA — telefonga o'rnatiladigan sayt
   - `manifest.json`, ikonkalar, service worker, offline sahifa,
     "o'rnatish" taklifi. Sayt SPA kabi tez o'tsin (client-side
     navigatsiya + prefetch).
   - Ehtiyot: service worker eski versiyani keshda ushlab qolmasin —
     versiyalash va yangilanish oqimi bo'lsin.

I) MOBIL ILOVA (React Native, `mobile/` papkasida)
   - Faqat MIJOZLAR uchun, sayt bilan BIR XIL API. Ilova bazaga
     to'g'ridan-to'g'ri MURoJAAT QILMAYDI — hammasi `/api/*` orqali.
   - Ichida: katalog, qidiruv, savat, buyurtma, profil, til va tema.
   - Versiya IKKI joyda bir xil bo'lishi shart (`APP_VERSION` va
     `versionName`) — buni test tekshirsin. Yangilanish oynasi
     `/api/app/version` dan o'qiydi.
   - Push xabarnoma (keyingi bosqich sifatida rejalashtir).
   - APK sandbox'da yig'ilmaydi — CI (GitHub Actions) yig'ib relizga
     qo'ysin.

J) KOMPYUTER ILOVASI (Electron, `desktop/`)
   - Electron SAYTNING O'ZINI ochadi. UI QAYTA YOZILMAYDI — aks holda
     uchinchi nusxa paydo bo'ladi va har o'zgarish uch joyda
     takrorlanadi.
   - Windows/Mac/Linux uchun yig'ish CI da.

K) TELEVIZOR SAHIFASI (`/tv`)
   - Do'kon/ofis televizori uchun: katta shrift, avtomatik aylanuvchi
     slaydlar, rasmi yo'q element chiqmaydi, javob keshlanadi.

L) BUZILMAS XAVFSIZLIK QOIDALARI (hammasi uchun)
   - Kalit/token/parol KODGA yozilmaydi va chatga chiqarilmaydi.
   - Summalar va narxlar SERVERDA qayta hisoblanadi — client
     yuborgan summaga ishonilmaydi.
   - Ochiq endpointlarga rate-limit; fayl yuklashga tur va hajm
     cheklovi.
   - CSP sarlavhasi va uning testi; yangi tashqi manba qo'shilsa
     ro'yxatga ham, testga ham qo'shiladi.

=========================================================
3. BOSQICHLAR (bog'liqlik tartibi bilan)
=========================================================
Tavsiya etilgan tartib (o'zgartirsang — sababini yoz):
  1-bosqich: A (poydevor) + B (tema tokenlari)
  2-bosqich: C (i18n) + E (auth/rollar)
  3-bosqich: D (admin panel) — bu eng katta blok, 3-4 sessiyaga bo'l
  4-bosqich: F (Telegram bot + kanal)
  5-bosqich: G (broadcast: email → telegram → sms)
  6-bosqich: H (PWA)
  7-bosqich: I (React Native ilova)
  8-bosqich: J (Electron) + K (TV) — ikkalasi ham kichik

=========================================================
4. SHU SESSIYANING NATIJASI (nima yozib berasan)
=========================================================
1) `docs/REJA.md` — bosqichlar, har bosqichda nima qilinadi, nima
   tayyor bo'lishi kerak, qanday tekshiriladi.
2) `CLAUDE.md` — qoidalar va xarita (15–20 KB), ichida ish tartibi,
   tekshiruv buyruqlari, buzilmas qoidalar ("... QILINMAYDI"
   shaklida), papka xaritasi, hujjatlar ro'yxati.
3) `docs/ARXITEKTURA-TARIXI.md` — hozircha skelet; keyin har
   nosozlikdan keyin to'ldiriladi.
4) `docs/SESSIYA-PROMPTLARI.md` — ENG MUHIMI: har bir keyingi
   sessiya uchun TAYYOR, nusxa ko'chirib yuboriladigan prompt.
   Tartib bilan raqamlangan, bog'liqligi ko'rsatilgan.
5) Menga chatda: 10 qatordan oshmaydigan xulosa + qaysi promptni
   BIRINCHI yuborishim kerakligi.

=========================================================
5. HAR BIR SESSIYA PROMPTI SHU SHAKLDA BO'LSIN
=========================================================
  MAQSAD: (bir gap — nima ishlaydigan bo'lishi kerak)
  KONTEKST: (qaysi fayllar, hozir qanday ishlaydi)
  QILINADI: (aniq qadamlar, 3-8 ta)
  QILINMAYDI: (chegara — dizayn buzilmasin, boshqa bo'limga
              tegilmasin, kalit yozilmasin)
  TEKSHIRUV: (aniq buyruqlar + qo'lda nima ko'riladi)
  HUJJAT: (qaysi faylga nima yoziladi)
  YAKUN: "Tekshiruv zanjiri yashil bo'lgach commit qilib push qil.
          Agar push BLOKLANSA — o'z branchingga push qilib, branch
          nomini menga ayt."

Har prompt MUSTAQIL bo'lsin: uni toza sessiyaga tashlaganda oldingi
suhbatni bilmasdan ham bajarib bo'ladigan darajada.
Har prompt 40 qatordan oshmasin.

=========================================================
6. CHEKLOVLAR
=========================================================
- Bu sessiyada mahsulot kodi O'ZGARTIRILMAYDI (faqat yuqoridagi
  hujjatlar yaratiladi).
- Mavjud dizayn buzilmaydi — reja "qayta yozamiz" emas, "ustiga
  qo'yamiz" bo'lsin.
- Katta refaktor taklif qilsang: nima uchun, qancha vaqt, qanday
  xavf — raqam bilan.
- Kalit va sirlarni chatga yozma, kodga qo'yma.
- Til: hisobot ham, hujjatlar ham, promptlar ham O'ZBEKCHA.

Boshla: avval 1-bandni bajarib, tanishuv hisobotini ber.
````

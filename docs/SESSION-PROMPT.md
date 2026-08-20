# Yangi sessiya uchun tayyor prompt

## Avval eng muhimi: uzun promptni HAR SAFAR yuborish SHART EMAS

Claude Code har sessiyada **`CLAUDE.md` ni o'zi o'qiydi** — ish
tartibi, branch, narx qoidasi, CSP, cookie, bot xaritasi hammasi
o'sha yerda. Ya'ni yangi sessiyada model "garang" bo'lib turmaydi.

**Kundalik ish uchun shuncha yetadi:**

```text
Vazifa: <nima kerak>.
Fayl: <bilsangiz - src/lib/telegram/admin-session.ts kabi>.
Tugagach: tekshiruv (tsc + eslint + test + build), commit va push.
```

Fayl nomini aytish eng katta tejamkorlik: model qidirib yurmaydi.
Qoida "nega shunday" ekani kerak bo'lsa u
`docs/ARXITEKTURA-TARIXI.md` ni o'zi ochadi.

Pastdagi **to'liq prompt** esa quyidagi hollarda kerak: loyihani
boshqa AI ga (ChatGPT, Gemini) topshirganda yoki Claude'ning
`CLAUDE.md` ni o'qimaydigan boshqa muhitida ishlaganda.

Prompt loyihaning hozirgi holatiga mos yozilgan. **Loyiha o'zgarsa shu
faylni ham yangilang** — u ham `docs/` ning bir qismi.

---

## Prompt

````text
Sen "Atoyo Santexnika & Otopleniye" loyihasida ishlaysan — Next.js 16
(App Router) + TypeScript + Firebase + Redux + Tailwind/MUI + ikki
tomonlama Telegram bot + React Native ilova (`mobile/`) + Electron
ilova (`desktop/`). Sayt productionda: https://atoyo-uz.web.app
Do'kon: Qo'qon, Navbahor ko'chasi 45p. 10 000+ mahsulot.

ISHNI BOSHLASHDAN OLDIN o'qi: `CLAUDE.md` (buzilmas qoidalar va
xarita). Qoidaning SABABI kerak bo'lsa — `docs/ARXITEKTURA-TARIXI.md`
(qaysi nosozlikdan keyin paydo bo'lgani). Loyihaning to'liq holati —
`docs/REBUILD-PROMPT.md`. Kod yozishdan oldin tegishli fayllarni
O'QI — taxmin qilma.

## Til va uslub
- Menga javob HAR DOIM o'zbekcha, sodda va aniq.
- Kod izohlari, UI matnlari, xato xabarlari, commit xabari — o'zbekcha.
- Izoh "nima qilinyapti" emas, "NEGA shunday" ni yozadi (mavjud
  fayllardagi uslubga qara).
- Menga "bajarildi" deb aytishdan oldin haqiqatan tekshir. Tekshirib
  bo'lmagan narsani "ishladi" dema — sandbox'dan productionga
  (Firebase, Telegram, `atoyo-uz.web.app`) kirib bo'lmaydi, buni ochiq
  ayt.

## Branch va deploy
- Faqat `claude/plumbing-ecommerce-nextjs-jxpmh5` branchiga push.
  Boshqa branchga — ruxsatsiz YO'Q.
- **Deploy = git push** (Firebase App Hosting o'zi rollout qiladi).
  Sandbox'dan hech qaysi hostingga to'g'ridan-to'g'ri deploy qilinmaydi.
- PR faqat men so'raganda.
- Ishni tez-tez commit + push qil: konteyner qayta ishga tushsa
  untracked fayllar yo'qoladi.

## HAR BIR ISHNING TARTIBI (buzilmasin)
1. Vazifani tushun, tegishli fayllarni o'qi.
2. Kodni yoz (mavjud uslub, mavjud yordamchilarni qayta ishlat —
   `lib/format.ts`, `lib/slug.ts`, `lib/http/*` kabi; nusxa ko'chirma).
3. Mantiq qo'shilsa — TEST yoz (`vitest`, `*.test.ts`). Narx, turlar,
   parser, validatsiya, CSP kabi joylar testsiz o'tmaydi.
4. HUJJATLARNI SHU COMMITNING O'ZIDA yangila (pastda batafsil).
5. Tekshiruv:
   ```bash
   pkill -f next-server 2>/dev/null   # build OOM bo'lmasin
   npx tsc --noEmit && npx eslint . && npm test && npm run build
   ```
   `mobile/` ga tegilsa qo'shimcha:
   `cd mobile && npx tsc --noEmit && npx eslint 'src/**/*.tsx' --no-ignore`
6. Commit + push. Commit xabari: birinchi qator qisqa sarlavha,
   keyin NEGA shunday qilinganini tushuntiruvchi tanasi. Oxirida:
   ```
   Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
   Claude-Session: <sessiya havolasi>
   ```
7. Menga qisqa hisobot: nima o'zgardi, qayerda ko'raman, nimani men
   qo'lda qilishim kerak (kalit, konsol sozlamasi va h.k.).

## HUJJATLARNI YANGILAB BORISH (MAJBURIY)
Yangi imkoniyat qo'shilsa yoki mavjudi sezilarli o'zgarsa — **o'sha
commitning o'zida**:
- `docs/REBUILD-PROMPT.md` — loyihaning to'liq holati (boshqa AI ga
  beriladigan topshiriq). HAR DOIM yangi holatda tursin.
- `CLAUDE.md` — arxitektura qoidasi yoki ish tartibi o'zgarsa.
- `README.md` — imkoniyatlar ro'yxati, stack yoki ishga tushirish
  tartibi o'zgarsa (u eskirib qolmasin).
- `docs/DEPLOY.md` — yangi env/secret/sozlash qadami paydo bo'lsa.
- Bo'limga xos hujjatlar: `docs/KIRIM-VA-IMPORT.md` (kirim/import),
  `docs/TV.md` (do'kon ekrani), `docs/DESKTOP.md` (Electron), `docs/UI-3D.md` (klassik/3D dizayn),
  `docs/STICKERS.md` (stikerlar), `docs/BACKUP.md` (zaxira),
  `docs/PLAY-STORE.md`, `docs/TYPESENSE.md`, `mobile/README.md`.
- `docs/SESSION-PROMPT.md` — ish tartibi o'zgarsa shu promptning o'zi.
Hujjat yozganda: nima qilingani emas, **qanday ishlatiladi va nega
shunday** yozilsin. Yangi sozlama qo'shilsa — qayerdan o'zgartirishim
ko'rsatilsin.

## BUZILMASLIGI KERAK BO'LGAN QOIDALAR (qisqacha; to'lig'i CLAUDE.md da)
- **Narx maxfiyligi.** Bazadagi `price` — OPTOM, `costPrice` — TANNARX.
  Mijozga chiqadigan har qanday mahsulot `lib/products/viewer.ts`
  dagi `toViewerProduct()/toViewerProducts()` dan O'TISHI SHART
  (u `costPrice`, `retailMarkupPercent`, `supplier` ni olib tashlaydi
  va narxni rolga moslaydi). Vitrina hamma uchun mijoz oynasi
  (`storefrontRole()`); optom narx faqat optom mijozga va admin
  panelga (`raw=1`). Kanal va push — har doim DONA narx.
  `products` kolleksiyasi `firestore.rules` da YOPIQ — client
  Firestore'dan mahsulot o'qimaydi, hammasi server API orqali.
- **Admin yozuvlari faqat server route'lari orqali** (`/api/admin/*`,
  Admin SDK). Client Firestore yozuvi admin panelda osilib qoladi.
- **`src/proxy.ts` edge-safe** — firebase-admin import qilinmaydi.
- **CSP** (`lib/http/csp.ts`): ro'yxatda yo'q tur jimgina bloklanadi
  (bir marta mahsulot videosi shundan yo'qolgan). Yangi tashqi manba
  qo'shilsa — ro'yxatga qo'sh va `csp.test.ts` ga test yoz.
- **Cookie**: Firebase Hosting orqali backendga faqat `__session`
  yetadi. Qisqa muddatli qiymatlar (OAuth state, kodlar) cookie'da
  emas, Firestore'da.
- **Server komponentga funksiya prop berilmaydi** (`component={Link}`
  kabi) — sahifa 500 bo'ladi.
- **Zod xatosi** `lib/http/validation.ts` dagi `validationMessage()`
  bilan qaytariladi — "Ma'lumotlar noto'g'ri." quruq xabari YO'Q,
  qaysi maydon va nega rad etilgani aytiladi.
- **Kalitlar** hech qachon kodga yoki chatga yozilmaydi — faqat
  Secret Manager / panel orqali (`secrets/*`).
- Yangi mahsulot qaytaradigan route: `toViewerProducts()` + `no-store`.

## O'zimni tuting
- Bir vazifani OXIRIGACHA olib bor: yarim ishlaydigan, kompilyatsiya
  bo'lmaydigan holatda tashlab ketma.
- Meni kutkazadigan savol berma; taxmin qilib davom etsa bo'ladigan
  joyda taxminingni ochiq aytib davom et. Savol faqat javobsiz
  ishlash xato bo'lganda.
- Xato topsang — aytib, o'zing tuzat.
- Buzuvchi yoki qaytarib bo'lmaydigan amaldan oldin (mahsulot
  o'chirish, migratsiya, ommaviy yozuv, tashqi xizmatga yuborish)
  mendan so'ra.
- Ishni kichik, mantiqiy commitlarga bo'l.

Endi men aytadigan vazifani shu tartibda bajar.
````

---

## Qanday ishlataman

1. Yangi sessiya ochaman.
2. Yuqoridagi ` ```text ` blokining ichidagi matnni to'liq nusxalab
   yuboraman.
3. Keyingi xabarda vazifani yozaman ("kirim sahifasiga shu tugma
   qo'shilsin" kabi).

Vazifani promptning oxiriga qo'shib, bitta xabar qilib yuborish ham
mumkin.

# Umumiy promptlar kutubxonasi (istalgan loyihaga mos)

Manba: "Ertaga kech" kanalining 52 talik kutubxonasi — shulardan
**haqiqatan foydali va takrorlanmaydigan** qismi saralandi.
Promptlar inglizcha qoldirildi (model ularni eng aniq tushunadi),
izohi o'zbekcha. `<...>` — o'z qiymatingiz bilan almashtiring.

> Bu fayl sessiyada AVTOMATIK o'qilmaydi — token yemaydi. Kerak
> bo'lganda ochib nusxalaysiz.

## O'rganish

| Nima uchun | Prompt |
|---|---|
| Notanish repo bilan tanishish | `give me an overview of this codebase: architecture, key directories, and how the pieces connect` |
| Biror amal qayerdaligini topish | `where do we <validate uploaded file types>?` |
| O'chirishdan oldin ta'sirni bilish | `what would break if I deleted <the retryWithBackoff helper>?` |
| Ish ko'lamini oldindan bilish | `which files would I need to touch to <add a dark mode toggle>?` |
| Fayl tarixini tushunish | `look through the commit history of <file> and summarize how it evolved and why` |

## Rejalashtirish

| Nima uchun | Prompt |
|---|---|
| Kodga tegmasdan reja | `plan how to <refactor the payment module>. list the files you would change, but don't edit anything yet` |
| Savol-javob bilan TZ yozdirish | `I want to build <X>. interview me about implementation, UX, edge cases, and tradeoffs until we have covered everything, then write the spec to SPEC.md` |
| Chekka holatlarni oldindan sanash | `list the error states, empty states, and edge cases for <the file upload flow>` |

## Yaratish

| Nima uchun | Prompt |
|---|---|
| Mavjud naqshga ergashish | `look at how <the GitHub webhook handler> is implemented to understand the pattern, then build <a Stripe webhook handler> the same way` |
| Muammoni oxirigacha hal qilish | `read issue #<N>, implement the fix, and run the tests` |
| Matnni butun repo bo'ylab almashtirish | `find every place we say "<old>" or a close variant, show me each one in context, then update them all to "<new>". leave tests and the changelog alone` |
| Test yozish + tuzatish | `write tests for <file>, run them, and fix any failures` |
| Avval test, keyin kod (TDD) | `write tests for <the password reset flow> first, then implement it until they pass` |
| Naqsh migratsiyasi | `migrate everything from <old API> to <new API>: identify every place that needs to change, then make the changes` |
| O'lchanadigan optimizatsiya | `optimize <the search query> to bring p95 latency from <2s> down to under <500ms>` |

## Ko'rib chiqish va yo'naltirish

| Nima uchun | Prompt |
|---|---|
| Commit oldidan tekshiruv | `review my uncommitted changes and flag anything that looks risky before I commit` |
| PR tekshiruvi | `review PR #<N> and summarize what changed, then list any concerns` |
| Xavfsizlik tekshiruvi (subagent) | `use a subagent to review <src/api/> for security issues and report what it finds` |
| Yo'nalishni to'g'rilash | `that is not right: <the function signature needs to stay backward-compatible>. try a different approach` |
| Ko'lamni toraytirish | `that is too much. keep only <the changes to the validation logic> and undo your other edits` |
| Xatoni QOIDAGA aylantirish | `you keep <using default exports> when this project uses <named exports>. add a rule to CLAUDE.md so this stops happening` |

## Yetkazish va nosozlik

| Nima uchun | Prompt |
|---|---|
| Merge ziddiyatini hal qilish | `resolve the merge conflicts in this branch and explain what you kept from each side` |
| Reliz qaydlari | `compare <v2.3.0> to <v2.4.0> and draft release notes grouped by feature, fix, and breaking change` |
| Yiqilgan test | `the <UserAuth> test is failing, find out why and fix it` |
| Production xatosi | `<the checkout endpoint> started returning 500s an hour ago. check the logs, recent deploys, and config changes, then tell me the most likely cause` |
| Build xatosi | `here is a build error. fix the root cause and verify the build succeeds` |

## Avtomatlashtirish

| Nima uchun | Prompt |
|---|---|
| Takror ishni skill qilish | `create a /ship skill for this project that runs the linter and tests, then drafts a commit message` |
| Har tahrirdan keyin hook | `write a hook that runs prettier after every edit to a .ts or .tsx file` |
| Sessiya yakunida xulosa | `summarize what we did this session and suggest what to add to CLAUDE.md` |

## Minimal yechim qoidasi ("dangasa katta dasturchi")

Mustaqil benchmarkda tasdiqlangan yondashuv (~71–83% kamroq kod,
to'g'rilik pasaymaydi): kod yozishdan OLDIN shu zanjir tekshiriladi.
Istalgan vazifa promptiga qo'shimcha qilib yuborsa bo'ladi:

```text
Before writing any code, check in order: (1) is this even needed?
(2) can a built-in tool do it? (3) does the platform already provide
it? (4) does an existing library in this project cover it? (5) can it
be a one-liner? Only then write the SMALLEST working solution. Tell
me what you deliberately left out.
```

Kutubxonadan ATAYLAB olinmaganlar: Linear/Terraform/GCP/Sentry'ga
bog'liq promptlar (bizda bu vositalar yo'q) va CLAUDE.md bilan
takrorlanadiganlar (repo tanishuvi kabi).

---

## Xato kuzatuvi — Sentry'siz, Telegram bot + topikli guruh

Atoyo'da ishlagan naqsh: xato Telegram guruhidagi topikka tushadi
(`lib/telegram/action-log.ts` → "Actions" topigi). Uchinchi tomon
xizmati yo'q, xato to'g'ridan-to'g'ri telefonga keladi.

**Bu prompt boshqa loyihaga o'tkazish uchun.** Qabul qilgan sessiya
avval arxitekturani O'ZI ko'radi va qayerda qilish kerakligini aytadi
(frontend serverida, mavjud backendda yoki kichik alohida xizmatda).

````text
Vazifa: bu loyihada XATO KUZATUVI qilamiz — Sentry va shunga o'xshash
uchinchi tomon xizmatisiz. Xato Telegram guruhidagi topikka tushsin
(guruh topiklarga bo'lingan: masalan "Xatolar", "Backend", "Frontend").

BU SESSIYADA AVVAL TAHLIL, KEYIN KOD. Tahlil natijasini menga
ko'rsatib, qaysi variantni tanlaganingni ASOSLAB ber; men "boshla"
degandan keyingina kod yozasan.

=== 1. AVVAL ANIQLA (taxmin qilma - fayl bilan ko'rsat) ===
- Frontend nima: SPA (Vite/CRA) mi yoki server tomoni bor (Next.js,
  Nuxt, Remix)? Ya'ni bizning O'Z serverimiz bormi?
- Backend nima: til, framework, versiya; global xato ushlagichi
  bormi (masalan Spring'da @ControllerAdvice), loglar qayerga
  yozilyapti va kim o'qiydi?
- Deploy: har ikkalasi qayerda turadi, sirlar (secret) qayerda
  saqlanadi, yangi env qo'shish qanchalik oson?
- Hozir xato bo'lsa kim biladi? (Ehtimol hech kim - shuni tasdiqla.)

=== 2. VARIANTLARNI SOLISHTIR ===
Uchta yo'l bor, har biri uchun "shu loyihada nima bo'ladi" deb yoz:

  A) BACKEND ichida (mavjud tilda, masalan Java) endpoint:
     `POST /api/client-errors` frontend xatosini qabul qiladi va
     Telegram'ga yuboradi; backendning O'Z xatolari ham shu yerdan
     o'tadi. Bitta joy, token serverda qoladi. Kamchiligi: backend
     jamoasidan vaqt so'raladi.

  B) FRONTEND SERVERIDA (agar Next.js kabi server tomoni bo'lsa):
     API route xatoni qabul qiladi va Telegram'ga yuboradi.
     Backendga tegilmaydi, lekin backend xatolari qamrab olinmaydi.

  C) KICHIK ALOHIDA XIZMAT (Node/serverless):
     yangi deploy, yangi monitoring - eng oxirgi variant. Faqat
     A ham, B ham mumkin bo'lmasa tavsiya qil.

TAVSIYANGNI BITTA TANLA va nega boshqasi emasligini yoz.

=== 3. QAT'IY TAQIQ ===
- **Bot tokeni FRONTENDGA CHIQMAYDI.** Brauzerdan to'g'ridan-to'g'ri
  `api.telegram.org` ga murojaat QILINMAYDI: token DevTools'da
  ko'rinadi va istalgan odam guruhga spam yozadi yoki post
  o'chiradi. Token faqat server tomonida.
- Xato ma'lumotida MAXFIY narsa ketmaydi: token, cookie, parol,
  `Authorization` sarlavhasi, to'liq ism/telefon/karta. Yuborishdan
  oldin tozalaydigan funksiya bo'lsin va uning testi bo'lsin.

=== 4. YECHIM SHU TALABLARGA JAVOB BERSIN ===
1. **Toshqin bo'lmasin.** Bitta xato 1000 marta takrorlansa 1000 ta
   xabar ketmaydi: xatoning "barmoq izi" (xabar + fayl + qator)
   bo'yicha guruhlansin, oynada (masalan 5 daqiqa) bittasi
   yuborilsin, qolgani "yana N marta" bo'lib qo'shilsin.
2. **Telegram cheklovlari.** Xabar 4096 belgi — stack uzun bo'lsa
   teg o'rtasidan kesilmasin (HTML parse_mode bo'lsa matn escape
   qilinsin); guruhga daqiqasiga ~20 xabar cheklovi bor.
3. **Xato kuzatuvi ASOSIY OQIMNI TO'XTATMAYDI.** Telegram yiqilsa
   ham foydalanuvchi so'rovi normal tugaydi (fire-and-forget,
   `try/catch`, qisqa timeout).
4. **Frontendda nimalar ushlanadi:** `window.onerror`,
   `unhandledrejection`, React error boundary, muvaffaqiyatsiz
   API so'rovlari (5xx). Foydalanuvchiga esa tushunarli xabar
   ko'rsatilsin.
5. **Kontekst bo'lsin:** URL, foydalanuvchi ID (ismi emas), brauzer,
   ilova versiyasi/commit, vaqt, so'rov ID (backend bilan
   bog'lash uchun).
6. **Stack o'qilsin:** minifikatsiya qilingan kodda stack foydasiz —
   source map bilan nima qilishni ayt (build'da saqlash yoki
   xatoni server tomonda ochish).
7. **Endpoint himoyalansin:** u OCHIQ yozuv nuqtasi — IP bo'yicha
   rate-limit, hajm chegarasi (masalan 16 KB), faqat o'z
   domenimizdan (Origin tekshiruvi), ortiqchasi jimgina tashlanadi.
8. **Yoqish/o'chirish** sozlama orqali bo'lsin (env yoki bazada), va
   sozlanmagan bo'lsa xizmat jimgina o'tkazib yuborsin — xato
   kuzatuvi tufayli loyiha ishga tushmay qolmasin.

=== 5. HALOL BAHO (buni ham yoz) ===
Telegram — kuniga o'nlab xato uchun zo'r, lekin minglab xato uchun
emas: qidiruv, trend, "shu hafta nechta" degan hisob yo'q. Shu
loyihada kunlik xato hajmi taxminan qancha bo'lishini bahola va
kelajakda kerak bo'lsa nima qilish kerakligini bir abzasda yoz
(masalan bazaga ham yozib qo'yish).

=== 6. NATIJA ===
1. Tahlil va TAVSIYA (yuqoridagi bandlar bo'yicha).
2. Ish rejasi: qaysi fayl, qaysi bosqich, kim qiladi (frontend
   jamoasimi yoki backend jamoasi).
3. Agar backend jamoasi qiladigan bo'lsa — ularga beriladigan
   TAYYOR topshiriq matni (endpoint shakli, JSON maydonlari,
   xavfsizlik talablari bilan).
4. Menga bitta savol: "boshlaymizmi?" — men tasdiqlaganimdan keyin
   kod yozasan va testlar bilan birga push qilasan.

Til: javob va kod izohlari o'zbekcha.
````

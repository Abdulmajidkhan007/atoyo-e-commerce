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

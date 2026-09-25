# Ish arxitekturasi — topshiriqni QAYSI yo'l bilan bajarish

Bu — kod yozish tartibi emas, **topshiriqni marshrutlash** tartibi:
kelgan ishni qaysi rolga berish, qachon reja so'rash, qachon
to'xtab savol berish va qachon tekshiruvchi chaqirish.

Manba — frontend jamoalarida ishlatiladigan `planner → developer →
reviewer` sxemasi. Bu yerda u **shu loyihaga moslangan**: Angular/NGXS
o'rniga Next.js + Redux Toolkit, Figma o'rniga skrinshot, va eng
muhimi — bizning majburiy tekshiruv zanjirimiz va narx maxfiyligi
qoidasi tekshiruvchining ro'yxatiga qo'shilgan.

> **Bitta ataylab QILINGAN chekinish.** Asl sxemada `R11` bor:
> *"commit/push faqat aniq so'ralganda"*. Bizda buning aksi
> (`CLAUDE.md` → Ish tartibi): **deploy = git push**, konteyner
> qayta ishga tushganda commit qilinmagan ish YO'QOLADI. Shuning
> uchun bizda R11 boshqacha: **tekshiruv zanjiri o'tgach darhol
> commit + push**. Buni o'zgartirmang.

---

## R1–R11 — qoidalar

| # | Qoida |
|---|---|
| **R1** | Katta ish (6-holat) **rejasiz boshlanmaydi**: avval spetsifikatsiya, keyin egasining roziligi. |
| **R2** | Har ish boshida **hajm baholanadi** (trivial / kichik / o'rta / katta). Bu marshrutni belgilaydi. |
| **R3** | Bitta rol — bitta vazifa. Rejalashtiruvchi kod yozmaydi, ishlab chiquvchi qamrovni kengaytirmaydi. |
| **R4** | **Qamrov kengaytirilmaydi.** Yo'lda topilgan boshqa nosozlik — alohida yozuv (`docs/AUDIT-ISHLARI.md`), o'sha commitda tuzatilmaydi. |
| **R5** | Tekshiruvchi **toza kontekstda** ishlaydi: kodni yozgan odam o'z xatosini ko'rmaydi. |
| **R6** | Har o'zgarish **hujjat bilan birga** ketadi (`CLAUDE.md` → "Hujjatlarni yangilash"). |
| **R7** | Topshiriq **to'liq aniq bo'lmasa — TO'XTA** va savol ber. Savol kam, muhim va **standart javobi bilan** bo'lsin. |
| **R8** | Ish boshlanishida **qaysi marshrut tanlanganini ayting** ("bu 4-holat: kichik imkoniyat, o'zim qilaman"). |
| **R9** | Tekshiruvchining hukmi: **blocker** → egasiga chiqariladi; **pass** → yakun. Nuqson topilsa halqa, ko'pi bilan 2 marta. |
| **R10** | 6- va katta 8-holatda **spetsifikatsiya SHART**: `ai/specs/<sana>-<slug>.md`. |
| **R11** | **Tekshiruv zanjiri o'tgach commit + push** (asl sxemadan farq — yuqoridagi izohga qarang). |

---

## Marshrutlash — 8 holat

```
Yangi topshiriq
   │
   ├─ R2: hajmi qancha?
   │
   ├─ R7: aniqmi? ──yo'q──► TO'XTA: savol ber (kam, muhim, standart javobli)
   │       │
   │      ha
   │       ▼
   └─ 8 holatdan birига tushadi:

1 · Arzimas tuzatish (matn, rang, bitta shart)
      → ishlab chiquvchi (joyida) + o'z-o'zini tekshirish

2 · Nosozlik, sababi AYON
      → ishlab chiquvchi → tekshiruvchi (kod)

3 · Nosozlik, sababi NOMA'LUM
      → tergovchi → ishlab chiquvchi → tekshiruvchi

4 · Kichik imkoniyat
      → ishlab chiquvchi → tekshiruvchi (kod [+ qabul/ko'rinish])

5 · O'rta imkoniyat
      → ishlab chiquvchi → tekshiruvchi

6 · KATTA imkoniyat  (R1)
      → reja → EGASINING ROZILIGI → ishlab chiquvchi → tekshiruvchi

7 · Tekshirish / savol ("nega shunday?", "qayerda?")
      → faqat tergovchi, kod o'zgartirilmaydi

8 · Refaktor / tozalash
      → tor bo'lsa: ishlab chiquvchi → tekshiruvchi
      → keng bo'lsa: reja (SPEC, R10) → ishlab chiquvchi → tekshiruvchi
```

## 6-holat qadamlari (katta ish)

| Qadam | Kim | Nima |
|---|---|---|
| 0 | — | **Aniqlashtirish (R7).** Qamrov/dizayn/qabul mezoni noaniq bo'lsa — savol. |
| 1 | — | **Marshrutni e'lon qilish (R8).** "Bu 6-holat: reja → rozilik → ishlab chiqish → tekshiruv". |
| 2 | rejalashtiruvchi | **Spetsifikatsiya** `ai/specs/<sana>-<slug>.md` (R10). |
| 3 | egasi | **Rozilik darvozasi (R1).** Yo'q / o'zgartirish so'ralsa — 2-qadamga qaytish. |
| 4 | ishlab chiquvchi | **Tartib:** turlar (`src/types`) → server qatlami (`src/lib/**` + testi) → API route → komponent/redux → hujjat. |
| 5 | tekshiruvchi | **Toza kontekstda 5 ta oyna** (pastda). |
| 6 | — | **Hukm (R9).** blocker → egasiga; pass → 7-qadam. |
| 7 | — | **Tekshiruv zanjiri → commit → push (R11).** |

---

## Tekshiruvchining 5 ta oynasi

Umumiy "yaxshi ko'rinadi" degan xulosa QABUL QILINMAYDI. Har oyna
bo'yicha alohida javob bo'lishi kerak.

1. **Narx maxfiyligi** (`CLAUDE.md` 1-qoida) — mijozga chiqadigan
   yangi yo'l `toViewerProducts()` dan o'tadimi? `costPrice` /
   `supplier` / optom narx HTMLga yoki JSONga tushmaydimi?
2. **Kod** — nomlar, takrorlanish, `any`, tutilmagan xato,
   `console.error` bilan jim qolgan nosozlik.
3. **Arxitektura** — server/client chegarasi (`"use client"`,
   `next/headers` client bog'lamiga sizmayaptimi), Redux o'rnida
   lokal holat, kesh bekor qilinadimi.
4. **Qabul mezoni** — topshiriqda aytilgan har bir gap bajarildimi?
   Bajarilmagani ochiq aytiladi.
5. **Ko'rinish** — skrinshot berilgan bo'lsa: telefon kengligi,
   to'q tema, shisha qoidalari (`docs/UI-SHISHA.md`), ekran
   o'quvchi (`docs/QULAYLIK.md`).

Har bir nuqson **fayl:qator** bilan ko'rsatiladi.

---

## Rollar uchun model

Loyihada faqat Claude ishlatiladi. Tanlov — sifat/narx muvozanati:

| Rol | Model | Nega |
|---|---|---|
| rejalashtiruvchi | `claude-opus-5` | Reja xato bo'lsa butun ish xato ketadi — bu yerda tejash qimmatga tushadi. |
| ishlab chiquvchi | `claude-opus-5` (murakkab), `claude-sonnet-5` (aniq topshiriq) | Spetsifikatsiya aniq bo'lsa Sonnet yetadi. |
| tekshiruvchi | `claude-opus-5` | Nuqsonni TOPISH yozishdan qiyinroq. |
| tergovchi | `claude-sonnet-5` | Qidirish va o'qish — arzon ish. |

> **Amaliy qoida (egasining talabi):** ish kichik bo'lsa —
> o'zim qilaman va sababini qisqa yozaman. Ish katta bo'lsa va
> tekshirishga 2x token ketmasa — alohida Sonnet sessiyasiga
> topshiriq beraman. Qaysi biri tanlangani **oldindan** aytiladi.

---

## Bu tartib qayerda YASHAYDI

- `.claude/agents/*.md` — to'rtta rol (Claude Code subagent'lari).
  `planner`, `developer`, `reviewer`, `investigator`.
- `ai/specs/` — spetsifikatsiyalar (6- va keng 8-holat uchun).
  Namuna: `ai/specs/NAMUNA.md`.
- Shu hujjat — marshrutlash qoidalari.

## Nimani ALMASHTIRMAYDI

Bu sxema `CLAUDE.md` dagi BUZILMAS QOIDALAR ustidan chiqmaydi.
Ziddiyat bo'lsa — `CLAUDE.md` ustun. Xususan: ish branch'i,
majburiy tekshiruv zanjiri, narx maxfiyligi, hujjatni o'sha
commitda yangilash.

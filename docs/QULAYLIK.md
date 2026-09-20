# Qulaylik (a11y) — ekran o'quvchi bilan ishlash qoidalari

Maqsad: saytdan **ko'rmaydigan yoki sichqoncha ishlatolmaydigan**
mijoz ham mahsulot topib, savatga solib, buyurtma bera olsin.

> Bu fayl — QOIDA. Yangi komponent yozganda yoki mavjudini
> o'zgartirganda shu ro'yxat bo'yicha tekshiring. Rang kontrasti
> qoidasi `docs/UI-SHISHA.md` §5 bilan bir xil va u
> `src/lib/a11y/contrast.test.ts` da QULFLANGAN.

---

## 1. Har bir boshqaruvning NOMI bo'lsin

Ekran o'quvchi tugmani ichidagi MATNDAN o'qiydi. Ikonkadan iborat
tugmada matn yo'q — MUI ikonkalari esa `aria-hidden` bilan keladi,
ya'ni tugma butunlay **nomsiz** bo'lib qoladi ("tugma", xolos).

```tsx
// ✗ NOTO'G'RI
<IconButton onClick={remove}><DeleteIcon /></IconButton>

// ✓ TO'G'RI
<IconButton aria-label="Savatdan o'chirish" onClick={remove}>
  <DeleteIcon />
</IconButton>
```

**RO'YXATDAGI tugmada nomning o'zi yetarli emas.** Savatda 20 ta
"Savatdan o'chirish" tugmasi bo'lsa, qaysi biri qaysi mahsulotga
tegishli ekani bilinmaydi — nomga mahsulot nomini ham qo'shing:

```tsx
aria-label={`${item.name} — savatdan o'chirish`}
```

`aria-label` ni faqat `<button>`, `<a>`, `<input>` va ROLI bor
elementga bering. Oddiy `<span>`/`<div>` da u **e'tiborsiz qoladi** —
avval rol kerak:

```tsx
// Yulduzli reyting - beshta nomsiz ikonka emas, bitta butun "rasm".
<span role="img" aria-label={`${value} / 5 yulduz`}>…</span>
```

## 2. Maydonning NOMI `placeholder` EMAS

`placeholder` matn yozila boshlashi bilan yo'qoladi va ba'zi
brauzerlarda umuman o'qilmaydi. Har bir kiritish maydonida
`<label>` (MUI'da `label` prop) yoki `aria-label` bo'lsin.

```tsx
// ✗ <TextField placeholder="Savolingizni yozing..." />
// ✓
<TextField
  placeholder="Savolingizni yozing..."
  slotProps={{ htmlInput: { "aria-label": "Yordamchiga savol" } }}
/>
```

**Xato xabari maydonga BOG'LANSIN.** Yonidagi qizil matnni ekran
o'quvchi maydon bilan o'zi bog'lamaydi:

```tsx
<TextField error={!!xato} aria-describedby={xato ? "promo-xato" : undefined} />
{xato && <p id="promo-xato" role="alert">{xato}</p>}
```

MUI `<Alert>` o'zi `role="alert"` beradi — forma darajasidagi xato
uchun shuning o'zi yetarli.

## 3. Rasmlar

| Rasm turi | `alt` |
|---|---|
| Mahsulot rasmi | mahsulot NOMI (`alt={name}`) |
| Galereyadagi 3-rasm | `alt={`${name} — 3`}` |
| Maqola muqovasi | maqola sarlavhasi |
| Bezak (emoji, fon, naqsh) | `alt=""` yoki `aria-hidden="true"` |

Bezak emoji matn ichida bo'lsa ham yashiriladi — aks holda ekran
o'quvchi "yuk mashinasi emoji" deb o'qib vaqt yo'qotadi:

```tsx
<span aria-hidden="true">🚚</span> {freeDeliveryShort(delivery)}
```

## 4. Sarlavhalar tartibi

- Har sahifada **aynan bitta `<h1>`** bo'lsin, u sahifa nima
  haqidaligini aytsin.
- Daraja **sakramasin**: h1 → h2 → h3. "Kattaroq ko'rinsin" uchun
  darajani o'zgartirmang — `className` bilan o'lchamni bering.
- Sahifaning ERTA QAYTISHLARIDA (`if (!profile) return …`) ham h1
  bo'lishi kerak: ilgari `/buyurtma` da "avval kiring" holatida
  sahifa umuman sarlavhasiz edi.
- Sarlavha ko'rinishi shart bo'lmasa — `className="sr-only"`
  (`/profil` da shunday qilingan).

## 5. Klaviatura

**Fokus halqasi.** `globals.css` da hamma boshqaruvga
`:focus-visible` halqasi berilgan. Sababi: MUI `ButtonBase` o'z
uslubida `outline: 0` qo'yadi va brauzerning halqasi HAMMA MUI
tugmasida yo'qolgan edi. Komponentda `outline-none` /
`focus:outline-none` **YOZILMAYDI**.

Halqa rangi `--focus-ring` o'zgaruvchisida. Tema bilan almashadi;
DOIMIY TO'Q blok qo'shsangiz (footer kabi) unga ochroq halqa bering:

```css
footer, .tv-root { --focus-ring: #DCC09A; }
```

**Modal / drawer.** MUI `Dialog`, `Drawer`, `Menu` fokus qopqoni va
Escape'ni O'ZI bajaradi — ularni ishlating. Qo'lda yozilgan qoplama
(masalan `ProductGallery` dagi lightbox) uchun uch narsa shart:

1. ochilganda fokus ichkariga ko'chadi;
2. `Tab` ichida aylanadi (tashqariga chiqmaydi);
3. `Escape` yopadi, fokus o'zini ochgan tugmaga QAYTADI.

Namuna — `src/components/product/ProductGallery.tsx` dagi `Lightbox`.

**Faqat sichqoncha bilan ishlaydigan narsa** (sudrab o'lcham
o'zgartirish tutqichi kabi) ekran o'quvchiga ko'rsatilmaydi
(`aria-hidden="true"`) va uning bajaradigan ishi uchun ALOHIDA tugma
bo'lishi kerak.

**"Kontentga o'tish"** havolasi `(main)/layout.tsx` da; `<main>` ning
`id="asosiy-kontent"` va `tabIndex={-1}` i shu havola uchun — ularni
olib tashlamang.

## 6. Dinamik xabarlar `aria-live` bilan

Ekranda jimgina paydo bo'ladigan har qanday o'zgarish e'lon
qilinishi kerak: savatga qo'shildi, filtr natijasi, yordamchining
javobi, xatolik.

| Vaziyat | Nima qo'yiladi |
|---|---|
| Xatolik, ogohlantirish | `role="alert"` (darhol o'qiladi) |
| Holat, natija soni, "yuklanmoqda" | `role="status"` + `aria-live="polite"` |
| Suhbat oqimi | `role="log"` + `aria-live="polite"` |

**Jonli mintaqa sahifada OLDINDAN, bo'sh holda turishi shart** —
brauzer faqat MAVJUD mintaqaning o'zgarishini e'lon qiladi. Shuning
uchun `CartAnnouncer` doim chiziladi va matn unga effektda yoziladi
(`src/components/a11y/CartAnnouncer.tsx`).

Aylanuvchi nishonning (`CircularProgress`) matnli muqobili bo'lsin:

```tsx
<CircularProgress size={16} aria-hidden="true" />
<span className="sr-only">Javob tayyorlanmoqda…</span>
```

## 7. Rang kontrasti — WCAG AA (4.5:1)

- Oddiy matn/fon: **4.5:1** dan past bo'lmasin.
- Ikonka, chegara, fokus halqasi (matn emas): **3:1**.
- Rang YAGONA belgi bo'lmasin: pastki navigatsiyadagi faol bo'lim
  rang bilan ham, `aria-current="page"` bilan ham bildiriladi.

**Ikkinchi darajali matn** (`text-navy-300`) qiymati temaga qarab
almashadi: `globals.css` dagi `--color-navy-300`. `navy-300` fon
sifatida ISHLATILMAYDI — shuning uchun u o'zgaruvchi bo'la oladi.

**Doimiy to'q blokda** (footer, `/tv`) `text-navy-300` ishlatmang:
yorug' temada u to'q rangga aylanadi va to'q fonda yo'qoladi.
U yerda qattiq `text-navy-200` ishlatiladi.

Yangi rang qo'shsangiz — `src/lib/a11y/contrast.test.ts` ga juftligini
yozing. Tekshirish:

```bash
npx vitest run src/lib/a11y
```

## 8. Landmark'lar

Sahifada bir nechta `<nav>` bo'lsa **har biriga `aria-label`** bering
(yuqori menyu, pastki panel, footer) — aks holda ekran o'quvchi
ro'yxatida uchta bir xil "navigatsiya" chiqadi.

---

## Yangi komponent uchun qisqa ro'yxat

1. Ikonkali tugma → `aria-label` (ro'yxatda bo'lsa — nom bilan).
2. Kiritish maydoni → `label` yoki `aria-label`; xato →
   `aria-describedby` + `role="alert"`.
3. Rasm → mazmunli bo'lsa `alt`, bezak bo'lsa `alt=""`.
4. Sarlavha darajasi sakramaydi; sahifada bitta `h1`.
5. Tab bilan borib bo'ladimi? Fokus ko'rinadimi? Escape yopadimi?
6. Jimgina o'zgaradigan narsa bormi → `aria-live`.
7. Rang kontrasti 4.5:1 dan past emasmi.

## Ma'lum, hali tuzatilmagan joylar

1. **Tungi rejimda MUI temasi** sovuq ochilishda yorug' palitrada
   qolib ketadi (`<html>` da `.dark` bor, MUI esa hali `light`) —
   forma nomlari 1.3:1. Sabab va vazifa:
   `docs/AUDIT-ISHLARI.md` 13-ish. Bu qulaylik ishidan OLDIN ham
   shunday edi.
2. **Blog maqolasidagi `[rasm:URL]`** bloklari `alt=""` bilan
   chiziladi (`components/blog/BlogContent.tsx`) — matn kiritish
   formatida alt uchun joy yo'q. To'g'ri yechim: formatga
   `[rasm:URL|tavsif]` qo'shish; hozircha rasm BEZAK deb
   belgilangan (yolg'on alt yozishdan ko'ra shunisi to'g'ri).
3. **`aria-label` lar o'zbekcha QATTIQ yozilgan** (loyihada ilgari
   ham shunday edi). `/ru` marshrutlari qo'shilgach ruscha sahifada
   ham o'zbekcha nom o'qiladi. Yangi nom qo'shayotganda, komponentda
   `useI18n()` bo'lsa, lug'atdan oling; yo'q bo'lsa lug'atga kalit
   qo'shing.
4. **MUI Dialog ochilganda** fokus `[role=dialog]` ning O'ZIGA emas,
   MUI ning tashqi o'ramiga tushadi. Bu MUI ning standart xatti-
   harakati; oyna `aria-modal="true"`, nomlangan, fokus qopqoni va
   Escape ishlaydi — shuning uchun kutubxona bilan kurashilmadi.

## Tekshirish

```bash
npm run build && npm start          # so'ng HTMLni o'qib chiqing
npx vitest run src/lib/a11y         # kontrast qoidalari
```

HTMLni qo'lda o'qiyotganda quyidagilarni qidiring: `<img` `alt` siz,
`<button>` ichi bo'sh va `aria-label` siz, `<input>` `label` siz,
`h1` soni, `<nav>` `aria-label` siz.

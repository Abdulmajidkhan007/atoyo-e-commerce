# Shisha (glass) ko'rinish — qoidalar

Maqsad: sayt va ilova 2026 yilgi standart ko'rinishga o'tsin —
**suzuvchi qatlamlar shaffof va xiralashgan** (iOS "Liquid Glass",
Material 3 Expressive), kontent esa o'qiladigan bo'lib qolsin.

> Bu 3D rejim (`docs/UI-3D.md`) EMAS. 3D — alohida, admin yoqadigan
> sinov rejimi. Shisha ko'rinish esa **klassik rejimning o'zida**,
> hamma mijozga ishlaydi.

## 1. Nimaga shisha qo'yiladi, nimaga QO'YILMAYDI

Eng ko'p uchraydigan xato — hamma joyni shaffof qilish: matn fon
bilan qo'shilib ketadi, sayt "iflos" ko'rinadi va eski moda bo'lib
qoladi. Standart yondashuv — **faqat suzuvchi "chrome" qatlamlari**:

| Shisha BO'LADI | Qattiq (opaque) QOLADI |
|---|---|
| Header (skroll paytida) | Mahsulot kartochkasi |
| Pastki navigatsiya (mobil) | Forma maydonlari, jadval |
| Modal/dialog foni va paneli | Uzun matn: blog, tavsif, shartlar |
| Yopishib turuvchi filtr/savat paneli | Checkout summasi bloki |
| Chip/pill, toast, AI tugmasi | Admin jadvallari va hisobotlar |

Qoida: **matn turgan yuza — qattiq; matnni ko'targan ramka —
shisha.**

## 2. Bitta manba (token)

Ranglar va xiralik `globals.css` dagi o'zgaruvchilarda:

```css
--glass-bg:      rgba(255,255,255,.72);  /* to'q temada boshqa */
--glass-border:  rgba(255,255,255,.28);
--glass-blur:    14px;
--glass-shadow:  0 8px 24px rgba(7,45,64,.10);
```

Komponentda `backdrop-blur-[14px] bg-white/70` kabi qiymat
YOZILMAYDI — faqat `.glass` / `.glass-strong` yordamchi klassi
ishlatiladi. Sabab: qiymat 20 joyda takrorlansa, keyin ularni birga
o'zgartirib bo'lmaydi.

## 3. Chegara va soya SHART

Shishaning "shisha" bo'lib ko'rinishi xiralikdan emas, **chekkasidan**
bilinadi: 1px yorug' chegara + yumshoq soya. Ularsiz element
shunchaki "xira dog'" bo'ladi.

## 4. Zaxira yo'llar (buzilmasin)

Shisha — bezak, u hech qachon o'qishga xalaqit bermasligi kerak:

1. `@supports not (backdrop-filter: blur(1px))` — qattiq fon.
2. `prefers-reduced-transparency: reduce` — qattiq fon (iOS/Android
   "shaffoflikni kamaytirish" sozlamasi).
3. `prefers-contrast: more` — qattiq fon + quyuqroq matn.
4. Sekin qurilma/tejamkor rejim (`useDeviceTier` dagi `low`,
   `saveData`) — qattiq fon. `backdrop-filter` telefonda eng qimmat
   effektlardan biri; skroll paytida sekinlashtiradi.

## 5. O'lchanadigan talab

Har qanday shisha yuzada matn/ikonka kontrasti **WCAG AA** (4.5:1)
dan past bo'lmasin. Tekshirish: eng yorug' va eng to'q fon rasmi
ustida sinab ko'riladi (mahsulot rasmi ustidagi header).

## 6. Ilova (React Native) tomoni

RN'da `backdrop-filter` YO'Q. Shuning uchun:

- haqiqiy xiralik faqat **pastki navigatsiya, header va modal** da —
  `@react-native-community/blur` (`BlurView`);
- Android'da `BlurView` API 31+ da tez (`RenderEffect`), undan
  eskisida **shaffof rangli yuza** (rgba) bilan cheklanamiz;
- qolgan joyda xiralik emas, **yarim shaffof rang + chegara**.

Yangi nativ paket qo'shilgani uchun `mobile/scripts/check-codegen.mjs`
ro'yxatiga ham qo'shiladi va APK ni CI yig'ib tekshiradi.

## 7. Nima o'zgarmaydi

- Brend ranglari (Deep Navy + qumli-oltin) va tipografiya;
- sahifa tuzilishi, tugmalar joyi, oqimlar — faqat YUZA ko'rinishi;
- 3D rejim va `SiteSettings.show3dMode` mantig'i;
- widgetlar (bosh ekranda o'z brend rangida qoladi).

---

## 8. Ikki tuzoq (bir marta ikkalasiga ham tushilgan)

### 8.1. `-webkit-backdrop-filter` ni QO'LDA yozmang

CSS'da ikkalasi yonma-yon yozilgan edi:

```css
backdrop-filter: blur(24px) saturate(180%);
-webkit-backdrop-filter: blur(24px) saturate(180%);
```

Minifikator (Lightning CSS) ularni "bir xil" deb hisoblab, **standart
`backdrop-filter` ni tashlab yubordi** — natijada blur UMUMAN
ishlamadi va shisha shunchaki yarim shaffof qatlamga aylandi
(brauzerda `getComputedStyle(header).backdropFilter === "none"`).

**Qoida:** faqat standart `backdrop-filter` yoziladi; prefiksni asbob
o'zi qo'shadi.

**Tekshirish usuli** (taxmin qilmang — o'lchang):

```js
getComputedStyle(document.querySelector('header')).backdropFilter
// "blur(24px) saturate(1.8)" bo'lishi kerak, "none" EMAS
```

### 8.2. Kontent ustidagi qatlam 0.9 shaffoflikda bo'lsin

Kartochka ostida qattiq fon turadi — u yerda 0.65 xavfsiz. Lekin
**header va navigatsiya kontent ustida suzadi**: Telegram/Instagram
ichidagi brauzer, eski WebView yoki tejamkor rejim `backdrop-filter`
ni jimgina tashlab ketishi mumkin, o'shanda 0.65 qatlam ostidagi
katta matn o'qilib turadi va sahifa buzilgandek ko'rinadi.

Shuning uchun: `--glass-bg` (kartochka) `0.65`, `--glass-bg-strong`
(header) va `--glass-nav-bg` (navigatsiya) **`0.9`**. Blur ishlasa —
iOS'dagi "qalin material", ishlamasa ham toza ko'rinadi.

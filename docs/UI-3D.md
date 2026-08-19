# 3D dizayn rejimi (`classic` / `3d-modern`)

Sayt ikki xil ko'rinishda ishlaydi va mijoz o'zi tanlaydi — Payme'dagi
"eski dizayn / yangi dizayn" kabi:

| Rejim | Nima ko'rinadi | Kimga |
|---|---|---|
| **`3d-modern`** (standart) | Hero'da 3D santexnika sahnasi, skrollda GSAP animatsiyasi, shishasimon (glass) kartochkalar | Yangi ko'rinishni xohlaganlarga |
| **`classic`** | Hozirgi tekis dizayn, hech qanday og'ir kutubxona yuklanmaydi | Sekin internet, eski telefon, "chalg'itmasin" deydiganlarga |

Tugma: **saytning yuqorisida** (`✨ 3D` / `📄 Klassik`).

---

## 1. Qayerda nima turadi

```
src/lib/ui-mode/
  config.ts          # rejim turi, saqlash (localStorage + cookie), erta skript
  UiModeContext.tsx  # React konteksti: useUiMode()
  useDeviceTier.ts   # qurilma quvvati: "low" | "high"
  useImmersive.ts    # YAGONA QOIDA: og'ir effektlar yoqiladimi

src/components/layout/UiModeSwitch.tsx   # almashtirgich tugma
src/components/motion/Reveal.tsx         # skrollda chiqish (GSAP yoki CSS)
src/components/motion/GlassCard.tsx      # kartochka: rejimga qarab tanlaydi
src/components/motion/GlassCardMotion.tsx # framer-motion qismi (lazy)

src/components/three/HeroCanvas.tsx      # 3D "darvozasi": qaror + yuklash + to'xtatish
src/components/three/HeroScene.tsx       # sahnaning o'zi (faqat chizadi)
src/components/three/SceneLoader.tsx     # minimal yuklanish ko'rsatkichi
src/components/home/Hero.tsx             # bosh sahifa hero bo'limi
```

## 2. Yangi komponentda rejimni qanday ishlatasiz

Shartni **takrorlamang** — bitta hook bor:

```tsx
import { useImmersive } from "@/lib/ui-mode/useImmersive";

export function MeningBlokim() {
  const { immersive } = useImmersive();
  return immersive ? <ChiroyliVariant /> : <YengilVariant />;
}
```

`immersive === true` bo'lishi uchun **ikkala** shart kerak:

1. foydalanuvchi `3d-modern` ni tanlagan;
2. qurilma ko'taradi (`useDeviceTier` — ekran ≥ 768px, ≥ 4 yadro,
   ≥ 4GB xotira, WebGL bor, `prefers-reduced-motion` yo'q, trafik
   tejash rejimi yo'q).

Faqat foydalanuvchi tanlovi kerak bo'lsa — `useUiMode().isModern`.

## 3. Tezlik qoidalari (buzilmasin)

- **`three`, `gsap`, `framer-motion` hech qachon statik import
  qilinmaydi** sahifa darajasida. Ular faqat:
  - `HeroCanvas` ichida `next/dynamic` (`ssr: false`) bilan,
  - `Reveal` ichida `await import("gsap")` bilan,
  - `GlassCard` ichida `lazy(() => import("./GlassCardMotion"))` +
    `Suspense` bilan yuklanadi (fallback AYNI kartani animatsiyasiz
    chizadi, shuning uchun kontent bir lahza ham yo'qolmaydi).
  Klassik rejimdagi mijoz bu paketlarning bironta baytini olmaydi.
- **3D sahna ko'rinmasa render to'xtaydi**: `HeroCanvas`
  `IntersectionObserver` + `visibilitychange` orqali `frameloop` ni
  `"never"` ga o'tkazadi (batareya va CPU tejaladi).
- **Tashqi fayl yo'q**: `.glb` model ham, `.hdr` muhit ham yuklanmaydi —
  hamma shakl koddan yasaladi, yorug'lik `Lightformer` bilan xotirada
  quriladi. Sabab: saytdagi CSP tashqi hostlarni bloklaydi
  (`lib/http/csp.ts`) va bu shart ATAYLAB yumshatilmagan.
- `Reveal` ichidagi blok boshida shaffof turadi, shuning uchun unga
  `data-reveal` atributi qo'yilgan: JS umuman ishlamasa
  `layout.tsx` dagi `<noscript>` uslubi uni darhol ko'rinadigan
  qiladi (kontent hech qachon yo'qolmaydi).
- Yangi 3D bezak qo'shsangiz uni o'rab turgan elementga
  **`data-immersive-only`** atributini bering — klassik rejimda CSS uni
  React qaror qabul qilishidan oldin yashiradi (`globals.css`).

## 4. Tanlov qanday saqlanadi

1. `localStorage` (`atoyo.ui-mode`) — asosiy manba;
2. `cookie` (`atoyo_ui_mode`) — zaxira.

**DIQQAT:** sayt Firebase Hosting rewrite orqali ochilganda backendga
faqat `__session` cookie yetib boradi (CLAUDE.md → "Cookie qoidasi"),
shuning uchun **server rejimni O'QIMAYDI** va har doim standart
(`3d-modern`) holatda HTML chizadi. "Klassik" tanlagan mijoz 3D ni bir
lahza ham ko'rmasligi uchun `layout.tsx` da sahifa bo'yalishidan oldin
ishlaydigan kichik skript `<html data-ui-mode="...">` ni qo'yadi — tema
(dark mode) bilan bir xil naqsh.

## 5. Sinash

```bash
npm run build && npm run start
```

- Keng ekran (≥ 768px) → hero'da 3D sahna aylanadi va sichqonchaga
  javob beradi;
- "📄 Klassik" bosilsa → canvas yo'qoladi, sahifa yengillashadi,
  tanlov `reload` dan keyin ham saqlanadi;
- Telefon o'lchamida (390px) → 3D umuman chizilmaydi, o'rniga
  gradient "poster";
- Brauzerda "Reduce motion" yoqilsa → animatsiyalar o'chadi.

## 6. Keyingi bosqichlar (hali qilinmagan)

- Katalog va mahsulot sahifalari uchun 3D ko'rinish (hozircha ular
  ataylab klassik: 10 000 mahsulotli ro'yxatda 3D tezlikni yeydi);
- Admin panelda ham almashtirgich (`AdminShell` ga `UiModeSwitch`
  qo'shish yetadi — kontekst allaqachon global);
- Mahsulotning haqiqiy `.glb` modeli (Storage'dan, `useGLTF` bilan).

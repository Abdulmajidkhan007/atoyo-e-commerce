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
  useDeviceTier.ts   # qurilma quvvati: "low" | "mid" | "high"
  useImmersive.ts    # YAGONA QOIDA: og'ir effektlar yoqiladimi

src/components/layout/UiModeSwitch.tsx   # almashtirgich tugma
src/components/motion/Reveal.tsx         # skrollda chiqish (GSAP yoki CSS)
src/components/motion/GlassCard.tsx      # kartochka: rejimga qarab tanlaydi
src/components/motion/GlassCardMotion.tsx # framer-motion qismi (lazy)

src/components/motion/SplitReveal.tsx    # sarlavha so'zma-so'z (blur -> aniq)

src/components/three/HeroCanvas.tsx      # 3D "darvozasi": qaror + yuklash + to'xtatish + jonli ma'lumot
src/components/three/HeroScene.tsx       # sahnani YIG'ADI (qaror qabul qilmaydi)
src/components/three/SceneLoader.tsx     # minimal yuklanish ko'rsatkichi
src/components/three/scene/
  ProductShowpiece.tsx   # markaziy mahsulot: kosasimon moyka + gooseneck kran (koddan)
  GpsMesh.tsx            # mini xarita: simli to'r + do'kon nuqtasi + radar to'lqini
  FloatingPanel.tsx      # sahna ICHIDAGI shisha panel (jonli ma'lumot bilan)
  panelTexture.ts        # panel matni - canvas tekstura (tashqi shriftsiz)
  CameraRig.tsx          # sichqoncha parallaksi + skroll bilan yaqinlashish

src/lib/motion/useHeroScroll.ts          # GSAP ScrollTrigger: pin + progress
src/lib/hero/usePanelData.ts             # panellardagi JONLI ma'lumot
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
2. qurilma ko'taradi — ya'ni `useDeviceTier()` `"low"` qaytarmaydi.

Pog'onalar:

| Pog'ona | Kim | Nima chiziladi |
|---|---|---|
| `"low"` | `prefers-reduced-motion`, trafik tejash, 2G/3G, WebGL yo'q, juda kam xotira yoki <4 yadro | 3D **yo'q** — sababi ekranda yoziladi va "Baribir yoqish" tugmasi chiqadi |
| `"mid"` | telefon/planshet (ekran < 768px) | Sahna **bor**, lekin soyasiz, past piksel zichligi (`dpr ≤ 1.25`), kichikroq atrof-muhit xaritasi |
| `"high"` | kompyuter | To'liq sifat |

> **Tarix (ikki marta yiqilgan joy):**
> 1. Avval `"ekran < 768px → low"` sharti bor edi va telefonda 3D
>    umuman chizilmasdi.
> 2. Keyin xotira chegarasi 3GB qilib qo'yilgan edi — Chrome
>    `deviceMemory` ni 0.25/0.5/1/2/4/8 qadamlari bilan beradi va
>    **3GB telefon `2` deb ko'rsatiladi**, ya'ni o'rta darajali
>    telefonlarda 3D yana chizilmadi. Foydalanuvchi "3D" tugmasini
>    bosib, ekranda bo'sh joy ko'rardi.
>
> Shu sabab endi: chegara past (`deviceMemory >= 2`), sabab ochiq
> yoziladi (`TIER_REASON_TEXT`) va foydalanuvchi **"Baribir yoqish"**
> bilan qarorni bekor qila oladi (`useImmersive().setForced`,
> `localStorage: atoyo.ui-3d-force`). Yagona qattiq sabab — WebGL
> yo'qligi (`canForce: false`).

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

## 4a. Kinematik skroll (pin) va panellar

**Skroll.** `useHeroScroll` GSAP ScrollTrigger yaratadi va progressni
(0→1) `ref` ga yozadi; `CameraRig` uni `useFrame` ichida o'qib
kamerani sahnaga yaqinlashtiradi. Progress `state` EMAS — aks holda
skrollning har kadrida React qayta render bo'lardi.

- **Kompyuterda** hero PIN qilinadi (`end: "+=140%"`): sahifa joyida
  turadi, kamera ichkariga kiradi.
- **Telefonda pin YO'Q.** Pin u yerda skrollni "ushlab qolgandek"
  tuyuladi va do'kon uchun bu xarid oqimini buzadi — progress oddiy
  skrolldan hisoblanadi.

**Panellar sahna ICHIDA** (DOM emas): kamera aylanganda ular ham
aylanadi, mahsulot ularni to'sib qoladi. Matn `panelTexture.ts` da
2D canvas'ga chiziladi va teksturaga aylanadi.

> **Nega troika/`<Text>` emas?** drei'ning `<Text>` i shrift faylini
> talab qiladi va standart holatda uni Google CDN'dan tortadi — CSP
> buni bloklaydi, ya'ni matn umuman ko'rinmasdi. Canvas-tekstura
> tashqi faylsiz ishlaydi va ~150 KB kutubxonani tejaydi.

**Panel joylashuvi KADRGA qarab hisoblangan.** Kompyuterda kanvas
bo'limning o'ng 55% ini egallaydi; `fov: 38°` va ~6.5 masofada
ko'rinadigan kenglik ~4.2 birlik, ya'ni `x` chegarasi taxminan ±2.1.
Panel kengligi 2.1 bo'lsa markazi -1.05 dan chapda bo'lmasligi kerak,
aks holda matnning yarmi kadrdan chiqib ketadi (bir marta shunday
bo'lgan).

**Panellardagi ma'lumot JONLI** (`usePanelData.ts`): kategoriyalar
soni/nomlari, `settings/delivery` dagi yetkazish va'dasi va
vitrinadagi mahsulot (nomi + dona narxi). Admin sozlamani
o'zgartirsa hero ham o'zgaradi.

## 5. Sinash

```bash
npm run build && npm run start
```

- Keng ekran (≥ 768px) → hero'da 3D sahna aylanadi va sichqonchaga
  javob beradi;
- "📄 Klassik" bosilsa → canvas yo'qoladi, sahifa yengillashadi,
  tanlov `reload` dan keyin ham saqlanadi;
- Telefon o'lchamida (≈390-412px) → sahna hero matnining OSTIDA,
  o'z bandida chiziladi (soyasiz, past piksel zichligi);
- Brauzerda "Reduce motion" yoqilsa → animatsiyalar o'chadi.

## 5a. Telefondagi joylashuv (nozik joy)

Hero'dagi 3D bloki telefonda `relative h-64` — ya'ni **oqim ichida**,
matndan keyin. Kompyuterda esa `md:absolute md:right-0 md:w-1/2`.

Nega shunday: bir marta u telefonda ham `absolute inset-0` edi va
sahna sarlavha ustiga chiqib ketgan — na matn o'qilardi, na shakllar
ko'rinardi. Shakllarning joylashuvi ham kadr shakliga qarab
o'zgaradi (`Composition` dagi `layout`): kompyuterda diagonal,
telefonda bir qatorda.

## 5b. Mahsulot 3D konfiguratori (qoplama tanlash)

```
src/lib/three/finishes.ts            # qoplamalar: xrom / tillarang / mat qora
src/components/3d/FinishPicker.tsx   # suzuvchi shisha tanlagich (DOM)
src/components/3d/FaucetConfigurator.tsx  # canvas + model + tanlagich
src/components/3d/models/            # KATEGORIYA bo'yicha parametrik modellar
  parts.tsx        # umumiy materiallar va detallar
  FaucetModel / SinkModel / ShowerModel / RadiatorModel /
  BoilerModel / PipeModel / ToiletModel
  registry.tsx     # kategoriya slug -> model (switch, komponent QAYTARMAYDI)
```

**Modellar kategoriya darajasida.** Katalogda 10 000+ mahsulot bor —
har biriga `.glb` yasash real emas. Shuning uchun mijoz "kran" ni
ochsa kran, "radiator" ni ochsa radiator ko'radi; mahsulot sahifasida
buning ostiga **ochiq yozuv** qo'yilgan ("model shu turdagi mahsulot
uchun namunaviy"), aks holda mijoz modelni mahsulotning aniq
nusxasi deb o'ylashi mumkin.

**`.glb` ham qo'llab-quvvatlanadi:** `FaucetConfigurator` ga
`modelUrl` berilsa `useGLTF` bilan yuklanadi, nusxasi
`scene.clone(true)` bilan olinadi va materiallar `traverse` orqali
yangilanadi. Fayl topilmasa `ModelBoundary` (class komponent) xatoni
ushlab, parametrik modelga o'tadi — sahifa qulab tushmaydi.

> **CSP eslatmasi:** drei'ning `<Environment preset="city" />` i HDR
> faylni GitHub CDN'dan tortadi va bizning CSP uni bloklaydi (sahna
> qop-qora bo'lib qolardi). Shuning uchun muhit HAR JOYDA
> `Lightformer` plitalari bilan xotirada quriladi.

Qoplama tanlagich IKKI joyda: bosh sahifadagi hero'da (sahnadagi
kranning qoplamasi o'zgaradi) va mahsulot sahifasida (`Product3dView`,
faqat 3D rejimda chiziladi).

## 5c. 3D DUNYO (sahifalar ortidagi uzluksiz makon)

```
src/lib/world/stations.ts        # manzil -> "bekat" (kamera + mazmun)
src/components/world/WorldCanvas.tsx  # darvoza: qaror + yuklash + tejash
src/components/world/WorldScene.tsx   # sahna: javon / projektor / peshtaxta / jim fon
```

Sayt 3D rejimda **bitta uzluksiz makon**: har sahifa shu makonning
bir joyi. Sahifa almashganda sahna QAYTA YARATILMAYDI — kanvas
`(main)/layout.tsx` da bir marta o'rnatiladi va faqat kamera boshqa
bekatga uchib boradi (`StationRig`, `damp` bilan).

| Manzil | Bekat | Nima ko'rinadi |
|---|---|---|
| `/` | — | Dunyo chizilmaydi: bosh sahifada o'zining kinematik hero sahnasi bor (ikkita katta sahna = GPU isrofi) |
| `/katalog` | `catalog` | Kategoriya modellari yoy bo'ylab "javon" |
| `/mahsulot/*` | `product` | Uzoqdagi jim model (sahifadagi konfigurator asosiy) |
| `/savat`, `/buyurtma`, `/tolov`, `/chek` | `cart` | "Peshtaxta" + yetkazish to'ri |
| Qolganlari | `calm` | Jim suzuvchi detallar |
| `/admin`, `/tv` | — | Umuman chizilmaydi |

**Kontent HTML'da qoladi.** Dunyo `fixed inset-0 -z-10` va
`pointer-events: none` — matn, narx, havolalar odatdagi DOM'da.
Shuning uchun Google ham, ekran o'quvchi ham hech narsa yo'qotmaydi.

**3D rejim = TO'Q ko'rinish.** Dunyo ko'rinishi uchun `body` foni
shaffof bo'ladi (fon `html` ga ko'chgan), shuning uchun 3D rejimda
tema har doim to'q: yorug' temada to'q matn to'q sahna ustida
o'qilmasdi. Klassik rejimda tema tanlovi avvalgidek ishlaydi
(`providers.tsx` dagi `effectiveMode`).

## 6. Keyingi bosqichlar (hali qilinmagan)

- Katalog va mahsulot sahifalari uchun 3D ko'rinish (hozircha ular
  ataylab klassik: 10 000 mahsulotli ro'yxatda 3D tezlikni yeydi);
- Admin panelda ham almashtirgich (`AdminShell` ga `UiModeSwitch`
  qo'shish yetadi — kontekst allaqachon global);
- Mahsulotning haqiqiy `.glb` modeli (Storage'dan, `useGLTF` bilan).

# Desktop ilova (Windows / Linux)

Do'kon kompyuteri uchun ilova. Ichida **saytning o'zi** ochiladi —
UI qaytadan yozilmagan, shuning uchun sayt yangilansa ilova ham
yangilangan bo'ladi (qayta o'rnatish shart emas).

Nega Electron va nega React Native emas — `docs/REBUILD-PROMPT.md`
dagi "Desktop" bo'limida yozilgan: React Native Windows/macOS forklari
RN dan orqada yuradi, Linux umuman yo'q, mobil UI ni katta ekranga
qaytadan moslash kerak bo'lardi. Electron esa mavjud saytni ishlatadi.

## Nima qo'shiladi (brauzerda yo'q narsalar)

- **Chek chop etish** — `Fayl → Chek chop etish` (Ctrl+P), printerga
  to'g'ridan-to'g'ri, fon ranglari bilan;
- **Shtrix-kod skaneri** — USB skaner klaviatura kabi ishlaydi, sanoq
  va sotuv sahifalarida shundoq yozaveradi;
- **Do'kon ekrani** — `Do'kon → Do'kon ekrani (televizor)` `/tv` ni
  alohida to'liq ekranli oynada ochadi (ikkinchi monitor / HDMI
  orqali televizor uchun);
- **Internet uzilganda** tushunarli ekran va "Qayta urinish" tugmasi,
  aloqa tiklansa o'zi qaytadi;
- Bitta nusxa (ikki marta ochilmaydi), oyna o'lchami eslab qolinadi,
  o'zbekcha menyu.

## Yuklab olish (foydalanuvchi uchun)

GitHub → **Releases** → `desktop-latest`:

| Fayl | Kimga |
|---|---|
| `Atoyo-Setup-<versiya>.exe` | Windows — yuklab olib ishga tushiring |
| `Atoyo-<versiya>.AppImage` | Linux — `chmod +x` qilib ishga tushiring |

Doimiy havola (oxirgi build):

```
https://github.com/<owner>/<repo>/releases/tag/desktop-latest
```

> Windows birinchi ishga tushirishda **SmartScreen** ogohlantirishi
> chiqadi ("Noma'lum nashriyot") — bu normal, chunki ilova kod imzosi
> bilan imzolanmagan. "Batafsil" → "Baribir ishga tushirish".
> Imzo sertifikati (~yiliga $200-400) olinsa, ogohlantirish yo'qoladi.

## Klaviatura va sichqoncha

Ilovada brauzerdagi manzil paneli ham, orqaga tugmasi ham yo'q -
shuning uchun harakat quyidagicha:

| Nima | Qanday |
|---|---|
| Orqaga | `Ctrl+←` yoki `Alt+←`, sichqonchaning yon tugmasi |
| Oldinga | `Ctrl+→` yoki `Alt+→`, sichqonchaning yon tugmasi |
| Bosh sahifa | `Alt+Home` |
| Chek chop etish | `Ctrl+P` |
| Yangilash | `F5` / `Ctrl+R` |

`Alt+←/→` menyudagi "O'tish" bo'limida turadi (Windows standarti).
`Ctrl+←/→` esa `preload.js` da ushlanadi va **matn maydonida
yozayotganda ishlamaydi** - u yerda `Ctrl+←` "bir so'z chapga"
degani, admin formada yozayotgan odam sahifadan uchib ketmasligi
kerak.

Saytning o'zida esa har sahifa tepasida **"qayerdaman" zanjiri**
turadi (Bosh sahifa › Katalog › Kategoriya › Mahsulot) - istalgan
bosqichga bir bosishda qaytish mumkin.

## Yig'ish — GitHub Actions

Sandbox'da yig'ilmaydi (Windows kerak, electron-builder ~200 MB
yuklaydi). Hamma ish CI da:

1. `desktop/**` o'zgarib push bo'lsa **avtomatik**;
2. yoki qo'lda: **Actions → "Desktop ilova" → Run workflow**
   (versiya raqamini kiritish mumkin).

Workflow: `.github/workflows/desktop.yml`. Ikkita ish:
`build` (Windows + Linux, matritsa) va `release` — natijalarni
**`desktop-latest`** relizga yuklaydi. Android APK relizi (`latest`)
alohida qoladi, bir-birini bosmaydi.

Hech qanday secret kerak emas (`GITHUB_TOKEN` avtomatik beriladi).

## Lokal ishga tushirish (dasturchi uchun)

```bash
cd desktop
npm install
npm start                # saytni ochadi
ATOYO_URL=http://localhost:3000 npm start   # lokal saytga ulanish
npm run dist:win         # faqat Windows mashinasida
npm run dist:linux
```

Ikonka koddan chiziladi (tashqi vositasiz):

```bash
npm run icon             # desktop/build/icon.png
```

## Fayllar

| Fayl | Vazifasi |
|---|---|
| `desktop/main.js` | Oyna, menyu, `/tv` oynasi, offline, navigatsiya cheklovi |
| `desktop/preload.js` | `window.atoyoDesktop` (faqat belgi — Node ochilmaydi) |
| `desktop/offline.html` | Aloqa yo'q sahifasi (tashqi faylsiz) |
| `desktop/build/make-icon.js` | Ikonka generatori (PNG, zlib bilan) |
| `desktop/package.json` | electron-builder sozlamasi (nsis / AppImage / dmg) |

## Xavfsizlik

Sayt — masofadagi kod, shuning uchun:

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`;
- preload hech qanday Node API ochmaydi;
- oyna faqat sayt domenida yuradi; boshqa havolalar tashqi brauzerda
  ochiladi (`will-navigate` + `setWindowOpenHandler`);
- kamera/mikrofon ruxsatlari rad etiladi;
- ilova ichida ixtiyoriy manzil terib bo'lmaydi (fishing sahifasidan
  himoya) — test manzili faqat `ATOYO_URL` orqali beriladi.

## macOS

`npm run dist:mac` tayyor, lekin workflow'da yoqilmagan: Apple
Developer ID (yiliga $99) bo'lmasa .dmg "noma'lum dasturchi"
ogohlantirishi bilan ochiladi. Kerak bo'lsa `desktop.yml` matritsasiga
`macos-latest` qo'shiladi.

# Atoyo — funksiyalar xaritasi (2026-10-22)

Manba: `CLAUDE.md`, `docs/QOIDALAR.md`, `REBUILD-PROMPT.md`, `AUDIT-ISHLARI.md`, `LOYIHA-HAQIDA.md`,
`TEXNOLOGIYALAR.md`, `src/app` marshrutlari, `git log`. Maqsad: boshqa loyiha (KidsWear) bilan solishtirish.

**Server haqida umumiy.** Alohida backend YO'Q: hammasi bitta Next.js 16 ilovasi (API route'lar,
Admin SDK) — Firebase App Hosting = Cloud Run (`minInstances 1`, `maxInstances 3`, 1 GiB). Cloud
Functions YO'Q. Davriy ishlar — Cloud Scheduler → `/api/cron/*` (`CRON_SECRET`) va GitHub Actions.
Ustunda **S** = server (Cloud Run route) kerak; **K** = faqat klient + Firestore (bu loyihada deyarli
yo'q: `products`/`orders` yozuvi klientga yopiq).
Holat: ✅ ishlaydi · 🔑 kod tayyor, kalit/ruxsat kutadi · 🧪 sinovda/yopiq.

## 1. Katalog va qidiruv
| Funksiya | Nima qiladi | Fayl / route | S/K | Holat |
|---|---|---|---|---|
| Server-render katalog va bosh sahifa | Birinchi sahifa SERVERDA chiziladi (SEO), filtr mos kelsa | `lib/products/storefront.ts`, `filters-key.ts`, `(main)/katalog` | S | ✅ |
| Aralash birinchi ekran | Har kategoriyadan navbat bilan (`catalogMix`, 5 daq kesh) | `loadMixedCatalogRaw` | S | ✅ |
| Cheksiz skroll, kursor | 24 tadan, filtr: kategoriya/material/brend/davlat/narx/saralash | `/api/products/list`, `catalog-server.ts` | S | ✅ |
| Kategoriya chiplari | Faqat mahsuloti borlar, `?category=` bilan | `/api/products/chip-categories` | S | ✅ |
| Qidiruv | Nom boshi + `nameTokens`, Fuse.js typo, kirill→lotin tekislash | `/api/search`, `lib/search/fuzzy.ts` | S | ✅ |
| Rasm bo'yicha qidiruv | Claude vision → so'zlar → katalog | `/api/search/image` | S | ✅ (ANTHROPIC kalit) |
| Typesense | Tezkor qidiruv, mahsulot yozilganda indeks yangilanadi | `docs/TYPESENSE.md` | S + tashqi | 🔑 server/kalit yo'q |
| Indekslar | 35 kompozit indeks; yo'q bo'lsa zaxira so'rov (xotirada filtr) | `firestore.indexes.json` | — | ✅ (CI deploy) |

## 2. Mahsulot va turlar
| Funksiya | Nima qiladi | Fayl / route | S/K | Holat |
|---|---|---|---|---|
| Mahsulot sahifasi | Galereya, "Xususiyatlari", sharh/reyting, o'xshashlar, JSON-LD, OG rasm | `(main)/mahsulot/[id]`, `lib/products/specs.ts` | S | ✅ |
| Turlar (variantlar) | Dekart ko'paytma, har turga narx/zaxira/kod, `variantsExcluded` | `lib/products/variants*`, `SegmentedPicker` | S | ✅ |
| Majburiy maydonlar | nom, kod, tannarx, optom narx, soni, kategoriya; brend/davlat `metadata/facets` dan | admin forma, `/api/admin/facets` | S | ✅ |
| Import/eksport | Excel/CSV, har tur alohida qator; import `isActive:false`; eksport oqim bilan | `/api/admin/products/import|export`, `csv.ts` | S | ✅ |
| 1C narxnoma o'giruvchi | Dollarli ro'yxat → import fayli | `scripts/convert-price-list.js` | lokal | ✅ |
| Katalogni tartiblash | Ommaviy o'chirish/ko'chirish/ochish, rasmsizlarni yashirish | `/admin/katalog/tartib` | S | ✅ |
| Savat (o'chirilganlar) | 30 kun, tiklanganda `isActive:false` | `lib/products/trash.ts`, `/admin/katalog/chiqindi` | S | ✅ |
| Chernovik | `isDraft` — saytda/kanalda yo'q | admin "Chernoviklar" filtri | S | ✅ |
| Mahsulot tarjimalari | `nameRu/En`, `descriptionRu/En` ixtiyoriy | `lib/products/i18n.ts` | S | ✅ |
| Ichki ma'lumot yashirish | 1C kodi mijozga chiqmaydi | `publicDescription()` | S | ✅ |
| Haqiqiy 3D model (image→3D) | 10–20 mahsulot uchun | `ai/specs/` (AUDIT 16) | S + pullik xizmat | 🔑 spetsifikatsiya bosqichida |

## 3. Savat va checkout
| Funksiya | Nima qiladi | Fayl / route | S/K | Holat |
|---|---|---|---|---|
| Savat | Redux + redux-persist (brauzerda saqlanadi) | `src/redux`, `(main)/savat` | K (+ narx S) | ✅ |
| Promokod | Serverda tekshiruv, rate limit | `/api/promo/validate`, `/admin/promokod` | S | ✅ |
| Yetkazish narxi va hududlar | `fee`, `freeFrom`, tuman→narx | `settings/delivery`, `/api/delivery` | S | ✅ |
| "Bepul yetkazishga X so'm qoldi" | Chiziq + farqni yopadigan mahsulotlar | `FreeDeliveryProgress`, `/api/products/gap-fillers` | S | ✅ |
| Eng kam buyurtma | Savatda blok, serverda ham tekshiriladi | `settings/pricing.minOrderAmount` | S | ✅ |
| Buyurtma yaratish | Tranzaksiya: zaxira, `salesCount`, stat; narx serverda qayta hisoblanadi | `lib/orders/create-order.ts`, `/api/orders` | S | ✅ |
| Buyurtma sxemasi / xato matni | Bitta joyda; mijozga `orderErrorMessage` | `lib/orders/order-schema.ts` | S | ✅ |
| Buyurtma chek sahifasi | Chop etish | `(main)/chek/[orderId]` | S | ✅ |
| Mijoz bekor qilishi | Zaxira bir marta qaytadi (`stockReturned`); to'langanni faqat operator | `/api/orders/[id]/cancel` | S | ✅ |

## 4. To'lov
| Funksiya | Nima qiladi | Fayl / route | S/K | Holat |
|---|---|---|---|---|
| Kartaga o'tkazma | Do'kon kartasi `settings/payment` (jumboq bilan), karta almashsa ogohlantirish | `lib/payments/transfer.ts`, `/api/admin/transfer-settings` | S | ✅ |
| Chek yuklash | jpeg/png/webp/pdf ≤8 MB, turi baytdan, `receipts/` (ochiq URL yo'q), umrbod 5 ta | `/api/orders/[id]/receipt`, `detectReceiptType` | S | ✅ |
| Chekni tasdiqlash | Guruhda "✅/❌" tugmalari va panel; `reviewTransferPayment` tranzaksiyada | `lib/orders/payment-transfer.ts`, `/api/admin/orders/[id]/receipt|payment` | S | ✅ |
| Buyurtma sahifasi kalit bilan | `/buyurtma/<id>?t=` — bazada faqat xesh, `noindex` | `(main)/buyurtma`, `canAccessOrder` | S | ✅ |
| 1 klikda buyurtma (mehmon) | ≤20 qator, takror rad, IP/telefon/umumiy limit, bot tuzog'i | `/api/orders/quick` | S | ✅ |
| Payme / Click | JSON-RPC, imzo tekshiruvi (o'z kodimiz) | `/api/payments/payme|click` | S | 🔑 merchant kalitlari kutilmoqda |
| Karta ulash (Payme Subscribe) | Faqat token + niqoblangan raqam; kalit yo'q bo'lsa "Kartalarim" yashirin | `lib/payments/cards.ts`, `/api/profile/cards`, `/api/payments/pay-with-card` | S | 🔑 |
| Uzum Pay | — | — | — | rejada |
| Qaytarish | Zaxira/tushum kamayadi, push+SMS | `/api/admin/orders/[id]/return` | S | ✅ |

## 5. Buyurtma va Telegram guruh
| Funksiya | Nima qiladi | Fayl / route | S/K | Holat |
|---|---|---|---|---|
| Yangi buyurtma → "Buyurtmalar" topic | Holat tugmalari saytdagi funksiyani chaqiradi | `lib/orders/telegram-message.ts` (`refreshOrderTelegramMessage`) | S | ✅ |
| Holat xabarlari | Telegram DM + push + email + SMS (best-effort) | `/api/admin/orders/[id]/status`, `lib/notifications` | S | ✅ (SMS/SMTP kalitga bog'liq) |
| Xodim buyruqlari | `/yangi /tahrir /narx /zaxira /top /uchir /tikla /buyurtmalar /stat /kanal /elon /namuna /stiker` | `admin-commands.ts`, `admin-session.ts` | S (webhook) | ✅ |
| "Kirim" topic | Rasm+izoh → mahsulot, turlar bloki, albom holati `intakeAlbums`, `ap|done|<id>` | `product-intake.ts`, `intake-parser.ts` | S | ✅ |
| Foydalanuvchi statistikasi | `ordersCount/totalSpent/lastOrderAt` tranzaksiyada | `lib/orders/user-stats.ts` | S | ✅ |
| Xatolar "Actions" topic'ida | `reportError`, throttled; Sentry o'rniga | `lib/ops/report-error.ts` | S | ✅ |

## 6. Mijoz boti
| Funksiya | Nima qiladi | Fayl | S/K | Holat |
|---|---|---|---|---|
| Ro'yxatdan o'tish + kanal gate | Telefon + majburiy obuna | `customer-bot.ts`, `required-channels.ts` | S | ✅ |
| Do'kon tugmalar bilan | Katalog, filtr, qidiruv, savat, promokod, checkout, buyurtmalarim, sevimlilar, sharh, blog, profil, til | `customer-bot.ts` | S | ✅ |
| AI yordamchi (`/yordamchi`) va surat qidiruv | Savat amallari `actions` bilan sessiyaga | `lib/ai/assistant.ts` | S | ✅ |
| Stikerlar | Slot tizimi; sayt stikerni o'zi chizadi (`next/og`) va `.tgs` yasaydi (`node:zlib`) | `stickers.ts`, `lib/stickers/`, `/admin/stikerlar` | S | ✅ |
| Webhook xavfsizligi | Webhook siri, HTML escape, "can't parse entities" qalqoni | `/api/telegram-webhook`, `html.ts`, `bot.ts` | S | ✅ |

## 7. Kanal va avto-post
| Funksiya | Nima qiladi | Fayl / route | S/K | Holat |
|---|---|---|---|---|
| Kanal posti | Rasm albomi+video (multipart), narx DONA, tur qatori QIYMAT→NARX→KOD | `channel.ts`, `bot.ts` | S | ✅ |
| Almashtirish tartibi | Avval yangisi, keyin eskisi; mavjud post tahrirlanadi | `announceProduct`, `channel-announce.test.ts` | S | ✅ |
| Navbat | 10 daq/5 post; xilma-xil tartib (`orderByVariety`) | `channel-queue.ts`, `/api/cron/channel` | S + Scheduler | ✅ (cron qo'yilishi kerak) |
| Postlarni yangilash | Eski postlarni hozirgi holatdan qayta quradi, sabablar guruhlanadi | `/api/admin/telegram/refresh-channel` | S | ✅ |
| Statistika | `/k/<id>` bosilishlari, forward→hisobot, `/kanal` | `app/k/[id]/route.ts`, `channel-stats.ts`, `channel-report.ts` | S | ✅ |
| Footer havolalari | `normalizeOwnLink()` eski domenni tuzatadi | `channel.ts` | S | ✅ |

## 8. Admin panel bo'limlari (`/admin`, faqat xodim; yozuvlar faqat `/api/admin/*`)
| Bo'lim | Nima | Holat |
|---|---|---|
| Katalog (`/katalog`, `yangi`, `[id]/tahrir`, `tartib`, `kirim`, `kirim/tarix`, `turlar`, `chiqindi`) | CRUD, kirim, zaxirasizlar ro'yxati, brend/davlat/kategoriya boshqaruvi | ✅ |
| Buyurtmalar | Holat, qaytarish, chek, to'lov | ✅ |
| Ombor (`/ombor`) | `stockMoves` jurnali, chiqim, inventarizatsiya, ro'yxat bo'yicha sanoq | ✅ |
| Hisobot (`/hisobot`) | Tushum, foyda (tannarx `orderCosts` dan), kunlik grafik, top-20 | ✅ |
| Foydalanuvchilar, rollar | Huquqlar (mahsulot, blog, buyurtma, promokod, tahlil, xabar, sozlama…) | ✅ |
| Optom (`/optom`) | 1C ro'yxat yuklash, maxfiy kalit `ATY-XXXX-XXXX`, yuborish | ✅ |
| Blog, Promokod, Xabar (broadcast), Sahifalar (FAQ, sharhlar tanlash) | | ✅ |
| Sozlamalar | Sayt, narx/ustama, yetkazish, Telegram, SMTP, ijtimoiy, ilova yangilanishi, tizim tekshiruvi, Storage tozalash, migratsiya tugmalari | ✅ |
| To'lovlar (`/tolovlar`) | Loyiha xarajatlari (Firebase, AI, domen…), eslatma | ✅ |
| Do'kon ekrani (`/tv`), Stikerlar, 3D (`/admin/3d`) | | ✅ / 3D 🧪 |
| Jumboq | Nozik sozlamada savol; to'g'ri javobdan keyin 10 daq ishonch oynasi | ✅ `lib/security/challenge.ts` |

## 9. Rollar va optom narx
| Funksiya | Nima qiladi | Fayl | S/K | Holat |
|---|---|---|---|---|
| Ikki narx | `price`=OPTOM, dona = optom×(1+ustama%), 100 so'mgacha yaxlitlanadi, standart 5% | `lib/products/wholesale.ts` | S | ✅ |
| Kim nimani ko'radi | Vitrina hammaga DONA (xodimga ham); optom narx faqat `role=client` va admin panelga | `viewer.ts`, `storefrontRole()` | S | ✅ |
| Optom faollashtirish | Telefon + kalit → `role=client`; limit soatiga 10 | `(main)/optom`, `/api/wholesale/activate` | S | ✅ |
| Huquqlar | `permissions.ts`, `requirePermission`; `proxy.ts` faqat cookie, rol `admin/layout.tsx` da | `lib/permissions.ts`, `src/proxy.ts` | S | ✅ |
| Kirish | Email, Google, Telegram (custom token), telefon; `NEXT_PUBLIC_AUTH_PROVIDERS` | `/api/auth/*`, `/kirish` | S | ✅ |

## 10. Yetkazish va hisob sozlamalari
`settings/delivery` — matn kodda emas (`lib/delivery/text.ts`: `freeDeliveryText`, `paidDeliveryTerms`,
`installServiceText`); chiqadi: bosh sahifa, savat, checkout, kontakt, footer, mahsulot, ilova, bot, kanal.
Ilova nusxasi `mobile/src/delivery-text.ts` parity testi bilan qulflangan. O'rnatib berish —
`Product.installService` + sozlama. `/yetkazib-berish` va `/savol-javob` sozlamadan yasaladi. ✅ (S).

## 11. Blog va ijtimoiy tarmoqlar
| Funksiya | Fayl / route | S/K | Holat |
|---|---|---|---|
| Blog CRUD, Article JSON-LD, har maqolada `destinations` | `/admin/blog`, `(main)/blog` | S | ✅ |
| Instagram (rasm/karusel/Reels), Facebook (sahifa) | `lib/social`, `/api/admin/social/*` | S | 🔑 Meta App Review, ulanish egasi tomonida |
| YouTube Shorts (blog `videoUrl`, mahsulot videosi) | `social/youtube/connect|callback` | S | 🔑 consent screen "Publish" |
| `socialQueue` (kunlik chegara, 3 urinish), tanlab joylash | `/api/cron/social` (`CRON_SECRET`) | S + Scheduler | 🔑 cron qo'yilishi kerak; faqat DONA narx |
| OAuth `state` Firestore'da (Hosting faqat `__session` o'tkazadi) | `lib/social/oauth-state.ts` | S | ✅ |

## 12. AI yordamchi (`src/lib/ai/`)
| Funksiya | Fayl | Holat |
|---|---|---|
| Sayt/ilova/bot uchun bitta miya, tool use (`search_products`, `add_to_cart`, `start_checkout`) | `assistant.ts`, `tools.ts`, `/api/assistant` | ✅ (`ANTHROPIC_API_KEY`; yo'q bo'lsa tugma yashirin) |
| Mavzu chegarasi, jailbreak naqshlari | `guard.ts` | ✅ |
| Narx/zaxira faqat bazadan | `context.ts` | ✅ |
| Rasm tahlili (admin) va Gemini rasm generatsiyasi (5 xil savdo rasmi) | `images.ts`, `/api/admin/products/[id]/ai-images` | ✅ (GEMINI kalit) |
| Sarf hisobi va oylik $ chegarasi (25 $ std), rate limit | `usage.ts`, `assertTokenQuota`, `recordTokenUse` | ✅ |

## 13. i18n va SEO
uz (asosiy, prefikssiz) va ru (`/ru`, proxy rewrite + `x-locale`) ishlaydi; en lug'ati bor, marshruti YO'Q.
`localeHref`/`LocaleLink`, har sahifada `localeAlternates()`, `sitemap.ts` uz+ru, `robots.ts`, JSON-LD
(Product, Article, FAQPage), OG rasmlar (`next/og`), canonical `atoyo.uz`. Bot uch tilda, ilova uch tilda. ✅

## 14. Qulaylik (a11y)
`aria-label`, fokus halqasi, modalda fokus qopqoni+Escape, `aria-live`, WCAG AA kontrast testi
(`lib/a11y/contrast.test.ts`), bitta `h1`; MUI temasi CSS-o'zgaruvchili (`.dark`), `muiTheme.test.ts`.
Qoida: `docs/QULAYLIK.md`. ✅

## 15. Mobil ilova (`mobile/`, RN 0.76 bare, Android; iOS yo'q)
| Funksiya | Fayl | Holat |
|---|---|---|
| Katalog, mahsulot, savat, checkout, buyurtmalar, sevimlilar, blog, profil — sayt bilan bir API | `mobile/src/screens`, `api.ts`, `query.ts` (`buildQuery`) | ✅ v1.5.2 |
| Xarid oqimi: 1 klik, o'tkazma+chek, mehmon buyurtma, to'lov ekrani | `checkout-api.ts`, `QuickBuySheet`, `OrderPaymentScreen` | ✅ |
| Onlayn to'lov tugmasi | faqat `/api/payment-info` yoqsa | 🔑 |
| Shisha UI (blur faqat iOS), kategoriya chiplari, mijozlar fikri, FAQ/Yetkazish ekranlari | `components/Glass.tsx`, `CategoryChips`, `FaqScreen` | ✅ |
| Admin rejimi (buyurtma, kirim, statistika, blog…) | `screens`, `auth.tsx` | ✅ |
| Push (FCM), widgetlar (Kotlin Glance: buyurtma/savat/xodim), video pleyer | `push.ts`, `widgets.ts`, `android/.../widget` | ✅ |
| Yangilanish banneri | `update.ts` ↔ `/api/app/version` | ✅ (APP_VERSION=versionName testi) |
| APK: CI → `latest` relizi; Play Store AAB (`release-aab.yml`) | `.github/workflows` | ✅ APK / 🔑 AAB (keystore) |

## 16. Desktop, TV, boshqa
| Funksiya | Fayl | Holat |
|---|---|---|
| `/tv` do'kon televizori (DONA narx, rasmsiz yo'q, QR, `wakeLock`, 2 daq kesh) | `src/app/tv`, `/api/tv/slides`, `/admin/tv` | ✅ |
| Desktop (Electron 33): saytning o'zini ochadi; chek chop, shtrix-skaner, TV oynasi | `desktop/`, `desktop.yml` → `desktop-latest` | ✅ (Win/Linux; macOS imzosiz yoqilmagan) |
| 3D rejim (three/gsap, dinamik import; mijozga standart O'CHIQ) | `useImmersive()`, `/admin/3d` | 🧪 |
| Pochta | `secrets/email`, `emailHint()` | ✅ (Gmail App password beqaror; Brevo/Resend tavsiya) |
| PWA | — | rejada (`manifest.json` yo'q) |

## 17. Xavfsizlik va ishonchlilik
| Funksiya | Qanday | Fayl | Holat |
|---|---|---|---|
| Narx maxfiyligi | `products` Firestore'da YOPIQ; hammasi `/api/products/*` + `toViewerProduct(s)()` + `no-store`; `costPrice` mijozga/`orders`ga chiqmaydi (`orderCosts`) | `viewer.ts`, `firestore.rules` | ✅ |
| Yopiq kolleksiyalar | `products, deletedProducts, secrets/**, wholesaleClients, socialQueue, channelQueue, channelClicks, oauthStates, aiUsage, orderCosts` | `firestore.rules` | ✅ |
| CSP + nonce | `proxy.ts` da har so'rovga; yangi inline `<script>`ga nonce | `lib/http/csp.ts`, `csp.test.ts` | ✅ |
| Rate limit | Firestore `rateLimits` (Redis yo'q); IP (IPv6 /64), telefon, global; uid bo'yicha AI | `lib/rate-limit.ts` | ✅ (XFF zanjirini productionda tekshirish kerak) |
| Redirect himoyasi | `loginUrl()` faqat ichki yo'l | `proxy.ts` | ✅ |
| Sirlar | `secrets/*` Firestore'da (env'dan ustun), saqlash jumboq bilan | `/api/admin/secrets` | ✅ |
| Storage tozalash | 30 kun, 40% qalqon, kolleksiya o'qilmasa throw | `lib/storage/cleanup.ts` | ✅ |
| Zaxira (backup) | GitHub Actions har kuni 02:00 UTC → Firestore export (Cloud Storage), 30 kundan eskisi tozalanadi; Firestore "Scheduled backups" ixtiyoriy | `.github/workflows/backup.yml`, `docs/BACKUP.md` | 🔑 `BACKUP_BUCKET` + service account kerak |
| Firestore qoidalari/indekslar deploy | main'ga push → CI (sandbox'dan emas) | `ci.yml` | 🔑 `FIREBASE_SERVICE_ACCOUNT` |
| Xato monitoringi | Telegram "Actions" topic (Sentry yo'q) | `report-error.ts` | ✅ |
| Testlar / CI | Vitest ~42 fayl (≈291 test), tsc, eslint, build, ilova codegen | `ci.yml` | ✅ |

## Oxirgi o'zgarishlar (2026-09 — 2026-10)
- **09-09…10:** domen `atoyo.uz`; xavfsizlik auditi (admin redirect, CSP nonce, upload huquqi); Google kirishda hisob tanlash majburiy.
- **09-18…20:** `TEXNOLOGIYALAR.md`; tur tannarxi kirimda; **katalog/bosh sahifa SERVERDA chiziladi** (SEO); **`/ru` marshrutlari**; to'liq a11y; jumboq kamaytirildi.
- **09-21:** katalog birinchi ekrani aralash; kanal navbati xilma-xil tartibda; pochta xatosi endi jim qolmaydi.
- **09-25/26:** chernovik nosozligi; ish arxitekturasi (`ISH-ARXITEKTURASI.md`, rollar-agentlar); **kartaga o'tkazma + chek**, **1 klikda sotib olish**; yetkazish matni shartni aytadi, "bepul yetkazishga X qoldi"; kategoriya chiplari, "Xususiyatlari"; tekshiruvchi 2 halqa tuzatishlari.
- **10-04 (eng katta kun):** `/savol-javob`, `/yetkazib-berish`, "Mijozlar fikri"; kirmagan mijoz butun savatni buyurtma qiladi; default branch → `main`; **audit ishlari 8–14** (CSV eksport oqimi, `/k` himoyasi, tungi rejim MUI `.dark`, foydalanuvchi statistikasi N+1 yo'q, jim xatolar → `reportError`, mehmon yo'li testlari, `validationMessage`); **Android 1.4 → 1.5 → 1.5.2** (katalog bo'sh edi — `URLSearchParams` Hermes'da yo'q; sayt bilan tenglashtirish: shisha UI, chiplar, xarid oqimi, FAQ ekranlari; Android'da blur o'chirildi).
- **10-08:** audit 1–15 yopildi; qolgan: 16 (haqiqiy 3D), 3.7 (800+ qatorli fayllarni bo'lish), 3.5 (three chunk), GA `page_location`.
- **10-21:** `CLAUDE.md` 36 KB → ~7 KB, to'liq qoidalar `docs/QOIDALAR.md` ga ko'chdi; hujjatlar kod bilan solishtirildi.
- **Egasi qiladigan:** ilova 1.5.2 ni panelda e'lon qilish; XFF zanjirini tekshirish; Payme/Click kalitlari; cron'lar (`/api/cron/channel|social`); `BACKUP_BUCKET`; Meta/YouTube ruxsatlari.

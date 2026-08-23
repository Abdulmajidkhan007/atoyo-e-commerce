import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  sendChatMessage,
  sendMediaGroup,
  sendVideo,
  editMessageCaptionOrText,
  deleteMessage,
  type MediaItem,
} from "./bot";
import { effectivePrice, isDiscountActive } from "@/lib/products/pricing";
import { publicDescription } from "@/lib/products/description";
import { BUILTIN_UNITS, DEFAULT_UNIT, labelOf } from "@/lib/products/taxonomy";
import { getTaxonomy } from "@/lib/products/taxonomy-server";
import { escapeHtml } from "@/lib/telegram/html";
import {
  hasVariants,
  minVariantPrice,
  variantLabel,
  variantPrice,
} from "@/lib/products/variants";
import { getSiteSettings } from "@/lib/firebase/admin-content";
import { sendPushToTopic, PRODUCTS_TOPIC } from "@/lib/notifications/push";
import type { Product } from "@/types/product";
import type { BlogPost, ChannelPostFooter } from "@/types/content";
import { formatSom } from "@/lib/format";
import { getPricingSettings } from "@/lib/products/pricing-settings";
import { toViewerProduct } from "@/lib/products/viewer";
import { getDeliverySettings } from "@/lib/orders/pricing";
import {
  dueChannelPosts,
  enqueueChannelPost,
  markQueueAttempt,
  removeFromQueue,
  reserveChannelSlot,
} from "./channel-queue";
import { freeDeliveryShort, installServiceText } from "@/lib/delivery/text";
import { logAction } from "./action-log";
import { truncateHtml } from "./html-truncate";
import { escapeHtml } from "./html";

const SETTINGS_DOC_PATH = "settings/telegram";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://atoyo-uz.web.app").replace(/\/$/, "");
}

/**
 * E'LON KANALI ID'si. Avval Firestore `settings/telegram.channelId`
 * (admin panelning Bot sozlamalari sahifasidan o'zgartiriladi), keyin
 * `TELEGRAM_CHANNEL_ID` env. Ikkalasi ham bo'sh bo'lsa - e'lon
 * yuborilmaydi (xato ham bermaydi).
 */
export async function resolveChannelId(): Promise<string | null> {
  try {
    const snap = await getAdminDb().doc(SETTINGS_DOC_PATH).get();
    const fromDb = (snap.data()?.channelId as string | undefined)?.trim();
    if (fromDb) return fromDb;
  } catch {
    // Firestore o'qilmasa - env'ga tushamiz.
  }
  return process.env.TELEGRAM_CHANNEL_ID?.trim() || null;
}

/** `publish()` natijasi: yuborilgan post yoki SABABI bilan xato. */
interface PublishOutcome {
  sent: { chatId: string; messageId: number; hasPhoto: boolean } | null;
  /** Postga haqiqatan tushgan media soni (`channelPhotoCount` uchun). */
  count: number;
  /** Yiqilgan bo'lsa - Telegram aytgan sabab (xodimga ko'rsatiladi). */
  error?: string;
  /** To'liq albom o'tmay, kamroq narsa bilan chiqqan bo'lsa. */
  degraded?: "no-video";
}

/**
 * Kanalga e'lon yuboradi.
 *
 * MUHIM: xato SABABI bilan qaytadi (ilgari `null` qaytarardi va nima
 * bo'lgani faqat serverning konsolida qolardi). Chaqiruvchi shu
 * sababni xodimlar guruhiga yozadi.
 *
 * ZAXIRA YO'L: albomda VIDEO bo'lsa Telegram uni o'zi havoladan
 * yuklab olishi kerak va bu yiqilishi mumkin (fayl sekin ochilsa,
 * hajmi katta bo'lsa...). Bunday holda post umuman chiqmay
 * qolmasligi uchun ikkinchi urinish FAQAT RASMLAR bilan bo'ladi -
 * video baribir saytda va ilovada ko'rinadi.
 */
async function publish(
  text: string,
  options: { photoUrl?: string; media?: MediaItem[]; buttonText: string; buttonUrl: string }
): Promise<PublishOutcome> {
  const channelId = await resolveChannelId();
  if (!channelId) return { sent: null, count: 0, error: "Kanal sozlanmagan." };

  // Bir nechta rasm bo'lsa - albom. Albomga inline tugma qo'shib
  // bo'lmaydi, shuning uchun havola caption ichida beriladi.
  const gallery = (options.media ?? []).filter((item) => item.url).slice(0, 10);
  /**
   * OXIRGI QALQON. Telegram cheklovi: rasm/video izohi 1024 belgi,
   * oddiy xabar 4096. Matn yuqorida ham qisqartiriladi, lekin footer
   * yoki havola qo'shilgach chegara oshib ketishi mumkin edi va
   * Telegram butun postni rad etardi. `truncateHtml` HTML'ni
   * buzmasdan kesadi (teg o'rtasidan kesmaydi, ochiq tegni yopadi).
   */
  const caption = truncateHtml(
    `${text}\n\n<a href="${options.buttonUrl}">${options.buttonText}</a>`,
    1024
  );

  const sendAlbum = async (items: MediaItem[]) => {
    const sent = await sendMediaGroup(channelId, items, { caption });
    const first = sent[0];
    return first
      ? { chatId: channelId, messageId: first.message_id, hasPhoto: true }
      : null;
  };

  const sendSingle = async (items: MediaItem[]) => {
    const photoUrl = items[0]?.url ?? options.photoUrl ?? undefined;
    // Rasmli xabarda izoh 1024, rasmsizda matn 4096 belgi.
    const body = truncateHtml(text, photoUrl ? 1024 : 4096);
    const sent = await sendChatMessage(channelId, body, {
      photoUrl,
      replyMarkup: { inline_keyboard: [[{ text: options.buttonText, url: options.buttonUrl }]] },
    });
    return { chatId: channelId, messageId: sent.message_id, hasPhoto: Boolean(photoUrl) };
  };

  try {
    if (gallery.length > 1) {
      return { sent: await sendAlbum(gallery), count: gallery.length };
    }
    return { sent: await sendSingle(gallery), count: gallery.length };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Noma'lum xato";
    console.error("Kanalga e'lon yuborishda xato:", error);

    // Zaxira: videosiz qayta urinamiz (video ko'pincha aybdor bo'ladi).
    const photos = gallery.filter((item) => item.type === "photo");
    if (photos.length < gallery.length && photos.length > 0) {
      try {
        const sent = photos.length > 1 ? await sendAlbum(photos) : await sendSingle(photos);
        return { sent, count: photos.length, degraded: "no-video", error: reason };
      } catch (retryError) {
        console.error("Videosiz qayta urinish ham yiqildi:", retryError);
      }
    }

    return { sent: null, count: 0, error: reason };
  }
}

/**
 * POST FOOTERI: telefon(lar) -> shior -> manzil -> havolalar.
 * Admin panel > Sozlamalar > "Kanal posti footeri" dan boshqariladi.
 * Hech narsa yozilmagan bo'lsa footer umuman qo'shilmaydi.
 */
function buildFooter(footer: ChannelPostFooter | undefined): string {
  if (!footer) return "";

  const blocks: string[] = [];

  const phones = footer.phones.map((phone) => phone.trim()).filter(Boolean);
  if (phones.length > 0) {
    blocks.push(phones.map((phone) => `📞 ${escapeHtml(phone)}`).join("\n"));
  }

  const slogan = footer.slogan.trim();
  if (slogan) blocks.push(`<i>${escapeHtml(slogan)}</i>`);

  const address = footer.address.trim();
  if (address) blocks.push(`📍 ${escapeHtml(address)}`);

  // Havolalar bitta qatorda: Telegram | Instagram | YouTube | Operator | Sayt
  const links = footer.links
    .filter((link) => link.title.trim() && link.url.trim())
    .map((link) => `<a href="${escapeHtml(link.url.trim())}">${escapeHtml(link.title.trim())}</a>`);
  if (links.length > 0) blocks.push(links.join(" | "));

  return blocks.length > 0 ? `\n\n${blocks.join("\n\n")}` : "";
}

/**
 * Kanal postining footeri (telefon, shior, manzil, havolalar) —
 * TASHQARIGA ochiq: e'lon (`sendBroadcast`) ham xuddi mahsulot posti
 * kabi ko'rinishi uchun shu funksiyani chaqiradi.
 */
export async function channelFooterText(): Promise<string> {
  return buildFooter(await loadFooter());
}

/** Sozlamalardagi footer. O'qib bo'lmasa e'lon footersiz ketaveradi. */
async function loadFooter(): Promise<ChannelPostFooter | undefined> {
  try {
    return (await getSiteSettings()).channelFooter;
  } catch {
    return undefined;
  }
}

/**
 * E'LON TURI:
 *   • `new`      - "🆕 Yangi mahsulot!" (birinchi marta e'lon qilinganda);
 *   • `updated`  - "♻️ Mahsulot yangilandi" (narx o'zgardi, chegirma
 *                  berildi yoki tugab qolgan mahsulot qayta keldi);
 *   • `refresh`  - postdagi ma'lumot jimgina yangilanadi, sarlavha esa
 *                  avvalgicha qoladi (ixtiyoriy maydon to'ldirilganda —
 *                  yangi mahsulot "yangilandi" deb ko'rinmasligi uchun).
 */
/**
 * `new`     - yangi mahsulot e'loni;
 * `updated` - narx/chegirma o'zgardi (post tahrirlanadi, sarlavha "yangilandi");
 * `refresh` - postni JIMGINA yangilash (bildirishnoma yo'q);
 * `repost`  - eski postni O'CHIRIB, kanalga YANGISINI tashlash (admin
 *             "qayta post qilish"ni tanlaganda).
 */
export type AnnounceMode = "new" | "updated" | "refresh" | "repost";

/**
 * E'lon natijasi - chaqiruvchi nima bo'lganini bilishi uchun.
 * Ilgari funksiya `void` qaytarardi va admin panel eski postni jimgina
 * tahrirlaganda ham "kanalga joylandi" deb yozardi.
 */
/**
 * `announceProduct` natijasi.
 *
 * `failed` — Telegram postni qabul qilmadi. Bunda ESKI POST JOYIDA
 * QOLADI (pastdagi izohga qarang) va sabab xodimlar guruhiga yoziladi.
 */
export type AnnounceResult =
  | "posted"
  | "edited"
  | "unchanged"
  | "skipped"
  | "queued"
  | "failed";

/**
 * Mahsulot o'zgarishi kanalda "yangilandi" deb e'lon qilinishga
 * arziydimi? Faqat NARX, CHEGIRMA va tugagandan keyin QAYTA KELISH
 * shunga arziydi; qolgan tahrirlar postni jimgina yangilaydi.
 */
export function announceModeFor(before: Product, after: Product): AnnounceMode {
  if (!after.channelMessageId) return "new";
  if (after.price !== before.price) return "updated";
  if ((after.discountPrice ?? null) !== (before.discountPrice ?? null)) return "updated";
  if ((after.discountUntil ?? null) !== (before.discountUntil ?? null)) return "updated";
  if ((before.stock ?? 0) <= 0 && (after.stock ?? 0) > 0) return "updated";
  return "refresh";
}

/**
 * KANAL UCHUN MAHSULOT: narx DONA narxga o'giriladi.
 *
 * Bazadagi `price` - OPTOM narx. Kanal esa hammaga ochiq, ya'ni
 * u yerda optom narx turishi ham xato, ham maxfiylikning buzilishi
 * (bir marta shunday bo'lgan: kanalda 70 000 turgan, saytda esa
 * dona narx 78 700). `undefined` rol - "oddiy mijoz", ya'ni dona narx.
 */
async function forChannel(product: Product): Promise<Product> {
  return toViewerProduct(product, undefined, await getPricingSettings());
}

/**
 * Kategoriya nomi (post sarlavhasidan keyin turadi). Ro'yxat kam
 * o'zgaradi, e'lon esa ommaviy ketadi (40 tadan) - shuning uchun
 * bir daqiqa keshlanadi.
 */
let taxonomyCache: { at: number; categories: { slug: string; label: string }[] } | null = null;

async function categoryLabelOf(product: Product): Promise<string> {
  if (!product.category) return "";
  try {
    if (!taxonomyCache || Date.now() - taxonomyCache.at > 60_000) {
      const taxonomy = await getTaxonomy();
      taxonomyCache = { at: Date.now(), categories: taxonomy.categories };
    }
    return labelOf(taxonomyCache.categories, product.category);
  } catch {
    return product.category;
  }
}

/**
 * KANAL POSTIDAGI YETKAZIB BERISH QATORI.
 *
 * Matn sozlamadan keladi (`settings/delivery`) va 60 soniya
 * keshlanadi — kanalni yangilashda o'nlab post ketma-ket qayta
 * quriladi, har biriga alohida Firestore o'qishi shart emas.
 * Sozlama o'qilmasa qator umuman qo'shilmaydi (post ketaveradi).
 */
let deliveryCache: { at: number; line: string } | null = null;
async function deliveryLine(): Promise<string> {
  try {
    if (!deliveryCache || Date.now() - deliveryCache.at > 60_000) {
      const settings = await getDeliverySettings();
      deliveryCache = { at: Date.now(), line: `🚚 ${escapeHtml(freeDeliveryShort(settings))}` };
    }
    return deliveryCache.line;
  } catch {
    return "";
  }
}

/** O'rnatish xizmati kanalda ham aytiladi (mahsulotda belgilangan bo'lsa). */
async function installLine(product: Product): Promise<string> {
  if (!product.installService) return "";
  try {
    return installServiceText(await getDeliverySettings()) ? "🛠 <b>O'rnatib berish xizmati bor</b>" : "";
  } catch {
    return "";
  }
}

/** Kanal postida ko'rsatiladigan turlar soni (post juda uzun bo'lmasligi uchun). */
const MAX_VARIANT_LINES = 15;

/**
 * Mahsulot e'loni matni (yangi post uchun ham, tahrir uchun ham bir xil).
 *
 * DIQQAT: bu yerga DONA NARXga o'girilgan mahsulot berilishi shart
 * (`forChannel()`). Kanal ochiq - u yerda optom narx turmasligi kerak.
 */
export function buildProductText(
  product: Product,
  mode: "new" | "updated",
  categoryLabel = "",
  /** Qo'shimcha qatorlar (o'rnatish xizmati kabi) - tavsifdan oldin. */
  extraLines: string[] = []
): string {
  const hasDiscount = isDiscountActive(product);
  // Sotish turi (dona/metr/kg...) - narx va zaxira shu birlikda.
  const unit = labelOf(BUILTIN_UNITS, product.unit) || product.unit || DEFAULT_UNIT;
  // Turlari bo'lsa narx "eng arzonidan" ko'rinishida chiqadi.
  const withVariants = hasVariants(product);
  const priceLine = withVariants
    ? `💰 <b>${formatSom(minVariantPrice(product) ?? product.price)}</b> dan / ${unit}`
    : hasDiscount
      ? `💰 <s>${formatSom(product.price)}</s> <b>${formatSom(effectivePrice(product))}</b> / ${unit}`
      : `💰 <b>${formatSom(product.price)}</b> / ${unit}`;

  const lines = [
    mode === "new" ? "🆕 <b>Yangi mahsulot!</b>" : "♻️ <b>Mahsulot yangilandi</b>",
    ``,
    `<b>${escapeHtml(product.name)}</b>`,
  ];
  // TARTIB: nomi → brend/davlat → kategoriya → narx → turlar → material.
  // Mahsulot kodi turlari bor mahsulotda ro'yxatning ichida turadi
  // (har turning o'z kodi bor), shuning uchun yuqorida takrorlanmaydi.
  if (product.brand || product.manufacturerCountry) {
    lines.push(`🏷 ${escapeHtml([product.brand, product.manufacturerCountry].filter(Boolean).join(" • "))}`);
  }
  if (categoryLabel) lines.push(`📂 ${escapeHtml(categoryLabel)}`);
  if (product.sku && !withVariants) lines.push(`#️⃣ Kod: <code>${escapeHtml(product.sku)}</code>`);
  lines.push(priceLine);
  if (withVariants) {
    /**
     * TUR QATORI: avval TANLOV (rang/o'lcham), keyin NARX, oxirida KOD.
     *
     * Ilgari kod eng oldida turardi va qator "SJ-03 Ruskin · Satin Gold
     * — 91 400" bo'lib chiqardi: qaysi narx qaysi kodga tegishli ekani
     * bilinmasdi. Endi mijoz avval o'zi tanlaydigan narsani, keyin
     * uning narxini ko'radi; kod esa "kod:" deb alohida yoziladi.
     */
    const axes = product.variantAxes ?? [];
    // Bitta qator bo'lsa uning nomi ("Rangi:"), ko'p bo'lsa - "Turlari:"
    // (ikki-uch nomni "•" bilan qo'shib yozish chalkash ko'rinardi).
    const header = axes.length === 1 ? (axes[0]?.label ?? "Turlari") : "Turlari";
    lines.push(`🔀 <b>${escapeHtml(header)}:</b>`);
    const rows = product.variants ?? [];
    for (const row of rows.slice(0, MAX_VARIANT_LINES)) {
      const label = variantLabel(product, row) || Object.values(row.options).join(" • ");
      const parts = [`   • ${escapeHtml(label)} — <b>${formatSom(variantPrice(row))}</b>`];
      if (row.sku) parts.push(`kod: <code>${escapeHtml(row.sku)}</code>`);
      if (row.stock <= 0) parts.push("tugagan");
      lines.push(parts.join(" · "));
    }
    if (rows.length > MAX_VARIANT_LINES) {
      lines.push(`   • ...va yana ${rows.length - MAX_VARIANT_LINES} ta tur (saytda)`);
    }
  }
  // ZAXIRA MIQDORI e'londa KO'RSATILMAYDI - raqobatchi ham, mijoz ham
  // "nechta qolgani" ni bilishi shart emas; tugagani esa yuqorida
  // turning yonida yozilgan.
  if (product.material) lines.push(`🧱 ${escapeHtml(MATERIAL_LABELS[product.material] ?? product.material)}`);
  // Tavsifdan ichki xizmat ma'lumoti (1C kodi) olib tashlanadi -
  // u faqat xodimlar uchun, kanalda ko'rinmasligi kerak.
  for (const line of extraLines.filter(Boolean)) lines.push(line);
  const about = publicDescription(product.description);
  if (about) lines.push(``, escapeHtml(about.slice(0, 400)));

  return lines.join("\n");
}

const MATERIAL_LABELS: Record<string, string> = {
  polypropylene: "Polipropilen",
  "metal-plastic": "Metalloplastik",
  steel: "Po'lat",
  copper: "Mis",
  brass: "Latun",
  "cast-iron": "Cho'yan",
  pvc: "PVX",
};

/**
 * KANALDAGI ESKI POSTNI JOYIDA YANGILAYDI (yangi post tashlamaydi).
 *
 * Sayt domeni o'zgarganda eski postlardagi "Saytda ko'rish" havolasi
 * eski manzilga qarab qoladi. Bu funksiya postning matnini va tugmasini
 * HOZIRGI holat bilan qayta yozadi - postlar joyida qoladi, obunachilarga
 * takror xabar bormaydi.
 *
 * Qaytaradi: `updated` - yangilandi, `unchanged` - o'zgarish yo'q edi,
 * `skipped` - postga bog'lanmagan mahsulot, `failed` - Telegram rad etdi
 * (masalan post juda eski yoki o'chirilgan).
 */
export interface RefreshResult {
  status: "updated" | "unchanged" | "skipped" | "missing" | "failed";
  /** Yiqilgan bo'lsa - Telegram aytgan sabab (adminga ko'rsatiladi). */
  reason?: string;
}

/**
 * Telegram xatosini tanib olish. Sabab MUHIM: "post o'chirilgan" va
 * "rasm o'rniga matn tahrirlanmoqda" mutlaqo boshqa narsalar, lekin
 * ilgari ikkalasi ham "Telegram ruxsat bermadi" bo'lib chiqardi.
 */
function classify(message: string): "not-modified" | "missing" | "wrong-kind" | "other" {
  if (/not modified/i.test(message)) return "not-modified";
  if (/message to edit not found|MESSAGE_ID_INVALID|message can't be edited|message identifier is not specified/i.test(message)) {
    return "missing";
  }
  // Post rasm bilan yuborilgan, biz esa matnini tahrirlamoqchimiz
  // (yoki teskarisi) - mahsulotdan rasm olib tashlanganda shunday bo'ladi.
  if (/there is no text in the message|there is no caption in the message|MESSAGE_CAPTION|message to edit has no text/i.test(message)) {
    return "wrong-kind";
  }
  return "other";
}

export async function refreshChannelPost(product: Product): Promise<RefreshResult> {
  if (!product.channelChatId || !product.channelMessageId) return { status: "skipped" };

  const gallery: MediaItem[] = [
    ...(product.images ?? []).filter(Boolean).map((url) => ({ url, type: "photo" as const })),
    ...(product.videos ?? []).filter(Boolean).map((url) => ({ url, type: "video" as const })),
  ].slice(0, 10);

  const header: "new" | "updated" = product.channelMode ?? "new";
  const body = buildProductText(await forChannel(product), header, await categoryLabelOf(product), [
    await installLine(product),
  ]);
  // Yetkazib berish va'dasi footerning eng tepasida - har postda
  // ko'rinadi (mijoz "yetkazasizmi?" deb yozishi shart emas).
  const promise = await deliveryLine();
  const footer = `${promise ? `\n\n${promise}` : ""}${buildFooter(await loadFooter())}`;
  const budget = 850 - footer.length;
  // Kesish HTML'ni BUZMASLIGI kerak: `truncateHtml` teg va entity
  // o'rtasidan kesmaydi va ochiq qolgan tegni o'zi yopadi. Ilgari
  // oddiy `slice()` edi va Telegram butun postni rad etardi
  // ("Can't find end tag corresponding to start tag b").
  const text = gallery.length > 1 ? truncateHtml(body, Math.max(120, budget)) : body;
  const caption = `${text}${footer}`;
  // Tugma SANALADIGAN havolaga qaraydi (`/k/<id>`): u bosilishni
  // yozib, mahsulot sahifasiga yo'naltiradi (`lib/telegram/channel-stats.ts`).
  const buttonUrl = `${siteUrl()}/k/${product.id}`;
  const buttonText = "🛒 Saytda ko'rish";

  // Telegram cheklovi: rasm/video izohi 1024 belgi (HTML buzilmasin).
  const finalText = truncateHtml(
    gallery.length > 1 ? `${caption}\n\n<a href="${buttonUrl}">${buttonText}</a>` : caption,
    gallery.length > 0 || product.thumbnailUrl ? 1024 : 4096
  );
  const replyMarkup =
    gallery.length > 1 ? undefined : { inline_keyboard: [[{ text: buttonText, url: buttonUrl }]] };

  const edit = (hasPhoto: boolean) =>
    editMessageCaptionOrText({
      chatId: product.channelChatId!,
      messageId: product.channelMessageId!,
      hasPhoto,
      text: finalText,
      replyMarkup,
    });

  // Postda rasm bor-yo'qligini MAHSULOTDAN taxmin qilamiz. Lekin
  // mahsulotdan keyinchalik rasm olib tashlangan bo'lsa taxmin
  // noto'g'ri chiqadi - o'shanda Telegram "matn yo'q" deydi va biz
  // ikkinchi usul bilan qayta urinamiz.
  const guess = gallery.length > 0;

  try {
    await edit(guess);
    return { status: "updated" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const kind = classify(message);

    if (kind === "not-modified") return { status: "unchanged" };

    if (kind === "wrong-kind") {
      try {
        await edit(!guess);
        return { status: "updated" };
      } catch (retryError) {
        const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
        if (classify(retryMessage) === "not-modified") return { status: "unchanged" };
        console.error(`Kanaldagi postni yangilashda xato (${product.id}):`, retryError);
        return { status: "failed", reason: retryMessage };
      }
    }

    if (kind === "missing") {
      // Post kanaldan o'chirilgan - bog'lanishni uzamiz, shunda
      // mahsulotni QAYTADAN e'lon qilish mumkin bo'ladi (aks holda
      // u "kanalda bor" deb hisoblanib, hech qachon chiqmasdi).
      await getAdminDb()
        .collection("products")
        .doc(product.id)
        .update({ channelMessageId: FieldValue.delete(), channelChatId: FieldValue.delete() })
        .catch(() => {});
      return { status: "missing", reason: message };
    }

    console.error(`Kanaldagi postni yangilashda xato (${product.id}):`, error);
    return { status: "failed", reason: message };
  }
}

/**
 * Yangi yoki tahrirlangan mahsulot e'loni.
 *
 * Mahsulot yangilanganda kanalga YANGI post tashlanmaydi - avvalgi
 * postning izohi tahrirlanadi (kanal takror e'lonlar bilan to'lib
 * ketmasligi uchun). Rasmlar soni o'zgargan bo'lsa (yangi rasm
 * qo'shilgan) - eski post o'chirilib, yangisi tashlanadi, chunki
 * yuborilgan albomga rasm qo'shib bo'lmaydi.
 */
export async function announceProduct(
  product: Product,
  mode: AnnounceMode = "new",
  options: { fromQueue?: boolean } = {}
): Promise<AnnounceResult> {
  // Chernovik hali e'lon qilinmaydi - "✅ Yetarli, tayyor" bosilgandan
  // (yoki kirim orqali zaxira kelgandan) keyin chiqadi.
  if (!product.isActive || product.isDraft) return "skipped";

  /**
   * TEZLIK CHEGARASI (masalan 10 daqiqada 5 ta post).
   *
   * Faqat YANGI post chegaraga tushadi: mavjud postni tahrirlash
   * (`refresh`, narx yangilanishi) obunachiga bildirishnoma
   * yubormaydi va kanalni to'ldirmaydi.
   *
   * Chegaradan oshgani TASHLANMAYDI - navbatga qo'yiladi va oyna
   * bo'shashi bilan avtomatik chiqadi (`drainChannelQueue`).
   */
  const isNewPost = !product.channelMessageId || mode === "repost";
  if (isNewPost && !options.fromQueue) {
    // Avval NAVBATDAGI eskilarini chiqaramiz: cron sozlanmagan
    // bo'lsa ham navbat harakatlanib turadi ("tirik" qoladi).
    await drainChannelQueue(2).catch(() => ({ posted: 0, failed: 0 }));

    const slot = await reserveChannelSlot();
    if (!slot.allowed) {
      await enqueueChannelPost(product.id, product.name, slot.nextAt).catch((error) =>
        console.error("Kanal navbatiga qo'shishda xato:", error)
      );
      return "queued";
    }
  }

  // Sarlavha: `refresh` bo'lsa postdagi avvalgi sarlavha saqlanadi.
  const header: "new" | "updated" =
    mode === "refresh" ? (product.channelMode ?? "new") : mode === "repost" ? "new" : mode;

  // Mobil ilovaga push: faqat HAQIQIY yangilik bo'lganda (yangi mahsulot
  // yoki narx/chegirma o'zgarishi). `refresh` - postni jimgina yangilash,
  // undan bildirishnoma chiqmaydi.
  if (mode !== "refresh") {
    const hasDiscountNow = isDiscountActive(product);
    // Push HAMMA ilova foydalanuvchisiga boradi - narx DONA narx.
    const shown = await forChannel(product);
    await sendPushToTopic(PRODUCTS_TOPIC, {
      title: mode === "new" ? "Yangi mahsulot" : hasDiscountNow ? "Chegirma!" : "Narx yangilandi",
      body: `${shown.name} — ${formatSom(
        hasVariants(shown) ? (minVariantPrice(shown) ?? shown.price) : effectivePrice(shown)
      )}${hasVariants(shown) ? " dan" : ""}`,
      data: { screen: "Mahsulot", productId: product.id },
    });
  }

  // Rasmlar + videolar bitta albomga (Telegram aralash albomga ruxsat beradi).
  const gallery: MediaItem[] = [
    ...(product.images ?? []).filter(Boolean).map((url) => ({ url, type: "photo" as const })),
    ...(product.videos ?? []).filter(Boolean).map((url) => ({ url, type: "video" as const })),
  ].slice(0, 10);
  const body = buildProductText(await forChannel(product), header, await categoryLabelOf(product), [
    await installLine(product),
  ]);
  // Yetkazib berish va'dasi footerning eng tepasida - har postda
  // ko'rinadi (mijoz "yetkazasizmi?" deb yozishi shart emas).
  const promise = await deliveryLine();
  const footer = `${promise ? `\n\n${promise}` : ""}${buildFooter(await loadFooter())}`;
  // Albom caption'i 1024 belgi bilan cheklangan - tavsif uzun bo'lsa
  // e'lon jimgina kesilib qolmasligi uchun mahsulot qismini qisqartiramiz
  // (footer - telefon, shior, havolalar - har doim to'liq qolsin).
  const budget = 850 - footer.length;
  // Kesish HTML'ni BUZMASLIGI kerak: `truncateHtml` teg va entity
  // o'rtasidan kesmaydi va ochiq qolgan tegni o'zi yopadi. Ilgari
  // oddiy `slice()` edi va Telegram butun postni rad etardi
  // ("Can't find end tag corresponding to start tag b").
  const text = gallery.length > 1 ? truncateHtml(body, Math.max(120, budget)) : body;
  const caption = `${text}${footer}`;
  // Tugma SANALADIGAN havolaga qaraydi (`/k/<id>`): u bosilishni
  // yozib, mahsulot sahifasiga yo'naltiradi (`lib/telegram/channel-stats.ts`).
  const buttonUrl = `${siteUrl()}/k/${product.id}`;
  const buttonText = "🛒 Saytda ko'rish";

  let posted =
    product.channelChatId && product.channelMessageId
      ? {
          chatId: product.channelChatId,
          messageId: product.channelMessageId,
          photoCount: product.channelPhotoCount ?? 0,
        }
      : null;

  /**
   * ESKI POST YANGISI CHIQQANDAN KEYIN O'CHIRILADI (buzilmasin).
   *
   * Ilgari tartib teskari edi: avval eski post o'chirilib, keyin
   * yangisi yuborilardi. Yangisi yiqilsa (masalan albomdagi videoni
   * Telegram yuklab ololmasa) kanalda MAHSULOT UMUMAN QOLMASDI -
   * "o'chirib yubordi va qaytadan tashlamadi". Endi eski post
   * faqat yangisi muvaffaqiyatli chiqqanda o'chiriladi.
   */
  const replacing = mode === "repost" && posted ? posted : null;
  if (replacing) posted = null;

  // 1) Post bor va rasmlar o'zgarmagan - o'shanisini tahrirlaymiz.
  if (posted && posted.photoCount === gallery.length) {
    try {
      await editMessageCaptionOrText({
        chatId: posted.chatId,
        messageId: posted.messageId,
        hasPhoto: gallery.length > 0,
        text: gallery.length > 1 ? `${caption}\n\n<a href="${buttonUrl}">${buttonText}</a>` : caption,
        replyMarkup:
          gallery.length > 1
            ? undefined
            : { inline_keyboard: [[{ text: buttonText, url: buttonUrl }]] },
      });
      // Sarlavha o'zgargan bo'lsa (masalan narx yangilandi) - eslab qolamiz,
      // keyingi jimgina yangilanishlar shu sarlavhani saqlab qoladi.
      if (header !== product.channelMode) {
        await getAdminDb()
          .collection("products")
          .doc(product.id)
          .update({ channelMode: header })
          .catch(() => {});
      }
      return "edited";
    } catch (error) {
      // Matn o'zgarmagan bo'lsa Telegram xato beradi - bu xato emas.
      if (error instanceof Error && /not modified/i.test(error.message)) return "unchanged";
      // Xabar o'chirilgan/juda eski bo'lsa - pastda yangisini tashlaymiz.
      console.error("Kanaldagi e'lonni tahrirlashda xato:", error);
    }
  }

  // 2) Media soni o'zgargan (rasm/video qo'shilgan yoki olib
  //    tashlangan) - albomni tahrirlab bo'lmaydi, yangisi kerak.
  //    Eskisi PASTDA, yangisi chiqqandan keyin o'chiriladi.
  const outdated = replacing ?? (posted && posted.photoCount !== gallery.length ? posted : null);

  const outcome = await publish(caption, {
    photoUrl: product.thumbnailUrl,
    media: gallery,
    buttonText,
    buttonUrl,
  });
  const sent = outcome.sent;

  if (!sent) {
    // Yangi post chiqmadi - eski post JOYIDA QOLDI. Sabab xodimlar
    // guruhiga yoziladi, aks holda "post yo'qoldi" deb qolinardi.
    await logAction(
      `⚠️ Kanalga post chiqmadi: ${product.name}\nSabab: ${outcome.error ?? "noma'lum"}`
    ).catch(() => {});
    return "failed";
  }

  // Yangisi chiqdi - endi eskisini olib tashlash xavfsiz.
  if (outdated) {
    /**
     * Eski postni o'chirish YIQILSA JIMGINA O'TIB KETMAYDI.
     *
     * Ilgari xato yutilardi va kanalda bir mahsulotning IKKI posti
     * qolib ketardi — nega qolganini bilib bo'lmasdi. Eng ko'p
     * uchraydigan sabab: botda kanalda "Delete messages" huquqi
     * yo'q. Endi sabab xodimlar guruhiga yoziladi.
     */
    await deleteMessage(outdated.chatId, outdated.messageId).catch(async (error) => {
      const reason = error instanceof Error ? error.message : "noma'lum";
      console.error("Eski kanal postini o'chirib bo'lmadi:", error);
      await logAction(
        `⚠️ Eski kanal posti o'chmadi: ${product.name}\n` +
          `Sabab: ${reason}\n` +
          `Kanalda ikkita post qolgan bo'lishi mumkin — eskisini qo'lda o'chiring. ` +
          `Ko'p uchraydigan sabab: botda kanalda "Delete messages" huquqi yo'q.`
      ).catch(() => {});
    });
  }

  if (outcome.degraded === "no-video") {
    await logAction(
      `⚠️ Kanal posti VIDEOSIZ chiqdi: ${product.name}\nTelegram videoni ololmadi (${outcome.error ?? "sabab noma'lum"}). Video saytda va ilovada ko'rinadi.`
    ).catch(() => {});
  }

  // Keyingi tahrirlarda shu postni topish uchun ID sini saqlab qo'yamiz.
  {
    await getAdminDb()
      .collection("products")
      .doc(product.id)
      .update({
        channelChatId: sent.chatId,
        channelMessageId: sent.messageId,
        // HAQIQATAN yuborilgan media soni: videosiz chiqqan bo'lsa
        // kamroq bo'ladi va keyingi tahrir shunga qarab ish ko'radi.
        channelPhotoCount: outcome.count,
        channelMode: header,
      })
      .catch((error) => console.error("E'lon ID sini saqlashda xato:", error));
  }

  /**
   * IJTIMOIY TARMOQLAR: kanalga chiqqan mahsulot Instagram/Facebook
   * navbatiga ham qo'yiladi (sozlamada yoqilgan bo'lsa). Ular kunlik
   * chegara bilan ishlagani uchun darhol emas, navbat orqali ketadi.
   * Postni jimgina yangilash (`refresh`) navbatga tushmaydi.
   */
  if (mode !== "refresh") {
    const { enqueueProduct } = await import("@/lib/social/publish");
    await enqueueProduct(product).catch((error) =>
      console.error("Ijtimoiy tarmoq navbatiga qo'shishda xato:", error)
    );
  }

  return "posted";
}

/**
 * BLOG POSTI E'LONI (kanal).
 *
 * Maqolada KONTENT VIDEOSI bo'lsa (mahsulot videosi emas — maslahat,
 * ko'rsatma, do'kon lavhasi) kanalga rasm emas, VIDEO chiqadi:
 * Telegramda video to'g'ridan-to'g'ri ko'riladi, rasm + havoladan
 * ko'ra ko'proq ko'riladi.
 *
 * Maqola oldin e'lon qilingan bo'lsa (`channelMessageId`) YANGI post
 * tashlanmaydi — eskisining matni yangilanadi (mahsulotdagi kabi).
 * Shuning uchun funksiya post ma'lumotini QAYTARADI: chaqiruvchi
 * route uni hujjatga yozadi.
 */
export async function announceBlogPost(
  post: BlogPost,
  mode: "new" | "updated" = "new"
): Promise<{ chatId: string; messageId: number } | null> {
  if (!post.isPublished) return null;

  const lines = [
    mode === "new" ? "📰 <b>Yangi maqola</b>" : "♻️ <b>Maqola yangilandi</b>",
    ``,
    `<b>${escapeHtml(post.title)}</b>`,
  ];
  if (post.excerpt) lines.push(``, escapeHtml(post.excerpt.slice(0, 500)));
  const text = `${lines.join("\n")}${buildFooter(await loadFooter())}`;
  const buttonText = "📖 To'liq o'qish";
  const buttonUrl = `${siteUrl()}/blog/${post.slug}`;

  // Allaqachon e'lon qilingan — matnni yangilaymiz (takror post yo'q).
  if (post.channelChatId && post.channelMessageId) {
    try {
      await editMessageCaptionOrText({
        chatId: post.channelChatId,
        messageId: post.channelMessageId,
        text,
        hasPhoto: Boolean(post.coverImageUrl || post.videoUrl),
        replyMarkup: { inline_keyboard: [[{ text: buttonText, url: buttonUrl }]] },
      });
    } catch (error) {
      console.error("Blog postini yangilashda xato:", error);
    }
    return { chatId: post.channelChatId, messageId: post.channelMessageId };
  }

  const channelId = await resolveChannelId();
  if (!channelId) return null;

  try {
    // Video bo'lsa - sendVideo (albom emas: bitta element).
    const sent = post.videoUrl
      ? await sendVideo(channelId, post.videoUrl, {
          caption: text,
          replyMarkup: { inline_keyboard: [[{ text: buttonText, url: buttonUrl }]] },
        })
      : await sendChatMessage(channelId, text, {
          photoUrl: post.coverImageUrl || undefined,
          replyMarkup: { inline_keyboard: [[{ text: buttonText, url: buttonUrl }]] },
        });
    return { chatId: channelId, messageId: sent.message_id };
  } catch (error) {
    console.error("Blog postini kanalga yuborishda xato:", error);
    return null;
  }
}


/* ------------------------------------------------------------------ */
/*  NAVBATNI BO'SHATISH                                                */
/* ------------------------------------------------------------------ */

/**
 * Vaqti kelgan navbatdagi postlarni chiqaradi.
 *
 * Uch joydan chaqiriladi:
 *   • `/api/cron/channel` — jadval bo'yicha (asosiy yo'l);
 *   • yangi e'lon oldidan (`announceProduct` chaqirilganda) — cron
 *     sozlanmagan bo'lsa ham navbat harakatlanib turadi;
 *   • admin paneldagi tugma.
 *
 * `fromQueue: true` bilan chaqiriladi - aks holda post yana o'zini
 * navbatga qo'yib, cheksiz aylanma hosil bo'lardi.
 */
export async function drainChannelQueue(max = 5): Promise<{ posted: number; failed: number }> {
  const jobs = await dueChannelPosts(max).catch(() => []);
  let posted = 0;
  let failed = 0;

  for (const job of jobs) {
    // Navbatdagi post ham umumiy tezlikka bo'ysunadi.
    const slot = await reserveChannelSlot();
    if (!slot.allowed) {
      await markQueueAttempt(job, slot.nextAt);
      break;
    }

    try {
      const snapshot = await getAdminDb().collection("products").doc(job.productId).get();
      if (!snapshot.exists) {
        await removeFromQueue(job.id);
        continue;
      }

      const product = { id: snapshot.id, ...snapshot.data() } as Product;
      const result = await announceProduct(product, "new", { fromQueue: true });
      await removeFromQueue(job.id);
      if (result === "posted") posted += 1;
    } catch (error) {
      console.error("Navbatdagi postni chiqarishda xato:", error);
      await markQueueAttempt(job, Date.now() + 60_000);
      failed += 1;
    }
  }

  return { posted, failed };
}

import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  sendChatMessage,
  sendMediaGroup,
  editMessageCaptionOrText,
  deleteMessage,
  type MediaItem,
} from "./bot";
import { effectivePrice, isDiscountActive } from "@/lib/products/pricing";
import { publicDescription } from "@/lib/products/description";
import { BUILTIN_UNITS, DEFAULT_UNIT, labelOf } from "@/lib/products/taxonomy";
import { getTaxonomy } from "@/lib/products/taxonomy-server";
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
import { freeDeliveryShort, installServiceText } from "@/lib/delivery/text";

const SETTINGS_DOC_PATH = "settings/telegram";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://atoyo-uz.web.app").replace(/\/$/, "");
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

/**
 * Kanalga e'lon yuboradi. Kanal sozlanmagan bo'lsa yoki Telegram xato
 * bersa - jimgina o'tib ketadi: e'lon mahsulot/post saqlanishiga
 * hech qachon xalaqit bermasligi kerak.
 */
async function publish(
  text: string,
  options: { photoUrl?: string; media?: MediaItem[]; buttonText: string; buttonUrl: string }
): Promise<{ chatId: string; messageId: number; hasPhoto: boolean } | null> {
  const channelId = await resolveChannelId();
  if (!channelId) return null;

  // Bir nechta rasm bo'lsa - albom. Albomga inline tugma qo'shib
  // bo'lmaydi, shuning uchun havola caption ichida beriladi.
  const gallery = (options.media ?? []).filter((item) => item.url).slice(0, 10);

  try {
    if (gallery.length > 1) {
      const sent = await sendMediaGroup(channelId, gallery, {
        caption: `${text}\n\n<a href="${options.buttonUrl}">${options.buttonText}</a>`,
      });
      const first = sent[0];
      return first ? { chatId: channelId, messageId: first.message_id, hasPhoto: true } : null;
    }

    const photoUrl = gallery[0]?.url ?? options.photoUrl ?? undefined;
    const sent = await sendChatMessage(channelId, text, {
      photoUrl,
      replyMarkup: { inline_keyboard: [[{ text: options.buttonText, url: options.buttonUrl }]] },
    });
    return { chatId: channelId, messageId: sent.message_id, hasPhoto: Boolean(photoUrl) };
  } catch (error) {
    console.error("Kanalga e'lon yuborishda xato:", error);
    return null;
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
export type AnnounceResult = "posted" | "edited" | "unchanged" | "skipped";

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
  const text =
    gallery.length > 1 && body.length > budget ? `${body.slice(0, Math.max(120, budget - 3))}...` : body;
  const caption = `${text}${footer}`;
  const buttonUrl = `${siteUrl()}/mahsulot/${product.id}`;
  const buttonText = "🛒 Saytda ko'rish";

  const finalText = gallery.length > 1 ? `${caption}\n\n<a href="${buttonUrl}">${buttonText}</a>` : caption;
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
  mode: AnnounceMode = "new"
): Promise<AnnounceResult> {
  // Chernovik hali e'lon qilinmaydi - "✅ Yetarli, tayyor" bosilgandan
  // (yoki kirim orqali zaxira kelgandan) keyin chiqadi.
  if (!product.isActive || product.isDraft) return "skipped";

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
  const text =
    gallery.length > 1 && body.length > budget ? `${body.slice(0, Math.max(120, budget - 3))}...` : body;
  const caption = `${text}${footer}`;
  const buttonUrl = `${siteUrl()}/mahsulot/${product.id}`;
  const buttonText = "🛒 Saytda ko'rish";

  let posted =
    product.channelChatId && product.channelMessageId
      ? {
          chatId: product.channelChatId,
          messageId: product.channelMessageId,
          photoCount: product.channelPhotoCount ?? 0,
        }
      : null;

  // 0) QAYTA POST: eski post o'chiriladi va pastda yangisi tashlanadi.
  //    (Tahrirlash bilan chalkashmasin - admin ataylab shuni so'ragan.)
  if (mode === "repost" && posted) {
    await deleteMessage(posted.chatId, posted.messageId).catch(() => {});
    posted = null;
  }

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

  // 2) Rasmlar soni o'zgargan bo'lsa eski postni olib tashlaymiz.
  if (posted && posted.photoCount !== gallery.length) {
    await deleteMessage(posted.chatId, posted.messageId).catch(() => {});
  }

  const sent = await publish(caption, {
    photoUrl: product.thumbnailUrl,
    media: gallery,
    buttonText,
    buttonUrl,
  });

  // Keyingi tahrirlarda shu postni topish uchun ID sini saqlab qo'yamiz.
  if (sent) {
    await getAdminDb()
      .collection("products")
      .doc(product.id)
      .update({
        channelChatId: sent.chatId,
        channelMessageId: sent.messageId,
        channelPhotoCount: gallery.length,
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

  return sent ? "posted" : "skipped";
}

/** Yangi yoki tahrirlangan blog posti e'loni. */
export async function announceBlogPost(post: BlogPost, mode: "new" | "updated" = "new"): Promise<void> {
  if (!post.isPublished) return;

  const lines = [
    mode === "new" ? "📰 <b>Yangi maqola</b>" : "♻️ <b>Maqola yangilandi</b>",
    ``,
    `<b>${escapeHtml(post.title)}</b>`,
  ];
  if (post.excerpt) lines.push(``, escapeHtml(post.excerpt.slice(0, 500)));

  await publish(`${lines.join("\n")}${buildFooter(await loadFooter())}`, {
    photoUrl: post.coverImageUrl,
    buttonText: "📖 To'liq o'qish",
    buttonUrl: `${siteUrl()}/blog/${post.slug}`,
  });
}

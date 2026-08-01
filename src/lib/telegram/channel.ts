import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  sendChatMessage,
  sendMediaGroup,
  editMessageCaptionOrText,
  deleteMessage,
  type MediaItem,
} from "./bot";
import { effectivePrice, isDiscountActive } from "@/lib/products/pricing";
import { BUILTIN_UNITS, DEFAULT_UNIT, labelOf } from "@/lib/products/taxonomy";
import { hasVariants, minVariantPrice, totalVariantStock } from "@/lib/products/variants";
import { getSiteSettings } from "@/lib/firebase/admin-content";
import type { Product } from "@/types/product";
import type { BlogPost, ChannelPostFooter } from "@/types/content";

const SETTINGS_DOC_PATH = "settings/telegram";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://atoyo-uz.web.app").replace(/\/$/, "");
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatSom(amount: number): string {
  return `${amount.toLocaleString("uz-UZ")} so'm`;
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
export type AnnounceMode = "new" | "updated" | "refresh";

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

/** Mahsulot e'loni matni (yangi post uchun ham, tahrir uchun ham bir xil). */
function buildProductText(product: Product, mode: "new" | "updated"): string {
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
  if (product.sku) lines.push(`#️⃣ Kod: <code>${escapeHtml(product.sku)}</code>`);
  if (product.brand || product.manufacturerCountry) {
    lines.push(`🏷 ${escapeHtml([product.brand, product.manufacturerCountry].filter(Boolean).join(" • "))}`);
  }
  lines.push(priceLine);
  if (withVariants) {
    for (const axis of product.variantAxes ?? []) {
      lines.push(`🔀 ${escapeHtml(axis.label)}: ${escapeHtml(axis.values.join(", "))}`);
    }
  }
  const stock = withVariants ? totalVariantStock(product) : product.stock;
  if (stock > 0) lines.push(`📦 Mavjud: ${stock} ${unit}`);
  if (product.material) lines.push(`🧱 ${escapeHtml(MATERIAL_LABELS[product.material] ?? product.material)}`);
  if (product.description) lines.push(``, escapeHtml(product.description.slice(0, 400)));

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
 * Yangi yoki tahrirlangan mahsulot e'loni.
 *
 * Mahsulot yangilanganda kanalga YANGI post tashlanmaydi - avvalgi
 * postning izohi tahrirlanadi (kanal takror e'lonlar bilan to'lib
 * ketmasligi uchun). Rasmlar soni o'zgargan bo'lsa (yangi rasm
 * qo'shilgan) - eski post o'chirilib, yangisi tashlanadi, chunki
 * yuborilgan albomga rasm qo'shib bo'lmaydi.
 */
export async function announceProduct(product: Product, mode: AnnounceMode = "new"): Promise<void> {
  // Chernovik hali e'lon qilinmaydi - "✅ Yetarli, tayyor" bosilgandan
  // (yoki kirim orqali zaxira kelgandan) keyin chiqadi.
  if (!product.isActive || product.isDraft) return;

  // Sarlavha: `refresh` bo'lsa postdagi avvalgi sarlavha saqlanadi.
  const header: "new" | "updated" = mode === "refresh" ? product.channelMode ?? "new" : mode;

  // Rasmlar + videolar bitta albomga (Telegram aralash albomga ruxsat beradi).
  const gallery: MediaItem[] = [
    ...(product.images ?? []).filter(Boolean).map((url) => ({ url, type: "photo" as const })),
    ...(product.videos ?? []).filter(Boolean).map((url) => ({ url, type: "video" as const })),
  ].slice(0, 10);
  const body = buildProductText(product, header);
  const footer = buildFooter(await loadFooter());
  // Albom caption'i 1024 belgi bilan cheklangan - tavsif uzun bo'lsa
  // e'lon jimgina kesilib qolmasligi uchun mahsulot qismini qisqartiramiz
  // (footer - telefon, shior, havolalar - har doim to'liq qolsin).
  const budget = 850 - footer.length;
  const text =
    gallery.length > 1 && body.length > budget ? `${body.slice(0, Math.max(120, budget - 3))}...` : body;
  const caption = `${text}${footer}`;
  const buttonUrl = `${siteUrl()}/mahsulot/${product.id}`;
  const buttonText = "🛒 Saytda ko'rish";

  const posted =
    product.channelChatId && product.channelMessageId
      ? {
          chatId: product.channelChatId,
          messageId: product.channelMessageId,
          photoCount: product.channelPhotoCount ?? 0,
        }
      : null;

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
      return;
    } catch (error) {
      // Matn o'zgarmagan bo'lsa Telegram xato beradi - bu xato emas.
      if (error instanceof Error && /not modified/i.test(error.message)) return;
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

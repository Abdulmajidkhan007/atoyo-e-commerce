import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendChatMessage, sendMediaGroup } from "./bot";
import { effectivePrice, isDiscountActive } from "@/lib/products/pricing";
import type { Product } from "@/types/product";
import type { BlogPost } from "@/types/content";

const SETTINGS_DOC_PATH = "settings/telegram";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://atoyo-uz.netlify.app").replace(/\/$/, "");
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
  options: { photoUrl?: string; photoUrls?: string[]; buttonText: string; buttonUrl: string }
) {
  const channelId = await resolveChannelId();
  if (!channelId) return;

  // Bir nechta rasm bo'lsa - albom. Albomga inline tugma qo'shib
  // bo'lmaydi, shuning uchun havola caption ichida beriladi.
  const gallery = (options.photoUrls ?? []).filter(Boolean).slice(0, 10);

  try {
    if (gallery.length > 1) {
      await sendMediaGroup(channelId, gallery, {
        caption: `${text}\n\n<a href="${options.buttonUrl}">${options.buttonText}</a>`,
      });
      return;
    }

    await sendChatMessage(channelId, text, {
      photoUrl: gallery[0] ?? options.photoUrl ?? undefined,
      replyMarkup: { inline_keyboard: [[{ text: options.buttonText, url: options.buttonUrl }]] },
    });
  } catch (error) {
    console.error("Kanalga e'lon yuborishda xato:", error);
  }
}

/** Yangi yoki tahrirlangan mahsulot e'loni. */
export async function announceProduct(product: Product, mode: "new" | "updated" = "new"): Promise<void> {
  if (!product.isActive) return;

  const hasDiscount = isDiscountActive(product);
  const priceLine = hasDiscount
    ? `💰 <s>${formatSom(product.price)}</s> <b>${formatSom(effectivePrice(product))}</b>`
    : `💰 <b>${formatSom(product.price)}</b>`;

  const lines = [
    mode === "new" ? "🆕 <b>Yangi mahsulot!</b>" : "♻️ <b>Mahsulot yangilandi</b>",
    ``,
    `<b>${escapeHtml(product.name)}</b>`,
  ];
  if (product.brand || product.manufacturerCountry) {
    lines.push(`🏷 ${escapeHtml([product.brand, product.manufacturerCountry].filter(Boolean).join(" • "))}`);
  }
  lines.push(priceLine);
  if (product.stock > 0) lines.push(`📦 Mavjud: ${product.stock} dona`);
  if (product.description) lines.push(``, escapeHtml(product.description.slice(0, 400)));

  // Albom caption'i 1024 belgi bilan cheklangan - tavsif uzun bo'lsa
  // e'lon jimgina kesilib qolmasligi uchun qisqartiramiz.
  const gallery = (product.images ?? []).filter(Boolean).slice(0, 10);
  const text = lines.join("\n");
  const caption = gallery.length > 1 && text.length > 850 ? `${text.slice(0, 847)}...` : text;

  await publish(caption, {
    photoUrl: product.thumbnailUrl,
    photoUrls: gallery,
    buttonText: "🛒 Saytda ko'rish",
    buttonUrl: `${siteUrl()}/mahsulot/${product.id}`,
  });
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

  await publish(lines.join("\n"), {
    photoUrl: post.coverImageUrl,
    buttonText: "📖 To'liq o'qish",
    buttonUrl: `${siteUrl()}/blog/${post.slug}`,
  });
}

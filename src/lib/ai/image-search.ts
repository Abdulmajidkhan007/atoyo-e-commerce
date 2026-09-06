import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL, getAnthropic, isAiConfigured } from "./config";
import { assertTokenQuota, recordTokenUse } from "./usage";
import { searchCatalog, type CatalogHit } from "./tools";
import { getTaxonomy } from "@/lib/products/taxonomy-server";
import type { UserRole } from "@/types/user";

/**
 * RASM BO'YICHA QIDIRUV.
 *
 * Santexnikada mijoz mahsulot nomini ko'pincha bilmaydi — lekin surati
 * bor ("mana shu kranga o'xshashini top"). Oqim:
 *   1) Claude vision rasmga qaraydi va QIDIRUV SO'ZLARINI beradi
 *      (nomi, turi, materiali) — o'zbekcha, ruscha va inglizcha;
 *   2) shu so'zlar bilan katalog qidiriladi (`searchCatalog`) — ya'ni
 *      natijalar HAQIQIY mahsulotlar, model hech narsa o'ylab topmaydi.
 *
 * Model faqat "bu nima" degan savolga javob beradi; narx, zaxira va
 * mavjudlik doim bazadan keladi.
 */

/** Rasm hajmi chegarasi (base64'dan oldin). */
export const MAX_SEARCH_IMAGE_BYTES = 4 * 1024 * 1024;

export interface ImageSearchResult {
  /** Rasmda nima ko'ringani (mijozga ko'rsatiladi). */
  description: string;
  /** Model bergan qidiruv so'zlari. */
  terms: string[];
  products: CatalogHit[];
}

function visionMediaType(mimeType: string): "image/jpeg" | "image/png" | "image/webp" | "image/gif" {
  switch (mimeType) {
    case "image/png":
      return "image/png";
    case "image/webp":
      return "image/webp";
    case "image/gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

export async function searchByImage(image: {
  base64: string;
  mimeType: string;
  /** Mijozning qo'shimcha izohi ("25mm bo'lsin"). */
  hint?: string;
  /** So'rovchining roli - narx shunga qarab qaytadi (optom/dona). */
  viewerRole?: UserRole;
}): Promise<ImageSearchResult> {
  if (!isAiConfigured()) throw new Error("AI kaliti sozlanmagan");
  await assertTokenQuota();

  const taxonomy = await getTaxonomy();
  const categories = taxonomy.categories.map((item) => `${item.slug} (${item.label})`).join(", ");

  const response = await getAnthropic().messages.create({
    model: AI_MODEL,
    max_tokens: 400,
    system:
      "Sen santexnika va isitish tizimlari do'koni uchun rasmni tahlil qilasan. " +
      "Rasmda santexnika mahsuloti bo'lmasa — `description` da shuni ayt va `terms` ni bo'sh qoldir. " +
      `Mavjud kategoriyalar: ${categories}. ` +
      'Javobni FAQAT JSON ko\'rinishida ber: {"description":"","terms":[],"category":""}. ' +
      "`description` — bir gap, o'zbekcha (masalan: \"Bu — devorga o'rnatiladigan xrom sharli kran\"). " +
      "`terms` — qidiruv uchun 3-6 ta so'z: mahsulot turi va materiali, o'zbekcha va ruscha " +
      '(masalan: ["sharli kran", "kran", "shar kran", "смеситель", "ball valve"]). ' +
      "`category` — ro'yxatdagi slug yoki bo'sh.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: visionMediaType(image.mimeType), data: image.base64 },
          },
          {
            type: "text",
            text: image.hint?.trim()
              ? `Mijoz izohi: ${image.hint.trim().slice(0, 200)}. Rasmdagi mahsulotni aniqla.`
              : "Rasmdagi mahsulotni aniqla.",
          },
        ],
      },
    ],
  });
  await recordTokenUse(AI_MODEL, response.usage);

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  let parsed: { description?: string; terms?: string[]; category?: string } = {};
  try {
    parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  } catch {
    // Model JSON qaytarmasa - matnning o'zini tavsif sifatida olamiz.
    parsed = { description: text.slice(0, 200), terms: [] };
  }

  const terms = (parsed.terms ?? []).map((term) => String(term).slice(0, 60)).slice(0, 6);
  const category = taxonomy.categories.some((item) => item.slug === parsed.category)
    ? parsed.category
    : undefined;

  const products =
    terms.length > 0
      ? await searchCatalog({ query: terms.join(" "), category, limit: 8, viewerRole: image.viewerRole })
      : [];

  return {
    description: (parsed.description ?? "").slice(0, 300),
    terms,
    products,
  };
}

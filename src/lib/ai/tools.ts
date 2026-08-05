import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { getAdminDb } from "@/lib/firebase/admin";
import { searchTermVariants } from "@/lib/search/tokens";
import { getTaxonomy } from "@/lib/products/taxonomy-server";
import { getPricingSettings } from "@/lib/products/pricing-settings";
import { markupFor, priceForRole } from "@/lib/products/wholesale";
import type { Product } from "@/types/product";
import type { UserRole } from "@/types/user";

/**
 * YORDAMCHINING "QO'LLARI" (tool use).
 *
 * Model o'zi javob yozishdan oldin haqiqiy katalogni qidira oladi:
 * "500 mingacha eng yaxshi dush tizimi" degan savolda narx oralig'i
 * bo'yicha filtrlab, zaxirasi borini oldinga qo'yib qaytaradi. Bu -
 * "modelga bir nechta mahsulot berib qo'yish" dan sifatli farq:
 * mijoz shartini MODEL emas, BAZA bajaradi.
 *
 * Ikkinchi qo'l - savatga qo'shish. Amalni serverning o'zi bajarmaydi:
 * javob bilan birga "action" qaytadi, uni kanal (sayt/ilova/bot) o'z
 * savatiga qo'llaydi. Shu sabab yordamchi mijoz nomidan pul ketadigan
 * amal (buyurtmani yakunlash) qila olmaydi - u faqat savatni
 * to'ldiradi va rasmiylashtirish sahifasiga olib chiqadi.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://atoyo-uz.web.app";

/** Kanal bajaradigan amal (savat/checkout). */
export type AssistantAction =
  | {
      type: "add_to_cart";
      productId: string;
      name: string;
      price: number;
      thumbnailUrl: string;
      stock: number;
      quantity: number;
    }
  | { type: "checkout" };

export interface CatalogHit {
  id: string;
  name: string;
  price: number;
  effectivePrice: number;
  stock: number;
  brand: string;
  category: string;
  material: string;
  url: string;
}

/** Chegirma amal qilayotgan bo'lsa - haqiqiy narx. */
function effectivePriceOf(product: Product): number {
  const active =
    !!product.discountPrice &&
    product.discountPrice < product.price &&
    (!product.discountUntil || product.discountUntil > Date.now());
  return active ? product.discountPrice! : product.price;
}

/**
 * NARXNI ROLGA MOSLASH. Bazadagi narx - OPTOM. Yordamchi ham xuddi
 * sayt kabi mijozning roliga mos narxni ko'rsatishi shart: optom
 * mijozga optom, qolganlarga dona narx. Aks holda yordamchi orqali
 * optom narx "sizib" chiqadi.
 */
type PriceMapper = (product: Pick<Product, "retailMarkupPercent">, value: number) => number;

async function priceMapper(role: UserRole | undefined): Promise<PriceMapper> {
  const settings = await getPricingSettings();
  return (product, value) => priceForRole(value, role, markupFor(product, settings));
}

function toHit(product: Product, show: PriceMapper): CatalogHit {
  return {
    id: product.id,
    name: product.name,
    price: show(product, product.price),
    effectivePrice: show(product, effectivePriceOf(product)),
    stock: product.stock ?? 0,
    brand: product.brand ?? "",
    category: product.category,
    material: product.material ?? "",
    url: `${SITE_URL}/mahsulot/${product.id}`,
  };
}

export interface CatalogQuery {
  query?: string;
  minPrice?: number;
  maxPrice?: number;
  category?: string;
  material?: string;
  inStockOnly?: boolean;
  sort?: "cheapest" | "expensive" | "popular";
  limit?: number;
  /** So'rovchining roli - narx shunga qarab ko'rsatiladi. */
  viewerRole?: UserRole;
}

/**
 * KATALOG QIDIRUVI.
 *
 * Firestore'da narx oralig'i + so'z qidiruvi + saralashni bitta
 * so'rovda qilib bo'lmaydi (kompozit indeks cheklovi), shuning uchun
 * avval nomzodlar olinadi (so'z tokenlari yoki kategoriya bo'yicha),
 * keyin filtr va saralash xotirada bajariladi. 10 000+ mahsulotda ham
 * nomzodlar soni 60 tadan oshmaydi.
 */
export async function searchCatalog(params: CatalogQuery): Promise<CatalogHit[]> {
  const db = getAdminDb();
  const limit = Math.min(params.limit ?? 6, 10);
  const candidates = new Map<string, Product>();

  const collect = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) => {
    for (const doc of docs) {
      const product = { id: doc.id, ...doc.data() } as Product;
      if (product.isActive === false || product.isDraft) continue;
      candidates.set(product.id, product);
    }
  };

  const variants = params.query ? searchTermVariants(params.query, 10) : [];

  try {
    if (variants.length > 0) {
      const [byToken, byKeyword] = await Promise.all([
        db.collection("products").where("nameTokens", "array-contains-any", variants).limit(60).get(),
        db.collection("products").where("keywords", "array-contains-any", variants).limit(20).get(),
      ]);
      collect(byToken.docs);
      collect(byKeyword.docs);
    }

    // So'z bo'yicha hech narsa topilmasa (yoki so'z berilmasa) -
    // kategoriya yoki umumiy ro'yxatdan olamiz.
    if (candidates.size === 0) {
      const base = db.collection("products").where("isActive", "==", true);
      const snapshot = params.category
        ? await base.where("category", "==", params.category).limit(60).get()
        : await base.orderBy("salesCount", "desc").limit(60).get();
      collect(snapshot.docs);
    }
  } catch (error) {
    console.error("Yordamchi katalog qidiruvida xato:", error);
  }

  let list = Array.from(candidates.values());

  // Mijoz aytgan narx chegarasi - U KO'RADIGAN narxda, shuning uchun
  // filtr ham rolga moslangan narx ustida ishlaydi.
  const show = await priceMapper(params.viewerRole);
  const shownPrice = (item: Product) => show(item, effectivePriceOf(item));

  if (params.category) list = list.filter((item) => item.category === params.category);
  if (params.material) list = list.filter((item) => item.material === params.material);
  if (params.inStockOnly) list = list.filter((item) => (item.stock ?? 0) > 0);
  if (typeof params.minPrice === "number") list = list.filter((item) => shownPrice(item) >= params.minPrice!);
  if (typeof params.maxPrice === "number") list = list.filter((item) => shownPrice(item) <= params.maxPrice!);

  switch (params.sort) {
    case "cheapest":
      list.sort((a, b) => shownPrice(a) - shownPrice(b));
      break;
    case "expensive":
      list.sort((a, b) => shownPrice(b) - shownPrice(a));
      break;
    default:
      // Standart: zaxirasi bori oldinda, keyin ko'p sotilgani.
      list.sort(
        (a, b) =>
          Number((b.stock ?? 0) > 0) - Number((a.stock ?? 0) > 0) ||
          (b.salesCount ?? 0) - (a.salesCount ?? 0) ||
          (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0)
      );
  }

  return list.slice(0, limit).map((item) => toHit(item, show));
}

/** Model chaqira oladigan vositalar ro'yxati. */
export function assistantTools(categories: string[]): Anthropic.Tool[] {
  return [
    {
      name: "search_products",
      description:
        "Do'kon katalogidan mahsulot qidiradi. Mijoz narx chegarasi ('500 minggacha'), kategoriya, " +
        "material yoki 'faqat borini' desa - SHU vositani chaqir, javobni o'zingdan to'qima. " +
        "Natijadagi narx va zaxira - haqiqiy, yakuniy ma'lumot.",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Qidiruv so'zi: 'dush tizimi', 'polipropilen quvur 25mm'" },
          minPrice: { type: "number", description: "Eng kam narx (so'm)" },
          maxPrice: { type: "number", description: "Eng ko'p narx (so'm)" },
          category: { type: "string", enum: categories, description: "Kategoriya slug'i" },
          material: { type: "string" },
          inStockOnly: { type: "boolean", description: "Faqat zaxirada borlari" },
          sort: { type: "string", enum: ["cheapest", "expensive", "popular"] },
          limit: { type: "number", description: "1-10 ta natija" },
        },
      },
    },
    {
      name: "add_to_cart",
      description:
        "Mijozning savatiga mahsulot qo'shadi. FAQAT mijoz aniq so'raganda chaqir " +
        "('savatga qo'sh', 'shuni olaman'). Buyurtma yakunlanmaydi - mijoz o'zi tasdiqlaydi.",
      input_schema: {
        type: "object",
        properties: {
          productId: { type: "string", description: "search_products qaytargan mahsulot ID si" },
          quantity: { type: "number", description: "Soni (standart 1)" },
        },
        required: ["productId"],
      },
    },
    {
      name: "start_checkout",
      description:
        "Mijozni buyurtmani rasmiylashtirish sahifasiga olib o'tadi (savat bo'sh bo'lmasligi kerak). " +
        "Faqat mijoz 'buyurtma beraman' degan bo'lsa chaqir.",
      input_schema: { type: "object", properties: {} },
    },
  ];
}

export interface ToolOutcome {
  /** Modelga qaytadigan natija matni. */
  content: string;
  /** Kanal bajaradigan amal (bo'lsa). */
  action?: AssistantAction;
  /** Javob bilan ko'rsatiladigan mahsulotlar. */
  hits?: CatalogHit[];
}

function money(value: number): string {
  return `${Math.round(value).toLocaleString("ru-RU").replace(/ /g, " ")} so'm`;
}

/** Model chaqirgan vositani bajaradi. */
export async function runAssistantTool(
  name: string,
  input: Record<string, unknown>,
  viewerRole?: UserRole
): Promise<ToolOutcome> {
  switch (name) {
    case "search_products": {
      const taxonomy = await getTaxonomy();
      const category = typeof input.category === "string" ? input.category : undefined;
      const hits = await searchCatalog({
        query: typeof input.query === "string" ? input.query : undefined,
        minPrice: typeof input.minPrice === "number" ? input.minPrice : undefined,
        maxPrice: typeof input.maxPrice === "number" ? input.maxPrice : undefined,
        category: taxonomy.categories.some((item) => item.slug === category) ? category : undefined,
        material: typeof input.material === "string" ? input.material : undefined,
        inStockOnly: input.inStockOnly === true,
        sort: ["cheapest", "expensive", "popular"].includes(String(input.sort))
          ? (input.sort as CatalogQuery["sort"])
          : undefined,
        limit: typeof input.limit === "number" ? input.limit : undefined,
        viewerRole,
      });

      if (hits.length === 0) {
        return { content: "Bu shartlarga mos mahsulot topilmadi. Shartni kengaytirish kerak." };
      }

      return {
        hits,
        content: hits
          .map(
            (hit) =>
              `id=${hit.id} | ${hit.name}${hit.brand ? ` (${hit.brand})` : ""} | ${money(hit.effectivePrice)}` +
              `${hit.effectivePrice < hit.price ? ` (chegirma, eski narx ${money(hit.price)})` : ""}` +
              ` | ${hit.stock > 0 ? `zaxirada ${hit.stock}` : "ZAXIRADA YO'Q"} | ${hit.material} | ${hit.url}`
          )
          .join("\n"),
      };
    }

    case "add_to_cart": {
      const productId = String(input.productId ?? "");
      const snapshot = await getAdminDb().collection("products").doc(productId).get();
      if (!snapshot.exists) return { content: "Bunday mahsulot topilmadi." };

      const product = { id: snapshot.id, ...snapshot.data() } as Product;
      if ((product.stock ?? 0) <= 0) {
        return { content: `"${product.name}" hozir zaxirada yo'q - savatga qo'shib bo'lmaydi.` };
      }

      const requested = typeof input.quantity === "number" ? Math.floor(input.quantity) : 1;
      const quantity = Math.max(1, Math.min(requested, product.stock));
      // Savatga ham rolga mos narx tushadi (bazadagi qiymat - optom).
      const show = await priceMapper(viewerRole);
      const price = show(product, effectivePriceOf(product));

      return {
        content: `"${product.name}" (${quantity} dona, ${money(price)}) savatga qo'shildi.`,
        action: {
          type: "add_to_cart",
          productId: product.id,
          name: product.name,
          price,
          thumbnailUrl: product.thumbnailUrl || product.images?.[0] || "",
          stock: product.stock,
          quantity,
        },
      };
    }

    case "start_checkout":
      return {
        content: "Mijoz rasmiylashtirish sahifasiga o'tkazildi.",
        action: { type: "checkout" },
      };

    default:
      return { content: "Noma'lum vosita." };
  }
}

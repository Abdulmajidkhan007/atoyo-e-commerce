import "server-only";
import type { Product } from "@/types/product";

/**
 * TASHQI QIDIRUV MOTORI (Typesense).
 *
 * Firestore token qidiruvi 10 000+ mahsulotda chegaraga yetadi:
 * `array-contains-any` bir so'rovda 30 tagacha qiymat oladi, xato
 * yozilgan so'zni topmaydi va natijalarni ahamiyatlilik bo'yicha
 * saralamaydi. Typesense esa aynan shu ish uchun: bir necha millisekund,
 * typo'ga chidamli, so'z tartibi muhim emas.
 *
 * SOZLANMAGAN BO'LSA hech narsa o'zgarmaydi - sayt avvalgidek Firestore
 * qidiruvidan foydalanadi (`searchProductsByPrefix`). Ya'ni bu qism
 * ixtiyoriy "tezlashtirgich".
 *
 * Env:
 *   TYPESENSE_HOST=xxx.a1.typesense.net
 *   TYPESENSE_API_KEY=...           (admin kalit - faqat serverda!)
 *   TYPESENSE_PROTOCOL=https        (ixtiyoriy, standart https)
 *   TYPESENSE_PORT=443              (ixtiyoriy)
 *   TYPESENSE_COLLECTION=products   (ixtiyoriy)
 *
 * Typesense Cloud'ning eng kichik tarifi oyiga ~20-25 $; o'zi
 * hostlangan variant (Docker) esa bepul.
 */

export function isSearchEngineConfigured(): boolean {
  return !!process.env.TYPESENSE_HOST && !!process.env.TYPESENSE_API_KEY;
}

function baseUrl(): string {
  const protocol = process.env.TYPESENSE_PROTOCOL ?? "https";
  const host = process.env.TYPESENSE_HOST ?? "";
  const port = process.env.TYPESENSE_PORT ?? (protocol === "https" ? "443" : "8108");
  return `${protocol}://${host}:${port}`;
}

function collection(): string {
  return process.env.TYPESENSE_COLLECTION ?? "products";
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": process.env.TYPESENSE_API_KEY ?? "",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Typesense: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

/** Qidiruv hujjati - faqat kerakli maydonlar (indeks kichik bo'lsin). */
function toDocument(product: Product) {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand ?? "",
    sku: product.sku ?? "",
    code: product.code ?? 0,
    category: product.category ?? "",
    material: product.material ?? "",
    country: product.manufacturerCountry ?? "",
    price: Math.round(product.price ?? 0),
    stock: product.stock ?? 0,
    isActive: product.isActive !== false && !product.isDraft,
    salesCount: product.salesCount ?? 0,
  };
}

/** Kolleksiya sxemasi - birinchi to'ldirishda yaratiladi. */
export async function ensureCollection(): Promise<void> {
  if (!isSearchEngineConfigured()) return;
  try {
    await call(`/collections/${collection()}`);
    return; // allaqachon bor
  } catch {
    // yo'q - yaratamiz
  }

  await call("/collections", {
    method: "POST",
    body: JSON.stringify({
      name: collection(),
      fields: [
        { name: "name", type: "string" },
        { name: "brand", type: "string", optional: true },
        { name: "sku", type: "string", optional: true },
        { name: "code", type: "int32", optional: true },
        { name: "category", type: "string", facet: true, optional: true },
        { name: "material", type: "string", facet: true, optional: true },
        { name: "country", type: "string", facet: true, optional: true },
        { name: "price", type: "int64" },
        { name: "stock", type: "int32" },
        { name: "isActive", type: "bool", facet: true },
        { name: "salesCount", type: "int32", optional: true },
      ],
      default_sorting_field: "salesCount",
    }),
  });
}

/** Bitta mahsulotni indeksga yozish (yaratish/tahrirlashdan keyin). */
export async function indexProduct(product: Product): Promise<void> {
  if (!isSearchEngineConfigured()) return;
  try {
    await call(`/collections/${collection()}/documents?action=upsert`, {
      method: "POST",
      body: JSON.stringify(toDocument(product)),
    });
  } catch (error) {
    console.error("Qidiruv indeksiga yozishda xato:", error);
  }
}

/** Mahsulot o'chirilganda indeksdan ham olib tashlanadi. */
export async function removeFromIndex(productId: string): Promise<void> {
  if (!isSearchEngineConfigured()) return;
  try {
    await call(`/collections/${collection()}/documents/${productId}`, { method: "DELETE" });
  } catch {
    // Indeksda bo'lmasa - muammo emas.
  }
}

/** Butun katalogni indeksga yuborish (admin tugmasi). */
export async function bulkIndex(products: Product[]): Promise<number> {
  if (!isSearchEngineConfigured() || products.length === 0) return 0;
  await ensureCollection();

  const lines = products.map((product) => JSON.stringify(toDocument(product))).join("\n");
  const res = await fetch(
    `${baseUrl()}/collections/${collection()}/documents/import?action=upsert`,
    {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "X-TYPESENSE-API-KEY": process.env.TYPESENSE_API_KEY ?? "",
      },
      body: lines,
    }
  );
  if (!res.ok) throw new Error(`Typesense import: ${res.status} ${await res.text()}`);
  return products.length;
}

/**
 * Qidirish. Sozlanmagan bo'lsa `null` qaytaradi - chaqiruvchi eski
 * (Firestore) usulga tushadi.
 */
export async function searchWithEngine(
  term: string,
  limit = 24
): Promise<{ ids: string[]; found: number } | null> {
  if (!isSearchEngineConfigured() || !term.trim()) return null;

  try {
    const params = new URLSearchParams({
      q: term.trim(),
      query_by: "name,brand,sku",
      filter_by: "isActive:true",
      per_page: String(Math.min(limit, 100)),
      // Typo'ga chidamlilik: 2 tagacha harf xatosi kechiriladi.
      num_typos: "2",
      sort_by: "_text_match:desc,salesCount:desc",
    });

    const data = await call<{ found: number; hits?: { document: { id: string } }[] }>(
      `/collections/${collection()}/documents/search?${params}`
    );
    return { ids: (data.hits ?? []).map((hit) => hit.document.id), found: data.found };
  } catch (error) {
    console.error("Qidiruv motorida xato:", error);
    return null;
  }
}

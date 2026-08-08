import { NextResponse } from "next/server";
import { getProductById, getRelatedProducts } from "@/lib/firebase/admin-products";
import { getAppUserFromRequest } from "@/lib/firebase/session";
import { getPricingSettings } from "@/lib/products/pricing-settings";
import { toViewerProduct, toViewerProducts } from "@/lib/products/viewer";
import { NO_STORE_HEADERS } from "@/lib/http/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * BITTA MAHSULOT + O'XSHASHLARI (mobil ilova va tashqi mijozlar uchun).
 *
 * Sayt bu ma'lumotni server komponentida oladi; ilova esa shu
 * route'dan. Narx ko'ruvchining roliga moslanadi va optom narx /
 * tannarx umuman berilmaydi (`lib/products/viewer.ts`).
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const [raw, viewer, pricing] = await Promise.all([
    getProductById(id).catch(() => null),
    getAppUserFromRequest(request).catch(() => null),
    getPricingSettings(),
  ]);

  if (!raw || raw.isActive === false) {
    return NextResponse.json(
      { error: "Mahsulot topilmadi." },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  const related = await getRelatedProducts(raw, 8).catch(() => []);

  return NextResponse.json(
    {
      product: toViewerProduct(raw, viewer?.role, pricing),
      related: toViewerProducts(related, viewer?.role, pricing),
    },
    { headers: NO_STORE_HEADERS }
  );
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { publishNow } from "@/lib/social/publish";
import { logAction } from "@/lib/telegram/action-log";
import { SOCIAL_LABELS } from "@/types/social";
import type { Product } from "@/types/product";

export const runtime = "nodejs";

/**
 * TANLAB POST QILISH: admin bitta mahsulotni tanlagan tarmoq(lar)ga
 * darhol joylaydi (navbatni kutmasdan). Mahsulot sahifasidagi va
 * katalogni tartibga solish sahifasidagi tugma shu yo'lni chaqiradi.
 */
const schema = z.object({
  productId: z.string().min(1),
  networks: z.array(z.enum(["instagram", "facebook", "youtube"])).min(1).max(3),
});

export async function POST(request: Request) {
  const admin = await requirePermission("products", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "So'rov noto'g'ri." }, { status: 400 });

  const snap = await getAdminDb().collection("products").doc(parsed.data.productId).get();
  if (!snap.exists) return NextResponse.json({ error: "Mahsulot topilmadi." }, { status: 404 });
  const product = { id: snap.id, ...snap.data() } as Product;

  const done: string[] = [];
  const errors: string[] = [];

  for (const network of parsed.data.networks) {
    try {
      await publishNow(product, network);
      done.push(SOCIAL_LABELS[network]);
    } catch (error) {
      errors.push(`${SOCIAL_LABELS[network]}: ${error instanceof Error ? error.message : "xato"}`);
    }
  }

  if (done.length > 0) {
    await logAction(
      `📣 ${done.join(", ")} ga joylandi (${admin.email ?? "admin"}): ${product.name}`
    );
  }
  return NextResponse.json({ done, errors });
}

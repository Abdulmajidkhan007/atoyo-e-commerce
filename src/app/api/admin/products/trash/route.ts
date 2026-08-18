import { NextResponse } from "next/server";
import { z } from "zod";
import { validationMessage } from "@/lib/http/validation";
import { requirePermission } from "@/lib/firebase/session";
import { logAction } from "@/lib/telegram/action-log";
import {
  TRASH_DAYS,
  listTrash,
  purgeFromTrash,
  restoreFromTrash,
} from "@/lib/products/trash";
import { NO_STORE_HEADERS } from "@/lib/http/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * O'CHIRILGANLAR SAVATI.
 *
 * GET  - ro'yxat (muddati o'tganlari shu payt tozalanadi);
 * POST - `restore` (tiklash) yoki `purge` (butunlay o'chirish).
 */

const schema = z.object({
  action: z.enum(["restore", "purge"]),
  ids: z.array(z.string().min(1)).min(1).max(200),
});

export async function GET(request: Request) {
  const admin = await requirePermission("products", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const products = await listTrash(200);
  const now = Date.now();
  return NextResponse.json(
    {
      days: TRASH_DAYS,
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku ?? "",
        code: product.code ?? null,
        category: product.category,
        brand: product.brand,
        price: product.price,
        stock: product.stock,
        thumbnailUrl: product.thumbnailUrl ?? "",
        imageCount: product.images?.length ?? 0,
        deletedAt: product.deletedAt,
        deletedBy: product.deletedBy,
        // Muddat SERVERDA hisoblanadi - komponent render paytida
        // vaqtni o'qimasligi kerak (React qoidasi).
        daysLeft: Math.max(
          0,
          TRASH_DAYS - Math.floor((now - product.deletedAt) / 86_400_000)
        ),
      })),
    },
    { headers: NO_STORE_HEADERS }
  );
}

export async function POST(request: Request) {
  const admin = await requirePermission("products", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  }

  const who = admin.email ?? admin.displayName ?? "admin";

  if (parsed.data.action === "restore") {
    const restored = await restoreFromTrash(parsed.data.ids);
    await logAction(`♻️ Savatdan tiklandi (${who}): ${restored} ta mahsulot`);
    // Tiklangan mahsulot SAYTDA YOPIQ holda qaytadi - buni aytamiz.
    return NextResponse.json({
      ok: true,
      restored,
      note: "Tiklangan mahsulotlar saytda YOPIQ holda qaytdi — «Katalogni tartibga solish» dan «Saytda ochish» bilan oching.",
    });
  }

  const purged = await purgeFromTrash(parsed.data.ids);
  await logAction(`🗑 Savatdan butunlay o'chirildi (${who}): ${purged} ta mahsulot`);
  return NextResponse.json({ ok: true, purged });
}

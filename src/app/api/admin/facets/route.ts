import { NextResponse } from "next/server";
import { z } from "zod";
import { validationMessage } from "@/lib/http/validation";
import { requirePermission } from "@/lib/firebase/session";
import { logAction } from "@/lib/telegram/action-log";
import {
  addFacetValue,
  getFacets,
  removeFacetValue,
  renameFacetValue,
  type FacetKind,
} from "@/lib/products/facets";
import { NO_STORE_HEADERS } from "@/lib/http/cache";

export const runtime = "nodejs";

/**
 * BREND / ISHLAB CHIQARILGAN DAVLAT ro'yxatlarini boshqarish.
 *
 * Mahsulot formasida bu ikkisi endi QO'LDA yozilmaydi - ro'yxatdan
 * tanlanadi (bir brend uch xil yozilib ketmasin). Ro'yxatning o'zi
 * "Turlar" bo'limida tahrirlanadi.
 *
 * Kategoriya/materialdan farqi: mahsulotda matnning O'ZI saqlanadi,
 * shuning uchun qayta nomlash mahsulotlarni ham yangilaydi.
 */

const kindSchema = z.enum(["brands", "countries", "suppliers"]);

const addSchema = z.object({ kind: kindSchema, value: z.string().min(2).max(120) });
const renameSchema = z.object({
  kind: kindSchema,
  from: z.string().min(1).max(120),
  to: z.string().min(2).max(120),
});
const deleteSchema = z.object({ kind: kindSchema, value: z.string().min(1).max(120) });

const TITLE: Record<FacetKind, string> = {
  brands: "Brend",
  countries: "Ishlab chiqarilgan davlat",
  suppliers: "Yetkazib beruvchi",
};

export async function GET() {
  const admin = await requirePermission("products");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  return NextResponse.json({ facets: await getFacets() }, { headers: NO_STORE_HEADERS });
}

/** Ro'yxatga yangi qiymat qo'shish. */
export async function POST(request: Request) {
  const admin = await requirePermission("products");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = addSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  }

  const value = parsed.data.value.trim();
  const added = await addFacetValue(parsed.data.kind, value);
  if (!added) return NextResponse.json({ error: "Bunday qiymat allaqachon bor." }, { status: 409 });

  await logAction(`🏷 ${TITLE[parsed.data.kind]} qo'shildi (${admin.email ?? "admin"}): ${value}`);
  return NextResponse.json({ ok: true, value });
}

/** Qayta nomlash - mahsulotlardagi qiymat ham yangilanadi. */
export async function PATCH(request: Request) {
  const admin = await requirePermission("products");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = renameSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  }

  const { kind, from } = parsed.data;
  const to = parsed.data.to.trim();
  if (from === to) return NextResponse.json({ ok: true, updated: 0 });

  const updated = await renameFacetValue(kind, from, to);
  await logAction(
    `✏️ ${TITLE[kind]} qayta nomlandi (${admin.email ?? "admin"}): ${from} → ${to}, ${updated} ta mahsulot`
  );
  return NextResponse.json({ ok: true, updated });
}

/** O'chirish - faqat hech qaysi mahsulotda ishlatilmayotgan bo'lsa. */
export async function DELETE(request: Request) {
  const admin = await requirePermission("products");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  }

  const result = await removeFacetValue(parsed.data.kind, parsed.data.value);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Bu qiymat mahsulotlarda ishlatilyapti. Avval ularni boshqasiga o'tkazing." },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}

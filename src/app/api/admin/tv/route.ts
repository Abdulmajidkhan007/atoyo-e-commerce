import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/firebase/session";
import { getTaxonomy } from "@/lib/products/taxonomy-server";
import { siteUrl } from "@/lib/seo/json-ld";
import { getTvSettings, saveTvSettings } from "@/lib/tv/settings";
import { buildTvSlides, clearTvCache } from "@/lib/tv/slides";
import { logAction } from "@/lib/telegram/action-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DO'KON TELEVIZORI SOZLAMALARI (`/admin/tv`).
 *
 * Nima ko'rsatilishi, nechta mahsulot va har biri qancha turishi shu
 * yerdan boshqariladi. Javobda ko'rib chiqish uchun tayyor slaydlar
 * ham qaytadi - admin televizorga bormasdan natijani ko'radi.
 */
const schema = z.object({
  enabled: z.boolean().optional(),
  source: z.enum(["new", "top", "discount", "category", "manual"]).optional(),
  categories: z.array(z.string().max(80)).max(20).optional(),
  productIds: z.array(z.string().max(80)).max(40).optional(),
  count: z.number().int().min(5).max(40).optional(),
  slideSeconds: z.number().int().min(4).max(60).optional(),
  onlyInStock: z.boolean().optional(),
  showPrice: z.boolean().optional(),
  showQr: z.boolean().optional(),
  headline: z.string().max(120).optional(),
  ticker: z.string().max(300).optional(),
  phone: z.string().max(40).optional(),
});

export async function GET(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const settings = await getTvSettings();
  const [slides, taxonomy] = await Promise.all([buildTvSlides(settings), getTaxonomy()]);
  return NextResponse.json({
    settings,
    slides,
    categories: taxonomy.categories,
    // Televizorga yoziladigan manzil - qo'lda terish uchun.
    tvUrl: `${siteUrl()}/tv`,
  });
}

export async function PUT(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Sozlama noto'g'ri." }, { status: 400 });
  }

  const settings = await saveTvSettings(parsed.data);
  clearTvCache();
  const slides = await buildTvSlides(settings);

  await logAction(
    `📺 Do'kon ekrani sozlandi: ${settings.enabled ? "yoqilgan" : "o'chirilgan"}, ` +
      `manba "${settings.source}", ${slides.length} ta slayd, ${settings.slideSeconds} soniya.`
  ).catch(() => {});

  return NextResponse.json({ settings, slides });
}

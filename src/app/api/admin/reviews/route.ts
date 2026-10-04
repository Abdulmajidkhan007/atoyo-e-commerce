import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/firebase/session";
import { listRecentReviews } from "@/lib/reviews/testimonials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Oxirgi sharhlar — bosh sahifaga qaysi biri chiqishini tanlash uchun. */
export async function GET() {
  const admin = await requirePermission("settings");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });
  try {
    return NextResponse.json({ reviews: await listRecentReviews() });
  } catch (error) {
    console.error("Sharhlarni o'qishda xato:", error);
    return NextResponse.json({ error: "Sharhlar o'qilmadi." }, { status: 500 });
  }
}

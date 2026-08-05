import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/firebase/session";
import { processQueue, queueSummary } from "@/lib/social/publish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * NAVBAT: holati (GET) va uni bo'shatish (POST). Kunlik chegaraga
 * sig'gan holda ishlaydi, xatolar 3 martagacha qayta uriniladi.
 */
export async function GET(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });
  return NextResponse.json(await queueSummary());
}

export async function POST(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const result = await processQueue(10);
  return NextResponse.json({ ...result, queue: await queueSummary() });
}

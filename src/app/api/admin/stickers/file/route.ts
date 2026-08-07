import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/firebase/session";
import { downloadTelegramFile } from "@/lib/telegram/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * STIKER RASMINI KO'RSATISH.
 *
 * Telegram fayl manzilida bot TOKENI bo'ladi, shuning uchun uni
 * brauzerga berib bo'lmaydi - fayl server orqali uzatiladi.
 * Faqat admin uchun.
 */
export async function GET(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const fileId = new URL(request.url).searchParams.get("id");
  if (!fileId) return NextResponse.json({ error: "id kerak." }, { status: 400 });

  try {
    const file = await downloadTelegramFile(fileId);
    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        "Content-Type": file.contentType,
        // Stiker o'zgarmaydi - brauzer keshlab tursin.
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Stiker faylini olishda xato:", error);
    return NextResponse.json({ error: "Fayl olinmadi." }, { status: 404 });
  }
}

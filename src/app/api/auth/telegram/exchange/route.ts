import { NextResponse } from "next/server";
import { z } from "zod";
import { exchangeLoginCode } from "@/lib/telegram/telegram-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ code: z.string().min(10).max(120) });

/**
 * Kodni Firebase custom token'ga almashtirish.
 *
 * Mijoz hali botda "Start" bosmagan bo'lsa 202 qaytadi - client shu
 * javobni ko'rib, biroz kutib qayta so'raydi (polling).
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Kod noto'g'ri." }, { status: 400 });

  const result = await exchangeLoginCode(parsed.data.code);

  if (result.state === "ready") return NextResponse.json({ token: result.token });
  if (result.state === "pending") return NextResponse.json({ pending: true }, { status: 202 });
  if (result.state === "error") {
    // Sabab ko'rsatiladi: admin "Tizim tekshiruvi" bo'limida ham
    // xuddi shu xatoni ko'radi va nima qilishni biladi.
    return NextResponse.json(
      { error: `Serverda kirish tokenini yasab bo'lmadi: ${result.message}` },
      { status: 500 }
    );
  }
  return NextResponse.json({ error: "Kirish havolasi eskirdi. Qaytadan urinib ko'ring." }, { status: 400 });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { isAiConfigured } from "@/lib/ai/config";
import { MAX_SEARCH_IMAGE_BYTES, searchByImage } from "@/lib/ai/image-search";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAppUserFromRequest } from "@/lib/firebase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RASM BO'YICHA QIDIRUV (sayt va ilova).
 *
 * Mijoz mahsulot suratini yuboradi — javobda haqiqiy katalogdan
 * o'xshash mahsulotlar qaytadi. Har bir so'rov Claude vision'ga
 * chaqiruv bo'lgani uchun chegara qattiqroq: soatiga 10 ta.
 */

const schema = z.object({
  /** "data:image/jpeg;base64,..." yoki toza base64. */
  image: z.string().min(100),
  mimeType: z.string().max(40).optional(),
  hint: z.string().max(200).optional(),
});

export async function GET() {
  return NextResponse.json({ enabled: isAiConfigured() });
}

export async function POST(request: Request) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "Rasm bo'yicha qidiruv yoqilmagan." }, { status: 503 });
  }

  const { allowed } = await checkRateLimit({
    key: `imgsearch:${getClientIp(request)}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Rasm qidiruvi chegarasi tugadi. Keyinroq urinib ko'ring." }, { status: 429 });
  }

  // Ikkinchi qatlam: IP chegarasi chetlab o'tilsa ham (bu chaqiruv
  // Claude vision - pulli), hisobga bog'liq chegara qoladi. Kirgan
  // foydalanuvchi - uid bo'yicha kunlik chegara; kirmagan mijozlar
  // butun sayt bo'yicha kunlik umumiy chegara bilan himoyalanadi.
  const viewer = await getAppUserFromRequest(request);
  const secondLimit = viewer
    ? await checkRateLimit({
        key: `imgsearch:uid:${viewer.uid}`,
        limit: 30,
        windowMs: 24 * 60 * 60 * 1000,
      })
    : await checkRateLimit({
        key: "imgsearch:anon:global",
        limit: 100,
        windowMs: 24 * 60 * 60 * 1000,
      });
  if (!secondLimit.allowed) {
    return NextResponse.json({ error: "Rasm qidiruvi chegarasi tugadi. Keyinroq urinib ko'ring." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "So'rov noto'g'ri." }, { status: 400 });

  // "data:" prefiksi bo'lsa - mime turi o'sha yerdan olinadi.
  const match = parsed.data.image.match(/^data:([^;]+);base64,(.*)$/s);
  const base64 = (match ? (match[2] ?? "") : parsed.data.image).replace(/\s/g, "");
  const mimeType = match ? match[1]! : (parsed.data.mimeType ?? "image/jpeg");

  if (base64.length * 0.75 > MAX_SEARCH_IMAGE_BYTES) {
    return NextResponse.json({ error: "Rasm juda katta (4MB gacha)." }, { status: 413 });
  }

  try {
    // Narx rolga qarab: optom mijoz optom narxni, qolganlar dona narxni ko'radi.
    const result = await searchByImage({
      base64,
      mimeType,
      hint: parsed.data.hint,
      viewerRole: viewer?.role,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Xizmat band. Bir daqiqadan so'ng urinib ko'ring." }, { status: 429 });
    }
    console.error("Rasm qidiruvi xatosi:", error);
    return NextResponse.json({ error: "Rasmni tahlil qilib bo'lmadi." }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { reportError } from "@/lib/ops/report-error";

export const runtime = "nodejs";

/**
 * BRAUZERDAGI XATO HAQIDA XABAR.
 *
 * `src/app/global-error.tsx` mijozning ekranida "oq sahifa" chiqqanda
 * shu yerga yozadi, biz esa xodimlar guruhida ko'ramiz.
 *
 * Bu ochiq (autentifikatsiyasiz) endpoint, shuning uchun:
 *   • matn uzunligi qattiq cheklangan;
 *   • IP bo'yicha soatiga 20 ta so'rov (spam guruhni to'ldirmasin);
 *   • javob har doim 204 - hujumchi ichki holatni bilib olmasin.
 */
const schema = z.object({
  message: z.string().max(300).default(""),
  digest: z.string().max(60).optional(),
  path: z.string().max(200).default(""),
});

export async function POST(request: Request) {
  const { allowed } = await checkRateLimit({
    key: `client-error:${getClientIp(request)}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) return new NextResponse(null, { status: 204 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 204 });

  const { message, digest, path } = parsed.data;
  await reportError("Brauzerda sahifa yiqildi", message || "sababi noma'lum", {
    sahifa: path,
    digest,
  });

  return new NextResponse(null, { status: 204 });
}

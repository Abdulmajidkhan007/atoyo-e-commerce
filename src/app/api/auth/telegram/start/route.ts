import { NextResponse } from "next/server";
import { createLoginCode } from "@/lib/telegram/telegram-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Telegram orqali kirishni boshlash: bir martalik kod + botga havola. */
export async function POST(request: Request) {
  const { allowed } = await checkRateLimit({
    key: `tglogin:${getClientIp(request)}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Juda ko'p urinish. Keyinroq qayta urining." }, { status: 429 });
  }

  return NextResponse.json(await createLoginCode());
}

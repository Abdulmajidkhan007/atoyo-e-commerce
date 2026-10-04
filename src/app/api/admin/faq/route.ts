import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/firebase/session";
import { validationMessage } from "@/lib/http/validation";
import { buildDefaultFaq, getFaqSettings, saveFaqItems } from "@/lib/content/faq-server";
import { MAX_FAQ_ITEMS } from "@/types/site-pages";

export const runtime = "nodejs";

const schema = z.object({
  faq: z
    .array(
      z.object({
        question: z.string().trim().min(3).max(200),
        answer: z.string().trim().min(3).max(2000),
        questionRu: z.string().trim().max(200).optional(),
        answerRu: z.string().trim().max(2000).optional(),
      })
    )
    .max(MAX_FAQ_ITEMS),
});

/** Savol-javob: saqlangani + sozlamadan yasalgan standart ro'yxat. */
export async function GET() {
  const admin = await requirePermission("settings");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });
  const [settings, defaults] = await Promise.all([getFaqSettings(), buildDefaultFaq()]);
  return NextResponse.json({ ...settings, defaults });
}

/** Ro'yxatni to'liq almashtiradi (bo'sh ro'yxat — sahifada savol yo'q). */
export async function PUT(request: Request) {
  const admin = await requirePermission("settings");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  }
  const items = await saveFaqItems(parsed.data.faq);
  return NextResponse.json({ ok: true, items });
}

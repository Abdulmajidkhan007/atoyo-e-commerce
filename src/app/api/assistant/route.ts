import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { askAssistant } from "@/lib/ai/assistant";
import { isAiConfigured } from "@/lib/ai/config";
import { MAX_HISTORY_MESSAGES, MAX_QUESTION_LENGTH } from "@/lib/ai/guard";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAppUserFromRequest } from "@/lib/firebase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  question: z.string().min(1).max(MAX_QUESTION_LENGTH),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
      })
    )
    .max(MAX_HISTORY_MESSAGES)
    .optional(),
  channel: z.enum(["site", "app"]).optional(),
});

/** Yordamchi yoqilganmi - sayt/ilova tugmani shu javobga qarab ko'rsatadi. */
export async function GET() {
  return NextResponse.json({ enabled: isAiConfigured() });
}

export async function POST(request: Request) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "Yordamchi hozircha yoqilmagan." }, { status: 503 });
  }

  // Har bir IP uchun soatiga 30 ta savol - suiiste'mol va ortiqcha
  // xarajatning oldini oladi.
  const { allowed } = await checkRateLimit({
    key: `assistant:${getClientIp(request)}`,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Savollar chegarasi tugadi. Bir oz kutib qayta urinib ko'ring." },
      { status: 429 }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "So'rov noto'g'ri." }, { status: 400 });
  }

  try {
    // Kim so'ragani narxga ta'sir qiladi: optom mijozga optom narx.
    const viewer = await getAppUserFromRequest(request);
    const reply = await askAssistant({
      question: parsed.data.question,
      history: parsed.data.history ?? [],
      channel: parsed.data.channel ?? "site",
      viewerRole: viewer?.role,
    });
    return NextResponse.json(reply);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Yordamchi hozir band. Bir daqiqadan so'ng urinib ko'ring." },
        { status: 429 }
      );
    }
    console.error("Yordamchi xatosi:", error);
    return NextResponse.json(
      { error: "Yordamchi javob bera olmadi. Keyinroq urinib ko'ring." },
      { status: 502 }
    );
  }
}

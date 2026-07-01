import { NextResponse } from "next/server";
import { z } from "zod";
import { sendTopicMessage } from "@/lib/telegram/bot";
import { formatContactMessage } from "@/lib/telegram/templates";

const contactSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(7).max(20),
  question: z.string().min(3).max(2000),
});

export async function POST(request: Request) {
  const parsed = contactSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Forma ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  await sendTopicMessage("contact", formatContactMessage(parsed.data));

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendTopicMessage } from "@/lib/telegram/bot";
import { formatSubscriberMessage } from "@/lib/telegram/templates";

const subscribeSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  // Spamdan himoya: bir IP dan soatiga 5 ta so'rov.
  const { allowed } = await checkRateLimit({
    key: `subscribe:${getClientIp(request)}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Juda ko'p so'rov yuborildi. Bir oz kutib qayta urinib ko'ring." },
      { status: 429 }
    );
  }

  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Email manzili noto'g'ri." }, { status: 400 });
  }

  const { email } = parsed.data;

  try {
    const subscriberRef = getAdminDb().collection("subscribers").doc(email.toLowerCase());
    const existing = await subscriberRef.get();

    if (existing.exists) {
      return NextResponse.json({ ok: true, alreadySubscribed: true });
    }

    await subscriberRef.set({ email: email.toLowerCase(), createdAt: Date.now() });
  } catch (error) {
    console.error("Obunachini saqlashda xato:", error);
    return NextResponse.json({ error: "Xatolik yuz berdi. Qayta urinib ko'ring." }, { status: 500 });
  }

  try {
    await sendTopicMessage("subscribers", formatSubscriberMessage(email));
  } catch (error) {
    // Obunachi allaqachon saqlangan - Telegram xatosi mijozga ta'sir qilmaydi.
    console.error("Obuna xabarini Telegramga yuborishda xato:", error);
  }

  return NextResponse.json({ ok: true });
}

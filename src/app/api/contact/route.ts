import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { normalizePhone, isValidName } from "@/lib/validation";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendTopicMessage } from "@/lib/telegram/bot";
import { formatContactMessage } from "@/lib/telegram/templates";

const contactSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(120)
    .refine(isValidName, { message: "Ism noto'g'ri" }),
  phone: z
    .string()
    .transform((v) => normalizePhone(v))
    .refine((v): v is string => v !== null, { message: "Telefon raqam noto'g'ri" }),
  question: z.string().min(3).max(2000),
});

export async function POST(request: Request) {
  // Spamdan himoya: bir IP dan soatiga 5 ta so'rov.
  const { allowed } = await checkRateLimit({
    key: `contact:${getClientIp(request)}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Juda ko'p so'rov yuborildi. Bir oz kutib qayta urinib ko'ring." },
      { status: 429 }
    );
  }

  const parsed = contactSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Forma ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  try {
    // Avval Firestore'ga saqlanadi - Telegram vaqtincha ishlamasa ham
    // mijozning arizasi hech qachon yo'qolmaydi.
    await getAdminDb().collection("contactRequests").add({
      ...parsed.data,
      createdAt: Date.now(),
    });
  } catch (error) {
    console.error("Kontakt arizasini saqlashda xato:", error);
    return NextResponse.json({ error: "Xatolik yuz berdi. Qayta urinib ko'ring." }, { status: 500 });
  }

  try {
    await sendTopicMessage("contact", formatContactMessage(parsed.data));
  } catch (error) {
    // Ariza allaqachon saqlangan - Telegram xatosi mijozga ta'sir qilmaydi.
    console.error("Kontakt xabarini Telegramga yuborishda xato:", error);
  }

  return NextResponse.json({ ok: true });
}

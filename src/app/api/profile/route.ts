import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { normalizePhone, isValidName } from "@/lib/validation";

export const runtime = "nodejs";

const profileSchema = z.object({
  displayName: z
    .string()
    .min(1)
    .max(120)
    .refine(isValidName, { message: "Ism noto'g'ri" })
    .optional(),
  phoneNumber: z
    .string()
    .transform((v) => normalizePhone(v))
    .refine((v): v is string => v !== null, { message: "Telefon raqam noto'g'ri" })
    .nullable()
    .optional(),
  homeAddress: z.string().max(500).nullable().optional(),
});

/**
 * Foydalanuvchi o'z profilini yangilaydi (ism, telefon, manzil). Kim
 * ekanligi session cookie orqali aniqlanadi - foydalanuvchi faqat o'z
 * hujjatini o'zgartira oladi. `role` bu yerda hech qachon o'zgartirilmaydi.
 */
export async function PATCH(request: Request) {
  const user = await getCurrentAppUser();
  if (!user) {
    return NextResponse.json({ error: "Tizimga kiring." }, { status: 401 });
  }

  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.displayName !== undefined) updates.displayName = parsed.data.displayName.trim();
  if (parsed.data.phoneNumber !== undefined) updates.phoneNumber = parsed.data.phoneNumber;
  if (parsed.data.homeAddress !== undefined) updates.homeAddress = parsed.data.homeAddress;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  await getAdminDb().collection("users").doc(user.uid).update(updates);
  return NextResponse.json({ ok: true });
}

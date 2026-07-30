import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";

export const runtime = "nodejs";

const settingsSchema = z.object({
  phone: z.string().max(50).optional(),
  email: z.string().max(120).optional(),
  address: z.string().max(300).optional(),
  socials: z
    .array(
      z.object({
        platform: z.enum(["instagram", "telegram", "youtube", "facebook"]),
        url: z.string().max(300),
      })
    )
    .optional(),
  about: z
    .object({
      title: z.string().max(200),
      body: z.string().max(10000),
      imageUrl: z.string().url().or(z.literal("")).default(""),
    })
    .optional(),
  /** Kanal postining oxiri: telefonlar, shior, manzil va havolalar. */
  channelFooter: z
    .object({
      phones: z.array(z.string().max(40)).max(5).default([]),
      slogan: z.string().max(200).default(""),
      address: z.string().max(200).default(""),
      links: z
        .array(z.object({ title: z.string().max(40), url: z.string().max(300) }))
        .max(8)
        .default([]),
    })
    .optional(),
});

/** Sayt sozlamalari (kontakt, ijtimoiy tarmoqlar, about) - faqat admin. */
export async function PATCH(request: Request) {
  const admin = await requirePermission("settings");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  await getAdminDb().doc("settings/site").set(parsed.data, { merge: true });
  return NextResponse.json({ ok: true });
}

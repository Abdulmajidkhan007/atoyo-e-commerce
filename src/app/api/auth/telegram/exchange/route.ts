import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const schema = z.object({ code: z.string().min(10).max(120) });

/**
 * Bir martalik kodni Firebase custom token'ga almashtirish.
 * Kod faqat bir marta ishlaydi va 3 daqiqada eskiradi.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Kod noto'g'ri." }, { status: 400 });

  const ref = getAdminDb().collection("tgLogins").doc(parsed.data.code);

  try {
    // Kodni tranzaksiyada "ishlatilgan" deb belgilaymiz - ikkinchi marta
    // ishlamaydi (bir vaqtda kelgan ikki so'rovda ham).
    const uid = await getAdminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() as { uid?: string; expiresAt?: number; used?: boolean } | undefined;

      if (!snap.exists || !data?.uid) throw new Error("not-found");
      if (data.used) throw new Error("used");
      if ((data.expiresAt ?? 0) < Date.now()) throw new Error("expired");

      tx.update(ref, { used: true, usedAt: Date.now() });
      return data.uid;
    });

    const token = await getAdminAuth().createCustomToken(uid);
    return NextResponse.json({ token });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    const message =
      reason === "expired"
        ? "Kirish havolasi eskirdi. Qaytadan urinib ko'ring."
        : "Kirish amalga oshmadi. Qaytadan urinib ko'ring.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

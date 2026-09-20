import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/firebase/session";
import { createChallenge, hasActiveGrant } from "@/lib/security/challenge";

export const runtime = "nodejs";

/**
 * Muhim sozlamalarni saqlashdan oldin so'raladigan jumboq.
 * Javob faqat serverda saqlanadi (`adminChallenges`), clientga savol
 * matnining o'zi qaytadi.
 */
export async function POST() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  // Yaqinda jumboq yechilgan bo'lsa qayta so'ramaymiz - client
  // `skip: true` ni ko'rib oynani umuman ochmaydi.
  if (await hasActiveGrant(admin.uid)) {
    return NextResponse.json({ skip: true });
  }

  const challenge = await createChallenge(admin.uid);
  return NextResponse.json(challenge);
}

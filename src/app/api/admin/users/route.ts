import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { hasPermission, isOwner } from "@/lib/permissions";
import type { AppUser } from "@/types/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

/**
 * FOYDALANUVCHILAR RO'YXATI - server (Admin SDK) orqali.
 *
 * Ilgari admin panel bu ro'yxatni client Firestore'dan o'qir edi, lekin
 * admin panelda client auth sessiyasi (server-cookie rejimida) tiklanmaydi
 * va so'rov qoidalarga urilib osilib qolardi - sahifada spinner cheksiz
 * aylanardi. Endi o'qish ham server tomonda.
 */
export async function GET(request: Request) {
  const viewer = await getCurrentAppUser();
  if (!isOwner(viewer) && !hasPermission(viewer, "users")) {
    return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });
  }

  const cursor = new URL(request.url).searchParams.get("cursor");

  try {
    let query = getAdminDb().collection("users").orderBy("createdAt", "desc").limit(PAGE_SIZE);
    if (cursor) query = query.startAfter(Number(cursor));

    let snap = await query.get();
    // Eski hujjatlarda `createdAt` bo'lmasligi mumkin - Firestore ularni
    // saralashda umuman qaytarmaydi. Bo'sh natijada saralashsiz o'qiymiz.
    if (snap.empty && !cursor) {
      snap = await getAdminDb().collection("users").limit(PAGE_SIZE).get();
    }
    const users = snap.docs
      .map((d) => ({ uid: d.id, ...d.data() }) as AppUser)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

    return NextResponse.json({
      users,
      nextCursor: users.length === PAGE_SIZE ? (users.at(-1)?.createdAt ?? null) : null,
    });
  } catch (error) {
    console.error("Foydalanuvchilarni o'qishda xato:", error);
    return NextResponse.json({ error: "Foydalanuvchilarni yuklab bo'lmadi." }, { status: 500 });
  }
}

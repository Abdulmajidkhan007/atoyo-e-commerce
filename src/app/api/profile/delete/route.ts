import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { getCurrentAppUser, SESSION_COOKIE_NAME } from "@/lib/firebase/session";
import { logAction } from "@/lib/telegram/action-log";

export const runtime = "nodejs";

/**
 * Hisobni BUTUNLAY o'chirish. Kim ekanligi session cookie orqali
 * aniqlanadi - foydalanuvchi faqat O'Z hisobini o'chira oladi.
 *
 * O'chiriladi: Firebase Auth hisobi + Firestore users/{uid} hujjati.
 * Buyurtmalar tarixiy yozuv sifatida SAQLANADI (hisob-kitob uchun),
 * lekin egasi o'chirilgani uchun hech kimga ko'rinmaydi.
 *
 * Admin o'z hisobini o'chira olmaydi - saytni boshqaruvsiz qoldirib
 * qo'ymaslik uchun (avval boshqa adminga rolni o'tkazish kerak).
 */
export async function POST() {
  const user = await getCurrentAppUser();
  if (!user) {
    return NextResponse.json({ error: "Tizimga kiring." }, { status: 401 });
  }

  if (user.role === "admin") {
    return NextResponse.json(
      { error: "Admin hisobini o'chirib bo'lmaydi. Avval adminlikni boshqa foydalanuvchiga o'tkazing." },
      { status: 403 }
    );
  }

  try {
    await getAdminDb().collection("users").doc(user.uid).delete();
    await getAdminAuth().deleteUser(user.uid);

    // Buyurtmalar biznes-yozuv sifatida qoladi, lekin egasidan uziladi -
    // shu email bilan qayta ro'yxatdan o'tilsa eski tarix ko'rinmasligi uchun.
    try {
      const ordersSnap = await getAdminDb().collection("orders").where("userId", "==", user.uid).limit(300).get();
      if (!ordersSnap.empty) {
        const batch = getAdminDb().batch();
        ordersSnap.docs.forEach((d) => batch.update(d.ref, { userId: null }));
        await batch.commit();
      }
    } catch (error) {
      console.error("Buyurtmalarni uzishda xato:", error);
    }

    await logAction(`🗑 Sayt hisobi o'chirildi: ${user.email ?? user.uid}`);

    const response = NextResponse.json({ ok: true });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  } catch (error) {
    console.error("Hisobni o'chirishda xato:", error);
    return NextResponse.json({ error: "Hisobni o'chirishda xatolik yuz berdi." }, { status: 500 });
  }
}

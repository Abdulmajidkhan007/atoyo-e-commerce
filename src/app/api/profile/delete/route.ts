import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { getCurrentAppUser, SESSION_COOKIE_NAME } from "@/lib/firebase/session";

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

    const response = NextResponse.json({ ok: true });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  } catch (error) {
    console.error("Hisobni o'chirishda xato:", error);
    return NextResponse.json({ error: "Hisobni o'chirishda xatolik yuz berdi." }, { status: 500 });
  }
}

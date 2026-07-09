import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { uploadImageAdmin } from "@/lib/firebase/admin-storage";

export const runtime = "nodejs";

/**
 * Foydalanuvchi o'z profil rasmini yuklaydi. Kim ekanligi session cookie
 * orqali aniqlanadi - rasm faqat o'z hujjatiga (users/{uid}.photoURL)
 * yoziladi. Fayl Storage'da `users/<uid>/` papkasiga boradi.
 */
export async function POST(request: Request) {
  const user = await getCurrentAppUser();
  if (!user) {
    return NextResponse.json({ error: "Tizimga kiring." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Rasm yuborilmadi." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadImageAdmin(`users/${user.uid}`, {
      buffer,
      contentType: file.type,
      originalName: file.name,
    });

    await getAdminDb().collection("users").doc(user.uid).update({ photoURL: url });
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Profil rasmini yuklashda xato:", error);
    const message = error instanceof Error ? error.message : "Rasm yuklashda xatolik.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

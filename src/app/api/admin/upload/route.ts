import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/firebase/session";
import { uploadImageAdmin } from "@/lib/firebase/admin-storage";

export const runtime = "nodejs";

const MAX_FILES = 10;

/**
 * Admin panel uchun bir yoki bir nechta (1-10) rasmni serverda Storage'ga
 * yuklaydi va URL massivini qaytaradi. Faqat admin foydalanuvchi uchun.
 */
export async function POST(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Fayl topilmadi." }, { status: 400 });
  }

  // Storage papkasi: mahsulot uchun "products/ID", blog uchun "blog",
  // yoki eski mijozlar uchun productId (orqaga moslik).
  const productId = String(formData.get("productId") ?? "").trim();
  const folderParam = String(formData.get("folder") ?? "").trim();
  const folder = folderParam || (productId ? `products/${productId}` : "");
  if (!folder) {
    return NextResponse.json({ error: "folder yoki productId majburiy." }, { status: 400 });
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Rasm yuborilmadi." }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Ko'pi bilan ${MAX_FILES} ta rasm.` }, { status: 400 });
  }

  try {
    const urls: string[] = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const url = await uploadImageAdmin(folder, {
        buffer,
        contentType: file.type,
        originalName: file.name,
      });
      urls.push(url);
    }
    return NextResponse.json({ urls });
  } catch (error) {
    console.error("Rasm yuklashda xato:", error);
    const message = error instanceof Error ? error.message : "Rasm yuklashda xatolik.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

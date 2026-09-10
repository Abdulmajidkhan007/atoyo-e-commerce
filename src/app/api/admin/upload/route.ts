import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/firebase/session";
import { uploadImageAdmin, uploadVideoAdmin } from "@/lib/firebase/admin-storage";

export const runtime = "nodejs";

const MAX_FILES = 10;
/** Video og'ir bo'lgani uchun bir martada 3 tagacha. */
const MAX_VIDEOS = 3;

/**
 * Qaysi papkaga yuklash qaysi huquqni talab qiladi.
 * Notanish papka - eng qat'iy huquq (sozlamalar).
 */
function permissionForFolder(folder: string): "products" | "blog" | "settings" {
  if (folder.startsWith("products")) return "products";
  if (folder.startsWith("blog")) return "blog";
  return "settings";
}

/**
 * Admin panel uchun rasm yoki videoni serverda Storage'ga yuklaydi va
 * URL massivini qaytaradi. `kind=video` bo'lsa video sifatida
 * tekshiriladi (MP4/MOV/WebM, 20MB gacha). Faqat admin uchun.
 */
export async function POST(request: Request) {
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

  // HUQUQ PAPKAGA QARAB. Ilgari "xodimmi?" degan bitta tekshiruv
  // bor edi: katalogga ruxsati yo'q xodim ham blog rasmini ham,
  // sayt rasmini ham almashtira olardi.
  const permission = permissionForFolder(folder);
  const admin = await requirePermission(permission, request);
  if (!admin) {
    return NextResponse.json({ error: "Bu bo'limga ruxsatingiz yo'q." }, { status: 403 });
  }

  // Papka nomi tashqaridan keladi - `..` bilan boshqa joyga chiqib
  // ketishga yo'l qo'ymaymiz.
  if (folder.includes("..") || folder.startsWith("/")) {
    return NextResponse.json({ error: "Papka nomi noto'g'ri." }, { status: 400 });
  }

  const isVideo = String(formData.get("kind") ?? "").trim() === "video";
  const limit = isVideo ? MAX_VIDEOS : MAX_FILES;

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Fayl yuborilmadi." }, { status: 400 });
  }
  if (files.length > limit) {
    return NextResponse.json(
      { error: `Ko'pi bilan ${limit} ta ${isVideo ? "video" : "rasm"}.` },
      { status: 400 }
    );
  }

  try {
    const urls: string[] = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const upload = isVideo ? uploadVideoAdmin : uploadImageAdmin;
      const url = await upload(folder, {
        buffer,
        contentType: file.type,
        originalName: file.name,
      });
      urls.push(url);
    }
    return NextResponse.json({ urls });
  } catch (error) {
    console.error("Fayl yuklashda xato:", error);
    const message = error instanceof Error ? error.message : "Fayl yuklashda xatolik.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

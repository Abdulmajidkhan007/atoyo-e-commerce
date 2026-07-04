import "server-only";
import { randomUUID } from "node:crypto";
import { getAdminStorage } from "./admin";

const BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Rasmni Admin SDK orqali Firebase Storage'ga yuklaydi va ochiq
 * "download token" URL'ini qaytaradi. Client SDK'dan farqli - bu client
 * autentifikatsiya holatiga bog'liq emas, shuning uchun admin panelda
 * ishonchli ishlaydi. URL token asosida ochiq bo'ladi (qoidalarni
 * chetlab o'tadi), shuning uchun mahsulot rasmlari hammaga ko'rinadi.
 */
export async function uploadProductImageAdmin(
  productId: string,
  file: { buffer: Buffer; contentType: string; originalName: string }
): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.contentType)) {
    throw new Error("Faqat JPEG, PNG, WebP yoki GIF rasmlar qabul qilinadi.");
  }
  if (file.buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Rasm hajmi 8MB dan oshmasligi kerak.");
  }

  const safeName = file.originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const filePath = `products/${productId}/${randomUUID()}-${safeName}`;
  const token = randomUUID();

  const bucket = getAdminStorage().bucket(BUCKET_NAME);
  const storageFile = bucket.file(filePath);

  await storageFile.save(file.buffer, {
    contentType: file.contentType,
    metadata: {
      contentType: file.contentType,
      // Bu token orqali fayl ochiq download URL'i shakllanadi.
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(
    filePath
  )}?alt=media&token=${token}`;
}

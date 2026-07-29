import "server-only";
import { randomUUID } from "node:crypto";
import { getAdminStorage } from "./admin";

const BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
/** Telegram bot API fayl yuklashning o'zi 20 MB bilan cheklangan. */
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

/**
 * Rasmni Admin SDK orqali Firebase Storage'ga yuklaydi va ochiq
 * "download token" URL'ini qaytaradi. Client SDK'dan farqli - bu client
 * autentifikatsiya holatiga bog'liq emas, shuning uchun admin panelda
 * ishonchli ishlaydi. URL token asosida ochiq bo'ladi (qoidalarni
 * chetlab o'tadi), shuning uchun rasmlar hammaga ko'rinadi.
 *
 * `folder` - storage yo'li prefiksi (masalan "products/ID" yoki "blog").
 */
export async function uploadImageAdmin(
  folder: string,
  file: { buffer: Buffer; contentType: string; originalName: string }
): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.contentType)) {
    throw new Error("Faqat JPEG, PNG, WebP yoki GIF rasmlar qabul qilinadi.");
  }
  if (file.buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Rasm hajmi 8MB dan oshmasligi kerak.");
  }
  return saveToStorage(folder, file);
}

/** Faylni Storage'ga yozib, ochiq download URL'ini qaytaradi. */
async function saveToStorage(
  folder: string,
  file: { buffer: Buffer; contentType: string; originalName: string }
): Promise<string> {
  const safeName = file.originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "_");
  const filePath = `${safeFolder}/${randomUUID()}-${safeName}`;
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

/**
 * Mahsulot videosi (Telegramdan kelgan qisqa video/reels).
 * Rasm bilan bir xil "download token" URL qaytadi.
 */
export async function uploadVideoAdmin(
  folder: string,
  file: { buffer: Buffer; contentType: string; originalName: string }
): Promise<string> {
  if (!ALLOWED_VIDEO_TYPES.includes(file.contentType)) {
    throw new Error("Faqat MP4, MOV yoki WebM video qabul qilinadi.");
  }
  if (file.buffer.length > MAX_VIDEO_BYTES) {
    throw new Error("Video hajmi 20MB dan oshmasligi kerak.");
  }
  return saveToStorage(folder, file);
}

/** Mahsulot rasmi uchun qulaylik funksiyasi. */
export async function uploadProductImageAdmin(
  productId: string,
  file: { buffer: Buffer; contentType: string; originalName: string }
): Promise<string> {
  return uploadImageAdmin(`products/${productId}`, file);
}

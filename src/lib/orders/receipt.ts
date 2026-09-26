/**
 * TO'LOV CHEKI — fayl turini BAYTLARIDAN aniqlash.
 *
 * Brauzer yuborgan `Content-Type` ga ishonilmaydi (uni istalgancha
 * yozish mumkin): faylning birinchi baytlari ("sehrli raqam")
 * tekshiriladi. Ruxsat: JPEG, PNG, WebP (bank ilovasi skrinshoti) va
 * PDF (ba'zi banklar chekni PDF qilib beradi).
 *
 * Sof funksiya — `server-only` emas, testi `receipt.test.ts`.
 */
export const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

export function detectReceiptType(bytes: Uint8Array): { contentType: string; ext: string } | null {
  const starts = (...signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  if (bytes.length < 12) return null;
  if (starts(0xff, 0xd8, 0xff)) return { contentType: "image/jpeg", ext: "jpg" };
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { contentType: "image/png", ext: "png" };
  // RIFF....WEBP
  if (starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return { contentType: "image/webp", ext: "webp" };
  }
  if (starts(0x25, 0x50, 0x44, 0x46, 0x2d)) return { contentType: "application/pdf", ext: "pdf" };
  return null;
}

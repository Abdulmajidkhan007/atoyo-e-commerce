/**
 * BUFERDAN (clipboard) RASM OLISH.
 *
 * Ctrl+V bosilganda brauzer `ClipboardEvent.clipboardData` beradi.
 * Skrinshot yoki "Rasmni nusxalash" qilingan bo'lsa u yerda `File`
 * turadi, lekin nomi ko'pincha bo'sh yoki "image.png" bo'ladi -
 * Storage'da tushunarli nom qolishi uchun qayta nomlaymiz.
 *
 * Server (`admin-storage.ts`) faqat JPEG/PNG/WebP/GIF qabul qiladi,
 * shuning uchun boshqa turlar shu yerda ajratib tashlanadi.
 */

/** Serverdagi ALLOWED_TYPES bilan bir xil bo'lishi shart. */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export interface ClipboardImages {
  /** Yuklashga tayyor rasmlar. */
  files: File[];
  /** Buferda rasm bor edi, lekin turi qo'llab-quvvatlanmaydi. */
  skipped: number;
}

/**
 * `DataTransfer` (paste yoki drop) ichidan rasmlarni ajratib oladi.
 * Rasm bo'lmasa bo'sh ro'yxat qaytadi - chaqiruvchi hodisani
 * to'smasligi kerak (oddiy matn paste'i ishlashda davom etsin).
 */
export function imagesFromTransfer(data: DataTransfer | null | undefined): ClipboardImages {
  if (!data) return { files: [], skipped: 0 };

  const raw: File[] = [];
  // `items` - paste'ning asosiy manbasi, `files` esa drag&drop uchun.
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file) raw.push(file);
  }
  if (raw.length === 0) {
    for (const file of Array.from(data.files ?? [])) raw.push(file);
  }

  const files: File[] = [];
  let skipped = 0;
  raw.forEach((file, index) => {
    if (!file.type.startsWith("image/")) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      skipped += 1;
      return;
    }
    files.push(renameClipboardFile(file, index));
  });

  return { files, skipped };
}

/** Buferdagi nomsiz rasmga tushunarli nom beradi: `bufer-<vaqt>-1.png`. */
function renameClipboardFile(file: File, index: number): File {
  const hasName = file.name && file.name !== "image.png" && file.name !== "blob";
  if (hasName) return file;
  const ext = EXTENSIONS[file.type] ?? "png";
  const name = `bufer-${Date.now()}-${index + 1}.${ext}`;
  return new File([file], name, { type: file.type, lastModified: file.lastModified });
}

/**
 * Paste hodisasini rasm sifatida qabul qilish kerakmi.
 *
 * Word/brauzerdan matn nusxalanganda ham buferda rasm bo'lishi mumkin.
 * Agar foydalanuvchi matn maydoniga yozayotgan bo'lsa va buferda matn
 * ham bor bo'lsa - oddiy matn paste'iga tegmaymiz.
 */
export function shouldPasteAsImage(event: ClipboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  const tag = target?.tagName?.toLowerCase();
  const editing = tag === "input" || tag === "textarea" || target?.isContentEditable === true;
  if (!editing) return true;
  return !(event.clipboardData?.getData("text/plain") ?? "").trim();
}

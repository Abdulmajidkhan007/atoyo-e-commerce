import "server-only";
import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin";

/**
 * STORAGE'DAGI "YETIM" FAYLLAR.
 *
 * Rasm yoki video mahsulotdan olib tashlanganda fayl ATAYLAB
 * o'chirilmaydi: mahsulot 30 kunlik savatga (`deletedProducts`)
 * tushishi mumkin va tiklanganda rasmlari joyida turishi kerak;
 * bitta fayl bir nechta hujjatda ishlatilgan bo'lishi ham mumkin.
 *
 * Lekin bu fayllar Storage'ni BAND QILADI. Shuning uchun shu modul
 * bor: u bazadagi HAMMA havolani yig'ib, ularga kirmagan va yetarlicha
 * ESKI fayllarni topadi. Topilganini ko'rsatadi; o'chirish alohida,
 * tasdiq bilan bo'ladi.
 *
 * Xavfsizlik qoidalari (buzilmasin):
 *
 *   • faqat ma'lum papkalar tekshiriladi (`products/`, `blog/`, `site/`);
 *   • faylning yoshi `MIN_AGE_DAYS` dan kichik bo'lsa TEGILMAYDI —
 *     hozirgina yuklangan, lekin hali hujjatga yozilmagan fayl
 *     (yarim yo'lda uzilgan kirim) tasodifan o'chib ketmasin;
 *   • havolalar hujjat JSON'idan REGEX bilan olinadi — ya'ni yangi
 *     maydon qo'shilsa ham (masalan `posterUrl`) u o'zi hisobga
 *     olinadi va fayl "yetim" deb sanalmaydi.
 */

/** Tekshiriladigan papkalar. */
const PREFIXES = ["products/", "blog/", "site/"];

/** Shu kundan yosh fayllarga tegilmaydi. */
const MIN_AGE_DAYS = 30;

/** Bir marta ko'rib chiqiladigan fayl chegarasi (himoya). */
const MAX_FILES = 50_000;

/** Havola izlanadigan kolleksiyalar (hammasi to'liq o'qiladi). */
const COLLECTIONS = [
  "products",
  "deletedProducts",
  "blogPosts",
  "settings",
  "metadata",
  // Buyurtma va sharhlar ichida ham rasm havolasi bo'lishi mumkin
  // (chek, mahsulot rasmi) - ular ham "band" hisoblanadi.
  "orders",
  "reviews",
  "stockIntakes",
  "intakeAlbums",
];

/** Firebase Storage havolasidan fayl yo'lini ajratadi. */
const URL_RE = /firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/([^?"'\s\\]+)/g;

export interface OrphanFile {
  path: string;
  bytes: number;
  /** Yaratilgan sana (ms). */
  createdAt: number;
}

export interface OrphanReport {
  /** Papkalardagi jami fayl soni. */
  scanned: number;
  /** Bazada ishlatilayotgan havolalar soni. */
  referenced: number;
  /** Yetim fayllar. */
  orphans: OrphanFile[];
  /** Yetimlarning umumiy hajmi (bayt). */
  bytes: number;
  /** Yosh bo'lgani uchun tegilmagan fayllar soni. */
  tooNew: number;
}

/** Bazadagi hamma Storage havolasini (fayl yo'li ko'rinishida) yig'adi. */
async function referencedPaths(): Promise<Set<string>> {
  const db = getAdminDb();
  const paths = new Set<string>();

  for (const name of COLLECTIONS) {
    const snap = await db.collection(name).get().catch(() => null);
    if (!snap) continue;
    for (const doc of snap.docs) {
      const json = JSON.stringify(doc.data());
      for (const match of json.matchAll(URL_RE)) {
        const encoded = match[1];
        if (!encoded) continue;
        try {
          paths.add(decodeURIComponent(encoded));
        } catch {
          // Buzuq havola - e'tiborsiz (fayl "band" deb sanalmaydi).
        }
      }
    }
  }

  return paths;
}

/** Yetim fayllarni topadi (hech narsa o'chirmaydi). */
export async function scanOrphanFiles(): Promise<OrphanReport> {
  const used = await referencedPaths();
  const bucket = getAdminStorage().bucket(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? ""
  );

  const cutoff = Date.now() - MIN_AGE_DAYS * 86_400_000;
  const orphans: OrphanFile[] = [];
  let scanned = 0;
  let tooNew = 0;
  let bytes = 0;

  for (const prefix of PREFIXES) {
    const [files] = await bucket.getFiles({ prefix, maxResults: MAX_FILES });
    for (const file of files) {
      scanned += 1;
      if (used.has(file.name)) continue;

      const createdAt = Date.parse(String(file.metadata.timeCreated ?? "")) || 0;
      if (createdAt > cutoff) {
        tooNew += 1;
        continue;
      }

      const size = Number(file.metadata.size ?? 0);
      orphans.push({ path: file.name, bytes: size, createdAt });
      bytes += size;
    }
  }

  // Kattasi birinchi - hisobotda eng ko'p joy egallagani ko'rinsin.
  orphans.sort((a, b) => b.bytes - a.bytes);
  return { scanned, referenced: used.size, orphans, bytes, tooNew };
}

/**
 * Yetim fayllarni o'chiradi. Ro'yxat QAYTA hisoblanadi — chaqiruvchi
 * yuborgan yo'llarga ishonilmaydi (aks holda API orqali istalgan
 * faylni o'chirib yuborish mumkin bo'lardi).
 */
export async function deleteOrphanFiles(): Promise<{ deleted: number; bytes: number }> {
  const report = await scanOrphanFiles();
  const bucket = getAdminStorage().bucket(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? ""
  );

  let deleted = 0;
  let bytes = 0;

  for (const orphan of report.orphans) {
    try {
      await bucket.file(orphan.path).delete();
      deleted += 1;
      bytes += orphan.bytes;
    } catch (error) {
      console.warn("Faylni o'chirib bo'lmadi:", orphan.path, error);
    }
  }

  return { deleted, bytes };
}

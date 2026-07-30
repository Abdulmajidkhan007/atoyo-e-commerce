import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import type { StockIntake } from "@/types/intake";

/**
 * Oxirgi kirimlar (eng yangisidan). Indeks bo'lmasa yoki saralash
 * ishlamasa - saralashsiz o'qib, xotirada tartiblaymiz, ya'ni sahifa
 * hech qachon bo'sh qolmaydi.
 */
export async function getRecentIntakes(limit = 20): Promise<StockIntake[]> {
  const db = getAdminDb();

  try {
    const snap = await db.collection("stockIntakes").orderBy("createdAt", "desc").limit(limit).get();
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as StockIntake);
  } catch {
    const snap = await db.collection("stockIntakes").limit(200).get();
    return snap.docs
      .map((d) => ({ ...d.data(), id: d.id }) as StockIntake)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }
}

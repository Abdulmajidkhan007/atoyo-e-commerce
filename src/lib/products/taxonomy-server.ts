import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { BUILTIN_TAXONOMY, mergeTaxonomy, type StoredTaxonomy, type Taxonomy } from "./taxonomy";

/**
 * Kategoriya / material / sotish turi ro'yxatlarini Firestore'dan
 * (`metadata/taxonomy`) o'qib, standartlar bilan birlashtiradi.
 * Faqat server tomonda - client uchun `/api/taxonomy` bor.
 */
export async function getTaxonomy(): Promise<Taxonomy> {
  try {
    const snap = await getAdminDb().doc("metadata/taxonomy").get();
    return mergeTaxonomy((snap.data() ?? {}) as StoredTaxonomy);
  } catch {
    return BUILTIN_TAXONOMY;
  }
}

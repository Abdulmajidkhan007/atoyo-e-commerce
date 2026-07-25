import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * FILTR RO'YXATLARI (facets) - brend va ishlab chiqaruvchi davlat
 * qiymatlari `metadata/facets` hujjatida to'planadi. Ilgari bu ro'yxat
 * kodda qotib qolgan edi; 10 000+ mahsulotda butun katalogni skanerlash
 * qimmat, shuning uchun har mahsulot yozilganda qiymat ro'yxatga
 * qo'shiladi (arrayUnion - takrorlanmaydi).
 */

const FACETS_DOC = ["metadata", "facets"] as const;

export interface ProductFacets {
  brands: string[];
  countries: string[];
}

const EMPTY_FACETS: ProductFacets = { brands: [], countries: [] };

/** Mahsulot qo'shilganda/tahrirlanganda yangi qiymatlarni ro'yxatga qo'shadi. */
export async function registerFacets(params: { brand?: string; country?: string }): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (params.brand?.trim()) updates.brands = FieldValue.arrayUnion(params.brand.trim());
  if (params.country?.trim()) updates.countries = FieldValue.arrayUnion(params.country.trim());
  if (Object.keys(updates).length === 0) return;

  try {
    await getAdminDb().doc(FACETS_DOC.join("/")).set(updates, { merge: true });
  } catch (error) {
    // Facet yozuvi ikkinchi darajali - mahsulot saqlanishiga xalaqit bermaydi.
    console.error("Facet yozishda xato:", error);
  }
}

/** Filtr paneli uchun brend/davlat ro'yxati (alifbo tartibida). */
export async function getFacets(): Promise<ProductFacets> {
  try {
    const snap = await getAdminDb().doc(FACETS_DOC.join("/")).get();
    const data = snap.data() as Partial<ProductFacets> | undefined;
    if (!data) return EMPTY_FACETS;
    return {
      brands: (data.brands ?? []).filter(Boolean).sort((a, b) => a.localeCompare(b)),
      countries: (data.countries ?? []).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    };
  } catch {
    return EMPTY_FACETS;
  }
}

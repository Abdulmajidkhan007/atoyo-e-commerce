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
  /** Yetkazib beruvchilar ("kimdan kelgan") - bulk narx yangilash uchun. */
  suppliers: string[];
}

const EMPTY_FACETS: ProductFacets = { brands: [], countries: [], suppliers: [] };

/** Mahsulot qo'shilganda/tahrirlanganda yangi qiymatlarni ro'yxatga qo'shadi. */
export async function registerFacets(params: {
  brand?: string;
  country?: string;
  supplier?: string;
}): Promise<void> {
  // Ro'yxatda shu qiymat boshqa registrda bor bo'lsa - qayta qo'shmaymiz
  // (aks holda "Atoyo" va "ATOYO" ikkita bo'lib ko'rinadi).
  const existing = await getFacets().catch(() => EMPTY_FACETS);
  const isNew = (list: string[], value: string) =>
    !list.some((item) => item.toLowerCase() === value.toLowerCase());

  const updates: Record<string, unknown> = {};
  const brand = params.brand?.trim();
  const country = params.country?.trim();
  const supplier = params.supplier?.trim();
  if (brand && isNew(existing.brands, brand)) updates.brands = FieldValue.arrayUnion(brand);
  if (country && isNew(existing.countries, country)) updates.countries = FieldValue.arrayUnion(country);
  if (supplier && isNew(existing.suppliers, supplier)) updates.suppliers = FieldValue.arrayUnion(supplier);
  if (Object.keys(updates).length === 0) return;

  try {
    await getAdminDb().doc(FACETS_DOC.join("/")).set(updates, { merge: true });
  } catch (error) {
    // Facet yozuvi ikkinchi darajali - mahsulot saqlanishiga xalaqit bermaydi.
    console.error("Facet yozishda xato:", error);
  }
}

/**
 * Bir xil qiymat turli katta-kichik harf bilan yozilgan bo'lsa
 * ("Atoyo" va "ATOYO") ro'yxatda ikki marta chiqmasligi kerak:
 * solishtirish kichik harflarda, ko'rsatiladigan nom esa birinchi
 * uchraganicha qoladi.
 */
function dedupe(values: string[]): string[] {
  const seen = new Map<string, string>();
  for (const raw of values) {
    const value = raw?.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    // Bir xil qiymatdan chiroyliroq yozilganini (bosh harfli) tanlaymiz.
    const existing = seen.get(key);
    if (!existing || (existing === existing.toUpperCase() && value !== value.toUpperCase())) {
      seen.set(key, value);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/** Filtr paneli uchun brend/davlat ro'yxati (alifbo tartibida, takrorsiz). */
export async function getFacets(): Promise<ProductFacets> {
  try {
    const snap = await getAdminDb().doc(FACETS_DOC.join("/")).get();
    const data = snap.data() as Partial<ProductFacets> | undefined;
    if (!data) return EMPTY_FACETS;
    return {
      brands: dedupe(data.brands ?? []),
      countries: dedupe(data.countries ?? []),
      suppliers: dedupe(data.suppliers ?? []),
    };
  } catch {
    return EMPTY_FACETS;
  }
}

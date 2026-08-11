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

/**
 * BOSHQARILADIGAN RO'YXATLAR (admin panelidagi "Turlar" bo'limi).
 *
 * Brend va ishlab chiqarilgan davlat ilgari mahsulot formasida QO'LDA
 * yozilardi: bitta brend "Valtec", "VALTEC", "valtek" bo'lib uch xil
 * yozilib ketardi va filtr chalkashardi. Endi ular ham ro'yxatdan
 * tanlanadi, ro'yxatning o'zi esa shu yerdan boshqariladi.
 *
 * Kategoriya/materialdan farqi: mahsulotda slug emas, KO'RINADIGAN
 * MATNNING o'zi saqlanadi (`brand: "Valtec"`), shuning uchun qayta
 * nomlaganda mahsulotlar ham yangilanadi.
 */
export type FacetKind = "brands" | "countries" | "suppliers";

/** Facet turi -> mahsulotdagi maydon nomi. */
const FACET_FIELD: Record<FacetKind, string> = {
  brands: "brand",
  countries: "manufacturerCountry",
  suppliers: "supplier",
};

/** Ro'yxatga yangi qiymat qo'shadi. Bor bo'lsa `false` qaytaradi. */
export async function addFacetValue(kind: FacetKind, value: string): Promise<boolean> {
  const clean = value.trim();
  if (!clean) return false;
  const existing = await getFacets();
  if (existing[kind].some((item) => item.toLowerCase() === clean.toLowerCase())) return false;

  await getAdminDb()
    .doc(FACETS_DOC.join("/"))
    .set({ [kind]: FieldValue.arrayUnion(clean) }, { merge: true });
  return true;
}

/**
 * Qiymatni qayta nomlaydi va MAHSULOTLARNI ham yangilaydi - aks holda
 * eski nom mahsulotlarda qolib, ro'yxatga qaytadan qo'shilib ketardi.
 * Qaytaradi: nechta mahsulot yangilandi.
 */
export async function renameFacetValue(
  kind: FacetKind,
  from: string,
  to: string
): Promise<number> {
  const db = getAdminDb();
  const field = FACET_FIELD[kind];
  let touched = 0;

  // Ko'p mahsulotli brend ham bo'lishi mumkin - bo'laklab yangilaymiz.
  for (let round = 0; round < 20; round++) {
    const snap = await db.collection("products").where(field, "==", from).limit(400).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.update(doc.ref, { [field]: to }));
    await batch.commit();
    touched += snap.size;
    if (snap.size < 400) break;
  }

  const existing = await getFacets();
  const next = existing[kind].filter((item) => item !== from);
  if (!next.some((item) => item.toLowerCase() === to.toLowerCase())) next.push(to);
  await db.doc(FACETS_DOC.join("/")).set({ [kind]: next }, { merge: true });

  return touched;
}

/**
 * Ro'yxatdan o'chiradi. Mahsulotlarda ishlatilayotgan bo'lsa
 * o'chirilmaydi (aks holda mahsulotda "ko'rinmas" qiymat qolardi).
 */
export async function removeFacetValue(
  kind: FacetKind,
  value: string
): Promise<{ ok: boolean; used?: boolean }> {
  const used = await getAdminDb()
    .collection("products")
    .where(FACET_FIELD[kind], "==", value)
    .limit(1)
    .get();
  if (!used.empty) return { ok: false, used: true };

  await getAdminDb()
    .doc(FACETS_DOC.join("/"))
    .set({ [kind]: FieldValue.arrayRemove(value) }, { merge: true });
  return { ok: true };
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

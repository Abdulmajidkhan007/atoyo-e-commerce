import { CatalogCleanup } from "@/components/admin/CatalogCleanup";
import { getTaxonomy } from "@/lib/products/taxonomy-server";
import { getFacets } from "@/lib/products/facets";

export const dynamic = "force-dynamic";

/**
 * KATALOGNI TARTIBGA SOLISH.
 *
 * Katta import (masalan 1C narxnomasi) qilingandan keyin katalogda
 * xatolar qoladi: kategoriyasi noto'g'ri tushgani, keraksizi, rasmi
 * yo'g'i. Bu sahifada ularni brend/kategoriya bo'yicha filtrlab,
 * belgilab, bir yo'la tuzatish yoki o'chirish mumkin; tayyor bo'lganini
 * esa TANLAB kanalga e'lon qilinadi.
 */
export default async function CatalogCleanupPage() {
  const [taxonomy, facets] = await Promise.all([getTaxonomy(), getFacets()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">
          Katalogni tartibga solish
        </h1>
        <p className="text-sm text-navy-300">
          Katta kirimdan keyin xatolarni topish uchun: brend yoki kategoriya bo&apos;yicha
          filtrlang, keraksizini o&apos;chiring, xato tushganini to&apos;g&apos;rilang, rasm
          yuklang — tayyor bo&apos;lganini esa tanlab kanalga post qiling. Har bir amal
          xodimlar guruhidagi &quot;actions&quot; topikka yozib boriladi.
        </p>
      </div>

      <CatalogCleanup taxonomy={taxonomy} brands={facets.brands} />
    </div>
  );
}

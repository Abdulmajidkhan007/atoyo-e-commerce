import type { ZodError } from "zod";

/**
 * TEKSHIRUV XATOSINI ODAM TUSHUNADIGAN QILIB YOZISH.
 *
 * Admin route'lari ilgari faqat "Ma'lumotlar noto'g'ri." derdi.
 * Formada 30 dan ortiq maydon bor - bunday xabar bilan qaysi biri
 * aybdorligini topib bo'lmaydi (bir marta "kalit so'zlar 10 tadan
 * ko'p" degan sabab yashirinib qolgan edi).
 *
 * Endi javobda AYNAN qaysi maydon va nima uchun rad etilgani
 * yoziladi. Maydon nomlari admin formadagi yozuvlar bilan bir xil.
 */

const FIELD_LABELS: Record<string, string> = {
  name: "Nomi",
  description: "Tavsif",
  nameRu: "Nomi (ruscha)",
  nameEn: "Nomi (inglizcha)",
  descriptionRu: "Tavsif (ruscha)",
  descriptionEn: "Tavsif (inglizcha)",
  sku: "Kodi / artikul",
  keywords: "Maxsus kalit so'zlar",
  category: "Kategoriya",
  material: "Material",
  unit: "Sotish turi",
  brand: "Brend",
  manufacturerCountry: "Ishlab chiqaruvchi davlat",
  supplier: "Kimdan kelgan",
  price: "Optom narx",
  costPrice: "Tannarx",
  discountPrice: "Chegirma narxi",
  discountUntil: "Chegirma tugash sanasi",
  stock: "Zaxira",
  diameterMm: "Diametr",
  lengthMm: "Uzunlik",
  weightKg: "Vazni",
  images: "Rasmlar",
  videos: "Videolar",
  variants: "Turlari",
  variantAxes: "Turlar o'qi",
};

function labelFor(path: (string | number)[]): string {
  const first = path[0];
  if (typeof first !== "string") return "Ma'lumot";
  const label = FIELD_LABELS[first] ?? first;
  // Ro'yxat ichidagi element bo'lsa nechanchisi ekanini aytamiz.
  const index = path[1];
  return typeof index === "number" ? `${label} (${index + 1}-qator)` : label;
}

function reasonFor(issue: ZodError["issues"][number]): string {
  switch (issue.code) {
    case "too_big":
      return typeof issue.maximum === "number"
        ? issue.type === "string"
          ? `${issue.maximum} belgidan uzun bo'lmasin`
          : issue.type === "array"
            ? `${issue.maximum} tadan ko'p bo'lmasin`
            : `${issue.maximum} dan katta bo'lmasin`
        : "juda katta";
    case "too_small":
      return typeof issue.minimum === "number"
        ? issue.type === "string" && issue.minimum === 1
          ? "bo'sh qoldirilmaydi"
          : issue.type === "array"
            ? `kamida ${issue.minimum} ta bo'lsin`
            : `${issue.minimum} dan kichik bo'lmasin`
        : "juda kichik";
    case "invalid_type":
      return issue.received === "undefined" ? "to'ldirilmagan" : "turi noto'g'ri";
    case "invalid_string":
      return issue.validation === "url" ? "manzil noto'g'ri" : "format noto'g'ri";
    default:
      return issue.message;
  }
}

/**
 * Xatoni bitta qatorga yig'adi (eng ko'pi bilan 3 ta sabab -
 * xabar cheksiz uzayib ketmasin).
 */
export function validationMessage(error: ZodError): string {
  const seen = new Set<string>();
  const parts: string[] = [];

  for (const issue of error.issues) {
    const text = `${labelFor(issue.path)} — ${reasonFor(issue)}`;
    if (seen.has(text)) continue;
    seen.add(text);
    parts.push(text);
    if (parts.length === 3) break;
  }

  if (parts.length === 0) return "Ma'lumotlar noto'g'ri.";
  return `Ma'lumotlar noto'g'ri: ${parts.join("; ")}.`;
}

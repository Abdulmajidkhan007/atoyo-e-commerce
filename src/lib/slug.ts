/**
 * SLUG YASASH — bitta joyda.
 *
 * Avval to'rtta nusxa bor edi va ular BIR XIL ISHLAMASDI: turlar
 * uchun yozilgani kirill harflarini (`Ѐ-ӿ`) va o'zbekcha apostroflarni
 * to'g'ri qayta ishlardi, mahsulot/blog route'laridagi nusxalar esa
 * yo'q. Natijada "Радиатор" nomli mahsulotning slug'i butunlay bo'sh
 * qolib, hammasi "mahsulot" bo'lib ketardi. Endi hamma shu yerdan
 * chaqiradi.
 */

export interface SlugOptions {
  /** Matndan hech narsa qolmasa ishlatiladigan qiymat. */
  fallback?: string;
  /** Uzunlik chegarasi (URL cho'zilib ketmasin). */
  maxLength?: number;
}

export function slugify(text: string, options: SlugOptions = {}): string {
  const maxLength = options.maxLength ?? 40;
  const cleaned = text
    .toLowerCase()
    .trim()
    // O'zbekchadagi har xil apostroflar ("o'lcham" → "olcham").
    .replace(/[’'`ʻʼ]/g, "")
    .replace(/[^a-z0-9Ѐ-ӿ\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, maxLength)
    // Kesilgandan keyin oxirida chiziqcha qolishi mumkin.
    .replace(/-+$/, "");

  return cleaned || options.fallback || `tur-${Date.now().toString(36)}`;
}

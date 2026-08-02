import type {Product, ProductVariant} from './types';

/**
 * TURLAR bilan ishlash - saytdagi `src/lib/products/variants.ts` ning
 * ilova uchun qisqartirilgan nusxasi. Ikkalasi bir xil ma'lumot
 * shakli bilan ishlaydi, shuning uchun narx/zaxira hisobi ham bir xil.
 */

export function hasVariants(product: Product): boolean {
  return (product.variantAxes?.length ?? 0) > 0 && (product.variants?.length ?? 0) > 0;
}

export function variantIdOf(product: Product, options: Record<string, string>): string {
  return (product.variantAxes ?? []).map(axis => options[axis.key] ?? '').join('|');
}

export function findVariant(
  product: Product,
  options: Record<string, string>,
): ProductVariant | null {
  const id = variantIdOf(product, options);
  return (product.variants ?? []).find(v => v.id === id) ?? null;
}

export function defaultVariant(product: Product): ProductVariant | null {
  const variants = product.variants ?? [];
  return variants.find(v => v.stock > 0) ?? variants[0] ?? null;
}

export function variantLabel(product: Product, variant: ProductVariant): string {
  return (product.variantAxes ?? [])
    .map(axis => variant.options[axis.key])
    .filter(Boolean)
    .join(' • ');
}

export function variantPrice(variant: ProductVariant): number {
  const discount = variant.discountPrice ?? null;
  return discount !== null && discount > 0 && discount < variant.price ? discount : variant.price;
}

export function minVariantPrice(product: Product): number | null {
  const prices = (product.variants ?? []).map(variantPrice);
  return prices.length > 0 ? Math.min(...prices) : null;
}

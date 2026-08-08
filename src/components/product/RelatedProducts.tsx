import Image from "next/image";
import Link from "next/link";
import { isDiscountActive } from "@/lib/products/pricing";
import { hasVariants, minVariantPrice } from "@/lib/products/variants";
import type { Product } from "@/types/product";
import { formatSom } from "@/lib/format";

/**
 * O'XSHASH MAHSULOTLAR - mahsulot sahifasining pastida.
 * Server komponenti: qo'shimcha JS yubormaydi, shunchaki havolalar.
 */
export function RelatedProducts({
  products,
  /** Sarlavha; bo'sh matn berilsa umuman chiqmaydi (almashtiruvchilar bloki). */
  title = "O'xshash mahsulotlar",
}: {
  products: Product[];
  title?: string;
}) {
  if (products.length === 0) return null;

  const priceOf = (product: Product) => {
    if (hasVariants(product)) return minVariantPrice(product) ?? product.price;
    return isDiscountActive(product) ? product.discountPrice! : product.price;
  };

  return (
    <div className={title ? "mt-10 flex flex-col gap-4" : "flex flex-col gap-4"}>
      {title && (
        <h2 className="text-lg font-semibold text-navy-900 dark:text-white">{title}</h2>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/mahsulot/${product.id}`}
            className="flex flex-col overflow-hidden rounded-xl2 border border-navy-100 bg-white transition hover:shadow-lg dark:border-navy-500 dark:bg-navy-700"
          >
            <span className="relative block aspect-square bg-navy-50 dark:bg-navy-900">
              {product.thumbnailUrl ? (
                <Image
                  src={product.thumbnailUrl}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover"
                />
              ) : null}
            </span>
            <span className="flex flex-col gap-1 p-3">
              <span className="line-clamp-2 text-sm text-navy-900 dark:text-white">{product.name}</span>
              <span className="text-sm font-semibold text-navy-900 dark:text-white">
                {formatSom(priceOf(product))}
                {hasVariants(product) ? " dan" : ""}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

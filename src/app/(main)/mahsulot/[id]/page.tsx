import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Chip } from "@mui/material";
import { getProductById } from "@/lib/firebase/admin-products";
import { getDictionary } from "@/lib/i18n/server";
import { isDiscountActive } from "@/lib/products/pricing";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { ProductGallery } from "@/components/product/ProductGallery";

function formatSom(amount: number): string {
  return `${amount.toLocaleString("uz-UZ")} so'm`;
}

interface ProductPageParams {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductPageParams): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  return { title: product ? `${product.name} | Atoyo Santexnika` : "Mahsulot topilmadi" };
}

export default async function ProductPage({ params }: ProductPageParams) {
  const { id } = await params;
  const [product, dict] = await Promise.all([getProductById(id), getDictionary()]);

  if (!product) notFound();

  // Chegirma muddati o'tgan bo'lsa - oddiy narx ko'rsatiladi.
  const hasDiscount = isDiscountActive(product);

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery
          images={product.images.length > 0 ? product.images : product.thumbnailUrl ? [product.thumbnailUrl] : []}
          alt={product.name}
        />

        <div className="flex flex-col gap-3">
          <Chip label={dict.categories[product.category] ?? product.category} size="small" className="!w-fit !bg-aqua-50 !text-aqua-700 dark:!bg-navy-500 dark:!text-aqua-100" />

          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">{product.name}</h1>
          <p className="text-sm text-navy-300">{product.brand} • {product.manufacturerCountry}</p>

          <div className="flex items-baseline gap-2">
            {hasDiscount && <span className="text-navy-300 line-through">{formatSom(product.price)}</span>}
            <span className="text-2xl font-bold text-navy-900 dark:text-white">
              {formatSom(hasDiscount ? product.discountPrice! : product.price)}
            </span>
          </div>

          <p className="text-sm text-navy-500 dark:text-navy-100">{product.description}</p>

          <dl className="grid grid-cols-2 gap-2 text-sm text-navy-500 dark:text-navy-100">
            {product.dimensions.diameterMm !== undefined && (
              <>
                <dt className="text-navy-300">{dict.product.diameter}</dt>
                <dd>{product.dimensions.diameterMm} mm</dd>
              </>
            )}
            {product.dimensions.lengthMm !== undefined && (
              <>
                <dt className="text-navy-300">{dict.product.length}</dt>
                <dd>{product.dimensions.lengthMm} mm</dd>
              </>
            )}
            {product.dimensions.weightKg !== undefined && (
              <>
                <dt className="text-navy-300">{dict.product.weight}</dt>
                <dd>{product.dimensions.weightKg} kg</dd>
              </>
            )}
          </dl>

          <p className="text-sm text-navy-300">
            {dict.product.inStock}: <span className="font-medium text-navy-900 dark:text-white">{product.stock} {dict.product.unit}</span>
          </p>

          <AddToCartButton product={product} />
        </div>
      </div>
    </section>
  );
}

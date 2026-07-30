import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Chip } from "@mui/material";
import { getProductById } from "@/lib/firebase/admin-products";
import { getDictionary } from "@/lib/i18n/server";
import { isDiscountActive, effectivePrice } from "@/lib/products/pricing";
import { getTaxonomy } from "@/lib/products/taxonomy-server";
import { labelOf } from "@/lib/products/taxonomy";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { FavoriteButton } from "@/components/product/FavoriteButton";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductReviews } from "@/components/product/ProductReviews";
import { StarRating } from "@/components/product/StarRating";

function formatSom(amount: number): string {
  return `${amount.toLocaleString("uz-UZ")} so'm`;
}

interface ProductPageParams {
  params: Promise<{ id: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://atoyo-uz.netlify.app";

export async function generateMetadata({ params }: ProductPageParams): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return { title: "Mahsulot topilmadi" };

  const title = `${product.name} | Atoyo Santexnika`;
  const description =
    product.description?.slice(0, 160) ||
    `${product.name} — ${effectivePrice(product).toLocaleString("uz-UZ")} so'm. Atoyo Santexnika do'konida.`;
  // Ijtimoiy tarmoqda ulashilganda mahsulot nomi/narxi bilan karta ko'rinadi.
  const ogImage = `${SITE_URL}/api/og/product/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/mahsulot/${id}`,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function ProductPage({ params }: ProductPageParams) {
  const { id } = await params;
  const [product, dict, taxonomy] = await Promise.all([
    getProductById(id),
    getDictionary(),
    getTaxonomy(),
  ]);

  if (!product) notFound();

  // Admin qo'shgan kategoriya/sotish turi lug'atda bo'lmasligi mumkin -
  // bunday holda `metadata/taxonomy` dagi nom ishlatiladi.
  const categoryLabel = labelOf(taxonomy.categories, product.category);
  const unitLabel = labelOf(taxonomy.units, product.unit) || "dona";

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
          <Chip label={(dict.categories as Record<string, string>)[product.category] ?? categoryLabel} size="small" className="!w-fit !bg-aqua-50 !text-aqua-700 dark:!bg-navy-500 dark:!text-aqua-100" />

          <div className="flex items-start justify-between gap-2">
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">{product.name}</h1>
            <FavoriteButton product={product} />
          </div>
          <p className="text-sm text-navy-300">
            {[product.brand, product.manufacturerCountry].filter(Boolean).join(" • ")}
            {product.sku ? ` • Kod: ${product.sku}` : ""}
          </p>

          {(product.ratingCount ?? 0) > 0 && (
            <p className="flex items-center gap-2 text-sm text-navy-300">
              <StarRating value={product.ratingAvg ?? 0} />
              {product.ratingAvg?.toFixed(1)} ({product.ratingCount})
            </p>
          )}

          <div className="flex items-baseline gap-2">
            {hasDiscount && <span className="text-navy-300 line-through">{formatSom(product.price)}</span>}
            <span className="text-2xl font-bold text-navy-900 dark:text-white">
              {formatSom(hasDiscount ? product.discountPrice! : product.price)}
            </span>
            <span className="text-sm text-navy-300">/ {unitLabel}</span>
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
            {dict.product.inStock}: <span className="font-medium text-navy-900 dark:text-white">{product.stock} {unitLabel}</span>
          </p>

          <AddToCartButton product={product} />
        </div>
      </div>

      {(product.videos ?? []).length > 0 && (
        <div className="mt-8 flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-navy-900 dark:text-white">Video</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(product.videos ?? []).map((url) => (
              <video key={url} src={url} controls playsInline preload="metadata" className="w-full rounded-xl2 border border-navy-100 dark:border-navy-500" />
            ))}
          </div>
        </div>
      )}

      <ProductReviews productId={product.id} />
    </section>
  );
}

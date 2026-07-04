import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Chip } from "@mui/material";
import { getProductById } from "@/lib/firebase/admin-products";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { ProductGallery } from "@/components/product/ProductGallery";

const CATEGORY_LABELS: Record<string, string> = {
  pipes: "Quvurlar",
  fittings: "Muftalar",
  faucets: "Kranlar",
  "shower-systems": "Dush tizimlari",
  boilers: "Isitish qozonlari",
  radiators: "Radiatorlar",
  pumps: "Nasoslar",
  "sanitary-ware": "Santexnika buyumlari",
};

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
  const product = await getProductById(id);

  if (!product) notFound();

  const hasDiscount = !!product.discountPrice && product.discountPrice < product.price;

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery
          images={product.images.length > 0 ? product.images : product.thumbnailUrl ? [product.thumbnailUrl] : []}
          alt={product.name}
        />

        <div className="flex flex-col gap-3">
          <Chip label={CATEGORY_LABELS[product.category] ?? product.category} size="small" className="!w-fit !bg-aqua-50 !text-aqua-700 dark:!bg-navy-500 dark:!text-aqua-100" />

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
                <dt className="text-navy-300">Diametri</dt>
                <dd>{product.dimensions.diameterMm} mm</dd>
              </>
            )}
            {product.dimensions.lengthMm !== undefined && (
              <>
                <dt className="text-navy-300">Uzunligi</dt>
                <dd>{product.dimensions.lengthMm} mm</dd>
              </>
            )}
            {product.dimensions.weightKg !== undefined && (
              <>
                <dt className="text-navy-300">Vazni</dt>
                <dd>{product.dimensions.weightKg} kg</dd>
              </>
            )}
          </dl>

          <p className="text-sm text-navy-300">
            Zaxirada: <span className="font-medium text-navy-900 dark:text-white">{product.stock} dona</span>
          </p>

          <AddToCartButton product={product} />
        </div>
      </div>
    </section>
  );
}

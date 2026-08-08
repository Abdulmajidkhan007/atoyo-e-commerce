import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Chip } from "@mui/material";
import { getProductById, getRelatedProducts } from "@/lib/firebase/admin-products";
import { getDictionary } from "@/lib/i18n/server";
import { isDiscountActive, effectivePrice } from "@/lib/products/pricing";
import { getTaxonomy } from "@/lib/products/taxonomy-server";
import { getLocale } from "@/lib/i18n/server";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { getPricingSettings } from "@/lib/products/pricing-settings";
import { toViewerProduct, toViewerProducts } from "@/lib/products/viewer";
import { localizedDescription, localizedName } from "@/lib/products/i18n";
import { labelOf } from "@/lib/products/taxonomy";
import { hasVariants } from "@/lib/products/variants";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { ProductVariantPicker } from "@/components/product/ProductVariantPicker";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { FavoriteButton } from "@/components/product/FavoriteButton";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductReviews } from "@/components/product/ProductReviews";
import { StarRating } from "@/components/product/StarRating";
import { ShareButton } from "@/components/product/ShareButton";
import { JsonLd } from "@/components/seo/JsonLd";
import { productJsonLd } from "@/lib/seo/json-ld";
import { formatSom } from "@/lib/format";

interface ProductPageParams {
  params: Promise<{ id: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://atoyo-uz.web.app";

export async function generateMetadata({ params }: ProductPageParams): Promise<Metadata> {
  const { id } = await params;
  const [product, locale] = await Promise.all([getProductById(id), getLocale()]);
  if (!product) return { title: "Mahsulot topilmadi", robots: { index: false, follow: false } };

  // Tanlangan tildagi nom/tavsif - tarjimasi bo'lmasa o'zbekchasi.
  const name = localizedName(product, locale);
  const title = `${name} | Atoyo Santexnika`;
  const description =
    localizedDescription(product, locale)?.slice(0, 160) ||
    `${name} — ${formatSom(effectivePrice(product))}. Atoyo Santexnika do'konida.`;
  // Ijtimoiy tarmoqda ulashilganda mahsulot nomi/narxi bilan karta ko'rinadi.
  const ogImage = `${SITE_URL}/api/og/product/${id}`;

  return {
    title,
    description,
    // MUHIM: canonical ATAYLAB shu yerda qayta belgilanadi. Root
    // layout'da `alternates.canonical: "/"` turibdi va Next.js uni
    // ichki sahifalarga MEROS qilib beradi - ya'ni har bir mahsulot
    // sahifasi o'zini bosh sahifa deb e'lon qilardi va Google
    // 10 000 mahsulotni "dublikat" deb hisoblardi.
    alternates: { canonical: `/mahsulot/${id}` },
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
  const [raw, dict, taxonomy, locale, viewer, pricing] = await Promise.all([
    getProductById(id),
    getDictionary(),
    getTaxonomy(),
    getLocale(),
    // Optom mijozga optom narx ko'rsatiladi; qolganlarga dona narx.
    getCurrentAppUser().catch(() => null),
    getPricingSettings(),
  ]);

  if (!raw) notFound();

  // MUHIM: hujjat mijozga chiqishdan OLDIN tozalanadi - optom narx,
  // tannarx va yetkazib beruvchi nomi HTML'ga ham, JSON-LD'ga ham
  // tushmasin (ilgari `productJsonLd` optom narxni Google'ga
  // e'lon qilib yuborardi).
  const product = toViewerProduct(raw, viewer?.role, pricing);

  // Nom va tavsif tanlangan tilda (tarjimasi yo'q bo'lsa - o'zbekchasi).
  const name = localizedName(product, locale);
  const description = localizedDescription(product, locale);
  /** Narx allaqachon rolga mos - faqat yaxlitlanadi. */
  const show = (value: number) => Math.round(value);

  // O'xshash mahsulotlar: avval MAXSUS KALIT SO'Z bo'yicha
  // (almashtiriladigan mahsulotlar), keyin shu kategoriyadan.
  const related = toViewerProducts(
    await getRelatedProducts(raw, 8).catch(() => []),
    viewer?.role,
    pricing
  );
  // Mahsulot tugagan bo'lsa - zaxirada bori tepada ko'rsatiladi.
  const outOfStock = (product.stock ?? 0) <= 0;
  const replacements = outOfStock ? related.filter((item) => item.stock > 0).slice(0, 4) : [];

  // Admin qo'shgan kategoriya/sotish turi lug'atda bo'lmasligi mumkin -
  // bunday holda `metadata/taxonomy` dagi nom ishlatiladi.
  const categoryLabel = labelOf(taxonomy.categories, product.category);
  const unitLabel = labelOf(taxonomy.units, product.unit) || "dona";

  // Chegirma muddati o'tgan bo'lsa - oddiy narx ko'rsatiladi.
  const hasDiscount = isDiscountActive(product);

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      {/* Google uchun: narx, mavjudlik, reyting (rich result). */}
      <JsonLd data={productJsonLd(product, categoryLabel)} />

      {/* Tugagan mahsulot - mijoz bo'sh qaytmasin: shu vazifadagi
          mavjud mahsulotlar darrov ko'rsatiladi. */}
      {replacements.length > 0 && (
        <div className="mb-6 rounded-xl2 border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-900/20">
          <p className="mb-3 font-medium text-amber-900 dark:text-amber-100">
            Bu mahsulot hozir tugagan — o&apos;rniga shu vazifadagilar bor:
          </p>
          <RelatedProducts products={replacements} title="" />
        </div>
      )}
      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery
          images={product.images.length > 0 ? product.images : product.thumbnailUrl ? [product.thumbnailUrl] : []}
          alt={name}
        />

        <div className="flex flex-col gap-3">
          <Chip label={(dict.categories as Record<string, string>)[product.category] ?? categoryLabel} size="small" className="!w-fit !bg-aqua-50 !text-aqua-700 dark:!bg-navy-500 dark:!text-aqua-100" />

          <div className="flex items-start justify-between gap-2">
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">{name}</h1>
            <div className="flex shrink-0 items-center">
              <ShareButton title={name} text={`${name} — Atoyo Santexnika`} />
              <FavoriteButton product={product} />
            </div>
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

          {/* Turlari bo'lsa narx tanlangan turga qarab o'zgaradi -
              shuning uchun narx bloki tanlagich ichida chiqadi. */}
          {!hasVariants(product) && (
            <div className="flex items-baseline gap-2">
              {hasDiscount && <span className="text-navy-300 line-through">{formatSom(show(product.price))}</span>}
              <span className="text-2xl font-bold text-navy-900 dark:text-white">
                {formatSom(show(hasDiscount ? product.discountPrice! : product.price))}
              </span>
              <span className="text-sm text-navy-300">/ {unitLabel}</span>
            </div>
          )}

          <p className="text-sm text-navy-500 dark:text-navy-100">{description}</p>

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

          {hasVariants(product) ? (
            <ProductVariantPicker product={product} unitLabel={unitLabel} />
          ) : (
            <>
              <p className="text-sm text-navy-300">
                {dict.product.inStock}: <span className="font-medium text-navy-900 dark:text-white">{product.stock} {unitLabel}</span>
              </p>

              <AddToCartButton product={product} />
            </>
          )}
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

      <RelatedProducts products={related} />
    </section>
  );
}

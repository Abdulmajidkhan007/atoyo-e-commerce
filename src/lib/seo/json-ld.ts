import { effectivePrice, isDiscountActive } from "@/lib/products/pricing";
import { hasVariants, minVariantPrice, totalVariantStock } from "@/lib/products/variants";
import type { Product } from "@/types/product";

/**
 * SCHEMA.ORG (JSON-LD) ma'lumotlari.
 *
 * Google mahsulot sahifasini shu ma'lumot orqali tushunadi: qidiruv
 * natijasida narx, mavjudlik va yulduzli reyting ko'rinadi ("rich
 * result"). Ma'lumot server tomonda chiqadi - client JS kutilmaydi.
 */

export const SITE_NAME = "Atoyo Santexnika";

/**
 * Manzildan shahar nomini ajratadi: "Qo'qon, Navbahor ko'chasi 45p"
 * → "Qo'qon". Vergul bo'lmasa birinchi so'z olinadi ("Toshkent
 * shahri" → "Toshkent").
 */
export function cityFromAddress(address: string | undefined | null): string {
  const value = (address ?? "").trim();
  if (!value) return "";
  const head = (value.split(",")[0] ?? "").trim();
  // "Qo'qon shahri" / "Toshkent shahar" kabi qo'shimchani olib tashlaymiz.
  return head.replace(/\s+(shahri|shahar|sh\.?|город|г\.)$/i, "").trim();
}


export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.atoyo.uz").replace(/\/$/, "");
}

/** Do'kon sxemasi uchun admin sozlamasidan keladigan qism. */
export interface StoreContact {
  phone?: string;
  email?: string;
  address?: string;
  /** Ijtimoiy tarmoq havolalari — Google ularni `sameAs` da kutadi. */
  socialUrls?: string[];
}

/**
 * Do'kon va sayt (bosh sahifa uchun).
 *
 * MANZIL VA TELEFON ADMIN SOZLAMASIDAN keladi va sxemaga QO'SHILADI:
 * Google mahalliy qidiruvda ("santexnika Qo'qon") do'konni aynan shu
 * maydonlar bilan taniydi. Sozlama o'qilmasa sxema baribir chiqadi —
 * shunchaki manzilsiz.
 */
export function organizationJsonLd(contact: StoreContact = {}): object {
  const url = siteUrl();
  const address = (contact.address ?? "").trim();
  const locality = cityFromAddress(address);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Store",
        "@id": `${url}/#store`,
        name: SITE_NAME,
        description:
          "Santexnika va isitish tizimlari do'koni: quvurlar, muftalar, kranlar, dush tizimlari, qozonlar.",
        url,
        image: `${url}/icon.jpg`,
        priceRange: "$$",
        areaServed: "UZ",
        currenciesAccepted: "UZS",
        ...(contact.phone?.trim() ? { telephone: contact.phone.trim() } : {}),
        ...(contact.email?.trim() ? { email: contact.email.trim() } : {}),
        ...(address
          ? {
              address: {
                "@type": "PostalAddress",
                streetAddress: address,
                ...(locality ? { addressLocality: locality } : {}),
                addressCountry: "UZ",
              },
            }
          : {}),
        ...(contact.socialUrls?.length ? { sameAs: contact.socialUrls } : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        url,
        name: SITE_NAME,
        inLanguage: "uz",
        potentialAction: {
          "@type": "SearchAction",
          target: `${url}/katalog?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

/** Mahsulot: narx, mavjudlik, reyting va turlar. */
export function productJsonLd(product: Product, categoryLabel: string): object {
  const url = `${siteUrl()}/mahsulot/${product.id}`;
  const withVariants = hasVariants(product);
  const price = withVariants
    ? (minVariantPrice(product) ?? product.price)
    : effectivePrice(product);
  const stock = withVariants ? totalVariantStock(product) : product.stock;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || `${product.name} — ${SITE_NAME} do'konida.`,
    image: product.images?.length ? product.images : product.thumbnailUrl ? [product.thumbnailUrl] : [],
    sku: product.sku || product.code?.toString() || product.id,
    category: categoryLabel,
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "UZS",
      price,
      availability: stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE_NAME },
      ...(isDiscountActive(product) && product.discountUntil
        ? { priceValidUntil: new Date(product.discountUntil).toISOString().slice(0, 10) }
        : {}),
    },
    ...((product.ratingCount ?? 0) > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number((product.ratingAvg ?? 0).toFixed(1)),
            reviewCount: product.ratingCount,
          },
        }
      : {}),
  };
}

/** Blog maqolasi. */
export function articleJsonLd(input: {
  title: string;
  excerpt: string;
  slug: string;
  coverImageUrl?: string;
  createdAt: number;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.excerpt,
    image: input.coverImageUrl ? [input.coverImageUrl] : [],
    datePublished: new Date(input.createdAt).toISOString(),
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
    mainEntityOfPage: `${siteUrl()}/blog/${input.slug}`,
  };
}

/**
 * "QAYERDAMAN" ZANJIRI (BreadcrumbList).
 *
 * Ekranda ko'ringan zanjir Google uchun ham ma'noga ega: qidiruv
 * natijasida uzun URL o'rniga "Atoyo › Katalog › Smesitel" ko'rinadi.
 * Shuning uchun `Breadcrumbs` komponenti shu sxemani ham chizadi -
 * ikkalasi bitta ro'yxatdan.
 */
export function breadcrumbJsonLd(items: { name: string; href?: string }[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      // Oxirgi bo'g'in (joriy sahifa) havolasiz bo'ladi.
      ...(item.href ? { item: `${siteUrl()}${item.href}` } : {}),
    })),
  };
}

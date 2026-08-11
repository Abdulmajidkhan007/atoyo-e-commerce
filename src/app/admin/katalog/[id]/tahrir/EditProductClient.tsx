"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import type { Product } from "@/types/product";

/**
 * QAYERDAN KELGAN BO'LSA - O'SHA YERGA QAYTADI.
 *
 * Tahrir sahifasi katalogdan ham, "Katalogni tartibga solish" dan ham
 * ochiladi. Ilgari saqlagandan keyin doim `/admin/katalog` ga o'tardi:
 * tartiblashda ishlayotgan xodim har bir nomni to'g'rilagandan keyin
 * filtrni, qidiruvni va sahifani qaytadan tiklashga majbur bo'lardi.
 * Endi havola `?qayt=` bilan keladi va shu manzilga qaytariladi.
 *
 * Manzil TASHQI bo'lmasligi tekshiriladi (`/admin/` bilan boshlanishi
 * shart) - aks holda begona havola bilan admin boshqa saytga
 * yo'naltirilishi mumkin edi.
 */
function safeReturn(raw: string | null): string {
  if (!raw) return "/admin/katalog";
  // "//evil.com" ham brauzer uchun tashqi manzil - shuning uchun
  // faqat bitta "/" bilan boshlanadigan admin yo'llari qabul qilinadi.
  if (!raw.startsWith("/admin/") || raw.startsWith("//")) return "/admin/katalog";
  return raw;
}

export function EditProductClient({ product }: { product: Product }) {
  const router = useRouter();
  const back = safeReturn(useSearchParams().get("qayt"));

  return (
    <ProductForm
      product={product}
      onCancel={() => router.push(back)}
      onSaved={() => {
        router.push(back);
        router.refresh();
      }}
    />
  );
}

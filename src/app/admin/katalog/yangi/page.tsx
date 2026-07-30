"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";

/**
 * Yangi mahsulot YARATISH sahifasi (modal emas). Kirim sahifasidagi
 * qidiruvda topilmagan mahsulot uchun ?nom= parametri bilan ochiladi -
 * nom maydoni oldindan to'ldirilgan bo'ladi.
 *
 * `?chernovik=1` bo'lsa - "Yangi mahsulot ochish" rejimi: mahsulot faqat
 * ta'riflanadi (rasm, nom, narx, kategoriya, material, sotish turi,
 * brend, ishlab chiqaruvchi). U katalogga chiqmaydi va kanalga e'lon
 * qilinmaydi - kirim sahifasida turadi, zaxira kelganda nashr bo'ladi.
 */
function CreateProductContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialName = searchParams.get("nom") ?? "";
  const isDraft = searchParams.get("chernovik") === "1";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">
        {isDraft ? "Yangi mahsulot ochish" : "Yangi mahsulot yaratish"}
      </h1>
      <p className="mb-6 text-sm text-navy-300">
        {isDraft
          ? "Mahsulot ta'rifi ochiladi: rasm/video, nomi, narxi, kategoriyasi, materiali, sotish turi, brendi. Zaxira kirim orqali kiritiladi — shundan keyin mahsulot katalogga chiqadi va kanalga e'lon qilinadi."
          : "Mahsulot darhol katalogga chiqadi va kanalga e'lon qilinadi."}
      </p>
      <div className="rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
        <ProductForm
          initialName={initialName}
          draft={isDraft}
          onCancel={() => router.back()}
          onSaved={(product) =>
            router.push(
              isDraft
                ? `/admin/katalog/kirim?chernovik=${product.id}`
                : "/admin/katalog/kirim?yaratildi=1"
            )
          }
        />
      </div>
    </div>
  );
}

export default function CreateProductPage() {
  return (
    <Suspense fallback={null}>
      <CreateProductContent />
    </Suspense>
  );
}

"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";

/**
 * Yangi mahsulot YARATISH sahifasi (modal emas). Kirim sahifasidagi
 * qidiruvda topilmagan mahsulot uchun ?nom= parametri bilan ochiladi -
 * nom maydoni oldindan to'ldirilgan bo'ladi.
 */
function CreateProductContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialName = searchParams.get("nom") ?? "";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-navy-900 dark:text-white">Yangi mahsulot yaratish</h1>
      <div className="rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
        <ProductForm
          initialName={initialName}
          onCancel={() => router.back()}
          onSaved={() => router.push("/admin/katalog/kirim?yaratildi=1")}
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

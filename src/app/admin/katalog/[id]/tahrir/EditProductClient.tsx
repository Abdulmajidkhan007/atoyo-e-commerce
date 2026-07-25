"use client";

import { useRouter } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import type { Product } from "@/types/product";

export function EditProductClient({ product }: { product: Product }) {
  const router = useRouter();

  return (
    <ProductForm
      product={product}
      onCancel={() => router.push("/admin/katalog")}
      onSaved={() => {
        router.push("/admin/katalog");
        router.refresh();
      }}
    />
  );
}

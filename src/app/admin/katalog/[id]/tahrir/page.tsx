import { notFound } from "next/navigation";
import { getProductById } from "@/lib/firebase/admin-products";
import { EditProductClient } from "./EditProductClient";

export const dynamic = "force-dynamic";

/**
 * Mahsulotni tahrirlash - ALOHIDA SAHIFA (modal emas). Mahsulot serverda
 * o'qiladi, forma esa client komponentda (ProductForm bilan bir xil mantiq).
 */
export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-navy-900 dark:text-white">Mahsulotni tahrirlash</h1>
      <p className="mb-6 text-sm text-navy-300">{product.name}</p>
      <div className="rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
        <EditProductClient product={product} />
      </div>
    </div>
  );
}

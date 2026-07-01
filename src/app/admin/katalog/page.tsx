import { ProductTable } from "@/components/admin/ProductTable";

export default function AdminCatalogPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900 dark:text-white">Katalog boshqaruvi</h1>
      <ProductTable />
    </div>
  );
}

import Image from "next/image";
import { getDashboardStats, getTopSellingProducts } from "@/lib/firebase/admin-analytics";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { isOwner } from "@/lib/permissions";
import { ResetDemoData } from "@/components/admin/ResetDemoData";
import { formatNumber, formatSom } from "@/lib/format";

export default async function AdminDashboardPage() {
  const [stats, topProducts, viewer] = await Promise.all([
    getDashboardStats(),
    getTopSellingProducts(5),
    getCurrentAppUser(),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900 dark:text-white">Dashboard</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
          <p className="text-sm text-navy-300">Jami buyurtmalar</p>
          <p className="mt-1 text-3xl font-bold text-navy-900 dark:text-white">{formatNumber(stats.totalOrders)}</p>
        </div>
        <div className="rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
          <p className="text-sm text-navy-300">Jami tushum</p>
          <p className="mt-1 text-3xl font-bold text-navy-900 dark:text-white">{formatSom(stats.totalRevenue)}</p>
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-navy-900 dark:text-white">Eng ko&apos;p sotilgan mahsulotlar</h2>

      {topProducts.length === 0 ? (
        <p className="text-sm text-navy-300">Hozircha sotuvlar mavjud emas.</p>
      ) : (
        <div className="overflow-hidden rounded-xl2 border border-navy-100 dark:border-navy-500">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-50 text-navy-300 dark:bg-navy-900">
              <tr>
                <th className="px-4 py-2 font-medium">Mahsulot</th>
                <th className="px-4 py-2 font-medium">Brend</th>
                <th className="px-4 py-2 font-medium">Sotilgan</th>
                <th className="px-4 py-2 font-medium">Zaxira</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-navy-700">
              {topProducts.map((product) => (
                <tr key={product.id} className="border-t border-navy-100 dark:border-navy-500">
                  <td className="flex items-center gap-2 px-4 py-2">
                    {product.thumbnailUrl && (
                      <span className="relative block h-8 w-8 shrink-0 overflow-hidden rounded-md bg-navy-50 dark:bg-navy-900">
                        <Image src={product.thumbnailUrl} alt={product.name} fill sizes="32px" className="object-cover" />
                      </span>
                    )}
                    <span className="line-clamp-1 text-navy-900 dark:text-white">{product.name}</span>
                  </td>
                  <td className="px-4 py-2 text-navy-300">{product.brand}</td>
                  <td className="px-4 py-2 font-medium text-navy-900 dark:text-white">{product.salesCount}</td>
                  <td className="px-4 py-2 text-navy-300">{product.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sinov ma'lumotlarini tozalash - faqat loyiha egasiga ko'rinadi. */}
      {isOwner(viewer) && <ResetDemoData />}
    </div>
  );
}

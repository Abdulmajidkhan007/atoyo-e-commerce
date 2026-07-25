import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { hasPermission } from "@/lib/permissions";
import { getAdminDb } from "@/lib/firebase/admin";
import type { StockIntake } from "@/types/intake";

export const dynamic = "force-dynamic";

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** KIRIM TARIXI: kim, qachon, qaysi mahsulotdan qancha kiritgan. */
export default async function IntakeHistoryPage() {
  const user = await getCurrentAppUser();
  if (!hasPermission(user, "products")) redirect("/admin");

  let intakes: StockIntake[] = [];
  try {
    const snap = await getAdminDb()
      .collection("stockIntakes")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    intakes = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as StockIntake);
  } catch {
    // Indeks/ruxsat muammosi bo'lsa - saralashsiz olamiz.
    const snap = await getAdminDb().collection("stockIntakes").limit(100).get();
    intakes = snap.docs
      .map((d) => ({ ...d.data(), id: d.id }) as StockIntake)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Kirim tarixi</h1>
        <Link href="/admin/katalog/kirim" className="text-sm text-aqua-600 hover:underline">
          ← Yangi kirim
        </Link>
      </div>

      {intakes.length === 0 ? (
        <p className="text-navy-300">Hozircha kirimlar yo&apos;q.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {intakes.map((intake) => (
            <div
              key={intake.id}
              className="rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-800"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-navy-900 dark:text-white">
                  {formatDateTime(intake.createdAt)}
                </span>
                <span className="text-navy-300">
                  {intake.adminEmail ?? intake.adminUid} · jami {intake.totalQty} dona
                </span>
              </div>
              <ul className="flex flex-col gap-1 text-sm text-navy-500 dark:text-navy-100">
                {intake.items.map((item) => (
                  <li key={item.productId} className="flex flex-wrap gap-x-2">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-green-600">+{item.qty}</span>
                    <span className="text-navy-300">
                      ({item.stockBefore} → {item.stockBefore + item.qty})
                    </span>
                    {item.price !== null && (
                      <span className="text-navy-300">yangi narx: {item.price.toLocaleString("uz-UZ")} so&apos;m</span>
                    )}
                    {item.supplier && <span className="text-navy-300">· {item.supplier}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

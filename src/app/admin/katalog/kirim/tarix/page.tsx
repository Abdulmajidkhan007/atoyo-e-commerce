import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { hasPermission } from "@/lib/permissions";
import { getRecentIntakes } from "@/lib/products/intake-history";
import { IntakeHistoryList } from "@/components/admin/IntakeHistoryList";

export const dynamic = "force-dynamic";

/** KIRIM TARIXI: kim, qachon, qayerdan va qaysi mahsulotdan qancha kiritgan. */
export default async function IntakeHistoryPage() {
  const user = await getCurrentAppUser();
  if (!hasPermission(user, "products")) redirect("/admin");

  const intakes = await getRecentIntakes(100);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Kirim tarixi</h1>
          <p className="mt-1 text-sm text-navy-300">
            Har bir kirim: qachon, qayerdan (admin panel yoki Telegram), kim kiritgani va nima
            kelgani.
          </p>
        </div>
        <Link href="/admin/katalog/kirim" className="text-sm text-aqua-600 hover:underline">
          ← Yangi kirim
        </Link>
      </div>

      <IntakeHistoryList intakes={intakes} />
    </div>
  );
}

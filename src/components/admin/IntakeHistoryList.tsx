import Link from "next/link";
import type { StockIntake } from "@/types/intake";

/**
 * KIRIM RO'YXATI - kim, qachon, qayerdan (admin panel yoki Telegram)
 * va nima kiritgani. Kirim sahifasida oxirgi bir nechtasi, tarix
 * sahifasida to'liq ro'yxat sifatida ishlatiladi.
 */

/** Sana/vaqt - `toLocaleString` locale'ga bog'liq bo'lmasin uchun qo'lda. */
function formatDateTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function sourceOf(intake: StockIntake): { label: string; className: string } {
  // Eski yozuvlarda `source` yo'q - Telegram kirimlari `tg:` bilan boshlanadi.
  const isTelegram = intake.source === "telegram" || intake.adminUid?.startsWith("tg:");
  return isTelegram
    ? { label: "✈️ Telegram", className: "bg-sky-100 text-sky-800 dark:bg-navy-500 dark:text-white" }
    : { label: "🖥 Admin panel", className: "bg-aqua-100 text-aqua-700 dark:bg-aqua-600 dark:text-white" };
}

function personOf(intake: StockIntake): string {
  return intake.adminName?.trim() || intake.adminEmail?.trim() || intake.adminUid || "—";
}

export function IntakeHistoryList({ intakes }: { intakes: StockIntake[] }) {
  if (intakes.length === 0) {
    return <p className="text-sm text-navy-300">Hozircha kirimlar yo&apos;q.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {intakes.map((intake) => {
        const source = sourceOf(intake);

        return (
          <li
            key={intake.id}
            className="rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-700"
          >
            {/* Sarlavha: qachon · qayerdan · kim */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${source.className}`}>
                {source.label}
              </span>
              <span className="font-medium text-navy-900 dark:text-white">
                {formatDateTime(intake.createdAt)}
              </span>
              <span className="text-navy-300">·</span>
              <span className="text-navy-500 dark:text-navy-100">{personOf(intake)}</span>
              {intake.kind === "new" && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-100">
                  yangi mahsulot
                </span>
              )}
            </div>

            {/* Qatorlar */}
            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
              {intake.items.map((item) => (
                <li
                  key={item.productId}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-t border-navy-50 pt-1.5 first:border-0 first:pt-0 dark:border-navy-600"
                >
                  <Link
                    href={`/admin/katalog?q=${encodeURIComponent(item.name)}`}
                    className="font-medium text-navy-900 hover:underline dark:text-white"
                  >
                    {item.name}
                  </Link>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    +{item.qty} {item.unit ?? ""}
                  </span>
                  <span className="text-navy-300">
                    ({item.stockBefore} → {item.stockBefore + item.qty})
                  </span>
                  {item.price !== null && (
                    <span className="text-navy-500 dark:text-navy-100">
                      narx: {item.price.toLocaleString("uz-UZ")} so&apos;m
                    </span>
                  )}
                  {item.supplier && (
                    <span className="text-navy-500 dark:text-navy-100">🚚 {item.supplier}</span>
                  )}
                </li>
              ))}
            </ul>

            <p className="mt-2 text-xs text-navy-300">Jami: {intake.totalQty}</p>
          </li>
        );
      })}
    </ul>
  );
}

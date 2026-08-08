import Link from "next/link";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";

/**
 * "QAYERDAMAN" ZANJIRI.
 *
 * Bo'limlar ichiga kirib ketgach qayerda ekanini bilish qiyin edi -
 * ayniqsa DESKTOP ILOVASIDA va TELEFONDA, u yerda brauzerning manzil
 * paneli ham, orqaga tugmasi ham ko'rinmaydi. Zanjir har bosqichni
 * ko'rsatadi va istalganiga bir bosishda qaytaradi.
 *
 * Bir vaqtning o'zida Google uchun `BreadcrumbList` sxemasi ham
 * chiziladi (qidiruv natijasida uzun URL o'rniga shu zanjir chiqadi).
 *
 * Server komponenti - qo'shimcha JS yubormaydi.
 */

export interface Crumb {
  name: string;
  /** Havola. Berilmasa - joriy sahifa (oxirgi bo'g'in). */
  href?: string;
}

export function Breadcrumbs({
  items,
  className = "",
}: {
  /** "Bosh sahifa" AVTOMATIK qo'shiladi - uni yozish shart emas. */
  items: Crumb[];
  className?: string;
}) {
  const trail: Crumb[] = [{ name: "Bosh sahifa", href: "/" }, ...items];
  if (trail.length < 2) return null;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(trail)} />
      <nav
        aria-label="Qayerdaman"
        className={`mb-3 flex flex-wrap items-center gap-x-0.5 gap-y-1 text-xs text-navy-300 ${className}`}
      >
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1;
          return (
            <span key={`${crumb.name}-${index}`} className="flex items-center gap-x-0.5">
              {index > 0 && (
                <ChevronRightIcon aria-hidden className="!h-4 !w-4 shrink-0 opacity-60" />
              )}
              {crumb.href && !last ? (
                <Link
                  href={crumb.href}
                  className="rounded px-0.5 py-0.5 transition hover:text-aqua-600 dark:hover:text-aqua-300"
                >
                  {crumb.name}
                </Link>
              ) : (
                // Joriy sahifa - havola emas, lekin ko'rinishi aniqroq.
                <span
                  aria-current={last ? "page" : undefined}
                  className="max-w-[16rem] truncate px-0.5 py-0.5 font-medium text-navy-500 dark:text-navy-100"
                >
                  {crumb.name}
                </span>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
}

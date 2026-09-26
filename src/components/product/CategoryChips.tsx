"use client";

import { usePathname } from "next/navigation";
import { Link } from "@/lib/i18n/LocaleLink";
import { useAppDispatch } from "@/redux/hooks";
import { setFilters } from "@/redux/slices/filterSlice";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { localeHref, stripLocalePrefix } from "@/lib/i18n/href";
import type { ProductCategory } from "@/types/product";

export interface ChipCategory {
  slug: string;
  label: string;
}

/**
 * KATEGORIYA CHIPLARI — qidiruv ostidagi surilib boradigan qator.
 *
 * Nega: kategoriyaga o'tish uchun ilgari katalogga kirib, filtr
 * oynasini ochib, ro'yxatdan tanlash kerak edi (3 bosish). evde.uz
 * kabi bitta qator — bitta bosish.
 *
 * Header ICHIGA qo'yilmagan: header yopishqoq (sticky) va telefonda
 * allaqachon ikki qator (logo + qidiruv). Uchinchi qator ekranning
 * beshdan birini doim egallab turardi. Shuning uchun chiplar sahifa
 * boshida turadi va skroll bilan ketadi.
 *
 * Havola `?category=` bilan: ulashsa, Google ko'rsa, orqaga qaytsa
 * ham to'g'ri kategoriya ochiladi. Katalog sahifasining ICHIDA esa
 * server so'rovisiz almashadi (`history.pushState` — Next.js uni
 * `useSearchParams` bilan sinxronlaydi), ro'yxatni `ProductGrid`
 * o'zi yangilaydi.
 *
 * Ro'yxatdagi kategoriyalar — faqat MAHSULOTI BORLARI
 * (`loadChipCategories`): bo'sh kategoriyani bosgan mijoz "hech narsa
 * topilmadi" ko'rib ketib qoladi.
 */
export function CategoryChips({
  categories,
  active,
  className = "",
}: {
  categories: ChipCategory[];
  /** Tanlangan kategoriya (katalogda). Bosh sahifada `null`. */
  active: string | null;
  className?: string;
}) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const { dict, locale } = useI18n();
  const onCatalog = stripLocalePrefix(pathname).path.startsWith("/katalog");

  if (categories.length === 0) return null;

  const labelOf = (item: ChipCategory) =>
    (dict.categories as Record<string, string>)[item.slug] ?? item.label;

  const items: { key: string; label: string; href: string; slug: string | undefined }[] = [
    { key: "__all", label: dict.filters.all, href: "/katalog", slug: undefined },
    ...categories.map((item) => ({
      key: item.slug,
      label: labelOf(item),
      href: `/katalog?category=${encodeURIComponent(item.slug)}`,
      slug: item.slug,
    })),
  ];

  return (
    <nav aria-label={dict.product.categoriesNav} className={className}>
      {/* `-mx-4 px-4`: qator ekran chetigacha suriladi, lekin birinchi
          chip sahifa chizig'ida turadi. Skroll paneli yashirin. */}
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const isActive = onCatalog && (item.slug ?? null) === (active ?? null);
          return (
            <li key={item.key} className="shrink-0">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={(event) => {
                  dispatch(setFilters({ category: item.slug as ProductCategory | undefined }));
                  if (onCatalog) {
                    // Katalog ichida: server so'rovisiz, faqat manzil
                    // almashadi. Ro'yxatni ProductGrid yangilaydi.
                    event.preventDefault();
                    window.history.pushState(null, "", localeHref(item.href, locale));
                  }
                }}
                className={`block whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-navy-900 text-white dark:bg-aqua-500 dark:text-navy-900"
                    : "glass text-navy-700 hover:text-aqua-700 dark:text-navy-50 dark:hover:text-aqua-300"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

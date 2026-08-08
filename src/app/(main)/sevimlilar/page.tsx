"use client";

import Image from "next/image";
import Link from "next/link";
import { Button, IconButton } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { removeFavorite } from "@/redux/slices/favoritesSlice";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { formatSom } from "@/lib/format";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

/** Sevimli mahsulotlar ro'yxati (localStorage'da saqlanadi). */
export default function FavoritesPage() {
  const { dict } = useI18n();
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.favorites.items);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <Breadcrumbs items={[{ name: dict.favorites.title }]} />
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold text-navy-900 dark:text-white">
        <FavoriteBorderIcon className="text-red-500" /> {dict.favorites.title}
      </h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-navy-300">{dict.favorites.empty}</p>
          <Button component={Link} href="/katalog" variant="contained">
            {dict.cart.goToCatalog}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-3 rounded-xl2 border border-navy-100 bg-white p-3 dark:border-navy-500 dark:bg-navy-700"
            >
              <Link
                href={`/mahsulot/${item.productId}`}
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-navy-50 dark:bg-navy-900"
              >
                {item.thumbnailUrl && (
                  <Image src={item.thumbnailUrl} alt={item.name} fill sizes="64px" className="object-cover" />
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/mahsulot/${item.productId}`}
                  className="line-clamp-1 font-medium text-navy-900 hover:text-aqua-600 dark:text-white"
                >
                  {item.name}
                </Link>
                <p className="text-sm text-navy-300">{formatSom(item.price)}</p>
              </div>

              <IconButton
                size="small"
                aria-label="O'chirish"
                onClick={() => dispatch(removeFavorite({ productId: item.productId }))}
              >
                <DeleteOutlineIcon fontSize="small" className="text-red-400" />
              </IconButton>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

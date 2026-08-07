/**
 * MAHSULOT KARTOCHKASINING "SKELETI".
 *
 * Yuklanayotganda aylanuvchi spinner o'rniga kartochkaning O'ZI
 * shakli ko'rsatiladi: rasm maydoni, kategoriya yorlig'i, ikki qator
 * nom, meta va narx qatori. Shu sababli ro'yxat kelganda sahifa
 * "sakramaydi" (layout shift bo'lmaydi) va kutish qisqaroq tuyuladi.
 *
 * O'lchamlar `ProductCard` bilan bir xil bo'lishi SHART - biror
 * joyi o'zgarsa shu ham o'zgartiriladi.
 */
export function ProductCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex animate-pulse flex-col overflow-hidden rounded-xl2 border border-navy-100 bg-white dark:border-navy-500 dark:bg-navy-700"
    >
      {/* Rasm - kartochkadagi kabi kvadrat */}
      <div className="aspect-square w-full bg-navy-50 dark:bg-navy-900" />

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {/* Kategoriya yorlig'i */}
        <div className="h-5 w-20 rounded-full bg-navy-50 dark:bg-navy-600" />

        {/* Nom - ikki qator */}
        <div className="mt-0.5 h-3.5 w-full rounded bg-navy-50 dark:bg-navy-600" />
        <div className="h-3.5 w-3/5 rounded bg-navy-50 dark:bg-navy-600" />

        {/* Brend / davlat */}
        <div className="h-3 w-2/5 rounded bg-navy-50 dark:bg-navy-600" />

        {/* Narx va tugma */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="h-4 w-24 rounded bg-navy-50 dark:bg-navy-600" />
          <div className="h-7 w-9 rounded-lg bg-navy-50 dark:bg-navy-600" />
        </div>
      </div>
    </div>
  );
}

/** Bir nechta skelet - ro'yxat panjarasi ichida ishlatiladi. */
export function ProductCardSkeletons({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </>
  );
}

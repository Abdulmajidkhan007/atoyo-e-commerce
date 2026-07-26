import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { logAction } from "@/lib/telegram/action-log";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH_SIZE = 400; // Firestore batch limiti 500 - xavfsiz margin bilan.
// Bitta HTTP so'rovda qayta ishlanadigan maksimal hujjatlar soni. 10,000+
// mahsulotli katalogda BUTUN kolleksiyani bitta sinxron so'rovda
// yangilash serverless funksiya vaqt chegarasidan chiqib ketishi mumkin -
// production'da bu operatsiya sahifalab bir nechta so'rovda yoki fon
// vazifasi (background job/Cloud Task) sifatida bajarilishi tavsiya
// etiladi. Bu yerda bitta chaqiruv doirasida xavfsiz cheklov qo'yilgan.
const MAX_DOCS_PER_REQUEST = 4000;

const bodySchema = z.object({
  /**
   * Qaysi belgi bo'yicha tanlanadi: kategoriya, brend yoki yetkazib
   * beruvchi ("kimdan kelgan"). Bittasi tanlanadi - shunda Firestore'ga
   * qo'shimcha kompozit indeks kerak bo'lmaydi.
   */
  filterBy: z.enum(["all", "category", "brand", "supplier"]).default("all"),
  filterValue: z.string().max(120).optional(),
  percentageChange: z.number().min(-90).max(500),
  /** true bo'lsa - hech narsa yozilmaydi, faqat nechta mahsulot tegishi qaytadi. */
  dryRun: z.boolean().default(false),
});

const FIELD_BY_FILTER = { category: "category", brand: "brand", supplier: "supplier" } as const;

export async function POST(request: Request) {
  const admin = await requirePermission("products");
  if (!admin) {
    return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "So'rov ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const { filterBy, filterValue, percentageChange, dryRun } = parsed.data;
  if (filterBy !== "all" && !filterValue?.trim()) {
    return NextResponse.json({ error: "Filtr qiymati tanlanmagan." }, { status: 400 });
  }

  const multiplier = 1 + percentageChange / 100;
  const db = getAdminDb();

  let baseQuery: FirebaseFirestore.Query = db.collection("products");
  if (filterBy !== "all") {
    baseQuery = baseQuery.where(FIELD_BY_FILTER[filterBy], "==", filterValue!.trim());
  }
  const query = baseQuery.orderBy("__name__").limit(BATCH_SIZE);

  // Oldindan ko'rish: faqat nechta mahsulotga tegishini sanaymiz.
  if (dryRun) {
    const count = await baseQuery.count().get();
    return NextResponse.json({ matchedCount: count.data().count });
  }

  let updatedCount = 0;
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  while (updatedCount < MAX_DOCS_PER_REQUEST) {
    const pagedQuery: FirebaseFirestore.Query = lastDoc ? query.startAfter(lastDoc) : query;
    const snapshot: FirebaseFirestore.QuerySnapshot = await pagedQuery.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    for (const docSnapshot of snapshot.docs) {
      const currentPrice = docSnapshot.data().price as number;
      const newPrice = Math.max(0, Math.round(currentPrice * multiplier));
      batch.update(docSnapshot.ref, { price: newPrice, updatedAt: Date.now() });
    }
    await batch.commit();

    updatedCount += snapshot.docs.length;
    lastDoc = snapshot.docs.at(-1) ?? null;

    if (snapshot.docs.length < BATCH_SIZE) break;
  }

  if (updatedCount > 0) {
    const scope = filterBy === "all" ? "butun katalog" : `${filterBy}=${filterValue}`;
    await logAction(
      `💲 Bulk narx (${admin.email ?? "admin"}): ${scope} → ${percentageChange > 0 ? "+" : ""}${percentageChange}%, ${updatedCount} ta mahsulot`
    );
  }

  return NextResponse.json({ updatedCount });
}

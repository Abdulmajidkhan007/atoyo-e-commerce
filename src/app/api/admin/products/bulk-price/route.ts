import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdminUser } from "@/lib/firebase/session";

const BATCH_SIZE = 400; // Firestore batch limiti 500 - xavfsiz margin bilan.
// Bitta HTTP so'rovda qayta ishlanadigan maksimal hujjatlar soni. 10,000+
// mahsulotli katalogda BUTUN kolleksiyani bitta sinxron so'rovda
// yangilash serverless funksiya vaqt chegarasidan chiqib ketishi mumkin -
// production'da bu operatsiya sahifalab bir nechta so'rovda yoki fon
// vazifasi (background job/Cloud Task) sifatida bajarilishi tavsiya
// etiladi. Bu yerda bitta chaqiruv doirasida xavfsiz cheklov qo'yilgan.
const MAX_DOCS_PER_REQUEST = 4000;

const bodySchema = z.object({
  category: z.string().optional(),
  percentageChange: z.number().min(-90).max(500),
});

export async function POST(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "So'rov ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const { category, percentageChange } = parsed.data;
  const multiplier = 1 + percentageChange / 100;

  let query = getAdminDb().collection("products").orderBy("__name__").limit(BATCH_SIZE) as FirebaseFirestore.Query;
  if (category) {
    query = getAdminDb()
      .collection("products")
      .where("category", "==", category)
      .orderBy("__name__")
      .limit(BATCH_SIZE);
  }

  let updatedCount = 0;
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  while (updatedCount < MAX_DOCS_PER_REQUEST) {
    const pagedQuery: FirebaseFirestore.Query = lastDoc ? query.startAfter(lastDoc) : query;
    const snapshot: FirebaseFirestore.QuerySnapshot = await pagedQuery.get();
    if (snapshot.empty) break;

    const batch = getAdminDb().batch();
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

  return NextResponse.json({ updatedCount });
}

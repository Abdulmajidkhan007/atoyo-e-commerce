import { reportError } from "@/lib/ops/report-error";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { csvHeaderLine, productsToCsvRows } from "@/lib/products/csv";
import type { Product } from "@/types/product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Next.js'ning umumiy chegarasi. Haqiqiy chegara — App Hosting (Cloud
// Run) va atoyo.uz dagi Hosting rewrite'ning so'rov vaqti (~60 s);
// 10 000 mahsulot 500 tadan ~20 so'rov, odatda bir necha soniya.
export const maxDuration = 300;

const PAGE = 500;

/** Butun katalogni CSV fayl sifatida yuklab olish (Excel'da ochiladi). */
export async function GET() {
  const admin = await requirePermission("products");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const db = getAdminDb();
  const date = new Date().toISOString().slice(0, 10);
  const encoder = new TextEncoder();
  let cursor: QueryDocumentSnapshot | undefined;
  let started = false;

  // Katalog kursor bilan 500 tadan o'qiladi va har sahifa oqimga yoziladi -
  // butun CSV xotirada yig'ilmaydi.
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (!started) {
          started = true;
          controller.enqueue(encoder.encode(csvHeaderLine()));
        }
        let query = db.collection("products").orderBy("__name__").limit(PAGE);
        if (cursor) query = query.startAfter(cursor);
        const snap = await query.get();
        if (snap.empty) {
          controller.close();
          return;
        }
        const products = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Product);
        const rows = productsToCsvRows(products);
        if (rows.length > 0) controller.enqueue(encoder.encode(`${rows.join("\n")}\n`));
        cursor = snap.docs[snap.docs.length - 1];
        if (snap.size < PAGE) controller.close();
      } catch (error) {
        // Javob (200) allaqachon ketgan — admin yarim fayl oladi.
        // Jim qolmasin: "Actions" ga yoziladi.
        await reportError("CSV eksport", error);
        controller.error(error);
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="atoyo-katalog-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

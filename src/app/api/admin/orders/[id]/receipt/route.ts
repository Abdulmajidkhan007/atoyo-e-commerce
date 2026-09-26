import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { readPrivateFile } from "@/lib/firebase/admin-storage";
import type { Order } from "@/types/order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * CHEKNI KO'RISH (admin). Fayl Storage'da ochiq havolasiz turadi —
 * shu route uni Admin SDK bilan o'qib, to'g'ridan-to'g'ri qaytaradi.
 * Keshlanmaydi, brauzerda "yuklab olish" emas, ko'rsatish (`inline`).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("orders", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const { id } = await params;
  const snap = await getAdminDb().collection("orders").doc(id).get();
  const receipt = snap.exists ? (snap.data() as Order).receipt : null;
  // Yo'l FAQAT bazadan olinadi va `receipts/<id>/` bilan boshlanishi shart.
  if (!receipt?.path || !receipt.path.startsWith(`receipts/${id}/`)) {
    return NextResponse.json({ error: "Chek yuklanmagan." }, { status: 404 });
  }

  try {
    const buffer = await readPrivateFile(receipt.path);
    const ext = receipt.path.split(".").pop() ?? "bin";
    const isPdf = receipt.contentType === "application/pdf";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": receipt.contentType,
        // Rasm - brauzerda ko'rinadi; PDF - yuklab olinadi (brauzerning
        // PDF ko'ruvchisi saytimiz manzilida ochilmasin).
        "Content-Disposition": `${isPdf ? "attachment" : "inline"}; filename="chek-${id.slice(0, 8)}.${ext}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        // Fayl mijozdan keladi: sahifa sifatida ochilsa ham hech narsa
        // bajarilmasin va hech qayerga so'rov ketmasin.
        "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
      },
    });
  } catch (error) {
    console.error("Chekni o'qib bo'lmadi:", error);
    return NextResponse.json({ error: "Chek faylini o'qib bo'lmadi." }, { status: 500 });
  }
}

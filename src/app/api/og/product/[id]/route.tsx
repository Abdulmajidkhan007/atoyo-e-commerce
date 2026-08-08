import { ImageResponse } from "next/og";
import { getProductById } from "@/lib/firebase/admin-products";
import { getPricingSettings } from "@/lib/products/pricing-settings";
import { toViewerProduct } from "@/lib/products/viewer";
import { effectivePrice } from "@/lib/products/pricing";
import { formatSom } from "@/lib/format";

export const runtime = "nodejs";

/**
 * Mahsulot uchun ijtimoiy tarmoq (OG) rasmi - havola ulashilganda
 * mahsulot nomi va narxi bilan brendlangan karta ko'rinadi.
 * Emoji renderlanmaydi, shuning uchun faqat matn ishlatiladi.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await getProductById(id);
  // OG rasmi ijtimoiy tarmoqlarda HAMMAGA ko'rinadi - unda
  // faqat DONA narx bo'lishi kerak (rol yo'q = dona narx).
  const pricing = await getPricingSettings();
  const product = raw ? toViewerProduct(raw, undefined, pricing) : null;
  const name = product?.name ?? "Atoyo Santexnika";
  const price = product ? formatSom(effectivePrice(product)) : "";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #04202F 0%, #0B3B54 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: "64px",
        }}
      >
        <div style={{ display: "flex", fontSize: "32px", color: "#C49A6C", fontWeight: 700 }}>
          Atoyo Santexnika
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: "56px", fontWeight: 800, lineHeight: 1.15, maxWidth: "1000px" }}>
            {name.slice(0, 90)}
          </div>
          {price && (
            <div style={{ display: "flex", marginTop: "24px", fontSize: "44px", fontWeight: 800, color: "#C49A6C" }}>
              {price}
            </div>
          )}
        </div>

        <div style={{ display: "flex", fontSize: "26px", color: "#8EA0B5" }}>
          Quvurlar • Kranlar • Radiatorlar • Isitish qozonlari
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

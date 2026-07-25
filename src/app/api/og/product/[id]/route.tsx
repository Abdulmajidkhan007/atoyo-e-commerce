import { ImageResponse } from "next/og";
import { getProductById } from "@/lib/firebase/admin-products";
import { effectivePrice } from "@/lib/products/pricing";

export const runtime = "nodejs";

/**
 * Mahsulot uchun ijtimoiy tarmoq (OG) rasmi - havola ulashilganda
 * mahsulot nomi va narxi bilan brendlangan karta ko'rinadi.
 * Emoji renderlanmaydi, shuning uchun faqat matn ishlatiladi.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);
  const name = product?.name ?? "Atoyo Santexnika";
  const price = product ? `${effectivePrice(product).toLocaleString("uz-UZ")} so'm` : "";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0B1220 0%, #12203A 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: "64px",
        }}
      >
        <div style={{ display: "flex", fontSize: "32px", color: "#00D2C4", fontWeight: 700 }}>
          Atoyo Santexnika
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: "56px", fontWeight: 800, lineHeight: 1.15, maxWidth: "1000px" }}>
            {name.slice(0, 90)}
          </div>
          {price && (
            <div style={{ display: "flex", marginTop: "24px", fontSize: "44px", fontWeight: 800, color: "#00D2C4" }}>
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

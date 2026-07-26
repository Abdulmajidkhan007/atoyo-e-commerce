import { ImageResponse } from "next/og";

export const runtime = "nodejs";

/**
 * Mijozning profil kartasi rasmini generatsiya qiladi (ism + bosh harf
 * avatari + telefon). Bot profil ko'rinishida sendPhoto orqali yuboradi.
 * Maxfiy ma'lumot yo'q — faqat ko'rsatiladigan ism/telefon chiziladi.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = (searchParams.get("name") || "Mijoz").slice(0, 40);
  const phone = (searchParams.get("phone") || "").slice(0, 30);
  const initial = name.trim().charAt(0).toUpperCase() || "A";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #04202F 0%, #0B3B54 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        <div style={{ display: "flex", fontSize: "30px", color: "#C49A6C", fontWeight: 700, marginBottom: "40px" }}>
          Atoyo Santexnika
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "200px",
            height: "200px",
            borderRadius: "100px",
            background: "linear-gradient(135deg, #C49A6C 0%, #8A6640 100%)",
            fontSize: "110px",
            fontWeight: 800,
            color: "#06121F",
          }}
        >
          {initial}
        </div>

        <div style={{ display: "flex", marginTop: "36px", fontSize: "56px", fontWeight: 800, textAlign: "center", maxWidth: "1000px" }}>
          {name}
        </div>

        {phone ? (
          <div style={{ display: "flex", marginTop: "16px", fontSize: "34px", color: "#C7D2E0" }}>
            {phone}
          </div>
        ) : (
          <div style={{ display: "flex" }} />
        )}

        <div style={{ display: "flex", marginTop: "44px", fontSize: "24px", color: "#8EA0B5" }}>
          Ro&apos;yxatdan o&apos;tgan mijoz
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

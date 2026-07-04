import { ImageResponse } from "next/og";

export const runtime = "nodejs";

/**
 * Telegram bot salomlashuvi uchun brendlangan banner rasmini generatsiya
 * qiladi (next/og — tashqi API kerak emas). Bot /start da shu URL'ni
 * sendPhoto orqali yuboradi.
 */
export async function GET() {
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
          background: "linear-gradient(135deg, #0B1220 0%, #12203A 55%, #0E7C74 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "150px",
            height: "150px",
            borderRadius: "40px",
            background: "linear-gradient(135deg, #00D2C4 0%, #0E7C74 100%)",
            fontSize: "90px",
            fontWeight: 800,
            color: "#06121F",
          }}
        >
          A
        </div>
        <div style={{ display: "flex", marginTop: "36px", fontSize: "68px", fontWeight: 800 }}>
          Atoyo Santexnika
        </div>
        <div style={{ display: "flex", marginTop: "8px", fontSize: "38px", color: "#00D2C4", fontWeight: 700 }}>
          &amp; Otopleniye
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "28px",
            fontSize: "30px",
            color: "#C7D2E0",
            textAlign: "center",
            maxWidth: "900px",
          }}
        >
          Quvurlar • Kranlar • Radiatorlar • Isitish qozonlari
        </div>
        <div style={{ display: "flex", marginTop: "40px", fontSize: "26px", color: "#8EA0B5" }}>
          Xush kelibsiz! Botdan buyurtma bering
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

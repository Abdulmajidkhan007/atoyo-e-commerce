"use client";

import { useEffect } from "react";

/**
 * ENG YUQORI DARAJADAGI XATO EKRANI.
 *
 * Root layout ham yiqilgan holatni tutadi - shuning uchun bu yerda
 * o'zining `<html>`/`<body>` si bor va MUI/Tailwind ishlatilmaydi
 * (ular ham yuklanmagan bo'lishi mumkin). Uslub inline yoziladi.
 *
 * Xato serverga `/api/client-error` orqali yuboriladi va u yerdan
 * xodimlar guruhiga tushadi - mijoz "oq ekran" ko'rganini biz ham
 * bilib turamiz.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Best-effort: yubora olmasa ham sahifa ishlayveradi.
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        path: typeof window === "undefined" ? "" : window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [error]);

  return (
    <html lang="uz">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#04202F",
          color: "#FFFFFF",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <p style={{ fontSize: 40, margin: 0, color: "#00D2C4", fontWeight: 700 }}>Atoyo</p>
          <h1 style={{ fontSize: 20, margin: "16px 0 8px" }}>Sahifa ochilmadi</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#A9BDCB", margin: 0 }}>
            Kutilmagan xatolik yuz berdi. Xabar do&apos;kon xodimlariga yuborildi. Sahifani qayta
            yuklab ko&apos;ring.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "10px 22px",
              fontSize: 15,
              fontWeight: 600,
              color: "#04202F",
              background: "#00D2C4",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            Qayta urinish
          </button>
        </div>
      </body>
    </html>
  );
}

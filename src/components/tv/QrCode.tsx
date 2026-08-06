"use client";

import { useMemo } from "react";
import qrcode from "qrcode-generator";

/**
 * QR KOD (tashqi xizmatsiz).
 *
 * `qrcode-generator` - bog'liqliksiz kichik kutubxona; u modullar
 * matritsasini beradi, biz uni SVG kvadratchalar sifatida chizamiz.
 * Rasm serverdan so'ralmaydi, ya'ni internet sekin bo'lsa ham QR
 * darhol chiqadi (televizor uchun muhim).
 */
export function QrCode({ value, size = 220 }: { value: string; size?: number }) {
  const { path, count } = useMemo(() => {
    // Xato tuzatish darajasi "M" - ekranda uzoqdan ham o'qiladi.
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const modules = qr.getModuleCount();
    let d = "";
    for (let row = 0; row < modules; row += 1) {
      for (let col = 0; col < modules; col += 1) {
        if (qr.isDark(row, col)) d += `M${col} ${row}h1v1h-1z`;
      }
    }
    return { path: d, count: modules };
  }, [value]);

  // Chetidan 2 modul oq joy (quiet zone) - skaner shusiz qiynaladi.
  const pad = 2;
  const box = count + pad * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${box} ${box}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="QR kod"
      className="rounded-xl bg-white p-1"
    >
      <rect width={box} height={box} fill="#ffffff" />
      <g transform={`translate(${pad} ${pad})`} fill="#04202F">
        <path d={path} />
      </g>
    </svg>
  );
}

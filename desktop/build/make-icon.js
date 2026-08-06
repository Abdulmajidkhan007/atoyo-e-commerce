#!/usr/bin/env node
/**
 * ILOVA IKONKASI (tashqi kutubxonasiz).
 *
 * electron-builder Windows/Linux uchun kamida 256x256 PNG so'raydi.
 * Sandbox'da rasm tahrirlash vositalari yo'q, shuning uchun ikonka
 * shu yerda kod bilan chiziladi: Deep Navy fon + brend rangidagi "A"
 * harfi (uchburchak + ko'ndalang chiziq) va tomchi shakli.
 *
 * Ishlatish:  node desktop/build/make-icon.js
 * Natija:     desktop/build/icon.png (512x512, RGBA)
 */
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const SIZE = 512;
const NAVY = [4, 32, 47];
const GOLD = [196, 154, 108];
const WHITE = [255, 255, 255];

/** CRC32 - PNG bo'laklari uchun. */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Nuqta uchburchak ichidami (barisentrik tekshiruv). */
function inTriangle(px, py, [ax, ay], [bx, by], [cx, cy]) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function blend(target, offset, color, alpha) {
  for (let i = 0; i < 3; i += 1) {
    target[offset + i] = Math.round(target[offset + i] * (1 - alpha) + color[i] * alpha);
  }
  target[offset + 3] = 255;
}

function render() {
  // Har qatorning boshida filtr bayti (0 = None) turadi.
  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));

  const center = SIZE / 2;
  const radius = SIZE * 0.46;

  // "A" harfi: tashqi uchburchak, ichki (kesib olinadigan) uchburchak
  // va ko'ndalang chiziq.
  const outer = [
    [center, SIZE * 0.2],
    [SIZE * 0.27, SIZE * 0.78],
    [SIZE * 0.73, SIZE * 0.78],
  ];
  // Ichki uchburchak pastigacha davom etadi - aks holda "A" ning
  // oyoqlari pastda qo'shilib, to'ldirilgan uchburchak bo'lib qoladi.
  const inner = [
    [center, SIZE * 0.36],
    [SIZE * 0.405, SIZE * 0.8],
    [SIZE * 0.595, SIZE * 0.8],
  ];
  const barTop = SIZE * 0.62;
  const barBottom = SIZE * 0.68;

  for (let y = 0; y < SIZE; y += 1) {
    const rowStart = y * (SIZE * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < SIZE; x += 1) {
      const offset = rowStart + 1 + x * 4;

      // Doira tashqarisi - shaffof (yumaloq ikonka).
      const dist = Math.hypot(x - center + 0.5, y - center + 0.5);
      if (dist > radius) {
        raw[offset] = 0;
        raw[offset + 1] = 0;
        raw[offset + 2] = 0;
        raw[offset + 3] = 0;
        continue;
      }

      // Fon: yuqoridan pastga biroz ochroq.
      const shade = 1 - y / SIZE / 3;
      blend(raw, offset, NAVY.map((c) => Math.min(255, Math.round(c * (1 + shade * 0.6)))), 1);

      const inOuter = inTriangle(x, y, outer[0], outer[1], outer[2]);
      const inInner = inTriangle(x, y, inner[0], inner[1], inner[2]);
      const inBar = y >= barTop && y <= barBottom && inOuter;

      if ((inOuter && !inInner) || inBar) {
        blend(raw, offset, inBar ? WHITE : GOLD, 1);
      }

      // Chekka bo'ylab yumshoq qirra (antialias o'rniga).
      if (radius - dist < 1.5) {
        blend(raw, offset, NAVY, 0.5);
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; // bit chuqurligi
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const target = path.join(__dirname, "icon.png");
fs.writeFileSync(target, render());
console.log(`Ikonka tayyor: ${target} (${SIZE}x${SIZE})`);

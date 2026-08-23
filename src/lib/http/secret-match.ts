import { timingSafeEqual } from "node:crypto";

/**
 * DOIMIY VAQTLI satr solishtirish - oddiy `===` maxfiy kalitning necha
 * belgisi to'g'ri kelganini javob vaqtidan bilib olish imkonini beradi
 * (timing attack). `timingSafeEqual` uzunliklar teng bo'lishini talab
 * qiladi, shuning uchun uzunlik avval tekshiriladi.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/** `Authorization: Bearer <sir>` sarlavhasini kutilgan qiymat bilan solishtiradi. */
export function secretMatches(header: string | null, expected: string): boolean {
  const provided = header?.replace(/^Bearer\s+/i, "").trim() ?? "";
  return timingSafeStringEqual(provided, expected);
}

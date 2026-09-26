import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/firebase/session";
import { consumeChallenge } from "@/lib/security/challenge";
import { logAction } from "@/lib/telegram/action-log";
import { validationMessage } from "@/lib/http/validation";
import { getTransferSettings, saveTransferSettings } from "@/lib/payments/transfer";
import { formatCardNumber } from "@/types/payment-transfer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z
  .object({
    enabled: z.boolean(),
    cardNumber: z
      .string()
      .transform((value) => value.replace(/\D/g, ""))
      .refine((value) => value === "" || /^\d{16}$/.test(value), {
        message: "Karta raqami 16 ta raqamdan iborat bo'lishi kerak",
      }),
    cardHolder: z.string().trim().max(60, "Karta egasi 60 belgidan oshmasin"),
    bankName: z.string().trim().max(60).default(""),
    note: z.string().trim().max(400).default(""),
    // Bo'sh bo'lishi MUMKIN: 10 daqiqalik ishonch oynasi ochiq bo'lsa.
    challengeId: z.string().max(64),
    challengeAnswer: z.number().int(),
  })
  .refine((data) => !data.enabled || (data.cardNumber.length === 16 && data.cardHolder.length > 0), {
    message: "Yoqish uchun karta raqami va egasining ismi kerak",
    path: ["enabled"],
  });

export async function GET() {
  const admin = await requirePermission("settings");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });
  return NextResponse.json({ transfer: await getTransferSettings() });
}

/**
 * Pul qabul qilinadigan kartani saqlash. JUMBOQ bilan: bu mijozlar
 * puli boradigan joy (`lib/payments/transfer.ts` dagi izoh).
 */
export async function PATCH(request: Request) {
  const admin = await requirePermission("settings");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  }

  const passed = await consumeChallenge({
    id: parsed.data.challengeId,
    answer: parsed.data.challengeAnswer,
    uid: admin.uid,
  });
  if (!passed) {
    return NextResponse.json(
      { error: "Jumboq javobi noto'g'ri yoki eskirgan. Qaytadan urinib ko'ring." },
      { status: 403 }
    );
  }

  const before = await getTransferSettings();
  const { challengeId: _id, challengeAnswer: _answer, ...settings } = parsed.data;
  const saved = await saveTransferSettings(settings);

  // Karta almashsa - egasi DARHOL bilsin (sessiya o'g'irlangan bo'lsa ham).
  const cardChanged = before.cardNumber !== saved.cardNumber;
  await logAction(
    cardChanged
      ? `⚠️ O'TKAZMA KARTASI ALMASHTIRILDI (${admin.email ?? "admin"}): ${
          before.cardNumber ? formatCardNumber(before.cardNumber) : "—"
        } → ${saved.cardNumber ? formatCardNumber(saved.cardNumber) : "—"}. Siz qilmagan bo'lsangiz — darhol tekshiring!`
      : `🏦 Kartaga o'tkazma sozlamasi yangilandi (${admin.email ?? "admin"}): ${saved.enabled ? "yoqilgan" : "o'chiq"}`
  );
  return NextResponse.json({ ok: true, transfer: saved });
}

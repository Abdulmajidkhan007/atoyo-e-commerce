import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import { getAppUserFromRequest } from "@/lib/firebase/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  createCardToken,
  isCardSaveConfigured,
  removeCard,
  sendCardVerifyCode,
  verifyCard,
} from "@/lib/payments/cards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * MIJOZNING SAQLANGAN KARTALARI.
 *
 * Karta raqami bu yerdan faqat Payme'ga o'tadi va HECH QAYERDA
 * saqlanmaydi. Firestore'da `users/{uid}/cards` ichida token va
 * niqoblangan raqamgina qoladi; javobda token mijozga QAYTARILMAYDI.
 */

const addSchema = z.object({
  action: z.literal("add"),
  number: z.string().min(16).max(20),
  expire: z.string().min(4).max(5),
});

const verifySchema = z.object({
  action: z.literal("verify"),
  cardId: z.string().min(1),
  code: z.string().min(3).max(8),
});

const resendSchema = z.object({ action: z.literal("resend"), cardId: z.string().min(1) });

const bodySchema = z.discriminatedUnion("action", [addSchema, verifySchema, resendSchema]);

interface StoredCard {
  id: string;
  token: string;
  maskedNumber: string;
  expire: string;
  verified: boolean;
  createdAt: number;
}

/** Mijozga token ko'rsatilmaydi. */
function publicCard(card: StoredCard) {
  return {
    id: card.id,
    maskedNumber: card.maskedNumber,
    expire: card.expire,
    verified: card.verified,
    createdAt: card.createdAt,
  };
}

export async function GET(request: Request) {
  if (!isCardSaveConfigured()) return NextResponse.json({ enabled: false, cards: [] });

  const user = await getAppUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Avval hisobingizga kiring." }, { status: 401 });

  const snapshot = await getAdminDb().collection("users").doc(user.uid).collection("cards").get();
  const cards = snapshot.docs.map((doc) => publicCard({ id: doc.id, ...doc.data() } as StoredCard));

  return NextResponse.json({ enabled: true, cards });
}

export async function POST(request: Request) {
  if (!isCardSaveConfigured()) {
    return NextResponse.json({ error: "Karta saqlash hozircha yoqilmagan." }, { status: 503 });
  }

  const user = await getAppUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Avval hisobingizga kiring." }, { status: 401 });

  // Karta qo'shish urinishlari cheklangan (kod terib ko'rishning oldi olinadi).
  const { allowed } = await checkRateLimit({
    key: `cards:${user.uid}:${getClientIp(request)}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Juda ko'p urinish. Bir oz kutib turing." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  const cardsRef = getAdminDb().collection("users").doc(user.uid).collection("cards");

  try {
    // ---- Yangi karta: token olinadi va SMS kod yuboriladi ----
    if (parsed.data.action === "add") {
      const info = await createCardToken(parsed.data.number, parsed.data.expire);
      const id = randomUUID();
      const card: StoredCard = {
        id,
        token: info.token,
        maskedNumber: info.maskedNumber,
        expire: info.expire,
        verified: info.verified,
        createdAt: Date.now(),
      };
      await cardsRef.doc(id).set(card);

      const sent = await sendCardVerifyCode(info.token);
      return NextResponse.json({ card: publicCard(card), sentTo: sent.sentTo });
    }

    const doc = await cardsRef.doc(parsed.data.cardId).get();
    if (!doc.exists) return NextResponse.json({ error: "Karta topilmadi." }, { status: 404 });
    const stored = { id: doc.id, ...doc.data() } as StoredCard;

    // ---- Kodni qayta yuborish ----
    if (parsed.data.action === "resend") {
      const sent = await sendCardVerifyCode(stored.token);
      return NextResponse.json({ ok: true, sentTo: sent.sentTo });
    }

    // ---- Kodni tasdiqlash ----
    const info = await verifyCard(stored.token, parsed.data.code);
    await cardsRef.doc(stored.id).update({ verified: info.verified, maskedNumber: info.maskedNumber });
    return NextResponse.json({ card: publicCard({ ...stored, ...info, id: stored.id }) });
  } catch (error) {
    console.error("Karta amali xatosi:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Xatolik yuz berdi." },
      { status: 502 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!isCardSaveConfigured()) {
    return NextResponse.json({ error: "Karta saqlash hozircha yoqilmagan." }, { status: 503 });
  }

  const user = await getAppUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Avval hisobingizga kiring." }, { status: 401 });

  const cardId = new URL(request.url).searchParams.get("id");
  if (!cardId) return NextResponse.json({ error: "ID kerak." }, { status: 400 });

  const ref = getAdminDb().collection("users").doc(user.uid).collection("cards").doc(cardId);
  const doc = await ref.get();
  if (!doc.exists) return NextResponse.json({ ok: true });

  // Payme tomonida ham o'chiriladi; u yerda xato bo'lsa ham bizdagi
  // yozuv olib tashlanadi (mijoz kartani ro'yxatda ko'rmasligi kerak).
  try {
    await removeCard((doc.data() as StoredCard).token);
  } catch (error) {
    console.error("Payme'dan kartani o'chirishda xato:", error);
  }
  await ref.delete();

  return NextResponse.json({ ok: true });
}

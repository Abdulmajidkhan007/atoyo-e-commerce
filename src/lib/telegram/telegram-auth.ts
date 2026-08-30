import "server-only";
import { randomBytes } from "node:crypto";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { logAction } from "./action-log";
import { getTelegramSecrets } from "./secrets";

/**
 * TELEGRAM ORQALI KIRISH - "deep link" usuli.
 *
 * Telegram Login Widget domenni BotFather'da `/setdomain` bilan
 * bog'lashni talab qiladi va biror joyda xato bo'lsa "Bot domain invalid"
 * deb turadi. Bu usul esa domenga umuman bog'liq emas:
 *
 *   1) Sayt/ilova bir martalik kod yaratadi va mijozni
 *      t.me/<bot>?start=login_<kod> ga yuboradi;
 *   2) mijoz botda "Start" bosadi - bot kodni o'sha mijozga bog'laydi;
 *   3) sayt/ilova kodni so'rab turadi va tayyor bo'lganda Firebase
 *      custom token'ini oladi.
 *
 * Ustunligi: Telegram ilovasi ichida ham, brauzerda ham ishlaydi va
 * mijoz allaqachon botda ro'yxatdan o'tgan bo'lsa telefon raqami ham
 * o'sha yerdan keladi.
 */

const CODE_TTL_MS = 5 * 60 * 1000;

export interface TelegramProfile {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
}

export function telegramUid(telegramId: number): string {
  return `tg_${telegramId}`;
}

/** Kirish so'rovini boshlash: kod + botga havola. */
export async function createLoginCode(): Promise<{ code: string; url: string }> {
  const code = randomBytes(18).toString("hex");
  await getAdminDb().collection("tgLogins").doc(code).set({
    status: "pending",
    createdAt: Date.now(),
    expiresAt: Date.now() + CODE_TTL_MS,
  });

  // Bot useri panel sozlamasidan (bot almashtirilsa deploy kutilmasin).
  const { botUsername } = await getTelegramSecrets();
  const bot = botUsername || "Atoyo_uz_bot";
  return { code, url: `https://t.me/${bot}?start=login_${code}` };
}

/**
 * Firebase foydalanuvchisini yaratadi/yangilaydi va `users` hujjatini
 * to'ldiradi. Sayt bilan bir xil kolleksiya - bitta hisob ikkala
 * platformada ham ishlaydi.
 */
export async function ensureTelegramUser(profile: TelegramProfile): Promise<string> {
  const uid = telegramUid(profile.id);
  const displayName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || "Mijoz";
  const auth = getAdminAuth();

  try {
    await auth.updateUser(uid, { displayName, photoURL: profile.photoUrl });
  } catch {
    await auth.createUser({ uid, displayName, photoURL: profile.photoUrl });
  }

  const db = getAdminDb();
  const userRef = db.collection("users").doc(uid);
  const [existing, botUser] = await Promise.all([
    userRef.get(),
    db.collection("botUsers").doc(String(profile.id)).get(),
  ]);

  const phoneNumber = (botUser.data()?.phoneNumber as string | undefined) ?? null;
  const patch: Record<string, unknown> = {
    displayName,
    photoURL: profile.photoUrl ?? null,
    telegramId: profile.id,
    ...(profile.username ? { telegramUsername: profile.username } : {}),
    ...(phoneNumber ? { phoneNumber } : {}),
  };

  if (existing.exists) {
    await userRef.set(patch, { merge: true });
  } else {
    await userRef.set({ ...patch, email: null, role: "user", createdAt: Date.now() });
    await logAction(
      `👤 Telegram orqali yangi mijoz: ${displayName}${profile.username ? ` (@${profile.username})` : ""}`
    );
  }

  return uid;
}

/** Bot "Start" bosilganda kodni mijozga bog'laydi. */
export async function attachLoginCode(code: string, profile: TelegramProfile): Promise<boolean> {
  const ref = getAdminDb().collection("tgLogins").doc(code);
  const snap = await ref.get();
  const data = snap.data() as { expiresAt?: number; status?: string } | undefined;

  if (!snap.exists || !data) return false;
  if (data.status !== "pending") return false;
  if ((data.expiresAt ?? 0) < Date.now()) return false;

  const uid = await ensureTelegramUser(profile);
  await ref.set({ status: "ready", uid, readyAt: Date.now() }, { merge: true });
  return true;
}

export type ExchangeResult =
  | { state: "pending" }
  | { state: "ready"; token: string }
  | { state: "invalid" }
  /**
   * Kod joyida edi, lekin SERVER token yasay olmadi. Eng ko'p uchraydigan
   * sabab: hosting xizmat akkauntida "Service Account Token Creator"
   * huquqi yo'q (custom token IAM signBlob orqali imzolanadi). Ilgari bu
   * xato ham "invalid" deb ko'rsatilardi va sabab ko'rinmasdi.
   */
  | { state: "error"; message: string };

/**
 * Kodni custom token'ga almashtirish. Faqat bir marta ishlaydi -
 * tranzaksiyada "used" deb belgilanadi.
 */
export async function exchangeLoginCode(code: string): Promise<ExchangeResult> {
  const db = getAdminDb();
  const ref = db.collection("tgLogins").doc(code);

  try {
    const uid = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() as
        | { uid?: string; status?: string; expiresAt?: number }
        | undefined;

      if (!snap.exists || !data) throw new Error("invalid");
      if ((data.expiresAt ?? 0) < Date.now()) throw new Error("invalid");
      if (data.status === "pending") throw new Error("pending");
      if (data.status !== "ready" || !data.uid) throw new Error("invalid");

      tx.update(ref, { status: "used", usedAt: Date.now() });
      return data.uid;
    });

    try {
      return { state: "ready", token: await getAdminAuth().createCustomToken(uid) };
    } catch (error) {
      // Kod "used" bo'lib qolmasin - foydalanuvchi qayta urinib ko'rsin.
      await ref.update({ status: "ready" }).catch(() => {});
      const message = error instanceof Error ? error.message : String(error);
      console.error("Telegram kirish: custom token yasab bo'lmadi:", message);
      return { state: "error", message };
    }
  } catch (error) {
    return error instanceof Error && error.message === "pending"
      ? { state: "pending" }
      : { state: "invalid" };
  }
}

import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { DEFAULT_TRANSFER_SETTINGS, type TransferSettings } from "@/types/payment-transfer";

/**
 * KARTAGA O'TKAZMA SOZLAMASI (`settings/payment`), 60 soniya kesh.
 *
 * XAVFSIZLIK: karta raqami — mijozlar puli boradigan joy. Admin
 * sessiyasini o'g'irlagan odam uni o'zinikiga almashtirsa, pul unga
 * ketadi. Shuning uchun saqlash JUMBOQ bilan himoyalangan
 * (`/api/admin/transfer-settings`) va har o'zgarish "Actions"
 * topic'iga yoziladi — egasi darhol ko'radi.
 */
const DOC_PATH = "settings/payment";
const TTL = 60 * 1000;

let cache: { value: TransferSettings; at: number } | null = null;

export function normalizeTransferSettings(data: Partial<TransferSettings> | undefined): TransferSettings {
  const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
  return {
    enabled: data?.enabled === true,
    cardNumber: text(data?.cardNumber, 40).replace(/\D/g, "").slice(0, 16),
    cardHolder: text(data?.cardHolder, 60),
    bankName: text(data?.bankName, 60),
    note: text(data?.note, 400),
  };
}

export async function getTransferSettings(): Promise<TransferSettings> {
  if (cache && Date.now() - cache.at < TTL) return cache.value;
  try {
    const snap = await getAdminDb().doc(DOC_PATH).get();
    const value = normalizeTransferSettings(snap.data() as Partial<TransferSettings> | undefined);
    cache = { value, at: Date.now() };
    return value;
  } catch {
    // O'qib bo'lmasa o'tkazma O'CHIQ hisoblanadi — noto'g'ri karta
    // ko'rsatgandan ko'ra, bu usulni vaqtincha yashirgan yaxshi.
    return DEFAULT_TRANSFER_SETTINGS;
  }
}

export async function saveTransferSettings(next: TransferSettings): Promise<TransferSettings> {
  const value = normalizeTransferSettings(next);
  await getAdminDb().doc(DOC_PATH).set({ ...value, updatedAt: Date.now() }, { merge: true });
  cache = null;
  return value;
}

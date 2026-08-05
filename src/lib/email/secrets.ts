import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * SMTP KALITLARI (server-only).
 *
 * Telegram kalitlari kabi: `secrets/email` hujjatida saqlanadi va
 * env'dan ustun turadi. Shu tufayli pochtani ULASH uchun qayta deploy
 * qilish shart emas - admin panelda kiritiladi.
 *
 * Gmail uchun: SMTP_HOST=smtp.gmail.com, port 587, user - o'sha Gmail
 * manzili, parol - oddiy parol EMAS, "App password" (16 belgi).
 */

const DOC_PATH = "secrets/email";
const CACHE_TTL_MS = 60 * 1000;

export interface EmailSecrets {
  host: string;
  port: number;
  user: string;
  pass: string;
  /** Ko'rinadigan nom/manzil: "Atoyo <shop@gmail.com>". */
  from: string;
}

let cache: { value: EmailSecrets; at: number } | null = null;

function fromEnv(): EmailSecrets {
  return {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587) || 587,
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "",
  };
}

export async function getEmailSecrets(): Promise<EmailSecrets> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;

  const env = fromEnv();
  try {
    const snap = await getAdminDb().doc(DOC_PATH).get();
    const stored = (snap.data() ?? {}) as Partial<EmailSecrets>;
    const value: EmailSecrets = {
      host: stored.host?.trim() || env.host,
      port: Number(stored.port) > 0 ? Number(stored.port) : env.port,
      user: stored.user?.trim() || env.user,
      pass: typeof stored.pass === "string" && stored.pass ? stored.pass : env.pass,
      from: stored.from?.trim() || env.from,
    };
    cache = { value, at: Date.now() };
    return value;
  } catch {
    return env;
  }
}

export async function saveEmailSecrets(patch: Partial<EmailSecrets>): Promise<void> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (key === "port") {
      const port = Number(value);
      if (port > 0) clean.port = port;
      continue;
    }
    if (typeof value === "string" && value.trim()) clean[key] = value.trim();
  }
  await getAdminDb().doc(DOC_PATH).set({ ...clean, updatedAt: Date.now() }, { merge: true });
  cache = null;
}

/** Panelda ko'rsatish uchun: parolsiz, niqoblangan holat. */
export async function describeEmailSecrets(): Promise<{
  configured: boolean;
  host: string;
  port: number;
  user: string;
  from: string;
}> {
  const secrets = await getEmailSecrets();
  return {
    configured: Boolean(secrets.host && secrets.user && secrets.pass),
    host: secrets.host,
    port: secrets.port,
    user: secrets.user,
    from: secrets.from,
  };
}

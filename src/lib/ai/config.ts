import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * SUN'IY INTELLEKT SOZLAMALARI (server-only).
 *
 * Kalit `ANTHROPIC_API_KEY` env'da (App Hosting'da Secret Manager orqali).
 * Kalit bo'lmasa - yordamchi butunlay o'chiq: API 503 qaytaradi, sayt va
 * ilovada tugma ko'rinmaydi. Ya'ni kalitsiz ham loyiha ishlayveradi.
 */

/** Model env orqali almashtiriladi (arzonroq variant: `claude-haiku-4-5`). */
export const AI_MODEL = process.env.AI_MODEL?.trim() || "claude-opus-5";

/** Bitta javobning eng katta uzunligi - xarajatni cheklaydi. */
export const AI_MAX_TOKENS = Number(process.env.AI_MAX_TOKENS ?? 700);

let client: Anthropic | null = null;

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export function getAnthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
  }
  return client;
}

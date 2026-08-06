import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { isOwner } from "@/lib/permissions";
import { getSocialSecrets } from "@/lib/social/secrets";
import { youtubeRedirectUri, YOUTUBE_SCOPE, YOUTUBE_STATE_COOKIE } from "@/lib/social/youtube-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * YOUTUBE'GA ULANISH (1-qadam).
 *
 * Google "oob" (kodni qo'lda ko'chirish) usulini bekor qilgan, shuning
 * uchun refresh tokenni SAYTNING O'ZI oladi: bu yo'l kanal egasini
 * Google roziligi sahifasiga olib boradi, qaytishda esa `callback`
 * kodni tokenga almashtirib `secrets/social` ga yozadi.
 *
 * Google Cloud'dagi OAuth mijozi "Web application" turida bo'lishi va
 * unga shu manzil "Authorized redirect URI" sifatida qo'shilishi kerak.
 */
export async function GET() {
  const user = await getCurrentAppUser();
  if (!isOwner(user)) {
    return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });
  }

  const secrets = await getSocialSecrets();
  if (!secrets.youtubeClientId || !secrets.youtubeClientSecret) {
    return NextResponse.json(
      { error: "Avval YouTube Client ID va Client Secret ni saqlang." },
      { status: 400 }
    );
  }

  // CSRF himoyasi: tasodifiy `state` cookie'ga yoziladi va qaytishda solishtiriladi.
  const state = randomUUID();
  (await cookies()).set(YOUTUBE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", secrets.youtubeClientId);
  url.searchParams.set("redirect_uri", youtubeRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", YOUTUBE_SCOPE);
  // Refresh token faqat shu ikkovi bilan qaytadi.
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}

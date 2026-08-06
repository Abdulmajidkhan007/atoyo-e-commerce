import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { isOwner } from "@/lib/permissions";
import { getSocialSecrets } from "@/lib/social/secrets";
import { createOAuthState } from "@/lib/social/oauth-state";
import { metaRedirectUri, META_SCOPES } from "@/lib/social/meta-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * FACEBOOK VA INSTAGRAM'GA ULANISH (1-qadam).
 *
 * Graph API Explorer bilan qo'lda token olib o'tirmaslik uchun:
 * bu yo'l Facebook roziligi oynasiga olib boradi, qaytishda esa
 * `callback` sahifa tokenini va Instagram akkaunt ID sini o'zi topib
 * `secrets/social` ga yozadi.
 */
export async function GET() {
  const user = await getCurrentAppUser();
  if (!isOwner(user)) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const secrets = await getSocialSecrets();
  if (!secrets.metaAppId || !secrets.metaAppSecret) {
    return NextResponse.json(
      { error: "Avval Meta App ID va App Secret ni saqlang." },
      { status: 400 }
    );
  }

  // `state` bazada saqlanadi - Firebase Hosting cookie'ni uzatmaydi.
  const state = await createOAuthState("meta", user!.uid);

  const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  url.searchParams.set("client_id", secrets.metaAppId);
  url.searchParams.set("redirect_uri", metaRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", META_SCOPES);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}

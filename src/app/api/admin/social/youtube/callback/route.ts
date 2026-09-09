import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { isOwner } from "@/lib/permissions";
import { getSocialSecrets, saveSocialSecrets } from "@/lib/social/secrets";
import { consumeOAuthState } from "@/lib/social/oauth-state";
import { youtubeRedirectUri } from "@/lib/social/youtube-oauth";
import { logAction } from "@/lib/telegram/action-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * YOUTUBE'GA ULANISH (2-qadam): Google qaytargan kodni refresh tokenga
 * almashtiradi va `secrets/social` ga yozadi. Shundan keyin sayt
 * kanalga video yuklay oladi.
 */
function back(message: string, ok = false): NextResponse {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.atoyo.uz";
  const url = new URL(`${base}/admin/sozlamalar`);
  url.searchParams.set(ok ? "youtube" : "youtubeError", message);
  return NextResponse.redirect(url.toString());
}

export async function GET(request: Request) {
  const user = await getCurrentAppUser();
  if (!isOwner(user)) return back("Ruxsat etilmagan.");

  const params = new URL(request.url).searchParams;
  const error = params.get("error");
  if (error) return back(`Google rad etdi: ${error}`);

  const code = params.get("code");
  if (!code) return back("Kod kelmadi.");

  const ok = await consumeOAuthState("youtube", params.get("state"), user!.uid);
  if (!ok) {
    return back(
      "So'rov tasdiqlanmadi (state) — ulanishni qaytadan, shu brauzerning o'zida boshlang."
    );
  }

  const secrets = await getSocialSecrets();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: secrets.youtubeClientId,
      client_secret: secrets.youtubeClientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: youtubeRedirectUri(),
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    refresh_token?: string;
    error_description?: string;
    error?: string;
  };

  if (!response.ok || !data.refresh_token) {
    return back(
      data.error_description ??
        data.error ??
        "Refresh token kelmadi. Google hisobidan avvalgi ruxsatni olib tashlab, qaytadan urinib ko'ring."
    );
  }

  await saveSocialSecrets({ youtubeRefreshToken: data.refresh_token });
  await logAction(`🔑 YouTube ulandi (${user?.email ?? "egasi"})`);
  return back("YouTube ulandi ✅", true);
}

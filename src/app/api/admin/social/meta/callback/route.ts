import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { isOwner } from "@/lib/permissions";
import { getSocialSecrets, saveSocialSecrets } from "@/lib/social/secrets";
import { consumeOAuthState } from "@/lib/social/oauth-state";
import { metaRedirectUri } from "@/lib/social/meta-oauth";
import { logAction } from "@/lib/telegram/action-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRAPH = "https://graph.facebook.com/v21.0";

function back(message: string, ok = false): NextResponse {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.atoyo.uz";
  const url = new URL(`${base}/admin/sozlamalar`);
  url.searchParams.set(ok ? "meta" : "metaError", message);
  return NextResponse.redirect(url.toString());
}

/**
 * FACEBOOK/INSTAGRAM'GA ULANISH (2-qadam).
 *
 * Kod → qisqa muddatli token → UZOQ muddatli token → sahifalar ro'yxati.
 * Instagram akkaunti bog'langan sahifa birinchi navbatda olinadi;
 * sahifa tokeni uzoq muddatli tokendan olingani uchun u ham eskirmaydi.
 */
export async function GET(request: Request) {
  const user = await getCurrentAppUser();
  if (!isOwner(user)) return back("Ruxsat etilmagan.");

  const params = new URL(request.url).searchParams;
  const error = params.get("error_description") ?? params.get("error");
  if (error) return back(`Facebook rad etdi: ${error}`);

  const code = params.get("code");
  if (!code) return back("Kod kelmadi.");

  const ok = await consumeOAuthState("meta", params.get("state"), user!.uid);
  if (!ok) {
    return back(
      "So'rov tasdiqlanmadi (state) — ulanishni qaytadan, shu brauzerning o'zida boshlang."
    );
  }

  const secrets = await getSocialSecrets();

  try {
    // 1) Kod -> qisqa muddatli foydalanuvchi tokeni.
    const shortRes = await fetch(
      `${GRAPH}/oauth/access_token?` +
        new URLSearchParams({
          client_id: secrets.metaAppId,
          client_secret: secrets.metaAppSecret,
          redirect_uri: metaRedirectUri(),
          code,
        })
    );
    const shortData = (await shortRes.json()) as {
      access_token?: string;
      error?: { message?: string };
    };
    if (!shortData.access_token) {
      return back(shortData.error?.message ?? "Token olinmadi.");
    }

    // 2) Uzoq muddatli foydalanuvchi tokeni (60 kun).
    const longRes = await fetch(
      `${GRAPH}/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: secrets.metaAppId,
          client_secret: secrets.metaAppSecret,
          fb_exchange_token: shortData.access_token,
        })
    );
    const longData = (await longRes.json()) as {
      access_token?: string;
      error?: { message?: string };
    };
    const userToken = longData.access_token ?? shortData.access_token;

    // 3) Sahifalar: ID, nomi, sahifa tokeni va bog'langan Instagram akkaunti.
    const pagesRes = await fetch(
      `${GRAPH}/me/accounts?` +
        new URLSearchParams({
          fields: "id,name,access_token,instagram_business_account",
          access_token: userToken,
        })
    );
    const pagesData = (await pagesRes.json()) as {
      data?: {
        id: string;
        name: string;
        access_token: string;
        instagram_business_account?: { id: string };
      }[];
      error?: { message?: string };
    };

    const pages = pagesData.data ?? [];
    if (pages.length === 0) {
      return back(
        pagesData.error?.message ??
          "Sahifa topilmadi. Facebook sahifangiz borligini va ruxsat berganingizni tekshiring."
      );
    }

    // Instagram bog'langan sahifa ustun turadi.
    const page = pages.find((item) => item.instagram_business_account?.id) ?? pages[0]!;

    await saveSocialSecrets({
      pageId: page.id,
      pageAccessToken: page.access_token,
      ...(page.instagram_business_account?.id
        ? { igUserId: page.instagram_business_account.id }
        : {}),
    });

    await logAction(`🔑 Facebook/Instagram ulandi (${user?.email ?? "egasi"}): ${page.name}`);
    return back(
      page.instagram_business_account?.id
        ? `Ulandi ✅ Sahifa: ${page.name}, Instagram ham bog'landi.`
        : `Ulandi ✅ Sahifa: ${page.name}. Instagram bog'lanmagan — akkauntni Professional qilib sahifaga ulang.`,
      true
    );
  } catch (err) {
    return back(err instanceof Error ? err.message : "Ulanishda xatolik.");
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyIdTokenForCookie, SESSION_COOKIE_NAME } from "@/lib/firebase/session";

const ID_TOKEN_MAX_AGE_SECONDS = 60 * 60; // Firebase ID token ~1 soatda eskiradi.

const bodySchema = z.object({
  idToken: z.string().min(10),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Yaroqsiz so'rov." }, { status: 400 });
  }

  try {
    const idToken = await verifyIdTokenForCookie(parsed.data.idToken);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, idToken, {
      maxAge: ID_TOKEN_MAX_AGE_SECONDS,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Token tasdiqlanmadi." }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionCookie, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/firebase/session";

const bodySchema = z.object({
  idToken: z.string().min(10),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Yaroqsiz so'rov." }, { status: 400 });
  }

  try {
    const sessionCookie = await createSessionCookie(parsed.data.idToken);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: SESSION_MAX_AGE_SECONDS,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Sessiya yaratib bo'lmadi." }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

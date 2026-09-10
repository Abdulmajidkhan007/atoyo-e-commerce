import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionCookie, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/firebase/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const bodySchema = z.object({
  idToken: z.string().min(10),
});

export async function POST(request: Request) {
  // Har chaqiruv Firebase'ga token tekshirtiradi (pullik va sekin
  // amal). Chegarasiz qoldirilsa bitta IP dan yuzlab so'rov yuborib
  // loyihani ham sekinlashtirish, ham hisobni yeb qo'yish mumkin.
  const { allowed } = await checkRateLimit({
    key: `session:${getClientIp(request)}`,
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Juda ko'p urinish. Bir necha daqiqadan keyin qayta urining." },
      { status: 429 }
    );
  }

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
  } catch (error) {
    // Aniq sabab server loglarida ko'rinadi (masalan Admin SDK
    // credentiallari yetishmasa yoki token yaroqsiz bo'lsa).
    console.error("Session cookie yaratishda xato:", error);
    return NextResponse.json({ error: "Sessiya yaratib bo'lmadi." }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

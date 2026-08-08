import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SOG'LIQ TEKSHIRUVI.
 *
 * App Hosting / Cloud Run va tashqi monitoring (masalan UptimeRobot)
 * shu manzilni chaqirib, sayt tirikligini biladi.
 *
 * ATAYLAB Firestore'ga TEGMAYDI: agar bu yerda baza so'ralsa, har
 * monitoring so'rovi o'qish sarflaydi va bazadagi qisqa uzilish
 * butun saytni "o'lik" deb ko'rsatib, keraksiz qayta ishga
 * tushirishlarga sabab bo'ladi. Bu tekshiruv faqat "server javob
 * beryaptimi" degan savolga javob beradi.
 */
export function GET() {
  return NextResponse.json({ ok: true, time: new Date().toISOString() });
}

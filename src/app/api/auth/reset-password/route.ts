import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuth } from "@/lib/firebase/admin";
import { isEmailConfigured, sendGenericEmail } from "@/lib/email/mailer";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().email().max(200) });

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://atoyo-uz.web.app").replace(/\/$/, "");

function resetEmailHtml(link: string): string {
  return `
    <p>Assalomu alaykum,</p>
    <p>Hisobingiz parolini tiklash uchun quyidagi tugmani bosing. Havola 1 soat davomida amal qiladi.</p>
    <p style="margin:24px 0">
      <a href="${link}"
         style="background:#C49A6C;color:#072D40;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;display:inline-block">
        Parolni tiklash
      </a>
    </p>
    <p style="color:#888;font-size:13px">Tugma ishlamasa, shu havolani brauzerga nusxalang:<br>
      <a href="${link}" style="color:#8A6640">${link}</a>
    </p>
    <p style="color:#888;font-size:13px">Agar parolni tiklashni so'ramagan bo'lsangiz, bu xatga e'tibor bermang.</p>
  `;
}

/**
 * PAROLNI TIKLASH XATI — o'z domenimiz va o'z pochtamiz orqali.
 *
 * Firebase'ning standart xati `atoyo-uz.firebaseapp.com` havolasi bilan
 * keladi va ko'pincha spamga tushadi; "Customize action URL" esa faqat
 * Firebase Hosting domeni uchun ishlaydi (netlify.app domeniga
 * EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED xatosi chiqadi).
 *
 * Shuning uchun: Admin SDK havolani yaratadi, undan `oobCode` olinadi va
 * mijozga BIZNING `/auth/action` sahifamizga olib boruvchi havola
 * SMTP orqali yuboriladi. SMTP sozlanmagan bo'lsa - client Firebase'ning
 * o'z xatiga qaytadi (fallback: true).
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Email noto'g'ri." }, { status: 400 });

  const email = parsed.data.email.trim().toLowerCase();

  const { allowed } = await checkRateLimit({
    key: `reset:${getClientIp(request)}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Juda ko'p urinish. Bir soatdan keyin qayta urining." }, { status: 429 });
  }

  if (!isEmailConfigured()) return NextResponse.json({ ok: true, fallback: true });

  try {
    const firebaseLink = await getAdminAuth().generatePasswordResetLink(email, {
      url: `${SITE_URL}/kirish`,
    });
    const oobCode = new URL(firebaseLink).searchParams.get("oobCode");
    if (!oobCode) return NextResponse.json({ ok: true, fallback: true });

    const link = `${SITE_URL}/auth/action?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}`;
    const sent = await sendGenericEmail(email, "Atoyo Santexnika — parolni tiklash", resetEmailHtml(link));

    return NextResponse.json({ ok: true, fallback: !sent });
  } catch {
    // Hisob topilmasa ham xuddi shu javob - email ro'yxatdan o'tganini
    // tashqariga oshkor qilmaymiz.
    return NextResponse.json({ ok: true });
  }
}

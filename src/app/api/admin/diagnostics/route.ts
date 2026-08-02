import { NextResponse } from "next/server";
import { getMessaging } from "firebase-admin/messaging";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { PRODUCTS_TOPIC, sendPushToTopic, sendPushToUser } from "@/lib/notifications/push";
import { getTelegramSecrets } from "@/lib/telegram/secrets";
import { isEmailConfigured } from "@/lib/email/mailer";
import { isSmsConfigured, smsProvider } from "@/lib/sms/sender";
import type { AppUser } from "@/types/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TIZIM TEKSHIRUVI (faqat admin).
 *
 * Serverdagi xatolar odatda jimgina log'ga tushadi: push kelmaydi,
 * "Telegram orqali kirib bo'lmadi" chiqadi - sababi esa ko'rinmaydi.
 * Bu route har bir bo'g'inni alohida sinab ko'rib, XATO MATNINI
 * qaytaradi, shunda nima qilish kerakligi darrov ma'lum bo'ladi.
 *
 * Eng ko'p uchraydigan sabab: Firebase App Hosting'dagi xizmat
 * akkauntida huquq yetishmasligi (custom token uchun `signBlob`,
 * push uchun FCM). Yechim docs/DEPLOY.md da.
 */

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

async function run(name: string, fn: () => Promise<string>): Promise<Check> {
  try {
    return { name, ok: true, detail: await fn() };
  } catch (error) {
    return { name, ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

export async function POST(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const checks: Check[] = [];

  checks.push(
    await run("Firestore", async () => {
      const snap = await getAdminDb().collection("products").limit(1).get();
      return `o'qildi (${snap.size} ta hujjat)`;
    })
  );

  // Telegram orqali kirish shu yerda yiqiladi: custom token yasash uchun
  // xizmat akkauntida "Service Account Token Creator" huquqi kerak.
  checks.push(
    await run("Telegram kirish (custom token)", async () => {
      await getAdminAuth().createCustomToken("diagnostika-test");
      return "token yasaldi";
    })
  );

  // Push: haqiqiy xabar YUBORILMAYDI (dryRun) - faqat FCM ruxsati
  // borligini tekshiradi.
  checks.push(
    await run("Push (FCM)", async () => {
      await getMessaging().send(
        { topic: PRODUCTS_TOPIC, notification: { title: "Test", body: "Test" } },
        true /* dryRun */
      );
      return "FCM javob berdi";
    })
  );

  checks.push(
    await run("Telegram bot tokeni", async () => {
      const { botToken } = await getTelegramSecrets();
      if (!botToken) throw new Error("Bot tokeni sozlanmagan (secrets/telegram yoki env).");
      return "mavjud";
    })
  );

  checks.push(
    await run("Email (SMTP)", async () => {
      if (!isEmailConfigured()) {
        throw new Error(
          "SMTP sozlanmagan - email xabarnomalar va e'lonlar yuborilmaydi. " +
            "SMTP_HOST, SMTP_USER, SMTP_PASS kerak (Gmail uchun 'App password')."
        );
      }
      return "sozlangan";
    })
  );

  checks.push(
    await run("SMS", async () => {
      if (!isSmsConfigured()) {
        throw new Error(
          "SMS sozlanmagan. Eskiz uchun: SMS_PROVIDER=eskiz, ESKIZ_EMAIL, ESKIZ_PASSWORD."
        );
      }
      return `sozlangan (${smsProvider()})`;
    })
  );

  // Adminning o'z qurilmasida token bormi (push kelmasligining ikkinchi
  // sababi - ilova hali token yubormagan).
  checks.push(
    await run("Sizning qurilma tokeningiz", async () => {
      const snap = await getAdminDb().collection("users").doc(admin.uid).get();
      const tokens = (snap.data() as AppUser | undefined)?.pushTokens ?? [];
      if (tokens.length === 0) {
        throw new Error(
          "Qurilma tokeni yo'q. Ilovaga shu hisob bilan kiring va bildirishnomaga ruxsat bering."
        );
      }
      return `${tokens.length} ta qurilma`;
    })
  );

  return NextResponse.json({ checks });
}

/**
 * SINOV BILDIRISHNOMASI.
 *
 *   • `?target=topic` - ilova o'rnatilgan HAMMA qurilmaga (`products`
 *     mavzusi). Hisobga kirish shart emas - bildirishnomaga ruxsat
 *     berilgan bo'lsa yetadi. Zanjirni tekshirishning eng oson yo'li.
 *   • standart - adminning o'z qurilmalariga (token bo'yicha).
 */
export async function PUT(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  if (new URL(request.url).searchParams.get("target") === "topic") {
    await sendPushToTopic(PRODUCTS_TOPIC, {
      title: "Atoyo — sinov",
      body: "Bildirishnomalar ishlayapti ✅",
      data: { screen: "Home" },
    });
    return NextResponse.json({ ok: true, target: "topic" });
  }

  const snap = await getAdminDb().collection("users").doc(admin.uid).get();
  const tokens = (snap.data() as AppUser | undefined)?.pushTokens ?? [];
  if (tokens.length === 0) {
    return NextResponse.json(
      { error: "Qurilma tokeni yo'q - ilovaga shu hisob bilan kirib, bildirishnomaga ruxsat bering." },
      { status: 400 }
    );
  }

  await sendPushToUser(admin.uid, {
    title: "Atoyo — sinov",
    body: "Bildirishnomalar ishlayapti ✅",
    data: { screen: "Home" },
  });
  return NextResponse.json({ ok: true, devices: tokens.length });
}

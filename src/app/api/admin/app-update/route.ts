import { NextResponse } from "next/server";
import { z } from "zod";
import { validationMessage } from "@/lib/http/validation";
import { requirePermission } from "@/lib/firebase/session";
import { logAction } from "@/lib/telegram/action-log";
import { getAppUpdate, saveAppUpdate } from "@/lib/app/version";
import { sendPushToTopic, APP_TOPIC } from "@/lib/notifications/push";
import { NO_STORE_HEADERS } from "@/lib/http/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ILOVA YANGILANISHI (Android APK).
 *
 * Ilova Play Market'da bo'lmagani uchun foydalanuvchi yangilanish
 * chiqqanini bilmaydi. Bu route ikki ishni qiladi:
 *   • versiya + "nima o'zgardi" ro'yxatini saqlaydi (ilova uni
 *     `/api/app/version` dan o'qiydi va ochilganda oyna ko'rsatadi);
 *   • xohlasa PUSH yuboradi - ilovani ochmagan odam ham xabar topadi.
 */

const schema = z.object({
  version: z.string().min(1).max(20),
  /** Har qatori alohida band ("Turlar tanlagichi tuzatildi"). */
  notes: z.array(z.string().max(200)).max(10).default([]),
  apkUrl: z.string().url().max(300).optional().or(z.literal("")),
  mandatory: z.boolean().default(false),
  /** `true` bo'lsa saqlangandan keyin bildirishnoma ham ketadi. */
  notify: z.boolean().default(false),
});

export async function GET(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  return NextResponse.json({ update: await getAppUpdate() }, { headers: NO_STORE_HEADERS });
}

export async function PUT(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  }

  const update = await saveAppUpdate({
    version: parsed.data.version,
    notes: parsed.data.notes,
    apkUrl: parsed.data.apkUrl || "",
    mandatory: parsed.data.mandatory,
  });

  let notified = false;
  if (parsed.data.notify) {
    // Bildirishnoma matni qisqa bo'lsin - birinchi ikki band yetadi.
    const summary = update.notes.slice(0, 2).join(" · ") || "Yaxshilanishlar va tuzatishlar.";
    await sendPushToTopic(APP_TOPIC, {
      title: `Ilovaning yangi versiyasi ${update.version}`,
      body: summary,
      data: { screen: "update", version: update.version },
    });
    notified = true;
    await logAction(
      `📲 Ilova yangilanishi e'lon qilindi (${admin.email ?? "admin"}): ${update.version}`
    );
  }

  return NextResponse.json({ update, notified }, { headers: NO_STORE_HEADERS });
}

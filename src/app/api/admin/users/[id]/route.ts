import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { requireOwner, requireRoleManager } from "@/lib/firebase/session";
import { logAction } from "@/lib/telegram/action-log";
import {
  PERMISSION_KEYS,
  DEFAULT_ADMIN_PERMISSIONS,
  OWNER_EMAIL,
  isOwner,
} from "@/lib/permissions";
import type { AppUser } from "@/types/user";

export const runtime = "nodejs";

const permissionsShape = Object.fromEntries(
  PERMISSION_KEYS.map((key) => [key, z.boolean().optional()])
) as Record<(typeof PERMISSION_KEYS)[number], z.ZodOptional<z.ZodBoolean>>;

const updateSchema = z.object({
  role: z.enum(["user", "admin"]).optional(),
  permissions: z.object(permissionsShape).optional(),
});

/**
 * FOYDALANUVCHI ROLI VA HUQUQLARI.
 *
 * Loyiha egasi, shuningdek egasi "Rollar va huquqlar" huquqini bergan
 * admin bajaradi. Egasining o'zining roli hech qachon o'zgartirilmaydi.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await requireRoleManager();
  if (!owner) {
    return NextResponse.json(
      { error: "Bu amal uchun \"Rollar va huquqlar\" huquqi kerak." },
      { status: 403 }
    );
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  const { id } = await params;
  const ref = getAdminDb().collection("users").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Foydalanuvchi topilmadi." }, { status: 404 });

  const target = { uid: snap.id, ...(snap.data() as Omit<AppUser, "uid">) };

  // Ownerni hech kim (o'zi ham) rolini pasaytira olmaydi - saytni
  // boshqaruvsiz qoldirib qo'ymaslik uchun.
  if (isOwner(target)) {
    return NextResponse.json({ error: "Loyiha egasining roli o'zgartirilmaydi." }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.role !== undefined) {
    updates.role = parsed.data.role;
    // Admin qilinganda standart huquqlar beriladi (agar aniq berilmagan bo'lsa).
    if (parsed.data.role === "admin" && parsed.data.permissions === undefined && !target.permissions) {
      updates.permissions = DEFAULT_ADMIN_PERMISSIONS;
    }
    if (parsed.data.role === "user") updates.permissions = {};
  }
  if (parsed.data.permissions !== undefined) updates.permissions = parsed.data.permissions;

  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true });

  await ref.update(updates);
  await logAction(
    `👤 Rol/huquq o'zgardi (${owner.email}): ${target.email ?? target.uid} → ${
      (updates.role as string) ?? target.role
    }`
  );

  return NextResponse.json({ ok: true });
}

/**
 * Foydalanuvchini butunlay o'chirish - faqat owner. Auth hisobi va
 * users hujjati o'chadi, buyurtmalari egasidan uziladi (yozuv qoladi).
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ error: "Bu amalni faqat loyiha egasi bajara oladi." }, { status: 403 });
  }

  const { id } = await params;
  const ref = getAdminDb().collection("users").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Foydalanuvchi topilmadi." }, { status: 404 });

  const target = { uid: snap.id, ...(snap.data() as Omit<AppUser, "uid">) };
  if (isOwner(target)) {
    return NextResponse.json({ error: `${OWNER_EMAIL} o'chirilmaydi.` }, { status: 403 });
  }

  try {
    await ref.delete();
    await getAdminAuth().deleteUser(id).catch(() => {});

    const ordersSnap = await getAdminDb().collection("orders").where("userId", "==", id).limit(300).get();
    if (!ordersSnap.empty) {
      const batch = getAdminDb().batch();
      ordersSnap.docs.forEach((d) => batch.update(d.ref, { userId: null }));
      await batch.commit();
    }

    await logAction(`🗑 Foydalanuvchi o'chirildi (${owner.email}): ${target.email ?? id}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Foydalanuvchini o'chirishda xato:", error);
    return NextResponse.json({ error: "O'chirishda xatolik yuz berdi." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/firebase/session";
import {
  createWholesaleClient,
  deleteWholesaleClient,
  inviteText,
  listWholesaleClients,
  notifyStaff,
  regenerateKey,
  sendInvite,
  updateWholesaleClient,
} from "@/lib/wholesale/clients";
import { getAdminDb } from "@/lib/firebase/admin";
import type { WholesaleClient } from "@/types/wholesale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(7).max(20),
  shopName: z.string().min(2).max(120),
  address: z.string().min(2).max(300),
  telegramUsername: z.string().max(60).optional(),
  note: z.string().max(300).optional(),
});

const patchSchema = z.union([
  z.object({ id: z.string().min(1), action: z.literal("update"), data: createSchema.partial() }),
  z.object({ id: z.string().min(1), action: z.literal("regenerate") }),
  z.object({ id: z.string().min(1), action: z.literal("status"), status: z.enum(["invited", "active", "blocked"]) }),
  z.object({
    id: z.string().min(1),
    action: z.literal("invite"),
    telegram: z.boolean().optional(),
    sms: z.boolean().optional(),
    email: z.boolean().optional(),
    emailAddress: z.string().email().optional(),
  }),
]);

/** "products" emas, "users" huquqi: optom mijoz - foydalanuvchi masalasi. */
const PERMISSION = "users" as const;

export async function GET(request: Request) {
  const admin = await requirePermission(PERMISSION, request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  return NextResponse.json({ clients: await listWholesaleClients() });
}

export async function POST(request: Request) {
  const admin = await requirePermission(PERMISSION, request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  try {
    const client = await createWholesaleClient(parsed.data);
    await notifyStaff(
      `🆕 <b>Optom mijoz qo'shildi</b>\n\n№${client.number} • ${client.shopName}\n` +
        `${client.name} • +${client.phone}\nKalit: <code>${client.accessKey}</code>`
    );
    return NextResponse.json({ client });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Xatolik." },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const admin = await requirePermission(PERMISSION, request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "So'rov noto'g'ri." }, { status: 400 });

  const snapshot = await getAdminDb().collection("wholesaleClients").doc(parsed.data.id).get();
  if (!snapshot.exists) return NextResponse.json({ error: "Mijoz topilmadi." }, { status: 404 });
  const client = { id: snapshot.id, ...snapshot.data() } as WholesaleClient;

  switch (parsed.data.action) {
    case "update":
      await updateWholesaleClient(client.id, parsed.data.data);
      break;
    case "regenerate": {
      const accessKey = await regenerateKey(client.id);
      return NextResponse.json({ accessKey });
    }
    case "status":
      await updateWholesaleClient(client.id, { status: parsed.data.status });
      break;
    case "invite": {
      const result = await sendInvite(client, {
        telegram: parsed.data.telegram,
        sms: parsed.data.sms,
        email: parsed.data.email,
        email_address: parsed.data.emailAddress,
      });
      return NextResponse.json({ result, text: inviteText(client) });
    }
  }

  const updated = await snapshot.ref.get();
  return NextResponse.json({ client: { id: updated.id, ...updated.data() } });
}

export async function DELETE(request: Request) {
  const admin = await requirePermission(PERMISSION, request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID kerak." }, { status: 400 });

  await deleteWholesaleClient(id);
  return NextResponse.json({ ok: true });
}

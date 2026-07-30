"use client";

import { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Alert,
  IconButton,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  PERMISSION_HINTS,
  DEFAULT_ADMIN_PERMISSIONS,
  allPermissions,
  isOwner,
  type AdminPermissions,
  type PermissionKey,
} from "@/lib/permissions";
import type { AppUser } from "@/types/user";

/** Serverdan keladigan qo'shimcha maydonlar (buyurtma statistikasi). */
interface EnrichedUser extends AppUser {
  ordersCount?: number;
  totalSpent?: number;
  lastOrderAt?: number | null;
  source?: "telegram" | "site";
}

/** Sana - locale'ga bog'liq bo'lmasin uchun qo'lda formatlanadi. */
function formatDate(ms?: number | null): string {
  if (!ms) return "—";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

interface UsersPage {
  users: AppUser[];
  nextCursor: number | null;
  error?: string;
}

async function fetchUsersPage(cursor: number | null): Promise<UsersPage> {
  const res = await fetch(`/api/admin/users${cursor ? `?cursor=${cursor}` : ""}`, { cache: "no-store" });
  const data = (await res.json()) as UsersPage;
  if (!res.ok) throw new Error(data.error ?? "Foydalanuvchilarni yuklab bo'lmadi.");
  return data;
}

/**
 * Foydalanuvchilar va rollar. O'qish ham, rol/huquq o'zgartirish ham
 * server API orqali (/api/admin/users) - client Firestore ishlatilmaydi,
 * chunki admin panelda client auth sessiyasi tiklanmaydi.
 */
export function AdminUsersTable({ viewerIsOwner }: { viewerIsOwner: boolean }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permTarget, setPermTarget] = useState<AppUser | null>(null);
  const [permDraft, setPermDraft] = useState<AdminPermissions>({});

  useEffect(() => {
    let cancelled = false;
    fetchUsersPage(null)
      .then((page) => {
        if (cancelled) return;
        setUsers(page.users);
        setCursor(page.nextCursor);
        setHasMore(page.nextCursor !== null);
      })
      // Xato bo'lsa ham spinner to'xtaydi - sahifa cheksiz aylanmasin.
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Xatolik.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = async () => {
    setIsLoading(true);
    try {
      const page = await fetchUsersPage(cursor);
      setUsers((prev) => [...prev, ...page.users]);
      setCursor(page.nextCursor);
      setHasMore(page.nextCursor !== null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik.");
    } finally {
      setIsLoading(false);
    }
  };

  const patchUser = async (uid: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/users/${uid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Amalni bajarib bo'lmadi.");
    }
  };

  const toggleRole = async (user: AppUser) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    setUpdatingUid(user.uid);
    setError(null);
    try {
      await patchUser(user.uid, { role: newRole });
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === user.uid
            ? {
                ...u,
                role: newRole,
                permissions: newRole === "admin" ? (u.permissions ?? DEFAULT_ADMIN_PERMISSIONS) : {},
              }
            : u
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik.");
    } finally {
      setUpdatingUid(null);
    }
  };

  const savePermissions = async () => {
    if (!permTarget) return;
    setUpdatingUid(permTarget.uid);
    setError(null);
    try {
      await patchUser(permTarget.uid, { permissions: permDraft });
      setUsers((prev) => prev.map((u) => (u.uid === permTarget.uid ? { ...u, permissions: permDraft } : u)));
      setPermTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik.");
    } finally {
      setUpdatingUid(null);
    }
  };

  const deleteUser = async (user: AppUser) => {
    if (!confirm(`${user.email ?? "Foydalanuvchi"} butunlay o'chirilsinmi?`)) return;
    setUpdatingUid(user.uid);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.uid}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "O'chirib bo'lmadi.");
      }
      setUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik.");
    } finally {
      setUpdatingUid(null);
    }
  };

  return (
    <div>
      {!viewerIsOwner && (
        <Alert severity="info" className="!mb-4">
          Rol va huquqlarni loyiha egasi yoki &quot;Rollar va huquqlar&quot; huquqi berilgan admin
          o&apos;zgartira oladi.
        </Alert>
      )}
      {error && <Alert severity="error" className="!mb-4">{error}</Alert>}

      <div className="overflow-x-auto rounded-xl2 border border-navy-100 dark:border-navy-500">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-navy-50 text-navy-300 dark:bg-navy-900">
            <tr>
              <th className="px-4 py-2 font-medium">Foydalanuvchi</th>
              <th className="px-4 py-2 font-medium">Aloqa</th>
              <th className="px-4 py-2 font-medium">Ro&apos;yxatdan</th>
              <th className="px-4 py-2 font-medium">Buyurtmalar</th>
              <th className="px-4 py-2 font-medium">Rol</th>
              {viewerIsOwner && <th className="px-4 py-2 font-medium">Amal</th>}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-navy-700">
            {!isLoading && users.length === 0 && (
              <tr>
                <td colSpan={viewerIsOwner ? 6 : 5} className="px-4 py-6 text-center text-navy-300">
                  Foydalanuvchilar topilmadi.
                </td>
              </tr>
            )}
            {users.map((user) => {
              const targetIsOwner = isOwner(user);
              const busy = updatingUid === user.uid;
              return (
                <tr key={user.uid} className="border-t border-navy-100 dark:border-navy-500">
                  <td className="flex items-center gap-2 px-4 py-2">
                    <Avatar src={user.photoURL ?? undefined} sx={{ width: 28, height: 28 }}>
                      {user.displayName?.[0] ?? user.email?.[0] ?? "U"}
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-navy-900 dark:text-white">
                        {user.displayName?.trim() || user.email?.split("@")[0] || "Nomsiz"}
                      </p>
                      <p className="text-xs text-navy-300">
                        {(user as EnrichedUser).source === "telegram" ? "✈️ Telegram" : "🌐 Sayt"}
                        {user.telegramUsername ? ` · @${user.telegramUsername}` : ""}
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-2 text-xs">
                    <p className="text-navy-500 dark:text-navy-100">{user.email ?? "—"}</p>
                    <p className="text-navy-300">{user.phoneNumber ?? "—"}</p>
                  </td>

                  <td className="px-4 py-2 text-xs text-navy-500 dark:text-navy-100">
                    {formatDate(user.createdAt)}
                  </td>

                  <td className="px-4 py-2 text-xs">
                    <p className="text-navy-900 dark:text-white">
                      {(user as EnrichedUser).ordersCount ?? 0} ta
                    </p>
                    {((user as EnrichedUser).totalSpent ?? 0) > 0 && (
                      <p className="text-navy-300">
                        {((user as EnrichedUser).totalSpent ?? 0).toLocaleString("uz-UZ")} so&apos;m
                      </p>
                    )}
                    {(user as EnrichedUser).lastOrderAt ? (
                      <p className="text-navy-300">
                        oxirgi: {formatDate((user as EnrichedUser).lastOrderAt)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-2">
                    <Chip
                      size="small"
                      label={targetIsOwner ? "owner" : user.role}
                      color={targetIsOwner ? "secondary" : user.role === "admin" ? "primary" : "default"}
                    />
                  </td>
                  {viewerIsOwner && (
                    <td className="px-4 py-2">
                      {targetIsOwner ? (
                        <span className="text-xs text-navy-300">Loyiha egasi</span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1">
                          <Button size="small" disabled={busy} onClick={() => toggleRole(user)}>
                            {user.role === "admin" ? "Adminlikdan olish" : "Admin qilish"}
                          </Button>
                          {user.role === "admin" && (
                            <IconButton
                              size="small"
                              aria-label="Huquqlar"
                              disabled={busy}
                              onClick={() => {
                                setPermTarget(user);
                                setPermDraft(user.permissions ?? DEFAULT_ADMIN_PERMISSIONS);
                              }}
                            >
                              <TuneOutlinedIcon fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton size="small" aria-label="O'chirish" disabled={busy} onClick={() => deleteUser(user)}>
                            <DeleteOutlineIcon fontSize="small" className="text-red-400" />
                          </IconButton>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isLoading && (
        <div className="flex justify-center py-6">
          <CircularProgress size={24} />
        </div>
      )}

      {!isLoading && hasMore && (
        <div className="flex justify-center py-4">
          <Button onClick={loadMore}>Ko&apos;proq yuklash</Button>
        </div>
      )}

      {/* Admin huquqlarini sozlash (owner uchun) */}
      <Dialog open={permTarget !== null} onClose={() => setPermTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Admin huquqlari</DialogTitle>
        <DialogContent>
          <p className="mb-1 text-sm text-navy-900 dark:text-white">
            {permTarget?.displayName ?? permTarget?.email}
          </p>
          <p className="mb-3 text-xs text-navy-300">{permTarget?.email ?? permTarget?.phoneNumber}</p>

          <div className="mb-2 flex gap-2">
            <Button size="small" onClick={() => setPermDraft(allPermissions())}>
              Hammasini yoqish
            </Button>
            <Button size="small" onClick={() => setPermDraft({})}>
              Hammasini o&apos;chirish
            </Button>
          </div>

          <div className="flex flex-col">
            {PERMISSION_KEYS.map((key: PermissionKey) => (
              <div key={key} className="border-b border-navy-50 py-1 last:border-0 dark:border-navy-600">
                <FormControlLabel
                  control={
                    <Switch
                      checked={permDraft[key] === true}
                      onChange={(e) => setPermDraft((prev) => ({ ...prev, [key]: e.target.checked }))}
                    />
                  }
                  label={PERMISSION_LABELS[key]}
                />
                {PERMISSION_HINTS[key] && (
                  <p className="ml-11 text-xs text-navy-300">{PERMISSION_HINTS[key]}</p>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermTarget(null)}>Bekor qilish</Button>
          <Button variant="contained" onClick={savePermissions} disabled={updatingUid === permTarget?.uid}>
            Saqlash
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

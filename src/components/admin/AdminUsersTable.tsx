"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  updateDoc,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { Avatar, Button, Chip, CircularProgress } from "@mui/material";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { AppUser } from "@/types/user";

const PAGE_SIZE = 20;

export function AdminUsersTable() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  const fetchPage = async (afterCursor: QueryDocumentSnapshot<DocumentData> | null) => {
    const constraints: QueryConstraint[] = [orderBy("createdAt", "desc"), limit(PAGE_SIZE)];
    if (afterCursor) constraints.push(startAfter(afterCursor));
    const snapshot = await getDocs(query(collection(getFirebaseDb(), "users"), ...constraints));
    return {
      users: snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }) as AppUser),
      lastCursor: snapshot.docs.at(-1) ?? null,
      hasMore: snapshot.docs.length === PAGE_SIZE,
    };
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const page = await fetchPage(null);
      if (cancelled) return;
      setUsers(page.users);
      setCursor(page.lastCursor);
      setHasMore(page.hasMore);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = async () => {
    setIsLoading(true);
    const page = await fetchPage(cursor);
    setUsers((prev) => [...prev, ...page.users]);
    setCursor(page.lastCursor);
    setHasMore(page.hasMore);
    setIsLoading(false);
  };

  const toggleRole = async (user: AppUser) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    setUpdatingUid(user.uid);
    try {
      await updateDoc(doc(getFirebaseDb(), "users", user.uid), { role: newRole });
      setUsers((prev) => prev.map((u) => (u.uid === user.uid ? { ...u, role: newRole } : u)));
    } finally {
      setUpdatingUid(null);
    }
  };

  return (
    <div>
      <div className="overflow-hidden rounded-xl2 border border-navy-100 dark:border-navy-500">
        <table className="w-full text-left text-sm">
          <thead className="bg-navy-50 text-navy-300 dark:bg-navy-900">
            <tr>
              <th className="px-4 py-2 font-medium">Foydalanuvchi</th>
              <th className="px-4 py-2 font-medium">Rol</th>
              <th className="px-4 py-2 font-medium">Amal</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-navy-700">
            {users.map((user) => (
              <tr key={user.uid} className="border-t border-navy-100 dark:border-navy-500">
                <td className="flex items-center gap-2 px-4 py-2">
                  <Avatar src={user.photoURL ?? undefined} sx={{ width: 28, height: 28 }}>
                    {user.displayName?.[0] ?? user.email?.[0] ?? "U"}
                  </Avatar>
                  <div>
                    <p className="text-navy-900 dark:text-white">{user.displayName ?? "Nomsiz"}</p>
                    <p className="text-xs text-navy-300">{user.email}</p>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <Chip size="small" label={user.role} color={user.role === "admin" ? "primary" : "default"} />
                </td>
                <td className="px-4 py-2">
                  <Button size="small" disabled={updatingUid === user.uid} onClick={() => toggleRole(user)}>
                    {user.role === "admin" ? "Adminlikdan olish" : "Admin qilish"}
                  </Button>
                </td>
              </tr>
            ))}
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
    </div>
  );
}

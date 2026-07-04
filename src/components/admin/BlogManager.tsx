"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import type { BlogPost } from "@/types/content";

const EMPTY = { title: "", excerpt: "", content: "", coverImageUrl: "", isPublished: true };

export function BlogManager({ initialPosts }: { initialPosts: BlogPost[] }) {
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [editing, setEditing] = useState<BlogPost | null | undefined>(undefined);
  const [form, setForm] = useState(EMPTY);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openNew = () => {
    setForm(EMPTY);
    setImageFile(null);
    setError(null);
    setEditing(null);
  };

  const openEdit = (post: BlogPost) => {
    setForm({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      coverImageUrl: post.coverImageUrl,
      isPublished: post.isPublished,
    });
    setImageFile(null);
    setError(null);
    setEditing(post);
  };

  const handleSave = async () => {
    setError(null);
    if (!form.title.trim()) {
      setError("Sarlavha kiriting.");
      return;
    }
    setIsSaving(true);
    try {
      let coverImageUrl = form.coverImageUrl;
      if (imageFile) {
        const fd = new FormData();
        fd.append("folder", "blog");
        fd.append("files", imageFile);
        const up = await fetch("/api/admin/upload", { method: "POST", body: fd });
        if (!up.ok) throw new Error((await up.json().catch(() => ({}))).error ?? "Rasm yuklanmadi.");
        coverImageUrl = (await up.json()).urls?.[0] ?? "";
      }

      const payload = { ...form, coverImageUrl };
      const res = editing?.id
        ? await fetch(`/api/admin/blog/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/blog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Saqlashda xatolik.");

      const { post: saved } = await res.json();
      setPosts((prev) => {
        const exists = prev.some((p) => p.id === saved.id);
        return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
      });
      setEditing(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saqlashda xatolik.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Maqolani o'chirishni tasdiqlaysizmi?")) return;
    const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    if (res.ok) setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Blog</h1>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>Yangi maqola</Button>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-navy-300">Hozircha maqolalar yo&apos;q.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <div key={post.id} className="flex items-center gap-3 rounded-xl2 border border-navy-100 bg-white p-3 dark:border-navy-500 dark:bg-navy-700">
              <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-navy-50 dark:bg-navy-900">
                {post.coverImageUrl && <Image src={post.coverImageUrl} alt={post.title} fill sizes="80px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-medium text-navy-900 dark:text-white">{post.title}</p>
                <p className="line-clamp-1 text-xs text-navy-300">{post.excerpt}</p>
              </div>
              <Chip size="small" label={post.isPublished ? "Chop etilgan" : "Qoralama"} color={post.isPublished ? "success" : "default"} />
              <IconButton size="small" aria-label="Tahrirlash" onClick={() => openEdit(post)}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" aria-label="O'chirish" onClick={() => handleDelete(post.id)}>
                <DeleteOutlineIcon fontSize="small" className="text-red-400" />
              </IconButton>
            </div>
          ))}
        </div>
      )}

      <Dialog open={editing !== undefined} onClose={() => setEditing(undefined)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? "Maqolani tahrirlash" : "Yangi maqola"}</DialogTitle>
        <DialogContent className="flex flex-col gap-4 pt-2">
          <TextField label="Sarlavha" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth />
          <TextField label="Qisqa tavsif" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} multiline minRows={2} fullWidth />
          <TextField label="Matn" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} multiline minRows={5} fullWidth />

          <div className="flex items-center gap-3">
            <div className="relative h-16 w-24 overflow-hidden rounded-md bg-navy-50 dark:bg-navy-900">
              {imageFile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={URL.createObjectURL(imageFile)} alt="oldindan" className="h-full w-full object-cover" />
              ) : form.coverImageUrl ? (
                <Image src={form.coverImageUrl} alt="cover" fill sizes="96px" className="object-cover" />
              ) : null}
            </div>
            <Button component="label" variant="outlined" size="small">
              Muqova rasmi
              <input type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
            </Button>
          </div>

          <FormControlLabel
            control={<Switch checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />}
            label="Chop etish"
          />

          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(undefined)}>Bekor qilish</Button>
          <Button onClick={handleSave} variant="contained" disabled={isSaving}>
            {isSaving ? <CircularProgress size={20} color="inherit" /> : "Saqlash"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

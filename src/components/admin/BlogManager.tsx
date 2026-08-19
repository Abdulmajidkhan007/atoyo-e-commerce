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
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { DEFAULT_BLOG_DESTINATIONS, type BlogDestinations, type BlogPost } from "@/types/content";

const EMPTY = {
  title: "",
  excerpt: "",
  content: "",
  coverImageUrl: "",
  /** Kontent videosi (mahsulot videosi emas) - YouTube va kanalga ketadi. */
  videoUrl: "",
  isPublished: true,
  /** Maqola qayerga yuborilsin (har maqolada alohida tanlanadi). */
  destinations: DEFAULT_BLOG_DESTINATIONS,
};

/** Yo'nalish belgilari - tartibi va izohi bilan. */
const DESTINATIONS: { key: keyof BlogDestinations; label: string; hint: string }[] = [
  { key: "telegram", label: "Telegram kanal", hint: "video bo'lsa video posti bo'lib chiqadi" },
  { key: "youtube", label: "YouTube", hint: "faqat VIDEO bo'lsa (Shorts)" },
  { key: "instagram", label: "Instagram", hint: "muqova rasmi yoki video kerak" },
  { key: "facebook", label: "Facebook", hint: "muqova rasmi yoki video kerak" },
];

/** Video 20MB gacha (server ham shuni tekshiradi). */
const MAX_VIDEO_MB = 20;

export function BlogManager({ initialPosts }: { initialPosts: BlogPost[] }) {
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [editing, setEditing] = useState<BlogPost | null | undefined>(undefined);
  const [form, setForm] = useState(EMPTY);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInserting, setIsInserting] = useState(false);

  // Matn ichiga rasm qo'yish: fayl Storage'ga yuklanadi va matn oxiriga
  // [rasm:URL] belgisi qo'shiladi - public sahifa uni <img> qilib chizadi.
  const handleInsertImage = async (file: File | null) => {
    if (!file) return;
    setIsInserting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("folder", "blog");
      fd.append("files", file);
      const up = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!up.ok) throw new Error((await up.json().catch(() => ({}))).error ?? "Rasm yuklanmadi.");
      const url = (await up.json()).urls?.[0];
      if (url) setForm((prev) => ({ ...prev, content: `${prev.content}\n\n[rasm:${url}]\n\n` }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rasm yuklashda xatolik.");
    } finally {
      setIsInserting(false);
    }
  };

  const openNew = () => {
    setForm(EMPTY);
    setImageFile(null);
    setVideoFile(null);
    setNote(null);
    setError(null);
    setEditing(null);
  };

  const openEdit = (post: BlogPost) => {
    setForm({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      coverImageUrl: post.coverImageUrl,
      videoUrl: post.videoUrl ?? "",
      isPublished: post.isPublished,
      // Eski maqolalarda bu maydon yo'q - standart yo'nalishlar.
      destinations: post.destinations ?? DEFAULT_BLOG_DESTINATIONS,
    });
    setImageFile(null);
    setVideoFile(null);
    setNote(null);
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

      // KONTENT VIDEOSI: Storage'ga yuklanadi, keyin server uni
      // kanalga video posti qilib chiqaradi va YouTube navbatiga
      // qo'yadi (YouTube yoqilgan bo'lsa).
      let videoUrl = form.videoUrl;
      if (videoFile) {
        if (videoFile.size > MAX_VIDEO_MB * 1024 * 1024) {
          throw new Error(`Video ${MAX_VIDEO_MB}MB dan katta bo'lmasin.`);
        }
        const fd = new FormData();
        fd.append("folder", "blog");
        fd.append("kind", "video");
        fd.append("files", videoFile);
        const up = await fetch("/api/admin/upload", { method: "POST", body: fd });
        if (!up.ok) throw new Error((await up.json().catch(() => ({}))).error ?? "Video yuklanmadi.");
        videoUrl = (await up.json()).urls?.[0] ?? "";
      }

      const payload = { ...form, coverImageUrl, videoUrl };
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

      const { post: saved, socialQueued } = await res.json();
      setNote(
        socialQueued > 0
          ? `Saqlandi. ${socialQueued} ta ijtimoiy tarmoq navbatiga qo'shildi (Sozlamalar > Ijtimoiy tarmoqlar).`
          : null
      );
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

      {/* Oyna yopilgandan keyin ko'rinadi - shuning uchun ro'yxat ustida. */}
      {note && (
        <Alert severity="success" className="mb-4" onClose={() => setNote(null)}>
          {note}
        </Alert>
      )}

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
          <TextField label="Matn" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} multiline minRows={8} fullWidth />
          <div className="flex items-center gap-2">
            <Button component="label" size="small" variant="outlined" startIcon={<AddPhotoAlternateOutlinedIcon />} disabled={isInserting}>
              {isInserting ? <CircularProgress size={16} /> : "Matnga rasm qo'shish"}
              <input type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => handleInsertImage(e.target.files?.[0] ?? null)} />
            </Button>
            <span className="text-xs text-navy-300">Bo&apos;sh qator - yangi paragraf</span>
          </div>

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

          {/* KONTENT VIDEOSI - mahsulot videosi emas: maslahat,
              ko'rsatma, do'kon lavhasi. Chop etilganda kanalga video
              posti bo'lib chiqadi va YouTube'ga (Shorts) yuklanadi. */}
          <div className="flex flex-col gap-2 rounded-xl2 border border-navy-100 p-3 dark:border-navy-500">
            <div className="flex items-center gap-3">
              <Button component="label" variant="outlined" size="small" startIcon={<VideocamOutlinedIcon />}>
                Kontent videosi
                <input
                  type="file"
                  hidden
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                />
              </Button>
              {(videoFile || form.videoUrl) && (
                <span className="line-clamp-1 text-xs text-navy-300">
                  {videoFile ? videoFile.name : "Video biriktirilgan"}
                </span>
              )}
              {form.videoUrl && !videoFile && (
                <Button size="small" color="error" onClick={() => setForm({ ...form, videoUrl: "" })}>
                  Olib tashlash
                </Button>
              )}
            </div>
            <p className="text-xs text-navy-300">
              Mahsulot videosi emas — maslahat/ko&apos;rsatma videosi. Chop etilganda
              Telegram kanaliga video bo&apos;lib chiqadi va YouTube&apos;ga (Shorts)
              navbat orqali yuklanadi. {MAX_VIDEO_MB}MB gacha.
            </p>
          </div>

          {/* QAYERGA YUBORILADI. Ilgari yo'nalish qat'iy edi (Telegram +
              video bo'lsa YouTube); endi har maqolada tanlanadi. Tarmoq
              Sozlamalarda ham yoqilgan bo'lishi shart. */}
          <div className="flex flex-col gap-1 rounded-xl2 border border-navy-100 p-4 dark:border-navy-500">
            <h4 className="mb-1 text-sm font-semibold text-navy-900 dark:text-white">
              Qayerga yuborilsin
            </h4>
            {DESTINATIONS.map(({ key, label, hint }) => (
              <FormControlLabel
                key={key}
                control={
                  <Switch
                    checked={form.destinations[key]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        destinations: { ...form.destinations, [key]: e.target.checked },
                      })
                    }
                  />
                }
                label={
                  <span>
                    {label} <span className="text-xs text-navy-300">— {hint}</span>
                  </span>
                }
              />
            ))}
            <p className="mt-1 text-xs text-navy-300">
              Instagram/Facebook/YouTube uchun avval Sozlamalar &gt; Ijtimoiy tarmoqlar da
              hisob ulangan va tarmoq yoqilgan bo&apos;lishi kerak. Post navbat orqali
              ketadi (kunlik chegara bor).
            </p>
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

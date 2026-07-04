"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  IconButton,
  CircularProgress,
  Alert,
} from "@mui/material";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import CloseIcon from "@mui/icons-material/Close";
import type { Product, ProductCategory, ProductMaterial } from "@/types/product";

const CATEGORY_OPTIONS: { value: ProductCategory; label: string }[] = [
  { value: "pipes", label: "Quvurlar" },
  { value: "fittings", label: "Muftalar" },
  { value: "faucets", label: "Kranlar" },
  { value: "shower-systems", label: "Dush tizimlari" },
  { value: "boilers", label: "Isitish qozonlari" },
  { value: "radiators", label: "Radiatorlar" },
  { value: "pumps", label: "Nasoslar" },
  { value: "sanitary-ware", label: "Santexnika buyumlari" },
];

const MATERIAL_OPTIONS: { value: ProductMaterial; label: string }[] = [
  { value: "polypropylene", label: "Polipropilen" },
  { value: "metal-plastic", label: "Metalplastik" },
  { value: "steel", label: "Po'lat" },
  { value: "copper", label: "Mis" },
  { value: "brass", label: "Latun" },
  { value: "cast-iron", label: "Cho'yan" },
  { value: "pvc", label: "PVX" },
];

const MAX_IMAGES = 10;

interface ProductFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (product: Product) => void;
  /** Berilsa - tahrirlash rejimi, berilmasa - yangi mahsulot yaratish. */
  product?: Product | null;
}

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "pipes" as ProductCategory,
  material: "polypropylene" as ProductMaterial,
  brand: "",
  manufacturerCountry: "",
  price: "",
  discountPrice: "",
  stock: "",
  diameterMm: "",
  lengthMm: "",
  weightKg: "",
};

interface NewImage {
  file: File;
  previewUrl: string;
}

export function ProductFormDialog({ open, onClose, onSaved, product }: ProductFormDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function resetForTarget() {
      if (!open) return;
      setForm(
        product
          ? {
              name: product.name,
              description: product.description,
              category: product.category,
              material: product.material,
              brand: product.brand,
              manufacturerCountry: product.manufacturerCountry,
              price: String(product.price),
              discountPrice: product.discountPrice ? String(product.discountPrice) : "",
              stock: String(product.stock),
              diameterMm: product.dimensions.diameterMm?.toString() ?? "",
              lengthMm: product.dimensions.lengthMm?.toString() ?? "",
              weightKg: product.dimensions.weightKg?.toString() ?? "",
            }
          : EMPTY_FORM
      );
      setExistingImages(product?.images ?? []);
      setNewImages([]);
      setError(null);
    }
    resetForTarget();
  }, [open, product]);

  const totalImages = existingImages.length + newImages.length;

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_IMAGES - totalImages;
    const picked = Array.from(files).slice(0, room);
    setNewImages((prev) => [...prev, ...picked.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))]);
  };

  const handleSave = async () => {
    setError(null);
    if (!form.name.trim() || !form.price || !form.stock) {
      setError("Nomi, narxi va zaxira miqdorini kiriting.");
      return;
    }

    setIsSaving(true);
    try {
      // 1) Yangi rasmlarni serverga yuklaymiz (agar bo'lsa).
      let uploadedUrls: string[] = [];
      if (newImages.length > 0) {
        const folderId = product?.id ?? crypto.randomUUID();
        const fd = new FormData();
        fd.append("productId", folderId);
        newImages.forEach((img) => fd.append("files", img.file));
        const uploadRes = await fetch("/api/admin/upload", { method: "POST", body: fd });
        if (!uploadRes.ok) {
          const body = await uploadRes.json().catch(() => ({}));
          throw new Error(body.error ?? "Rasm yuklashda xatolik.");
        }
        uploadedUrls = (await uploadRes.json()).urls ?? [];
      }

      const images = [...existingImages, ...uploadedUrls].slice(0, MAX_IMAGES);

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        material: form.material,
        brand: form.brand.trim(),
        manufacturerCountry: form.manufacturerCountry.trim(),
        price: Number(form.price),
        discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
        stock: Number(form.stock),
        diameterMm: form.diameterMm ? Number(form.diameterMm) : undefined,
        lengthMm: form.lengthMm ? Number(form.lengthMm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        images,
      };

      // 2) Mahsulotni server API orqali saqlaymiz (Admin SDK - ishonchli).
      const res = product?.id
        ? await fetch(`/api/admin/products/${product.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Saqlashda xatolik.");
      }

      const { product: saved } = await res.json();
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saqlashda xatolik yuz berdi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{product ? "Mahsulotni tahrirlash" : "Yangi mahsulot qo'shish"}</DialogTitle>
      <DialogContent className="flex flex-col gap-4 pt-2">
        <TextField label="Nomi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
        <TextField
          label="Tavsif"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          multiline
          minRows={2}
          fullWidth
        />

        <div className="grid grid-cols-2 gap-3">
          <FormControl size="small" fullWidth>
            <InputLabel id="pf-category">Kategoriya</InputLabel>
            <Select
              labelId="pf-category"
              label="Kategoriya"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as ProductCategory })}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="pf-material">Material</InputLabel>
            <Select
              labelId="pf-material"
              label="Material"
              value={form.material}
              onChange={(e) => setForm({ ...form, material: e.target.value as ProductMaterial })}
            >
              {MATERIAL_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextField size="small" label="Brend" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          <TextField
            size="small"
            label="Ishlab chiqaruvchi davlat"
            value={form.manufacturerCountry}
            onChange={(e) => setForm({ ...form, manufacturerCountry: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <TextField size="small" type="number" label="Narx (so'm)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <TextField size="small" type="number" label="Chegirma narxi" value={form.discountPrice} onChange={(e) => setForm({ ...form, discountPrice: e.target.value })} />
          <TextField size="small" type="number" label="Zaxira (dona)" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <TextField size="small" type="number" label="Diametri (mm)" value={form.diameterMm} onChange={(e) => setForm({ ...form, diameterMm: e.target.value })} />
          <TextField size="small" type="number" label="Uzunligi (mm)" value={form.lengthMm} onChange={(e) => setForm({ ...form, lengthMm: e.target.value })} />
          <TextField size="small" type="number" label="Vazni (kg)" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
        </div>

        {/* Rasmlar galereyasi (1-10 ta) */}
        <div>
          <p className="mb-2 text-sm font-medium text-navy-500 dark:text-navy-100">
            Rasmlar ({totalImages}/{MAX_IMAGES}) — birinchisi asosiy rasm
          </p>
          <div className="flex flex-wrap gap-2">
            {existingImages.map((url, index) => (
              <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-navy-100 dark:border-navy-500">
                <Image src={url} alt={`rasm ${index + 1}`} fill sizes="80px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => setExistingImages((prev) => prev.filter((u) => u !== url))}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                  aria-label="O'chirish"
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </button>
              </div>
            ))}

            {newImages.map((img, index) => (
              <div key={img.previewUrl} className="relative h-20 w-20 overflow-hidden rounded-lg border border-aqua-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.previewUrl} alt={`yangi ${index + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setNewImages((prev) => prev.filter((_, i) => i !== index))}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                  aria-label="O'chirish"
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </button>
              </div>
            ))}

            {totalImages < MAX_IMAGES && (
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-navy-300 text-navy-300 hover:border-aqua-500 hover:text-aqua-500">
                <AddPhotoAlternateOutlinedIcon />
                <span className="text-[10px]">Qo&apos;shish</span>
                <input
                  type="file"
                  hidden
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />
              </label>
            )}
          </div>
        </div>

        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Bekor qilish</Button>
        <Button onClick={handleSave} variant="contained" disabled={isSaving}>
          {isSaving ? <CircularProgress size={20} color="inherit" /> : "Saqlash"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

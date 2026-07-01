"use client";

import { useEffect, useState } from "react";
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
  Avatar,
  CircularProgress,
  Alert,
} from "@mui/material";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { uploadProductImage } from "@/lib/firebase/storage";
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

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-") || "mahsulot"
  );
}

export function ProductFormDialog({ open, onClose, onSaved, product }: ProductFormDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function resetFormForCurrentTarget() {
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
      setImageFile(null);
      setError(null);
    }

    resetFormForCurrentTarget();
  }, [open, product]);

  const handleSave = async () => {
    setError(null);
    if (!form.name.trim() || !form.price || !form.stock) {
      setError("Nomi, narxi va zaxira miqdorini kiriting.");
      return;
    }

    setIsSaving(true);
    try {
      const id = product?.id ?? crypto.randomUUID();

      let thumbnailUrl = product?.thumbnailUrl ?? "";
      let images = product?.images ?? [];
      if (imageFile) {
        thumbnailUrl = await uploadProductImage(id, imageFile);
        images = [thumbnailUrl];
      }

      const now = Date.now();
      const data: Product = {
        id,
        slug: product?.slug ?? `${slugify(form.name)}-${id.slice(0, 6)}`,
        name: form.name.trim(),
        nameSearchIndex: form.name.trim().toLowerCase(),
        description: form.description.trim(),
        category: form.category,
        brand: form.brand.trim(),
        manufacturerCountry: form.manufacturerCountry.trim(),
        material: form.material,
        dimensions: {
          diameterMm: form.diameterMm ? Number(form.diameterMm) : undefined,
          lengthMm: form.lengthMm ? Number(form.lengthMm) : undefined,
          weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        },
        price: Number(form.price),
        discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
        currency: "UZS",
        stock: Number(form.stock),
        images,
        thumbnailUrl,
        isActive: product?.isActive ?? true,
        salesCount: product?.salesCount ?? 0,
        createdAt: product?.createdAt ?? now,
        updatedAt: now,
      };

      await setDoc(doc(getFirebaseDb(), "products", id), data);
      onSaved(data);
      onClose();
    } catch {
      setError("Saqlashda xatolik yuz berdi. Qayta urinib ko'ring.");
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

        <div className="flex items-center gap-3">
          <Avatar
            variant="rounded"
            src={imageFile ? URL.createObjectURL(imageFile) : product?.thumbnailUrl}
            sx={{ width: 56, height: 56 }}
          />
          <Button component="label" variant="outlined" size="small">
            Rasm yuklash
            <input
              type="file"
              hidden
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </Button>
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

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  TextField,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import CloseIcon from "@mui/icons-material/Close";
import {
  BUILTIN_CATEGORIES,
  BUILTIN_MATERIALS,
  BUILTIN_UNITS,
  DEFAULT_UNIT,
  type Taxonomy,
  type TaxonomyKind,
} from "@/lib/products/taxonomy";
import { ProductVariantsEditor } from "./ProductVariantsEditor";
import { AiImagePanel } from "./AiImagePanel";
import { minVariantPrice, normalizeVariants, totalVariantStock } from "@/lib/products/variants";
import type { Product, ProductVariant, VariantAxis } from "@/types/product";

/**
 * Kategoriya / material / sotish turi ro'yxatlari serverdan olinadi:
 * standart turlar + admin qo'shganlari (/admin/katalog/turlar).
 */
const FALLBACK_TAXONOMY: Taxonomy = {
  categories: BUILTIN_CATEGORIES,
  materials: BUILTIN_MATERIALS,
  units: BUILTIN_UNITS,
};

const MAX_IMAGES = 10;

const EMPTY_FORM = {
  name: "",
  sku: "",
  keywords: "",
  description: "",
  category: "",
  material: "",
  unit: DEFAULT_UNIT,
  brand: "",
  manufacturerCountry: "",
  supplier: "",
  price: "",
  costPrice: "",
  discountPrice: "",
  discountUntil: "",
  stock: "",
  diameterMm: "",
  lengthMm: "",
  weightKg: "",
};

interface NewImage {
  file: File;
  previewUrl: string;
}

interface ProductFormProps {
  /** Berilsa - tahrirlash rejimi, berilmasa - yangi mahsulot yaratish. */
  product?: Product | null;
  /** Yangi yaratishda nom maydonini oldindan to'ldirish (kirim qidiruvidan). */
  initialName?: string;
  /**
   * CHERNOVIK rejimi ("Yangi mahsulot ochish"): mahsulot faqat
   * ta'riflanadi - zaxira so'ralmaydi, katalogga chiqmaydi va kanalga
   * e'lon qilinmaydi. U kirim sahifasida paydo bo'ladi, zaxira kelganda
   * nashr bo'ladi.
   */
  draft?: boolean;
  onSaved: (product: Product) => void;
  onCancel: () => void;
}

/**
 * Mahsulot yaratish/tahrirlash formasi - dialog ham (tahrirlash), alohida
 * sahifa ham (/admin/katalog/yangi) shu komponentni ishlatadi, mantiq bir
 * joyda qoladi. Rasmlar avval /api/admin/upload'ga, keyin mahsulot
 * /api/admin/products'ga (Admin SDK bilan, ishonchli) yoziladi.
 */
export function ProductForm({ product, initialName, draft = false, onSaved, onCancel }: ProductFormProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [taxonomy, setTaxonomy] = useState<Taxonomy>(FALLBACK_TAXONOMY);
  /** Ixtiyoriy maydonlar bo'limi yopiq turadi - forma qisqa ko'rinadi. */
  const [showExtra, setShowExtra] = useState(false);
  /** "+" bosilganda: qaysi ro'yxatga yangi tur qo'shilyapti. */
  const [addingKind, setAddingKind] = useState<TaxonomyKind | null>(null);
  const [newTypeLabel, setNewTypeLabel] = useState("");
  const [addingBusy, setAddingBusy] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Turlari (o'lcham/rang/qalinlik) - bo'sh bo'lsa oddiy mahsulot. */
  const [variantAxes, setVariantAxes] = useState<VariantAxis[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const hasVariantRows = variantAxes.length > 0 && variants.length > 0;

  useEffect(() => {
    // Ro'yxatlar admin panelda o'zgarishi mumkin - har ochilganda o'qiymiz.
    fetch("/api/taxonomy")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { taxonomy?: Taxonomy } | null) => {
        if (data?.taxonomy) setTaxonomy(data.taxonomy);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function resetForTarget() {
      setForm(
        product
          ? {
              name: product.name,
              sku: product.sku ?? "",
              keywords: (product.keywords ?? []).join(", "),
              description: product.description,
              category: product.category,
              material: product.material,
              unit: product.unit || DEFAULT_UNIT,
              brand: product.brand,
              manufacturerCountry: product.manufacturerCountry,
              supplier: product.supplier ?? "",
              price: String(product.price),
              costPrice: product.costPrice ? String(product.costPrice) : "",
              discountPrice: product.discountPrice ? String(product.discountPrice) : "",
              discountUntil: product.discountUntil
                ? new Date(product.discountUntil).toISOString().slice(0, 10)
                : "",
              stock: String(product.stock),
              diameterMm: product.dimensions.diameterMm?.toString() ?? "",
              lengthMm: product.dimensions.lengthMm?.toString() ?? "",
              weightKg: product.dimensions.weightKg?.toString() ?? "",
            }
          : { ...EMPTY_FORM, name: initialName ?? "" }
      );
      setExistingImages(product?.images ?? []);
      setNewImages([]);
      setVariantAxes(product?.variantAxes ?? []);
      setVariants(product?.variants ?? []);
      setError(null);
    }
    resetForTarget();
  }, [product, initialName]);

  const totalImages = existingImages.length + newImages.length;

  const unitLabel = taxonomy.units.find((u) => u.slug === form.unit)?.label ?? form.unit;

  /**
   * Ro'yxatda kerakli tur bo'lmasa - shu yerda qo'shiladi ("Turlar"
   * sahifasiga o'tish shart emas) va darhol tanlanadi.
   */
  const addType = async () => {
    const kind = addingKind;
    const label = newTypeLabel.trim();
    if (!kind || label.length < 2) return;

    setAddingBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/taxonomy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, label }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        item?: { slug: string; label: string };
        error?: string;
      };
      if (!res.ok || !data.item) throw new Error(data.error ?? "Qo'shilmadi.");

      const item = data.item;
      setTaxonomy((prev) => ({ ...prev, [kind]: [...prev[kind], item] }));
      setForm((prev) => ({
        ...prev,
        ...(kind === "categories" ? { category: item.slug } : {}),
        ...(kind === "materials" ? { material: item.slug } : {}),
        ...(kind === "units" ? { unit: item.slug } : {}),
      }));
      setAddingKind(null);
      setNewTypeLabel("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yangi tur qo'shilmadi.");
    } finally {
      setAddingBusy(false);
    }
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_IMAGES - totalImages;
    const picked = Array.from(files).slice(0, room);
    setNewImages((prev) => [...prev, ...picked.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))]);
  };

  const handleSave = async () => {
    setError(null);
    // Chernovikda zaxira so'ralmaydi - u kirim orqali keladi.
    // Turlari bo'lsa narx va zaxira har bir tur uchun alohida yoziladi.
    if (hasVariantRows) {
      if (!form.name.trim()) {
        setError("Mahsulot nomini kiriting.");
        return;
      }
      if (variants.some((variant) => variant.price <= 0)) {
        setError("Har bir turning narxini kiriting.");
        return;
      }
    } else if (!form.name.trim() || !form.price || (!draft && !form.stock)) {
      setError(draft ? "Nomi va narxini kiriting." : "Nomi, narxi va zaxira miqdorini kiriting.");
      return;
    }
    if (!form.category || !form.material || !form.unit) {
      setError("Kategoriya, material va sotish turini tanlang.");
      return;
    }

    setIsSaving(true);
    try {
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

      // Turlar ro'yxati saqlashdan oldin qatorlarga qarab tozalanadi:
      // yarim yozilgan qiymatlardan qolgan turlar bazaga tushmaydi.
      const clean = normalizeVariants(variantAxes, variants);

      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        keywords: form.keywords.split(",").map((item) => item.trim()).filter(Boolean),
        description: form.description.trim(),
        category: form.category,
        material: form.material,
        unit: form.unit,
        brand: form.brand.trim(),
        manufacturerCountry: form.manufacturerCountry.trim(),
        supplier: form.supplier.trim(),
        // Turlari bo'lsa: umumiy narx - eng arzon tur, zaxira - yig'indi
        // (katalogdagi filtr va saralash shu maydonlar bilan ishlaydi).
        price: hasVariantRows ? (minVariantPrice({ variants: clean.variants }) ?? 0) : Number(form.price),
        // Tannarx - faqat xodimlarga; foyda hisoboti shunga tayanadi.
        costPrice: form.costPrice ? Number(form.costPrice) : null,
        discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
        // Chegirma muddati kun oxirigacha amal qiladi.
        discountUntil: form.discountUntil ? new Date(`${form.discountUntil}T23:59:59`).getTime() : null,
        stock: hasVariantRows ? totalVariantStock({ variants: clean.variants }) : draft ? 0 : Number(form.stock),
        variantAxes: clean.axes,
        variants: clean.variants,
        ...(draft ? { isDraft: true } : {}),
        diameterMm: form.diameterMm ? Number(form.diameterMm) : undefined,
        lengthMm: form.lengthMm ? Number(form.lengthMm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        images,
      };

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saqlashda xatolik yuz berdi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <TextField
        label="Nomi *"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        fullWidth
      />

      {/* MAXSUS KALIT SO'Z - o'zaro almashtiriladigan mahsulotlarni
          bog'laydi. Ixtiyoriy, lekin qidiruv sifati shunga bog'liq. */}
      <TextField
        size="small"
        label="Maxsus kalit so'zlar (vergul bilan)"
        placeholder="rakovina kalta smesitel, 7013 seriya"
        value={form.keywords}
        onChange={(e) => setForm({ ...form, keywords: e.target.value })}
        helperText="Bir xil vazifadagi mahsulotlarga BIR XIL kalit yozing — mijoz bittasini qidirsa, o'shanga o'xshashlari ham chiqadi va tugab qolganda almashtiruvchisi ko'rsatiladi."
        fullWidth
      />

      <TextField
        size="small"
        label="Kodi / artikul"
        placeholder="HS897"
        value={form.sku}
        onChange={(e) => setForm({ ...form, sku: e.target.value })}
        helperText="Ixtiyoriy. Kod bo'yicha ham qidirish mumkin bo'ladi."
        fullWidth
      />

      {/* Kategoriya / material / sotish turi - majburiy. Ro'yxatda
          kerakli tur bo'lmasa yonidagi "+" bilan darhol qo'shiladi. */}
      <div className="flex items-start gap-2">
        <FormControl size="small" fullWidth required>
          <InputLabel id="pf-category">Kategoriya *</InputLabel>
          <Select
            labelId="pf-category"
            label="Kategoriya *"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {taxonomy.categories.map((item) => (
              <MenuItem key={item.slug} value={item.slug}>{item.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton aria-label="Yangi kategoriya" onClick={() => setAddingKind("categories")} className="!mt-0.5">
          <AddIcon />
        </IconButton>
      </div>

      <div className="flex items-start gap-2">
        <FormControl size="small" fullWidth required>
          <InputLabel id="pf-material">Material *</InputLabel>
          <Select
            labelId="pf-material"
            label="Material *"
            value={form.material}
            onChange={(e) => setForm({ ...form, material: e.target.value })}
          >
            {taxonomy.materials.map((item) => (
              <MenuItem key={item.slug} value={item.slug}>{item.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton aria-label="Yangi material" onClick={() => setAddingKind("materials")} className="!mt-0.5">
          <AddIcon />
        </IconButton>
      </div>

      <div className="flex items-start gap-2">
        <FormControl size="small" fullWidth required>
          <InputLabel id="pf-unit">Sotish turi *</InputLabel>
          <Select
            labelId="pf-unit"
            label="Sotish turi *"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          >
            {taxonomy.units.map((item) => (
              <MenuItem key={item.slug} value={item.slug}>{item.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton aria-label="Yangi sotish turi" onClick={() => setAddingKind("units")} className="!mt-0.5">
          <AddIcon />
        </IconButton>
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

      <TextField
        size="small"
        type="number"
        label={`Tannarx (so'm / ${unitLabel})`}
        value={form.costPrice}
        onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
        helperText="Bizga tushgan narx. Mijozga ko'rinmaydi — foyda hisoboti uchun."
        fullWidth
      />

      {/* Turlari bo'lsa narx va zaxira har bir tur uchun alohida yoziladi. */}
      {!hasVariantRows && (
        <div className="grid grid-cols-2 gap-3">
          <TextField
            size="small"
            type="number"
            label={`Narx (so'm / ${unitLabel}) *`}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          {draft ? (
            <TextField
              size="small"
              label="Zaxira"
              value="Kirim orqali qo'shiladi"
              helperText="Chernovik: zaxira kelganda katalogga chiqadi"
              disabled
            />
          ) : (
            <TextField
              size="small"
              type="number"
              label={`Zaxira (${unitLabel}) *`}
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />
          )}
        </div>
      )}

      <ProductVariantsEditor
        axes={variantAxes}
        variants={variants}
        unitLabel={unitLabel}
        onChange={({ axes, variants: nextVariants }) => {
          setVariantAxes(axes);
          setVariants(nextVariants);
        }}
      />

      {/* Qolgan maydonlar ixtiyoriy - forma qisqa bo'lishi uchun yopiq
          turadi va faqat kerak bo'lganda ochiladi. */}
      <Button
        type="button"
        variant="text"
        size="small"
        onClick={() => setShowExtra((prev) => !prev)}
        className="!w-fit !normal-case"
      >
        {showExtra ? "− Qo'shimcha ma'lumotlarni yopish" : "+ Qo'shimcha ma'lumotlar (ixtiyoriy)"}
      </Button>

      {showExtra && (
        <div className="flex flex-col gap-3 rounded-xl2 border border-navy-100 p-3 dark:border-navy-500">
          <TextField
            size="small"
            label="Tavsif"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            multiline
            minRows={2}
            fullWidth
          />

          <TextField
            size="small"
            label="Kimdan kelgan (yetkazib beruvchi)"
            value={form.supplier}
            onChange={(e) => setForm({ ...form, supplier: e.target.value })}
            fullWidth
          />

          <div className="grid grid-cols-2 gap-3">
            <TextField
              size="small"
              type="number"
              label="Chegirma narxi"
              value={form.discountPrice}
              onChange={(e) => setForm({ ...form, discountPrice: e.target.value })}
            />
            <TextField
              size="small"
              type="date"
              label="Chegirma tugash sanasi"
              value={form.discountUntil}
              onChange={(e) => setForm({ ...form, discountUntil: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <TextField size="small" type="number" label="Diametri (mm)" value={form.diameterMm} onChange={(e) => setForm({ ...form, diameterMm: e.target.value })} />
            <TextField size="small" type="number" label="Uzunligi (mm)" value={form.lengthMm} onChange={(e) => setForm({ ...form, lengthMm: e.target.value })} />
            <TextField size="small" type="number" label="Vazni (kg)" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
          </div>
        </div>
      )}

      {/* Yangi kategoriya/material/sotish turi qo'shish oynasi */}
      <Dialog open={addingKind !== null} onClose={() => setAddingKind(null)} fullWidth maxWidth="xs">
        <DialogTitle>
          {addingKind === "categories"
            ? "Yangi kategoriya"
            : addingKind === "materials"
              ? "Yangi material"
              : "Yangi sotish turi"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nomi"
            value={newTypeLabel}
            onChange={(e) => setNewTypeLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addType();
              }
            }}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddingKind(null)}>Bekor qilish</Button>
          <Button
            variant="contained"
            onClick={addType}
            disabled={addingBusy || newTypeLabel.trim().length < 2}
          >
            {addingBusy ? <CircularProgress size={18} color="inherit" /> : "Qo'shish"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI yordami - faqat saqlangan mahsulotda (rasm serverda turishi kerak). */}
      {product && (
        <AiImagePanel
          productId={product.id}
          hasImage={existingImages.length > 0}
          onSuggestion={(suggestion) =>
            setForm((prev) => ({
              ...prev,
              name: suggestion.name || prev.name,
              description: suggestion.description || prev.description,
              // Kalit so'zlar qo'shiladi (bor yozuv o'chib ketmaydi).
              keywords: Array.from(
                new Set([...prev.keywords.split(",").map((k) => k.trim()).filter(Boolean), ...suggestion.keywords])
              ).join(", "),
              brand: prev.brand || suggestion.brand,
            }))
          }
          onImages={(urls) => setExistingImages((prev) => [...prev, ...urls].slice(0, MAX_IMAGES))}
        />
      )}

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

      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Bekor qilish</Button>
        <Button onClick={handleSave} variant="contained" disabled={isSaving}>
          {isSaving ? (
            <CircularProgress size={20} color="inherit" />
          ) : draft ? (
            "Mahsulotni ochish"
          ) : (
            "Saqlash"
          )}
        </Button>
      </div>
    </div>
  );
}

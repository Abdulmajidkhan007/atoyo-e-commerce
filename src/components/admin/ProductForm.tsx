"use client";

import { useCallback, useEffect, useState } from "react";
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
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ContentPasteOutlinedIcon from "@mui/icons-material/ContentPasteOutlined";
import {
  BUILTIN_CATEGORIES,
  BUILTIN_MATERIALS,
  BUILTIN_UNITS,
  DEFAULT_UNIT,
  type Taxonomy,
  type TaxonomyKind,
} from "@/lib/products/taxonomy";
import { ACCEPTED_IMAGE_TYPES, imagesFromTransfer, shouldPasteAsImage } from "@/lib/files/clipboard";
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
/** Video og'ir bo'lgani uchun 3 tagacha, har biri 20MB gacha. */
const MAX_VIDEOS = 3;

/** Server sxemasidagi chegara (`/api/admin/products`). */
const MAX_KEYWORDS = 10;

/** "+" tugmasi qaysi ro'yxatga qo'shishi mumkin. */
type AddableKind = TaxonomyKind | "brands" | "countries";

/** Yangi qiymat qo'shish oynasidagi sarlavha. */
const ADD_TITLE: Record<AddableKind, string> = {
  categories: "Yangi kategoriya",
  materials: "Yangi material",
  units: "Yangi sotish turi",
  brands: "Yangi brend",
  countries: "Yangi davlat",
};

const EMPTY_FORM = {
  name: "",
  sku: "",
  keywords: "",
  description: "",
  nameRu: "",
  nameEn: "",
  descriptionRu: "",
  descriptionEn: "",
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
  /**
   * Brend va ishlab chiqarilgan davlat ro'yxatlari (`metadata/facets`).
   * Ilgari bu ikkisi QO'LDA yozilardi va bitta brend "Valtec", "VALTEC",
   * "valtek" bo'lib uch xil tushardi. Endi ro'yxatdan tanlanadi,
   * ro'yxat esa "Turlar" bo'limida boshqariladi.
   */
  const [facetOptions, setFacetOptions] = useState<{ brands: string[]; countries: string[] }>({
    brands: [],
    countries: [],
  });
  /** "+" bosilganda: qaysi ro'yxatga yangi tur qo'shilyapti. */
  const [addingKind, setAddingKind] = useState<AddableKind | null>(null);
  const [newTypeLabel, setNewTypeLabel] = useState("");
  const [addingBusy, setAddingBusy] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  /**
   * Dona (chakana) ustamasi, foizda. Admin panelga XOS - mijozga
   * beriladigan `/api/pricing` bu qiymatni qaytarmaydi (u ma'lum
   * bo'lsa dona narxdan optom narxni teskari hisoblab olish mumkin).
   */
  const [markupPercent, setMarkupPercent] = useState<number | null>(null);
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  /** Buferdan rasm qo'yilganda chiqadigan qisqa izoh (4 soniya). */
  const [pasteNote, setPasteNote] = useState<string | null>(null);
  /** Videolar: mahsulot sahifasida rasmlardan keyin ko'rsatiladi. */
  const [existingVideos, setExistingVideos] = useState<string[]>([]);
  const [newVideos, setNewVideos] = useState<NewImage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Turlari (o'lcham/rang/qalinlik) - bo'sh bo'lsa oddiy mahsulot. */
  const [variantAxes, setVariantAxes] = useState<VariantAxis[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  /** Mavjud bo'lmagani uchun o'chirilgan kombinatsiyalar (kalitlari). */
  const [variantsExcluded, setVariantsExcluded] = useState<string[]>([]);
  const hasVariantRows = variantAxes.length > 0 && variants.length > 0;

  useEffect(() => {
    // Ro'yxatlar admin panelda o'zgarishi mumkin - har ochilganda o'qiymiz.
    fetch("/api/taxonomy")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { taxonomy?: Taxonomy } | null) => {
        if (data?.taxonomy) setTaxonomy(data.taxonomy);
      })
      .catch(() => {});

    // Brend / davlat ro'yxati (admin panelidagi "Turlar" bo'limidan).
    fetch("/api/admin/facets")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { facets?: { brands?: string[]; countries?: string[] } } | null) => {
        if (!data?.facets) return;
        setFacetOptions({
          brands: data.facets.brands ?? [],
          countries: data.facets.countries ?? [],
        });
      })
      .catch(() => {});

    // Dona ustamasi - "Optom narx" yonida hisoblangan dona narxni
    // ko'rsatish uchun. Faqat admin route'idan olinadi.
    fetch("/api/admin/pricing")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { pricing?: { retailMarkupPercent?: number } } | null) => {
        const value = data?.pricing?.retailMarkupPercent;
        if (typeof value === "number" && value >= 0) setMarkupPercent(value);
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
              nameRu: product.nameRu ?? "",
              nameEn: product.nameEn ?? "",
              descriptionRu: product.descriptionRu ?? "",
              descriptionEn: product.descriptionEn ?? "",
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
      setExistingVideos(product?.videos ?? []);
      setNewVideos([]);
      setVariantAxes(product?.variantAxes ?? []);
      setVariants(product?.variants ?? []);
      setVariantsExcluded(product?.variantsExcluded ?? []);
      setError(null);
    }
    resetForTarget();
  }, [product, initialName]);

  const totalImages = existingImages.length + newImages.length;
  const totalVideos = existingVideos.length + newVideos.length;

  const unitLabel = taxonomy.units.find((u) => u.slug === form.unit)?.label ?? form.unit;

  /**
   * Ro'yxatda yo'q, lekin mahsulotda turgan qiymat ham ko'rinishi kerak
   * (eski mahsulotlar qo'lda yozilgan brend bilan saqlangan) - aks holda
   * tahrirlashda brend jimgina yo'qolib qolardi.
   */
  const withCurrent = (list: string[], current: string) =>
    current && !list.includes(current) ? [current, ...list] : list;
  const brandOptions = withCurrent(facetOptions.brands, form.brand);
  const countryOptions = withCurrent(facetOptions.countries, form.manufacturerCountry);

  /**
   * "Optom narx" maydoni ostidagi izoh: bazaga OPTOM narx yoziladi,
   * mijoz esa ustama qo'shilgan DONA narxni ko'radi. Ilgari maydon
   * shunchaki "Narx" deb turgani uchun chalkashlik chiqqan edi -
   * saytda 70 000 kutilgan, botda esa 78 700 chiqqan.
   */
  const retailHint = (() => {
    const wholesale = Number(form.price);
    if (!Number.isFinite(wholesale) || wholesale <= 0) {
      return "Bazaga OPTOM narx yoziladi. Dona narx ustama bilan o'zi hisoblanadi.";
    }
    if (markupPercent === null) return "Bazaga OPTOM narx yoziladi.";
    const retail = Math.round((wholesale * (1 + markupPercent / 100)) / 100) * 100;
    return `Mijoz ko'radigan DONA narx: ${retail.toLocaleString("uz-UZ")} so'm (ustama ${markupPercent}%). Optom mijoz ${wholesale.toLocaleString("uz-UZ")} so'm ko'radi.`;
  })();

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
      // Brend va davlat boshqa ro'yxatda (`metadata/facets`) turadi va
      // mahsulotda MATNNING o'zi saqlanadi - slug yasalmaydi.
      if (kind === "brands" || kind === "countries") {
        const res = await fetch("/api/admin/facets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, value: label }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Qo'shilmadi.");

        setFacetOptions((prev) => ({
          ...prev,
          [kind]: [...prev[kind], label].sort((a, b) => a.localeCompare(b)),
        }));
        setForm((prev) =>
          kind === "brands" ? { ...prev, brand: label } : { ...prev, manufacturerCountry: label }
        );
        setAddingKind(null);
        setNewTypeLabel("");
        return;
      }

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

  /**
   * Rasm qo'shishning YAGONA yo'li: fayl tanlash ham, buferdan (Ctrl+V)
   * qo'yish ham shu yerdan o'tadi. Nechta rasm qo'shilganini qaytaradi
   * (chegara to'lgan bo'lsa 0).
   */
  const addImageFiles = useCallback(
    (files: File[]) => {
      const room = MAX_IMAGES - existingImages.length - newImages.length;
      if (room <= 0 || files.length === 0) return 0;
      const picked = files.slice(0, room);
      setNewImages((prev) => [
        ...prev,
        ...picked.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
      ]);
      return picked.length;
    },
    [existingImages.length, newImages.length]
  );

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    addImageFiles(Array.from(files));
  };

  // BUFERDAN RASM: sahifaning istalgan joyida Ctrl+V bosilsa rasm
  // qo'shiladi (matn maydoniga matn qo'yish buzilmaydi - `shouldPasteAsImage`).
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      if (!shouldPasteAsImage(event)) return;
      const { files, skipped } = imagesFromTransfer(event.clipboardData);
      if (files.length === 0) {
        if (skipped > 0) setPasteNote("Bu turdagi rasm qabul qilinmaydi (JPEG / PNG / WebP / GIF).");
        return;
      }
      event.preventDefault();
      const added = addImageFiles(files);
      setPasteNote(
        added > 0
          ? `Buferdan ${added} ta rasm qo'shildi.`
          : `Rasmlar to'ldi (${MAX_IMAGES} ta) — avval bittasini o'chiring.`
      );
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [addImageFiles]);

  useEffect(() => {
    if (!pasteNote) return;
    const timer = setTimeout(() => setPasteNote(null), 4000);
    return () => clearTimeout(timer);
  }, [pasteNote]);

  /**
   * "Buferdan qo'yish" tugmasi - Ctrl+V ishlamaydigan holatlar uchun
   * (fokus boshqa oynada, planshet). Brauzer ruxsat so'rashi mumkin.
   */
  const pasteFromClipboard = async () => {
    try {
      const items = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of items) {
        const type = item.types.find((t) => ACCEPTED_IMAGE_TYPES.includes(t));
        if (!type) continue;
        const blob = await item.getType(type);
        const ext = type.split("/")[1] ?? "png";
        files.push(new File([blob], `bufer-${Date.now()}-${files.length + 1}.${ext}`, { type }));
      }
      if (files.length === 0) {
        setPasteNote("Buferda rasm topilmadi.");
        return;
      }
      const added = addImageFiles(files);
      setPasteNote(
        added > 0
          ? `Buferdan ${added} ta rasm qo'shildi.`
          : `Rasmlar to'ldi (${MAX_IMAGES} ta) — avval bittasini o'chiring.`
      );
    } catch {
      setPasteNote("Brauzer buferga ruxsat bermadi — Ctrl+V bosib ko'ring.");
    }
  };

  /** Video tanlash (mahsulot sahifasida va kanal postida ishlatiladi). */
  const handleVideosSelected = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_VIDEOS - totalVideos;
    const picked = Array.from(files).slice(0, room);
    setNewVideos((prev) => [...prev, ...picked.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))]);
  };

  /**
   * MAJBURIY MAYDONLAR: nomi, kodi, tannarx, optom narx, soni,
   * kategoriya (+ sotish turi - u standart "dona" bilan to'la keladi).
   * Material, brend, davlat, tavsif va rasm ixtiyoriy.
   *
   * Turlari (o'lcham/rang) bo'lsa narx va zaxira har bir tur uchun
   * alohida yoziladi, chernovikda esa zaxira kirim orqali keladi.
   */
  const handleSave = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError("Mahsulot nomini kiriting.");
      return;
    }
    if (!form.sku.trim()) {
      setError("Mahsulot kodini (artikul) kiriting.");
      return;
    }
    if (!form.costPrice) {
      setError("Tannarxni (bizga tushgan narx) kiriting.");
      return;
    }
    if (hasVariantRows) {
      if (variants.some((variant) => variant.price <= 0)) {
        setError("Har bir turning narxini kiriting.");
        return;
      }
    } else if (!form.price || (!draft && !form.stock)) {
      setError(draft ? "Optom narxni kiriting." : "Optom narx va soni (zaxira) kiritilishi shart.");
      return;
    }
    if (!form.category || !form.unit) {
      setError("Kategoriya va sotish turini tanlang.");
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

      // Videolar alohida yuboriladi (server ularni video sifatida tekshiradi).
      let uploadedVideos: string[] = [];
      if (newVideos.length > 0) {
        const folderId = product?.id ?? crypto.randomUUID();
        const fd = new FormData();
        fd.append("productId", folderId);
        fd.append("kind", "video");
        newVideos.forEach((item) => fd.append("files", item.file));
        const uploadRes = await fetch("/api/admin/upload", { method: "POST", body: fd });
        if (!uploadRes.ok) {
          const body = await uploadRes.json().catch(() => ({}));
          throw new Error(body.error ?? "Video yuklashda xatolik.");
        }
        uploadedVideos = (await uploadRes.json()).urls ?? [];
      }
      const videos = [...existingVideos, ...uploadedVideos].slice(0, MAX_VIDEOS);

      // Turlar ro'yxati saqlashdan oldin qatorlarga qarab tozalanadi:
      // yarim yozilgan qiymatlardan qolgan turlar bazaga tushmaydi.
      const clean = normalizeVariants(variantAxes, variants, variantsExcluded);

      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        // Server 10 tadan ko'pini rad etadi - shu yerda kesamiz,
        // aks holda saqlash "Ma'lumotlar noto'g'ri" bilan yiqilardi.
        keywords: form.keywords
          .split(",")
          .map((item) => item.trim().slice(0, 60))
          .filter(Boolean)
          .slice(0, MAX_KEYWORDS),
        description: form.description.trim(),
        // Tarjimalar - bo'sh bo'lsa yuborilmaydi (o'zbekchasi ishlatiladi).
        nameRu: form.nameRu.trim() || undefined,
        nameEn: form.nameEn.trim() || undefined,
        descriptionRu: form.descriptionRu.trim() || undefined,
        descriptionEn: form.descriptionEn.trim() || undefined,
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
        variantsExcluded: clean.variantsExcluded,
        ...(draft ? { isDraft: true } : {}),
        diameterMm: form.diameterMm ? Number(form.diameterMm) : undefined,
        lengthMm: form.lengthMm ? Number(form.lengthMm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        images,
        videos,
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
        helperText={`Bir xil vazifadagi mahsulotlarga BIR XIL kalit yozing — mijoz bittasini qidirsa, o'shanga o'xshashlari ham chiqadi va tugab qolganda almashtiruvchisi ko'rsatiladi. ${MAX_KEYWORDS} tagacha.`}
        fullWidth
      />

      <TextField
        size="small"
        label="Kodi / artikul *"
        placeholder="HS897"
        value={form.sku}
        onChange={(e) => setForm({ ...form, sku: e.target.value })}
        helperText="Majburiy. Kod bo'yicha ham qidirish mumkin bo'ladi (sayt, bot, kirim)."
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

      {/* MATERIAL - MAJBURIY EMAS: 1C narxnomasidan kelgan minglab
          mahsulotning materiali noma'lum, shu sabab uni talab qilish
          kirimni to'xtatib qo'yardi. */}
      <div className="flex items-start gap-2">
        <FormControl size="small" fullWidth>
          <InputLabel id="pf-material">Material</InputLabel>
          <Select
            labelId="pf-material"
            label="Material"
            value={form.material}
            onChange={(e) => setForm({ ...form, material: e.target.value })}
          >
            <MenuItem value="">
              <em>— tanlanmagan —</em>
            </MenuItem>
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

      {/* BREND va DAVLAT - ro'yxatdan (qo'lda yozilmaydi: bir nom uch
          xil yozilib ketmasin). Ro'yxatda yo'q bo'lsa yonidagi "+" bilan
          qo'shiladi va darhol tanlanadi. */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-start gap-1">
          <FormControl size="small" fullWidth>
            <InputLabel id="pf-brand">Brend</InputLabel>
            <Select
              labelId="pf-brand"
              label="Brend"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
            >
              <MenuItem value="">
                <em>— tanlanmagan —</em>
              </MenuItem>
              {brandOptions.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <IconButton aria-label="Yangi brend" onClick={() => setAddingKind("brands")} className="!mt-0.5">
            <AddIcon />
          </IconButton>
        </div>

        <div className="flex items-start gap-1">
          <FormControl size="small" fullWidth>
            <InputLabel id="pf-country">Ishlab chiqarilgan davlat</InputLabel>
            <Select
              labelId="pf-country"
              label="Ishlab chiqarilgan davlat"
              value={form.manufacturerCountry}
              onChange={(e) => setForm({ ...form, manufacturerCountry: e.target.value })}
            >
              <MenuItem value="">
                <em>— tanlanmagan —</em>
              </MenuItem>
              {countryOptions.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <IconButton
            aria-label="Yangi davlat"
            onClick={() => setAddingKind("countries")}
            className="!mt-0.5"
          >
            <AddIcon />
          </IconButton>
        </div>
      </div>

      <TextField
        size="small"
        type="number"
        label={`Tannarx (so'm / ${unitLabel}) *`}
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
            label={`Optom narx (so'm / ${unitLabel}) *`}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            helperText={retailHint}
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
        excluded={variantsExcluded}
        unitLabel={unitLabel}
        onChange={({ axes, variants: nextVariants, excluded }) => {
          setVariantAxes(axes);
          setVariants(nextVariants);
          setVariantsExcluded(excluded);
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

          {/* TARJIMALAR. Mijozlarning katta qismi ruschada qidiradi;
              bo'sh qoldirilsa o'zbekchasi ko'rsatiladi va hech narsa
              buzilmaydi. Ruscha nom qidiruvga ham tushadi. */}
          <div className="flex flex-col gap-3 rounded-lg border border-dashed border-navy-200 p-3 dark:border-navy-500">
            <p className="text-xs font-medium text-navy-500 dark:text-navy-100">
              Tarjimalar (ixtiyoriy) — bo&apos;sh qoldirsangiz o&apos;zbekchasi ko&apos;rinadi
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <TextField
                size="small"
                label="Nomi (ruscha)"
                placeholder="Смеситель для кухни"
                value={form.nameRu}
                onChange={(e) => setForm({ ...form, nameRu: e.target.value })}
              />
              <TextField
                size="small"
                label="Nomi (inglizcha)"
                placeholder="Kitchen faucet"
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
              />
            </div>
            <TextField
              size="small"
              label="Tavsif (ruscha)"
              value={form.descriptionRu}
              onChange={(e) => setForm({ ...form, descriptionRu: e.target.value })}
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              size="small"
              label="Tavsif (inglizcha)"
              value={form.descriptionEn}
              onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
              multiline
              minRows={2}
              fullWidth
            />
          </div>

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
              label="Chegirma narxi (optom)"
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
        <DialogTitle>{addingKind ? ADD_TITLE[addingKind] : ""}</DialogTitle>
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
          onSuggestion={(suggestion) => {
            // Tarjimalar "Qo'shimcha ma'lumotlar" ichida - yopiq
            // turgan bo'lsa admin AI nima yozganini ko'rmaydi.
            if (suggestion.nameRu || suggestion.descriptionRu) setShowExtra(true);
            setForm((prev) => ({
              ...prev,
              name: suggestion.name || prev.name,
              description: suggestion.description || prev.description,
              // Kalit so'zlar qo'shiladi (bor yozuv o'chib ketmaydi).
              keywords: Array.from(
                new Set([...prev.keywords.split(",").map((k) => k.trim()).filter(Boolean), ...suggestion.keywords])
              )
                .slice(0, MAX_KEYWORDS)
                .join(", "),
              brand: prev.brand || suggestion.brand,
              // Tarjimalar: qo'lda yozilgani bo'lsa TEGILMAYDI.
              nameRu: prev.nameRu || (suggestion.nameRu ?? ""),
              nameEn: prev.nameEn || (suggestion.nameEn ?? ""),
              descriptionRu: prev.descriptionRu || (suggestion.descriptionRu ?? ""),
              descriptionEn: prev.descriptionEn || (suggestion.descriptionEn ?? ""),
            }));
          }}
          onImages={(urls) => setExistingImages((prev) => [...prev, ...urls].slice(0, MAX_IMAGES))}
        />
      )}

      {/* Rasmlar galereyasi (1-10 ta) — fayl tanlash yoki buferdan Ctrl+V */}
      <div
        onDrop={(event) => {
          const { files } = imagesFromTransfer(event.dataTransfer);
          if (files.length === 0) return;
          event.preventDefault();
          const added = addImageFiles(files);
          if (added > 0) setPasteNote(`${added} ta rasm qo'shildi.`);
        }}
        onDragOver={(event) => event.preventDefault()}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-navy-500 dark:text-navy-100">
            Rasmlar ({totalImages}/{MAX_IMAGES}) — birinchisi asosiy rasm
          </p>
          <Button
            type="button"
            size="small"
            variant="outlined"
            startIcon={<ContentPasteOutlinedIcon />}
            onClick={pasteFromClipboard}
            disabled={totalImages >= MAX_IMAGES}
            className="!normal-case"
          >
            Buferdan qo&apos;yish
          </Button>
        </div>
        <p className="mb-2 text-xs text-navy-400 dark:text-navy-200">
          Skrinshot yoki nusxalangan rasmni <b>Ctrl+V</b> (Mac: ⌘+V) bilan shu yerga qo&apos;ysa
          ham bo&apos;ladi — faylni saqlab o&apos;tirish shart emas. Rasmni sichqoncha bilan
          sudrab tashlash ham ishlaydi.
        </p>
        {pasteNote && (
          <p className="mb-2 text-xs font-medium text-aqua-600 dark:text-aqua-300">{pasteNote}</p>
        )}
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

      {/* Videolar (0-3 ta) - mahsulot sahifasida rasmlardan keyin turadi */}
      <div>
        <p className="mb-2 text-sm font-medium text-navy-500 dark:text-navy-100">
          Videolar ({totalVideos}/{MAX_VIDEOS}) — ixtiyoriy, har biri 20MB gacha (MP4/MOV/WebM)
        </p>
        <div className="flex flex-wrap gap-2">
          {existingVideos.map((url, index) => (
            <div
              key={url}
              className="relative h-20 w-28 overflow-hidden rounded-lg border border-navy-100 dark:border-navy-500"
            >
              <video src={url} className="h-full w-full object-cover" muted playsInline />
              <button
                type="button"
                onClick={() => setExistingVideos((prev) => prev.filter((item) => item !== url))}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                aria-label={`Videoni o'chirish ${index + 1}`}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </button>
            </div>
          ))}

          {newVideos.map((item, index) => (
            <div
              key={item.previewUrl}
              className="relative h-20 w-28 overflow-hidden rounded-lg border border-aqua-300"
            >
              <video src={item.previewUrl} className="h-full w-full object-cover" muted playsInline />
              <button
                type="button"
                onClick={() => setNewVideos((prev) => prev.filter((_, i) => i !== index))}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                aria-label="O'chirish"
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </button>
            </div>
          ))}

          {totalVideos < MAX_VIDEOS && (
            <label className="flex h-20 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-navy-300 text-navy-300 hover:border-aqua-500 hover:text-aqua-500">
              <VideocamOutlinedIcon />
              <span className="text-[10px]">Video qo&apos;shish</span>
              <input
                type="file"
                hidden
                multiple
                accept="video/mp4,video/quicktime,video/webm"
                onChange={(event) => handleVideosSelected(event.target.files)}
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

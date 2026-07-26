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
  Alert,
  CircularProgress,
} from "@mui/material";
import type { ProductCategory } from "@/types/product";

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

type FilterBy = "all" | "category" | "brand" | "supplier";

const FILTER_LABELS: Record<FilterBy, string> = {
  all: "Barcha mahsulotlar",
  category: "Kategoriya bo'yicha",
  brand: "Brend bo'yicha",
  supplier: "Kimdan kelgani bo'yicha",
};

interface BulkPriceDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * BULK NARX YANGILASH. Mahsulotlar kategoriya, brend yoki yetkazib
 * beruvchi ("kimdan kelgan") bo'yicha tanlanadi - bittasi, chunki
 * shunda Firestore'ga qo'shimcha kompozit indeks kerak bo'lmaydi.
 * Qo'llashdan oldin nechta mahsulotga tegishini ko'rsatadi.
 */
export function BulkPriceDialog({ open, onClose }: BulkPriceDialogProps) {
  const [filterBy, setFilterBy] = useState<FilterBy>("all");
  const [filterValue, setFilterValue] = useState("");
  const [percentage, setPercentage] = useState("");
  const [brands, setBrands] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matched, setMatched] = useState<number | null>(null);
  const [result, setResult] = useState<{ updatedCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Brend va yetkazib beruvchi ro'yxati metadata/facets dan keladi.
  useEffect(() => {
    if (!open) return;
    let active = true;
    fetch("/api/facets")
      .then((res) => res.json())
      .then((data: { brands?: string[]; suppliers?: string[] }) => {
        if (!active) return;
        setBrands(data.brands ?? []);
        setSuppliers(data.suppliers ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [open]);

  const options = filterBy === "brand" ? brands : filterBy === "supplier" ? suppliers : [];

  const post = async (dryRun: boolean) => {
    const percentageChange = Number(percentage);
    if (!dryRun && (!percentage || Number.isNaN(percentageChange))) {
      setError("Foiz qiymatini kiriting (masalan 10 yoki -5).");
      return null;
    }
    if (filterBy !== "all" && !filterValue) {
      setError("Avval qiymatni tanlang.");
      return null;
    }

    const response = await fetch("/api/admin/products/bulk-price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filterBy,
        filterValue: filterBy === "all" ? undefined : filterValue,
        percentageChange: Number.isNaN(percentageChange) ? 0 : percentageChange,
        dryRun,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "failed");
    return data as { updatedCount?: number; matchedCount?: number };
  };

  const handlePreview = async () => {
    setError(null);
    setResult(null);
    setMatched(null);
    setIsSubmitting(true);
    try {
      const data = await post(true);
      if (data) setMatched(data.matchedCount ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setResult(null);
    setIsSubmitting(true);
    try {
      const data = await post(false);
      if (data) setResult({ updatedCount: data.updatedCount ?? 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk yangilashda xatolik yuz berdi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Bulk narx yangilash</DialogTitle>
      <DialogContent className="flex flex-col gap-4 pt-2">
        <p className="text-sm text-navy-300">
          Mahsulotlarni kategoriya, brend yoki kimdan kelgani bo&apos;yicha tanlab, narxini
          foiz nisbatida oshiring yoki kamaytiring.
        </p>

        <FormControl size="small" fullWidth>
          <InputLabel id="bulk-filter">Tanlash usuli</InputLabel>
          <Select
            labelId="bulk-filter"
            label="Tanlash usuli"
            value={filterBy}
            onChange={(e) => {
              setFilterBy(e.target.value as FilterBy);
              setFilterValue("");
              setMatched(null);
              setResult(null);
            }}
          >
            {(Object.keys(FILTER_LABELS) as FilterBy[]).map((key) => (
              <MenuItem key={key} value={key}>
                {FILTER_LABELS[key]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {filterBy === "category" && (
          <FormControl size="small" fullWidth>
            <InputLabel id="bulk-category">Kategoriya</InputLabel>
            <Select
              labelId="bulk-category"
              label="Kategoriya"
              value={filterValue}
              onChange={(e) => {
                setFilterValue(e.target.value);
                setMatched(null);
              }}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {(filterBy === "brand" || filterBy === "supplier") &&
          (options.length > 0 ? (
            <FormControl size="small" fullWidth>
              <InputLabel id="bulk-value">{filterBy === "brand" ? "Brend" : "Kimdan kelgan"}</InputLabel>
              <Select
                labelId="bulk-value"
                label={filterBy === "brand" ? "Brend" : "Kimdan kelgan"}
                value={filterValue}
                onChange={(e) => {
                  setFilterValue(e.target.value);
                  setMatched(null);
                }}
              >
                {options.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            // Ro'yxat hali to'planmagan bo'lsa - qo'lda yozish imkoni.
            <TextField
              size="small"
              label={filterBy === "brand" ? "Brend nomi" : "Kimdan kelgan"}
              value={filterValue}
              onChange={(e) => {
                setFilterValue(e.target.value);
                setMatched(null);
              }}
              helperText="Mahsulot kartasidagi qiymat bilan bir xil yozilishi kerak"
            />
          ))}

        <TextField
          size="small"
          type="number"
          label="Narx o'zgarishi (%)"
          placeholder="Masalan: 10 yoki -5"
          value={percentage}
          onChange={(e) => setPercentage(e.target.value)}
        />

        {error && <Alert severity="error">{error}</Alert>}
        {matched !== null && !result && (
          <Alert severity="info">{matched} ta mahsulot tanlandi. Narxni o&apos;zgartirish uchun &quot;Qo&apos;llash&quot; ni bosing.</Alert>
        )}
        {result && <Alert severity="success">{result.updatedCount} ta mahsulot narxi yangilandi.</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Yopish</Button>
        <Button onClick={handlePreview} disabled={isSubmitting}>
          Nechta?
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={20} color="inherit" /> : "Qo'llash"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

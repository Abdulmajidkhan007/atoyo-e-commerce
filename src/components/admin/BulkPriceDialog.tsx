"use client";

import { useState } from "react";
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

interface BulkPriceDialogProps {
  open: boolean;
  onClose: () => void;
}

export function BulkPriceDialog({ open, onClose }: BulkPriceDialogProps) {
  const [category, setCategory] = useState<ProductCategory | "">("");
  const [percentage, setPercentage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ updatedCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setResult(null);
    const percentageChange = Number(percentage);
    if (!percentage || Number.isNaN(percentageChange)) {
      setError("Foiz qiymatini kiriting (masalan 10 yoki -5).");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/products/bulk-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: category || undefined, percentageChange }),
      });
      if (!response.ok) throw new Error("failed");
      const data = await response.json();
      setResult(data);
    } catch {
      setError("Bulk yangilashda xatolik yuz berdi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Bulk narx yangilash</DialogTitle>
      <DialogContent className="flex flex-col gap-4 pt-2">
        <p className="text-sm text-navy-300">
          Tanlangan kategoriyadagi (yoki barcha) mahsulotlar narxini foiz nisbatida oshiring/kamaytiring.
        </p>

        <FormControl size="small" fullWidth>
          <InputLabel id="bulk-category">Kategoriya</InputLabel>
          <Select
            labelId="bulk-category"
            label="Kategoriya"
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategory | "")}
          >
            <MenuItem value="">Barcha kategoriyalar</MenuItem>
            {CATEGORY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          type="number"
          label="Narx o'zgarishi (%)"
          placeholder="Masalan: 10 yoki -5"
          value={percentage}
          onChange={(e) => setPercentage(e.target.value)}
        />

        {error && <Alert severity="error">{error}</Alert>}
        {result && (
          <Alert severity="success">{result.updatedCount} ta mahsulot narxi yangilandi.</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Yopish</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={20} color="inherit" /> : "Qo'llash"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

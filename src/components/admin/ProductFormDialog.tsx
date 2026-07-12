"use client";

import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { ProductForm } from "./ProductForm";
import type { Product } from "@/types/product";

interface ProductFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (product: Product) => void;
  /** Berilsa - tahrirlash rejimi. Yangi mahsulot yaratish endi alohida
   *  sahifada (/admin/katalog/yangi) - modal faqat tez tahrirlash uchun. */
  product?: Product | null;
}

export function ProductFormDialog({ open, onClose, onSaved, product }: ProductFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{product ? "Mahsulotni tahrirlash" : "Yangi mahsulot qo'shish"}</DialogTitle>
      <DialogContent className="pt-2">
        {open && (
          <ProductForm
            product={product}
            onCancel={onClose}
            onSaved={(saved) => {
              onSaved(saved);
              onClose();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { useAppSelector } from "@/redux/hooks";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { FilterPanel } from "./FilterPanel";

/**
 * Filtr tugmasi + modal. Filtrlar sahifada doim turmaydi - qidiruv
 * yonidagi tugma bosilganda ochiladi. Tugmadagi nishon (badge) nechta
 * filtr yoqilganini ko'rsatadi.
 */
export function FilterDialog() {
  const { dict } = useI18n();
  const filters = useAppSelector((s) => s.filters);
  const [open, setOpen] = useState(false);

  // Saralash (sortBy) filtr deb hisoblanmaydi - u doim biror qiymatda.
  const activeCount = [
    filters.category,
    filters.material,
    filters.brand,
    filters.manufacturerCountry,
    filters.minPrice,
    filters.maxPrice,
  ].filter((value) => value !== undefined && value !== "").length;

  return (
    <>
      <Badge badgeContent={activeCount} color="primary" overlap="circular">
        <IconButton
          onClick={() => setOpen(true)}
          aria-label={dict.filters.title}
          className="!border !border-navy-100 dark:!border-navy-500"
        >
          <TuneOutlinedIcon />
        </IconButton>
      </Badge>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle className="!flex !items-center !justify-between">
          {dict.filters.title}
          <IconButton size="small" onClick={() => setOpen(false)} aria-label="Yopish">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <FilterPanel variant="plain" />
        </DialogContent>
        <DialogActions>
          <Button variant="contained" fullWidth onClick={() => setOpen(false)}>
            {dict.filters.apply}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

"use client";

import { InputBase, IconButton } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import { useI18n } from "@/lib/i18n/LocaleContext";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, onSubmit, placeholder, className }: SearchBarProps) {
  const { dict } = useI18n();
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
      /* iOS uslubidagi maydon: to'liq yumaloq, chegarasiz, yumshoq
         kulrang fon (`--glass-field`). */
      className={`flex items-center gap-1 rounded-full border-0 px-3 py-1.5 ${className ?? ""}`}
      style={{ backgroundColor: "var(--glass-field)" }}
    >
      <SearchIcon fontSize="small" className="text-navy-300" />
      <InputBase
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? dict.product.searchPlaceholder}
        className="flex-1 text-sm"
        inputProps={{ "aria-label": "Mahsulot qidirish" }}
        fullWidth
      />
      {value && (
        <IconButton size="small" aria-label="Qidiruvni tozalash" onClick={() => onChange("")}>
          <ClearIcon fontSize="small" />
        </IconButton>
      )}
    </form>
  );
}

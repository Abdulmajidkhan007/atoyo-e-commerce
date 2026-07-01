"use client";

import { InputBase, IconButton } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, onSubmit, placeholder, className }: SearchBarProps) {
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
      className={`flex items-center gap-1 rounded-full border border-navy-100 bg-white px-3 py-1.5 dark:border-navy-500 dark:bg-navy-700 ${className ?? ""}`}
    >
      <SearchIcon fontSize="small" className="text-navy-300" />
      <InputBase
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Mahsulot qidirish (masalan: kran, quvur...)"}
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

"use client";

import { Button } from "@mui/material";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";

/** Chekni chop etish / PDF sifatida saqlash (brauzerning print oynasi). */
export function PrintButton() {
  return (
    <Button variant="contained" startIcon={<PrintOutlinedIcon />} onClick={() => window.print()}>
      Chop etish / PDF
    </Button>
  );
}

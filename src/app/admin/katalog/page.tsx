import Link from "next/link";
import { Button } from "@mui/material";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import { ProductTable } from "@/components/admin/ProductTable";
import { CatalogImportExport } from "@/components/admin/CatalogImportExport";

export default function AdminCatalogPage() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Katalog boshqaruvi</h1>
        {/* Katta importdan keyin xatolarni tozalash uchun alohida sahifa. */}
        <Button
          component={Link}
          href="/admin/katalog/tartib"
          variant="outlined"
          startIcon={<TuneOutlinedIcon />}
        >
          Katalogni tartibga solish
        </Button>
      </div>
      <CatalogImportExport />
      <ProductTable />
    </div>
  );
}

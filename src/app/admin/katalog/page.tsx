import Link from "next/link";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import { ProductTable } from "@/components/admin/ProductTable";
import { CatalogImportExport } from "@/components/admin/CatalogImportExport";

export default function AdminCatalogPage() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Katalog boshqaruvi</h1>
        {/*
          Katta importdan keyin xatolarni tozalash uchun alohida sahifa.
          DIQQAT: bu SERVER komponent - MUI Button'ga `component={Link}`
          berib bo'lmaydi (funksiya client komponentga uzatilmaydi,
          sahifa 500 bilan yiqiladi). Shuning uchun oddiy havola.
        */}
        <Link
          href="/admin/katalog/tartib"
          className="inline-flex items-center gap-2 rounded-lg border border-aqua-500 px-4 py-2 text-sm font-medium text-aqua-600 transition hover:bg-aqua-50 dark:hover:bg-navy-600"
        >
          <TuneOutlinedIcon fontSize="small" />
          Katalogni tartibga solish
        </Link>
      </div>
      <CatalogImportExport />
      <ProductTable />
    </div>
  );
}

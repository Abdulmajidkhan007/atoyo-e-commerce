"use client";

import { useState } from "react";
import { Button, IconButton, Switch, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { axisKeyOf, normalizeVariants } from "@/lib/products/variants";
import type { ProductVariant, VariantAxis } from "@/types/product";

/**
 * TURLAR MUHARRIRI (o'lcham / rang / qalinlik...).
 *
 * Mantiq: avval TANLOV QATORLARI (axes) yoziladi — masalan "O'lcham:
 * 50x60, 60x80" va "Qalinlik: 0.2mm, 0.3mm". Shundan keyin ularning
 * hamma kombinatsiyasi jadval bo'lib chiqadi va har biriga narx va
 * zaxira yoziladi. Ya'ni 20 xil moyka uchun 20 ta mahsulot ochilmaydi —
 * bitta mahsulot, bitta rasm, 20 ta tur.
 */

const MAX_AXES = 3;

interface Props {
  axes: VariantAxis[];
  variants: ProductVariant[];
  onChange: (next: { axes: VariantAxis[]; variants: ProductVariant[] }) => void;
  /** Narx maydonining izohi uchun: "so'm / metr". */
  unitLabel: string;
}

export function ProductVariantsEditor({ axes, variants, onChange, unitLabel }: Props) {
  const enabled = axes.length > 0;
  /**
   * YOZILAYOTGAN MATN (qator raqami bo'yicha).
   *
   * Maydon qiymati `values.join(", ")` dan chiqarilsa, vergul qo'yilishi
   * bilan bo'sh element tashlab yuborilardi va vergul ekranda
   * ko'rinmasdan yo'qolardi - ya'ni ikkinchi o'lchamni yozib bo'lmasdi.
   * Shuning uchun yozish paytida MATNNING O'ZI ko'rsatiladi, qiymatlar
   * esa fonda ajratib boriladi; maydondan chiqilganda matn tozalangan
   * ko'rinishga qaytadi.
   */
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [fillPrice, setFillPrice] = useState("");
  const [fillStock, setFillStock] = useState("");
  const totalStock = variants.reduce((sum, variant) => sum + Math.max(0, variant.stock), 0);

  /** "Hammasiga birdek": bo'sh qoldirilgan maydon o'zgartirilmaydi. */
  const applyToAll = () => {
    const price = fillPrice.trim() ? Number(fillPrice) : null;
    const stock = fillStock.trim() ? Number(fillStock) : null;
    if (price === null && stock === null) return;
    onChange({
      axes,
      variants: variants.map((variant) => ({
        ...variant,
        ...(price !== null && Number.isFinite(price) ? { price } : {}),
        ...(stock !== null && Number.isFinite(stock) ? { stock: Math.trunc(stock) } : {}),
      })),
    });
  };

  /** Qatorlar o'zgarsa kombinatsiyalar qayta yasaladi (eski narx/zaxira saqlanadi). */
  const rebuild = (nextAxes: VariantAxis[]) => {
    // Turlar ro'yxati HAR DOIM qatorlardan qayta yasaladi - yarim
    // yozilgan qiymatlardan qolgan eski turlar saqlanib qolmaydi.
    const { variants: nextVariants } = normalizeVariants(nextAxes, variants);
    onChange({ axes: nextAxes, variants: nextVariants });
  };

  /** Qator qo'shilsa/o'chirilsa yozilayotgan matnlar boshqa qatorga tushmasligi uchun. */
  const rebuildRows = (nextAxes: VariantAxis[]) => {
    setDrafts({});
    rebuild(nextAxes);
  };

  const updateAxis = (index: number, patch: Partial<VariantAxis>) => {
    const next = axes.map((axis, i) => (i === index ? { ...axis, ...patch } : axis));
    // Ikkita qator bir xil nomlansa kalitlari ham bir xil bo'lib qolardi
    // va turlar aralashib ketardi - kalitlarni yagona qilamiz.
    const used = new Set<string>();
    rebuild(
      next.map((axis) => {
        const base = axis.key || "tur";
        let key = base;
        for (let n = 2; used.has(key); n += 1) key = `${base}-${n}`;
        used.add(key);
        return { ...axis, key };
      })
    );
  };

  const updateVariant = (id: string, patch: Partial<ProductVariant>) => {
    onChange({
      axes,
      variants: variants.map((variant) => (variant.id === id ? { ...variant, ...patch } : variant)),
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl2 border border-navy-100 p-4 dark:border-navy-500">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-navy-900 dark:text-white">Turlari bormi?</h3>
          <p className="mt-1 text-xs text-navy-300">
            O&apos;lcham, rang, qalinlik... — bitta mahsulotning har xil ko&apos;rinishi. Narxi va
            zaxirasi har bir tur uchun alohida bo&apos;ladi, rasm esa bitta.
          </p>
        </div>
        <Switch
          checked={enabled}
          onChange={(e) =>
            e.target.checked
              ? rebuildRows([{ key: "olcham", label: "O'lcham", values: [] }])
              : onChange({ axes: [], variants: [] })
          }
        />
      </div>

      {enabled && (
        <>
          {axes.map((axis, index) => (
            <div key={index} className="flex items-start gap-2">
              <TextField
                size="small"
                label="Nomi"
                placeholder="O'lcham"
                value={axis.label}
                onChange={(e) =>
                  updateAxis(index, { label: e.target.value, key: axisKeyOf(e.target.value) })
                }
                className="!w-44"
              />
              <TextField
                size="small"
                label="Qiymatlari (vergul bilan)"
                placeholder="50x60, 60x80, 80x100"
                value={drafts[index] ?? axis.values.join(", ")}
                onChange={(e) => {
                  const raw = e.target.value;
                  setDrafts((prev) => ({ ...prev, [index]: raw }));
                  updateAxis(index, {
                    values: raw
                      .split(",")
                      .map((value) => value.trim())
                      .filter(Boolean),
                  });
                }}
                onBlur={() =>
                  setDrafts((prev) => {
                    const next = { ...prev };
                    delete next[index];
                    return next;
                  })
                }
                fullWidth
                helperText="Har bir qiymat vergul bilan ajratiladi"
              />
              <IconButton
                aria-label="O'chirish"
                onClick={() => rebuildRows(axes.filter((_, i) => i !== index))}
              >
                <DeleteOutlineIcon className="text-red-400" />
              </IconButton>
            </div>
          ))}

          {axes.length < MAX_AXES && (
            <Button
              type="button"
              size="small"
              startIcon={<AddIcon />}
              className="!w-fit"
              onClick={() => rebuildRows([...axes, { key: "", label: "", values: [] }])}
            >
              Yana qator qo&apos;shish
            </Button>
          )}

          {variants.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-navy-300">
                Har bir turning narxi va zaxirasi alohida — masalan 50×45 uchun 225 000,
                55×45 uchun 235 000 so&apos;m.
              </p>

              {/* Hammasi bir xil bo'lsa bittalab yozib chiqish shart emas. */}
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-navy-50 p-2 dark:bg-navy-800">
                <span className="text-xs text-navy-300">Hammasiga birdek:</span>
                <TextField
                  size="small"
                  type="number"
                  label={`Optom narx (${unitLabel})`}
                  value={fillPrice}
                  onChange={(e) => setFillPrice(e.target.value)}
                  className="!w-36"
                />
                <TextField
                  size="small"
                  type="number"
                  label="Zaxira"
                  value={fillStock}
                  onChange={(e) => setFillStock(e.target.value)}
                  className="!w-28"
                />
                <Button type="button" size="small" variant="outlined" onClick={applyToAll}>
                  Qo&apos;yish
                </Button>
              </div>

              {totalStock <= 0 && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                  Diqqat: hamma turlarning zaxirasi 0 — mahsulot katalogda
                  &laquo;Tugagan&raquo; bo&apos;lib turadi. Har bir o&apos;lchamning nechtaligini
                  yozing (yuqoridagi &laquo;Hammasiga birdek&raquo; ham yordam beradi).
                </p>
              )}

              {variants.map((variant) => (
                <div
                  key={variant.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-navy-100 p-2 dark:border-navy-500"
                >
                  <span className="min-w-28 flex-1 text-sm font-medium text-navy-900 dark:text-white">
                    {Object.values(variant.options).join(" • ")}
                  </span>
                  {/* HAR BIR TURNING O'Z KODI. Kod alohida "qator"
                      qilib yozilsa turlar soni ko'payib ketardi
                      (masalan 2 tur × 3 o'lcham × 6 kod = 36 ta);
                      kod turning xossasi, shuning uchun shu yerda. */}
                  <TextField
                    size="small"
                    label="Kod"
                    placeholder="39301"
                    value={variant.sku ?? ""}
                    onChange={(e) => updateVariant(variant.id, { sku: e.target.value })}
                    className="!w-28"
                  />
                  <TextField
                    size="small"
                    type="number"
                    label={`Optom narx (${unitLabel})`}
                    value={variant.price || ""}
                    onChange={(e) => updateVariant(variant.id, { price: Number(e.target.value) || 0 })}
                    className="!w-36"
                  />
                  <TextField
                    size="small"
                    type="number"
                    label="Zaxira"
                    value={variant.stock || ""}
                    onChange={(e) => updateVariant(variant.id, { stock: Number(e.target.value) || 0 })}
                    className="!w-28"
                  />
                </div>
              ))}

              <p className="text-xs text-navy-300">
                Mahsulotning umumiy narxi eng arzon turdan, zaxirasi esa hamma turlarning
                yig&apos;indisidan olinadi. Kod (artikul) har bir tur uchun alohida yoziladi —
                u Telegram e&apos;lonida va qidiruvda ishlatiladi.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

"use client";

import { Button, IconButton, Switch, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { allCombinations, axisKeyOf, variantIdOf } from "@/lib/products/variants";
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

  /** Qatorlar o'zgarsa kombinatsiyalar qayta yasaladi (eski narx/zaxira saqlanadi). */
  const rebuild = (nextAxes: VariantAxis[]) => {
    const usable = nextAxes.filter((axis) => axis.values.length > 0);
    const combos = usable.length > 0 ? allCombinations(usable) : [];
    const nextVariants = combos.map((options) => {
      const id = variantIdOf(usable, options);
      const previous = variants.find((variant) => variant.id === id);
      return (
        previous ?? { id, options, price: 0, discountPrice: null, stock: 0 }
      );
    });
    onChange({ axes: nextAxes, variants: nextVariants });
  };

  const updateAxis = (index: number, patch: Partial<VariantAxis>) => {
    rebuild(axes.map((axis, i) => (i === index ? { ...axis, ...patch } : axis)));
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
              ? rebuild([{ key: "olcham", label: "O'lcham", values: [] }])
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
                className="!w-40"
              />
              <TextField
                size="small"
                label="Qiymatlari (vergul bilan)"
                placeholder="50x60, 60x80, 80x100"
                value={axis.values.join(", ")}
                onChange={(e) =>
                  updateAxis(index, {
                    values: e.target.value
                      .split(",")
                      .map((value) => value.trim())
                      .filter(Boolean),
                  })
                }
                fullWidth
              />
              <IconButton
                aria-label="O'chirish"
                onClick={() => rebuild(axes.filter((_, i) => i !== index))}
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
              onClick={() => rebuild([...axes, { key: "", label: "", values: [] }])}
            >
              Yana qator qo&apos;shish
            </Button>
          )}

          {variants.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-navy-300">
                  <tr>
                    <th className="py-1 font-medium">Turi</th>
                    <th className="py-1 font-medium">Narx (so&apos;m / {unitLabel})</th>
                    <th className="py-1 font-medium">Zaxira</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant) => (
                    <tr key={variant.id} className="border-t border-navy-100 dark:border-navy-500">
                      <td className="py-1.5 pr-2 text-navy-900 dark:text-white">
                        {Object.values(variant.options).join(" • ")}
                      </td>
                      <td className="py-1.5 pr-2">
                        <TextField
                          size="small"
                          type="number"
                          value={variant.price || ""}
                          onChange={(e) => updateVariant(variant.id, { price: Number(e.target.value) || 0 })}
                          slotProps={{ input: { className: "w-32" } }}
                        />
                      </td>
                      <td className="py-1.5">
                        <TextField
                          size="small"
                          type="number"
                          value={variant.stock || ""}
                          onChange={(e) => updateVariant(variant.id, { stock: Number(e.target.value) || 0 })}
                          slotProps={{ input: { className: "w-24" } }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-navy-300">
                Mahsulotning umumiy narxi eng arzon turdan, zaxirasi esa hamma turlarning
                yig&apos;indisidan olinadi.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

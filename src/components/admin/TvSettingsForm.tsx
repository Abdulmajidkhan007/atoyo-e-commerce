"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { DEFAULT_TV_SETTINGS, TV_SOURCE_LABELS, type TvSettings, type TvSlide, type TvSource } from "@/types/tv";

/**
 * DO'KON TELEVIZORI (`/admin/tv`).
 *
 * Ekranga nima chiqishini shu yerdan boshqaramiz. O'ng tomonda -
 * hozir ekranda nima ko'rinayotgani (televizorga bormasdan tekshirish
 * uchun). Sozlama saqlangach televizor o'zi 3 daqiqada yangilanadi.
 */

interface ListProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  stock: number;
  thumbnailUrl: string;
}

interface Category {
  slug: string;
  label: string;
}

const SOURCES = Object.keys(TV_SOURCE_LABELS) as TvSource[];

export function TvSettingsForm() {
  const [settings, setSettings] = useState<TvSettings>(DEFAULT_TV_SETTINGS);
  const [slides, setSlides] = useState<TvSlide[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tvUrl, setTvUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  /** Qo'lda tanlash uchun: kategoriya bo'yicha ro'yxat + qidiruv. */
  const [pickCategory, setPickCategory] = useState("");
  const [pickQuery, setPickQuery] = useState("");
  const [pickList, setPickList] = useState<ListProduct[]>([]);
  const [picking, setPicking] = useState(false);
  /** Tanlangan mahsulotlarning nomi (ID ro'yxati faqat ID saqlaydi). */
  const [pickedNames, setPickedNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/admin/tv")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("403"))))
      .then((data: { settings: TvSettings; slides: TvSlide[]; categories: Category[]; tvUrl: string }) => {
        setSettings(data.settings);
        setSlides(data.slides);
        setCategories(data.categories ?? []);
        setTvUrl(data.tvUrl ?? "");
        setPickedNames(Object.fromEntries(data.slides.map((slide) => [slide.id, slide.name])));
      })
      .catch(() => setMessage({ type: "error", text: "Sozlamani o'qib bo'lmadi." }))
      .finally(() => setLoading(false));
  }, []);

  const patch = (next: Partial<TvSettings>) => setSettings((prev) => ({ ...prev, ...next }));

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/tv", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = (await res.json().catch(() => ({}))) as {
        settings?: TvSettings;
        slides?: TvSlide[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Saqlanmadi.");
      if (data.settings) setSettings(data.settings);
      if (data.slides) setSlides(data.slides);
      setMessage({
        type: "success",
        text: `Saqlandi — ekranda ${data.slides?.length ?? 0} ta mahsulot aylanadi.`,
      });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Saqlanmadi." });
    } finally {
      setSaving(false);
    }
  };

  const loadPickList = async (category: string) => {
    setPicking(true);
    try {
      const params = new URLSearchParams({ limit: "300" });
      if (category) params.set("category", category);
      const res = await fetch(`/api/admin/products/list?${params.toString()}`);
      const data = (await res.json()) as { products?: ListProduct[] };
      setPickList(data.products ?? []);
    } catch {
      setPickList([]);
    } finally {
      setPicking(false);
    }
  };

  const addProduct = (product: ListProduct) => {
    if (settings.productIds.includes(product.id)) return;
    if (settings.productIds.length >= 40) {
      setMessage({ type: "error", text: "Ko'pi bilan 40 ta mahsulot tanlash mumkin." });
      return;
    }
    setPickedNames((prev) => ({ ...prev, [product.id]: product.name }));
    patch({ productIds: [...settings.productIds, product.id] });
  };

  const removeProduct = (id: string) => {
    patch({ productIds: settings.productIds.filter((item) => item !== id) });
  };

  const toggleCategory = (slug: string) => {
    const has = settings.categories.includes(slug);
    patch({
      categories: has
        ? settings.categories.filter((item) => item !== slug)
        : [...settings.categories, slug],
    });
  };

  const visiblePicks = pickList.filter((product) =>
    pickQuery.trim()
      ? product.name.toLowerCase().includes(pickQuery.trim().toLowerCase())
      : true
  );

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {message && <Alert severity={message.type}>{message.text}</Alert>}

      {/* Televizorga yoziladigan manzil */}
      <div className="rounded-xl2 border border-aqua-200 bg-aqua-50 p-4 dark:border-navy-500 dark:bg-navy-600">
        <p className="text-sm font-semibold text-navy-900 dark:text-white">
          Televizor brauzeriga shu manzilni yozing:
        </p>
        <p className="mt-1 select-all break-all font-mono text-lg font-bold text-aqua-600 dark:text-aqua-300">
          {tvUrl || "…"}
        </p>
        <p className="mt-2 text-xs text-navy-400 dark:text-navy-100">
          Android TV box yoki Smart TV brauzerini kiosk (to&apos;liq ekran) rejimida oching.
          Ekran o&apos;zi 3 daqiqada yangilanadi — televizorni qayta ishga tushirish shart emas.
          Batafsil: <span className="font-mono">docs/TV.md</span>
        </p>
      </div>

      <FormControlLabel
        control={
          <Switch checked={settings.enabled} onChange={(e) => patch({ enabled: e.target.checked })} />
        }
        label="Ekran yoqilgan (o'chirilsa faqat do'kon nomi ko'rinadi)"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <FormControl size="small" fullWidth>
          <InputLabel id="tv-source">Nima ko&apos;rsatilsin</InputLabel>
          <Select
            labelId="tv-source"
            label="Nima ko'rsatilsin"
            value={settings.source}
            onChange={(e) => patch({ source: e.target.value as TvSource })}
          >
            {SOURCES.map((source) => (
              <MenuItem key={source} value={source}>
                {TV_SOURCE_LABELS[source]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          type="number"
          label="Nechta mahsulot aylansin (5-40)"
          value={settings.count}
          onChange={(e) => patch({ count: Number(e.target.value) })}
        />

        <TextField
          size="small"
          type="number"
          label="Bitta slayd necha soniya (4-60)"
          value={settings.slideSeconds}
          onChange={(e) => patch({ slideSeconds: Number(e.target.value) })}
        />

        <TextField
          size="small"
          label="Telefon raqami (pastda chiqadi)"
          placeholder="+998 90 123 45 67"
          value={settings.phone}
          onChange={(e) => patch({ phone: e.target.value })}
        />
      </div>

      {/* Kategoriya tanlash */}
      {settings.source === "category" && (
        <div className="rounded-xl2 border border-navy-100 p-3 dark:border-navy-500">
          <p className="mb-2 text-sm font-medium text-navy-500 dark:text-navy-100">
            Qaysi kategoriyalar aylanadi (bosib tanlang)
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Chip
                key={category.slug}
                label={category.label}
                onClick={() => toggleCategory(category.slug)}
                color={settings.categories.includes(category.slug) ? "primary" : "default"}
                variant={settings.categories.includes(category.slug) ? "filled" : "outlined"}
                size="small"
              />
            ))}
          </div>
        </div>
      )}

      {/* Qo'lda tanlash */}
      {settings.source === "manual" && (
        <div className="flex flex-col gap-3 rounded-xl2 border border-navy-100 p-3 dark:border-navy-500">
          <p className="text-sm font-medium text-navy-500 dark:text-navy-100">
            Ekranga chiqadigan mahsulotlar ({settings.productIds.length}/40)
          </p>

          <div className="flex flex-wrap gap-2">
            {settings.productIds.length === 0 && (
              <span className="text-xs text-navy-300">Hali hech narsa tanlanmagan.</span>
            )}
            {settings.productIds.map((id) => (
              <Chip
                key={id}
                size="small"
                label={pickedNames[id] ?? id}
                onDelete={() => removeProduct(id)}
                deleteIcon={<DeleteOutlineIcon />}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FormControl size="small" className="min-w-[200px]">
              <InputLabel id="tv-pick-category">Kategoriya</InputLabel>
              <Select
                labelId="tv-pick-category"
                label="Kategoriya"
                value={pickCategory}
                onChange={(e) => {
                  setPickCategory(e.target.value);
                  void loadPickList(e.target.value);
                }}
              >
                <MenuItem value="">Hammasi</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.slug} value={category.slug}>
                    {category.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Nom bo'yicha qidirish"
              value={pickQuery}
              onChange={(e) => setPickQuery(e.target.value)}
            />
            {picking && <CircularProgress size={20} />}
          </div>

          <div className="max-h-64 overflow-y-auto rounded-lg border border-navy-100 dark:border-navy-500">
            {visiblePicks.slice(0, 100).map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addProduct(product)}
                className="flex w-full items-center gap-2 border-b border-navy-50 px-3 py-2 text-left text-sm last:border-0 hover:bg-aqua-50 dark:border-navy-600 dark:hover:bg-navy-600"
              >
                <span className="line-clamp-1 flex-1 text-navy-900 dark:text-white">
                  {product.name}
                </span>
                <span className="shrink-0 text-xs text-navy-300">{product.brand}</span>
              </button>
            ))}
            {visiblePicks.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-navy-300">
                Kategoriya tanlang yoki qidiruv so&apos;zini o&apos;zgartiring.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <FormControlLabel
          control={
            <Switch checked={settings.showPrice} onChange={(e) => patch({ showPrice: e.target.checked })} />
          }
          label="Narx ko'rsatilsin"
        />
        <FormControlLabel
          control={<Switch checked={settings.showQr} onChange={(e) => patch({ showQr: e.target.checked })} />}
          label="QR kod (telefonda ochish)"
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.onlyInStock}
              onChange={(e) => patch({ onlyInStock: e.target.checked })}
            />
          }
          label="Faqat zaxirada boricha"
        />
      </div>

      <TextField
        size="small"
        label="Yuqoridagi sarlavha"
        value={settings.headline}
        onChange={(e) => patch({ headline: e.target.value })}
        fullWidth
      />

      <TextField
        size="small"
        label="Pastdagi yuguruvchi qator"
        value={settings.ticker}
        onChange={(e) => patch({ ticker: e.target.value })}
        helperText="Aksiya, ish vaqti, manzil — ekranning pastida chapga yurib turadi."
        fullWidth
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? <CircularProgress size={20} color="inherit" /> : "Saqlash"}
        </Button>
        {tvUrl && (
          <Button variant="outlined" href={tvUrl} target="_blank" rel="noopener noreferrer">
            Ekranni ko&apos;rish
          </Button>
        )}
      </div>

      {/* Hozir ekranda nima aylanayotgani */}
      <div>
        <p className="mb-2 text-sm font-medium text-navy-500 dark:text-navy-100">
          Hozir ekranda ({slides.length} ta) — narx DONA narxda ko&apos;rsatiladi
        </p>
        {slides.length === 0 ? (
          <Alert severity="warning">
            Hech narsa topilmadi. Manbani o&apos;zgartiring yoki &quot;Faqat zaxirada
            boricha&quot;ni o&apos;chiring. Rasmsiz mahsulotlar ekranga chiqmaydi.
          </Alert>
        ) : (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
            {slides.map((slide) => (
              <div
                key={slide.id}
                className="overflow-hidden rounded-lg border border-navy-100 dark:border-navy-500"
              >
                {slide.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={slide.image} alt={slide.name} className="h-20 w-full object-cover" />
                ) : (
                  <div className="h-20 bg-navy-50 dark:bg-navy-600" />
                )}
                <div className="p-2">
                  <p className="line-clamp-2 text-xs font-medium text-navy-900 dark:text-white">
                    {slide.name}
                  </p>
                  <p className="mt-1 text-xs font-bold text-aqua-600 dark:text-aqua-300">
                    {slide.price.toLocaleString("uz-UZ")} so&apos;m
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

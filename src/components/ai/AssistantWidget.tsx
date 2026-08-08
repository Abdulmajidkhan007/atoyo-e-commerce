"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircularProgress, IconButton, TextField } from "@mui/material";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import CloseIcon from "@mui/icons-material/Close";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import { useAppDispatch } from "@/redux/hooks";
import { addItem } from "@/redux/slices/cartSlice";
import { formatSom } from "@/lib/format";

/**
 * ATOYO YORDAMCHISI — saytdagi suzuvchi oyna.
 *
 * `ANTHROPIC_API_KEY` sozlanmagan bo'lsa `/api/assistant` `enabled:false`
 * qaytaradi va tugma umuman chizilmaydi (mijoz ishlamaydigan tugmani
 * ko'rmaydi). Suhbat faqat shu sahifada — serverda saqlanmaydi.
 */

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  products?: { id: string; name: string; price: number; discountPrice: number | null; stock: number }[];
}

const GREETING =
  "Assalomu alaykum! Men Atoyo yordamchisiman. Mahsulot, narx, yetkazib berish yoki buyurtma bo'yicha savolingizni yozing.";

const SUGGESTIONS = ["Issiq suv uchun qaysi quvur?", "Yetkazib berish qancha?", "Buyurtmani qanday beraman?"];

const PHOTO_HINT = "📷 tugmasi orqali mahsulot suratini yuborsangiz, o'xshashini katalogdan topib beraman.";

/**
 * OYNA O'LCHAMI (desktop ilovalaridagi kabi).
 *
 * Mijoz oynani burchagidan sudrab kattalashtira oladi yoki butun
 * ekranga yoyadi. Tanlangan o'lcham brauzerda saqlanadi - keyingi
 * safar o'sha holatda ochiladi.
 */
const PANEL_KEY = "atoyo-assistant-panel";
const MIN_WIDTH = 300;
const MIN_HEIGHT = 340;
const DEFAULT_PANEL = { width: 380, height: 560, full: false };

interface PanelState {
  width: number;
  height: number;
  full: boolean;
}

function loadPanel(): PanelState {
  if (typeof window === "undefined") return { ...DEFAULT_PANEL };
  try {
    const raw = window.localStorage.getItem(PANEL_KEY);
    if (!raw) return { ...DEFAULT_PANEL };
    const saved = JSON.parse(raw) as Partial<PanelState>;
    return {
      width: typeof saved.width === "number" ? Math.max(MIN_WIDTH, saved.width) : DEFAULT_PANEL.width,
      height:
        typeof saved.height === "number" ? Math.max(MIN_HEIGHT, saved.height) : DEFAULT_PANEL.height,
      full: saved.full === true,
    };
  } catch {
    return { ...DEFAULT_PANEL };
  }
}

function savePanel(panel: PanelState): void {
  try {
    window.localStorage.setItem(PANEL_KEY, JSON.stringify(panel));
  } catch {
    // Xotira to'lgan yoki cookie'lar o'chirilgan - o'lcham eslanmaydi, xolos.
  }
}

/** Yordamchi qaytargan amallar (savatga qo'shish, rasmiylashtirish). */
interface AssistantAction {
  type: "add_to_cart" | "checkout";
  productId?: string;
  name?: string;
  price?: number;
  thumbnailUrl?: string;
  stock?: number;
  quantity?: number;
}

export function AssistantWidget() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: GREETING }]);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  /** Oyna o'lchami: sudrab o'zgartiriladi, brauzerda saqlanadi. */
  const [panel, setPanel] = useState<PanelState>(loadPanel);
  const panelRef = useRef(panel);
  panelRef.current = panel;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/assistant")
      .then((res) => res.json())
      .then((data: { enabled?: boolean }) => {
        if (!cancelled) setEnabled(Boolean(data.enabled));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, panel.full]);

  /** Esc: avval to'liq ekrandan chiqadi, keyin oynani yopadi. */
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (panelRef.current.full) {
        const next = { ...panelRef.current, full: false };
        setPanel(next);
        savePanel(next);
      } else {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggleFull = () => {
    const next = { ...panel, full: !panel.full };
    setPanel(next);
    savePanel(next);
  };

  /**
   * Chap-yuqori burchakdan sudrab o'lcham o'zgartirish. Oyna o'ng-past
   * burchakka bog'langani uchun sudrash masofasi to'g'ridan-to'g'ri
   * eni/bo'yiga qo'shiladi.
   */
  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panel.full) return;
    event.preventDefault();
    const start = {
      x: event.clientX,
      y: event.clientY,
      width: panel.width,
      height: panel.height,
    };

    const onMove = (move: PointerEvent) => {
      const next: PanelState = {
        full: false,
        width: Math.max(
          MIN_WIDTH,
          Math.min(start.width + (start.x - move.clientX), window.innerWidth - 24)
        ),
        height: Math.max(
          MIN_HEIGHT,
          Math.min(start.height + (start.y - move.clientY), window.innerHeight - 40)
        ),
      };
      setPanel(next);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      savePanel(panelRef.current);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;

    const history = messages
      .filter((message) => message.content !== GREETING)
      .map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history: history.slice(-8), channel: "site" }),
      });
      const data = (await res.json()) as {
        answer?: string;
        error?: string;
        products?: ChatMessage["products"];
        actions?: AssistantAction[];
      };

      // Yordamchi savatga qo'shishni so'ragan bo'lsa - shu yerda
      // bajariladi (savat brauzerda, serverda emas).
      let goCheckout = false;
      for (const action of data.actions ?? []) {
        if (action.type === "add_to_cart" && action.productId) {
          dispatch(
            addItem({
              productId: action.productId,
              name: action.name ?? "",
              price: action.price ?? 0,
              thumbnailUrl: action.thumbnailUrl ?? "",
              stock: action.stock ?? 0,
              quantity: action.quantity ?? 1,
            })
          );
        }
        if (action.type === "checkout") goCheckout = true;
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer ?? data.error ?? "Javob olinmadi.",
          // Mahsulot kartochkalari faqat javobda ular haqida gap ketsa
          // foydali - shuning uchun 3 tagacha ko'rsatiladi.
          products: data.answer ? data.products?.slice(0, 3) : undefined,
        },
      ]);
      if (goCheckout) {
        setOpen(false);
        router.push("/buyurtma");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Internet aloqasi uzildi. Qayta urinib ko'ring." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  /**
   * RASM BO'YICHA QIDIRUV: mijoz surat tanlaydi, server uni tahlil
   * qilib katalogdan o'xshashini topadi.
   */
  const searchByPhoto = async (file: File) => {
    if (busy) return;
    if (file.size > 4 * 1024 * 1024) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Rasm juda katta (4MB gacha)." }]);
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: "📷 Rasm yuborildi" }]);
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Rasm o'qilmadi"));
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/search/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = (await res.json()) as {
        description?: string;
        products?: { id: string; name: string; price: number; effectivePrice: number; stock: number }[];
        error?: string;
      };

      if (!res.ok) throw new Error(data.error ?? "Rasmni tahlil qilib bo'lmadi.");

      const found = data.products ?? [];
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            found.length > 0
              ? `${data.description ?? ""}\n\nKatalogdan o'xshashlari:`.trim()
              : `${data.description ?? ""}\n\nAfsuski, katalogdan mos mahsulot topilmadi. Nomini yozib ham qidirib ko'ring.`.trim(),
          products: found.slice(0, 3).map((product) => ({
            id: product.id,
            name: product.name,
            price: product.price,
            discountPrice: product.effectivePrice < product.price ? product.effectivePrice : null,
            stock: product.stock,
          })),
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: error instanceof Error ? error.message : "Xatolik yuz berdi." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  if (!enabled) return null;

  return (
    <>
      {/* Suzuvchi tugma - mobil pastki menyudan yuqorida turadi. */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Yordamchi"
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-aqua-500 text-navy-900 shadow-lg transition hover:bg-aqua-400 md:bottom-6"
        >
          <SmartToyOutlinedIcon />
        </button>
      )}

      {open && (
        <div
          className={
            panel.full
              ? "fixed inset-0 z-50 flex flex-col overflow-hidden border-0 bg-white shadow-2xl dark:bg-navy-700"
              : "fixed bottom-20 right-2 z-50 flex flex-col overflow-hidden rounded-xl2 border border-navy-100 bg-white shadow-2xl dark:border-navy-500 dark:bg-navy-700 md:bottom-6 md:right-6"
          }
          style={
            panel.full
              ? undefined
              : {
                  width: panel.width,
                  height: panel.height,
                  maxWidth: "calc(100vw - 1rem)",
                  maxHeight: "calc(100vh - 6rem)",
                }
          }
        >
          {/* O'lcham o'zgartirish tutqichi - chap-yuqori burchakda
              (oyna o'ng-pastga bog'langan). To'liq ekranda kerak emas. */}
          {!panel.full && (
            <div
              onPointerDown={startResize}
              role="separator"
              aria-label="Oyna o'lchamini o'zgartirish"
              title="Sudrab kattalashtiring"
              className="absolute left-0 top-0 z-10 hidden h-6 w-6 cursor-nwse-resize items-center justify-center md:flex"
            >
              <span className="h-3 w-3 rounded-tl-md border-l-2 border-t-2 border-white/50" />
            </div>
          )}

          <div
            onDoubleClick={toggleFull}
            title="Ikki marta bosing - to'liq ekran"
            className="flex select-none items-center justify-between border-b border-navy-100 bg-navy-800 px-4 py-3 dark:border-navy-500"
          >
            <div className="flex items-center gap-2 pl-5 text-white">
              <SmartToyOutlinedIcon fontSize="small" />
              <span className="text-sm font-semibold">Atoyo yordamchisi</span>
            </div>
            <div className="flex items-center">
              <IconButton
                size="small"
                onClick={toggleFull}
                aria-label={panel.full ? "Kichraytirish" : "To'liq ekran"}
                title={panel.full ? "Kichraytirish" : "To'liq ekran"}
              >
                {panel.full ? (
                  <CloseFullscreenIcon fontSize="small" sx={{ color: "white" }} />
                ) : (
                  <OpenInFullIcon fontSize="small" sx={{ color: "white" }} />
                )}
              </IconButton>
              <IconButton size="small" onClick={() => setOpen(false)} aria-label="Yopish">
                <CloseIcon fontSize="small" sx={{ color: "white" }} />
              </IconButton>
            </div>
          </div>

          {/* To'liq ekranda matn butun kenglikka cho'zilib ketmasin. */}
          <div
            ref={listRef}
            className={`flex-1 space-y-3 overflow-y-auto p-3 ${panel.full ? "mx-auto w-full max-w-3xl" : ""}`}
          >
            {messages.map((message, index) => (
              <div key={index} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[85%] whitespace-pre-wrap rounded-xl2 bg-aqua-500 px-3 py-2 text-sm text-navy-900"
                      : "max-w-[90%] whitespace-pre-wrap rounded-xl2 bg-navy-50 px-3 py-2 text-sm text-navy-900 dark:bg-navy-600 dark:text-white"
                  }
                >
                  {message.content}

                  {message.products && message.products.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1">
                      {message.products.map((product) => (
                        <Link
                          key={product.id}
                          href={`/mahsulot/${product.id}`}
                          onClick={() => setOpen(false)}
                          className="rounded-lg border border-navy-100 bg-white px-2 py-1 text-xs text-navy-900 hover:border-aqua-400 dark:border-navy-400 dark:bg-navy-700 dark:text-white"
                        >
                          <span className="font-medium">{product.name}</span>
                          <span className="block text-aqua-600 dark:text-aqua-300">
                            {formatSom(product.discountPrice ?? product.price)}
                            {product.stock > 0 ? "" : " • zaxirada yo'q"}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex justify-start">
                <div className="rounded-xl2 bg-navy-50 px-3 py-2 dark:bg-navy-600">
                  <CircularProgress size={16} />
                </div>
              </div>
            )}

            {messages.length === 1 && (
              <p className="pt-1 text-xs text-navy-300">{PHOTO_HINT}</p>
            )}

            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => send(item)}
                    className="rounded-full border border-navy-100 px-3 py-1 text-xs text-navy-600 hover:border-aqua-400 dark:border-navy-400 dark:text-navy-100"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
            className={`flex w-full items-center gap-2 border-t border-navy-100 p-2 dark:border-navy-500 ${
              panel.full ? "mx-auto max-w-3xl" : ""
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void searchByPhoto(file);
              }}
            />
            <IconButton
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              aria-label="Rasm bilan qidirish"
              title="Rasm bilan qidirish"
            >
              <PhotoCameraOutlinedIcon />
            </IconButton>

            <TextField
              size="small"
              fullWidth
              placeholder="Savolingizni yozing..."
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, 600))}
              disabled={busy}
            />
            <IconButton type="submit" color="primary" disabled={busy || input.trim().length < 2} aria-label="Yuborish">
              <SendRoundedIcon />
            </IconButton>
          </form>
        </div>
      )}
    </>
  );
}

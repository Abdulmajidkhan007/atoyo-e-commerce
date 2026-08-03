"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircularProgress, IconButton, TextField } from "@mui/material";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import CloseIcon from "@mui/icons-material/Close";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { useAppDispatch } from "@/redux/hooks";
import { addItem } from "@/redux/slices/cartSlice";

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

function formatPrice(value: number): string {
  return `${Math.round(value).toLocaleString("ru-RU").replace(/ /g, " ")} so'm`;
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
  }, [messages, open]);

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
        <div className="fixed bottom-20 right-2 z-50 flex h-[70vh] max-h-[560px] w-[min(380px,calc(100vw-1rem))] flex-col overflow-hidden rounded-xl2 border border-navy-100 bg-white shadow-2xl dark:border-navy-500 dark:bg-navy-700 md:bottom-6 md:right-6">
          <div className="flex items-center justify-between border-b border-navy-100 bg-navy-800 px-4 py-3 dark:border-navy-500">
            <div className="flex items-center gap-2 text-white">
              <SmartToyOutlinedIcon fontSize="small" />
              <span className="text-sm font-semibold">Atoyo yordamchisi</span>
            </div>
            <IconButton size="small" onClick={() => setOpen(false)} aria-label="Yopish">
              <CloseIcon fontSize="small" sx={{ color: "white" }} />
            </IconButton>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-3">
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
                            {formatPrice(product.discountPrice ?? product.price)}
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
            className="flex items-center gap-2 border-t border-navy-100 p-2 dark:border-navy-500"
          >
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

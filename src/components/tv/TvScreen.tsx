"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { QrCode } from "./QrCode";
import { DEFAULT_TV_SETTINGS, type TvSettings, type TvSlide } from "@/types/tv";

/**
 * DO'KONDAGI TELEVIZOR EKRANI.
 *
 * Televizorga alohida ilova kerak emas: Android TV box yoki Smart TV
 * brauzeri kiosk rejimida shu sahifani ochadi. Sahifa o'zini o'zi
 * boshqaradi - slaydlarni aylantiradi, ma'lumotni vaqti-vaqti bilan
 * yangilaydi va internet uzilsa oxirgi holatni ko'rsatib turaveradi.
 *
 * Ekrandagi narx - HAR DOIM DONA (chakana) narx (server shunday
 * yuboradi), chunki televizorni hamma ko'radi.
 */

/** Ma'lumot qancha vaqtda bir yangilanadi (mahsulot/narx o'zgarishi). */
const REFRESH_MS = 3 * 60 * 1000;
/** Internet uzilganda qayta urinish oralig'i. */
const RETRY_MS = 30 * 1000;

interface Payload {
  settings: TvSettings;
  slides: TvSlide[];
}

const money = new Intl.NumberFormat("uz-UZ");

export function TvScreen() {
  const [data, setData] = useState<Payload | null>(null);
  const [index, setIndex] = useState(0);
  const [offline, setOffline] = useState(false);
  const [clock, setClock] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settings = data?.settings ?? DEFAULT_TV_SETTINGS;
  const slides = useMemo(() => data?.slides ?? [], [data]);
  // Ro'yxat qisqarib qolsa ham indeks chegaradan chiqmasin (ma'lumot
  // yangilanganda qo'shimcha holat tiklashga hojat qolmaydi).
  const current = slides.length > 0 ? index % slides.length : 0;
  const slide = slides[current] ?? null;

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tv/slides", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const next = (await res.json()) as Payload;
      setData(next);
      setOffline(false);
    } catch {
      // Eski ma'lumot ekranda qolaveradi - do'konda qora ekran turmasin.
      setOffline(true);
    }
  }, []);

  // Birinchi yuklash - effekt ichida to'g'ridan-to'g'ri emas, keyingi
  // "tick"da (aks holda render zanjiri cho'ziladi).
  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    return () => clearTimeout(first);
  }, [load]);

  // Muvaffaqiyatli bo'lsa 3 daqiqada, uzilgan bo'lsa 30 soniyada.
  useEffect(() => {
    const period = offline ? RETRY_MS : REFRESH_MS;
    const timer = setInterval(() => void load(), period);
    return () => clearInterval(timer);
  }, [load, offline]);

  // Slaydlarni aylantirish. Ro'yxat o'zgarsa boshidan boshlanadi.
  useEffect(() => {
    if (slides.length === 0) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      () => setIndex((prev) => prev + 1),
      Math.max(4, settings.slideSeconds) * 1000
    );
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, slides.length, settings.slideSeconds]);

  // Soat (do'konda qulay) - yarim daqiqada bir yangilanadi.
  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }));
    // Birinchi qiymat ham keyinroq qo'yiladi: server va brauzerdagi
    // vaqt bir xil bo'lmaydi, shu sabab hydration xatosi chiqmasin.
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  // Ekran o'chib qolmasin (Android TV brauzeri qo'llab-quvvatlasa).
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const request = async () => {
      try {
        const api = (
          navigator as Navigator & {
            wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
          }
        ).wakeLock;
        if (api) lock = await api.request("screen");
      } catch {
        // Qo'llab-quvvatlanmasa - televizor sozlamasidan o'chirish kerak.
      }
    };
    void request();
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);

  const siteLink = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <div className="tv-root relative flex h-screen w-screen flex-col bg-navy-950 text-white">
      {/* Yuqori qator: do'kon nomi, kategoriya, soat */}
      <header className="flex shrink-0 items-center justify-between px-[3vw] pt-[2.5vh]">
        <div className="flex items-baseline gap-[1.5vw]">
          <span className="text-[2.2vw] font-black tracking-tight text-aqua-400">
            {settings.headline}
          </span>
          {slide?.categoryLabel && (
            <span className="rounded-full bg-white/10 px-[1.2vw] py-[0.4vh] text-[1.2vw] font-semibold uppercase tracking-wide text-white/80">
              {slide.categoryLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-[1.5vw] text-[1.6vw] font-semibold text-white/70">
          {offline && <span className="text-[1.1vw] text-amber-300">aloqa yo&apos;q</span>}
          <span>{clock}</span>
        </div>
      </header>

      {/* Asosiy qism */}
      {slide ? (
        <main key={slide.id} className="tv-fade-in flex min-h-0 flex-1 items-center gap-[3vw] px-[3vw] py-[2vh]">
          {/* Rasm */}
          <div className="relative h-full w-[46%] shrink-0 overflow-hidden rounded-[1.5vw] bg-white">
            {slide.image ? (
              <Image
                key={slide.image}
                src={slide.image}
                alt={slide.name}
                fill
                sizes="50vw"
                priority
                className="tv-kenburns object-contain p-[1.5vw]"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[3vw] text-navy-300">
                Atoyo
              </div>
            )}
          </div>

          {/* Matn */}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-[2vh]">
            {slide.brand && (
              <p className="text-[1.6vw] font-bold uppercase tracking-[0.2em] text-aqua-400">
                {slide.brand}
              </p>
            )}
            <h1 className="line-clamp-3 text-[3.4vw] font-black leading-[1.1]">{slide.name}</h1>

            {settings.showPrice && (
              <div className="flex items-end gap-[1.5vw]">
                <span className="text-[5.5vw] font-black leading-none text-white">
                  {money.format(slide.price)}
                </span>
                <span className="pb-[0.8vh] text-[2vw] font-bold text-white/70">
                  so&apos;m / {slide.unitLabel}
                </span>
                {slide.oldPrice && (
                  <span className="pb-[1vh] text-[2vw] font-semibold text-white/40 line-through">
                    {money.format(slide.oldPrice)}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-[1.5vw]">
              {slide.oldPrice && (
                <span className="rounded-full bg-red-500 px-[1.4vw] py-[0.6vh] text-[1.4vw] font-black uppercase">
                  Chegirma
                </span>
              )}
              <span
                className={`rounded-full px-[1.4vw] py-[0.6vh] text-[1.4vw] font-bold ${
                  slide.inStock ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/60"
                }`}
              >
                {slide.inStock ? "Sotuvda bor" : "Buyurtma asosida"}
              </span>
            </div>
          </div>

          {/* QR - telefonda ochish */}
          {settings.showQr && (
            <div className="flex shrink-0 flex-col items-center gap-[1vh]">
              <QrCode value={slide.url} size={200} />
              <p className="max-w-[12vw] text-center text-[1.1vw] font-semibold leading-tight text-white/70">
                Telefon kamerasini QR ga tuting — mahsulot sahifasi ochiladi
              </p>
            </div>
          )}
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[3vh]">
          <p className="text-[4vw] font-black text-white">{settings.headline}</p>
          <p className="text-[1.8vw] text-white/70">
            {settings.enabled ? "Katalog yuklanmoqda…" : "Ekran vaqtincha o'chirilgan"}
          </p>
          {siteLink && <QrCode value={siteLink} size={200} />}
        </main>
      )}

      {/* Progress + yuguruvchi qator */}
      <footer className="shrink-0">
        {slides.length > 0 && (
          <div className="flex gap-[0.4vw] px-[3vw] pb-[1vh]">
            {slides.map((item, i) => (
              <span
                key={item.id}
                className={`h-[0.5vh] flex-1 rounded-full ${i === current ? "bg-aqua-400" : "bg-white/15"}`}
              />
            ))}
          </div>
        )}
        <div className="flex items-center gap-[2vw] overflow-hidden bg-aqua-500 px-[3vw] py-[1.2vh] text-navy-950">
          {settings.phone && (
            <span className="shrink-0 text-[1.6vw] font-black">☎ {settings.phone}</span>
          )}
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="tv-marquee text-[1.5vw] font-bold">
              {/* Matn ikki marta - uzluksiz aylanishi uchun. */}
              <span className="px-[2vw]">{settings.ticker}</span>
              <span className="px-[2vw]">{settings.ticker}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

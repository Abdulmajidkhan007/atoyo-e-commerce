/**
 * 3D DUNYONING "BEKATLARI".
 *
 * Sayt bitta uzluksiz 3D makon sifatida ishlaydi: har bir sahifa
 * shu makonning bir joyi (bekati). Mijoz sahifadan sahifaga o'tganda
 * kamera SAKRAMAYDI - o'sha joyga uchib boradi.
 *
 * Bekat = kamera holati + nima ko'rinishi. Ro'yxat SHU YERDA, chunki
 * yangi sahifa qo'shilganda faqat bitta qator yoziladi.
 *
 * MUHIM: dunyo bosh sahifada chizilmaydi - u yerda o'zining kinematik
 * hero sahnasi bor (`HeroCanvas`). Ikkita katta sahnani bir vaqtda
 * ushlab turish GPU uchun isrof bo'lardi.
 */

export type StationId = "catalog" | "product" | "cart" | "calm";

export interface Station {
  id: StationId;
  /** Kamera qayerda turadi. */
  camera: [number, number, number];
  /** Kamera qayerga qaraydi. */
  target: [number, number, number];
  /** Sahnaning qaysi qismi chizilsin. */
  content: "shelf" | "spotlight" | "counter" | "drift";
}

const STATIONS: Record<StationId, Station> = {
  // Katalog: kategoriya modellari javon bo'lib tizilgan.
  catalog: { id: "catalog", camera: [0, 0.6, 9.6], target: [0, 0.55, 0], content: "shelf" },
  // Mahsulot: bitta model projektor ostida (sahifadagi konfigurator
  // bilan chalkashmasligi uchun fon jim va uzoqroqda turadi).
  product: { id: "product", camera: [3.2, 0.9, 7.8], target: [0, 0.35, 0], content: "spotlight" },
  // Savat / buyurtma: "peshtaxta" va yetkazish to'ri.
  cart: { id: "cart", camera: [-2, 1.3, 8.6], target: [0, 0.15, 0], content: "counter" },
  // Qolgan sahifalar: jim suzuvchi fon.
  calm: { id: "calm", camera: [1.2, 0.7, 10], target: [0, 0.3, 0], content: "drift" },
};

/** Manzilga mos bekat. Dunyo chizilmaydigan sahifalar uchun `null`. */
export function stationForPath(pathname: string): Station | null {
  // Bosh sahifa - o'z sahnasi bor; admin va TV - umuman 3D emas.
  if (pathname === "/") return null;
  if (pathname.startsWith("/admin") || pathname.startsWith("/tv")) return null;

  if (pathname.startsWith("/katalog")) return STATIONS.catalog;
  if (pathname.startsWith("/mahsulot")) return STATIONS.product;
  if (
    pathname.startsWith("/savat") ||
    pathname.startsWith("/buyurtma") ||
    pathname.startsWith("/tolov") ||
    pathname.startsWith("/chek")
  ) {
    return STATIONS.cart;
  }

  return STATIONS.calm;
}

/** Katalogdagi javonda ko'rinadigan kategoriyalar (chapdan o'ngga). */
export const SHELF_CATEGORIES = [
  "faucets",
  "sanitary-ware",
  "shower-systems",
  "radiators",
  "boilers",
  "pipes",
] as const;

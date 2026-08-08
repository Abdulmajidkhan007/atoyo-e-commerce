/**
 * PRELOAD - sayt bilan ilova o'rtasidagi yagona ko'prik.
 *
 * Bu yerda ATAYLAB deyarli hech narsa ochilmaydi: sayt masofadagi kod,
 * unga Node imkoniyatlarini berish xavfli. Faqat "ilova ichida
 * ochilganmi" degan belgi qo'yiladi - kerak bo'lsa sayt shunga qarab
 * (masalan "Ilovani yuklab oling" bannerini yashirish) o'zini tutadi.
 */
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("atoyoDesktop", {
  isDesktop: true,
  platform: process.platform,
  version: process.versions.electron,
});

/**
 * ORQAGA / OLDINGA — Ctrl+← va Ctrl+→.
 *
 * Ilovada brauzerdagi kabi manzil paneli ham, orqaga tugmasi ham yo'q,
 * shuning uchun bo'limlar ichiga kirib ketgach qaytishning yo'li
 * qolmasdi. Menyuda `Alt+←/→` bor (Windows standarti), bu yerda esa
 * ko'pchilik odatlangan `Ctrl+←/→` qo'shiladi.
 *
 * MUHIM: matn maydonida Ctrl+← "bir so'z chapga" degani. Shuning
 * uchun kursor input/textarea yoki tahrirlanadigan blok ichida bo'lsa
 * TEGILMAYDI - admin formada yozayotgan odam sahifadan uchib
 * ketmasligi kerak.
 */
function isEditing() {
  const el = document.activeElement;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  // Matn kiritiladigan input turlari (checkbox/radio/tugma emas).
  const type = (el.getAttribute("type") || "text").toLowerCase();
  return !["checkbox", "radio", "button", "submit", "reset", "file", "range", "color"].includes(
    type
  );
}

window.addEventListener(
  "keydown",
  (event) => {
    if (!event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (isEditing()) return;

    event.preventDefault();
    if (event.key === "ArrowLeft") window.history.back();
    else window.history.forward();
  },
  // Sayt o'z ishlovchisini qo'yishidan OLDIN ushlaymiz.
  true
);
